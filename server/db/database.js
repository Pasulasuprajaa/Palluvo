const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Checks whether a given path is within an OS temporary directory.
 */
function isTempPath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return false;
  const resolved = path.resolve(targetPath);
  const tmpDir = path.resolve(os.tmpdir());
  return (
    resolved.startsWith(tmpDir) ||
    resolved.startsWith('/tmp') ||
    resolved.startsWith('/var/tmp') ||
    resolved.includes(`${path.sep}Temp${path.sep}`) ||
    resolved.includes(`${path.sep}tmp${path.sep}`)
  );
}

/**
 * Parses DATABASE_URL or file path into a resolved local filesystem path.
 * Supports SQLite file specifiers: sqlite://, file://, sqlite:, file:, or direct filesystem paths.
 * Rejects unsupported network database protocols (e.g. postgres://, mysql://) with a descriptive error.
 */
function parseDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Detect network/managed database protocols
  const schemeMatch = trimmed.match(/^([a-zA-Z0-9+.-]+):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (['postgres', 'postgresql', 'mysql', 'mariadb', 'mongodb', 'redis', 'http', 'https'].includes(scheme)) {
      throw new Error(
        `Unsupported database connection protocol "${scheme}:" in DATABASE_URL. ` +
        `The current database layer uses SQLite (better-sqlite3) for local/volume file storage. ` +
        `Connecting to a managed ${scheme.toUpperCase()} database requires a dedicated network database driver.`
      );
    }
    if (scheme !== 'sqlite' && scheme !== 'file') {
      throw new Error(
        `Unsupported database URL scheme "${scheme}:" in DATABASE_URL. Supported schemes for SQLite are sqlite://, file://, or standard file paths.`
      );
    }
  }

  let clean = trimmed;
  if (clean.startsWith('sqlite://')) {
    clean = clean.slice(9);
  } else if (clean.startsWith('file://')) {
    clean = clean.slice(7);
  } else if (clean.startsWith('sqlite:')) {
    clean = clean.slice(7);
  } else if (clean.startsWith('file:')) {
    clean = clean.slice(5);
  }

  // Remove leading slash for Windows drive letters (e.g. /C:/data -> C:/data)
  if (/^\/[a-zA-Z]:/.test(clean)) {
    clean = clean.slice(1);
  }

  return path.resolve(clean);
}

// Database storage resolution:
// 1. DATABASE_URL (sqlite://, file://, or local path)
// 2. DATABASE_PATH or SQLITE_DB_PATH (explicit file path)
// 3. DATABASE_DIR or DATA_DIR (explicit directory)
// 4. Default local directory: server/data/palluvo.db
function resolveDatabaseLocation() {
  const hasExplicitConfig = Boolean(
    process.env.DATABASE_URL ||
    process.env.DATABASE_PATH ||
    process.env.SQLITE_DB_PATH ||
    process.env.DATABASE_DIR ||
    process.env.DATA_DIR
  );

  let targetPath;
  if (process.env.DATABASE_URL) {
    targetPath = parseDatabaseUrl(process.env.DATABASE_URL);
  } else if (process.env.DATABASE_PATH || process.env.SQLITE_DB_PATH) {
    targetPath = path.resolve((process.env.DATABASE_PATH || process.env.SQLITE_DB_PATH).trim());
  } else if (process.env.DATABASE_DIR || process.env.DATA_DIR) {
    const baseDir = path.resolve((process.env.DATABASE_DIR || process.env.DATA_DIR).trim());
    targetPath = path.join(baseDir, 'palluvo.db');
  } else {
    targetPath = path.join(__dirname, '..', 'data', 'palluvo.db');
  }

  return { targetPath, hasExplicitConfig };
}

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NOW_REGION ||
  process.env.NETLIFY
);
const isProduction = process.env.NODE_ENV === 'production';

const { targetPath: dbPath, hasExplicitConfig } = resolveDatabaseLocation();

let db;
let isDurable = false;
let isEphemeral = false;
let storageType = 'file';

if (isServerless) {
  // Serverless execution environments (Vercel, AWS Lambda) are stateless and isolated per instance.
  // Any local filesystem path (including /tmp or custom paths) is ephemeral and not shared across invocations.
  // Better-SQLite3 operates strictly as a local file engine, so on serverless it is ALWAYS ephemeral.
  // Commerce mutating writes must be default-denied to prevent data loss or divergence across function instances.
  isDurable = false;
  isEphemeral = true;

  console.warn(
    '⚠️ SERVERLESS STORAGE NOTICE: Running on serverless infrastructure with local SQLite. ' +
    'Local function filesystems are ephemeral and isolated per instance. Mutating commerce writes are restricted by default.'
  );

  try {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(dbPath);
    storageType = 'serverless-ephemeral-sqlite';
  } catch (err) {
    // If the configured or default path is on a read-only filesystem (e.g. /var/task), try /tmp fallback then in-memory
    const tmpFallbackPath = path.join(os.tmpdir(), 'palluvo-ephemeral.db');
    try {
      db = new Database(tmpFallbackPath);
      storageType = 'serverless-ephemeral-tmp';
    } catch (tmpErr) {
      console.warn(
        '⚠️ Notice: Read-only serverless filesystem detected. Initializing in-memory fallback for read-only catalog browsing.'
      );
      db = new Database(':memory:');
      storageType = 'serverless-ephemeral-memory';
    }
  }
} else {
  // Non-serverless environment (Local development server, or persistent VM/container with mounted persistent storage)
  const isTemp = isTempPath(dbPath);
  try {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(dbPath);
    if (isTemp) {
      isDurable = false;
      isEphemeral = true;
      storageType = 'ephemeral-temp-file';
      console.warn('⚠️ Storage is located in a temporary directory and will not persist across reboots.');
    } else {
      isDurable = true;
      isEphemeral = false;
      storageType = hasExplicitConfig ? 'persistent-configured-file' : 'local-file';
    }
  } catch (err) {
    throw err;
  }
}

// Attach storage durability metadata to db
db.isDurable = isDurable;
db.isEphemeral = isEphemeral;
db.storageType = storageType;
db.storagePath = dbPath;
db.isServerless = isServerless;

// Enable foreign keys and WAL mode for high concurrency & reliability
try {
  if (!storageType.includes('memory')) {
    db.pragma('journal_mode = WAL');
  }
} catch (e) {
  // In-memory or certain environments may ignore WAL
}
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'user', -- 'user' or 'admin'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Addresses Table
    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      pincode TEXT NOT NULL,
      house_flat TEXT NOT NULL,
      area TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      landmark TEXT,
      address_type TEXT DEFAULT 'home', -- 'home' or 'work'
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Categories Table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Products Table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      tagline TEXT,
      description TEXT NOT NULL,
      short_desc TEXT,
      category_id INTEGER NOT NULL,
      fabric TEXT NOT NULL,
      occasion TEXT NOT NULL, -- 'Wedding', 'Festive', 'Party', 'Workwear', 'Everyday'
      pattern TEXT, -- 'Zari Weave', 'Embroidered', 'Printed', 'Handloom', 'Solid'
      saree_length TEXT DEFAULT '5.5 Meters',
      blouse_length TEXT DEFAULT '0.8 Meter Unstitched Piece Included',
      care_instructions TEXT DEFAULT 'Dry Clean Only. Store wrapped in pure muslin or cotton cloth.',
      price INTEGER NOT NULL, -- In Rupees
      mrp INTEGER NOT NULL,
      discount_percent INTEGER NOT NULL,
      rating REAL DEFAULT 4.8,
      review_count INTEGER DEFAULT 0,
      stock_quantity INTEGER DEFAULT 25,
      sku TEXT UNIQUE,
      is_featured INTEGER DEFAULT 0,
      is_new_arrival INTEGER DEFAULT 0,
      is_best_seller INTEGER DEFAULT 0,
      silk_mark_certified INTEGER DEFAULT 0,
      color_name TEXT DEFAULT 'Wine Red',
      color_hex TEXT DEFAULT '#5B1425',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    -- Product Images Table
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- Product Color/Style Variants Table
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      color_name TEXT NOT NULL,
      color_hex TEXT NOT NULL,
      stock_quantity INTEGER DEFAULT 15,
      sku TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- Cart Items Table
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
      UNIQUE(user_id, product_id, variant_id)
    );

    -- Wishlist Items Table
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );

    -- Coupons Table
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      discount_percent INTEGER NOT NULL,
      max_discount_amount INTEGER DEFAULT 2000,
      min_order_amount INTEGER DEFAULT 1999,
      expiry_date TEXT,
      usage_limit INTEGER DEFAULT 1000,
      times_used INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Orders Table
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      address_data TEXT NOT NULL, -- JSON string of shipping address
      subtotal INTEGER NOT NULL,
      discount_amount INTEGER DEFAULT 0,
      coupon_code TEXT,
      delivery_fee INTEGER DEFAULT 0,
      tax_amount INTEGER DEFAULT 0,
      total_amount INTEGER NOT NULL,
      status TEXT DEFAULT 'Placed', -- 'Placed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'
      payment_status TEXT DEFAULT 'Pending', -- 'Pending', 'Paid', 'Failed', 'Refunded'
      payment_method TEXT DEFAULT 'Razorpay',
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      refund_id TEXT,
      refund_error TEXT,
      refund_idempotency_key TEXT,
      failed_refund_id TEXT,
      refund_claimed_at INTEGER,
      refund_claim_token TEXT,
      tracking_number TEXT,
      courier_partner TEXT,
      carrier_assigned_explicitly INTEGER DEFAULT 0,
      estimated_delivery TEXT,
      expires_at INTEGER, -- Unix timestamp in milliseconds when pending checkout reservation expires
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- Order Items Table
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      product_name TEXT NOT NULL,
      variant_name TEXT,
      color_hex TEXT,
      price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      image_url TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
    );

    -- Payments Table
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      razorpay_order_id TEXT NOT NULL,
      razorpay_payment_id TEXT NOT NULL,
      razorpay_signature TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'Captured',
      method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- Reviews Table
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT,
      comment TEXT NOT NULL,
      verified_purchase INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Product Questions & Answers (Q&A) Table
    CREATE TABLE IF NOT EXISTS product_qa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      answered_by TEXT DEFAULT NULL,
      helpful_votes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_fabric ON products(fabric);
    CREATE INDEX IF NOT EXISTS idx_products_occasion ON products(occasion);
    CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_qa_product ON product_qa(product_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_order ON order_items(product_id, order_id);

    -- Q&A Helpful Votes Table (Tracks unique votes per voter key / user)
    CREATE TABLE IF NOT EXISTS product_qa_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qa_id INTEGER NOT NULL,
      voter_key TEXT NOT NULL,
      user_id INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(qa_id, voter_key),
      FOREIGN KEY (qa_id) REFERENCES product_qa(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_qa_votes_qa ON product_qa_votes(qa_id);
    CREATE INDEX IF NOT EXISTS idx_qa_votes_key ON product_qa_votes(voter_key);

    -- Anonymous Vote Rotation Ledger (Shared durable expiring ledger for anonymous voting)
    CREATE TABLE IF NOT EXISTS anonymous_vote_rotation_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_ip TEXT NOT NULL,
      qa_id INTEGER NOT NULL,
      original_browser_key TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_ip, qa_id),
      FOREIGN KEY (qa_id) REFERENCES product_qa(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_rot_ledger_ip ON anonymous_vote_rotation_ledger(client_ip);
    CREATE INDEX IF NOT EXISTS idx_rot_ledger_expiry ON anonymous_vote_rotation_ledger(expires_at);

    -- Carrier Assignment Audit Table (Durable verified audit source for explicit admin carrier assignments)
    CREATE TABLE IF NOT EXISTS carrier_assignment_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL,
      courier_partner TEXT NOT NULL,
      assigned_by TEXT DEFAULT 'admin',
      evidence_source TEXT DEFAULT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_carrier_assignment_audit_order ON carrier_assignment_audit(order_number);
  `);

  try {
    db.exec(`ALTER TABLE carrier_assignment_audit ADD COLUMN evidence_source TEXT DEFAULT NULL;`);
  } catch (e) {}

  // Migration: Add return columns to orders if not exist
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN return_status TEXT DEFAULT NULL;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN return_reason TEXT DEFAULT NULL;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN gift_wrap INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN gift_message TEXT DEFAULT NULL;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN expires_at INTEGER DEFAULT NULL;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN refund_id TEXT DEFAULT NULL;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN refund_error TEXT DEFAULT NULL;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN refund_idempotency_key TEXT DEFAULT NULL;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN failed_refund_id TEXT DEFAULT NULL;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN refund_claimed_at INTEGER DEFAULT NULL;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN refund_claim_token TEXT DEFAULT NULL;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN carrier_assigned_explicitly INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_pending_expiry ON orders(payment_status, expires_at);`);
  } catch (e) {}
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_order_items_product_order ON order_items(product_id, order_id);`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE products ADD COLUMN silk_mark_certified INTEGER DEFAULT 0;`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE order_items ADD COLUMN variant_id INTEGER DEFAULT NULL;`);
  } catch (e) {}

  // Migration: Ensure distinct primary and gallery images for all best-seller records across existing databases
  try {
    const productFixes = [
      {
        slug: 'jahanara-royal-velvet-zardozi-bridal-masterpiece',
        images: ['/images/sarees/velvet_zardozi.jpg', '/images/sarees/velvet_zardozi_detail.jpg']
      },
      {
        slug: 'samrajni-grand-muhurtham-24k-gold-korvai-kanjivaram',
        images: ['/images/sarees/kanjivaram_gold.jpg']
      },
      {
        slug: 'rajkumari-heritage-sindoor-bridal-banarasi-saree',
        images: ['/images/sarees/bridal_sindoor.jpg']
      },
      {
        slug: 'arundhati-pure-silver-tissue-muhurtham-kanjivaram',
        images: ['/images/sarees/chanderi_tissue.jpg', '/images/sarees/chanderi_tissue_detail.jpg']
      }
    ];

    const getProduct = db.prepare('SELECT id FROM products WHERE slug = ?');
    const deleteImages = db.prepare('DELETE FROM product_images WHERE product_id = ?');
    const insertImage = db.prepare('INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (?, ?, ?, ?)');

    for (const fix of productFixes) {
      const prod = getProduct.get(fix.slug);
      if (prod) {
        deleteImages.run(prod.id);
        fix.images.forEach((img, idx) => {
          insertImage.run(prod.id, img, idx === 0 ? 1 : 0, idx + 1);
        });
      }
    }
    // Flush WAL to disk
    db.pragma('wal_checkpoint(TRUNCATE)');
    // One-time Migration: Remove exact legacy fixture rows (identified by exact question text and user_name)
    // or legacy concierge answers, without affecting legitimate customer questions.
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          migration_name TEXT PRIMARY KEY,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const migrationRan = db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_legacy_qa_fixtures'").get();
      if (!migrationRan) {
        const legacyFixtures = [
          { user_name: 'Meera Deshmukh', question: 'Does this saree come with an unstitched blouse piece included?' },
          { user_name: 'Meera Deshmukh', question: 'Is this 100% pure silk and does it come with a Silk Mark certification tag?' },
          { user_name: 'Sneha Kulkarni', question: 'What is the recommended care instruction for this pure silk saree?' },
          { user_name: 'Sneha Kulkarni', question: 'Does the blouse piece match the body or the pallu?' },
          { user_name: 'Kavitha R.', question: 'What is the approximate weight of this bridal Kanjivaram saree?' },
          { user_name: 'Tanvi Agarwal', question: 'How sheer is the organza fabric on this saree?' },
          { user_name: 'Tanvi Agarwal', question: 'Is the organza fabric scratchy or stiff on sensitive skin?' },
          { user_name: 'Pooja Malhotra', question: 'Are fall and edging pre-stitched on this saree?' },
          { user_name: 'Pooja Malhotra', question: 'Are fall and pico pre-stitched on this saree?' }
        ];

        const deleteStmt = db.prepare('DELETE FROM product_qa WHERE user_name = ? AND question = ?');
        for (const item of legacyFixtures) {
          deleteStmt.run(item.user_name, item.question);
        }

        db.prepare("DELETE FROM product_qa WHERE answered_by = 'PALLUVO Master Weaver Concierge'").run();

        db.prepare("INSERT OR IGNORE INTO schema_migrations (migration_name) VALUES ('cleanup_legacy_qa_fixtures')").run();
      }
    } catch (e) {
      console.log('Legacy QA fixture migration note:', e.message);
    }

    // Courier migrations: Remove fabricated tracking numbers and unverified carrier defaults
    try {
      applyCourierMigrations(db);
    } catch (e) {
      console.log('Fabricated courier migration note:', e.message);
    }
  } catch (e) {
    console.log('Product image migration note:', e.message);
  }
}

/**
 * Safely cleans up fabricated placeholder AWB references and default carrier assignments
 * from existing databases while preserving verified courier-issued references.
 */
function cleanupFabricatedCourierAwb(targetDb = db) {
  try {
    targetDb.exec(`ALTER TABLE orders ADD COLUMN carrier_assigned_explicitly INTEGER DEFAULT 0;`);
  } catch (e) {}

  // Backfill carrier_assigned_explicitly = 1 ONLY from trustworthy, carrier-specific evidence:
  // - Non-default courier partner (anything other than the legacy column default 'BlueDart Luxury Express')
  // - Real, non-placeholder tracking number already assigned
  //
  // Note: Order timestamps (created_at / updated_at) are NOT used to infer explicit carrier assignment,
  // because updated_at is mutated by unrelated non-carrier events (payment confirmation, refunds, notes)
  // on orders that merely inherited the column default.
  try {
    targetDb.prepare(`
      UPDATE orders
      SET carrier_assigned_explicitly = 1
      WHERE (carrier_assigned_explicitly IS NULL OR carrier_assigned_explicitly = 0)
        AND courier_partner IS NOT NULL
        AND (
          courier_partner != 'BlueDart Luxury Express'
          OR (
            tracking_number IS NOT NULL
            AND tracking_number != 'BLR-BD-889921'
            AND tracking_number NOT GLOB 'BLR-BD-[0-9A-Fa-f][0-9A-Fa-f]*'
          )
        )
    `).run();
  } catch (e) {}

  const placeholderAwbRegex = /^BLR-BD-[0-9A-Fa-f]{24}$/;

  // 1. Isolate and sanitize known sample order PAL-2026-98124 ONLY if it still holds fabricated values.
  // If an admin has since updated this order with real shipment tracking, preserve that data.
  const sampleOrder = targetDb.prepare(
    "SELECT id, tracking_number, courier_partner, status, estimated_delivery, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-2026-98124'"
  ).get();

  if (sampleOrder) {
    const isPlaceholderAwb = sampleOrder.tracking_number === 'BLR-BD-889921' ||
      (sampleOrder.tracking_number && placeholderAwbRegex.test(sampleOrder.tracking_number));

    // Only clear tracking and reset 'Shipped' to 'Confirmed' if it carries the fabricated AWB
    if (isPlaceholderAwb) {
      targetDb.prepare(`
        UPDATE orders
        SET tracking_number = NULL,
            status = CASE WHEN status = 'Shipped' THEN 'Confirmed' ELSE status END
        WHERE id = ?
      `).run(sampleOrder.id);
    }

    // Only clear BlueDart courier if tracking is missing or was a fabricated placeholder
    // AND the carrier was not explicitly assigned by an admin
    const isExplicitCarrier = sampleOrder.carrier_assigned_explicitly === 1;
    if (!isExplicitCarrier && sampleOrder.courier_partner === 'BlueDart Luxury Express' && (isPlaceholderAwb || !sampleOrder.tracking_number)) {
      targetDb.prepare("UPDATE orders SET courier_partner = NULL WHERE id = ?").run(sampleOrder.id);
    }

    // Only reset estimated delivery if the order still carries the exact legacy fixture state
    // (i.e. while the fake placeholder AWB is still present). Never reset a legitimate next-day estimate.
    if (isPlaceholderAwb && sampleOrder.estimated_delivery && sampleOrder.estimated_delivery.includes('Tomorrow')) {
      targetDb.prepare("UPDATE orders SET estimated_delivery = '3-4 business days' WHERE id = ?").run(sampleOrder.id);
    }
  }

  // 2. Clear exact generated placeholder tracking numbers (BLR-BD-<24 hex> and BLR-BD-889921)
  // and their associated placeholder courier_partner across all orders, preserving real references
  const ordersWithTracking = targetDb.prepare("SELECT id, tracking_number, courier_partner, carrier_assigned_explicitly FROM orders WHERE tracking_number IS NOT NULL").all();
  const updateOrderAwb = targetDb.prepare(`
    UPDATE orders
    SET tracking_number = NULL,
        courier_partner = CASE WHEN courier_partner = 'BlueDart Luxury Express' AND (carrier_assigned_explicitly IS NULL OR carrier_assigned_explicitly = 0) THEN NULL ELSE courier_partner END
    WHERE id = ?
  `);

  for (const ord of ordersWithTracking) {
    if (ord.tracking_number === 'BLR-BD-889921' || placeholderAwbRegex.test(ord.tracking_number)) {
      updateOrderAwb.run(ord.id);
    }
  }

  // 3. Clear legacy unverified courier defaults on orders without an AWB where reliable evidence exists:
  // - Unpaid / abandoned checkout reservations (payment_status = 'Pending')
  // Ambiguous pre-AWB historical assignments across all lifecycle statuses
  // (Placed, Processing, Packed, Shipped, Out for Delivery, Delivered)
  // are strictly preserved so genuine admin carrier selections are never deleted.
  const columns = targetDb.pragma('table_info(orders)').map(c => c.name);
  const hasPaymentStatus = columns.includes('payment_status');

  if (hasPaymentStatus) {
    targetDb.prepare(`
      UPDATE orders
      SET courier_partner = NULL
      WHERE courier_partner = 'BlueDart Luxury Express'
        AND tracking_number IS NULL
        AND (carrier_assigned_explicitly IS NULL OR carrier_assigned_explicitly = 0)
        AND payment_status = 'Pending'
    `).run();
  }
}

/**
 * Corrective migration for databases upgraded during commit ce02ddf:
 * Safely repairs rows misclassified by the previous timestamp heuristic.
 * - For unverified no-AWB rows on unpaid checkout reservations (payment_status = 'Pending'),
 *   resets carrier_assigned_explicitly to 0 and clears courier_partner to NULL.
 * - Explicit carrier assignments (carrier_assigned_explicitly = 1) across all order statuses
 *   and payment statuses (including paid Placed, Processing, Packed, and Shipped orders as well
 *   as pending reservations) are strictly preserved so genuine admin carrier selections are never erased.
 * - Ambiguous pre-AWB historical rows across paid order statuses preserve courier_partner intact.
 */
function repairMisclassifiedCourierDefaults(targetDb = db) {
  try {
    targetDb.exec(`ALTER TABLE orders ADD COLUMN carrier_assigned_explicitly INTEGER DEFAULT 0;`);
  } catch (e) {}

  const columns = targetDb.pragma('table_info(orders)').map(c => c.name);
  const hasPaymentStatus = columns.includes('payment_status');

  // 1. Clear unverified legacy default courier on unassigned checkout reservations where reliable audit evidence exists
  // (checkout defaults lacking explicit carrier assignment evidence: carrier_assigned_explicitly = 0 or NULL).
  // Strictly preserves rows with reliable explicit-assignment evidence (carrier_assigned_explicitly = 1).
  if (hasPaymentStatus) {
    targetDb.prepare(`
      UPDATE orders
      SET carrier_assigned_explicitly = 0,
          courier_partner = NULL
      WHERE courier_partner = 'BlueDart Luxury Express'
        AND tracking_number IS NULL
        AND (carrier_assigned_explicitly IS NULL OR carrier_assigned_explicitly = 0)
        AND payment_status = 'Pending'
    `).run();
  }

  // 2. Explicit carrier assignments (carrier_assigned_explicitly = 1) on paid orders
  // (Placed, Processing, Packed, Shipped) must be strictly preserved!
  // We do not blindly reset carrier_assigned_explicitly = 0 on paid BlueDart/no-AWB rows,
  // because an admin-assigned BlueDart carrier on a paid Placed, Processing, or Packed order can already have flag 1.
  // Erasing that evidence causes tracking endpoints to suppress the assigned carrier, and subsequent
  // cleanup cannot backfill it because BlueDart is the legacy default and there is no AWB.

  cleanupFabricatedCourierAwb(targetDb);
}

/**
 * Safe operator recovery path for historical orders damaged by the earlier v3 migration.
 * Allows operators to supply verified assignment evidence (e.g. from physical dispatch manifests,
 * warehouse dispatch logs, or customer correspondence) to safely restore carrier_assigned_explicitly = 1
 * without guessing or falsely verifying ambiguous defaults.
 *
 * Atomically validates the entire batch upfront: if any record has validation errors or is missing,
 * the entire batch is rejected without committing partial changes.
 * Repeated execution on already recovered orders is idempotent and avoids inserting duplicate audit records.
 *
 * @param {Array<{order_number: string, courier_partner?: string, evidence_source: string, verified_by: string}>} verifiedRecords
 * @param {Database} targetDb
 * @returns {{ recovered: Array<string>, skipped: Array<string>, errors: Array<string> }}
 */
function recoverCarrierAssignmentsWithVerifiedEvidence(verifiedRecords = [], targetDb = db) {
  if (!Array.isArray(verifiedRecords) || verifiedRecords.length === 0) {
    return { recovered: [], skipped: [], errors: [] };
  }

  const results = { recovered: [], skipped: [], errors: [] };

  // Ensure table and evidence_source column exist
  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS carrier_assignment_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL,
      courier_partner TEXT NOT NULL,
      assigned_by TEXT DEFAULT 'admin',
      evidence_source TEXT DEFAULT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  try {
    targetDb.exec(`ALTER TABLE carrier_assignment_audit ADD COLUMN evidence_source TEXT DEFAULT NULL;`);
  } catch (e) {}

  const selectOrder = targetDb.prepare(
    'SELECT order_number, courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = ?'
  );
  const checkAudit = targetDb.prepare(
    'SELECT id FROM carrier_assignment_audit WHERE order_number = ? AND courier_partner = ?'
  );
  const updateOrder = targetDb.prepare(`
    UPDATE orders
    SET carrier_assigned_explicitly = 1,
        courier_partner = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE order_number = ?
  `);
  const insertAudit = targetDb.prepare(`
    INSERT INTO carrier_assignment_audit (order_number, courier_partner, assigned_by, evidence_source)
    VALUES (?, ?, ?, ?)
  `);

  // Pre-validate the entire batch upfront. If ANY record has an error, abort without modifying database.
  const validatedRecords = [];
  for (const record of verifiedRecords) {
    if (!record || !record.order_number) {
      results.errors.push('Missing order_number');
      continue;
    }

    const evidence = record.evidence_source && typeof record.evidence_source === 'string'
      ? record.evidence_source.trim()
      : '';
    if (!evidence) {
      results.errors.push(`Order ${record.order_number}: Missing or blank evidence_source. Verified evidence is strictly required.`);
      continue;
    }

    const assignedBy = record.verified_by && typeof record.verified_by === 'string'
      ? record.verified_by.trim()
      : '';
    if (!assignedBy) {
      results.errors.push(`Order ${record.order_number}: Missing or blank verified_by. A meaningful operator identity is strictly required.`);
      continue;
    }

    const ord = selectOrder.get(record.order_number);
    if (!ord) {
      results.errors.push(`Order ${record.order_number} not found.`);
      continue;
    }

    const courier = (record.courier_partner || ord.courier_partner || '').trim();
    if (!courier) {
      results.errors.push(`Order ${record.order_number}: Missing courier_partner. An explicit carrier partner must be provided or present on the order.`);
      continue;
    }

    validatedRecords.push({
      order_number: record.order_number,
      courier_partner: courier,
      assigned_by: assignedBy,
      evidence_source: evidence
    });
  }

  // If any record in the batch failed validation, abort the entire batch without applying partial changes
  if (results.errors.length > 0) {
    return results;
  }

  // Atomically apply validated records with idempotent audit logging
  const runRecovery = targetDb.transaction((records) => {
    for (const item of records) {
      updateOrder.run(item.courier_partner, item.order_number);

      // Idempotent audit check: avoid duplicate audit entries for already recovered order/carrier
      const existingAudit = checkAudit.get(item.order_number, item.courier_partner);
      if (!existingAudit) {
        insertAudit.run(item.order_number, item.courier_partner, item.assigned_by, item.evidence_source);
      }

      results.recovered.push(item.order_number);
    }
  });

  try {
    runRecovery(validatedRecords);
  } catch (err) {
    results.errors.push(`Transaction failed: ${err.message}`);
    results.recovered = [];
  }

  return results;
}

/**
 * Corrective migration for databases that already recorded v3 (cleanup_misclassified_timestamp_carrier_defaults):
 * Safely restores explicit carrier assignments damaged by the earlier v3 implementation ONLY when durable
 * assignment evidence is available, while strictly keeping ambiguous defaults unverified:
 *
 * 1. Verified Audit Source: If a durable admin-assignment audit table exists and contains records (e.g. carrier_assignment_audit or
 *    order_carrier_assignments), recovers carrier_assigned_explicitly = 1 for orders with recorded admin assignments.
 * 2. Operator Verified Manifest: Ingests verified historical evidence if supplied via environment
 *    (OPERATOR_VERIFIED_CARRIER_RECOVERY) or data file (operator_carrier_recovery.json).
 * 3. Carrier-Specific Evidence: Restores carrier_assigned_explicitly = 1 for non-default carriers (courier_partner != 'BlueDart Luxury Express')
 *    or verified courier-issued AWBs (real tracking numbers) via cleanupFabricatedCourierAwb.
 * 4. Safe Default Isolation: For BlueDart/no-AWB rows where NO verified evidence or audit record exists, rows safely
 *    remain unverified (carrier_assigned_explicitly = 0) with courier_partner preserved intact in the DB.
 *    Operators can safely restore genuine assignments at any time via recoverCarrierAssignmentsWithVerifiedEvidence.
 */
function restorePaidOrderExplicitCarrierAssignments(targetDb = db) {
  try {
    targetDb.exec(`ALTER TABLE orders ADD COLUMN carrier_assigned_explicitly INTEGER DEFAULT 0;`);
  } catch (e) {}

  // 1. Recover from durable assignment evidence if a verified audit source is present:
  const tables = targetDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

  if (tables.includes('carrier_assignment_audit')) {
    try {
      targetDb.prepare(`
        UPDATE orders
        SET carrier_assigned_explicitly = 1
        WHERE order_number IN (
          SELECT DISTINCT order_number FROM carrier_assignment_audit WHERE courier_partner IS NOT NULL
        )
      `).run();
    } catch (e) {}
  }

  if (tables.includes('order_carrier_assignments')) {
    try {
      targetDb.prepare(`
        UPDATE orders
        SET carrier_assigned_explicitly = 1
        WHERE order_number IN (
          SELECT DISTINCT order_number FROM order_carrier_assignments WHERE courier_partner IS NOT NULL
        )
      `).run();
    } catch (e) {}
  }

  // 2. Ingest operator-provided verified recovery manifest if present:
  try {
    let manifestRecords = null;
    if (process.env.OPERATOR_VERIFIED_CARRIER_RECOVERY) {
      try {
        manifestRecords = JSON.parse(process.env.OPERATOR_VERIFIED_CARRIER_RECOVERY);
      } catch (e) {}
    } else {
      const manifestPath = path.resolve(__dirname, '../data/operator_carrier_recovery.json');
      if (fs.existsSync(manifestPath)) {
        try {
          manifestRecords = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch (e) {}
      }
    }
    if (Array.isArray(manifestRecords) && manifestRecords.length > 0) {
      recoverCarrierAssignmentsWithVerifiedEvidence(manifestRecords, targetDb);
    }
  } catch (e) {}

  // 3. Recover from carrier-specific evidence (custom carrier or real AWB) and sanitize placeholder AWBs:
  cleanupFabricatedCourierAwb(targetDb);
}

/**
 * Applies courier and AWB cleanup migrations idempotently:
 * - 'cleanup_fabricated_courier_awb': Initial migration clearing fake AWBs and undispatched defaults
 * - 'cleanup_legacy_default_carrier_no_awb': Corrective migration ensuring even databases that already ran
 *   the initial migration have legacy default 'BlueDart Luxury Express' cleared from no-AWB rows regardless of status.
 * - 'cleanup_misclassified_timestamp_carrier_defaults': Corrective migration repairing orders mistakenly flagged
 *   as explicit by the timestamp heuristic in commit ce02ddf.
 * - 'restore_paid_order_explicit_carrier_assignments': Corrective migration for databases that already recorded
 *   v3, safely recovering explicit carrier assignments on paid orders when durable evidence exists, and leaving
 *   damaged historical BlueDart/no-AWB rows without pre-existing durable audit records unverified (flag = 0) until
 *   an operator restores them via recoverCarrierAssignmentsWithVerifiedEvidence with verified evidence.
 */
function applyCourierMigrations(targetDb = db) {
  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const v1Ran = targetDb.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_fabricated_courier_awb'").get();
  if (!v1Ran) {
    cleanupFabricatedCourierAwb(targetDb);
    targetDb.prepare("INSERT OR IGNORE INTO schema_migrations (migration_name) VALUES ('cleanup_fabricated_courier_awb')").run();
  }

  const v2Ran = targetDb.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_legacy_default_carrier_no_awb'").get();
  if (!v2Ran) {
    cleanupFabricatedCourierAwb(targetDb);
    targetDb.prepare("INSERT OR IGNORE INTO schema_migrations (migration_name) VALUES ('cleanup_legacy_default_carrier_no_awb')").run();
  }

  const v3AlreadyRecorded = Boolean(targetDb.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_misclassified_timestamp_carrier_defaults'").get());
  if (!v3AlreadyRecorded) {
    repairMisclassifiedCourierDefaults(targetDb);
    targetDb.prepare("INSERT OR IGNORE INTO schema_migrations (migration_name) VALUES ('cleanup_misclassified_timestamp_carrier_defaults')").run();
  }

  const v4Ran = targetDb.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'restore_paid_order_explicit_carrier_assignments'").get();
  if (!v4Ran) {
    // If v3 was recorded prior to this migration pass (by the earlier flawed implementation),
    // restore the explicit carrier flag on affected paid orders.
    if (v3AlreadyRecorded) {
      restorePaidOrderExplicitCarrierAssignments(targetDb);
    }
    targetDb.prepare("INSERT OR IGNORE INTO schema_migrations (migration_name) VALUES ('restore_paid_order_explicit_carrier_assignments')").run();
  }
}

initSchema();

db.initSchema = initSchema;
db.cleanupFabricatedCourierAwb = cleanupFabricatedCourierAwb;
db.repairMisclassifiedCourierDefaults = repairMisclassifiedCourierDefaults;
db.restorePaidOrderExplicitCarrierAssignments = restorePaidOrderExplicitCarrierAssignments;
db.recoverCarrierAssignmentsWithVerifiedEvidence = recoverCarrierAssignmentsWithVerifiedEvidence;
db.applyCourierMigrations = applyCourierMigrations;

module.exports = db;


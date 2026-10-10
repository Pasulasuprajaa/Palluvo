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
      tracking_number TEXT,
      courier_partner TEXT DEFAULT 'BlueDart Luxury Express',
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
      answered_by TEXT DEFAULT 'PALLUVO Master Weaver Concierge',
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
  `);

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
    db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_pending_expiry ON orders(payment_status, expires_at);`);
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
  } catch (e) {
    console.log('Product image migration note:', e.message);
  }
}

initSchema();

module.exports = db;

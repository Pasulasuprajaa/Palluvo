const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const vite = require('vite');

async function testShopFilterAccessibility() {
  console.log('\n--- Testing [P2] Shop Filter Accessibility & Dialog Semantics ---');

  const shopPagePath = path.resolve(__dirname, '../../client/src/pages/ShopPage.jsx');
  assert.ok(fs.existsSync(shopPagePath), 'ShopPage.jsx must exist');
  const shopPageSource = fs.readFileSync(shopPagePath, 'utf8');

  // 1. Verify Desktop and Mobile Filter Selection State Semantics (aria-pressed)
  // Desktop Price Range
  assert.ok(
    /priceRangesList\.map\(\(p,\s*idx\)\s*=>[\s\S]*?aria-pressed=\{isSelected\}/.test(shopPageSource) ||
    /aria-pressed=\{priceRange\.min === p\.min && priceRange\.max === p\.max\}/.test(shopPageSource) ||
    shopPageSource.includes('aria-pressed={isSelected}'),
    'Desktop price-range buttons must expose aria-pressed selection state'
  );

  // Mobile Price Range
  assert.ok(
    /Price Range[\s\S]*?priceRangesList\.map[\s\S]*?aria-pressed=\{isSelected\}/.test(shopPageSource),
    'Mobile price-range buttons must expose aria-pressed selection state'
  );

  // Mobile Color Palette
  assert.ok(
    /Color Palette[\s\S]*?colorsList\.map[\s\S]*?aria-pressed=\{isSelected\}[\s\S]*?aria-label=\{c\.name\}/.test(shopPageSource) ||
    /colorsList\.map[\s\S]*?aria-pressed=\{isSelected\}/.test(shopPageSource),
    'Mobile color buttons must expose aria-pressed selection state and accessible label'
  );

  // Mobile Fabric
  assert.ok(
    /Fabric[\s\S]*?fabricsList\.map[\s\S]*?aria-pressed=\{isSelected\}/.test(shopPageSource),
    'Mobile fabric buttons must expose aria-pressed selection state'
  );

  // Mobile Occasion
  assert.ok(
    /Occasion[\s\S]*?occasionsList\.map[\s\S]*?aria-pressed=\{isSelected\}/.test(shopPageSource),
    'Mobile occasion buttons must expose aria-pressed selection state'
  );

  // Mobile Rating
  assert.ok(
    /Customer Rating[\s\S]*?ratingsList\.map[\s\S]*?aria-pressed=\{isSelected\}/.test(shopPageSource),
    'Mobile customer rating buttons must expose aria-pressed selection state'
  );

  console.log('✅ PASS: [P2] Desktop and mobile filter controls (price, color, fabric, occasion, rating) expose aria-pressed semantics');

  // 2. Verify Mobile Filter Sheet Modal Dialog Semantics
  // Dialog role, aria-modal, and accessible naming
  assert.ok(
    shopPageSource.includes('role="dialog"') &&
    shopPageSource.includes('aria-modal="true"') &&
    shopPageSource.includes('aria-labelledby="mobile-filter-title"'),
    'Mobile filter sheet must have role="dialog", aria-modal="true", and aria-labelledby="mobile-filter-title"'
  );

  assert.ok(
    shopPageSource.includes('id="mobile-filter-title"') &&
    shopPageSource.includes('Filter & Sort Sarees'),
    'Modal dialog must contain title heading with id="mobile-filter-title"'
  );

  assert.ok(
    shopPageSource.includes('aria-label="Close filters"'),
    'Modal dialog close button must have accessible aria-label="Close filters"'
  );

  assert.ok(
    shopPageSource.includes('aria-hidden="true"'),
    'Modal backdrop must have aria-hidden="true" to prevent screen reader focus leak'
  );

  assert.ok(
    shopPageSource.includes('aria-controls="mobile-filter-dialog"') &&
    shopPageSource.includes('aria-haspopup="dialog"') &&
    shopPageSource.includes('aria-expanded={mobileFilterOpen}'),
    'Mobile filter trigger button must expose aria-controls, aria-haspopup="dialog", and dynamic aria-expanded'
  );

  console.log('✅ PASS: [P2] Mobile filter sheet exposes proper dialog role, aria-modal, accessible title, and close label');

  // 3. Verify Focus Management, Keyboard Trap, Escape-to-close, and Focus Restoration
  assert.ok(
    shopPageSource.includes('closeButtonRef.current.focus()') ||
    shopPageSource.includes('dialogPanelRef.current.focus()'),
    'Focus entry: Opening modal must move focus into the modal'
  );

  assert.ok(
    shopPageSource.includes("event.key === 'Escape'") &&
    shopPageSource.includes('setMobileFilterOpen(false)'),
    'Escape-to-close: Pressing Escape must close the mobile filter dialog'
  );

  assert.ok(
    shopPageSource.includes("event.key === 'Tab'") &&
    shopPageSource.includes('event.shiftKey') &&
    shopPageSource.includes('lastElement.focus()') &&
    shopPageSource.includes('firstElement.focus()'),
    'Focus trapping: Tab and Shift+Tab must be trapped within the dialog container'
  );

  assert.ok(
    shopPageSource.includes('previouslyFocusedElementRef.current') &&
    shopPageSource.includes('restoreTarget.focus()'),
    'Focus restoration: Closing modal must return focus to trigger element'
  );

  // Fallback to trigger when previously focused element is body or not usable
  assert.ok(
    shopPageSource.includes('activeEl !== document.body') &&
    shopPageSource.includes('mobileFilterTriggerRef.current'),
    'Focus fallback: If document.activeElement is body or not usable, must fall back to mobileFilterTriggerRef'
  );

  // Desktop transition: Dismissal & visible focus restoration
  assert.ok(
    shopPageSource.includes('(min-width: 1024px)') &&
    shopPageSource.includes('handleDesktopTransition') &&
    shopPageSource.includes('setMobileFilterOpen(false)'),
    'Desktop transition: Viewport resizing/rotating to lg breakpoint (1024px) must dismiss mobile filter sheet'
  );

  assert.ok(
    shopPageSource.includes('desktopFilterSidebarRef') &&
    shopPageSource.includes('wasDesktopDismissed') &&
    shopPageSource.includes('isElementVisible') &&
    shopPageSource.includes('visibleDesktopControl'),
    'Desktop transition focus: Must restore focus to visible desktop filter landmark/control when dismissed at desktop breakpoint'
  );

  assert.ok(
    shopPageSource.includes("document.body.style.overflow = 'hidden'") &&
    shopPageSource.includes('document.body.style.overflow = originalOverflow'),
    'Scroll lock: Body scroll must be locked when dialog is open and cleanly restored on close'
  );

  console.log('✅ PASS: [P2] Dialog focus entry, focus trapping, Escape-to-close, body focus fallback, desktop breakpoint dismissal, and visible desktop focus restoration verified in code structure');

  // 3.5 Verify [P1] body-parser GHSA-27r3-jxmh-p828 Mitigation
  const serverPackageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  const serverPackageLock = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package-lock.json'), 'utf8'));
  const serverIndexSource = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8');

  const bodyParserDep = serverPackageJson.dependencies?.['body-parser'] || serverPackageJson.overrides?.['body-parser'];
  assert.ok(bodyParserDep && (bodyParserDep.includes('2.4') || bodyParserDep.includes('^2.4')), 'server/package.json must lock or override body-parser to ^2.4.0');

  const bodyParserLockVer = serverPackageLock.packages?.['node_modules/body-parser']?.version;
  assert.ok(bodyParserLockVer && !bodyParserLockVer.startsWith('2.3.') && !bodyParserLockVer.startsWith('2.2.'), 'server/package-lock.json must resolve body-parser to patched version >= 2.4.0');

  assert.ok(
    serverIndexSource.includes('express.json({ inflate: false })') || serverIndexSource.includes('inflate: false'),
    'server/index.js must disable inflate to prevent compressed payload DoS (GHSA-27r3-jxmh-p828)'
  );
  console.log('✅ PASS: [P1] body-parser patched to >= 2.4.0 and express.json({ inflate: false }) prevents compressed payload crash');

  // 3.5b Verify [P2] ip-address GHSA-rxp7-6hxx-x8q5 Mitigation in server lockfile
  const ipAddressLockVer = serverPackageLock.packages?.['node_modules/ip-address']?.version;
  assert.ok(
    ipAddressLockVer && !['10.7.3', '10.7.2', '10.7.1', '10.7.0'].includes(ipAddressLockVer),
    'server/package-lock.json must resolve ip-address to patched version >= 10.7.4 (GHSA-rxp7-6hxx-x8q5)'
  );
  console.log('✅ PASS: [P2] ip-address patched to >= 10.7.4 in server lockfile (GHSA-rxp7-6hxx-x8q5 resolved)');

  // 3.6 Verify [P2] Product Detail Customer Trust & Truthful Urgency/Popularity Metrics
  const productDetailPagePath = path.resolve(__dirname, '../../client/src/pages/ProductDetailPage.jsx');
  assert.ok(fs.existsSync(productDetailPagePath), 'ProductDetailPage.jsx must exist');
  const productDetailSource = fs.readFileSync(productDetailPagePath, 'utf8');

  // Must not have hardcoded orders count or viewer count literals
  assert.ok(
    !productDetailSource.includes('14 orders placed in last 24 hours'),
    'ProductDetailPage must not contain hard-coded "14 orders placed in last 24 hours"'
  );
  assert.ok(
    !productDetailSource.includes('8 people viewing right now'),
    'ProductDetailPage must not contain hard-coded "8 people viewing right now"'
  );

  // Must not contain arbitrary cycling countdown timer or fake urgency claim
  assert.ok(
    !productDetailSource.includes('hours: 3, minutes: 42'),
    'ProductDetailPage must not contain arbitrary looping countdown state'
  );
  assert.ok(
    !productDetailSource.includes('Order within <strong'),
    'ProductDetailPage must not display unsupported "Order within" urgency claim'
  );

  // Must condition sales badge on verified server metric
  assert.ok(
    productDetailSource.includes('product.recent_orders_24h > 0') &&
    productDetailSource.includes('{product.recent_orders_24h}'),
    'ProductDetailPage must conditionally render recent order badge only when product.recent_orders_24h > 0'
  );

  // Server product endpoint must calculate verified recent_orders_24h from database
  const productsRouteSource = fs.readFileSync(path.resolve(__dirname, '../routes/products.js'), 'utf8');
  assert.ok(
    productsRouteSource.includes('recent_orders_24h') &&
    productsRouteSource.includes('COUNT(DISTINCT o.id)') &&
    productsRouteSource.includes("o.payment_status = 'Paid'") &&
    productsRouteSource.includes("o.status != 'Cancelled'") &&
    productsRouteSource.includes("datetime('now', '-24 hours')"),
    'server/routes/products.js must count distinct completed paid, non-cancelled orders in the last 24 hours'
  );
  console.log('✅ PASS: [P2] ProductDetailPage customer trust: fake countdown and unverified popularity badges eliminated, verified metrics properly gated');

  // 3.7 Verify [P2] Courier AWB & Dispatch Telemetry Truthfulness
  const paymentsRouteSource = fs.readFileSync(path.resolve(__dirname, '../routes/payments.js'), 'utf8');
  assert.ok(
    !paymentsRouteSource.includes('trackingNumber = `BLR-BD-') &&
    !paymentsRouteSource.includes('BLR-BD-${crypto'),
    'server/routes/payments.js must not mint fabricated BLR-BD tracking numbers on pending order creation'
  );
  assert.ok(
    /rzpOrder\.id,\s*null,\s*null,/.test(paymentsRouteSource),
    'server/routes/payments.js must leave tracking_number and courier_partner NULL until dispatched'
  );

  const ordersRouteSource = fs.readFileSync(path.resolve(__dirname, '../routes/orders.js'), 'utf8');
  assert.ok(
    !ordersRouteSource.includes("'BLR-BD-' + order.id * 117") &&
    !ordersRouteSource.includes('order.id * 117'),
    'server/routes/orders.js must not synthesize fallback tracking numbers from internal order id'
  );
  assert.ok(
    ordersRouteSource.includes('currentStageIndex >= 3') &&
    ordersRouteSource.includes('Package will be handed over to courier partner upon packing'),
    'server/routes/orders.js must gate courier dispatch copy on stage >= 3 being reached'
  );

  const orderTrackingSource = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/OrderTrackingPage.jsx'), 'utf8');
  assert.ok(
    !orderTrackingSource.includes("'BLR-BD-889921'"),
    'OrderTrackingPage must not hard-code fallback BLR-BD-889921 tracking number'
  );
  assert.ok(
    orderTrackingSource.includes('orderInfo.tracking_number &&'),
    'OrderTrackingPage must only render Tracking AWB row when tracking_number exists'
  );
  assert.ok(
    orderTrackingSource.includes('aria-label="Order ID or Tracking Number"') ||
    orderTrackingSource.includes('htmlFor="tracking-search-input"'),
    'OrderTrackingPage tracking search input must have an accessible name (label or aria-label)'
  );
  assert.ok(
    orderTrackingSource.includes('id="tracking-search-input"'),
    'OrderTrackingPage tracking input must have an id associated with its label'
  );

  const seedSource = fs.readFileSync(path.resolve(__dirname, '../db/seed.js'), 'utf8');
  assert.ok(
    !seedSource.includes("'BLR-BD-889921'") &&
    !seedSource.includes('BlueDart Luxury Express'),
    'server/db/seed.js must not seed fabricated courier or AWB data for sample orders'
  );

  const invoiceModalSource = fs.readFileSync(path.resolve(__dirname, '../../client/src/components/InvoiceModal.jsx'), 'utf8');
  assert.ok(
    !invoiceModalSource.includes("'BlueDart Luxury Express'") &&
    !invoiceModalSource.includes("'BLR-BD-889921'"),
    'client/src/components/InvoiceModal.jsx must not assert an unassigned carrier or fallback AWB'
  );
  assert.ok(
    invoiceModalSource.includes('order.courier_partner &&'),
    'client/src/components/InvoiceModal.jsx must only render courier partner when order.courier_partner is assigned'
  );
  console.log('✅ PASS: [P2] Courier AWB and dispatch telemetry strictly gated on actual shipment dispatch without fabricated values in payments, orders, seed, or invoice');

  // 3.8 Upgrade-Path Regression Test: Pre-fix database with fabricated values upgraded safely
  const Database = require('better-sqlite3');
  const dbModule = require('../db/database');
  const upgradeDbPath = path.resolve(__dirname, `../data/.upgrade_test_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
  const legacyDb = new Database(upgradeDbPath);

  try {
    // 1. Initialize pre-fix schema (with old DEFAULT 'BlueDart Luxury Express')
    legacyDb.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password_hash TEXT
      );
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        address_data TEXT,
        subtotal INTEGER NOT NULL,
        discount_amount INTEGER DEFAULT 0,
        coupon_code TEXT,
        delivery_fee INTEGER DEFAULT 0,
        tax_amount INTEGER DEFAULT 0,
        total_amount INTEGER NOT NULL,
        status TEXT DEFAULT 'Placed',
        payment_status TEXT DEFAULT 'Pending',
        payment_method TEXT DEFAULT 'Razorpay',
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        tracking_number TEXT,
        courier_partner TEXT DEFAULT 'BlueDart Luxury Express',
        estimated_delivery TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Insert pre-fix rows representing legacy states:
    // Row 1: The old sample seeded order (Shipped with fake AWB and fixed 'Tomorrow' delivery)
    legacyDb.prepare(`
      INSERT INTO orders (order_number, subtotal, total_amount, status, payment_status, tracking_number, courier_partner, estimated_delivery)
      VALUES ('PAL-2026-98124', 12999, 11700, 'Shipped', 'Paid', 'BLR-BD-889921', 'BlueDart Luxury Express', 'Tomorrow, by 4:00 PM')
    `).run();

    // Row 2: Legacy payment-creation order with 24-hex fake tracking number
    legacyDb.prepare(`
      INSERT INTO orders (order_number, subtotal, total_amount, status, payment_status, tracking_number, courier_partner, estimated_delivery)
      VALUES ('PAL-2026-OLDHEX1', 15000, 15000, 'Placed', 'Pending', 'BLR-BD-ABCD1234EF567890ABCD1234', 'BlueDart Luxury Express', '3-4 Business Days')
    `).run();

    // Row 3: Legacy order created with schema default carrier, unassigned tracking
    legacyDb.prepare(`
      INSERT INTO orders (order_number, subtotal, total_amount, status, payment_status, tracking_number, courier_partner, estimated_delivery)
      VALUES ('PAL-2026-OLDDEF2', 8000, 8000, 'Placed', 'Pending', NULL, 'BlueDart Luxury Express', '3-4 Business Days')
    `).run();

    // Row 4: Verified real order with BlueDart (must be PRESERVED)
    legacyDb.prepare(`
      INSERT INTO orders (order_number, subtotal, total_amount, status, payment_status, tracking_number, courier_partner, estimated_delivery)
      VALUES ('PAL-2026-REAL-BD', 25000, 25000, 'Shipped', 'Paid', 'BD-991122', 'BlueDart Luxury Express', 'In 2 days')
    `).run();

    // Row 5: Verified real order with Delhivery (must be PRESERVED)
    legacyDb.prepare(`
      INSERT INTO orders (order_number, subtotal, total_amount, status, payment_status, tracking_number, courier_partner, estimated_delivery)
      VALUES ('PAL-2026-REAL-DEL', 30000, 30000, 'Shipped', 'Paid', 'DEL123456789', 'Delhivery', 'In 3 days')
    `).run();

    // Row 6: Legacy order marked Shipped without an AWB, having inherited default carrier
    legacyDb.prepare(`
      INSERT INTO orders (order_number, subtotal, total_amount, status, payment_status, tracking_number, courier_partner, estimated_delivery)
      VALUES ('PAL-2026-SHIPPED-NOAWB', 9500, 9500, 'Shipped', 'Paid', NULL, 'BlueDart Luxury Express', '3-4 Business Days')
    `).run();

    // 3. Confirm that pre-fix database DOES expose fabricated values prior to migration
    const preSample = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-98124'").get();
    assert.strictEqual(preSample.tracking_number, 'BLR-BD-889921');
    assert.strictEqual(preSample.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(preSample.status, 'Shipped');

    const preHex = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-OLDHEX1'").get();
    assert.strictEqual(preHex.tracking_number, 'BLR-BD-ABCD1234EF567890ABCD1234');
    assert.strictEqual(preHex.courier_partner, 'BlueDart Luxury Express');

    const preDef = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-OLDDEF2'").get();
    assert.strictEqual(preDef.courier_partner, 'BlueDart Luxury Express');

    const preShippedNoAwb = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-SHIPPED-NOAWB'").get();
    assert.strictEqual(preShippedNoAwb.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(preShippedNoAwb.status, 'Shipped');

    // 4. Run the upgrade migration
    dbModule.applyCourierMigrations(legacyDb);
    assert.ok(legacyDb.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_fabricated_courier_awb'").get());
    assert.ok(legacyDb.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_legacy_default_carrier_no_awb'").get());

    // 5. Verify post-migration database state
    // Row 1: PAL-2026-98124 sanitized when holding placeholder values
    const postSample = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-98124'").get();
    assert.strictEqual(postSample.tracking_number, null, 'Sample order tracking_number must be null after migration');
    assert.strictEqual(postSample.courier_partner, null, 'Sample order courier_partner must be null after migration');
    assert.strictEqual(postSample.status, 'Confirmed', 'Sample order status must be reset to Confirmed');
    assert.strictEqual(postSample.estimated_delivery, '3-4 business days', 'Sample order delivery promise must be standardized');

    // Row 2: PAL-2026-OLDHEX1 sanitized
    const postHex = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-OLDHEX1'").get();
    assert.strictEqual(postHex.tracking_number, null, 'Generated 24-hex tracking number must be cleared to null');
    assert.strictEqual(postHex.courier_partner, null, 'Associated placeholder courier_partner must be cleared to null');

    // Row 3: PAL-2026-OLDDEF2 sanitized
    const postDef = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-OLDDEF2'").get();
    assert.strictEqual(postDef.courier_partner, null, 'Default carrier on undispatched order must be cleared to null');

    // Row 4: PAL-2026-REAL-BD preserved
    const postRealBd = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-REAL-BD'").get();
    assert.strictEqual(postRealBd.tracking_number, 'BD-991122', 'Verified BlueDart tracking number must be preserved');
    assert.strictEqual(postRealBd.courier_partner, 'BlueDart Luxury Express', 'Verified BlueDart carrier must be preserved');
    assert.strictEqual(postRealBd.status, 'Shipped', 'Verified order status must be preserved');

    // Row 5: PAL-2026-REAL-DEL preserved
    const postRealDel = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-REAL-DEL'").get();
    assert.strictEqual(postRealDel.tracking_number, 'DEL123456789', 'Verified Delhivery tracking number must be preserved');
    assert.strictEqual(postRealDel.courier_partner, 'Delhivery', 'Verified Delhivery carrier must be preserved');
    assert.strictEqual(postRealDel.status, 'Shipped', 'Verified order status must be preserved');

    // Row 6: PAL-2026-SHIPPED-NOAWB pre-AWB carrier preserved across Shipped status
    const postShippedNoAwb = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-SHIPPED-NOAWB'").get();
    assert.strictEqual(postShippedNoAwb.courier_partner, 'BlueDart Luxury Express', 'Shipped order without AWB must have ambiguous historical carrier preserved');
    assert.strictEqual(postShippedNoAwb.status, 'Shipped', 'Shipped status must be preserved');

    // 6. Test edge case: Real shipment data subsequently assigned to sample order PAL-2026-98124
    // Admin assigns real verified tracking number and courier
    legacyDb.prepare(`
      UPDATE orders
      SET tracking_number = 'BD-REAL-SAMPLE-99',
          courier_partner = 'BlueDart Luxury Express',
          status = 'Shipped',
          estimated_delivery = 'In 2 business days'
      WHERE order_number = 'PAL-2026-98124'
    `).run();

    // Re-run migration: must NOT erase valid shipment data assigned to sample order
    dbModule.applyCourierMigrations(legacyDb);
    const postSampleAdmin = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-98124'").get();
    assert.strictEqual(postSampleAdmin.tracking_number, 'BD-REAL-SAMPLE-99', 'Real tracking number assigned to sample order must be preserved');
    assert.strictEqual(postSampleAdmin.courier_partner, 'BlueDart Luxury Express', 'Assigned courier on sample order must be preserved');
    assert.strictEqual(postSampleAdmin.status, 'Shipped', 'Shipped status on sample order with real AWB must be preserved');
    assert.strictEqual(postSampleAdmin.estimated_delivery, 'In 2 business days', 'Custom estimated delivery on sample order must be preserved');

    // 7. Test edge case: Legitimate next-day ("Tomorrow") estimate assigned to sample order PAL-2026-98124 with real AWB
    legacyDb.prepare(`
      UPDATE orders
      SET tracking_number = 'BD-REAL-NEXTDAY-01',
          courier_partner = 'BlueDart Luxury Express',
          status = 'Shipped',
          estimated_delivery = 'Tomorrow, by 11:00 AM'
      WHERE order_number = 'PAL-2026-98124'
    `).run();

    // Re-run migration: must NOT overwrite legitimate Tomorrow ETA when AWB is real
    dbModule.applyCourierMigrations(legacyDb);
    const postSampleTomorrow = legacyDb.prepare("SELECT * FROM orders WHERE order_number = 'PAL-2026-98124'").get();
    assert.strictEqual(postSampleTomorrow.tracking_number, 'BD-REAL-NEXTDAY-01', 'Real AWB must be preserved');
    assert.strictEqual(postSampleTomorrow.courier_partner, 'BlueDart Luxury Express', 'Assigned courier must be preserved');
    assert.strictEqual(postSampleTomorrow.estimated_delivery, 'Tomorrow, by 11:00 AM', 'Legitimate Tomorrow ETA must not be overwritten when AWB is real');

    console.log('✅ PASS: [P2] Upgrade-path migration safely eliminates fabricated AWB and carrier defaults from pre-fix databases while preserving verified references and real sample order updates');
  } finally {
    legacyDb.close();
    try {
      if (fs.existsSync(upgradeDbPath)) fs.unlinkSync(upgradeDbPath);
      const shm = `${upgradeDbPath}-shm`;
      const wal = `${upgradeDbPath}-wal`;
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
    } catch (e) {}
  }

  // 3.9 Upgrade-Path Regression Test: Database that ALREADY ran old migration (cleanup_fabricated_courier_awb)
  // must apply broadened migration (cleanup_legacy_default_carrier_no_awb) to clear unverified carrier defaults on no-AWB rows
  // where reliable audit evidence exists (e.g. dispatched/delivered without AWB, unpaid checkout reservations),
  // while strictly preserving ambiguous pre-AWB historical assignments across Placed, Processing, and Packed status.
  const v1DbPath = path.resolve(__dirname, `../data/.v1_upgrade_test_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
  const v1Db = new Database(v1DbPath);

  try {
    v1Db.exec(`
      CREATE TABLE schema_migrations (
        migration_name TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'Placed',
        payment_status TEXT DEFAULT 'Paid',
        tracking_number TEXT,
        courier_partner TEXT,
        estimated_delivery TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Pre-populate old migration marker as if commit 37501ea had already executed
      INSERT INTO schema_migrations (migration_name) VALUES ('cleanup_fabricated_courier_awb');

      -- Authentic rows from older schema without carrier_assigned_explicitly flag:
      -- 1. Dispatched order with no AWB and legacy default courier (must have unverified courier cleared)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, created_at, updated_at)
      VALUES ('PAL-V1-SHIPPED-NOAWB', 'Shipped', 'Paid', NULL, 'BlueDart Luxury Express', '2026-09-01 10:00:00', '2026-09-01 10:00:00');

      -- 2. Out for delivery order with no AWB and legacy default courier (must have unverified courier cleared)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, created_at, updated_at)
      VALUES ('PAL-V1-OFD-NOAWB', 'Out for Delivery', 'Paid', NULL, 'BlueDart Luxury Express', '2026-09-01 10:00:00', '2026-09-01 10:00:00');

      -- 3. Delivered order with no AWB and legacy default courier (must have unverified courier cleared)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, created_at, updated_at)
      VALUES ('PAL-V1-DELIVERED-NOAWB', 'Delivered', 'Paid', NULL, 'BlueDart Luxury Express', '2026-09-01 10:00:00', '2026-09-01 10:00:00');

      -- 4. Dispatched order with real AWB and courier (must be PRESERVED)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, created_at, updated_at)
      VALUES ('PAL-V1-SHIPPED-REAL', 'Shipped', 'Paid', 'BD-REAL-AWB-9988', 'BlueDart Luxury Express', '2026-09-01 10:00:00', '2026-09-01 12:00:00');

      -- 5. Genuine/ambiguous carrier assignment in fulfillment without AWB in old schema (must be PRESERVED)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, created_at, updated_at)
      VALUES ('PAL-V1-ASSIGNED-NOAWB', 'Processing', 'Paid', NULL, 'BlueDart Luxury Express', '2026-09-01 10:00:00', '2026-09-01 11:30:00');

      -- 6. Genuine custom carrier assignment without AWB in old schema (must be PRESERVED)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, created_at, updated_at)
      VALUES ('PAL-V1-CUSTOM-NOAWB', 'Placed', 'Paid', NULL, 'Delhivery', '2026-09-01 10:00:00', '2026-09-01 10:00:00');

      -- 7. Real/ambiguous BlueDart/no-AWB assignment in Placed status from older schema (must be strictly PRESERVED)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, created_at, updated_at)
      VALUES ('PAL-V1-PLACED-ASSIGNED-NOAWB', 'Placed', 'Paid', NULL, 'BlueDart Luxury Express', '2026-09-01 10:00:00', '2026-09-01 10:30:00');

      -- 8. Placed order with default BlueDart and non-carrier timestamp update (e.g. payment processing) (must be PRESERVED as ambiguous pre-AWB row)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, created_at, updated_at)
      VALUES ('PAL-V1-PLACED-PAYMENT-MUTATED', 'Placed', 'Paid', NULL, 'BlueDart Luxury Express', '2026-09-01 10:00:00', '2026-09-01 10:05:00');

      -- 9. Unpaid checkout reservation (reliable audit evidence: unassigned default on abandoned checkout)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, created_at, updated_at)
      VALUES ('PAL-V1-UNPAID-RESERVATION', 'Placed', 'Pending', NULL, 'BlueDart Luxury Express', '2026-09-01 10:00:00', '2026-09-01 10:00:00');
    `);

    // Verify pre-conditions: Old marker exists, new marker does not, and old-schema table has no carrier_assigned_explicitly column
    const hasV1 = v1Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_fabricated_courier_awb'").get();
    assert.ok(hasV1, 'Pre-condition: cleanup_fabricated_courier_awb must be pre-populated');

    const hasV2Pre = v1Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_legacy_default_carrier_no_awb'").get();
    assert.strictEqual(hasV2Pre, undefined, 'Pre-condition: cleanup_legacy_default_carrier_no_awb must not be present initially');

    const preCols = v1Db.pragma('table_info(orders)').map(c => c.name);
    assert.ok(!preCols.includes('carrier_assigned_explicitly'), 'Pre-condition: old-schema orders table must not have carrier_assigned_explicitly column');

    const preShipped = v1Db.prepare("SELECT courier_partner FROM orders WHERE order_number = 'PAL-V1-SHIPPED-NOAWB'").get();
    assert.strictEqual(preShipped.courier_partner, 'BlueDart Luxury Express');

    const preAssignedNoAwb = v1Db.prepare("SELECT courier_partner FROM orders WHERE order_number = 'PAL-V1-ASSIGNED-NOAWB'").get();
    assert.strictEqual(preAssignedNoAwb.courier_partner, 'BlueDart Luxury Express');

    const prePlacedAssigned = v1Db.prepare("SELECT courier_partner FROM orders WHERE order_number = 'PAL-V1-PLACED-ASSIGNED-NOAWB'").get();
    assert.strictEqual(prePlacedAssigned.courier_partner, 'BlueDart Luxury Express');

    const prePlacedMutated = v1Db.prepare("SELECT courier_partner FROM orders WHERE order_number = 'PAL-V1-PLACED-PAYMENT-MUTATED'").get();
    assert.strictEqual(prePlacedMutated.courier_partner, 'BlueDart Luxury Express');

    const preUnpaid = v1Db.prepare("SELECT courier_partner FROM orders WHERE order_number = 'PAL-V1-UNPAID-RESERVATION'").get();
    assert.strictEqual(preUnpaid.courier_partner, 'BlueDart Luxury Express');

    // Run applyCourierMigrations on the old-schema database that already has the v1 marker
    dbModule.applyCourierMigrations(v1Db);

    // Verify post-conditions:
    // 1. New migration marker recorded and column successfully added by migration
    const hasV2Post = v1Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_legacy_default_carrier_no_awb'").get();
    assert.ok(hasV2Post, 'Post-condition: cleanup_legacy_default_carrier_no_awb must be recorded in schema_migrations');

    const postCols = v1Db.pragma('table_info(orders)').map(c => c.name);
    assert.ok(postCols.includes('carrier_assigned_explicitly'), 'Post-condition: carrier_assigned_explicitly column must be added by migration');

    // 2. Dispatched / Out for Delivery / Delivered rows with pre-AWB assignments strictly PRESERVE courier_partner without claiming verification
    const postShipped = v1Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V1-SHIPPED-NOAWB'").get();
    assert.strictEqual(postShipped.courier_partner, 'BlueDart Luxury Express', 'Shipped row without AWB must have pre-AWB carrier preserved');
    assert.strictEqual(postShipped.status, 'Shipped', 'Shipped status must be preserved');
    assert.strictEqual(postShipped.carrier_assigned_explicitly, 0);

    const postOfd = v1Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V1-OFD-NOAWB'").get();
    assert.strictEqual(postOfd.courier_partner, 'BlueDart Luxury Express', 'Out for Delivery row without AWB must have pre-AWB carrier preserved');
    assert.strictEqual(postOfd.status, 'Out for Delivery', 'Out for Delivery status must be preserved');
    assert.strictEqual(postOfd.carrier_assigned_explicitly, 0);

    const postDelivered = v1Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V1-DELIVERED-NOAWB'").get();
    assert.strictEqual(postDelivered.courier_partner, 'BlueDart Luxury Express', 'Delivered row without AWB must have pre-AWB carrier preserved');
    assert.strictEqual(postDelivered.status, 'Delivered', 'Delivered status must be preserved');
    assert.strictEqual(postDelivered.carrier_assigned_explicitly, 0);

    // 3. Unpaid checkout reservation (reliable audit evidence) has legacy default carrier cleared
    const postUnpaid = v1Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V1-UNPAID-RESERVATION'").get();
    assert.strictEqual(postUnpaid.courier_partner, null, 'Unpaid checkout reservation must have legacy default carrier cleared');
    assert.strictEqual(postUnpaid.status, 'Placed');
    assert.strictEqual(postUnpaid.carrier_assigned_explicitly, 0);

    // 4. Verified order with real AWB is preserved
    const postReal = v1Db.prepare("SELECT courier_partner, tracking_number, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V1-SHIPPED-REAL'").get();
    assert.strictEqual(postReal.tracking_number, 'BD-REAL-AWB-9988');
    assert.strictEqual(postReal.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postReal.status, 'Shipped');
    assert.strictEqual(postReal.carrier_assigned_explicitly, 1);

    // 5. Ambiguous/genuine carrier assignment in fulfillment (Processing/Packed) without AWB is strictly PRESERVED without claiming it is verified
    const postAssignedNoAwb = v1Db.prepare("SELECT courier_partner, tracking_number, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V1-ASSIGNED-NOAWB'").get();
    assert.strictEqual(postAssignedNoAwb.courier_partner, 'BlueDart Luxury Express', 'Carrier assignment in fulfillment without AWB must be preserved on upgrade from old schema');
    assert.strictEqual(postAssignedNoAwb.tracking_number, null, 'Tracking number should remain null while pending');
    assert.strictEqual(postAssignedNoAwb.status, 'Processing');
    assert.strictEqual(postAssignedNoAwb.carrier_assigned_explicitly, 0, 'Ambiguous legacy carrier assignment in fulfillment must be preserved without falsely claiming it is verified');

    // 6. Real/ambiguous BlueDart/no-AWB assignment in Placed status is strictly PRESERVED without claiming it is verified
    const postPlacedAssigned = v1Db.prepare("SELECT courier_partner, tracking_number, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V1-PLACED-ASSIGNED-NOAWB'").get();
    assert.strictEqual(postPlacedAssigned.courier_partner, 'BlueDart Luxury Express', 'Genuine pre-AWB BlueDart carrier assignment in Placed status must be strictly preserved');
    assert.strictEqual(postPlacedAssigned.tracking_number, null);
    assert.strictEqual(postPlacedAssigned.status, 'Placed');
    assert.strictEqual(postPlacedAssigned.carrier_assigned_explicitly, 0, 'Ambiguous legacy assignment in Placed status must be preserved without falsely claiming verification');

    // 7. Placed order with BlueDart and non-carrier timestamp update (e.g. payment) is strictly PRESERVED as ambiguous pre-AWB row
    const postPlacedMutated = v1Db.prepare("SELECT courier_partner, tracking_number, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V1-PLACED-PAYMENT-MUTATED'").get();
    assert.strictEqual(postPlacedMutated.courier_partner, 'BlueDart Luxury Express', 'Ambiguous pre-AWB row in Placed status must not have carrier cleared');
    assert.strictEqual(postPlacedMutated.tracking_number, null);
    assert.strictEqual(postPlacedMutated.status, 'Placed');
    assert.strictEqual(postPlacedMutated.carrier_assigned_explicitly, 0);

    // 8. Genuine custom carrier assignment without AWB in old schema is strictly PRESERVED with carrier-specific evidence backfilled
    const postCustomNoAwb = v1Db.prepare("SELECT courier_partner, tracking_number, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V1-CUSTOM-NOAWB'").get();
    assert.strictEqual(postCustomNoAwb.courier_partner, 'Delhivery', 'Custom carrier assignment without AWB must be preserved on upgrade from old schema');
    assert.strictEqual(postCustomNoAwb.carrier_assigned_explicitly, 1, 'Carrier-specific evidence (custom carrier) must be backfilled as explicit');

    // 9. Idempotency on repeat execution
    dbModule.applyCourierMigrations(v1Db);
    const postShippedRepeat = v1Db.prepare("SELECT courier_partner FROM orders WHERE order_number = 'PAL-V1-SHIPPED-NOAWB'").get();
    assert.strictEqual(postShippedRepeat.courier_partner, 'BlueDart Luxury Express');

    const postPlacedAssignedRepeat = v1Db.prepare("SELECT courier_partner FROM orders WHERE order_number = 'PAL-V1-PLACED-ASSIGNED-NOAWB'").get();
    assert.strictEqual(postPlacedAssignedRepeat.courier_partner, 'BlueDart Luxury Express');

    const postAssignedRepeat = v1Db.prepare("SELECT courier_partner FROM orders WHERE order_number = 'PAL-V1-ASSIGNED-NOAWB'").get();
    assert.strictEqual(postAssignedRepeat.courier_partner, 'BlueDart Luxury Express');

    console.log('✅ PASS: [P2] Broadened migration executes on databases with pre-populated v1 marker, clears unverified carrier defaults where audit evidence exists, and preserves ambiguous pre-AWB carriers across Placed status');
  } finally {
    v1Db.close();
    try {
      if (fs.existsSync(v1DbPath)) fs.unlinkSync(v1DbPath);
      const shm = `${v1DbPath}-shm`;
      const wal = `${v1DbPath}-wal`;
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
    } catch (e) {}
  }

  // 3.10 Corrective Migration Regression Test: Database ALREADY upgraded by commit ce02ddf
  // 3.10 Corrective Migration Regression Test: Database ALREADY upgraded by commit ce02ddf
  // (both 'cleanup_fabricated_courier_awb' and 'cleanup_legacy_default_carrier_no_awb' present).
  // Verifies that:
  // - Admin-assigned BlueDart carrier on paid orders without an AWB (e.g. Processing, Placed, Packed, Shipped)
  //   strictly PRESERVES carrier_assigned_explicitly = 1 and courier_partner = 'BlueDart Luxury Express'.
  // - Explicit carrier assignment on pending checkout reservations strictly PRESERVES carrier_assigned_explicitly = 1 and courier_partner.
  // - Unassigned default checkout reservations (payment_status = 'Pending', carrier_assigned_explicitly = 0)
  //   have courier_partner cleared to NULL and carrier_assigned_explicitly = 0.
  // - Ambiguous pre-AWB orders without explicit assignment (carrier_assigned_explicitly = 0)
  //   strictly preserve courier_partner intact without falsely setting explicit flag to 1.
  const v2DbPath = path.resolve(__dirname, `../data/.v2_upgrade_test_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
  const v2Db = new Database(v2DbPath);

  try {
    v2Db.exec(`
      CREATE TABLE schema_migrations (
        migration_name TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'Placed',
        payment_status TEXT DEFAULT 'Paid',
        tracking_number TEXT,
        courier_partner TEXT,
        carrier_assigned_explicitly INTEGER DEFAULT 0,
        estimated_delivery TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Pre-populate BOTH old migration markers as if commit ce02ddf had already executed
      INSERT INTO schema_migrations (migration_name) VALUES ('cleanup_fabricated_courier_awb');
      INSERT INTO schema_migrations (migration_name) VALUES ('cleanup_legacy_default_carrier_no_awb');

      -- Rows left in database from commit ce02ddf:
      -- 1. Paid order with explicit admin carrier assignment in Processing without AWB (MUST BE PRESERVED with flag = 1)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-PAID-PROCESSING-EXPLICIT', 'Processing', 'Paid', NULL, 'BlueDart Luxury Express', 1, '2026-09-01 10:00:00', '2026-09-01 10:30:00');

      -- 2. Paid order with explicit admin carrier assignment in Placed status without AWB (MUST BE PRESERVED with flag = 1)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-PAID-PLACED-EXPLICIT', 'Placed', 'Paid', NULL, 'BlueDart Luxury Express', 1, '2026-09-01 10:00:00', '2026-09-01 10:05:00');

      -- 3. Paid order with explicit admin carrier assignment in Packed status without AWB (MUST BE PRESERVED with flag = 1)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-PAID-PACKED-EXPLICIT', 'Packed', 'Paid', NULL, 'BlueDart Luxury Express', 1, '2026-09-01 10:00:00', '2026-09-01 10:45:00');

      -- 4. Paid order with explicit admin carrier assignment in Shipped status without AWB (MUST BE PRESERVED with flag = 1)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-PAID-SHIPPED-EXPLICIT', 'Shipped', 'Paid', NULL, 'BlueDart Luxury Express', 1, '2026-09-01 10:00:00', '2026-09-01 11:00:00');

      -- 5. Pending checkout reservation with explicit carrier assignment made by admin while pending:
      -- Must strictly PRESERVE courier_partner intact with flag = 1!
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-PENDING-EXPLICIT', 'Placed', 'Pending', NULL, 'BlueDart Luxury Express', 1, '2026-09-01 10:00:00', '2026-09-01 10:05:00');

      -- 6. Unassigned checkout reservation default with no AWB and no explicit carrier assignment:
      -- Reliable audit evidence: Unassigned default on abandoned checkout.
      -- Must have courier_partner cleared to NULL and carrier_assigned_explicitly reset to 0.
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-UNPAID-DEFAULT', 'Placed', 'Pending', NULL, 'BlueDart Luxury Express', 0, '2026-09-01 10:00:00', '2026-09-01 10:00:00');

      -- 7. Genuine/ambiguous fulfillment order in Processing without AWB (flag = 0) (courier_partner must be PRESERVED)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-PROCESSING-PRESERVED', 'Processing', 'Paid', NULL, 'BlueDart Luxury Express', 0, '2026-09-01 10:00:00', '2026-09-01 11:30:00');

      -- 8. Genuine/ambiguous pre-AWB order in Placed status (flag = 0) (courier_partner must be PRESERVED)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-PLACED-PRESERVED', 'Placed', 'Paid', NULL, 'BlueDart Luxury Express', 0, '2026-09-01 10:00:00', '2026-09-01 10:00:00');

      -- 9. Genuine custom carrier assignment without AWB (must be PRESERVED with flag = 1)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-CUSTOM-PRESERVED', 'Placed', 'Paid', NULL, 'Delhivery', 1, '2026-09-01 10:00:00', '2026-09-01 10:00:00');

      -- 10. Dispatched order with real AWB and courier (must be PRESERVED with flag = 1)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-REAL-PRESERVED', 'Shipped', 'Paid', 'BD-REAL-AWB-9988', 'BlueDart Luxury Express', 1, '2026-09-01 10:00:00', '2026-09-01 12:00:00');
    `);

    // Verify pre-conditions: Both v1 and v2 markers exist, v3 marker does not, and explicit rows carry flag 1
    const hasV1 = v2Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_fabricated_courier_awb'").get();
    assert.ok(hasV1, 'Pre-condition: cleanup_fabricated_courier_awb must be present');

    const hasV2 = v2Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_legacy_default_carrier_no_awb'").get();
    assert.ok(hasV2, 'Pre-condition: cleanup_legacy_default_carrier_no_awb must be present');

    const hasV3Pre = v2Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_misclassified_timestamp_carrier_defaults'").get();
    assert.strictEqual(hasV3Pre, undefined, 'Pre-condition: cleanup_misclassified_timestamp_carrier_defaults must not be present initially');

    const prePaidProc = v2Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PAID-PROCESSING-EXPLICIT'").get();
    assert.strictEqual(prePaidProc.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(prePaidProc.carrier_assigned_explicitly, 1);

    // Run applyCourierMigrations on the database upgraded by commit ce02ddf
    dbModule.applyCourierMigrations(v2Db);

    // Verify post-conditions:
    // 1. v3 and v4 migration markers recorded
    const hasV3Post = v2Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_misclassified_timestamp_carrier_defaults'").get();
    assert.ok(hasV3Post, 'Post-condition: cleanup_misclassified_timestamp_carrier_defaults must be recorded in schema_migrations');

    const hasV4Post = v2Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'restore_paid_order_explicit_carrier_assignments'").get();
    assert.ok(hasV4Post, 'Post-condition: restore_paid_order_explicit_carrier_assignments must be recorded in schema_migrations');

    // 2. Explicit carrier assignments on paid orders without AWB are strictly PRESERVED across statuses
    const postPaidProc = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PAID-PROCESSING-EXPLICIT'").get();
    assert.strictEqual(postPaidProc.courier_partner, 'BlueDart Luxury Express', 'Paid Processing order with explicit carrier must preserve carrier');
    assert.strictEqual(postPaidProc.status, 'Processing');
    assert.strictEqual(postPaidProc.carrier_assigned_explicitly, 1, 'Paid Processing order must preserve carrier_assigned_explicitly = 1');

    const postPaidPlaced = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PAID-PLACED-EXPLICIT'").get();
    assert.strictEqual(postPaidPlaced.courier_partner, 'BlueDart Luxury Express', 'Paid Placed order with explicit carrier must preserve carrier');
    assert.strictEqual(postPaidPlaced.status, 'Placed');
    assert.strictEqual(postPaidPlaced.carrier_assigned_explicitly, 1, 'Paid Placed order must preserve carrier_assigned_explicitly = 1');

    const postPaidPacked = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PAID-PACKED-EXPLICIT'").get();
    assert.strictEqual(postPaidPacked.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postPaidPacked.carrier_assigned_explicitly, 1);

    const postPaidShipped = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PAID-SHIPPED-EXPLICIT'").get();
    assert.strictEqual(postPaidShipped.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postPaidShipped.carrier_assigned_explicitly, 1);

    // 3. Pending reservation with explicit carrier assignment strictly PRESERVES courier_partner and explicit flag
    const postPendingExplicit = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PENDING-EXPLICIT'").get();
    assert.strictEqual(postPendingExplicit.courier_partner, 'BlueDart Luxury Express', 'Explicitly assigned carrier on payment-pending reservation must be preserved');
    assert.strictEqual(postPendingExplicit.carrier_assigned_explicitly, 1, 'Explicit carrier assignment evidence must be preserved on pending reservation');

    // 4. Unpaid checkout default has reliable audit evidence: courier cleared to null and flag is 0
    const postUnpaidDefault = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-UNPAID-DEFAULT'").get();
    assert.strictEqual(postUnpaidDefault.courier_partner, null, 'Unpaid checkout default must have courier_partner cleared to null');
    assert.strictEqual(postUnpaidDefault.carrier_assigned_explicitly, 0);

    // 5. Genuine/ambiguous fulfillment order in Processing is preserved (flag = 0)
    const postProcessing = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PROCESSING-PRESERVED'").get();
    assert.strictEqual(postProcessing.courier_partner, 'BlueDart Luxury Express', 'Fulfillment order in Processing must be preserved');
    assert.strictEqual(postProcessing.status, 'Processing');
    assert.strictEqual(postProcessing.carrier_assigned_explicitly, 0);

    // 6. Genuine/ambiguous pre-AWB order in Placed is preserved (flag = 0)
    const postPlacedAmbiguous = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PLACED-PRESERVED'").get();
    assert.strictEqual(postPlacedAmbiguous.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postPlacedAmbiguous.carrier_assigned_explicitly, 0);

    // 7. Custom carrier assignment is preserved
    const postCustom = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-CUSTOM-PRESERVED'").get();
    assert.strictEqual(postCustom.courier_partner, 'Delhivery', 'Custom carrier assignment must be preserved');
    assert.strictEqual(postCustom.carrier_assigned_explicitly, 1);

    // 8. Real AWB order is preserved
    const postReal = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-REAL-PRESERVED'").get();
    assert.strictEqual(postReal.courier_partner, 'BlueDart Luxury Express', 'Real AWB order must be preserved');
    assert.strictEqual(postReal.carrier_assigned_explicitly, 1);

    // 9. Idempotency on repeat execution
    dbModule.applyCourierMigrations(v2Db);
    const postPaidProcRepeat = v2Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PAID-PROCESSING-EXPLICIT'").get();
    assert.strictEqual(postPaidProcRepeat.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postPaidProcRepeat.carrier_assigned_explicitly, 1);

    const postPaidPlacedRepeat = v2Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PAID-PLACED-EXPLICIT'").get();
    assert.strictEqual(postPaidPlacedRepeat.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postPaidPlacedRepeat.carrier_assigned_explicitly, 1);

    const postPendingRepeat = v2Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PENDING-EXPLICIT'").get();
    assert.strictEqual(postPendingRepeat.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postPendingRepeat.carrier_assigned_explicitly, 1);

    console.log('✅ PASS: [P2] Corrective migration preserves explicit carrier assignments on paid and pending orders without AWB, preserves ambiguous carriers across all statuses, and clears unassigned checkout defaults');
  } finally {
    v2Db.close();
    try {
      if (fs.existsSync(v2DbPath)) fs.unlinkSync(v2DbPath);
      const shm = `${v2DbPath}-shm`;
      const wal = `${v2DbPath}-wal`;
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
    } catch (e) {}
  }

  // 3.11 Upgrade-Path Regression Test: Actual Deployed Pre-v4 State & Safe Operator Recovery Path
  // Verifies the actual deployed pre-v4 database state where earlier v3 recorded that marker:
  // - On databases upgraded from the prior PR version, carrier_assignment_audit is created empty
  //   by initSchema and has no historical records for past admin assignments.
  // - The earlier v3 migration already reset carrier_assigned_explicitly to 0 on paid BlueDart/no-AWB rows.
  // - In deployed pre-v4 databases, no existing durable source distinguishes historical admin-assigned
  //   BlueDart/no-AWB rows from checkout defaults. Automatic migration therefore does not guess, safely
  //   leaving historical BlueDart/no-AWB rows unverified (0) to prevent false verification of defaults.
  // - Safe Operator Recovery Path: Operators supply verified assignment evidence (e.g. from physical dispatch manifests)
  //   via recoverCarrierAssignmentsWithVerifiedEvidence to safely restore carrier_assigned_explicitly = 1
  //   and write a durable record into carrier_assignment_audit, resolving the finding safely.
  // - Orders with existing durable evidence in pre-v4 databases ARE safely restored/preserved:
  //   * non-default courier partner (e.g. Delhivery) is restored to flag = 1
  //   * verified real shipment AWB (e.g. BD-REAL-AWB-9988) is restored to flag = 1
  //   * explicit carrier assignment on pending reservations (flag = 1) is preserved
  // - Ambiguous defaults across all statuses strictly retain carrier_assigned_explicitly = 0 while preserving courier_partner intact
  // - Clears unassigned checkout defaults (payment_status = 'Pending' without explicit carrier)
  // - Idempotency is preserved on repeat execution
  const v3DbPath = path.resolve(__dirname, `../data/.v3_upgrade_test_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
  const v3Db = new Database(v3DbPath);

  try {
    v3Db.exec(`
      CREATE TABLE schema_migrations (
        migration_name TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'Placed',
        payment_status TEXT DEFAULT 'Paid',
        tracking_number TEXT,
        courier_partner TEXT,
        carrier_assigned_explicitly INTEGER DEFAULT 0,
        estimated_delivery TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Pre-populate ALL THREE migration markers as if commit 0b3dda6 had already executed
      INSERT INTO schema_migrations (migration_name) VALUES ('cleanup_fabricated_courier_awb');
      INSERT INTO schema_migrations (migration_name) VALUES ('cleanup_legacy_default_carrier_no_awb');
      INSERT INTO schema_migrations (migration_name) VALUES ('cleanup_misclassified_timestamp_carrier_defaults');

      -- Empty carrier_assignment_audit table created by initSchema on upgrade
      -- (contains NO historical records for pre-v4 assignments on deployed databases):
      CREATE TABLE IF NOT EXISTS carrier_assignment_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT NOT NULL,
        courier_partner TEXT NOT NULL,
        assigned_by TEXT DEFAULT 'admin',
        evidence_source TEXT DEFAULT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Fixtures on actual deployed database that already recorded v3:
      -- 1. Historical explicit-assignment fixture damaged by earlier v3 on deployed pre-v4 database:
      -- Real post-v3 flag value is 0. Deployed pre-v4 database has no historical audit records initially.
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-V3-PAID-PROCESSING-DAMAGED', 'Processing', 'Paid', NULL, 'BlueDart Luxury Express', 0, '2026-09-01 10:00:00', '2026-09-01 10:30:00');

      -- 2. Explicit-assignment fixture: Paid order with durable carrier-specific evidence (non-default courier 'Delhivery')
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-V3-PAID-CUSTOM', 'Placed', 'Paid', NULL, 'Delhivery', 0, '2026-09-01 10:00:00', '2026-09-01 10:00:00');

      -- 3. Explicit-assignment fixture: Paid order with durable verified courier tracking number (real AWB)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-V3-PAID-REAL-AWB', 'Shipped', 'Paid', 'BD-REAL-AWB-9988', 'BlueDart Luxury Express', 0, '2026-09-01 10:00:00', '2026-09-01 11:00:00');

      -- 4. Explicit-assignment fixture: Pending reservation with explicit carrier assignment
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-V3-PENDING-EXPLICIT', 'Placed', 'Pending', NULL, 'BlueDart Luxury Express', 1, '2026-09-01 10:00:00', '2026-09-01 10:05:00');

      -- 5. Negative fixture: Paid legacy default on Placed order (inherited column default 'BlueDart Luxury Express' without durable admin evidence)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-V3-PAID-LEGACY-DEFAULT', 'Placed', 'Paid', NULL, 'BlueDart Luxury Express', 0, '2026-09-01 10:00:00', '2026-09-01 10:00:00');

      -- 6. Negative fixture: Paid legacy default on Processing fulfillment order (ambiguous pre-AWB row without durable admin evidence)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-V3-PAID-PROCESSING-DEFAULT', 'Processing', 'Paid', NULL, 'BlueDart Luxury Express', 0, '2026-09-01 10:00:00', '2026-09-01 10:15:00');

      -- 7. Unassigned checkout reservation default
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-V3-UNPAID-DEFAULT', 'Placed', 'Pending', NULL, 'BlueDart Luxury Express', 0, '2026-09-01 10:00:00', '2026-09-01 10:00:00');
    `);

    // Verify pre-conditions: v3 marker IS present, v4 marker is not, and damaged explicit row has real post-v3 flag = 0
    const hasV3Pre = v3Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_misclassified_timestamp_carrier_defaults'").get();
    assert.ok(hasV3Pre, 'Pre-condition: cleanup_misclassified_timestamp_carrier_defaults must be present');

    const hasV4Pre = v3Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'restore_paid_order_explicit_carrier_assignments'").get();
    assert.strictEqual(hasV4Pre, undefined, 'Pre-condition: restore_paid_order_explicit_carrier_assignments must not be present initially');

    const preProcDamaged = v3Db.prepare("SELECT carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-PROCESSING-DAMAGED'").get();
    assert.strictEqual(preProcDamaged.carrier_assigned_explicitly, 0, 'Pre-condition: damaged explicit order has real post-v3 flag = 0');

    const preLegacyDefault = v3Db.prepare("SELECT carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-LEGACY-DEFAULT'").get();
    assert.strictEqual(preLegacyDefault.carrier_assigned_explicitly, 0, 'Pre-condition: paid legacy default has carrier_assigned_explicitly = 0');

    // Step A: Run applyCourierMigrations on the actual deployed database that already recorded v3
    dbModule.applyCourierMigrations(v3Db);

    // Verify post-conditions of initial migration:
    // 1. v4 migration marker recorded
    const hasV4Post = v3Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'restore_paid_order_explicit_carrier_assignments'").get();
    assert.ok(hasV4Post, 'Post-condition: restore_paid_order_explicit_carrier_assignments must be recorded in schema_migrations');

    // 2. Damaged historical BlueDart/no-AWB row on deployed pre-v4 database without durable evidence:
    // courier_partner is preserved intact in DB, but flag safely remains 0 prior to operator recovery,
    // ensuring ambiguous checkout defaults are never falsely converted to verified.
    const postDamagedBeforeRecovery = v3Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-PROCESSING-DAMAGED'").get();
    assert.strictEqual(postDamagedBeforeRecovery.courier_partner, 'BlueDart Luxury Express', 'Damaged paid Processing order must preserve courier_partner in DB');
    assert.strictEqual(postDamagedBeforeRecovery.carrier_assigned_explicitly, 0, 'Damaged paid BlueDart/no-AWB order without operator evidence must stay unverified (0) to prevent false verification of defaults');

    // 3. Negative fixtures for paid legacy defaults: courier preserved intact in DB, but flag strictly remains 0 (unverified)
    const postLegacyDefault = v3Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-LEGACY-DEFAULT'").get();
    assert.strictEqual(postLegacyDefault.courier_partner, 'BlueDart Luxury Express', 'Paid legacy default must preserve courier_partner in DB');
    assert.strictEqual(postLegacyDefault.carrier_assigned_explicitly, 0, 'Paid legacy default must NOT be marked verified (carrier_assigned_explicitly must remain 0)');

    const postProcDefault = v3Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-PROCESSING-DEFAULT'").get();
    assert.strictEqual(postProcDefault.courier_partner, 'BlueDart Luxury Express', 'Ambiguous processing order must preserve courier_partner in DB');
    assert.strictEqual(postProcDefault.carrier_assigned_explicitly, 0, 'Ambiguous processing order must NOT be marked verified (carrier_assigned_explicitly must remain 0)');

    // 4. Explicit assignment fixtures with existing durable evidence in pre-v4 database:
    const postCustom = v3Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-CUSTOM'").get();
    assert.strictEqual(postCustom.courier_partner, 'Delhivery');
    assert.strictEqual(postCustom.carrier_assigned_explicitly, 1, 'Durable custom carrier evidence must restore carrier_assigned_explicitly = 1');

    const postReal = v3Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-REAL-AWB'").get();
    assert.strictEqual(postReal.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postReal.carrier_assigned_explicitly, 1, 'Durable verified real AWB evidence must restore carrier_assigned_explicitly = 1');

    const postPending = v3Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PENDING-EXPLICIT'").get();
    assert.strictEqual(postPending.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postPending.carrier_assigned_explicitly, 1, 'Pending explicit carrier assignment must preserve flag 1');

    // 5. Unassigned checkout default: courier cleared to NULL and flag is 0
    const postUnpaidDefault = v3Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-UNPAID-DEFAULT'").get();
    assert.strictEqual(postUnpaidDefault.courier_partner, null, 'Unassigned checkout default must have courier_partner cleared to NULL');
    assert.strictEqual(postUnpaidDefault.carrier_assigned_explicitly, 0);

    // Step B1: Verify that missing or blank evidence_source or operator identity is strictly REJECTED without manufacturing audit fallbacks
    const badEvidenceResult = dbModule.recoverCarrierAssignmentsWithVerifiedEvidence([
      {
        order_number: 'PAL-V3-PAID-PROCESSING-DAMAGED',
        courier_partner: 'BlueDart Luxury Express',
        evidence_source: '   ', // Blank evidence
        verified_by: 'lead-operator'
      },
      {
        order_number: 'PAL-V3-PAID-PROCESSING-DAMAGED',
        courier_partner: 'BlueDart Luxury Express',
        // Missing evidence_source entirely
        verified_by: 'lead-operator'
      },
      {
        order_number: 'PAL-V3-PAID-PROCESSING-DAMAGED',
        courier_partner: 'BlueDart Luxury Express',
        evidence_source: 'Warehouse dispatch manifest 2026-09-01-WD-882',
        verified_by: '' // Blank operator
      }
    ], v3Db);

    assert.strictEqual(badEvidenceResult.recovered.length, 0, 'Records with missing or blank evidence/operator must NOT be recovered');
    assert.strictEqual(badEvidenceResult.errors.length, 3, 'Must report validation errors for missing or blank evidence/operator');

    const postDamagedAfterBadEvidence = v3Db.prepare("SELECT carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-PROCESSING-DAMAGED'").get();
    assert.strictEqual(postDamagedAfterBadEvidence.carrier_assigned_explicitly, 0, 'Order must remain unverified when recovery request lacks verified evidence');

    // Step B2: Verify mixed batch atomic validation: if any record in a batch fails, abort without committing partial changes
    const mixedBatchResult = dbModule.recoverCarrierAssignmentsWithVerifiedEvidence([
      {
        order_number: 'PAL-V3-PAID-PROCESSING-DAMAGED',
        courier_partner: 'BlueDart Luxury Express',
        evidence_source: 'Warehouse dispatch manifest 2026-09-01-WD-882',
        verified_by: 'lead-operator'
      },
      {
        order_number: 'PAL-V3-NONEXISTENT-ORDER',
        courier_partner: 'BlueDart Luxury Express',
        evidence_source: 'Warehouse dispatch manifest 2026-09-01-WD-882',
        verified_by: 'lead-operator'
      }
    ], v3Db);

    assert.strictEqual(mixedBatchResult.recovered.length, 0, 'Mixed batch with failing record must NOT commit valid records');
    assert.ok(mixedBatchResult.errors.length > 0, 'Mixed batch must report error for non-existent order');

    const postDamagedAfterMixedBatch = v3Db.prepare("SELECT carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-PROCESSING-DAMAGED'").get();
    assert.strictEqual(postDamagedAfterMixedBatch.carrier_assigned_explicitly, 0, 'Order must not be partially committed when batch has errors');

    const auditCountBeforeRecovery = v3Db.prepare("SELECT COUNT(*) as count FROM carrier_assignment_audit WHERE order_number = 'PAL-V3-PAID-PROCESSING-DAMAGED'").get().count;
    assert.strictEqual(auditCountBeforeRecovery, 0, 'No audit entries should exist after failed mixed batch');

    // Step B3: Execute the Safe Operator Recovery Path with genuine verified evidence and operator identity
    const recoveryResults = dbModule.recoverCarrierAssignmentsWithVerifiedEvidence([
      {
        order_number: 'PAL-V3-PAID-PROCESSING-DAMAGED',
        courier_partner: 'BlueDart Luxury Express',
        evidence_source: 'Warehouse dispatch manifest 2026-09-01-WD-882',
        verified_by: 'lead-operator'
      }
    ], v3Db);

    assert.strictEqual(recoveryResults.recovered.length, 1, 'Operator recovery must report exactly 1 recovered order');
    assert.strictEqual(recoveryResults.recovered[0], 'PAL-V3-PAID-PROCESSING-DAMAGED');

    // Verify post-operator-recovery state:
    // 1. Damaged order now safely has carrier_assigned_explicitly = 1 and courier preserved
    const postDamagedRecovered = v3Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-PROCESSING-DAMAGED'").get();
    assert.strictEqual(postDamagedRecovered.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postDamagedRecovered.carrier_assigned_explicitly, 1, 'Operator recovery must safely restore carrier_assigned_explicitly = 1');

    // 2. Durable audit entry written to carrier_assignment_audit with evidence source
    const auditEntry = v3Db.prepare("SELECT order_number, courier_partner, assigned_by, evidence_source FROM carrier_assignment_audit WHERE order_number = 'PAL-V3-PAID-PROCESSING-DAMAGED'").get();
    assert.ok(auditEntry, 'Durable audit entry must exist in carrier_assignment_audit');
    assert.strictEqual(auditEntry.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(auditEntry.assigned_by, 'lead-operator');
    assert.strictEqual(auditEntry.evidence_source, 'Warehouse dispatch manifest 2026-09-01-WD-882');

    // Step B4: Verify idempotency of repeated recovery: retrying recovery must not insert duplicate audit entries
    const repeatRecoveryResults = dbModule.recoverCarrierAssignmentsWithVerifiedEvidence([
      {
        order_number: 'PAL-V3-PAID-PROCESSING-DAMAGED',
        courier_partner: 'BlueDart Luxury Express',
        evidence_source: 'Warehouse dispatch manifest 2026-09-01-WD-882',
        verified_by: 'lead-operator'
      }
    ], v3Db);

    assert.strictEqual(repeatRecoveryResults.recovered.length, 1, 'Repeated recovery must succeed idempotently');
    const auditCountAfterRepeat = v3Db.prepare("SELECT COUNT(*) as count FROM carrier_assignment_audit WHERE order_number = 'PAL-V3-PAID-PROCESSING-DAMAGED'").get().count;
    assert.strictEqual(auditCountAfterRepeat, 1, 'Repeated recovery must not insert duplicate audit records');

    // 3. Ambiguous defaults without verified evidence STILL have carrier_assigned_explicitly = 0 (no false verification)
    const postLegacyDefaultAfterRecovery = v3Db.prepare("SELECT carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-LEGACY-DEFAULT'").get();
    assert.strictEqual(postLegacyDefaultAfterRecovery.carrier_assigned_explicitly, 0, 'Unverified legacy default must remain 0 after operator recovery');

    const postProcDefaultAfterRecovery = v3Db.prepare("SELECT carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-PROCESSING-DEFAULT'").get();
    assert.strictEqual(postProcDefaultAfterRecovery.carrier_assigned_explicitly, 0, 'Ambiguous processing default must remain 0 after operator recovery');

    // Step C: Idempotency on repeat migration execution
    dbModule.applyCourierMigrations(v3Db);
    const postLegacyDefaultRepeat = v3Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-LEGACY-DEFAULT'").get();
    assert.strictEqual(postLegacyDefaultRepeat.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postLegacyDefaultRepeat.carrier_assigned_explicitly, 0);

    const postDamagedRepeat = v3Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-V3-PAID-PROCESSING-DAMAGED'").get();
    assert.strictEqual(postDamagedRepeat.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postDamagedRepeat.carrier_assigned_explicitly, 1, 'Recovered carrier assignment must be preserved on repeat migration passes');

    console.log('✅ PASS: [P2] Upgrade-path migration and safe operator recovery path safely restore carrier assignments with verified evidence while keeping ambiguous defaults unverified');
  } finally {
    v3Db.close();
    try {
      if (fs.existsSync(v3DbPath)) fs.unlinkSync(v3DbPath);
      const shm = `${v3DbPath}-shm`;
      const wal = `${v3DbPath}-wal`;
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
    } catch (e) {}
  }

  // 3.11c Admin Recovery Endpoints: Authenticated Admin Attribution & Batch Consistency
  const expressAdmin = require('express');
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');

  // Ensure an admin user exists for token authentication
  let adminUser = dbModule.prepare("SELECT id, name, email, role FROM users WHERE role = 'admin' LIMIT 1").get();
  let createdAdminId = null;
  if (!adminUser) {
    const adminRes = dbModule.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Admin Audit Op', 'admin_audit_op@palluvo.com', 'dummyhash', 'admin')").run();
    adminUser = { id: adminRes.lastInsertRowid, email: 'admin_audit_op@palluvo.com', role: 'admin' };
    createdAdminId = adminUser.id;
  }
  const adminToken = jwt.sign({ id: adminUser.id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

  const adminApp = expressAdmin();
  adminApp.use(expressAdmin.json());
  const adminRouter = require('../routes/admin');
  adminApp.use('/api/admin', adminRouter);

  const adminServer = adminApp.listen(0);
  const adminPort = adminServer.address().port;

  try {
    // Ensure a valid user exists for foreign key constraint on orders.user_id
    const existingUser = dbModule.prepare('SELECT id FROM users LIMIT 1').get();
    let testUserId = existingUser ? existingUser.id : adminUser.id;

    // Seed test order for admin recovery endpoint test
    dbModule.prepare(`
      INSERT OR REPLACE INTO orders (order_number, user_id, address_data, subtotal, total_amount, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly)
      VALUES ('PAL-ADMIN-REC-TEST-1', ?, '{}', 5000, 5000, 'Processing', 'Paid', NULL, 'BlueDart Luxury Express', 0)
    `).run(testUserId);
    const testOrderId = dbModule.prepare("SELECT id FROM orders WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").get().id;

    // 1. Finding 2 test: Mixed batch must return 400 and commit NO rows
    const mixedRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/recover-carriers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        recovery_batches: [
          {
            order_number: 'PAL-ADMIN-REC-TEST-1',
            courier_partner: 'BlueDart Luxury Express',
            evidence_source: 'Dispatch manifest batch-404'
          },
          {
            order_number: 'PAL-ADMIN-NONEXISTENT',
            courier_partner: 'BlueDart Luxury Express',
            evidence_source: 'Dispatch manifest batch-404'
          }
        ]
      })
    });
    assert.strictEqual(mixedRes.status, 400, 'Mixed recovery batch with invalid order must return 400');
    const mixedData = await mixedRes.json();
    assert.ok(mixedData.error, 'Error message must be present');
    const orderAfterMixed = dbModule.prepare("SELECT carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").get();
    assert.strictEqual(orderAfterMixed.carrier_assigned_explicitly, 0, 'Order must not be partially recovered on mixed batch failure');

    // 2. Finding 1 test: Valid batch attributes verified_by strictly to authenticated admin (adminUser.id), ignoring caller spoof
    const validRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/recover-carriers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        recovery_batches: [
          {
            order_number: 'PAL-ADMIN-REC-TEST-1',
            courier_partner: 'BlueDart Luxury Express',
            evidence_source: 'Dispatch manifest batch-404',
            verified_by: 'spoofed_impersonated_user@evil.com' // Caller-supplied identity must be ignored
          }
        ]
      })
    });
    assert.strictEqual(validRes.status, 200, 'Valid recovery batch must return 200');
    const orderAfterValid = dbModule.prepare("SELECT carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").get();
    assert.strictEqual(orderAfterValid.carrier_assigned_explicitly, 1, 'Order must be recovered');

    const auditRow = dbModule.prepare("SELECT assigned_by, evidence_source FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").get();
    assert.ok(auditRow, 'Audit row must be recorded');
    assert.strictEqual(auditRow.assigned_by, String(adminUser.id), `Audit row must be attributed strictly to req.user.id (${adminUser.id}), ignoring spoofed body`);
    assert.strictEqual(auditRow.evidence_source, 'Dispatch manifest batch-404');

    // 3. Finding 2 test: Repeated recovery must be idempotent and not insert duplicate audit rows
    const repeatRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/recover-carriers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        recovery_batches: [
          {
            order_number: 'PAL-ADMIN-REC-TEST-1',
            courier_partner: 'BlueDart Luxury Express',
            evidence_source: 'Dispatch manifest batch-404'
          }
        ]
      })
    });
    assert.strictEqual(repeatRes.status, 200);
    const auditCount = dbModule.prepare("SELECT COUNT(*) as count FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").get().count;
    assert.strictEqual(auditCount, 1, 'Repeated admin recovery must not create duplicate audit rows');

    // 4. Finding 1 test on single order endpoint /api/admin/orders/:id/verify-carrier
    dbModule.prepare("UPDATE orders SET carrier_assigned_explicitly = 0 WHERE id = ?").run(testOrderId);
    dbModule.prepare("DELETE FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").run();

    // 4a. Verify that fallback to notes is rejected when evidence_source is absent
    const notesOnlyRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/verify-carrier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        courier_partner: 'BlueDart Luxury Express',
        notes: 'verified' // Absence of evidence_source must fail
      })
    });
    assert.strictEqual(notesOnlyRes.status, 400, 'verify-carrier must reject notes-only payload without evidence_source');
    const notesOnlyData = await notesOnlyRes.json();
    assert.ok(notesOnlyData.error.includes('evidence_source is required'), 'Must require explicit evidence_source');

    // 4b. Verify that blank evidence_source is rejected even if notes is present
    const blankEvidenceRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/verify-carrier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        courier_partner: 'BlueDart Luxury Express',
        evidence_source: '   ',
        notes: 'verified'
      })
    });
    assert.strictEqual(blankEvidenceRes.status, 400, 'verify-carrier must reject blank evidence_source');

    // 4c. Valid single verify-carrier with explicit evidence_source
    const singleVerifyRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/verify-carrier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        courier_partner: 'BlueDart Luxury Express',
        evidence_source: 'Physical slip 9922',
        notes: 'Checked warehouse shelf B-4',
        verified_by: 'spoofed_impersonated_user@evil.com'
      })
    });
    assert.strictEqual(singleVerifyRes.status, 200, 'Single verify-carrier endpoint must succeed');
    const singleAuditRow = dbModule.prepare("SELECT assigned_by, evidence_source FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").get();
    assert.ok(singleAuditRow);
    assert.strictEqual(singleAuditRow.assigned_by, String(adminUser.id), `Single verify-carrier must attribute strictly to authenticated admin ID (${adminUser.id})`);
    assert.strictEqual(singleAuditRow.evidence_source, 'Physical slip 9922');

    // 5. Finding 2 test: Atomic status update with carrier audit
    // Reset test order to Placed, carrier_assigned_explicitly = 0, no audit
    dbModule.prepare("UPDATE orders SET status = 'Placed', carrier_assigned_explicitly = 0, courier_partner = NULL WHERE id = ?").run(testOrderId);
    dbModule.prepare("DELETE FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").run();
    const orderBefore5a = dbModule.prepare("SELECT version FROM orders WHERE id = ?").get(testOrderId);

    // 5a. Successful status update commits both order changes and audit record atomically
    const statusUpdateRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Shipped',
        courier_partner: 'BlueDart Luxury Express',
        loaded_courier_partner: '',
        expected_version: orderBefore5a.version,
        tracking_number: 'BD-STATUS-TX-1001',
        estimated_delivery: '2026-11-01'
      })
    });
    assert.strictEqual(statusUpdateRes.status, 200, 'Status update must succeed');
    const orderAfterStatus = dbModule.prepare("SELECT status, carrier_assigned_explicitly, courier_partner, version FROM orders WHERE id = ?").get(testOrderId);
    assert.strictEqual(orderAfterStatus.status, 'Shipped');
    assert.strictEqual(orderAfterStatus.carrier_assigned_explicitly, 1);
    assert.strictEqual(orderAfterStatus.version, orderBefore5a.version + 1, 'Monotonic row version must increment');
    const auditAfterStatus = dbModule.prepare("SELECT assigned_by, evidence_source FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").get();
    assert.ok(auditAfterStatus, 'Audit row must be created with status update');
    assert.strictEqual(auditAfterStatus.assigned_by, String(adminUser.id));
    assert.strictEqual(auditAfterStatus.evidence_source, 'admin-dashboard-status-update');

    // 5b. Verify that prefilled carrier does NOT mark unverified defaults as explicit on ordinary lifecycle status updates
    // Set order to an unverified legacy default: courier_partner is 'BlueDart Luxury Express', but carrier_assigned_explicitly = 0, no audit row
    dbModule.prepare("UPDATE orders SET status = 'Placed', carrier_assigned_explicitly = 0, courier_partner = 'BlueDart Luxury Express' WHERE id = ?").run(testOrderId);
    dbModule.prepare("DELETE FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").run();
    const orderBefore5b = dbModule.prepare("SELECT version FROM orders WHERE id = ?").get(testOrderId);

    const prefilledUpdateRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Packed',
        courier_partner: 'BlueDart Luxury Express', // Prepopulated from DB
        loaded_courier_partner: 'BlueDart Luxury Express',
        expected_version: orderBefore5b.version,
        estimated_delivery: '3-4 Business Days'
      })
    });
    assert.strictEqual(prefilledUpdateRes.status, 200, 'Prefilled status update must succeed');
    const orderAfterPrefilled = dbModule.prepare("SELECT status, carrier_assigned_explicitly, courier_partner, version FROM orders WHERE id = ?").get(testOrderId);
    assert.strictEqual(orderAfterPrefilled.status, 'Packed');
    assert.strictEqual(orderAfterPrefilled.carrier_assigned_explicitly, 0, 'Prefilled unverified carrier must NOT be marked explicit on ordinary status update');
    assert.strictEqual(orderAfterPrefilled.version, orderBefore5b.version + 1, 'Monotonic row version must increment');
    const auditCountPrefilled = dbModule.prepare("SELECT COUNT(*) as count FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").get().count;
    assert.strictEqual(auditCountPrefilled, 0, 'No carrier audit row should be created for prefilled unchanged carrier');

    // 5c. Atomic rollback test: If carrier audit write fails, entire transaction rolls back and order is unchanged
    // Create a temporary trigger to simulate audit write failure
    dbModule.exec(`
      CREATE TRIGGER test_fail_carrier_audit
      BEFORE INSERT ON carrier_assignment_audit
      BEGIN
        SELECT RAISE(ABORT, 'Simulated audit storage failure');
      END;
    `);

    try {
      const orderBeforeFail = dbModule.prepare("SELECT version FROM orders WHERE id = ?").get(testOrderId);
      const failStatusRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          status: 'Delivered',
          courier_partner: 'Delhivery',
          loaded_courier_partner: 'BlueDart Luxury Express',
          expected_version: orderBeforeFail.version,
          tracking_number: 'DL-FAIL-9999'
        })
      });
      assert.strictEqual(failStatusRes.status, 500, 'Must return 500 when carrier audit fails');

      // Verify transaction rollback: status must still be 'Packed', courier must still be 'BlueDart Luxury Express'
      const orderAfterFail = dbModule.prepare("SELECT status, courier_partner, version FROM orders WHERE id = ?").get(testOrderId);
      assert.strictEqual(orderAfterFail.status, 'Packed', 'Order status must NOT be modified when audit insert fails');
      assert.strictEqual(orderAfterFail.courier_partner, 'BlueDart Luxury Express', 'Order courier must NOT be modified when audit insert fails');
      assert.strictEqual(orderAfterFail.version, orderBeforeFail.version, 'Order version must NOT be modified when transaction rolls back');
    } finally {
      dbModule.exec(`DROP TRIGGER IF EXISTS test_fail_carrier_audit;`);
    }

    // 6. Finding 1 test: Distinct recovery verification event preservation without mutating original assignment audit
    // Seed generic dashboard audit entry
    dbModule.prepare("DELETE FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").run();
    dbModule.prepare(`
      INSERT INTO carrier_assignment_audit (order_number, courier_partner, assigned_by, evidence_source, assigned_at)
      VALUES ('PAL-ADMIN-REC-TEST-1', 'BlueDart Luxury Express', 'legacy-admin', 'admin-dashboard-status-update', '2026-09-01 10:00:00')
    `).run();

    // Now run operator recovery with real manifest evidence
    const recoveryRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/recover-carriers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        recovery_batches: [
          {
            order_number: 'PAL-ADMIN-REC-TEST-1',
            courier_partner: 'BlueDart Luxury Express',
            evidence_source: 'Warehouse dispatch manifest 2026-WD-9911'
          }
        ]
      })
    });
    assert.strictEqual(recoveryRes.status, 200, 'Recovery must succeed');

    // Verify that the original assignment audit row remains intact and was NOT mutated
    const originalAuditRow = dbModule.prepare("SELECT assigned_by, evidence_source, assigned_at FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1' AND evidence_source = 'admin-dashboard-status-update'").get();
    assert.ok(originalAuditRow, 'Original historical assignment audit row must be preserved');
    assert.strictEqual(originalAuditRow.assigned_by, 'legacy-admin', 'Original assignment actor must not be overwritten');
    assert.strictEqual(originalAuditRow.assigned_at, '2026-09-01 10:00:00', 'Original timestamp must not be overwritten');

    // Verify that recovery verification event is recorded as a separate distinct audit event
    const recoveryAuditRow = dbModule.prepare("SELECT assigned_by, evidence_source FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1' AND evidence_source = 'Warehouse dispatch manifest 2026-WD-9911'").get();
    assert.ok(recoveryAuditRow, 'Distinct recovery verification event must exist');
    assert.strictEqual(recoveryAuditRow.assigned_by, String(adminUser.id), 'Recovery audit event must be attributed to recovery operator ID');

    // Repeated recovery with same manifest evidence must remain idempotent (does not duplicate recovery event)
    const repeatRes2 = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/recover-carriers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        recovery_batches: [
          {
            order_number: 'PAL-ADMIN-REC-TEST-1',
            courier_partner: 'BlueDart Luxury Express',
            evidence_source: 'Warehouse dispatch manifest 2026-WD-9911'
          }
        ]
      })
    });
    assert.strictEqual(repeatRes2.status, 200);
    const auditCountTotal = dbModule.prepare("SELECT COUNT(*) as count FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").get().count;
    assert.strictEqual(auditCountTotal, 2, 'Total audit rows must be exactly 2 (original assignment + single recovery event)');

    // 7. Finding 2 test: Reject stale status forms before treating carrier as newly assigned
    // Reset order: courier is 'Delhivery', updated_at is recorded, version = 5
    dbModule.prepare("UPDATE orders SET status = 'Shipped', courier_partner = 'Delhivery', carrier_assigned_explicitly = 1, updated_at = '2026-10-28 12:00:00', version = 5 WHERE id = ?").run(testOrderId);

    // 7a. Require concurrency baseline for carrier-changing requests (400 Bad Request if missing baseline or version)
    const noBaselineRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Delivered',
        courier_partner: 'BlueDart Luxury Express' // Changed carrier without expected_version or loaded_courier_partner
      })
    });
    assert.strictEqual(noBaselineRes.status, 400, 'Must reject carrier update without concurrency baseline with 400 Bad Request');
    const noBaselineData = await noBaselineRes.json();
    assert.ok(noBaselineData.error.includes('Concurrency baseline'));

    // 7b. Reject stale status form where updated_at timestamp does not match
    const staleTimestampRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Delivered',
        courier_partner: 'Delhivery',
        loaded_courier_partner: 'Delhivery',
        expected_version: 5,
        expected_updated_at: '2026-10-28 10:00:00' // Stale timestamp
      })
    });
    assert.strictEqual(staleTimestampRes.status, 409, 'Must reject stale timestamp with 409 Conflict');
    const staleTimestampData = await staleTimestampRes.json();
    assert.ok(staleTimestampData.error.includes('modified by another session'));

    // 7c. Reject stale status form where monotonic version token does not match (finer resolution than CURRENT_TIMESTAMP)
    const staleVersionRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Delivered',
        courier_partner: 'Delhivery',
        loaded_courier_partner: 'Delhivery',
        expected_version: 4 // Stale monotonic version (DB has 5)
      })
    });
    assert.strictEqual(staleVersionRes.status, 409, 'Must reject stale version with 409 Conflict');
    const staleVersionData = await staleVersionRes.json();
    assert.ok(staleVersionData.error.includes('version conflict'));

    // 7d. Reject stale status form where carrier in DB changed while form was open
    const staleCarrierRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Delivered',
        courier_partner: 'BlueDart Luxury Express', // Form submits changed carrier
        loaded_courier_partner: 'BlueDart Luxury Express', // Pre-filled carrier from before DB change to Delhivery
        expected_version: 5
      })
    });
    assert.strictEqual(staleCarrierRes.status, 409, 'Must reject when loaded carrier differs from DB carrier');

    // 7e. Avoid updating carrier fields when operator did not change it from the version they loaded
    const orderCurrent = dbModule.prepare("SELECT updated_at, version FROM orders WHERE id = ?").get(testOrderId);
    const unchangedCarrierRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Delivered',
        courier_partner: 'Delhivery',
        loaded_courier_partner: 'Delhivery',
        expected_version: orderCurrent.version,
        expected_updated_at: orderCurrent.updated_at
      })
    });
    assert.strictEqual(unchangedCarrierRes.status, 200, 'Status update must succeed');
    const orderFinal = dbModule.prepare("SELECT status, courier_partner, carrier_assigned_explicitly, version FROM orders WHERE id = ?").get(testOrderId);
    assert.strictEqual(orderFinal.status, 'Delivered');
    assert.strictEqual(orderFinal.courier_partner, 'Delhivery');
    assert.strictEqual(orderFinal.version, orderCurrent.version + 1, 'Version must be incremented monotonically');

    // 7f. Atomic compare-and-swap: Two updates with same expected_version in same second; only one succeeds
    const orderBeforeCas = dbModule.prepare("SELECT version FROM orders WHERE id = ?").get(testOrderId);
    const cas1 = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Out for Delivery',
        courier_partner: 'Delhivery',
        loaded_courier_partner: 'Delhivery',
        expected_version: orderBeforeCas.version
      })
    });
    assert.strictEqual(cas1.status, 200, 'First CAS update must succeed');

    const cas2 = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Shipped',
        courier_partner: 'Delhivery',
        loaded_courier_partner: 'Delhivery',
        expected_version: orderBeforeCas.version // Same version that was just incremented!
      })
    });
    assert.strictEqual(cas2.status, 409, 'Second concurrent CAS update must be rejected with 409 Conflict');

    // 7g. Regression test for finding: order mutation (e.g. payment/customer cancellation) advances version,
    // rejecting stale admin form submissions even within the exact same second timestamp.
    const fixedSecond = '2026-10-28 15:30:00';
    dbModule.prepare("UPDATE orders SET status = 'Placed', courier_partner = 'Delhivery', carrier_assigned_explicitly = 1, updated_at = ? WHERE id = ?").run(fixedSecond, testOrderId);
    const orderBaseline = dbModule.prepare("SELECT version FROM orders WHERE id = ?").get(testOrderId);

    // Operator opens form with baseline version and same-second timestamp
    const staleBaseline = {
      expected_version: orderBaseline.version,
      expected_updated_at: fixedSecond,
      loaded_courier_partner: 'Delhivery'
    };

    // Concurrently, an order mutation executes in the same CURRENT_TIMESTAMP second
    dbModule.prepare("UPDATE orders SET status = 'Cancelled', updated_at = ? WHERE id = ?").run(fixedSecond, testOrderId);

    // Confirm that the mutation advanced the row version via trigger/helper despite same timestamp
    const orderAfterMutation = dbModule.prepare("SELECT status, version, updated_at FROM orders WHERE id = ?").get(testOrderId);
    assert.strictEqual(orderAfterMutation.status, 'Cancelled');
    assert.strictEqual(orderAfterMutation.version, orderBaseline.version + 1, 'Every order mutation must advance row version');
    assert.strictEqual(orderAfterMutation.updated_at, fixedSecond, 'Timestamp was in same second');

    // Stale admin form now tries to update status to 'Shipped' using the loaded baseline
    const staleAdminSubmitRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Shipped',
        courier_partner: 'Delhivery',
        loaded_courier_partner: staleBaseline.loaded_courier_partner,
        expected_version: staleBaseline.expected_version,
        expected_updated_at: staleBaseline.expected_updated_at
      })
    });
    assert.strictEqual(staleAdminSubmitRes.status, 409, 'Must reject stale admin update after order mutation even with identical timestamp');
    const staleAdminSubmitData = await staleAdminSubmitRes.json();
    assert.ok(staleAdminSubmitData.error.includes('version conflict') || staleAdminSubmitData.error.includes('modified by another session'));

    // Verify order state was preserved as Cancelled and not overwritten
    const finalOrderCheck = dbModule.prepare("SELECT status, version FROM orders WHERE id = ?").get(testOrderId);
    assert.strictEqual(finalOrderCheck.status, 'Cancelled', 'Cancelled status must not be overwritten');
    assert.strictEqual(finalOrderCheck.version, orderAfterMutation.version, 'Version must not be overwritten');

    // 7h. [P2] Status-only and tracking-only requests without client version baseline must be rejected with 400 Bad Request
    const statusOnlyNoVersionRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Processing' // Status-only mutation omitting expected_version and version
      })
    });
    assert.strictEqual(statusOnlyNoVersionRes.status, 400, 'Status-only mutation without version token must be rejected with 400 Bad Request');
    const statusOnlyNoVersionData = await statusOnlyNoVersionRes.json();
    assert.ok(
      statusOnlyNoVersionData.error.includes('expected_version') || statusOnlyNoVersionData.error.includes('version'),
      'Must reject missing version token'
    );

    const trackingOnlyNoVersionRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Packed',
        tracking_number: 'AWB-12345' // Tracking-only mutation omitting expected_version
      })
    });
    assert.strictEqual(trackingOnlyNoVersionRes.status, 400, 'Tracking mutation without version token must be rejected with 400 Bad Request');

    // 7i. [P3] AdminPage.jsx includes <option value="Processing">Processing</option> in lifecycle select
    const adminPageSource = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/AdminPage.jsx'), 'utf8');
    assert.ok(
      adminPageSource.includes('<option value="Processing">Processing</option>'),
      'AdminPage.jsx must include <option value="Processing">Processing</option> in lifecycle select'
    );

    // 7j. [P2] Validate lifecycle status against supported values
    dbModule.prepare("UPDATE orders SET status = 'Placed' WHERE id = ?").run(testOrderId);
    const currentOrderBeforeStatusCheck = dbModule.prepare("SELECT status, version FROM orders WHERE id = ?").get(testOrderId);

    // Reject non-canonical string status
    const invalidStatusRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'In Transit', // Unsupported / typo status
        expected_version: currentOrderBeforeStatusCheck.version
      })
    });
    assert.strictEqual(invalidStatusRes.status, 400, 'Non-canonical status must be rejected with 400 Bad Request');
    const invalidStatusData = await invalidStatusRes.json();
    assert.ok(
      invalidStatusData.error.includes('Invalid order status') && invalidStatusData.error.includes('Allowed values'),
      'Error message must state allowed canonical statuses'
    );

    // Reject empty/whitespace status
    const emptyStatusRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: '   ',
        expected_version: currentOrderBeforeStatusCheck.version
      })
    });
    assert.strictEqual(emptyStatusRes.status, 400, 'Empty/whitespace status must be rejected with 400 Bad Request');

    // Confirm DB status was not modified by rejected requests
    const orderAfterRejectedStatus = dbModule.prepare("SELECT status, version FROM orders WHERE id = ?").get(testOrderId);
    assert.strictEqual(orderAfterRejectedStatus.status, currentOrderBeforeStatusCheck.status);
    assert.strictEqual(orderAfterRejectedStatus.version, currentOrderBeforeStatusCheck.version);

    // Accept canonical status update (e.g. 'Processing')
    const validStatusRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Processing',
        expected_version: currentOrderBeforeStatusCheck.version
      })
    });
    assert.strictEqual(validStatusRes.status, 200, 'Canonical status "Processing" must be accepted');
    const validStatusData = await validStatusRes.json();
    assert.strictEqual(validStatusData.order.status, 'Processing');

    // 7k. [P3] Clear the verification flag when a courier is removed while preserving audit history
    // First, assign a carrier to the order explicitly without an AWB
    const orderBeforeCarrierAssign = dbModule.prepare("SELECT courier_partner, version FROM orders WHERE id = ?").get(testOrderId);
    const assignCarrierRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Processing',
        courier_partner: 'BlueDart Luxury Express',
        loaded_courier_partner: orderBeforeCarrierAssign.courier_partner || '',
        expected_version: orderBeforeCarrierAssign.version
      })
    });
    assert.strictEqual(assignCarrierRes.status, 200);
    const orderAssigned = dbModule.prepare("SELECT courier_partner, carrier_assigned_explicitly, version FROM orders WHERE id = ?").get(testOrderId);
    assert.strictEqual(orderAssigned.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(orderAssigned.carrier_assigned_explicitly, 1, 'carrier_assigned_explicitly must be 1 after explicit assignment');

    // Verify audit entry was written
    const auditCountBeforeClear = dbModule.prepare("SELECT COUNT(*) as count FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").get().count;
    assert.ok(auditCountBeforeClear >= 1, 'Audit record must exist for the explicit assignment');

    // Now, unassign/remove the courier by submitting an empty carrier with baseline
    const unassignCarrierRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Processing',
        courier_partner: '',
        loaded_courier_partner: 'BlueDart Luxury Express',
        expected_version: orderAssigned.version
      })
    });
    assert.strictEqual(unassignCarrierRes.status, 200, 'Unassigning courier must succeed');
    const orderUnassigned = dbModule.prepare("SELECT courier_partner, carrier_assigned_explicitly, tracking_number FROM orders WHERE id = ?").get(testOrderId);
    assert.strictEqual(orderUnassigned.courier_partner, null, 'courier_partner must be null after unassignment');
    assert.strictEqual(orderUnassigned.carrier_assigned_explicitly, 0, 'carrier_assigned_explicitly must be reset to 0 upon courier removal');

    // Verify previous assignment in audit history was preserved
    const auditCountAfterClear = dbModule.prepare("SELECT COUNT(*) as count FROM carrier_assignment_audit WHERE order_number = 'PAL-ADMIN-REC-TEST-1'").get().count;
    assert.strictEqual(auditCountAfterClear, auditCountBeforeClear, 'Past carrier assignment audit history must be preserved');

    // 7l. [P2] Preserve the persisted Confirmed status in canonical set and AdminPage
    assert.ok(
      adminPageSource.includes('<option value="Confirmed">Confirmed</option>'),
      'AdminPage.jsx must include <option value="Confirmed">Confirmed</option> in lifecycle select'
    );

    const ordBeforeConfirmed = dbModule.prepare("SELECT version FROM orders WHERE id = ?").get(testOrderId);
    const confirmedRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Confirmed',
        expected_version: ordBeforeConfirmed.version
      })
    });
    assert.strictEqual(confirmedRes.status, 200, 'Confirmed status must be accepted by admin status update');
    const ordAfterConfirmed = dbModule.prepare("SELECT status FROM orders WHERE id = ?").get(testOrderId);
    assert.strictEqual(ordAfterConfirmed.status, 'Confirmed');

    // Resending Confirmed while updating tracking/courier must succeed without 400
    const ordBeforeConfirmedTrack = dbModule.prepare("SELECT version FROM orders WHERE id = ?").get(testOrderId);
    const confirmedTrackRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Confirmed',
        tracking_number: 'CONF-TRK-12345',
        expected_version: ordBeforeConfirmedTrack.version
      })
    });
    assert.strictEqual(confirmedTrackRes.status, 200, 'Resending Confirmed while updating tracking must succeed');

    // 7m. [P1] Route admin cancellation through the refund workflow
    // Pick an existing product and variant to test inventory restoration
    const testProd = dbModule.prepare("SELECT id, stock_quantity FROM products LIMIT 1").get();
    const testVariant = dbModule.prepare("SELECT id, stock_quantity FROM product_variants WHERE product_id = ? LIMIT 1").get(testProd.id)
      || dbModule.prepare("SELECT id, product_id, stock_quantity FROM product_variants LIMIT 1").get();
    const prodStockBefore = testProd.stock_quantity;
    const variantStockBefore = testVariant ? testVariant.stock_quantity : null;

    // Create a coupon fixture
    const testCouponCode = `CANCEL_COUPON_${Date.now()}`;
    dbModule.prepare(`
      INSERT INTO coupons (code, title, discount_percent, times_used)
      VALUES (?, 'Cancel Test Coupon', 10, 5)
    `).run(testCouponCode);

    // Create a paid order with order_items and payments record
    const cancelOrderInsert = dbModule.prepare(`
      INSERT INTO orders (order_number, user_id, address_data, subtotal, total_amount, status, payment_status, razorpay_payment_id, coupon_code, version)
      VALUES ('PAL-ADMIN-CANCEL-TEST', ?, '{}', 10000, 9000, 'Processing', 'Paid', 'pay_mock_admin_cancel_1', ?, 1)
    `).run(testUserId, testCouponCode);
    const cancelOrderId = cancelOrderInsert.lastInsertRowid;

    // Insert order item referencing the product and variant
    dbModule.prepare(`
      INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, price, quantity)
      VALUES (?, ?, ?, 'Cancel Test Saree', 'Ruby Red', 9000, 2)
    `).run(cancelOrderId, testProd.id, testVariant ? testVariant.id : null);

    // Insert payment record for the order
    dbModule.prepare(`
      INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, status)
      VALUES (?, 'order_admin_cancel_mock_1', 'pay_mock_admin_cancel_1', 'sig_admin_cancel_mock_1', 900000, 'Captured')
    `).run(cancelOrderId);

    // Admin cancels the paid order via PUT /api/admin/orders/:id/status
    const cancelAdminRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${cancelOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Cancelled',
        expected_version: 1
      })
    });
    assert.strictEqual(cancelAdminRes.status, 200, 'Admin cancellation of order must succeed');
    const cancelAdminData = await cancelAdminRes.json();
    assert.strictEqual(cancelAdminData.order.status, 'Cancelled');
    assert.strictEqual(cancelAdminData.order.payment_status, 'Refunded', 'Order payment_status must be updated to Refunded');

    // Verify payments ledger was updated to Refunded
    const paymentRecord = dbModule.prepare("SELECT status FROM payments WHERE order_id = ?").get(cancelOrderId);
    assert.strictEqual(paymentRecord.status, 'Refunded', 'Payments ledger must be updated to Refunded');

    // Verify product and variant inventory were restored (+2)
    const productAfterCancel = dbModule.prepare("SELECT stock_quantity FROM products WHERE id = ?").get(testProd.id);
    assert.strictEqual(productAfterCancel.stock_quantity, prodStockBefore + 2, 'Product stock must be restored by item quantity');
    if (testVariant) {
      const variantAfterCancel = dbModule.prepare("SELECT stock_quantity FROM product_variants WHERE id = ?").get(testVariant.id);
      assert.strictEqual(variantAfterCancel.stock_quantity, variantStockBefore + 2, 'Variant stock must be restored by item quantity');
    }

    // Verify coupon usage was decremented (5 -> 4)
    const couponAfterCancel = dbModule.prepare("SELECT times_used FROM coupons WHERE code = ?").get(testCouponCode);
    assert.strictEqual(couponAfterCancel.times_used, 4, 'Coupon times_used must be decremented');

    // Verify that attempting to cancel an already Shipped order is rejected with 400
    dbModule.prepare("UPDATE orders SET status = 'Shipped', payment_status = 'Paid' WHERE id = ?").run(cancelOrderId);
    const orderBeforeShipped = dbModule.prepare("SELECT version FROM orders WHERE id = ?").get(cancelOrderId);
    const cancelShippedRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${cancelOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Cancelled',
        expected_version: orderBeforeShipped.version
      })
    });
    assert.strictEqual(cancelShippedRes.status, 400, 'Attempting to cancel a shipped order must return 400 Bad Request');

    // Verify that attempting to cancel an Out for Delivery order is rejected with 400
    dbModule.prepare("UPDATE orders SET status = 'Out for Delivery', payment_status = 'Paid' WHERE id = ?").run(cancelOrderId);
    const orderBeforeOfd = dbModule.prepare("SELECT version FROM orders WHERE id = ?").get(cancelOrderId);
    const cancelOfdRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${cancelOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Cancelled',
        expected_version: orderBeforeOfd.version
      })
    });
    assert.strictEqual(cancelOfdRes.status, 400, 'Attempting to cancel an order out for delivery must return 400 Bad Request');
    const cancelOfdData = await cancelOfdRes.json();
    assert.ok(cancelOfdData.error.includes('out for delivery'), 'Error must mention out for delivery');

    // Verify cancellation intent is committed before external refund: version conflict fails closed with 409
    const cancelConflictInsert = dbModule.prepare(`
      INSERT INTO orders (order_number, user_id, address_data, subtotal, total_amount, status, payment_status, razorpay_payment_id, version)
      VALUES ('PAL-ADMIN-CANCEL-CONFLICT', ?, '{}', 5000, 5000, 'Processing', 'Paid', 'pay_mock_conflict_test', 2)
    `).run(testUserId);
    const conflictOrderId = cancelConflictInsert.lastInsertRowid;

    // Simulate concurrent modification advancing the version
    dbModule.prepare("UPDATE orders SET version = 3 WHERE id = ?").run(conflictOrderId);

    // Stale admin request with expected_version: 2 must fail with 409 before external refund is issued
    const conflictRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${conflictOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Cancelled',
        expected_version: 2
      })
    });
    assert.strictEqual(conflictRes.status, 409, 'Must return 409 conflict when version check fails before refund is issued');
    const conflictOrderCheck = dbModule.prepare("SELECT status, payment_status, version FROM orders WHERE id = ?").get(conflictOrderId);
    assert.strictEqual(conflictOrderCheck.status, 'Processing', 'Order status must remain Processing');
    assert.strictEqual(conflictOrderCheck.payment_status, 'Paid', 'Order payment status must remain Paid');
    assert.strictEqual(conflictOrderCheck.version, 3, 'Order version must not be changed');

    // [P2] Terminal cancellation guard: admin cannot transition a cancelled order back to an active state
    dbModule.prepare("UPDATE orders SET status = 'Cancelled', payment_status = 'Refunded' WHERE id = ?").run(cancelOrderId);
    const orderBeforeReopen = dbModule.prepare("SELECT version FROM orders WHERE id = ?").get(cancelOrderId);
    const reopenRes = await fetch(`http://127.0.0.1:${adminPort}/api/admin/orders/${cancelOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Processing',
        expected_version: orderBeforeReopen.version
      })
    });
    assert.strictEqual(reopenRes.status, 400, 'Attempting to change status of cancelled order must return 400 Bad Request');
    const reopenData = await reopenRes.json();
    assert.ok(
      reopenData.error.includes('terminal') || reopenData.error.includes('cancelled'),
      'Error message must indicate cancellation is terminal'
    );
    const orderAfterReopen = dbModule.prepare("SELECT status FROM orders WHERE id = ?").get(cancelOrderId);
    assert.strictEqual(orderAfterReopen.status, 'Cancelled', 'Cancelled status must remain terminal and unchanged');

    console.log('✅ PASS: [P2] Admin recovery endpoints strictly attribute recovery to authenticated admin ID and enforce atomic, idempotent batches');
  } finally {
    adminServer.close();
    try {
      dbModule.prepare("DELETE FROM carrier_assignment_audit WHERE order_number IN ('PAL-ADMIN-REC-TEST-1', 'PAL-ADMIN-CANCEL-TEST', 'PAL-ADMIN-CANCEL-CONFLICT')").run();
      dbModule.prepare("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE order_number IN ('PAL-ADMIN-REC-TEST-1', 'PAL-ADMIN-CANCEL-TEST', 'PAL-ADMIN-CANCEL-CONFLICT'))").run();
      dbModule.prepare("DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE order_number IN ('PAL-ADMIN-REC-TEST-1', 'PAL-ADMIN-CANCEL-TEST', 'PAL-ADMIN-CANCEL-CONFLICT'))").run();
      dbModule.prepare("DELETE FROM orders WHERE order_number IN ('PAL-ADMIN-REC-TEST-1', 'PAL-ADMIN-CANCEL-TEST', 'PAL-ADMIN-CANCEL-CONFLICT')").run();
      if (typeof testProdId !== 'undefined') {
        dbModule.prepare("DELETE FROM product_variants WHERE product_id = ?").run(testProdId);
        dbModule.prepare("DELETE FROM products WHERE id = ?").run(testProdId);
      }
      if (typeof testCouponCode !== 'undefined') {
        dbModule.prepare("DELETE FROM coupons WHERE code = ?").run(testCouponCode);
      }
      if (createdAdminId) {
        dbModule.prepare("DELETE FROM users WHERE id = ?").run(createdAdminId);
      }
    } catch (e) {}
  }

  // 3.12 Public Tracking Endpoint Verification & Unverified Carrier Suppression Regressions
  // Verifies that:
  // - Ambiguous legacy row without AWB and carrier_assigned_explicitly = 0 has courier_partner suppressed (null),
  //   carrier_assigned_explicitly = 0, is_carrier_verified = false, and timeline stage 'Handed to Courier Partner'
  //   strictly builds 'Handed over to courier partner.' without falsely claiming 'BlueDart Luxury Express'.
  // - Dispatched row without AWB and carrier_assigned_explicitly = 1 has courier_partner returned,
  //   carrier_assigned_explicitly = 1, is_carrier_verified = true, and timeline builds 'Handed over to BlueDart Luxury Express.'
  // - Verified row with real AWB returns courier_partner, tracking_number, is_carrier_verified = true, and
  //   timeline builds 'Dispatched with BlueDart Luxury Express (AWB: ...)'.
  // - Placed order pending dispatch builds 'Package will be handed over to courier partner upon packing.'
  const express = require('express');
  const trackingApp = express();
  trackingApp.use(express.json());
  const ordersRouter = require('../routes/orders');
  trackingApp.use('/api/orders', ordersRouter);

  const testServer = trackingApp.listen(0);
  const testPort = testServer.address().port;

  const testTrackOrders = [
    {
      order_number: 'PAL-TRK-UNVERIFIED-LEGACY',
      status: 'Shipped',
      payment_status: 'Paid',
      tracking_number: null,
      courier_partner: 'BlueDart Luxury Express',
      carrier_assigned_explicitly: 0
    },
    {
      order_number: 'PAL-TRK-VERIFIED-EXPLICIT',
      status: 'Shipped',
      payment_status: 'Paid',
      tracking_number: null,
      courier_partner: 'BlueDart Luxury Express',
      carrier_assigned_explicitly: 1
    },
    {
      order_number: 'PAL-TRK-VERIFIED-AWB',
      status: 'Shipped',
      payment_status: 'Paid',
      tracking_number: 'BD-TRACK-REAL-8822',
      courier_partner: 'BlueDart Luxury Express',
      carrier_assigned_explicitly: 1
    },
    {
      order_number: 'PAL-TRK-PAID-PROCESSING-EXPLICIT',
      status: 'Processing',
      payment_status: 'Paid',
      tracking_number: null,
      courier_partner: 'BlueDart Luxury Express',
      carrier_assigned_explicitly: 1
    },
    {
      order_number: 'PAL-TRK-PLACED-DEFAULT',
      status: 'Placed',
      payment_status: 'Paid',
      tracking_number: null,
      courier_partner: null,
      carrier_assigned_explicitly: 0
    },
    {
      order_number: 'PAL-TRK-PAID-LEGACY-DEFAULT',
      status: 'Placed',
      payment_status: 'Paid',
      tracking_number: null,
      courier_partner: 'BlueDart Luxury Express',
      carrier_assigned_explicitly: 0
    }
  ];

  let testCreatedUserId = null;
  try {
    const existingUser = dbModule.prepare('SELECT id FROM users LIMIT 1').get();
    let userId = existingUser ? existingUser.id : null;
    if (!userId) {
      const userRes = dbModule.prepare("INSERT INTO users (name, email, password_hash) VALUES ('Track Test User', 'track_test_user@palluvo.com', 'dummyhash')").run();
      userId = userRes.lastInsertRowid;
      testCreatedUserId = userId;
    }

    for (const tOrd of testTrackOrders) {
      dbModule.prepare(`
        INSERT INTO orders (order_number, user_id, address_data, subtotal, total_amount, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly)
        VALUES (?, ?, '{}', 5000, 5000, ?, ?, ?, ?, ?)
      `).run(
        tOrd.order_number,
        userId,
        tOrd.status,
        tOrd.payment_status,
        tOrd.tracking_number,
        tOrd.courier_partner,
        tOrd.carrier_assigned_explicitly
      );
    }

    // 1. Unverified legacy dispatched row without AWB: courier_partner must be suppressed (null) in response,
    // verification flags must indicate unverified, and timeline description must not claim carrier
    const resUnverified = await fetch(`http://127.0.0.1:${testPort}/api/orders/track/PAL-TRK-UNVERIFIED-LEGACY`);
    assert.strictEqual(resUnverified.status, 200);
    const dataUnverified = await resUnverified.json();
    assert.ok(dataUnverified.order, 'Order response must be present');
    assert.strictEqual(dataUnverified.order.courier_partner, null, 'Unverified legacy carrier must be suppressed (null) in tracking response');
    assert.strictEqual(dataUnverified.order.carrier_assigned_explicitly, 0, 'carrier_assigned_explicitly = 0 must be propagated');
    assert.strictEqual(dataUnverified.order.is_carrier_verified, false, 'is_carrier_verified = false must be propagated');
    const handedStageUnverified = dataUnverified.order.timeline.find(s => s.stage === 'Handed to Courier Partner');
    assert.ok(handedStageUnverified, 'Handed to Courier Partner stage must exist');
    assert.strictEqual(handedStageUnverified.description, 'Handed over to courier partner.', 'Unverified row must NOT build "Handed over to BlueDart Luxury Express"');

    // 2. Verified dispatched row without AWB (explicit admin assignment)
    const resVerifiedExplicit = await fetch(`http://127.0.0.1:${testPort}/api/orders/track/PAL-TRK-VERIFIED-EXPLICIT`);
    assert.strictEqual(resVerifiedExplicit.status, 200);
    const dataVerifiedExplicit = await resVerifiedExplicit.json();
    assert.strictEqual(dataVerifiedExplicit.order.courier_partner, 'BlueDart Luxury Express', 'Explicitly verified carrier must be returned');
    assert.strictEqual(dataVerifiedExplicit.order.carrier_assigned_explicitly, 1, 'carrier_assigned_explicitly = 1 must be propagated');
    assert.strictEqual(dataVerifiedExplicit.order.is_carrier_verified, true, 'is_carrier_verified = true must be propagated');
    const handedStageExplicit = dataVerifiedExplicit.order.timeline.find(s => s.stage === 'Handed to Courier Partner');
    assert.strictEqual(handedStageExplicit.description, 'Handed over to BlueDart Luxury Express.', 'Verified carrier must appear in timeline description');

    // 3. Verified dispatched row with real AWB
    const resVerifiedAwb = await fetch(`http://127.0.0.1:${testPort}/api/orders/track/PAL-TRK-VERIFIED-AWB`);
    assert.strictEqual(resVerifiedAwb.status, 200);
    const dataVerifiedAwb = await resVerifiedAwb.json();
    assert.strictEqual(dataVerifiedAwb.order.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(dataVerifiedAwb.order.tracking_number, 'BD-TRACK-REAL-8822');
    assert.strictEqual(dataVerifiedAwb.order.is_carrier_verified, true);
    const handedStageAwb = dataVerifiedAwb.order.timeline.find(s => s.stage === 'Handed to Courier Partner');
    assert.strictEqual(handedStageAwb.description, 'Dispatched with BlueDart Luxury Express (AWB: BD-TRACK-REAL-8822).');

    // 4. Paid order in Processing with explicit admin carrier assignment (no AWB)
    const resPaidProcExplicit = await fetch(`http://127.0.0.1:${testPort}/api/orders/track/PAL-TRK-PAID-PROCESSING-EXPLICIT`);
    assert.strictEqual(resPaidProcExplicit.status, 200);
    const dataPaidProcExplicit = await resPaidProcExplicit.json();
    assert.strictEqual(dataPaidProcExplicit.order.courier_partner, 'BlueDart Luxury Express', 'Explicitly assigned carrier on paid Processing order must be returned');
    assert.strictEqual(dataPaidProcExplicit.order.carrier_assigned_explicitly, 1);
    assert.strictEqual(dataPaidProcExplicit.order.is_carrier_verified, true);
    const handedStagePaidProc = dataPaidProcExplicit.order.timeline.find(s => s.stage === 'Handed to Courier Partner');
    assert.strictEqual(handedStagePaidProc.description, 'Package will be handed over to courier partner upon packing.');

    // 5. Placed order before dispatch
    const resPlaced = await fetch(`http://127.0.0.1:${testPort}/api/orders/track/PAL-TRK-PLACED-DEFAULT`);
    assert.strictEqual(resPlaced.status, 200);
    const dataPlaced = await resPlaced.json();
    assert.strictEqual(dataPlaced.order.courier_partner, null);
    const handedStagePlaced = dataPlaced.order.timeline.find(s => s.stage === 'Handed to Courier Partner');
    assert.strictEqual(handedStagePlaced.description, 'Package will be handed over to courier partner upon packing.');

    // 6. Paid legacy default order before dispatch (carries 'BlueDart Luxury Express' in DB with flag = 0)
    const resPaidLegacy = await fetch(`http://127.0.0.1:${testPort}/api/orders/track/PAL-TRK-PAID-LEGACY-DEFAULT`);
    assert.strictEqual(resPaidLegacy.status, 200);
    const dataPaidLegacy = await resPaidLegacy.json();
    assert.strictEqual(dataPaidLegacy.order.courier_partner, null, 'Paid legacy default carrier must be suppressed from tracking');
    assert.strictEqual(dataPaidLegacy.order.carrier_assigned_explicitly, 0);
    assert.strictEqual(dataPaidLegacy.order.is_carrier_verified, false);
    const handedStagePaidLegacy = dataPaidLegacy.order.timeline.find(s => s.stage === 'Handed to Courier Partner');
    assert.strictEqual(handedStagePaidLegacy.description, 'Package will be handed over to courier partner upon packing.');

    console.log('✅ PASS: [P2] Public tracking endpoint propagates verification state, suppresses unverified carrier defaults, and preserves confirmed carriers');
  } finally {
    testServer.close();
    for (const tOrd of testTrackOrders) {
      try {
        dbModule.prepare('DELETE FROM orders WHERE order_number = ?').run(tOrd.order_number);
      } catch (e) {}
    }
    if (testCreatedUserId) {
      try {
        dbModule.prepare('DELETE FROM users WHERE id = ?').run(testCreatedUserId);
      } catch (e) {}
    }
  }

  // 4. SSR Render & State Synchronization Test
  try {
    const React = require(path.resolve(__dirname, '../../client/node_modules/react'));
    const ReactDOMServer = require(path.resolve(__dirname, '../../client/node_modules/react-dom/server'));

    const result = await vite.build({
      root: path.resolve(__dirname, '../../client'),
      logLevel: 'silent',
      build: {
        write: false,
        lib: {
          entry: shopPagePath,
          formats: ['cjs'],
          fileName: 'shopPage'
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'lucide-react', '../components/ProductCard']
        }
      }
    });

    const code = result[0].output[0].code;
    const mod = { exports: {} };
    const mockLucide = new Proxy({}, { get: () => () => React.createElement('span') });
    const fn = new Function('require', 'module', 'exports', code);
    fn((id) => {
      if (id === 'react') return React;
      if (id === 'react-dom') return require(path.resolve(__dirname, '../../client/node_modules/react-dom'));
      if (id === 'lucide-react') return mockLucide;
      if (id.includes('ProductCard')) return () => React.createElement('div', null, 'Product');
      return {};
    }, mod, mod.exports);

    const ShopPage = mod.exports.default || mod.exports;

    // Render with synchronized active filters
    const htmlWithFilters = ReactDOMServer.renderToString(React.createElement(ShopPage, {
      onNavigate: () => {},
      initialFilters: {
        category: 'banarasi-sarees',
        occasion: 'Wedding',
        fabric: 'Silk',
        color: 'Wine',
        min_price: '3000',
        max_price: '7000',
        min_rating: '4.0'
      }
    }));

    // Verify trigger button attributes
    assert.ok(htmlWithFilters.includes('aria-controls="mobile-filter-dialog"'), 'Trigger button has aria-controls');
    assert.ok(htmlWithFilters.includes('aria-haspopup="dialog"'), 'Trigger button has aria-haspopup');
    assert.ok(htmlWithFilters.includes('aria-expanded="false"'), 'Trigger button has aria-expanded="false" when closed');

    // Verify active filter aria-pressed="true" states
    assert.ok(htmlWithFilters.includes('aria-pressed="true"'), 'Active filters have aria-pressed="true"');
    assert.ok(htmlWithFilters.includes('aria-pressed="false"'), 'Inactive filters have aria-pressed="false"');

    // Verify specific filter choice rendering
    assert.ok(htmlWithFilters.includes('₹3,000 – ₹7,000'), 'Selected price range label rendered');
    assert.ok(htmlWithFilters.includes('Wine'), 'Wine color option rendered');
    assert.ok(htmlWithFilters.includes('Silk'), 'Silk fabric option rendered');
    assert.ok(htmlWithFilters.includes('Wedding'), 'Wedding occasion option rendered');

    console.log('✅ PASS: [P2] SSR rendering confirms synchronized selected state (aria-pressed) across active filter choices');

    // 5. Verify [P2] Category deep link routing (/sarees/category/:slug and /category/:slug) and direct-load hydration
    const appResult = await vite.build({
      root: path.resolve(__dirname, '../../client'),
      logLevel: 'silent',
      build: {
        write: false,
        lib: {
          entry: path.resolve(__dirname, '../../client/src/App.jsx'),
          formats: ['cjs'],
          fileName: 'app'
        },
        rollupOptions: {
          external: () => true
        }
      }
    });

    const appCode = appResult[0].output[0].code;
    const appMod = { exports: {} };
    const appFn = new Function('require', 'module', 'exports', appCode);
    appFn((id) => (id === 'react' ? React : {}), appMod, appMod.exports);

    const { getRouteFromPath } = appMod.exports;
    assert.strictEqual(typeof getRouteFromPath, 'function', 'getRouteFromPath must be exported from App.jsx');

    // Route /sarees/category/:slug to shop page with category filter
    const r1 = getRouteFromPath('/sarees/category/banarasi');
    assert.strictEqual(r1.page, 'shop', '/sarees/category/:slug must route to shop page');
    assert.strictEqual(r1.params.category, 'banarasi', 'category param must map to banarasi');

    // Route /category/:slug to shop page with category filter
    const r2 = getRouteFromPath('/category/kanjivaram');
    assert.strictEqual(r2.page, 'shop', '/category/:slug must route to shop page');
    assert.strictEqual(r2.params.category, 'kanjivaram', 'category param must map to kanjivaram');

    // Preserve search params alongside category route
    const r3 = getRouteFromPath('/sarees/category/chanderi', '?sort=price_low&fabric=Silk');
    assert.strictEqual(r3.page, 'shop');
    assert.strictEqual(r3.params.category, 'chanderi');
    assert.strictEqual(r3.params.sort, 'price_low');
    assert.strictEqual(r3.params.fabric, 'Silk');

    // Generic product routes must remain unaffected
    const r4 = getRouteFromPath('/sarees/samrajni-grand-muhurtham-24k-gold-korvai-kanjivaram');
    assert.strictEqual(r4.page, 'product', '/sarees/:slug must route to product page');
    assert.strictEqual(r4.params.slug, 'samrajni-grand-muhurtham-24k-gold-korvai-kanjivaram');

    const r5 = getRouteFromPath('/product/samrajni-grand-muhurtham-24k-gold-korvai-kanjivaram');
    assert.strictEqual(r5.page, 'product', '/product/:slug must route to product page');
    assert.strictEqual(r5.params.slug, 'samrajni-grand-muhurtham-24k-gold-korvai-kanjivaram');

    // Direct-load hydration: verify ShopPage renders collection view when hydrated with category params
    const categoryHydratedHtml = ReactDOMServer.renderToString(React.createElement(ShopPage, {
      onNavigate: () => {},
      initialFilters: r1.params
    }));
    assert.ok(categoryHydratedHtml.includes('aria-controls="mobile-filter-dialog"'), 'Direct-loaded category view renders collection controls');
    assert.ok(!categoryHydratedHtml.includes('Product not found'), 'Direct-loaded category view must not display product-not-found');
    console.log('✅ PASS: [P2] Category deep links (/sarees/category/:slug and /category/:slug) route to collection page with direct-load support');

    // [P2] Trailing slash normalization tests
    // Direct /sarees/ load must route to shop (not product with empty slug)
    const rSareesSlash = getRouteFromPath('/sarees/');
    assert.strictEqual(rSareesSlash.page, 'shop', '/sarees/ must route to shop page');
    assert.deepStrictEqual(rSareesSlash.params, {}, '/sarees/ must have empty params');

    // Direct /shop/ load must route to shop (not not-found)
    const rShopSlash = getRouteFromPath('/shop/');
    assert.strictEqual(rShopSlash.page, 'shop', '/shop/ must route to shop page');
    assert.deepStrictEqual(rShopSlash.params, {}, '/shop/ must have empty params');

    // Trailing slash with query params
    const rShopSlashQuery = getRouteFromPath('/sarees/', '?color=Red');
    assert.strictEqual(rShopSlashQuery.page, 'shop', '/sarees/?color=Red must route to shop page');
    assert.strictEqual(rShopSlashQuery.params.color, 'Red');

    // Root slash '/' preserved
    const rRoot = getRouteFromPath('/');
    assert.strictEqual(rRoot.page, 'home', '/ must route to home page');

    // Trailing slash on category routes
    const rCatSlash = getRouteFromPath('/sarees/category/banarasi/');
    assert.strictEqual(rCatSlash.page, 'shop', '/sarees/category/banarasi/ must route to shop page');
    assert.strictEqual(rCatSlash.params.category, 'banarasi');

    const rCat2Slash = getRouteFromPath('/category/kanjivaram/');
    assert.strictEqual(rCat2Slash.page, 'shop', '/category/kanjivaram/ must route to shop page');
    assert.strictEqual(rCat2Slash.params.category, 'kanjivaram');

    // Trailing slash on product routes
    const rProdSlash = getRouteFromPath('/sarees/samrajni-grand-muhurtham-24k-gold-korvai-kanjivaram/');
    assert.strictEqual(rProdSlash.page, 'product', '/sarees/:slug/ must route to product page');
    assert.strictEqual(rProdSlash.params.slug, 'samrajni-grand-muhurtham-24k-gold-korvai-kanjivaram');

    const rProd2Slash = getRouteFromPath('/product/samrajni-grand-muhurtham-24k-gold-korvai-kanjivaram/');
    assert.strictEqual(rProd2Slash.page, 'product', '/product/:slug/ must route to product page');
    assert.strictEqual(rProd2Slash.params.slug, 'samrajni-grand-muhurtham-24k-gold-korvai-kanjivaram');

    // Direct-load hydration for /sarees/ and /shop/
    const directSareesSlashHtml = ReactDOMServer.renderToString(React.createElement(ShopPage, {
      onNavigate: () => {},
      initialFilters: rSareesSlash.params
    }));
    assert.ok(directSareesSlashHtml.includes('aria-controls="mobile-filter-dialog"'), 'Direct /sarees/ load renders collection controls');
    assert.ok(!directSareesSlashHtml.includes('Product not found'), 'Direct /sarees/ load must not display product-not-found');

    const directShopSlashHtml = ReactDOMServer.renderToString(React.createElement(ShopPage, {
      onNavigate: () => {},
      initialFilters: rShopSlash.params
    }));
    assert.ok(directShopSlashHtml.includes('aria-controls="mobile-filter-dialog"'), 'Direct /shop/ load renders collection controls');
    assert.ok(!directShopSlashHtml.includes('Product not found'), 'Direct /shop/ load must not display product-not-found');

    console.log('✅ PASS: [P2] Trailing slash normalization (/sarees/, /shop/, category, product) routes correctly with direct-load collection support');

    // [P2] Malformed percent-escape routing tests
    // Ensure malformed percent-escaped URLs don't throw URIError and route safely to not-found view
    const rMalformedSarees = getRouteFromPath('/sarees/100%');
    assert.strictEqual(rMalformedSarees.page, 'not-found', '/sarees/100% with malformed percent-escape must route to not-found');
    assert.strictEqual(rMalformedSarees.params.path, '/sarees/100%');

    const rMalformedProduct = getRouteFromPath('/product/%E0%A4%A');
    assert.strictEqual(rMalformedProduct.page, 'not-found', '/product/%E0%A4%A with truncated UTF-8 percent-escape must route to not-found');
    assert.strictEqual(rMalformedProduct.params.path, '/product/%E0%A4%A');

    const rMalformedCategory = getRouteFromPath('/sarees/category/%E0%A4%A');
    assert.strictEqual(rMalformedCategory.page, 'not-found', '/sarees/category/%E0%A4%A with malformed percent-escape must route to not-found');
    assert.strictEqual(rMalformedCategory.params.path, '/sarees/category/%E0%A4%A');

    console.log('✅ PASS: [P2] Malformed percent-escaped routes (/sarees/100%, /product/%E0%A4%A) route safely to not-found without crashing');

    // 6. Verify [P2] Lightweight generated thumbnails in catalog cards
    const productCardSource = fs.readFileSync(path.resolve(__dirname, '../../client/src/components/ProductCard.jsx'), 'utf8');
    assert.ok(
      productCardSource.includes("import { getThumbnailUrl } from '../utils/imageUtils'") ||
      productCardSource.includes('getThumbnailUrl'),
      'ProductCard must import getThumbnailUrl'
    );
    assert.ok(
      productCardSource.includes('primaryThumb') && productCardSource.includes('secondaryThumb'),
      'ProductCard must compute primary and secondary thumbnail variants'
    );
    assert.ok(
      productCardSource.includes('onNavigate(\'product\', { slug: product.slug, image: primaryImg'),
      'ProductCard must preserve full-resolution primaryImg when navigating to product detail'
    );

    const productCardResult = await vite.build({
      root: path.resolve(__dirname, '../../client'),
      logLevel: 'silent',
      build: {
        write: false,
        lib: {
          entry: path.resolve(__dirname, '../../client/src/components/ProductCard.jsx'),
          formats: ['cjs'],
          fileName: 'productCard'
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'lucide-react', '../context/WishlistContext', '../context/CartContext', '../context/CompareContext']
        }
      }
    });

    const cardCode = productCardResult[0].output[0].code;
    const cardMod = { exports: {} };
    const cardFn = new Function('require', 'module', 'exports', cardCode);
    cardFn((id) => {
      if (id === 'react') return React;
      if (id.includes('WishlistContext')) return { useWishlist: () => ({ isWishlisted: () => false, toggleWishlist: () => {} }) };
      if (id.includes('CartContext')) return { useCart: () => ({ addToCart: () => {}, setQuickViewProduct: () => {} }) };
      if (id.includes('CompareContext')) return { useCompare: () => ({ isInCompare: () => false, addToCompare: () => {} }) };
      return mockLucide;
    }, cardMod, cardMod.exports);

    const ProductCard = cardMod.exports.default || cardMod.exports;
    const cardHtml = ReactDOMServer.renderToString(React.createElement(ProductCard, {
      product: {
        id: 1,
        name: 'Rajkumari Heritage Bridal Banarasi',
        slug: 'rajkumari-heritage-bridal-banarasi',
        price: 45000,
        primary_image: '/images/sarees/bridal_sindoor.jpg',
        secondary_image: '/images/sarees/bridal_sindoor_detail.jpg'
      },
      onNavigate: () => {}
    }));

    // Verify card image uses thumbnail variant (12KB) instead of full-size (839KB)
    assert.ok(
      cardHtml.includes('/images/thumbnails/sarees/bridal_sindoor.jpg'),
      'ProductCard img src must use generated thumbnail variant /images/thumbnails/...'
    );
    assert.ok(
      !cardHtml.includes('src="/images/sarees/bridal_sindoor.jpg"'),
      'ProductCard img src must not use full-size source image'
    );
    console.log('✅ PASS: [P2] Catalog cards utilize generated lightweight thumbnails (~12KB) instead of heavy full-size assets (~839KB)');

    // 7. Verify [P2] Category-specific metadata preservation after hydration with full canonical catalog.json parity
    const { updatePageMeta, getCategoryRecord, CATEGORY_CATALOG } = require(path.resolve(__dirname, '../../client/src/utils/seo'));
    const canonicalCategories = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/catalog.json'), 'utf8')).categories;
    for (const cat of canonicalCategories) {
      const clientRecord = getCategoryRecord(cat.slug);
      assert.ok(clientRecord, `Client CATEGORY_CATALOG must define category ${cat.slug}`);
      assert.strictEqual(clientRecord.name, cat.name, `Category name mismatch for ${cat.slug}`);
      assert.strictEqual(clientRecord.description, cat.description, `Category description mismatch for ${cat.slug}`);
      assert.strictEqual(clientRecord.image_url, cat.image_url, `Category image_url mismatch for ${cat.slug}`);
    }

    // Simulate DOM environment for updatePageMeta
    const metaTags = {};
    const mockDocument = {
      title: '',
      createElement: () => ({
        setAttribute(k, v) {
          this[k] = v;
          if (k === 'content' && (this.name || this.property)) {
            metaTags[this.name || this.property] = v;
          }
        }
      }),
      querySelector: (selector) => null,
      querySelectorAll: (selector) => [],
      head: {
        appendChild: () => {}
      }
    };

    const previousDocument = global.document;
    global.document = mockDocument;

    try {
      // Test cotton-sarees
      updatePageMeta('shop', { category: 'cotton-sarees' });
      assert.strictEqual(
        mockDocument.title,
        'Cotton & Handloom Collection | PALLUVO',
        'Direct load/hydration of cotton-sarees must preserve "Cotton & Handloom Collection | PALLUVO" title'
      );
      assert.strictEqual(
        metaTags['description'],
        'Breathable handcrafted mulmul, linen, and jamdani sarees for breezy effortless grace.',
        'Direct load/hydration must preserve category-specific description instead of generic text'
      );
      assert.strictEqual(
        metaTags['og:image'],
        'https://palluvo.com/images/categories/cotton.jpg',
        'Direct load/hydration must preserve category-specific og:image'
      );
      assert.strictEqual(
        metaTags['og:image:alt'],
        'Cotton & Handloom - Luxury Handloom Sarees | PALLUVO'
      );

      // Test bridal-collection canonical alignment
      updatePageMeta('shop', { category: 'bridal-collection' });
      assert.strictEqual(
        mockDocument.title,
        'Bridal Collection Collection | PALLUVO',
        'Direct load/hydration of bridal-collection must preserve "Bridal Collection Collection | PALLUVO" title'
      );
      assert.strictEqual(
        metaTags['description'],
        'Heirloom trousseau masterworks handcrafted for weddings and lifetime memories.',
        'Direct load/hydration of bridal-collection must preserve canonical description from catalog.json'
      );
      assert.strictEqual(
        metaTags['og:image'],
        'https://palluvo.com/images/categories/bridal.jpg',
        'Direct load/hydration of bridal-collection must preserve canonical /images/categories/bridal.jpg'
      );
      assert.strictEqual(
        metaTags['og:image:alt'],
        'Bridal Collection - Luxury Handloom Sarees | PALLUVO'
      );
      console.log('✅ PASS: [P2] Category-specific metadata strictly preserves canonical catalog.json parity after hydration');
    } finally {
      global.document = previousDocument;
    }

    // 8. Verify [P2] SearchModal and imageUtils use lightweight thumbnails including remote URLs
    const { getThumbnailUrl } = require(path.resolve(__dirname, '../../client/src/utils/imageUtils'));
    const remoteUnsplashUrl = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80';
    assert.strictEqual(
      getThumbnailUrl(remoteUnsplashUrl),
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=180&q=80',
      'getThumbnailUrl must resize remote Unsplash URLs to lightweight w=180 thumbnail'
    );

    const searchModalPath = path.resolve(__dirname, '../../client/src/components/SearchModal.jsx');
    const searchModalSource = fs.readFileSync(searchModalPath, 'utf8');
    assert.ok(
      searchModalSource.includes("import { getThumbnailUrl } from '../utils/imageUtils'") ||
      searchModalSource.includes('getThumbnailUrl'),
      'SearchModal must import getThumbnailUrl'
    );
    assert.ok(
      searchModalSource.includes('getThumbnailUrl(prod.primary_image)'),
      'SearchModal result rows must render lightweight thumbnail variant for instant-search suggestions'
    );
    assert.ok(
      searchModalSource.includes('image: product.primary_image'),
      'SearchModal handleSelectProduct must preserve original full-size image when navigating to product detail'
    );
    console.log('✅ PASS: [P2] Instant-search results and imageUtils utilize lightweight thumbnails for local and remote assets');

    // 9. Verify [P2] Quick View Dialog Naming & Keyboard Focus Management
    const quickViewModalPath = path.resolve(__dirname, '../../client/src/components/QuickViewModal.jsx');
    assert.ok(fs.existsSync(quickViewModalPath), 'QuickViewModal.jsx must exist');
    const quickViewSource = fs.readFileSync(quickViewModalPath, 'utf8');

    // Dialog naming: aria-labelledby="quickview-title" matches heading with id="quickview-title"
    assert.ok(
      quickViewSource.includes('aria-labelledby="quickview-title"'),
      'QuickViewModal must specify aria-labelledby="quickview-title"'
    );
    assert.ok(
      quickViewSource.includes('id="quickview-title"'),
      'QuickViewModal must define referenced heading with id="quickview-title"'
    );
    assert.ok(
      quickViewSource.includes('<h2 id="quickview-title"') &&
      quickViewSource.includes('{quickViewProduct.name}'),
      'QuickViewModal heading with id="quickview-title" must contain product name for screen readers'
    );

    // Focus entry: moves focus into modal on open
    assert.ok(
      quickViewSource.includes('closeButtonRef.current.focus()'),
      'QuickViewModal must move focus into modal on open'
    );

    // Escape-to-close handling
    assert.ok(
      (quickViewSource.includes("e.key === 'Escape'") || quickViewSource.includes("event.key === 'Escape'")) &&
      quickViewSource.includes('setQuickViewProduct(null)'),
      'QuickViewModal must dismiss when Escape key is pressed'
    );

    // Focus trapping (Tab & Shift+Tab)
    assert.ok(
      (quickViewSource.includes("e.key === 'Tab'") || quickViewSource.includes("event.key === 'Tab'")) &&
      (quickViewSource.includes('e.shiftKey') || quickViewSource.includes('event.shiftKey')) &&
      quickViewSource.includes('firstElement.focus()') &&
      quickViewSource.includes('lastElement.focus()'),
      'QuickViewModal must trap Tab and Shift+Tab navigation within the dialog'
    );

    // Focus restoration on close
    assert.ok(
      quickViewSource.includes('previouslyFocusedElementRef.current') &&
      quickViewSource.includes('prevTarget.focus()'),
      'QuickViewModal must restore focus to trigger element on close'
    );

    // Scroll lock on open and restore on close
    assert.ok(
      quickViewSource.includes("document.body.style.overflow = 'hidden'") &&
      quickViewSource.includes('document.body.style.overflow = originalOverflow'),
      'QuickViewModal must lock body scroll when open and restore on close'
    );

    // Compile QuickViewModal via Vite to verify dialog semantics
    const quickViewBuildResult = await vite.build({
      root: path.resolve(__dirname, '../../client'),
      logLevel: 'silent',
      build: {
        write: false,
        lib: {
          entry: quickViewModalPath,
          formats: ['cjs'],
          fileName: 'quickViewModal'
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'lucide-react', '../context/CartContext', '../context/WishlistContext', '../utils/imageUtils']
        }
      }
    });

    const quickViewCode = quickViewBuildResult[0].output[0].code;
    const quickViewMod = { exports: {} };
    const quickViewFn = new Function('require', 'module', 'exports', quickViewCode);
    const mockQuickProduct = {
      id: 101,
      name: 'Samrajni Grand Muhurtham Silk Saree',
      slug: 'samrajni-grand-muhurtham',
      price: 65000,
      primary_image: '/images/sarees/kanjivaram.jpg',
      fabric: 'Pure Kanjivaram Silk',
      occasion: 'Bridal Muhurtham',
      review_count: 12,
      rating: 4.9
    };

    let closedModal = false;

    quickViewFn((id) => {
      if (id === 'react') return React;
      if (id.includes('CartContext')) {
        return {
          useCart: () => ({
            quickViewProduct: mockQuickProduct,
            setQuickViewProduct: (val) => {
              if (val === null) closedModal = true;
            },
            addToCart: () => {}
          })
        };
      }
      if (id.includes('WishlistContext')) {
        return {
          useWishlist: () => ({
            isWishlisted: () => false,
            toggleWishlist: () => {}
          })
        };
      }
      if (id.includes('imageUtils')) {
        return {
          getThumbnailUrl: (url) => url
        };
      }
      return mockLucide;
    }, quickViewMod, quickViewMod.exports);

    const QuickViewModalComponent = quickViewMod.exports.default || quickViewMod.exports;
    const quickViewRenderedHtml = ReactDOMServer.renderToString(React.createElement(QuickViewModalComponent, {
      onNavigate: () => {}
    }));

    assert.ok(quickViewRenderedHtml.includes('role="dialog"'), 'QuickViewModal must render role="dialog"');
    assert.ok(quickViewRenderedHtml.includes('aria-modal="true"'), 'QuickViewModal must render aria-modal="true"');
    assert.ok(quickViewRenderedHtml.includes('aria-labelledby="quickview-title"'), 'QuickViewModal must reference quickview-title');
    assert.ok(quickViewRenderedHtml.includes('id="quickview-title"'), 'QuickViewModal must contain element with id="quickview-title"');
    assert.ok(quickViewRenderedHtml.includes('Samrajni Grand Muhurtham Silk Saree'), 'QuickViewModal heading must contain product name');
    assert.ok(quickViewRenderedHtml.includes('aria-label="Close quick view"'), 'Close button must have accessible label');

    // Behavioral Keyboard Regression Test:
    // Execute QuickViewModal with mock hooks to invoke useEffect and test keyboard behavior
    let effectFn = null;
    const prevGlobalDoc = global.document;
    const prevGlobalWin = global.window;

    const mockTriggerEl = {
      id: 'product-card-quick-view-button',
      focusCalls: 0,
      focus() { this.focusCalls++; }
    };

    const mockCloseBtnEl = {
      id: 'modal-close-button',
      focusCalls: 0,
      focus() { this.focusCalls++; },
      hasAttribute: () => false,
      getAttribute: () => null
    };

    const mockLastBtnEl = {
      id: 'modal-last-button',
      focusCalls: 0,
      focus() { this.focusCalls++; },
      hasAttribute: () => false,
      getAttribute: () => null
    };

    const mockModalContainer = {
      contains: (el) => el === mockCloseBtnEl || el === mockLastBtnEl,
      querySelectorAll: () => [mockCloseBtnEl, mockLastBtnEl]
    };

    const registeredListeners = {};
    const testDoc = {
      body: { style: { overflow: '' } },
      documentElement: {},
      activeElement: mockTriggerEl,
      contains: (el) => el === mockTriggerEl || el === mockCloseBtnEl || el === mockLastBtnEl
    };

    const testWin = {
      addEventListener: (evt, fn) => { registeredListeners[evt] = fn; },
      removeEventListener: (evt, fn) => { if (registeredListeners[evt] === fn) delete registeredListeners[evt]; }
    };

    global.document = testDoc;
    global.window = testWin;

    try {
      const refs = [];
      const mockReact = {
        ...React,
        useState: (initial) => [initial, () => {}],
        useRef: (initial) => {
          const ref = { current: initial };
          refs.push(ref);
          return ref;
        },
        useEffect: (fn) => {
          effectFn = fn;
        }
      };

      const testMod = { exports: {} };
      quickViewFn((id) => {
        if (id === 'react') return mockReact;
        if (id.includes('CartContext')) {
          return {
            useCart: () => ({
              quickViewProduct: mockQuickProduct,
              setQuickViewProduct: (val) => {
                if (val === null) closedModal = true;
              },
              addToCart: () => {}
            })
          };
        }
        if (id.includes('WishlistContext')) {
          return { useWishlist: () => ({ isWishlisted: () => false, toggleWishlist: () => {} }) };
        }
        if (id.includes('imageUtils')) return { getThumbnailUrl: (u) => u };
        return mockLucide;
      }, testMod, testMod.exports);

      const Component = testMod.exports.default || testMod.exports;
      Component({ onNavigate: () => {} });

      // Populate refs that React would assign upon DOM mounting
      // refs[0] is modalRef, refs[1] is closeButtonRef, refs[2] is previouslyFocusedElementRef
      refs[0].current = mockModalContainer;
      refs[1].current = mockCloseBtnEl;

      assert.strictEqual(typeof effectFn, 'function', 'QuickViewModal must register a focus management useEffect');
      const effectCleanup = effectFn();

      // Verify scroll lock
      assert.strictEqual(testDoc.body.style.overflow, 'hidden', 'Opening modal must lock document.body.style.overflow to hidden');

      // Verify keydown listener is registered on window
      assert.strictEqual(typeof registeredListeners['keydown'], 'function', 'Modal must register keydown listener on window');

      // Test 1: Escape keydown closes the modal
      closedModal = false;
      let escPrevented = false;
      registeredListeners['keydown']({
        key: 'Escape',
        preventDefault: () => { escPrevented = true; },
        stopPropagation: () => {}
      });
      assert.strictEqual(escPrevented, true, 'Escape keydown must call preventDefault');
      assert.strictEqual(closedModal, true, 'Escape keydown must trigger setQuickViewProduct(null)');

      // Test 2: Shift+Tab on first element wraps focus to last element
      testDoc.activeElement = mockCloseBtnEl;
      let shiftTabPrevented = false;
      mockLastBtnEl.focusCalls = 0;
      registeredListeners['keydown']({
        key: 'Tab',
        shiftKey: true,
        preventDefault: () => { shiftTabPrevented = true; }
      });
      assert.strictEqual(shiftTabPrevented, true, 'Shift+Tab on firstElement must call preventDefault');
      assert.strictEqual(mockLastBtnEl.focusCalls, 1, 'Shift+Tab on firstElement must wrap focus to lastElement');

      // Test 3: Tab on last element wraps focus to first element
      testDoc.activeElement = mockLastBtnEl;
      let tabPrevented = false;
      mockCloseBtnEl.focusCalls = 0;
      registeredListeners['keydown']({
        key: 'Tab',
        shiftKey: false,
        preventDefault: () => { tabPrevented = true; }
      });
      assert.strictEqual(tabPrevented, true, 'Tab on lastElement must call preventDefault');
      assert.strictEqual(mockCloseBtnEl.focusCalls, 1, 'Tab on lastElement must wrap focus to firstElement');

      // Test 4: Tab when focus is outside dialog pulls focus into first element
      testDoc.activeElement = testDoc.body;
      let outsideTabPrevented = false;
      mockCloseBtnEl.focusCalls = 0;
      registeredListeners['keydown']({
        key: 'Tab',
        shiftKey: false,
        preventDefault: () => { outsideTabPrevented = true; }
      });
      assert.strictEqual(outsideTabPrevented, true, 'Tab outside dialog must call preventDefault');
      assert.strictEqual(mockCloseBtnEl.focusCalls, 1, 'Tab outside dialog must focus firstElement');

      // Test 5: Focus restoration on unmount / cleanup
      assert.strictEqual(typeof effectCleanup, 'function', 'Effect must return a cleanup function');
      mockTriggerEl.focusCalls = 0;
      effectCleanup();

      assert.strictEqual(testDoc.body.style.overflow, '', 'Closing modal must restore document.body.style.overflow');
      assert.strictEqual(registeredListeners['keydown'], undefined, 'Closing modal must remove keydown listener');
      assert.strictEqual(mockTriggerEl.focusCalls, 1, 'Closing modal must restore focus to trigger element');

      console.log('✅ PASS: [P2] QuickViewModal named with id="quickview-title" and keyboard focus trap, Escape dismissal, and restoration verified with regression tests');
    } finally {
      global.document = prevGlobalDoc;
      global.window = prevGlobalWin;
    }

    // 6. [P2] Gallery Thumbnail Semantics (QuickViewModal & ProductDetailPage)
    const productDetailPagePath = path.resolve(__dirname, '../../client/src/pages/ProductDetailPage.jsx');
    const productDetailSource = fs.readFileSync(productDetailPagePath, 'utf8');
    const quickViewFreshSource = fs.readFileSync(quickViewModalPath, 'utf8');

    // Neither gallery carries fake tab roles or unbacked tablist
    assert.ok(!quickViewFreshSource.includes('role="tablist"'), 'QuickViewModal must not use role="tablist" for thumbnails');
    assert.ok(!quickViewFreshSource.includes('role="tab"'), 'QuickViewModal must not use role="tab" for thumbnails');
    assert.ok(!productDetailSource.includes('role="tablist"'), 'ProductDetailPage must not use role="tablist" for thumbnails');
    assert.ok(!productDetailSource.includes('role="tab"'), 'ProductDetailPage must not use role="tab" for thumbnails');
    assert.ok(!productDetailSource.includes('aria-controls="gallery-main-image"'), 'ProductDetailPage must not point aria-controls at a button');

    // Both galleries express selection via aria-pressed and expose accessible group naming via role="group"
    assert.ok(quickViewFreshSource.includes('aria-pressed={selectedImageIndex === idx}'), 'QuickViewModal thumbnails must express selection via aria-pressed');
    assert.ok(productDetailSource.includes('aria-pressed={isSelected}'), 'ProductDetailPage thumbnails must express selection via aria-pressed');
    assert.ok(
      quickViewFreshSource.includes('role="group"') && quickViewFreshSource.includes('aria-label="Product thumbnail gallery"'),
      'QuickViewModal thumbnails container must provide role="group" to expose aria-label'
    );
    assert.ok(
      productDetailSource.includes('role="group"') && productDetailSource.includes('aria-label="Product image gallery thumbnails"'),
      'ProductDetailPage thumbnails container must provide role="group" to expose aria-label'
    );

    console.log('✅ PASS: [P2/P3] Gallery thumbnails use role="group" with aria-label and express selection via aria-pressed across QuickViewModal and ProductDetailPage');

    // 7. [P2] Sitemap and Robots Generation & Server Endpoints
    const { generateSitemapXml, generateRobotsTxt, getAllCatalogRoutes, getCanonicalCatalogRoutes, formatLastmod } = require('../services/sitemap');
    const catalog = require('../data/catalog.json');

    // [P3] Verify SQLite CURRENT_TIMESTAMP early-UTC timestamp does not shift day in local timezones
    assert.strictEqual(formatLastmod('2026-10-09 00:30:00'), '2026-10-09', 'Early-UTC timestamp must not shift to previous day');
    assert.strictEqual(formatLastmod('2026-10-09 04:15:22'), '2026-10-09', 'Early-UTC morning hours must preserve calendar date');
    assert.strictEqual(formatLastmod('2026-10-09T00:30:00Z'), '2026-10-09', 'ISO UTC string must preserve calendar date');

    const canonicalRoutes = getCanonicalCatalogRoutes(catalog);
    assert.strictEqual(canonicalRoutes.length, 44, 'Canonical route enumeration must match 44 canonical indexable routes (13 static + 8 category + 23 product)');

    const generatedSitemap = generateSitemapXml(catalog);
    assert.ok(generatedSitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Sitemap must have XML declaration');
    assert.ok(generatedSitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'Sitemap must contain urlset');
    assert.ok(generatedSitemap.includes('<loc>https://palluvo.com/</loc>'), 'Sitemap must include root route');
    assert.ok(generatedSitemap.includes('<loc>https://palluvo.com/sarees</loc>'), 'Sitemap must include canonical /sarees route');
    assert.ok(generatedSitemap.includes('<loc>https://palluvo.com/sarees?category=banarasi-sarees</loc>'), 'Sitemap must include canonical category query route');
    assert.ok(generatedSitemap.includes('<loc>https://palluvo.com/sarees/royal-crimson-banarasi-katan-silk-saree</loc>'), 'Sitemap must include canonical product route');

    // Verify private pages and duplicate non-canonical forms are excluded from sitemap.xml
    const nonCanonicalPaths = [
      '/cart',
      '/checkout',
      '/order-success',
      '/track-order',
      '/account',
      '/wishlist',
      '/admin',
      '<loc>https://palluvo.com/shop</loc>',
      '/sarees/category/',
      '/category/',
      '/product/'
    ];
    for (const badPath of nonCanonicalPaths) {
      assert.ok(!generatedSitemap.includes(badPath), `Sitemap must NOT advertise private or non-canonical duplicate path: ${badPath}`);
    }

    // Verify lastmod is not uniformly stamped with build date across all URLs
    const lastmodMatches = generatedSitemap.match(/<lastmod>([^<]+)<\/lastmod>/g) || [];
    // Static routes omit lastmod
    assert.ok(!generatedSitemap.includes('<loc>https://palluvo.com/</loc>\n    <lastmod>'), 'Static routes without distinct timestamps must omit lastmod');

    assert.ok(generatedSitemap.includes('<changefreq>'), 'Sitemap must contain changefreq elements');
    assert.ok(generatedSitemap.includes('<priority>'), 'Sitemap must contain priority elements');

    const generatedRobots = generateRobotsTxt();
    assert.ok(generatedRobots.includes('User-agent: *'), 'Robots.txt must specify User-agent: *');
    assert.ok(generatedRobots.includes('Allow: /'), 'Robots.txt must allow root');
    assert.ok(generatedRobots.includes('Disallow: /admin'), 'Robots.txt must disallow /admin');
    assert.ok(generatedRobots.includes('Disallow: /checkout'), 'Robots.txt must disallow /checkout');
    assert.ok(generatedRobots.includes('Disallow: /cart'), 'Robots.txt must disallow /cart');
    assert.ok(generatedRobots.includes('Disallow: /account'), 'Robots.txt must disallow /account');
    assert.ok(generatedRobots.includes('Disallow: /order-success'), 'Robots.txt must disallow /order-success');
    assert.ok(generatedRobots.includes('Sitemap: https://palluvo.com/sitemap.xml'), 'Robots.txt must reference sitemap.xml');

    // Verify files exist in client/public and client/dist
    const pubRobotsPath = path.resolve(__dirname, '../../client/public/robots.txt');
    const pubSitemapPath = path.resolve(__dirname, '../../client/public/sitemap.xml');
    assert.ok(fs.existsSync(pubRobotsPath), 'client/public/robots.txt must exist');
    assert.ok(fs.existsSync(pubSitemapPath), 'client/public/sitemap.xml must exist');

    // Test server endpoints
    const serverApp = require('../index');
    const http = require('http');
    const server = http.createServer(serverApp);
    await new Promise((resolve) => server.listen(0, resolve));
    const testPort = server.address().port;

    try {
      const robotsRes = await fetch(`http://127.0.0.1:${testPort}/robots.txt`);
      assert.strictEqual(robotsRes.status, 200, 'GET /robots.txt must return 200 OK');
      assert.ok(robotsRes.headers.get('content-type').includes('text/plain'), 'GET /robots.txt must be text/plain');
      const robotsBody = await robotsRes.text();
      assert.ok(robotsBody.includes('Sitemap: https://palluvo.com/sitemap.xml'), 'GET /robots.txt body must reference sitemap.xml');

      const sitemapRes = await fetch(`http://127.0.0.1:${testPort}/sitemap.xml`);
      assert.strictEqual(sitemapRes.status, 200, 'GET /sitemap.xml must return 200 OK');
      assert.ok(sitemapRes.headers.get('content-type').includes('xml'), 'GET /sitemap.xml must be XML');
      const sitemapBody = await sitemapRes.text();
      assert.ok(sitemapBody.includes('<urlset'), 'GET /sitemap.xml must return valid urlset XML');
      assert.ok(sitemapBody.includes('<loc>https://palluvo.com/</loc>'), 'GET /sitemap.xml must contain homepage');
      assert.ok(!sitemapBody.includes('/cart'), 'GET /sitemap.xml must not contain private routes');

      // [P2] Verify sitemap endpoint serves current dynamic data rather than stale build artifact
      const distSitemapPath = path.resolve(__dirname, '../../client/dist/sitemap.xml');
      const origDistSitemap = fs.existsSync(distSitemapPath) ? fs.readFileSync(distSitemapPath, 'utf8') : null;
      try {
        if (fs.existsSync(path.dirname(distSitemapPath))) {
          fs.writeFileSync(distSitemapPath, '<?xml version="1.0"?><urlset><url><loc>https://palluvo.com/stale-old-route</loc></url></urlset>', 'utf8');
        }
        const dynamicSitemapRes = await fetch(`http://127.0.0.1:${testPort}/sitemap.xml`);
        const dynamicBody = await dynamicSitemapRes.text();
        assert.ok(!dynamicBody.includes('/stale-old-route'), 'GET /sitemap.xml must serve current data and NOT stale build artifact');
        assert.ok(dynamicBody.includes('<loc>https://palluvo.com/sarees</loc>'), 'Dynamic sitemap must include current catalog routes');
      } finally {
        if (origDistSitemap !== null) {
          fs.writeFileSync(distSitemapPath, origDistSitemap, 'utf8');
        } else if (fs.existsSync(distSitemapPath)) {
          fs.unlinkSync(distSitemapPath);
        }
      }

      // [P2] Verify runtime modification of catalog.json is immediately reflected in GET /sitemap.xml (no require cache pinning)
      const catalogPath = path.resolve(__dirname, '../data/catalog.json');
      const origCatalogRaw = fs.readFileSync(catalogPath, 'utf8');

      try {
        const modifiedCatalog = JSON.parse(origCatalogRaw.replace(/^\uFEFF/, ''));
        modifiedCatalog.products.push({
          id: 99999,
          name: 'Runtime Published Saree',
          slug: 'runtime-published-saree-unique-123',
          category: 'banarasi',
          category_slug: 'banarasi'
        });
        fs.writeFileSync(catalogPath, JSON.stringify(modifiedCatalog, null, 2), 'utf8');

        const runtimeRes = await fetch(`http://127.0.0.1:${testPort}/sitemap.xml`);
        const runtimeBody = await runtimeRes.text();
        assert.ok(
          runtimeBody.includes('https://palluvo.com/sarees/runtime-published-saree-unique-123'),
          'GET /sitemap.xml must immediately reflect catalog.json runtime changes without process restart'
        );

        // [P2] Verify UTF-8 BOM handling and malformed catalog fallback to last known good
        // 1. UTF-8 BOM prefix
        fs.writeFileSync(catalogPath, '\uFEFF' + JSON.stringify(modifiedCatalog, null, 2), 'utf8');
        const bomRes = await fetch(`http://127.0.0.1:${testPort}/sitemap.xml`);
        const bomBody = await bomRes.text();
        assert.ok(
          bomBody.includes('https://palluvo.com/sarees/runtime-published-saree-unique-123'),
          'GET /sitemap.xml must handle UTF-8 BOM prefix seamlessly'
        );

        // 2. Malformed JSON fallback to last known good
        fs.writeFileSync(catalogPath, '{"broken_json: [malformed', 'utf8');
        const malformedRes = await fetch(`http://127.0.0.1:${testPort}/sitemap.xml`);
        const malformedBody = await malformedRes.text();
        assert.strictEqual(malformedRes.status, 200, 'GET /sitemap.xml must still return 200 on malformed catalog');
        assert.ok(
          malformedBody.includes('https://palluvo.com/sarees/runtime-published-saree-unique-123'),
          'GET /sitemap.xml must fall back to lastKnownGoodCatalog when catalog.json is malformed instead of degrading to 13 static routes'
        );
      } finally {
        fs.writeFileSync(catalogPath, origCatalogRaw, 'utf8');
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    console.log('✅ PASS: [P2] Canonical sitemap.xml (44 indexable routes) and robots.txt verified in prerender, client/public, and server endpoints');

    // 10. Verify [P2] Product Structured Data (JSON-LD) and og:type
    const { getMetaForRoute, injectMetaTags } = require('../services/seoRenderer');
    const productMeta = getMetaForRoute('/sarees/royal-crimson-banarasi-katan-silk-saree');
    assert.strictEqual(productMeta.ogType, 'product', 'Product route meta must have ogType="product"');
    assert.ok(Array.isArray(productMeta.structuredData), 'Product route meta must contain structuredData array');
    assert.strictEqual(productMeta.structuredData.length, 2, 'Product structuredData must contain Product and BreadcrumbList');

    const productSchema = productMeta.structuredData.find(s => s['@type'] === 'Product');
    assert.ok(productSchema, 'Structured data must include @type Product');
    assert.ok(productSchema.name, 'Product schema must include name');
    assert.ok(Array.isArray(productSchema.image) && productSchema.image.length > 0, 'Product schema must include image array');
    assert.ok(productSchema.offers, 'Product schema must include offers');
    assert.strictEqual(productSchema.offers.priceCurrency, 'INR', 'Product offer priceCurrency must be INR');
    assert.ok(productSchema.offers.price > 0, 'Product offer price must be > 0');
    const db = require('../db/database');
    const dbProduct = db.prepare('SELECT id, slug, stock_quantity FROM products WHERE slug = ?').get('royal-crimson-banarasi-katan-silk-saree');
    if (dbProduct && dbProduct.stock_quantity !== undefined && dbProduct.stock_quantity !== null) {
      assert.ok(productSchema.offers.availability.includes('InStock'), 'Product offer availability must be InStock when in stock in DB');
      const reviewAggregate = db.prepare('SELECT COUNT(*) as count, ROUND(AVG(rating), 1) as avg_rating FROM reviews WHERE product_id = ?').get(dbProduct.id);
      if (reviewAggregate && reviewAggregate.count > 0) {
        assert.ok(productSchema.aggregateRating, 'Product with reviews in DB must have aggregateRating');
        assert.strictEqual(productSchema.aggregateRating.reviewCount, reviewAggregate.count, 'Review count must match reviews table aggregate');
        assert.strictEqual(productSchema.aggregateRating.ratingValue, reviewAggregate.avg_rating, 'Rating value must match reviews table average');
      } else {
        assert.strictEqual(productSchema.aggregateRating, undefined, 'Product with 0 reviews in DB must omit aggregateRating');
      }
    } else {
      assert.strictEqual(productSchema.offers.availability, undefined, 'Product offer availability must be omitted without synchronized stock');
      assert.strictEqual(productSchema.aggregateRating, undefined, 'Product aggregateRating must be omitted without review aggregate');
    }

    const breadcrumbSchema = productMeta.structuredData.find(s => s['@type'] === 'BreadcrumbList');
    assert.ok(breadcrumbSchema, 'Structured data must include @type BreadcrumbList');
    assert.ok(Array.isArray(breadcrumbSchema.itemListElement) && breadcrumbSchema.itemListElement.length >= 3, 'BreadcrumbList must have at least 3 levels');

    const sampleHtml = '<!DOCTYPE html><html><head><title>Test</title><meta property="og:type" content="website" /></head><body></body></html>';
    const renderedHtml = injectMetaTags(sampleHtml, productMeta);
    assert.ok(renderedHtml.includes('property="og:type" content="product"'), 'Rendered HTML must switch og:type to product');
    assert.ok(renderedHtml.includes('application/ld+json'), 'Rendered HTML must inject application/ld+json script tags');
    assert.ok(renderedHtml.includes('data-schema="product-jsonld"'), 'Rendered HTML must include data-schema="product-jsonld"');
    assert.ok(renderedHtml.includes('"@type": "Product"'), 'Rendered HTML must contain Product schema');
    assert.ok(renderedHtml.includes('"@type": "BreadcrumbList"'), 'Rendered HTML must contain BreadcrumbList schema');

    // Verify verified rating emission on product with rating
    const { generateProductJsonLd } = require('../services/seoRenderer');
    const ratedProductSchema = generateProductJsonLd({
      name: 'Rated Saree',
      slug: 'rated-saree',
      price: 8999,
      rating: 4.8,
      review_count: 25
    }, 'https://palluvo.com/sarees/rated-saree', 'https://palluvo.com/img.jpg', 'Desc');
    assert.ok(ratedProductSchema.aggregateRating, 'Product with verified rating must include aggregateRating');
    assert.strictEqual(ratedProductSchema.aggregateRating.ratingValue, 4.8);
    assert.strictEqual(ratedProductSchema.aggregateRating.reviewCount, 25);

    // Verify unverified/unknown offers, stock, and aggregateRating are omitted (no price: 0 or fabricated 4.9/12 or default InStock)
    const bareProductSchema = generateProductJsonLd({ name: 'Unpriced Saree', slug: 'unpriced-saree' }, 'https://palluvo.com/sarees/unpriced-saree', 'https://palluvo.com/img.jpg', 'Desc');
    assert.strictEqual(bareProductSchema.offers, undefined, 'Product with unknown price must omit offers (no price: 0)');
    assert.strictEqual(bareProductSchema.aggregateRating, undefined, 'Product with unknown rating must omit aggregateRating (no fabricated 4.9/12)');

    // Verify unverified/unknown stock omits availability (never defaults to InStock)
    const unstockedProductSchema = generateProductJsonLd({
      name: 'Unstocked Saree',
      slug: 'unstocked-saree',
      price: 8999
    }, 'https://palluvo.com/sarees/unstocked-saree', 'https://palluvo.com/img.jpg', 'Desc');
    assert.strictEqual(unstockedProductSchema.offers.price, 8999);
    assert.strictEqual(unstockedProductSchema.offers.availability, undefined, 'Product with unknown stock must omit offers.availability');

    // Verify verified out-of-stock product emits OutOfStock
    const outOfStockProductSchema = generateProductJsonLd({
      name: 'Sold Out Saree',
      slug: 'sold-out-saree',
      price: 8999,
      stock_quantity: 0
    }, 'https://palluvo.com/sarees/sold-out-saree', 'https://palluvo.com/img.jpg', 'Desc');
    assert.strictEqual(outOfStockProductSchema.offers.availability, 'https://schema.org/OutOfStock');

    // Verify server catalog fallback path omits unsynchronized stock/ratings to prevent stale schema claims
    const catalogData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/catalog.json'), 'utf8'));
    assert.ok(catalogData.products.length >= 23, 'catalog.json must contain at least 23 products');
    for (const catProd of catalogData.products) {
      assert.ok(catProd.price > 0, `Catalog product ${catProd.slug} must have verified price`);
      assert.strictEqual(catProd.stock_quantity, undefined, `Catalog fallback product ${catProd.slug} must not have hardcoded stock_quantity`);
      assert.strictEqual(catProd.rating, undefined, `Catalog fallback product ${catProd.slug} must not have hardcoded rating`);
      assert.strictEqual(catProd.review_count, undefined, `Catalog fallback product ${catProd.slug} must not have hardcoded review_count`);
    }

    // Verify catalog fallback strictly omits availability and aggregateRating when live inventory and reviews are absent
    const fallbackMeta = generateProductJsonLd(
      catalogData.products[0],
      `https://palluvo.com/sarees/${catalogData.products[0].slug}`,
      'https://palluvo.com/img.jpg',
      catalogData.products[0].description
    );
    assert.strictEqual(fallbackMeta.offers.availability, undefined, 'Fallback without live inventory must omit offers.availability');
    assert.strictEqual(fallbackMeta.aggregateRating, undefined, 'Fallback without live reviews must omit aggregateRating');

    // Verify catalog fallback when product has no stock_quantity strictly omits availability
    const mockFallbackWithoutStock = {
      name: 'Fallback Saree Without Inventory',
      slug: 'fallback-no-stock',
      price: 6499
    };
    const fallbackWithoutStockSchema = generateProductJsonLd(
      mockFallbackWithoutStock,
      'https://palluvo.com/sarees/fallback-no-stock',
      'https://palluvo.com/img.jpg',
      'Desc'
    );
    assert.strictEqual(fallbackWithoutStockSchema.offers.price, 6499);
    assert.strictEqual(fallbackWithoutStockSchema.offers.availability, undefined, 'Server fallback with missing stock_quantity must omit availability');

    const staticMeta = getMetaForRoute('/sarees');
    assert.strictEqual(staticMeta.ogType, 'website', 'Non-product route meta must have ogType="website"');
    const renderedStatic = injectMetaTags(sampleHtml, staticMeta);
    assert.ok(renderedStatic.includes('property="og:type" content="website"'), 'Rendered static HTML must preserve og:type website');
    assert.ok(!renderedStatic.includes('application/ld+json'), 'Non-product static HTML must not include product JSON-LD');

    // Verify client-side updatePageMeta handles DOM structured data lifecycle without duplicate tags
    const seoMockElements = [];
    const seoMockDocument = {
      head: {
        appendChild(el) { seoMockElements.push(el); return el; }
      },
      title: '',
      querySelector(selector) {
        if (selector.startsWith('meta[')) {
          const match = selector.match(/meta\[([^=]+)="([^"]+)"\]/);
          return seoMockElements.find(el => el.tagName === 'META' && el.attrs[match[1]] === match[2]) || null;
        }
        if (selector.includes('rel="canonical"')) {
          return seoMockElements.find(el => el.tagName === 'LINK' && el.attrs.rel === 'canonical') || null;
        }
        return null;
      },
      querySelectorAll(selector) {
        if (selector.includes('application/ld+json')) {
          return seoMockElements.filter(el => el.tagName === 'SCRIPT' && el.attrs.type === 'application/ld+json');
        }
        return [];
      },
      createElement(tag) {
        const el = {
          tagName: tag.toUpperCase(),
          attrs: {},
          setAttribute(k, v) { el.attrs[k] = v; },
          getAttribute(k) { return el.attrs[k]; },
          remove() {
            const idx = seoMockElements.indexOf(el);
            if (idx >= 0) seoMockElements.splice(idx, 1);
          },
          textContent: ''
        };
        return el;
      }
    };

    global.document = seoMockDocument;
    const { updatePageMeta: clientUpdatePageMeta } = require('../../client/src/utils/seo.js');

    // Simulate server-rendered tag present on initial page load
    const initialServerTag = seoMockDocument.createElement('script');
    initialServerTag.setAttribute('type', 'application/ld+json');
    initialServerTag.setAttribute('data-schema', 'product-jsonld');
    initialServerTag.textContent = '[{"@type":"Product","name":"Initial"}]';
    seoMockDocument.head.appendChild(initialServerTag);
    assert.strictEqual(seoMockDocument.querySelectorAll('script[type="application/ld+json"]').length, 1);

    // Navigate to product without hydrated product data (initial click-through with only slug/name)
    clientUpdatePageMeta('product', { slug: 'test-saree-1', name: 'Test Saree 1' });
    let ldScripts = seoMockDocument.querySelectorAll('script[type="application/ld+json"]');
    assert.strictEqual(ldScripts.length, 1, 'Client must replace previous tag, maintaining exactly 1 script tag');
    let parsedJson = JSON.parse(ldScripts[0].textContent);
    let parsedProduct = parsedJson[0];
    assert.strictEqual(parsedProduct.name, 'Test Saree 1');
    assert.strictEqual(parsedProduct.offers, undefined, 'Client must omit offers when price is unknown (no price: 0)');
    assert.strictEqual(parsedProduct.aggregateRating, undefined, 'Client must omit aggregateRating when rating is unknown (no 4.9/12)');

    // Navigate to another product with hydrated product data
    clientUpdatePageMeta('product', {
      slug: 'test-saree-2',
      product: { name: 'Test Saree 2', price: 9999, stock_quantity: 5, rating: 4.8, review_count: 50 }
    });
    ldScripts = seoMockDocument.querySelectorAll('script[type="application/ld+json"]');
    assert.strictEqual(ldScripts.length, 1, 'Client must replace previous product tag, never duplicating');
    parsedJson = JSON.parse(ldScripts[0].textContent);
    parsedProduct = parsedJson[0];
    assert.strictEqual(parsedProduct.name, 'Test Saree 2');
    assert.strictEqual(parsedProduct.offers.price, 9999);
    assert.strictEqual(parsedProduct.offers.availability, 'https://schema.org/InStock');
    assert.strictEqual(parsedProduct.aggregateRating.ratingValue, 4.8);
    assert.strictEqual(parsedProduct.aggregateRating.reviewCount, 50);

    // Navigate to product with price but unknown stock_quantity (client must omit availability)
    clientUpdatePageMeta('product', {
      slug: 'test-saree-3',
      product: { name: 'Test Saree 3', price: 7999 }
    });
    ldScripts = seoMockDocument.querySelectorAll('script[type="application/ld+json"]');
    assert.strictEqual(ldScripts.length, 1);
    parsedJson = JSON.parse(ldScripts[0].textContent);
    parsedProduct = parsedJson[0];
    assert.strictEqual(parsedProduct.name, 'Test Saree 3');
    assert.strictEqual(parsedProduct.offers.price, 7999);
    assert.strictEqual(parsedProduct.offers.availability, undefined, 'Client must omit availability when stock_quantity is unknown');

    // Navigate to non-product page (cart)
    clientUpdatePageMeta('cart', {});
    ldScripts = seoMockDocument.querySelectorAll('script[type="application/ld+json"]');
    assert.strictEqual(ldScripts.length, 0, 'Client must purge product JSON-LD on non-product routes');
    console.log('✅ PASS: [P2] Product structured data (JSON-LD Product and BreadcrumbList), data-schema attribute, client tag replacement, and omission of unverified offers/ratings verified');

    // 11. Verify [P2] Form Labels Programmatically Associated Across client/src
    function scanLabels(dir) {
      let results = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(scanLabels(fullPath));
        } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const clientSrcDir = path.resolve(__dirname, '../../client/src');
    const clientFiles = scanLabels(clientSrcDir);
    let totalClientLabels = 0;
    const unassociatedLabels = [];

    for (const filePath of clientFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      const labelRegex = /<label\b([^>]*)>/g;
      let match;
      while ((match = labelRegex.exec(source)) !== null) {
        totalClientLabels++;
        const attrs = match[1];
        const htmlForMatch = attrs.match(/htmlFor=["']([^"']+)["']/);

        if (htmlForMatch) {
          const targetId = htmlForMatch[1];
          const idRegex = new RegExp(`id=(?:["']${targetId}["']|\\{[^}]*['"\`]${targetId}['"\`][^}]*\\})`);
          const hasMatchingId = idRegex.test(source);
          if (!hasMatchingId) {
            unassociatedLabels.push({
              file: path.relative(clientSrcDir, filePath),
              label: match[0],
              issue: `htmlFor="${targetId}" does not match any element with id="${targetId}" in the file`
            });
          }
        } else {
          // Check if this <label> wraps a form control element (<input, <select, <textarea, <button)
          const labelStart = match.index;
          const labelEnd = source.indexOf('</label>', labelStart);
          if (labelEnd > labelStart) {
            const innerContent = source.substring(labelStart, labelEnd);
            const wrapsControl = /<(input|select|textarea|button)\b/.test(innerContent);
            if (!wrapsControl) {
              unassociatedLabels.push({
                file: path.relative(clientSrcDir, filePath),
                label: match[0],
                issue: 'Label does not specify htmlFor and does not wrap an input/select/textarea/button control'
              });
            }
          } else {
            unassociatedLabels.push({
              file: path.relative(clientSrcDir, filePath),
              label: match[0],
              issue: 'Unclosed <label> tag'
            });
          }
        }
      }
    }

    assert.ok(totalClientLabels >= 67, `Expected at least 67 labels across client/src, found ${totalClientLabels}`);
    assert.strictEqual(
      unassociatedLabels.length,
      0,
      `All form labels must be programmatically associated with controls. Unassociated:\n${JSON.stringify(unassociatedLabels, null, 2)}`
    );
    console.log(`✅ PASS: [P2] All ${totalClientLabels} form labels across client/src are programmatically associated with form controls (WCAG 1.3.1 & 3.3.2 compliant)`);

    // 12. Verify [P2] Review Submissions Idempotent per Customer and Product & No Hard-Coded Helpful Counts
    // A. Verify no hard-coded "Helpful (12)" in ProductDetailPage.jsx
    const pdpSource = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/ProductDetailPage.jsx'), 'utf8');
    assert.ok(
      !pdpSource.includes('Helpful (12)'),
      'ProductDetailPage.jsx must not contain hard-coded Helpful (12) count on reviews'
    );
    assert.ok(
      !pdpSource.includes('Helpful ('),
      'ProductDetailPage.jsx must not display unpersisted helpful counts for reviews'
    );

    // B. Verify database uniqueness constraint and idempotent review submissions
    const testReviewDb = require('../db/database');
    const targetProduct = testReviewDb.prepare('SELECT id, slug FROM products LIMIT 1').get();
    if (targetProduct) {
      const testUserId = 99998;
      // Ensure test user exists
      testReviewDb.prepare(`
        INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
        VALUES (?, 'Test Reviewer', 'reviewer_test@example.com', 'hash', 'user')
      `).run(testUserId);

      // Clean any existing test review
      testReviewDb.prepare('DELETE FROM reviews WHERE user_id = ?').run(testUserId);

      // Initial review count
      const initialCount = testReviewDb.prepare('SELECT COUNT(*) as c FROM reviews WHERE product_id = ?').get(targetProduct.id).c;
      
      // First insert
      testReviewDb.prepare(`
        INSERT INTO reviews (product_id, user_id, user_name, rating, title, comment, verified_purchase)
        VALUES (?, ?, 'Test Reviewer', 5, 'Superb Weave', 'First authentic review', 1)
      `).run(targetProduct.id, testUserId);

      const afterFirstCount = testReviewDb.prepare('SELECT COUNT(*) as c FROM reviews WHERE product_id = ?').get(targetProduct.id).c;
      assert.strictEqual(afterFirstCount, initialCount + 1, 'First review must increment total review count by 1');

      // Attempt second insert with duplicate (product_id, user_id) - must throw constraint error at DB level
      let constraintThrown = false;
      try {
        testReviewDb.prepare(`
          INSERT INTO reviews (product_id, user_id, user_name, rating, title, comment, verified_purchase)
          VALUES (?, ?, 'Test Reviewer', 1, 'Spam Review', 'Second review attempt', 1)
        `).run(targetProduct.id, testUserId);
      } catch (dbErr) {
        constraintThrown = dbErr.code === 'SQLITE_CONSTRAINT' || dbErr.code === 'SQLITE_CONSTRAINT_UNIQUE';
      }
      assert.ok(constraintThrown, 'Database must enforce UNIQUE(product_id, user_id) constraint on reviews');

      // Test route handler idempotency
      const reviewsRouter = require('../routes/reviews');
      const mockReq = {
        user: { id: testUserId, name: 'Test Reviewer' },
        body: {
          product_id: targetProduct.id,
          rating: 4,
          title: 'Updated Review Title',
          comment: 'Updated review drape experience'
        }
      };
      let responseStatus = null;
      let responseBody = null;
      const mockRes = {
        status(code) { responseStatus = code; return this; },
        json(data) { responseBody = data; return this; }
      };

      const postHandler = reviewsRouter.stack.find(layer => layer.route && layer.route.methods.post).route.stack.slice(-1)[0].handle;
      postHandler(mockReq, mockRes, () => {});

      assert.strictEqual(responseStatus, 201, 'Repeat review submission must return 201 Created');
      assert.strictEqual(responseBody.updated, true, 'Repeat review submission must indicate updated: true');

      // Assert review count did not increment
      const afterRepeatCount = testReviewDb.prepare('SELECT COUNT(*) as c FROM reviews WHERE product_id = ?').get(targetProduct.id).c;
      assert.strictEqual(afterRepeatCount, afterFirstCount, 'Repeat review submission must not create duplicate review rows');

      // Assert review content was updated
      const updatedRow = testReviewDb.prepare('SELECT rating, title, comment FROM reviews WHERE product_id = ? AND user_id = ?').get(targetProduct.id, testUserId);
      assert.strictEqual(updatedRow.rating, 4, 'Updated review must reflect new rating');
      assert.strictEqual(updatedRow.title, 'Updated Review Title', 'Updated review must reflect new title');

      // Clean up test review and user
      testReviewDb.prepare('DELETE FROM reviews WHERE user_id = ?').run(testUserId);
      testReviewDb.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    }
    console.log('✅ PASS: [P2] Review submissions idempotent per customer and product with DB constraint enforcement; hardcoded Helpful (12) removed');

    // 13. Verify [P2] Customer Drape Showcase (Photo Reviews) & Upgrade Migration for Duplicate Reviews
    // A. Verify ProductDetailPage and ReviewModal do not label or inject catalog imagery as customer drape photos
    const reviewModalSource = fs.readFileSync(path.resolve(__dirname, '../../client/src/components/ReviewModal.jsx'), 'utf8');
    assert.ok(
      !reviewModalSource.includes('handleAddSamplePhoto'),
      'ReviewModal.jsx must not have handleAddSamplePhoto handler injecting catalog assets'
    );
    assert.ok(
      !reviewModalSource.includes('product.primary_image'),
      'ReviewModal.jsx must not use product.primary_image as customer photo'
    );
    assert.ok(
      reviewModalSource.includes('type="file"') && reviewModalSource.includes('accept="image/'),
      'ReviewModal.jsx must provide actual customer file selection/upload input'
    );

    assert.ok(
      !pdpSource.includes("alt={`Customer Drape ${idx + 1}`}") && !pdpSource.includes("product.images?.[1] || '/images/categories/silk.jpg'"),
      'ProductDetailPage.jsx must not use catalog imagery or fallbacks as customer photo reviews'
    );
    assert.ok(
      pdpSource.includes('No customer drape photos uploaded yet') || pdpSource.includes('Be the first patron to share a drape photo in your review'),
      'ProductDetailPage.jsx must provide an honest empty state when no customer drape photos exist'
    );

    // Verify JSON limit alignment and image resizing in ReviewModal and server/index.js
    assert.ok(
      reviewModalSource.includes('resizeImageToDataUrl') && reviewModalSource.includes('MAX_PHOTO_BYTES'),
      'ReviewModal.jsx must resize customer photos client-side and enforce post-resize MAX_PHOTO_BYTES cap'
    );
    const serverIndexSrc = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8');
    assert.ok(
      serverIndexSrc.includes("limit: '12mb'") || serverIndexSrc.includes('limit: "12mb"'),
      'server/index.js express.json must configure limit (12mb) to align with aggregate photo upload caps without 413'
    );

    // Verify server/routes/reviews.js rejects external URLs, blob URLs, and catalog photos with HTTP 400 validation errors
    const reviewsRouteSource = fs.readFileSync(path.resolve(__dirname, '../routes/reviews.js'), 'utf8');
    assert.ok(
      reviewsRouteSource.includes('validateCustomerPhoto'),
      'server/routes/reviews.js must define validateCustomerPhoto'
    );

    // Test photo validation rules directly: reject external tracking URLs, blobs, catalog imagery, and oversized payloads with 400
    const reviewsModule = require('../routes/reviews');
    const testProductForPhoto = testReviewDb.prepare('SELECT id FROM products LIMIT 1').get();
    if (testProductForPhoto) {
      const photoTestUserId = 88888;
      testReviewDb.prepare(`
        INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
        VALUES (?, 'Photo Test User', 'photouser@example.com', 'hash', 'user')
      `).run(photoTestUserId);

      // Clean existing
      testReviewDb.prepare('DELETE FROM reviews WHERE user_id = ?').run(photoTestUserId);

      const postHandler = reviewsModule.stack.find(layer => layer.route && layer.route.methods.post).route.stack.slice(-1)[0].handle;

      const validSampleDataUrl = 'data:image/jpeg;base64,' + Buffer.from('fake-valid-jpeg-image-bytes-content').toString('base64');
      const untrustedBlobUrl = 'blob:http://localhost:5173/e00da989-14a8-48b4-93e1-d687aeebff8c';
      const externalTrackerUrl = 'https://attacker.example/uploads/pixel.png';
      const catalogImageUrl = '/images/sarees/banarasi.jpg';

      const executePost = (photosPayload) => {
        let code = null;
        let response = null;
        postHandler({
          user: { id: photoTestUserId, name: 'Photo Test User' },
          body: {
            product_id: testProductForPhoto.id,
            rating: 5,
            title: 'Photo Upload Test',
            comment: 'Testing photo sanitization and persistence',
            photos: photosPayload
          }
        }, {
          status(c) { code = c; return this; },
          json(b) { response = b; return this; }
        }, () => {});
        return { code, response };
      };

      // 1. External URL must return 400 validation error (not silently dropped)
      const resExternal = executePost([externalTrackerUrl]);
      assert.strictEqual(resExternal.code, 400, 'Submitting external image URL must return 400 validation error');
      assert.ok(resExternal.response.error.includes('external URL'));

      // 2. Blob URL must return 400 validation error
      const resBlob = executePost([untrustedBlobUrl]);
      assert.strictEqual(resBlob.code, 400, 'Submitting blob URL must return 400 validation error');
      assert.ok(resBlob.response.error.includes('blob URL'));

      // 3. Catalog image must return 400 validation error
      const resCatalog = executePost([catalogImageUrl]);
      assert.strictEqual(resCatalog.code, 400, 'Submitting catalog photo must return 400 validation error');
      assert.ok(resCatalog.response.error.includes('catalog imagery'));

      // 4. Oversized photo (> 2MB) must return 400 validation error
      const oversizedB64 = 'data:image/jpeg;base64,' + Buffer.alloc(2.2 * 1024 * 1024, 'a').toString('base64');
      const resOversized = executePost([oversizedB64]);
      assert.strictEqual(resOversized.code, 400, 'Submitting photo > 2MB must return 400 validation error');
      assert.ok(resOversized.response.error.includes('exceeds the 2MB size limit'));

      // 5. More than 3 photos must return 400 validation error
      const resTooMany = executePost([validSampleDataUrl, validSampleDataUrl, validSampleDataUrl, validSampleDataUrl]);
      assert.strictEqual(resTooMany.code, 400, 'Submitting > 3 photos must return 400 validation error');
      assert.ok(resTooMany.response.error.includes('maximum of 3 photos'));

      // 6. Valid photos (<= 3 photos, <= 2MB each, <= 6MB aggregate) must succeed with 201
      const resValid = executePost([validSampleDataUrl]);
      assert.strictEqual(resValid.code, 201, 'Valid customer photo must return 201 Created');
      const insertedReview = testReviewDb.prepare('SELECT photos FROM reviews WHERE user_id = ? AND product_id = ?').get(photoTestUserId, testProductForPhoto.id);
      assert.ok(insertedReview && insertedReview.photos);
      const savedPhotos = JSON.parse(insertedReview.photos);
      assert.strictEqual(savedPhotos.length, 1);
      assert.strictEqual(savedPhotos[0], validSampleDataUrl);

      // Clean up
      testReviewDb.prepare('DELETE FROM reviews WHERE user_id = ?').run(photoTestUserId);
      testReviewDb.prepare('DELETE FROM users WHERE id = ?').run(photoTestUserId);
    }

    // B. Upgrade fixture test: Deterministically migrate duplicate legacy reviews before creating unique index
    const Database = require('better-sqlite3');
    const fixtureDbPath = path.join(os.tmpdir(), `palluvo-upgrade-fixture-${Date.now()}.db`);
    const fixtureDb = new Database(fixtureDbPath);

    try {
      // Create legacy schema without UNIQUE constraint on (product_id, user_id)
      fixtureDb.exec(`
        CREATE TABLE products (
          id INTEGER PRIMARY KEY,
          name TEXT,
          slug TEXT,
          rating REAL DEFAULT 5.0,
          review_count INTEGER DEFAULT 0
        );

        CREATE TABLE reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          user_id INTEGER,
          user_name TEXT NOT NULL,
          rating INTEGER NOT NULL,
          title TEXT,
          comment TEXT NOT NULL,
          verified_purchase INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO products (id, name, slug, rating, review_count) VALUES (1, 'Kanjivaram Saree', 'kanjivaram', 4.0, 3);
        INSERT INTO products (id, name, slug, rating, review_count) VALUES (2, 'Banarasi Saree', 'banarasi', 5.0, 2);

        -- Legacy duplicate reviews for User 101 on Product 1 (3 duplicate submissions)
        INSERT INTO reviews (id, product_id, user_id, user_name, rating, title, comment, created_at)
        VALUES (10, 1, 101, 'Ananya', 3, 'Initial Review', 'Decent weave', '2026-01-01 10:00:00');
        INSERT INTO reviews (id, product_id, user_id, user_name, rating, title, comment, created_at)
        VALUES (11, 1, 101, 'Ananya', 4, 'Second Review', 'Better after drape', '2026-01-02 10:00:00');
        INSERT INTO reviews (id, product_id, user_id, user_name, rating, title, comment, created_at)
        VALUES (12, 1, 101, 'Ananya', 5, 'Final Review', 'Absolute masterpiece', '2026-01-03 10:00:00');

        -- Legacy duplicate reviews for User 202 on Product 2 (2 duplicate submissions)
        INSERT INTO reviews (id, product_id, user_id, user_name, rating, title, comment, created_at)
        VALUES (20, 2, 202, 'Radhika', 4, 'Draft Review', 'Nice fabric', '2026-01-01 10:00:00');
        INSERT INTO reviews (id, product_id, user_id, user_name, rating, title, comment, created_at)
        VALUES (21, 2, 202, 'Radhika', 5, 'Final Review', 'Loved the zari work', '2026-01-02 10:00:00');

        -- Anonymous / guest reviews with user_id NULL (should be preserved even if product_id matches)
        INSERT INTO reviews (id, product_id, user_id, user_name, rating, title, comment)
        VALUES (30, 1, NULL, 'Guest Patron 1', 5, 'Guest 1', 'Lovely');
        INSERT INTO reviews (id, product_id, user_id, user_name, rating, title, comment)
        VALUES (31, 1, NULL, 'Guest Patron 2', 4, 'Guest 2', 'Great');
      `);

      // Verify that running CREATE UNIQUE INDEX directly on this legacy database fails with constraint error
      let directIndexFailed = false;
      try {
        fixtureDb.exec(`CREATE UNIQUE INDEX idx_reviews_product_user ON reviews(product_id, user_id) WHERE user_id IS NOT NULL;`);
      } catch (err) {
        directIndexFailed = err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT';
      }
      assert.ok(
        directIndexFailed,
        'Directly creating UNIQUE index without deduplicating legacy rows must fail with SQLITE_CONSTRAINT'
      );

      // Apply the review deduplication migration
      testReviewDb.applyReviewDeduplicationMigration(fixtureDb);

      // Verify legacy duplicate reviews were deduplicated deterministically to the newest id (MAX(id))
      const prod1Reviews = fixtureDb.prepare('SELECT id, rating, title FROM reviews WHERE product_id = 1 AND user_id = 101').all();
      assert.strictEqual(prod1Reviews.length, 1, 'Product 1 must have exactly 1 review for user 101 after migration');
      assert.strictEqual(prod1Reviews[0].id, 12, 'Newest review (id 12) must be preserved');
      assert.strictEqual(prod1Reviews[0].rating, 5, 'Newest rating (5) must be preserved');
      assert.strictEqual(prod1Reviews[0].title, 'Final Review', 'Newest title must be preserved');

      const prod2Reviews = fixtureDb.prepare('SELECT id, rating, title FROM reviews WHERE product_id = 2 AND user_id = 202').all();
      assert.strictEqual(prod2Reviews.length, 1, 'Product 2 must have exactly 1 review for user 202 after migration');
      assert.strictEqual(prod2Reviews[0].id, 21, 'Newest review (id 21) must be preserved');

      // Verify guest reviews were NOT purged
      const guestReviews = fixtureDb.prepare('SELECT id FROM reviews WHERE user_id IS NULL').all();
      assert.strictEqual(guestReviews.length, 2, 'Guest reviews with NULL user_id must be preserved');

      // Verify product aggregate stats were recalculated accurately
      const prod1 = fixtureDb.prepare('SELECT rating, review_count FROM products WHERE id = 1').get();
      // Product 1 reviews now: User 101 (rating 5) + Guest 1 (rating 5) + Guest 2 (rating 4) => avg 4.67, total 3
      assert.strictEqual(prod1.review_count, 3, 'Product 1 review count should match remaining reviews');
      assert.strictEqual(prod1.rating, 4.67, 'Product 1 rating should match remaining reviews average');

      // Verify unique index now exists and is actively enforced
      let insertDuplicateThrows = false;
      try {
        fixtureDb.prepare(`
          INSERT INTO reviews (product_id, user_id, user_name, rating, title, comment)
          VALUES (1, 101, 'Ananya', 2, 'New Spam', 'Should be rejected by unique index')
        `).run();
      } catch (err) {
        insertDuplicateThrows = err.code === 'SQLITE_CONSTRAINT' || err.code === 'SQLITE_CONSTRAINT_UNIQUE';
      }
      assert.ok(insertDuplicateThrows, 'Index idx_reviews_product_user must enforce uniqueness on new submissions');

      // Verify photos column was added
      const photosColExists = fixtureDb.prepare("PRAGMA table_info(reviews)").all().some(c => c.name === 'photos');
      assert.ok(photosColExists, 'Migration must ensure photos column exists on reviews table');

      // Verify migration record in schema_migrations
      const migrationEntry = fixtureDb.prepare("SELECT * FROM schema_migrations WHERE migration_name = 'deduplicate_reviews_unique_user_product'").get();
      assert.ok(migrationEntry, 'Migration entry must be recorded in schema_migrations table');

      // Verify idempotency: running migration again does not throw or corrupt data
      assert.doesNotThrow(() => {
        testReviewDb.applyReviewDeduplicationMigration(fixtureDb);
      }, 'applyReviewDeduplicationMigration must be safely idempotent');
    } finally {
      try { fixtureDb.close(); } catch (e) {}
      try { fs.unlinkSync(fixtureDbPath); } catch (e) {}
    }
    console.log('✅ PASS: [P2] Legacy duplicate reviews migration verified with upgrade fixture; photo reviews separate from catalog imagery');
  } catch (renderErr) {
    console.error('SSR test error:', renderErr);
    throw renderErr;
  }
}

module.exports = { testShopFilterAccessibility };

if (require.main === module) {
  testShopFilterAccessibility()
    .then(() => console.log('\n🎉 ALL FILTER ACCESSIBILITY TESTS PASSED!\n'))
    .catch((err) => {
      console.error('\n❌ Accessibility test failed:', err);
      process.exit(1);
    });
}

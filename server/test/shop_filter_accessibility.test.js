const fs = require('fs');
const path = require('path');
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
  // (both 'cleanup_fabricated_courier_awb' and 'cleanup_legacy_default_carrier_no_awb' present)
  // where a Placed or Shipped default-BlueDart/no-AWB row was previously misclassified with carrier_assigned_explicitly = 1.
  // Must execute v3 migration (cleanup_misclassified_timestamp_carrier_defaults) to safely repair the misclassified row
  // by resetting carrier_assigned_explicitly to 0 while PRESERVING the ambiguous courier_partner,
  // and clearing unverified courier_partner only where reliable audit evidence exists (e.g. unpaid checkout reservations).
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
      -- 1. Placed order with default BlueDart and no AWB that was misclassified as carrier_assigned_explicitly = 1
      -- due to the old timestamp heuristic (created_at != updated_at from payment processing).
      -- Ambiguous pre-AWB assignment in Placed status must have carrier_assigned_explicitly reset to 0
      -- while strictly PRESERVING courier_partner = 'BlueDart Luxury Express'!
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-PLACED-FLAGGED', 'Placed', 'Paid', NULL, 'BlueDart Luxury Express', 1, '2026-09-01 10:00:00', '2026-09-01 10:05:00');

      -- 2. Dispatched order with no AWB that was misclassified with carrier_assigned_explicitly = 1.
      -- Genuine admin assignment made in Shipped status while AWB is pending:
      -- Ambiguous pre-AWB assignment in Shipped status must have carrier_assigned_explicitly reset to 0
      -- while strictly PRESERVING courier_partner = 'BlueDart Luxury Express'!
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-SHIPPED-FLAGGED', 'Shipped', 'Paid', NULL, 'BlueDart Luxury Express', 1, '2026-09-01 10:00:00', '2026-09-01 10:05:00');

      -- 3. Unassigned checkout reservation default with no AWB and no explicit carrier assignment:
      -- Reliable audit evidence: Unassigned default on abandoned checkout.
      -- Must have courier_partner cleared to NULL and carrier_assigned_explicitly reset to 0.
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-UNPAID-DEFAULT', 'Placed', 'Pending', NULL, 'BlueDart Luxury Express', 0, '2026-09-01 10:00:00', '2026-09-01 10:00:00');

      -- 4. Pending checkout reservation with explicit carrier assignment made by admin while pending:
      -- Must strictly PRESERVE courier_partner intact!
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-PENDING-EXPLICIT', 'Placed', 'Pending', NULL, 'BlueDart Luxury Express', 1, '2026-09-01 10:00:00', '2026-09-01 10:05:00');

      -- 5. Genuine/ambiguous fulfillment order in Processing without AWB (must be PRESERVED)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-PROCESSING-PRESERVED', 'Processing', 'Paid', NULL, 'BlueDart Luxury Express', 0, '2026-09-01 10:00:00', '2026-09-01 11:30:00');

      -- 6. Genuine custom carrier assignment without AWB (must be PRESERVED with flag = 1)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-CUSTOM-PRESERVED', 'Placed', 'Paid', NULL, 'Delhivery', 1, '2026-09-01 10:00:00', '2026-09-01 10:00:00');

      -- 7. Dispatched order with real AWB and courier (must be PRESERVED with flag = 1)
      INSERT INTO orders (order_number, status, payment_status, tracking_number, courier_partner, carrier_assigned_explicitly, created_at, updated_at)
      VALUES ('PAL-CE-REAL-PRESERVED', 'Shipped', 'Paid', 'BD-REAL-AWB-9988', 'BlueDart Luxury Express', 1, '2026-09-01 10:00:00', '2026-09-01 12:00:00');
    `);

    // Verify pre-conditions: Both v1 and v2 markers exist, v3 marker does not, and misclassified row carries flag 1
    const hasV1 = v2Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_fabricated_courier_awb'").get();
    assert.ok(hasV1, 'Pre-condition: cleanup_fabricated_courier_awb must be present');

    const hasV2 = v2Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_legacy_default_carrier_no_awb'").get();
    assert.ok(hasV2, 'Pre-condition: cleanup_legacy_default_carrier_no_awb must be present');

    const hasV3Pre = v2Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_misclassified_timestamp_carrier_defaults'").get();
    assert.strictEqual(hasV3Pre, undefined, 'Pre-condition: cleanup_misclassified_timestamp_carrier_defaults must not be present initially');

    const preFlagged = v2Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PLACED-FLAGGED'").get();
    assert.strictEqual(preFlagged.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(preFlagged.carrier_assigned_explicitly, 1);

    const preShippedFlagged = v2Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-SHIPPED-FLAGGED'").get();
    assert.strictEqual(preShippedFlagged.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(preShippedFlagged.carrier_assigned_explicitly, 1);

    // Run applyCourierMigrations on the database upgraded by commit ce02ddf
    dbModule.applyCourierMigrations(v2Db);

    // Verify post-conditions:
    // 1. v3 migration marker recorded
    const hasV3Post = v2Db.prepare("SELECT 1 FROM schema_migrations WHERE migration_name = 'cleanup_misclassified_timestamp_carrier_defaults'").get();
    assert.ok(hasV3Post, 'Post-condition: cleanup_misclassified_timestamp_carrier_defaults must be recorded in schema_migrations');

    // 2. Previously misclassified Placed order has carrier_assigned_explicitly reset to 0 while PRESERVING courier_partner
    const postFlagged = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PLACED-FLAGGED'").get();
    assert.strictEqual(postFlagged.courier_partner, 'BlueDart Luxury Express', 'Ambiguous pre-AWB Placed order must have courier_partner preserved');
    assert.strictEqual(postFlagged.status, 'Placed');
    assert.strictEqual(postFlagged.carrier_assigned_explicitly, 0, 'Misclassified Placed order must have carrier_assigned_explicitly reset to 0');

    // 3. Dispatched order without AWB is preserved: carrier kept intact, flag reset to 0
    const postShippedFlagged = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-SHIPPED-FLAGGED'").get();
    assert.strictEqual(postShippedFlagged.courier_partner, 'BlueDart Luxury Express', 'Dispatched order without AWB must have pre-AWB courier preserved');
    assert.strictEqual(postShippedFlagged.status, 'Shipped');
    assert.strictEqual(postShippedFlagged.carrier_assigned_explicitly, 0);

    // 4. Unpaid checkout default has reliable audit evidence: courier cleared to null and flag is 0
    const postUnpaidDefault = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-UNPAID-DEFAULT'").get();
    assert.strictEqual(postUnpaidDefault.courier_partner, null, 'Unpaid checkout default must have courier_partner cleared to null');
    assert.strictEqual(postUnpaidDefault.carrier_assigned_explicitly, 0);

    // 5. Pending reservation with explicit carrier assignment strictly PRESERVES courier_partner and explicit flag
    const postPendingExplicit = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PENDING-EXPLICIT'").get();
    assert.strictEqual(postPendingExplicit.courier_partner, 'BlueDart Luxury Express', 'Explicitly assigned carrier on payment-pending reservation must be preserved');
    assert.strictEqual(postPendingExplicit.carrier_assigned_explicitly, 1, 'Explicit carrier assignment evidence must be preserved on pending reservation');

    // 6. Genuine/ambiguous fulfillment order in Processing is preserved
    const postProcessing = v2Db.prepare("SELECT courier_partner, status, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PROCESSING-PRESERVED'").get();
    assert.strictEqual(postProcessing.courier_partner, 'BlueDart Luxury Express', 'Fulfillment order in Processing must be preserved');
    assert.strictEqual(postProcessing.status, 'Processing');
    assert.strictEqual(postProcessing.carrier_assigned_explicitly, 0);

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
    const postFlaggedRepeat = v2Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PLACED-FLAGGED'").get();
    assert.strictEqual(postFlaggedRepeat.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postFlaggedRepeat.carrier_assigned_explicitly, 0);

    const postShippedRepeat = v2Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-SHIPPED-FLAGGED'").get();
    assert.strictEqual(postShippedRepeat.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postShippedRepeat.carrier_assigned_explicitly, 0);

    const postPendingRepeat = v2Db.prepare("SELECT courier_partner, carrier_assigned_explicitly FROM orders WHERE order_number = 'PAL-CE-PENDING-EXPLICIT'").get();
    assert.strictEqual(postPendingRepeat.courier_partner, 'BlueDart Luxury Express');
    assert.strictEqual(postPendingRepeat.carrier_assigned_explicitly, 1);

    console.log('✅ PASS: [P2] Corrective migration repairs legacy rows misclassified by timestamp heuristic, preserves ambiguous assignments across all statuses (including pending explicit assignments), and clears unassigned checkout defaults');
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

  // 3.11 Public Tracking Endpoint Verification & Unverified Carrier Suppression Regressions
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
      order_number: 'PAL-TRK-PLACED-DEFAULT',
      status: 'Placed',
      payment_status: 'Paid',
      tracking_number: null,
      courier_partner: null,
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

    // 4. Placed order before dispatch
    const resPlaced = await fetch(`http://127.0.0.1:${testPort}/api/orders/track/PAL-TRK-PLACED-DEFAULT`);
    assert.strictEqual(resPlaced.status, 200);
    const dataPlaced = await resPlaced.json();
    assert.strictEqual(dataPlaced.order.courier_partner, null);
    const handedStagePlaced = dataPlaced.order.timeline.find(s => s.stage === 'Handed to Courier Partner');
    assert.strictEqual(handedStagePlaced.description, 'Package will be handed over to courier partner upon packing.');

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

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

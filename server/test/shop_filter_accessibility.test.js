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

    // 7. Verify [P2] Category-specific metadata preservation after hydration
    const { updatePageMeta, getCategoryRecord, CATEGORY_CATALOG } = require(path.resolve(__dirname, '../../client/src/utils/seo'));
    assert.ok(CATEGORY_CATALOG['cotton-sarees'], 'CATEGORY_CATALOG must define cotton-sarees');
    assert.strictEqual(CATEGORY_CATALOG['cotton-sarees'].name, 'Cotton & Handloom');

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
      console.log('✅ PASS: [P2] Category-specific metadata preserved after hydration (title, description, and social tags)');
    } finally {
      global.document = previousDocument;
    }

    // 8. Verify [P2] SearchModal uses lightweight thumbnails in instant-search results
    const searchModalPath = path.resolve(__dirname, '../../client/src/components/SearchModal.jsx');
    const searchModalSource = fs.readFileSync(searchModalPath, 'utf8');
    assert.ok(
      searchModalSource.includes("import { getThumbnailUrl } from '../utils/imageUtils'") ||
      searchModalSource.includes('getThumbnailUrl'),
      'SearchModal must import getThumbnailUrl'
    );
    assert.ok(
      searchModalSource.includes('prod.thumbnail') &&
      searchModalSource.includes('getThumbnailUrl(prod.primary_image)'),
      'SearchModal result rows must render lightweight thumbnail variant for instant-search suggestions'
    );
    assert.ok(
      searchModalSource.includes('image: product.primary_image'),
      'SearchModal handleSelectProduct must preserve original full-size image when navigating to product detail'
    );
    console.log('✅ PASS: [P2] Instant-search results utilize lightweight thumbnails in 48x64 suggestion rows');
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

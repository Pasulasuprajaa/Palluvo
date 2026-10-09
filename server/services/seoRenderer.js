const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://palluvo.com';
const DEFAULT_IMAGE = `${BASE_URL}/images/occasions/wedding_collection.jpg`;
const DEFAULT_TITLE = 'PALLUVO | Luxury Indian Sarees & Fashion — Every drape, a little magic';
const DEFAULT_DESC = 'Discover pure Banarasi, Kanjivaram, Chanderi, and designer silk sarees handwoven for weddings, festivals, and unforgettable occasions.';

let catalogData = null;
function getCatalog() {
  if (!catalogData) {
    try {
      const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');
      if (fs.existsSync(catalogPath)) {
        catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      }
    } catch (e) {
      // Fallback
    }
  }
  return catalogData || { categories: [], products: [] };
}

let db = null;
function getDb() {
  if (db === null) {
    try {
      db = require('../db/database');
    } catch (e) {
      db = false;
    }
  }
  return db || null;
}

function findProductBySlug(slug) {
  if (!slug) return null;
  const database = getDb();
  if (database) {
    try {
      const p = database.prepare(`
        SELECT p.name, p.tagline, p.short_desc, p.description,
               (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_img
        FROM products p
        WHERE p.slug = ?
      `).get(slug);
      if (p) return p;
    } catch (e) {}
  }
  const catalog = getCatalog();
  const found = (catalog.products || []).find(p => p.slug === slug);
  if (found) {
    return {
      name: found.name,
      tagline: found.tagline,
      short_desc: found.short_desc,
      description: found.description,
      primary_img: found.primary_image || (found.images && found.images[0])
    };
  }
  return null;
}

function findCategoryBySlug(slug) {
  if (!slug) return null;
  const database = getDb();
  if (database) {
    try {
      const c = database.prepare('SELECT name, description, image_url FROM categories WHERE slug = ?').get(slug);
      if (c) return c;
    } catch (e) {}
  }
  const catalog = getCatalog();
  const found = (catalog.categories || []).find(c => c.slug === slug);
  if (found) {
    return {
      name: found.name,
      description: found.description,
      image_url: found.image_url
    };
  }
  return null;
}

/**
 * Escapes characters for HTML text content (e.g. inside <title>)
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapes characters for HTML attribute values (e.g. content="...")
 */
function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Validates and sanitizes image and canonical URLs against malicious protocols
 */
function sanitizeUrl(rawUrl, fallback = DEFAULT_IMAGE) {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;
  const trimmed = rawUrl.trim();

  // Allow absolute http/https URLs with safe character sets
  if (/^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]+$/i.test(trimmed)) {
    return trimmed;
  }
  // Allow root-relative paths like /images/sarees/banarasi.jpg
  if (/^\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]*$/i.test(trimmed)) {
    return `${BASE_URL}${trimmed}`;
  }
  return fallback;
}

const KNOWN_STATIC_ROUTES = new Set([
  '/',
  '/index.html',
  '/sarees',
  '/shop',
  '/cart',
  '/checkout',
  '/order-success',
  '/track-order',
  '/account',
  '/wishlist',
  '/offers',
  '/admin',
  '/about',
  '/heritage',
  '/artisans',
  '/care-guide',
  '/sustainability',
  '/privacy',
  '/terms',
  '/shipping',
  '/refund',
  '/policy',
  '/policies'
]);

function getMetaForRoute(urlPath, query = {}) {
  const cleanPath = (urlPath || '/').split('?')[0];
  let pathname = (cleanPath || '/').toLowerCase().replace(/\/$/, '') || '/';
  if (pathname === '/index.html') pathname = '/';

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESC;
  let canonicalUrl = `${BASE_URL}${pathname === '/' ? '' : pathname}`;
  let imageUrl = DEFAULT_IMAGE;
  let imageAlt = 'PALLUVO Luxury Indian Handloom Sarees Collection';
  let isNotFound = false;
  let isNoIndex = false;

  // Check category query parameter or category path (e.g. /sarees?category=slug, /sarees/category/slug, /category/slug)
  const categorySlug = query.category || (
    pathname.startsWith('/sarees/category/') ? pathname.split('/')[3] :
    (pathname.startsWith('/category/') ? pathname.split('/')[2] : null)
  );

  if (pathname === '/') {
    title = DEFAULT_TITLE;
    description = DEFAULT_DESC;
    canonicalUrl = `${BASE_URL}/`;
  } else if (categorySlug && (pathname === '/sarees' || pathname === '/shop' || pathname.startsWith('/sarees/category/') || pathname.startsWith('/category/'))) {
    const category = findCategoryBySlug(categorySlug);
    if (category) {
      title = `${category.name} Collection | PALLUVO`;
      description = category.description || `Explore authentic ${category.name} handcrafted by master weavers across India.`;
      canonicalUrl = `${BASE_URL}/sarees?category=${encodeURIComponent(categorySlug)}`;
      imageUrl = sanitizeUrl(category.image_url, DEFAULT_IMAGE);
      imageAlt = `${category.name} - Luxury Handloom Sarees | PALLUVO`;
    } else {
      isNotFound = true;
    }
  } else if ((pathname.startsWith('/sarees/') && !pathname.startsWith('/sarees/category/')) || pathname.startsWith('/product/')) {
    const rawSlug = pathname.split('/')[2];
    const slug = rawSlug ? decodeURIComponent(rawSlug) : '';
    const product = findProductBySlug(slug);
    if (product) {
      title = `${product.name} | PALLUVO`;
      description = product.short_desc || product.tagline || product.description?.slice(0, 160) || DEFAULT_DESC;
      canonicalUrl = `${BASE_URL}/sarees/${encodeURIComponent(slug)}`;
      imageUrl = sanitizeUrl(product.primary_img, DEFAULT_IMAGE);
      imageAlt = `${product.name} - Luxury Handcrafted Indian Saree | PALLUVO`;
    } else {
      isNotFound = true;
    }
  } else if (pathname === '/sarees' || pathname === '/shop') {
    title = 'Curated Luxury Sarees Collection | PALLUVO';
    description = 'Browse pure Banarasi, Kanjivaram, Organza, and Mulberry silk sarees with bespoke craftsmanship.';
    canonicalUrl = `${BASE_URL}/sarees`;
  } else if (pathname === '/cart') {
    title = 'Shopping Bag | PALLUVO';
    description = 'Review your curated luxury saree selections in your PALLUVO bag.';
    canonicalUrl = `${BASE_URL}/cart`;
    isNoIndex = true;
  } else if (pathname === '/checkout') {
    title = 'Secure Checkout | PALLUVO';
    description = 'Complete your order with secure payment options and express insured shipping.';
    canonicalUrl = `${BASE_URL}/checkout`;
    isNoIndex = true;
  } else if (pathname === '/order-success') {
    title = 'Order Confirmed | PALLUVO';
    description = 'Thank you for your order with PALLUVO. Your heirloom drape is being prepared.';
    canonicalUrl = `${BASE_URL}/order-success`;
    isNoIndex = true;
  } else if (pathname === '/account') {
    title = 'Customer Account | PALLUVO';
    description = 'Manage your PALLUVO profile, order history, and saved addresses.';
    canonicalUrl = `${BASE_URL}/account`;
    isNoIndex = true;
  } else if (pathname === '/wishlist') {
    title = 'My Wishlist | PALLUVO';
    description = 'Your curated wishlist of luxury handloom sarees and festive drapes.';
    canonicalUrl = `${BASE_URL}/wishlist`;
    isNoIndex = true;
  } else if (pathname === '/offers') {
    title = 'Festive Offers & Exclusive Curations | PALLUVO';
    description = 'Explore special bridal and festive curation savings on authentic Indian heirlooms.';
    canonicalUrl = `${BASE_URL}/offers`;
  } else if (pathname === '/track-order') {
    title = 'Track Your Order | PALLUVO';
    description = 'Live milestone tracking for your handcrafted PALLUVO saree shipment.';
    canonicalUrl = `${BASE_URL}/track-order`;
    isNoIndex = true;
  } else if (pathname === '/admin') {
    title = 'Admin Management Console | PALLUVO';
    description = 'PALLUVO administration portal for orders, inventory, and fulfillment.';
    canonicalUrl = `${BASE_URL}/admin`;
    isNoIndex = true;
  } else if (['/about', '/heritage', '/artisans', '/care-guide', '/sustainability'].includes(pathname)) {
    title = 'About PALLUVO | Handloom Heritage & Master Artisans';
    description = 'Discover the legacy of Indian handlooms, sustainable silk pledges, and our artisan clusters.';
    canonicalUrl = `${BASE_URL}/about`;
  } else if (['/privacy', '/terms', '/shipping', '/refund', '/policy', '/policies'].includes(pathname)) {
    title = 'Customer Policies, Shipping & Returns | PALLUVO';
    description = 'Learn about PALLUVO’s transparent 7-day returns, insured delivery, and privacy commitments.';
    canonicalUrl = `${BASE_URL}${pathname}`;
  } else {
    isNotFound = true;
  }

  if (isNotFound) {
    title = 'Page Not Found | PALLUVO Luxury Sarees';
    description = 'The requested luxury drape, collection, or boutique page could not be found.';
    canonicalUrl = `${BASE_URL}/404`;
    isNoIndex = true;
  }

  return { title, description, canonicalUrl, imageUrl, imageAlt, isNotFound, isNoIndex };
}

function injectMetaTags(html, meta) {
  let modified = html;

  const escapedTitle = escapeHtml(meta.title);
  const escapedAttrTitle = escapeAttr(meta.title);
  const escapedAttrDesc = escapeAttr(meta.description);
  const escapedAttrCanonical = escapeAttr(meta.canonicalUrl);
  const escapedAttrImage = escapeAttr(meta.imageUrl);
  const escapedAttrImageAlt = escapeAttr(meta.imageAlt);

  // Replace <title>
  modified = modified.replace(/<title>.*?<\/title>/is, `<title>${escapedTitle}</title>`);

  // Replace meta name="title"
  modified = modified.replace(/<meta\s+name="title"\s+content=".*?"\s*\/?>/is, `<meta name="title" content="${escapedAttrTitle}" />`);

  // Replace meta name="description"
  modified = modified.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/is, `<meta name="description" content="${escapedAttrDesc}" />`);

  // Open Graph
  modified = modified.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is, `<meta property="og:title" content="${escapedAttrTitle}" />`);
  modified = modified.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is, `<meta property="og:description" content="${escapedAttrDesc}" />`);
  modified = modified.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is, `<meta property="og:url" content="${escapedAttrCanonical}" />`);
  modified = modified.replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/is, `<meta property="og:image" content="${escapedAttrImage}" />`);
  modified = modified.replace(/<meta\s+property="og:image:alt"\s+content=".*?"\s*\/?>/is, `<meta property="og:image:alt" content="${escapedAttrImageAlt}" />`);

  // Strip hardcoded og:image:width and og:image:height so crawlers detect true image dimensions
  modified = modified.replace(/<meta\s+property="og:image:width"\s+content=".*?"\s*\/?>\s*/is, '');
  modified = modified.replace(/<meta\s+property="og:image:height"\s+content=".*?"\s*\/?>\s*/is, '');

  // Twitter
  modified = modified.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:title" content="${escapedAttrTitle}" />`);
  modified = modified.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:description" content="${escapedAttrDesc}" />`);
  modified = modified.replace(/<meta\s+name="twitter:url"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:url" content="${escapedAttrCanonical}" />`);
  modified = modified.replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:image" content="${escapedAttrImage}" />`);
  modified = modified.replace(/<meta\s+name="twitter:image:alt"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:image:alt" content="${escapedAttrImageAlt}" />`);

  // Canonical link
  if (modified.includes('<link rel="canonical"')) {
    modified = modified.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is, `<link rel="canonical" href="${escapedAttrCanonical}" />`);
  } else {
    modified = modified.replace('</head>', `  <link rel="canonical" href="${escapedAttrCanonical}" />\n  </head>`);
  }

  // Robots meta tag
  const isNoIndex = meta.isNotFound || meta.isNoIndex;
  if (modified.includes('<meta name="robots"')) {
    modified = modified.replace(/<meta\s+name="robots"\s+content=".*?"\s*\/?>/is, `<meta name="robots" content="${isNoIndex ? 'noindex, nofollow' : 'index, follow'}" />`);
  } else if (isNoIndex) {
    modified = modified.replace('</head>', '  <meta name="robots" content="noindex, nofollow" />\n  </head>');
  }

  return modified;
}

module.exports = {
  getMetaForRoute,
  injectMetaTags,
  escapeHtml,
  escapeAttr,
  sanitizeUrl
};

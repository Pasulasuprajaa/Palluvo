const fs = require('fs');
const path = require('path');
const db = require('../db/database');

const BASE_URL = 'https://palluvo.com';
const DEFAULT_IMAGE = `${BASE_URL}/images/occasions/wedding_collection.jpg`;
const DEFAULT_TITLE = 'PALLUVO | Luxury Indian Sarees & Fashion — Every drape, a little magic';
const DEFAULT_DESC = 'Discover pure Banarasi, Kanjivaram, Chanderi, and designer silk sarees handwoven for weddings, festivals, and unforgettable occasions.';

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

  if (pathname === '/') {
    title = DEFAULT_TITLE;
    description = DEFAULT_DESC;
    canonicalUrl = `${BASE_URL}/`;
  } else if (pathname.startsWith('/sarees/') || pathname.startsWith('/product/')) {
    const rawSlug = pathname.split('/')[2];
    const slug = rawSlug ? decodeURIComponent(rawSlug) : '';
    if (!slug) {
      isNotFound = true;
    } else {
      try {
        const product = db.prepare(`
          SELECT p.name, p.tagline, p.short_desc, p.description,
                 (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_img
          FROM products p
          WHERE p.slug = ?
        `).get(slug);

        if (product) {
          title = `${product.name} | PALLUVO`;
          description = product.short_desc || product.tagline || product.description?.slice(0, 160) || DEFAULT_DESC;
          canonicalUrl = `${BASE_URL}/sarees/${encodeURIComponent(slug)}`;
          imageUrl = sanitizeUrl(product.primary_img, DEFAULT_IMAGE);
          imageAlt = `${product.name} - Luxury Handcrafted Indian Saree | PALLUVO`;
        } else {
          isNotFound = true;
        }
      } catch (err) {
        console.error('SEO DB product lookup error:', err);
        isNotFound = true;
      }
    }
  } else if (pathname === '/sarees' || pathname === '/shop') {
    const categorySlug = query.category;
    if (categorySlug) {
      try {
        const category = db.prepare('SELECT name, description, image_url FROM categories WHERE slug = ?').get(categorySlug);
        if (category) {
          title = `${category.name} Collection | PALLUVO`;
          description = category.description || `Explore authentic ${category.name} handcrafted by master weavers across India.`;
          canonicalUrl = `${BASE_URL}/sarees?category=${encodeURIComponent(categorySlug)}`;
          imageUrl = sanitizeUrl(category.image_url, DEFAULT_IMAGE);
          imageAlt = `${category.name} Saree Collection`;
        } else {
          isNotFound = true;
        }
      } catch (err) {
        console.error('SEO DB category lookup error:', err);
        isNotFound = true;
      }
    } else {
      title = 'Curated Luxury Sarees Collection | PALLUVO';
      description = 'Browse pure Banarasi, Kanjivaram, Organza, and Mulberry silk sarees with bespoke craftsmanship.';
      canonicalUrl = `${BASE_URL}/sarees`;
    }
  } else if (pathname === '/cart') {
    title = 'Shopping Bag | PALLUVO';
    description = 'Review your curated luxury saree selections in your PALLUVO bag.';
    canonicalUrl = `${BASE_URL}/cart`;
  } else if (pathname === '/checkout') {
    title = 'Secure Checkout | PALLUVO';
    description = 'Complete your order with secure payment options and express insured shipping.';
    canonicalUrl = `${BASE_URL}/checkout`;
  } else if (pathname === '/order-success') {
    title = 'Order Confirmed | PALLUVO';
    description = 'Thank you for your order with PALLUVO. Your heirloom drape is being prepared.';
    canonicalUrl = `${BASE_URL}/order-success`;
  } else if (pathname === '/account') {
    title = 'Customer Account | PALLUVO';
    description = 'Manage your PALLUVO profile, order history, and saved addresses.';
    canonicalUrl = `${BASE_URL}/account`;
  } else if (pathname === '/wishlist') {
    title = 'My Wishlist | PALLUVO';
    description = 'Your curated wishlist of luxury handloom sarees and festive drapes.';
    canonicalUrl = `${BASE_URL}/wishlist`;
  } else if (pathname === '/offers') {
    title = 'Festive Offers & Exclusive Curations | PALLUVO';
    description = 'Explore special bridal and festive curation savings on authentic Indian heirlooms.';
    canonicalUrl = `${BASE_URL}/offers`;
  } else if (pathname === '/track-order') {
    title = 'Track Your Order | PALLUVO';
    description = 'Live milestone tracking for your handcrafted PALLUVO saree shipment.';
    canonicalUrl = `${BASE_URL}/track-order`;
  } else if (pathname === '/admin') {
    title = 'Admin Management Console | PALLUVO';
    description = 'PALLUVO administration portal for orders, inventory, and fulfillment.';
    canonicalUrl = `${BASE_URL}/admin`;
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
  }

  return { title, description, canonicalUrl, imageUrl, imageAlt, isNotFound };
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

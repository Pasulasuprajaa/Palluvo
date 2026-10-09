const fs = require('fs');
const path = require('path');
const db = require('../db/database');

const BASE_URL = 'https://palluvo.com';
const DEFAULT_IMAGE = `${BASE_URL}/images/occasions/wedding_collection.jpg`;
const DEFAULT_TITLE = 'PALLUVO | Luxury Indian Sarees & Fashion — Every drape, a little magic';
const DEFAULT_DESC = 'Discover pure Banarasi, Kanjivaram, Chanderi, and designer silk sarees handwoven for weddings, festivals, and unforgettable occasions.';

function getMetaForRoute(urlPath, query = {}) {
  const pathname = urlPath.toLowerCase().replace(/\/$/, '') || '/';
  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESC;
  let canonicalUrl = `${BASE_URL}${pathname}`;
  let imageUrl = DEFAULT_IMAGE;
  let imageAlt = 'PALLUVO Luxury Indian Handloom Sarees Collection';

  if (pathname.startsWith('/sarees/') || pathname.startsWith('/product/')) {
    const slug = pathname.split('/')[2];
    if (slug) {
      try {
        const product = db.prepare('SELECT name, subtitle, description, image_url FROM products WHERE slug = ?').get(slug);
        if (product) {
          title = `${product.name} | PALLUVO Luxury Sarees`;
          description = product.subtitle || product.description?.slice(0, 160) || DEFAULT_DESC;
          canonicalUrl = `${BASE_URL}/sarees/${slug}`;
          if (product.image_url) {
            imageUrl = product.image_url.startsWith('http') ? product.image_url : `${BASE_URL}${product.image_url}`;
          }
          imageAlt = `${product.name} Handwoven Saree`;
        }
      } catch (err) {
        console.error('SEO DB product lookup error:', err);
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
          if (category.image_url) {
            imageUrl = category.image_url.startsWith('http') ? category.image_url : `${BASE_URL}${category.image_url}`;
          }
          imageAlt = `${category.name} Saree Collection`;
        }
      } catch (err) {
        console.error('SEO DB category lookup error:', err);
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
  } else if (pathname === '/about' || pathname === '/heritage' || pathname === '/artisans' || pathname === '/care-guide' || pathname === '/sustainability') {
    title = 'About PALLUVO | Handloom Heritage & Master Artisans';
    description = 'Discover the legacy of Indian handlooms, sustainable silk pledges, and our artisan clusters.';
    canonicalUrl = `${BASE_URL}/about`;
  } else if (['/privacy', '/terms', '/shipping', '/refund', '/policy', '/policies'].includes(pathname)) {
    title = 'Customer Policies, Shipping & Returns | PALLUVO';
    description = 'Learn about PALLUVO’s transparent 7-day returns, insured delivery, and privacy commitments.';
    canonicalUrl = `${BASE_URL}${pathname}`;
  } else if (pathname === '/offers') {
    title = 'Festive Offers & Exclusive Curations | PALLUVO';
    description = 'Explore special bridal and festive curation savings on authentic Indian heirlooms.';
    canonicalUrl = `${BASE_URL}/offers`;
  } else if (pathname === '/track-order') {
    title = 'Track Your Order | PALLUVO';
    description = 'Live milestone tracking for your handcrafted PALLUVO saree shipment.';
    canonicalUrl = `${BASE_URL}/track-order`;
  }

  return { title, description, canonicalUrl, imageUrl, imageAlt };
}

function injectMetaTags(html, meta) {
  let modified = html;

  // Replace title
  modified = modified.replace(/<title>.*?<\/title>/is, `<title>${meta.title}</title>`);

  // Replace meta name="title"
  modified = modified.replace(/<meta\s+name="title"\s+content=".*?"\s*\/?>/is, `<meta name="title" content="${meta.title}" />`);

  // Replace meta name="description"
  modified = modified.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/is, `<meta name="description" content="${meta.description}" />`);

  // Open Graph
  modified = modified.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is, `<meta property="og:title" content="${meta.title}" />`);
  modified = modified.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is, `<meta property="og:description" content="${meta.description}" />`);
  modified = modified.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is, `<meta property="og:url" content="${meta.canonicalUrl}" />`);
  modified = modified.replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/is, `<meta property="og:image" content="${meta.imageUrl}" />`);
  modified = modified.replace(/<meta\s+property="og:image:alt"\s+content=".*?"\s*\/?>/is, `<meta property="og:image:alt" content="${meta.imageAlt}" />`);

  // Twitter
  modified = modified.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:title" content="${meta.title}" />`);
  modified = modified.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:description" content="${meta.description}" />`);
  modified = modified.replace(/<meta\s+name="twitter:url"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:url" content="${meta.canonicalUrl}" />`);
  modified = modified.replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:image" content="${meta.imageUrl}" />`);
  modified = modified.replace(/<meta\s+name="twitter:image:alt"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:image:alt" content="${meta.imageAlt}" />`);

  // Canonical link
  if (modified.includes('<link rel="canonical"')) {
    modified = modified.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is, `<link rel="canonical" href="${meta.canonicalUrl}" />`);
  } else {
    modified = modified.replace('</head>', `  <link rel="canonical" href="${meta.canonicalUrl}" />\n  </head>`);
  }

  return modified;
}

module.exports = {
  getMetaForRoute,
  injectMetaTags
};

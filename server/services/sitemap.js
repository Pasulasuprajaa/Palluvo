const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://palluvo.com';

// Canonical, indexable static routes (excluding private noindex routes: /cart, /checkout, /order-success, /track-order, /account, /wishlist, /admin, and non-canonical /shop)
const CANONICAL_STATIC_ROUTES = [
  '/',
  '/sarees',
  '/offers',
  '/about',
  '/heritage',
  '/artisans',
  '/care-guide',
  '/sustainability',
  '/privacy',
  '/terms',
  '/shipping',
  '/refund',
  '/policy'
];

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

/**
 * Returns canonical, indexable routes for sitemap generation.
 * - Drops private/noindex pages (/cart, /checkout, /order-success, /track-order, /account, /wishlist, /admin)
 * - Keeps /sarees rather than non-canonical alias /shop
 * - Keeps single canonical category form: /sarees?category=<slug>
 * - Keeps single canonical product form: /sarees/<slug>
 */
function getCanonicalCatalogRoutes(catalog) {
  const routes = [];

  // 1. Static routes (13 canonical routes)
  for (const route of CANONICAL_STATIC_ROUTES) {
    routes.push({
      path: route,
      loc: route === '/' ? `${BASE_URL}/` : `${BASE_URL}${route}`,
      priority: route === '/' ? '1.0' : (route === '/sarees' ? '0.9' : '0.6'),
      changefreq: route === '/' ? 'daily' : (route === '/sarees' ? 'daily' : 'monthly'),
      lastmod: null
    });
  }

  // 2. Canonical category routes (1 per category: /sarees?category=<slug>)
  const categories = catalog?.categories || [];
  for (const cat of categories) {
    routes.push({
      path: `/sarees?category=${cat.slug}`,
      loc: `${BASE_URL}/sarees?category=${encodeURIComponent(cat.slug)}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: null
    });
  }

  // 3. Canonical product routes (1 per product: /sarees/<slug>)
  const products = catalog?.products || [];
  const database = getDb();
  let productDates = new Map();

  if (database) {
    try {
      const rows = database.prepare('SELECT slug, updated_at FROM products WHERE updated_at IS NOT NULL').all();
      for (const row of rows) {
        if (row.slug && row.updated_at) {
          try {
            const dateStr = new Date(row.updated_at).toISOString().split('T')[0];
            productDates.set(row.slug, dateStr);
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  for (const prod of products) {
    let lastmod = null;
    if (productDates.has(prod.slug)) {
      lastmod = productDates.get(prod.slug);
    } else if (prod.updated_at) {
      try {
        lastmod = new Date(prod.updated_at).toISOString().split('T')[0];
      } catch (e) {}
    }

    routes.push({
      path: `/sarees/${prod.slug}`,
      loc: `${BASE_URL}/sarees/${encodeURIComponent(prod.slug)}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: lastmod || null
    });
  }

  return routes;
}

/**
 * Backwards compatibility helper returning array of URL path strings
 */
function getAllCatalogRoutes(catalog) {
  return getCanonicalCatalogRoutes(catalog).map(r => r.path);
}

function generateSitemapXml(catalog, baseUrl = BASE_URL) {
  const routes = getCanonicalCatalogRoutes(catalog);

  const urls = routes.map((item) => {
    const loc = item.loc.startsWith(baseUrl) ? item.loc : (item.path === '/' ? `${baseUrl}/` : `${baseUrl}${item.path}`);
    const safeLoc = loc.replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;').replace(/>/g, '&gt;').replace(/</g, '&lt;');

    let lastmodTag = '';
    if (item.lastmod) {
      lastmodTag = `\n    <lastmod>${item.lastmod}</lastmod>`;
    }

    return `  <url>\n    <loc>${safeLoc}</loc>${lastmodTag}\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function generateRobotsTxt(baseUrl = BASE_URL) {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /checkout',
    'Disallow: /cart',
    'Disallow: /account',
    'Disallow: /order-success',
    'Disallow: /track-order',
    'Disallow: /wishlist',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    ''
  ].join('\n');
}

module.exports = {
  BASE_URL,
  CANONICAL_STATIC_ROUTES,
  getCanonicalCatalogRoutes,
  getAllCatalogRoutes,
  generateSitemapXml,
  generateRobotsTxt
};

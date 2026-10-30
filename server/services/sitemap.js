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
 * Parses and formats date string or object to YYYY-MM-DD.
 * Handles SQLite CURRENT_TIMESTAMP (UTC YYYY-MM-DD HH:MM:SS) without local-timezone day-shift.
 */
function formatLastmod(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    try {
      const utcString = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T') + 'Z';
      return new Date(utcString).toISOString().split('T')[0];
    } catch (e) {
      return null;
    }
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  return null;
}

let lastKnownGoodCatalog = null;
try {
  const initialPath = path.join(__dirname, '..', 'data', 'catalog.json');
  if (fs.existsSync(initialPath)) {
    const raw = fs.readFileSync(initialPath, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.products)) {
      lastKnownGoodCatalog = parsed;
    }
  }
} catch (e) {}

function getCatalogData(catalog) {
  if (catalog && Array.isArray(catalog.categories) && Array.isArray(catalog.products)) {
    lastKnownGoodCatalog = catalog;
    return catalog;
  }
  try {
    const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, 'utf8').replace(/^\uFEFF/, '');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.products)) {
        lastKnownGoodCatalog = parsed;
        return parsed;
      }
      throw new Error('Invalid catalog schema: categories and products arrays required');
    }
  } catch (err) {
    console.error('Failed to parse catalog.json for sitemap:', err.message);
    if (lastKnownGoodCatalog) {
      console.warn('Falling back to last known good catalog for sitemap generation');
      return lastKnownGoodCatalog;
    }
  }
  return lastKnownGoodCatalog || catalog || { categories: [], products: [] };
}

/**
 * Returns canonical, indexable routes for sitemap generation.
 * - Drops private/noindex pages (/cart, /checkout, /order-success, /track-order, /account, /wishlist, /admin)
 * - Keeps /sarees rather than non-canonical alias /shop
 * - Keeps single canonical category form: /sarees?category=<slug>
 * - Keeps single canonical product form: /sarees/<slug>
 * - Derives lastmod from product updated_at in database without timezone shifts
 */
function getCanonicalCatalogRoutes(catalogInput) {
  const catalog = getCatalogData(catalogInput);
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
    if (!cat.slug) continue;
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
          const formatted = formatLastmod(row.updated_at);
          if (formatted) {
            productDates.set(row.slug, formatted);
          }
        }
      }
    } catch (e) {}
  }

  for (const prod of products) {
    if (!prod.slug) continue;
    const lastmod = productDates.get(prod.slug) || formatLastmod(prod.updated_at) || null;

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

function refreshSitemapFiles(catalogInput) {
  try {
    const catalog = getCatalogData(catalogInput);
    const xml = generateSitemapXml(catalog);
    const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
    const clientPublic = path.join(__dirname, '..', '..', 'client', 'public');

    if (fs.existsSync(clientDist)) {
      fs.writeFileSync(path.join(clientDist, 'sitemap.xml'), xml, 'utf8');
    }
    if (fs.existsSync(clientPublic)) {
      fs.writeFileSync(path.join(clientPublic, 'sitemap.xml'), xml, 'utf8');
    }
    return xml;
  } catch (err) {
    console.warn('Could not refresh sitemap files on disk:', err.message);
    return null;
  }
}

module.exports = {
  BASE_URL,
  CANONICAL_STATIC_ROUTES,
  formatLastmod,
  getCanonicalCatalogRoutes,
  getAllCatalogRoutes,
  generateSitemapXml,
  generateRobotsTxt,
  refreshSitemapFiles,
  getCatalogData
};

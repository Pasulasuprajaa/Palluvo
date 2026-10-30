const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://palluvo.com';

const STATIC_ROUTES = [
  '/',
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
  '/policy'
];

function getAllCatalogRoutes(catalog) {
  const routes = [...STATIC_ROUTES];
  const categories = catalog?.categories || [];
  for (const cat of categories) {
    routes.push(`/sarees?category=${cat.slug}`);
    routes.push(`/sarees/category/${cat.slug}`);
    routes.push(`/category/${cat.slug}`);
  }
  const products = catalog?.products || [];
  for (const prod of products) {
    routes.push(`/sarees/${prod.slug}`);
    routes.push(`/product/${prod.slug}`);
  }
  return routes;
}

function generateSitemapXml(catalog, baseUrl = BASE_URL) {
  const routes = getAllCatalogRoutes(catalog);
  const lastmod = new Date().toISOString().split('T')[0];

  const urls = routes.map((route) => {
    const loc = route === '/' ? `${baseUrl}/` : `${baseUrl}${route}`;
    let priority = '0.7';
    let changefreq = 'weekly';
    if (route === '/') {
      priority = '1.0';
      changefreq = 'daily';
    } else if (route.startsWith('/sarees') || route.startsWith('/product') || route.startsWith('/category')) {
      priority = '0.8';
      changefreq = 'weekly';
    } else {
      priority = '0.5';
      changefreq = 'monthly';
    }
    const safeLoc = loc.replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
    return `  <url>\n    <loc>${safeLoc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
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
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    ''
  ].join('\n');
}

module.exports = {
  BASE_URL,
  STATIC_ROUTES,
  getAllCatalogRoutes,
  generateSitemapXml,
  generateRobotsTxt
};

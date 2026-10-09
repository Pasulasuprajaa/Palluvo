const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { getMetaForRoute, injectMetaTags } = require('../services/seoRenderer');

const distDir = path.join(__dirname, '..', '..', 'client', 'dist');
const templatePath = path.join(distDir, 'index.html');

if (!fs.existsSync(templatePath)) {
  console.log('ℹ️ Prerender note: client/dist/index.html not found. Run vite build first.');
  process.exit(0);
}

const templateHtml = fs.readFileSync(templatePath, 'utf8');

function writePrerenderedFile(routePath, htmlContent) {
  const cleanRoute = routePath.replace(/^\//, '').replace(/\/$/, '');
  const targetDir = cleanRoute ? path.join(distDir, cleanRoute) : distDir;
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), htmlContent, 'utf8');
}

try {
  console.log('🚀 Prerendering route HTML with product social metadata...');

  // 1. Static routes
  const staticRoutes = [
    '/',
    '/sarees',
    '/cart',
    '/checkout',
    '/order-success',
    '/track-order',
    '/account',
    '/wishlist',
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

  for (const route of staticRoutes) {
    const meta = getMetaForRoute(route);
    const rendered = injectMetaTags(templateHtml, meta);
    if (route === '/') {
      fs.writeFileSync(path.join(distDir, 'index.html'), rendered, 'utf8');
    } else {
      writePrerenderedFile(route, rendered);
    }
  }

  // 2. 404 page
  const notFoundMeta = getMetaForRoute('/404');
  const rendered404 = injectMetaTags(templateHtml, notFoundMeta);
  fs.writeFileSync(path.join(distDir, '404.html'), rendered404, 'utf8');

  // 3. Category routes
  const categories = db.prepare('SELECT slug FROM categories').all();
  for (const cat of categories) {
    const meta = getMetaForRoute('/sarees', { category: cat.slug });
    const rendered = injectMetaTags(templateHtml, meta);
    writePrerenderedFile(`/sarees/${cat.slug}`, rendered);
  }

  // 4. Product routes (/sarees/:slug and /product/:slug)
  const products = db.prepare('SELECT slug, name FROM products').all();
  for (const prod of products) {
    const meta = getMetaForRoute(`/sarees/${prod.slug}`);
    const rendered = injectMetaTags(templateHtml, meta);
    writePrerenderedFile(`/sarees/${prod.slug}`, rendered);
    writePrerenderedFile(`/product/${prod.slug}`, rendered);
  }

  console.log(`✅ Prerendered ${staticRoutes.length + categories.length + products.length * 2} routes with custom social metadata.`);
} catch (err) {
  console.error('❌ Prerender script error:', err);
  process.exit(1);
}

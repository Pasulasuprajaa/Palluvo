const fs = require('fs');
const path = require('path');
const { getMetaForRoute, injectMetaTags } = require('../services/seoRenderer');
const { generateSitemapXml, generateRobotsTxt } = require('../services/sitemap');

const distDir = path.join(__dirname, '..', '..', 'client', 'dist');
const publicDir = path.join(__dirname, '..', '..', 'client', 'public');
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

function writeStaticHtmlFile(filePath, htmlContent) {
  const cleanPath = filePath.replace(/^\//, '');
  const targetFile = path.join(distDir, cleanPath);
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, htmlContent, 'utf8');
}

function loadCatalog() {
  try {
    const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');
    if (fs.existsSync(catalogPath)) {
      return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    }
  } catch (e) {}
  return { categories: [], products: [] };
}

try {
  console.log('🚀 Prerendering route HTML with product social metadata...');
  const catalog = loadCatalog();

  // 1. Static routes
  const staticRoutes = [
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
  writePrerenderedFile('/404', rendered404);

  // 3. Category routes (/sarees?category=<slug>, /sarees/category/<slug>, /category/<slug>)
  const categories = catalog.categories || [];
  for (const cat of categories) {
    const meta = getMetaForRoute('/sarees', { category: cat.slug });
    const rendered = injectMetaTags(templateHtml, meta);
    // Write for Vercel query rewrite (/sarees?category=:slug -> /sarees/category-:slug.html)
    writeStaticHtmlFile(`sarees/category-${cat.slug}.html`, rendered);
    writePrerenderedFile(`/sarees/category/${cat.slug}`, rendered);
    writePrerenderedFile(`/category/${cat.slug}`, rendered);
  }

  // 4. Product routes (/sarees/:slug and /product/:slug)
  const products = catalog.products || [];
  for (const prod of products) {
    const meta = getMetaForRoute(`/sarees/${prod.slug}`);
    const rendered = injectMetaTags(templateHtml, meta);
    writePrerenderedFile(`/sarees/${prod.slug}`, rendered);
    writePrerenderedFile(`/product/${prod.slug}`, rendered);
  }

  console.log(`✅ Prerendered ${staticRoutes.length + categories.length * 3 + products.length * 2} route files without server db dependency.`);

  // 5. Emit sitemap.xml and robots.txt
  const sitemapXml = generateSitemapXml(catalog);
  const robotsTxt = generateRobotsTxt();

  // Write to client/dist (for production deployment / Vercel outputDirectory)
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');
  fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt, 'utf8');

  // Also write to client/public (source-controlled and copied on build)
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf8');
    fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf8');
  }

  console.log('✅ Generated sitemap.xml and robots.txt referencing catalog routes.');
} catch (err) {
  console.error('❌ Prerender script error:', err);
  process.exit(1);
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Initialize auth configuration, database schema, and auto-seed catalog if empty
const { JWT_SECRET } = require('./middleware/auth');
const db = require('./db/database');
const seedDatabase = require('./db/seed');

try {
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get()?.count || 0;
  if (count === 0) {
    seedDatabase({ isProduction: process.env.NODE_ENV === 'production', destructive: false });
  }
} catch (e) {
  console.log('Auto-seed note:', e.message);
}

const { apiLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable trust proxy for accurate client IP resolution behind Vercel / reverse proxies
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
// Disable inflation to prevent trailing-byte decoder exploits on compressed bodies (GHSA-27r3-jxmh-p828)
app.use(express.json({ inflate: false }));
app.use(morgan('dev'));

// Global API rate limiting
app.use('/api', apiLimiter);

// Static uploads / assets directory if needed
app.use('/public', express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/pincode', require('./routes/pincode'));
app.use('/api/newsletter', require('./routes/newsletter'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    brand: 'PALLUVO',
    tagline: 'Every drape, a little magic.',
    database: {
      durable: db.isDurable,
      ephemeral: db.isEphemeral,
      storageType: db.storageType,
      isServerless: Boolean(db.isServerless)
    },
    time: new Date().toISOString()
  });
});

// Serve client build static assets if present
const fs = require('fs');
const { getMetaForRoute, injectMetaTags } = require('./services/seoRenderer');
const clientDist = path.join(__dirname, '..', 'client', 'dist');
const clientIndex = path.join(clientDist, 'index.html');
const devIndex = path.join(__dirname, '..', 'client', 'index.html');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false }));
}
const clientPublic = path.join(__dirname, '..', 'client', 'public');
if (fs.existsSync(clientPublic)) {
  app.use(express.static(clientPublic, { index: false }));
}

function renderPageWithSeo(targetPath, query, req, res, next) {
  const htmlPath = fs.existsSync(clientIndex) ? clientIndex : (fs.existsSync(devIndex) ? devIndex : null);
  if (!htmlPath) return next();

  try {
    const rawHtml = fs.readFileSync(htmlPath, 'utf8');
    const meta = getMetaForRoute(targetPath, query || {});
    const finalHtml = injectMetaTags(rawHtml, meta);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (meta.isNotFound) {
      return res.status(404).send(finalHtml);
    }
    return res.status(200).send(finalHtml);
  } catch (err) {
    console.error('HTML SEO injection error:', err);
    return next();
  }
}

// Dedicated dynamic renderer endpoint for Vercel rewrites (e.g. /api/render?path=/sarees/:slug)
app.get('/api/render', (req, res, next) => {
  if (req.query.path !== undefined && typeof req.query.path !== 'string') {
    return res.status(400).json({
      error: 'Invalid path parameter. Path must be a single string.',
      code: 'INVALID_PATH'
    });
  }

  const rawPath = typeof req.query.path === 'string'
    ? req.query.path
    : (typeof req.headers['x-matched-path'] === 'string' ? req.headers['x-matched-path'] : (req.url || ''));

  let targetPath = (rawPath || '').split('?')[0];
  if (!targetPath.startsWith('/')) {
    targetPath = '/' + targetPath;
  }
  return renderPageWithSeo(targetPath, req.query, req, res, next);
});

// Serve dynamic SEO metadata for page routes and social crawlers
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  // Handle serverless platform rewrites (e.g. x-matched-path on Vercel)
  const matchedPath = req.headers['x-matched-path'];
  const effectivePath = (matchedPath && !matchedPath.startsWith('/api')) ? matchedPath : req.path;

  if (effectivePath.startsWith('/api') || effectivePath.startsWith('/public')) {
    return next();
  }

  return renderPageWithSeo(effectivePath, req.query, req, res, next);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || (err.status === 503 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_SERVER_ERROR')
  });
});

// Start Server when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✨ PALLUVO Luxury E-Commerce Backend running on port ${PORT}`);
  });
}

module.exports = app;

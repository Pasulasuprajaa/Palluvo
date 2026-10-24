const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const defaultDb = require('../db/database');
const { optionalAuth, JWT_SECRET } = require('../middleware/auth');
const { requireDurableStorage } = require('../middleware/storageGuard');
const { anonymousVoteLimiter, anonymousVoteStore, getNormalizedIp } = require('../middleware/rateLimit');
const { reconcileExpiredReservations } = require('./payments');
const { rotationLedger: defaultRotationLedger } = require('../services/rotationLedger');

function createProductsRouter(deps = {}) {
  const router = express.Router();
  let currentDb = deps.db || defaultDb;
  let currentRotationLedger = deps.rotationLedger || defaultRotationLedger;

  Object.defineProperty(router, 'db', {
    get: () => currentDb,
    set: (val) => { currentDb = val || defaultDb; },
    configurable: true,
    enumerable: true
  });

  Object.defineProperty(router, 'rotationLedger', {
    get: () => currentRotationLedger,
    set: (val) => { currentRotationLedger = val || defaultRotationLedger; },
    configurable: true,
    enumerable: true
  });

  const db = new Proxy({}, {
    get: (target, prop) => {
      const val = currentDb[prop];
      return typeof val === 'function' ? val.bind(currentDb) : val;
    }
  });

  const rotationLedger = new Proxy({}, {
    get: (target, prop) => {
      const val = currentRotationLedger[prop];
      return typeof val === 'function' ? val.bind(currentRotationLedger) : val;
    }
  });

function getCallerIp(req) {
  if (req.ip) return req.ip;
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) {
    return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

const BROWSER_COOKIE_NAME = 'pv_bid';

function signBrowserId(bid) {
  const hmac = crypto.createHmac('sha256', JWT_SECRET).update(`bid:${bid}`).digest('hex').slice(0, 32);
  return `${bid}.${hmac}`;
}

function verifyBrowserId(signedValue) {
  if (!signedValue || typeof signedValue !== 'string') return null;
  const dotIndex = signedValue.lastIndexOf('.');
  if (dotIndex === -1) return null;
  const bid = signedValue.slice(0, dotIndex);
  const sig = signedValue.slice(dotIndex + 1);
  if (!bid.startsWith('bid_')) return null;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`bid:${bid}`).digest('hex').slice(0, 32);
  if (sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return bid;
  }
  return null;
}

function getBrowserIdFromReq(req) {
  const cookieHeader = req?.headers?.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)pv_bid=([^;]+)/);
  if (!match) return null;
  const raw = decodeURIComponent(match[1].trim());
  return verifyBrowserId(raw);
}

function setBrowserIdCookie(res, bid) {
  if (!res || typeof res.setHeader !== 'function') return;
  const signed = signBrowserId(bid);
  res.setHeader(
    'Set-Cookie',
    `${BROWSER_COOKIE_NAME}=${encodeURIComponent(signed)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
  );
}

function isLegacyVoterId(voterId, req) {
  if (!voterId || typeof voterId !== 'string') return true;
  // Modern per-browser voter IDs start with 'voter_'
  if (!voterId.startsWith('voter_')) return true;
  // Legacy IP HMACs were 32-character hex strings
  if (/^[0-9a-f]{32}$/i.test(voterId)) return true;
  // If caller IP matches legacy HMAC, migrate to per-browser ID
  if (req) {
    try {
      const ip = getCallerIp(req);
      const ipHmac = crypto.createHmac('sha256', JWT_SECRET).update(`qa_voter_stable:${ip}`).digest('hex').slice(0, 32);
      if (voterId === ipHmac || voterId === `voter_${ipHmac}`) return true;
    } catch (e) {}
  }
  return false;
}

async function issueVoterToken(req, res) {
  let voterId = null;
  let browserId = getBrowserIdFromReq(req);

  // 1. If the client sends an established server-managed browser cookie, bind voterId to it
  if (browserId) {
    voterId = 'voter_' + browserId;
  }

  // 2. If no cookie, inspect existingToken from headers/query/body
  const existingToken = (
    req?.headers?.['x-voter-token'] ||
    req?.query?.token ||
    req?.body?.voter_token ||
    ''
  ).trim();

  if (!voterId && existingToken) {
    try {
      const decoded = jwt.verify(existingToken, JWT_SECRET, { ignoreExpiration: true });
      if (decoded && decoded.voter_type === 'anonymous_qa_voter' && decoded.voter_id) {
        // Migrate legacy IP-derived voter IDs to distinct per-browser IDs
        if (!isLegacyVoterId(decoded.voter_id, req)) {
          voterId = decoded.voter_id;
          browserId = voterId.startsWith('voter_bid_')
            ? voterId.replace(/^voter_/, '')
            : 'bid_' + voterId.replace(/^voter_/, '');
        }
      }
    } catch (e) {}
  }

  // 3. If neither cookie nor valid existing token exists, generate fresh browser ID
  if (!voterId) {
    browserId = 'bid_' + crypto.randomUUID();
    voterId = 'voter_' + browserId;

    // Link newly generated browser ID to any prior anonymous votes cast by this IP in shared expiring storage
    if (req) {
      const clientIp = getNormalizedIp(req);
      const previousVotes = await rotationLedger.getVotedQuestionsForIp(clientIp);
      if (previousVotes && previousVotes.length > 0) {
        for (const vote of previousVotes) {
          try {
            db.prepare('INSERT OR IGNORE INTO product_qa_votes (qa_id, voter_key, user_id) VALUES (?, ?, NULL)').run(
              vote.qa_id,
              'anon_voter_' + browserId
            );
          } catch (e) {}
        }
      }
    }
  }

  // Set the stable server-managed session cookie on response
  if (browserId && res) {
    setBrowserIdCookie(res, browserId);
  }

  return jwt.sign(
    {
      voter_id: voterId,
      browser_id: browserId,
      voter_type: 'anonymous_qa_voter',
      nonce: crypto.randomBytes(8).toString('hex')
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function verifyVoterToken(token, req) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'MISSING' };
  }
  try {
    const decoded = jwt.verify(token.trim(), JWT_SECRET);
    if (decoded && decoded.voter_type === 'anonymous_qa_voter' && decoded.voter_id) {
      if (isLegacyVoterId(decoded.voter_id, req)) {
        return { valid: false, error: 'LEGACY_MIGRATION_REQUIRED' };
      }
      // Require browser cookie for anonymous voter token validation when request is provided
      if (req && !req.user?.id) {
        const cookieBid = getBrowserIdFromReq(req);
        if (!cookieBid) {
          return { valid: false, error: 'COOKIE_REQUIRED' };
        }
        const tokenBid = decoded.browser_id || (
          decoded.voter_id && decoded.voter_id.startsWith('voter_bid_')
            ? decoded.voter_id.replace(/^voter_/, '')
            : (decoded.voter_id && decoded.voter_id.startsWith('voter_') ? decoded.voter_id.replace(/^voter_/, '') : null)
        );
        if (tokenBid && tokenBid !== cookieBid) {
          return { valid: false, error: 'COOKIE_MISMATCH' };
        }
        return {
          valid: true,
          voter_id: decoded.voter_id,
          browser_id: cookieBid
        };
      }
      return {
        valid: true,
        voter_id: decoded.voter_id,
        browser_id: decoded.browser_id || (
          decoded.voter_id && decoded.voter_id.startsWith('voter_bid_')
            ? decoded.voter_id.replace(/^voter_/, '')
            : (decoded.voter_id && decoded.voter_id.startsWith('voter_') ? decoded.voter_id.replace(/^voter_/, '') : null)
        )
      };
    }
    return { valid: false, error: 'INVALID' };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { valid: false, error: 'EXPIRED' };
    }
    return { valid: false, error: 'INVALID' };
  }
}

// GET /api/products (List with comprehensive filtering, search, and sorting)
router.get('/', async (req, res) => {
  try {
    if (typeof reconcileExpiredReservations === 'function') {
      await reconcileExpiredReservations();
    }

    const {
      category,
      fabric,
      occasion,
      pattern,
      color,
      min_price,
      max_price,
      min_rating,
      in_stock,
      featured,
      new_arrival,
      best_seller,
      search,
      sort,
      page = 1,
      limit = 24
    } = req.query;

    let query = `
      WITH product_catalog AS (
        SELECT p.id, p.name, p.slug, p.tagline, p.description, p.short_desc, p.category_id,
          p.fabric, p.occasion, p.pattern, p.saree_length, p.blouse_length, p.care_instructions,
          p.price, p.mrp, p.discount_percent, p.stock_quantity, p.sku, p.is_featured,
          p.is_new_arrival, p.is_best_seller, p.silk_mark_certified, p.color_name, p.color_hex, p.created_at, p.updated_at,
          c.name as category_name, c.slug as category_slug,
          (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
          (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = p.id) as rating,
          (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_image,
          (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1 OFFSET 1) as secondary_image
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
      )
      SELECT * FROM product_catalog p
      WHERE 1=1
    `;
    const params = [];

    // Category filter (slug or id)
    if (category) {
      if (isNaN(category)) {
        query += ` AND p.category_slug = ?`;
        params.push(category);
      } else {
        query += ` AND p.category_id = ?`;
        params.push(parseInt(category));
      }
    }

    // Fabric filter
    if (fabric) {
      const fabrics = Array.isArray(fabric) ? fabric : fabric.split(',');
      query += ` AND (${fabrics.map(() => 'p.fabric LIKE ?').join(' OR ')})`;
      fabrics.forEach(f => params.push(`%${f.trim()}%`));
    }

    // Occasion filter
    if (occasion) {
      const occasions = Array.isArray(occasion) ? occasion : occasion.split(',');
      query += ` AND (${occasions.map(() => 'p.occasion LIKE ?').join(' OR ')})`;
      occasions.forEach(o => params.push(`%${o.trim()}%`));
    }

    // Pattern filter
    if (pattern) {
      query += ` AND p.pattern LIKE ?`;
      params.push(`%${pattern}%`);
    }

    // Color filter
    if (color) {
      query += ` AND (p.color_name LIKE ? OR EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.color_name LIKE ?))`;
      params.push(`%${color}%`, `%${color}%`);
    }

    // Price range
    if (min_price) {
      query += ` AND p.price >= ?`;
      params.push(parseInt(min_price));
    }
    if (max_price) {
      query += ` AND p.price <= ?`;
      params.push(parseInt(max_price));
    }

    // Rating filter
    if (min_rating) {
      query += ` AND p.rating >= ?`;
      params.push(parseFloat(min_rating));
    }

    // Stock availability
    if (in_stock === 'true' || in_stock === '1') {
      query += ` AND p.stock_quantity > 0`;
    }

    // Collection flags
    if (featured === 'true' || featured === '1') {
      query += ` AND p.is_featured = 1`;
    }
    if (new_arrival === 'true' || new_arrival === '1') {
      query += ` AND p.is_new_arrival = 1`;
    }
    if (best_seller === 'true' || best_seller === '1') {
      query += ` AND p.is_best_seller = 1`;
    }

    // Search query
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query += ` AND (
        p.name LIKE ? OR
        p.tagline LIKE ? OR
        p.description LIKE ? OR
        p.fabric LIKE ? OR
        p.occasion LIKE ? OR
        p.pattern LIKE ? OR
        p.category_name LIKE ?
      )`;
      params.push(s, s, s, s, s, s, s);
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        query += ` ORDER BY p.price ASC, p.id ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY p.price DESC, p.id DESC`;
        break;
      case 'rating':
        query += ` ORDER BY p.rating DESC, p.review_count DESC, p.id DESC`;
        break;
      case 'newest':
        query += ` ORDER BY p.created_at DESC, p.id DESC`;
        break;
      case 'best_seller':
        query += ` ORDER BY p.is_best_seller DESC, COALESCE(p.rating, 0) DESC, p.review_count DESC, p.id DESC`;
        break;
      case 'discount':
        query += ` ORDER BY p.discount_percent DESC, p.id DESC`;
        break;
      case 'recommended':
      default:
        query += ` ORDER BY p.is_featured DESC, COALESCE(p.rating, 0) DESC, p.review_count DESC, p.id DESC`;
        break;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, parseInt(limit));
    const offset = (pageNum - 1) * pageSize;

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const countRow = db.prepare(countQuery).get(...params);
    const total = countRow ? countRow.total : 0;

    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    const products = db.prepare(query).all(...params);

    // Attach all images and variants to each item
    const formattedProducts = products.map(p => {
      const images = db.prepare('SELECT id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC').all(p.id);
      const variants = db.prepare('SELECT id, color_name, color_hex, stock_quantity, sku FROM product_variants WHERE product_id = ?').all(p.id);
      return {
        ...p,
        images: images.map(img => img.image_url),
        variants
      };
    });

    res.json({
      products: formattedProducts,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// GET /api/products/search/suggestions (Live instant search)
router.get('/search/suggestions', async (req, res) => {
  try {
    if (typeof reconcileExpiredReservations === 'function') {
      await reconcileExpiredReservations();
    }

    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ suggestions: [], products: [] });
    }

    const term = `%${q.trim()}%`;
    const products = db.prepare(`
      SELECT p.id, p.name, p.slug, p.price, p.mrp, p.discount_percent,
        (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = p.id) as rating,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image
      FROM products p
      WHERE p.name LIKE ? OR p.fabric LIKE ? OR p.occasion LIKE ?
      LIMIT 6
    `).all(term, term, term);

    const categories = db.prepare(`
      SELECT name, slug FROM categories WHERE name LIKE ? LIMIT 4
    `).all(term);

    res.json({
      query: q,
      products,
      categories
    });
  } catch (err) {
    console.error('Search suggestions error:', err);
    res.status(500).json({ error: 'Search failed.' });
  }
});

// GET /api/products/qa/voter-token (Issue a signed, stable anonymous voter token bound to browser session)
router.get('/qa/voter-token', async (req, res) => {
  try {
    const token = await issueVoterToken(req, res);
    res.json({ success: true, voter_token: token });
  } catch (err) {
    res.status(500).json({ error: 'Failed to issue voter token.' });
  }
});

// GET /api/products/:slugOrId (Single product details with gallery, variants, reviews, and related items)
router.get('/:slugOrId', async (req, res) => {
  try {
    if (typeof reconcileExpiredReservations === 'function') {
      await reconcileExpiredReservations();
    }

    const { slugOrId } = req.params;
    let product;

    if (!isNaN(slugOrId)) {
      product = db.prepare(`
        SELECT p.id, p.name, p.slug, p.tagline, p.description, p.short_desc, p.category_id,
          p.fabric, p.occasion, p.pattern, p.saree_length, p.blouse_length, p.care_instructions,
          p.price, p.mrp, p.discount_percent, p.stock_quantity, p.sku, p.is_featured,
          p.is_new_arrival, p.is_best_seller, p.silk_mark_certified, p.color_name, p.color_hex, p.created_at, p.updated_at,
          c.name as category_name, c.slug as category_slug,
          (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
          (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = p.id) as rating
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `).get(parseInt(slugOrId));
    } else {
      product = db.prepare(`
        SELECT p.id, p.name, p.slug, p.tagline, p.description, p.short_desc, p.category_id,
          p.fabric, p.occasion, p.pattern, p.saree_length, p.blouse_length, p.care_instructions,
          p.price, p.mrp, p.discount_percent, p.stock_quantity, p.sku, p.is_featured,
          p.is_new_arrival, p.is_best_seller, p.silk_mark_certified, p.color_name, p.color_hex, p.created_at, p.updated_at,
          c.name as category_name, c.slug as category_slug,
          (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
          (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = p.id) as rating
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.slug = ?
      `).get(slugOrId);
    }

    if (!product) {
      return res.status(404).json({ error: 'Saree not found.' });
    }

    // Images
    const images = db.prepare('SELECT id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC').all(product.id);

    // Variants
    const variants = db.prepare('SELECT id, color_name, color_hex, stock_quantity, sku FROM product_variants WHERE product_id = ?').all(product.id);

    // Reviews
    const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC').all(product.id);

    // Q&A
    const qa = db.prepare('SELECT * FROM product_qa WHERE product_id = ? ORDER BY helpful_votes DESC, created_at DESC').all(product.id);

    // Related Products (Same category or fabric)
    const related = db.prepare(`
      SELECT p.id, p.name, p.slug, p.price, p.mrp, p.discount_percent,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
        (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = p.id) as rating,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image
      FROM products p
      WHERE (p.category_id = ? OR p.fabric = ?) AND p.id != ?
      ORDER BY p.id ASC
      LIMIT 4
    `).all(product.category_id, product.fabric, product.id);

    // Verified product-specific order activity in last 24 hours
    let recentOrders24h = 0;
    try {
      const recentOrdersRow = db.prepare(`
        SELECT COALESCE(SUM(oi.quantity), 0) as count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ?
          AND o.created_at >= datetime('now', '-24 hours')
          AND (o.payment_status IS NULL OR o.payment_status != 'Failed')
      `).get(product.id);
      recentOrders24h = recentOrdersRow?.count || 0;
    } catch (_) {}

    res.json({
      product: {
        ...product,
        images: images.map(i => i.image_url),
        thumbnails: images.map(i => {
          const u = i.image_url;
          if (typeof u === 'string' && u.startsWith('/images/')) return u.replace('/images/', '/images/thumbnails/');
          if (typeof u === 'string' && u.includes('images.unsplash.com')) return u.replace(/w=\d+/, 'w=180');
          return u;
        }),
        imageObjects: images,
        variants,
        reviews,
        qa,
        related,
        recent_orders_24h: recentOrders24h
      }
    });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ error: 'Failed to fetch saree details.' });
  }
});

// GET /api/products/:productId/qa (Get Q&As for a product)
router.get('/:productId/qa', async (req, res) => {
  try {
    const qas = db.prepare('SELECT * FROM product_qa WHERE product_id = ? ORDER BY helpful_votes DESC, created_at DESC').all(req.params.productId);
    const voterToken = await issueVoterToken(req, res);
    res.json({ qa: qas, voter_token: voterToken });
  } catch (err) {
    console.error('QA fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch questions.' });
  }
});

// POST /api/products/:productId/qa (Ask a new question)
router.post('/:productId/qa', requireDurableStorage, (req, res) => {
  try {
    const { question, user_name } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question cannot be empty.' });
    }

    const name = user_name && user_name.trim() ? user_name.trim() : 'PALLUVO Patron';
    const insert = db.prepare(`
      INSERT INTO product_qa (product_id, user_name, question, answer, answered_by, helpful_votes)
      VALUES (?, ?, ?, ?, ?, 0)
    `);

    // In production and real environments, leave questions unanswered until real staff review occurs.
    // Concierge answer simulation is strictly gated to development/demo environments when explicitly enabled.
    const isDevOrDemo = process.env.NODE_ENV === 'development' && process.env.ENABLE_CONCIERGE_SIMULATOR === 'true';
    const answer = isDevOrDemo
      ? 'Namaste! Thank you for inquiring. Our artisan concierge team has received your query and will assist shortly.'
      : null;
    const answeredBy = answer ? 'PALLUVO Concierge (Demo Simulator)' : null;

    const result = insert.run(req.params.productId, name, question.trim(), answer, answeredBy);

    const newQA = db.prepare('SELECT * FROM product_qa WHERE id = ?').get(result.lastInsertRowid);
    const message = answer
      ? 'Your question has been answered (Demo Simulator).'
      : 'Thank you! Your question has been submitted and will be answered once reviewed by our artisan concierge team.';
    res.status(201).json({ qa: newQA, message });
  } catch (err) {
    console.error('Post QA error:', err);
    res.status(500).json({ error: 'Failed to post question.' });
  }
});

// POST /api/products/qa/:id/helpful (Upvote helpfulness idempotently per voter)
router.post('/qa/:id/helpful', optionalAuth, requireDurableStorage, async (req, res) => {
  try {
    const qaId = parseInt(req.params.id, 10);
    if (isNaN(qaId)) {
      return res.status(400).json({ error: 'Invalid question ID.' });
    }

    const qaItem = db.prepare('SELECT id, helpful_votes FROM product_qa WHERE id = ?').get(qaId);
    if (!qaItem) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    // Determine unique voter key from authenticated user or server-issued signed anonymous voter token
    let voterKey;
    let userId = null;
    let cookieBid = getBrowserIdFromReq(req);

    if (req.user?.id) {
      voterKey = `usr_${req.user.id}`;
      userId = req.user.id;
    } else {
      const rawToken = (req.body?.voter_token || req.headers['x-voter-token'] || '').trim();
      if (!rawToken) {
        return res.status(400).json({ error: 'Valid server-issued voter token or authentication is required.' });
      }

      const verified = verifyVoterToken(rawToken, req);
      if (!verified.valid) {
        if (verified.error === 'EXPIRED') {
          return res.status(401).json({
            error: 'Voter token has expired. Please refresh your token.',
            code: 'TOKEN_EXPIRED'
          });
        }
        if (verified.error === 'LEGACY_MIGRATION_REQUIRED') {
          return res.status(401).json({
            error: 'Legacy voter token requires migration to per-browser identity. Please refresh your token.',
            code: 'TOKEN_LEGACY_MIGRATION'
          });
        }
        if (verified.error === 'COOKIE_REQUIRED') {
          return res.status(401).json({
            error: 'Valid browser session cookie is required to submit a helpful vote. Please enable cookies or refresh your session.',
            code: 'COOKIE_REQUIRED'
          });
        }
        if (verified.error === 'COOKIE_MISMATCH') {
          return res.status(401).json({
            error: 'Voter token is not bound to this browser session. Please refresh your token.',
            code: 'TOKEN_SESSION_MISMATCH'
          });
        }
        return res.status(400).json({
          error: 'Invalid or forged voter token. A valid server-issued voter token is required.',
          code: 'INVALID_TOKEN'
        });
      }

      // Require browser cookie before accepting an anonymous vote
      if (!cookieBid) {
        return res.status(401).json({
          error: 'Valid browser session cookie is required to submit a helpful vote. Please enable cookies or refresh your session.',
          code: 'COOKIE_REQUIRED'
        });
      }

      voterKey = `anon_${verified.voter_id}`;
    }

    const browserKey = (cookieBid && !req.user?.id) ? `anon_voter_${cookieBid}` : null;
    const clientIp = !req.user?.id ? getNormalizedIp(req) : null;

    // Check if voter (or this browser session) has already voted on this question
    const candidateKeys = [voterKey];
    if (browserKey && browserKey !== voterKey) {
      candidateKeys.push(browserKey);
    }

    const placeholders = candidateKeys.map(() => '?').join(', ');
    const existingVote = db.prepare(`SELECT id FROM product_qa_votes WHERE qa_id = ? AND voter_key IN (${placeholders})`).get(qaId, ...candidateKeys);
    if (existingVote) {
      // If this is an identity rotation attempt (fresh browser session minted after prior vote from same IP),
      // charge rate-limit quota so unauthenticated rotation loops hit 429
      const isOriginalSession = Boolean(
        browserKey &&
        (!clientIp || await rotationLedger.isOriginalVoter(clientIp, qaId, browserKey))
      );
      if (!isOriginalSession && !req.user?.id) {
        const allowed = await new Promise((resolve) => {
          let settled = false;
          const settle = (val) => {
            if (!settled) {
              settled = true;
              res.removeListener('finish', onFinish);
              res.removeListener('close', onClose);
              resolve(val);
            }
          };
          const onFinish = () => settle(false);
          const onClose = () => settle(false);

          res.once('finish', onFinish);
          res.once('close', onClose);

          anonymousVoteLimiter(req, res, (err) => {
            if (err) {
              if (!res.headersSent) {
                res.status(err.status || 500).json({ error: err.message });
              }
              return settle(false);
            }
            settle(!res.headersSent);
          });
        });
        if (!allowed) return;
      }

      return res.json({
        success: true,
        helpful_votes: qaItem.helpful_votes,
        already_voted: true
      });
    }

    // Synchronize concurrent requests after the initial lookup to test transaction isolation
    if (typeof router._beforeVoteTransactionHook === 'function') {
      await router._beforeVoteTransactionHook(req);
    }

    // Only charge shared rate limit quota for eligible new-vote attempts by unauthenticated guests.
    // Explicitly settle wrapper on response finish/close to prevent pending async handlers when limiter returns 429.
    if (!req.user?.id) {
      const allowed = await new Promise((resolve) => {
        let settled = false;
        const settle = (val) => {
          if (!settled) {
            settled = true;
            res.removeListener('finish', onFinish);
            res.removeListener('close', onClose);
            resolve(val);
          }
        };
        const onFinish = () => settle(false);
        const onClose = () => settle(false);

        res.once('finish', onFinish);
        res.once('close', onClose);

        anonymousVoteLimiter(req, res, (err) => {
          if (err) {
            if (!res.headersSent) {
              res.status(err.status || 500).json({ error: err.message });
            }
            return settle(false);
          }
          settle(!res.headersSent);
        });
      });
      if (!allowed) return;
    }

    // Atomically record vote and increment helpful_votes count.
    // The browserKey insert uses strict INSERT INTO (not OR IGNORE) so any concurrent duplicate
    // throws SQLITE_CONSTRAINT, rolling back the transaction before helpful_votes can increment.
    const recordVote = db.transaction(() => {
      db.prepare('INSERT INTO product_qa_votes (qa_id, voter_key, user_id) VALUES (?, ?, ?)').run(
        qaId,
        voterKey,
        userId
      );
      if (browserKey && browserKey !== voterKey) {
        db.prepare('INSERT INTO product_qa_votes (qa_id, voter_key, user_id) VALUES (?, ?, ?)').run(
          qaId,
          browserKey,
          userId
        );
      }
      db.prepare('UPDATE product_qa SET helpful_votes = helpful_votes + 1 WHERE id = ?').run(qaId);
    });

    try {
      recordVote();
    } catch (insertErr) {
      if (insertErr.code === 'SQLITE_CONSTRAINT' || insertErr.message.includes('UNIQUE')) {
        // Refund quota for concurrent duplicate vote collision
        if (!req.user?.id && anonymousVoteStore && typeof anonymousVoteStore.decrement === 'function') {
          const clientIp = getNormalizedIp(req);
          await anonymousVoteStore.decrement(clientIp).catch(() => {});
        }
        const currentItem = db.prepare('SELECT helpful_votes FROM product_qa WHERE id = ?').get(qaId);
        return res.json({
          success: true,
          helpful_votes: currentItem ? currentItem.helpful_votes : qaItem.helpful_votes,
          already_voted: true
        });
      }
      throw insertErr;
    }

    if (!req.user?.id && clientIp) {
      try {
        await rotationLedger.recordVote(clientIp, qaId, browserKey);
      } catch (ledgerErr) {
        // Shared persistence failed: fail closed and rollback the local SQLite vote & rotation ledger
        try {
          db.prepare('DELETE FROM product_qa_votes WHERE qa_id = ? AND voter_key = ?').run(qaId, voterKey);
          if (browserKey && browserKey !== voterKey) {
            db.prepare('DELETE FROM product_qa_votes WHERE qa_id = ? AND voter_key = ?').run(qaId, browserKey);
          }
          db.prepare('UPDATE product_qa SET helpful_votes = MAX(0, helpful_votes - 1) WHERE id = ?').run(qaId);
          if (rotationLedger && typeof rotationLedger.rollbackVote === 'function') {
            await rotationLedger.rollbackVote(clientIp, qaId);
          }
        } catch (rollbackErr) {}
        throw ledgerErr;
      }
    }

    const updated = db.prepare('SELECT helpful_votes FROM product_qa WHERE id = ?').get(qaId);
    res.json({
      success: true,
      helpful_votes: updated ? updated.helpful_votes : qaItem.helpful_votes + 1,
      already_voted: false
    });
  } catch (err) {
    console.error('Helpful vote error:', err);
    res.status(500).json({ error: 'Failed to record vote.' });
  }
});

  router.issueVoterToken = issueVoterToken;
  router.verifyVoterToken = verifyVoterToken;
  router.signBrowserId = signBrowserId;
  router.verifyBrowserId = verifyBrowserId;
  router._beforeVoteTransactionHook = null;
  router.resetIpVotedQuestions = async () => {
    await currentRotationLedger.clear();
  };

  return router;
}

const defaultProductsRouter = createProductsRouter({ db: defaultDb, rotationLedger: defaultRotationLedger });
defaultProductsRouter.createProductsRouter = createProductsRouter;
defaultProductsRouter.createRouter = createProductsRouter;

module.exports = defaultProductsRouter;

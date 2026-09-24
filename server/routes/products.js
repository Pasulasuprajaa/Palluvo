const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/products (List with comprehensive filtering, search, and sorting)
router.get('/', (req, res) => {
  try {
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
      SELECT p.*, c.name as category_name, c.slug as category_slug,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_image,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 0 ORDER BY display_order ASC LIMIT 1) as secondary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Category filter (slug or id)
    if (category) {
      if (isNaN(category)) {
        query += ` AND c.slug = ?`;
        params.push(category);
      } else {
        query += ` AND p.category_id = ?`;
        params.push(parseInt(category));
      }
    }

    // Fabric filter
    if (fabric) {
      const fabrics = Array.isArray(fabric) ? fabric : fabric.split(',');
      const placeholders = fabrics.map(() => '?').join(',');
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
        c.name LIKE ?
      )`;
      params.push(s, s, s, s, s, s, s);
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        query += ` ORDER BY p.price ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY p.price DESC`;
        break;
      case 'rating':
        query += ` ORDER BY p.rating DESC, p.review_count DESC`;
        break;
      case 'newest':
        query += ` ORDER BY p.created_at DESC, p.id DESC`;
        break;
      case 'best_seller':
        query += ` ORDER BY p.is_best_seller DESC, p.review_count DESC`;
        break;
      case 'discount':
        query += ` ORDER BY p.discount_percent DESC`;
        break;
      case 'recommended':
      default:
        query += ` ORDER BY p.is_featured DESC, p.rating DESC, p.id DESC`;
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
      const images = db.prepare('SELECT id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY display_order ASC').all(p.id);
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
router.get('/search/suggestions', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ suggestions: [], products: [] });
    }

    const term = `%${q.trim()}%`;
    const products = db.prepare(`
      SELECT p.id, p.name, p.slug, p.price, p.mrp, p.discount_percent, p.rating,
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

// GET /api/products/:slugOrId (Single product details with gallery, variants, reviews, and related items)
router.get('/:slugOrId', (req, res) => {
  try {
    const { slugOrId } = req.params;
    let product;

    if (!isNaN(slugOrId)) {
      product = db.prepare(`
        SELECT p.*, c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `).get(parseInt(slugOrId));
    } else {
      product = db.prepare(`
        SELECT p.*, c.name as category_name, c.slug as category_slug
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
      SELECT p.id, p.name, p.slug, p.price, p.mrp, p.discount_percent, p.rating, p.review_count,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image
      FROM products p
      WHERE (p.category_id = ? OR p.fabric = ?) AND p.id != ?
      ORDER BY p.rating DESC
      LIMIT 4
    `).all(product.category_id, product.fabric, product.id);

    res.json({
      product: {
        ...product,
        images: images.map(i => i.image_url),
        imageObjects: images,
        variants,
        reviews,
        qa,
        related
      }
    });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ error: 'Failed to fetch saree details.' });
  }
});

// GET /api/products/:productId/qa (Get Q&As for a product)
router.get('/:productId/qa', (req, res) => {
  try {
    const qas = db.prepare('SELECT * FROM product_qa WHERE product_id = ? ORDER BY helpful_votes DESC, created_at DESC').all(req.params.productId);
    res.json({ qa: qas });
  } catch (err) {
    console.error('QA fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch questions.' });
  }
});

// POST /api/products/:productId/qa (Ask a new question)
router.post('/:productId/qa', (req, res) => {
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

    // Auto generate concierge answer simulator
    const answer = 'Namaste! Thank you for inquiring. Our artisan concierge team has verified that this piece complies with authentic weaving standards and comes carefully inspected in signature luxury packaging.';
    const result = insert.run(req.params.productId, name, question.trim(), answer, 'PALLUVO Master Weaver Concierge');

    const newQA = db.prepare('SELECT * FROM product_qa WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ qa: newQA, message: 'Your question has been answered by our Master Weaver Concierge.' });
  } catch (err) {
    console.error('Post QA error:', err);
    res.status(500).json({ error: 'Failed to post question.' });
  }
});

// POST /api/products/qa/:id/helpful (Upvote helpfulness)
router.post('/qa/:id/helpful', (req, res) => {
  try {
    db.prepare('UPDATE product_qa SET helpful_votes = helpful_votes + 1 WHERE id = ?').run(req.params.id);
    const item = db.prepare('SELECT * FROM product_qa WHERE id = ?').get(req.params.id);
    res.json({ success: true, helpful_votes: item ? item.helpful_votes : 1 });
  } catch (err) {
    console.error('Helpful vote error:', err);
    res.status(500).json({ error: 'Failed to record vote.' });
  }
});

module.exports = router;

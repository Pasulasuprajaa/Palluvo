const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/categories
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.display_order ASC
    `).all();

    res.json({ categories });
  } catch (err) {
    console.error('Categories fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// GET /api/categories/:slug
router.get('/:slug', (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const count = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(category.id).count;
    res.json({ category: { ...category, product_count: count } });
  } catch (err) {
    console.error('Category detail error:', err);
    res.status(500).json({ error: 'Failed to fetch category details.' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/wishlist
router.get('/', authenticateToken, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT 
        wi.id as wishlist_item_id,
        wi.product_id,
        wi.created_at,
        p.name,
        p.slug,
        p.tagline,
        p.price,
        p.mrp,
        p.discount_percent,
        p.fabric,
        p.rating,
        p.review_count,
        p.stock_quantity,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image
      FROM wishlist_items wi
      JOIN products p ON wi.product_id = p.id
      WHERE wi.user_id = ?
      ORDER BY wi.created_at DESC
    `).all(req.user.id);

    res.json({ items });
  } catch (err) {
    console.error('Wishlist fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch wishlist.' });
  }
});

// POST /api/wishlist/toggle
router.post('/toggle', authenticateToken, (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    const existing = db.prepare('SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);

    if (existing) {
      db.prepare('DELETE FROM wishlist_items WHERE id = ?').run(existing.id);
      return res.json({ is_wishlisted: false, message: 'Removed from your wishlist.' });
    } else {
      db.prepare('INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)').run(req.user.id, product_id);
      return res.json({ is_wishlisted: true, message: 'Saved to your wishlist.' });
    }
  } catch (err) {
    console.error('Wishlist toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle wishlist.' });
  }
});

// POST /api/wishlist/move-to-cart
router.post('/move-to-cart', authenticateToken, (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    // Add to cart
    const existingCart = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
    if (existingCart) {
      db.prepare('UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?').run(existingCart.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, 1)').run(req.user.id, product_id);
    }

    // Remove from wishlist
    db.prepare('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?').run(req.user.id, product_id);

    res.json({ message: 'Moved to your shopping bag!' });
  } catch (err) {
    console.error('Move to cart error:', err);
    res.status(500).json({ error: 'Failed to move to cart.' });
  }
});

module.exports = router;

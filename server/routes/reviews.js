const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reviews/:productId
router.get('/:productId', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `).all(req.params.productId);

    // Calculate rating distribution
    const total = reviews.length;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    reviews.forEach(r => {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating]++;
      }
      sum += r.rating;
    });

    const averageRating = total > 0 ? parseFloat((sum / total).toFixed(1)) : 5.0;

    res.json({
      reviews,
      stats: {
        total,
        averageRating,
        distribution
      }
    });
  } catch (err) {
    console.error('Reviews fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

// POST /api/reviews
router.post('/', authenticateToken, (req, res) => {
  try {
    const { product_id, rating, title, comment } = req.body;

    if (!product_id || !rating || !comment) {
      return res.status(400).json({ error: 'Product ID, rating (1-5), and review comment are required.' });
    }

    const cleanRating = Math.min(5, Math.max(1, parseInt(rating)));

    // Check if user has purchased this product
    const purchased = db.prepare(`
      SELECT 1 FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.payment_status = 'Paid'
      LIMIT 1
    `).get(req.user.id, product_id);

    const isVerified = purchased ? 1 : 1; // Default to 1 for demo delight

    const insert = db.prepare(`
      INSERT INTO reviews (product_id, user_id, user_name, rating, title, comment, verified_purchase)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      product_id,
      req.user.id,
      req.user.name,
      cleanRating,
      title ? title.trim() : 'Verified Saree Drape Experience',
      comment.trim(),
      isVerified
    );

    // Update product rating and review_count
    const stats = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE product_id = ?').get(product_id);
    db.prepare('UPDATE products SET rating = ?, review_count = ? WHERE id = ?')
      .run(parseFloat(stats.avg_rating.toFixed(2)), stats.total_reviews, product_id);

    res.status(201).json({ message: 'Thank you! Your review has been published.' });
  } catch (err) {
    console.error('Post review error:', err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

module.exports = router;

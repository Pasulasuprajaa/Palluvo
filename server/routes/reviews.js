const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { requireDurableStorage } = require('../middleware/storageGuard');

// Support up to 10mb JSON payload limit to align with customer photo review uploads
router.use(express.json({ inflate: false, limit: '10mb' }));

/**
 * Validates customer-uploaded photos.
 * Rejects external URLs (preventing IP harvesting / tracking pixels),
 * blob: URLs (origin-scoped pointers), and catalog imagery paths.
 * Accepts only validated raster image data URLs (JPEG, PNG, WebP) or same-origin /uploads/ paths.
 */
function isValidCustomerPhoto(photo) {
  if (!photo || typeof photo !== 'string') return false;
  const trimmed = photo.trim();

  // Reject external URLs (prevent third-party tracking / IP harvesting)
  if (/^(https?:)?\/\//i.test(trimmed)) return false;

  // Reject blob URLs (origin-scoped client memory pointers)
  if (trimmed.startsWith('blob:')) return false;

  // Reject catalog photography
  if (trimmed.startsWith('/images/') || trimmed.startsWith('images/')) return false;

  // Accept validated image data URLs (JPEG, PNG, WebP) with base64 payload
  const dataUrlRegex = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;
  if (dataUrlRegex.test(trimmed)) {
    // Max 3MB binary equivalent in base64 (~4.1MB)
    return trimmed.length >= 50 && trimmed.length <= 4 * 1024 * 1024;
  }

  // Accept strictly same-origin relative upload paths
  const localUploadRegex = /^\/uploads\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i;
  if (localUploadRegex.test(trimmed)) {
    return true;
  }

  return false;
}

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

// POST /api/reviews (Idempotent per customer and product)
router.post('/', authenticateToken, requireDurableStorage, (req, res) => {
  try {
    const { product_id, rating, title, comment, photos } = req.body;

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

    const isVerified = purchased ? 1 : 0;
    const reviewTitle = title ? title.trim() : (purchased ? 'Verified Saree Drape Experience' : 'Customer Review');
    const reviewComment = comment.trim();

    let photosJson = null;
    if (Array.isArray(photos) && photos.length > 0) {
      // Accept only customer-uploaded photos (data URLs or same-origin uploads); strictly reject external URLs, blobs, & catalog imagery
      const validPhotos = photos.filter(isValidCustomerPhoto).slice(0, 3);
      if (validPhotos.length > 0) {
        photosJson = JSON.stringify(validPhotos);
      }
    }

    // Check for existing review from this customer for this product
    const existing = db.prepare(`
      SELECT id FROM reviews WHERE product_id = ? AND user_id = ?
    `).get(product_id, req.user.id);

    if (existing) {
      // Idempotently update the existing review
      db.prepare(`
        UPDATE reviews
        SET rating = ?, title = ?, comment = ?, photos = COALESCE(?, photos), user_name = ?, verified_purchase = ?, created_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        cleanRating,
        reviewTitle,
        reviewComment,
        photosJson,
        req.user.name,
        isVerified,
        existing.id
      );
    } else {
      try {
        const insert = db.prepare(`
          INSERT INTO reviews (product_id, user_id, user_name, rating, title, comment, photos, verified_purchase)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insert.run(
          product_id,
          req.user.id,
          req.user.name,
          cleanRating,
          reviewTitle,
          reviewComment,
          photosJson,
          isVerified
        );
      } catch (insertErr) {
        if (insertErr.code === 'SQLITE_CONSTRAINT' || insertErr.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          // Fallback update on concurrent race
          db.prepare(`
            UPDATE reviews
            SET rating = ?, title = ?, comment = ?, photos = COALESCE(?, photos), user_name = ?, verified_purchase = ?, created_at = CURRENT_TIMESTAMP
            WHERE product_id = ? AND user_id = ?
          `).run(
            cleanRating,
            reviewTitle,
            reviewComment,
            photosJson,
            req.user.name,
            isVerified,
            product_id,
            req.user.id
          );
        } else {
          throw insertErr;
        }
      }
    }

    // Update product rating and review_count based on visible reviews
    const stats = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE product_id = ?').get(product_id);
    const totalReviews = stats.total_reviews || 0;
    const avgRating = totalReviews > 0 ? parseFloat(stats.avg_rating.toFixed(2)) : 5.0;

    db.prepare('UPDATE products SET rating = ?, review_count = ? WHERE id = ?')
      .run(avgRating, totalReviews, product_id);

    res.status(201).json({
      message: existing ? 'Your review has been updated.' : 'Thank you! Your review has been published.',
      updated: Boolean(existing)
    });
  } catch (err) {
    console.error('Post review error:', err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

module.exports = router;

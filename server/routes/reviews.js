const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { requireDurableStorage } = require('../middleware/storageGuard');

// Support up to 12mb JSON payload limit to align with customer photo review uploads (3 photos x 2MB binary = ~8.2MB base64)
router.use(express.json({ inflate: false, limit: '12mb' }));

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB binary limit per photo
const MAX_AGGREGATE_PHOTO_BYTES = 6 * 1024 * 1024; // 6MB binary limit total across all photos

/**
 * Validates customer-uploaded photos.
 * Rejects external URLs (preventing IP harvesting / tracking pixels),
 * blob: URLs (origin-scoped pointers), and catalog imagery paths.
 * Accepts only validated raster image data URLs (JPEG, PNG, WebP) or same-origin /uploads/ paths
 * and enforces strict matching per-photo size limits.
 */
function validateCustomerPhoto(photo, index = 0) {
  if (!photo || typeof photo !== 'string') {
    return { valid: false, error: `Photo #${index + 1} must be a valid image string.` };
  }
  const trimmed = photo.trim();

  // Reject external URLs (prevent third-party tracking / IP harvesting)
  if (/^(https?:)?\/\//i.test(trimmed)) {
    return { valid: false, error: `Photo #${index + 1} cannot be an external URL.` };
  }

  // Reject blob URLs (origin-scoped client memory pointers)
  if (trimmed.startsWith('blob:')) {
    return { valid: false, error: `Photo #${index + 1} cannot be a temporary blob URL.` };
  }

  // Reject catalog photography
  if (trimmed.startsWith('/images/') || trimmed.startsWith('images/')) {
    return { valid: false, error: `Photo #${index + 1} cannot be catalog imagery.` };
  }

  // Accept validated image data URLs (JPEG, PNG, WebP) with base64 payload
  const dataUrlRegex = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i;
  const match = trimmed.match(dataUrlRegex);
  if (match) {
    const base64Data = match[2];
    const byteLength = Math.ceil((base64Data.length * 3) / 4);
    if (byteLength < 10) {
      return { valid: false, error: `Photo #${index + 1} is empty or invalid.` };
    }
    if (byteLength > MAX_PHOTO_BYTES) {
      return {
        valid: false,
        error: `Photo #${index + 1} exceeds the 2MB size limit (${(byteLength / (1024 * 1024)).toFixed(2)}MB).`
      };
    }
    return { valid: true, byteLength, cleaned: trimmed };
  }

  // Accept strictly same-origin relative upload paths
  const localUploadRegex = /^\/uploads\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i;
  if (localUploadRegex.test(trimmed)) {
    return { valid: true, byteLength: 50000, cleaned: trimmed };
  }

  return { valid: false, error: `Photo #${index + 1} must be a valid JPEG, PNG, or WebP image.` };
}

function isValidCustomerPhoto(photo) {
  return validateCustomerPhoto(photo).valid;
}

// GET /api/reviews/check-purchase/:productId (Check if authenticated user has completed a paid purchase for this product)
router.get('/check-purchase/:productId', authenticateToken, (req, res) => {
  try {
    const purchased = db.prepare(`
      SELECT 1 FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.payment_status = 'Paid'
      LIMIT 1
    `).get(req.user.id, req.params.productId);

    res.json({ verified_purchase: Boolean(purchased) });
  } catch (err) {
    console.error('Check purchase error:', err);
    res.json({ verified_purchase: false });
  }
});

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
    let verifiedCount = 0;

    reviews.forEach(r => {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating]++;
      }
      sum += r.rating;
      if (r.verified_purchase === 1) {
        verifiedCount++;
      }
    });

    const averageRating = total > 0 ? parseFloat((sum / total).toFixed(1)) : 5.0;

    res.json({
      reviews,
      stats: {
        total,
        verifiedCount,
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
    if (photos !== undefined && photos !== null) {
      if (!Array.isArray(photos)) {
        return res.status(400).json({ error: 'Photos must be provided as an array.' });
      }

      if (photos.length > MAX_PHOTOS) {
        return res.status(400).json({ error: `A maximum of ${MAX_PHOTOS} photos can be uploaded per review.` });
      }

      if (photos.length > 0) {
        let aggregateBytes = 0;
        const validPhotos = [];

        for (let i = 0; i < photos.length; i++) {
          const validation = validateCustomerPhoto(photos[i], i);
          if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
          }
          aggregateBytes += validation.byteLength;
          validPhotos.push(validation.cleaned);
        }

        if (aggregateBytes > MAX_AGGREGATE_PHOTO_BYTES) {
          return res.status(400).json({
            error: `Total photo upload size exceeds the 6MB aggregate limit (${(aggregateBytes / (1024 * 1024)).toFixed(2)}MB).`
          });
        }

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
      updated: Boolean(existing),
      verified_purchase: isVerified === 1
    });
  } catch (err) {
    console.error('Post review error:', err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

module.exports = router;

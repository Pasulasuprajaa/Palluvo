const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { optionalAuth } = require('../middleware/auth');

// GET /api/coupons (List active public promotional offers & coupons)
router.get('/', (req, res) => {
  try {
    const coupons = db.prepare(`
      SELECT id, code, title, description, discount_percent, max_discount_amount, min_order_amount, expiry_date
      FROM coupons
      WHERE is_active = 1
      ORDER BY discount_percent DESC
    `).all();

    res.json({ coupons });
  } catch (err) {
    console.error('Coupons fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch offers.' });
  }
});

// POST /api/coupons/validate
router.post('/validate', optionalAuth, (req, res) => {
  try {
    const { code, subtotal } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Please enter a coupon code.' });
    }

    if (!subtotal || subtotal <= 0) {
      return res.status(400).json({ error: 'Valid cart subtotal is required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(cleanCode);

    if (!coupon) {
      return res.status(404).json({ error: `Coupon "${cleanCode}" is invalid or has expired.` });
    }

    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return res.status(400).json({
        error: `Code "${cleanCode}" requires a minimum purchase of ₹${coupon.min_order_amount.toLocaleString('en-IN')}. Add ₹${(coupon.min_order_amount - subtotal).toLocaleString('en-IN')} more to your bag.`
      });
    }

    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      return res.status(400).json({ error: `Coupon "${cleanCode}" has reached its maximum usage limit.` });
    }

    // Calculate discount amount
    let discountAmount = Math.round((subtotal * coupon.discount_percent) / 100);
    if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
      discountAmount = coupon.max_discount_amount;
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discount_percent: coupon.discount_percent,
        discountAmount,
        newTotal: subtotal - discountAmount
      },
      message: `✨ Coupon "${coupon.code}" applied! You saved ₹${discountAmount.toLocaleString('en-IN')}.`
    });
  } catch (err) {
    console.error('Coupon validation error:', err);
    res.status(500).json({ error: 'Failed to validate coupon.' });
  }
});

module.exports = router;

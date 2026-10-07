const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Ensure newsletter_subscribers table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    coupon_code TEXT DEFAULT 'WELCOME10',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// POST /api/newsletter/subscribe
router.post('/subscribe', (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = db.prepare('SELECT id, coupon_code FROM newsletter_subscribers WHERE email = ?').get(cleanEmail);
    if (existing) {
      const code = existing.coupon_code || 'WELCOME10';
      return res.json({
        success: true,
        message: `You are already subscribed to the PALLUVO Circle! Use code ${code} for 10% OFF (up to ₹1,500) on orders above ₹1,999.`,
        couponCode: code,
        discountTerms: '10% OFF up to ₹1,500 on orders above ₹1,999',
        minOrderAmount: 1999,
        maxDiscountAmount: 1500,
        alreadySubscribed: true
      });
    }

    db.prepare('INSERT INTO newsletter_subscribers (email, coupon_code) VALUES (?, ?)').run(cleanEmail, 'WELCOME10');

    return res.status(201).json({
      success: true,
      message: '✨ Welcome to the PALLUVO Circle! Use code WELCOME10 for 10% OFF (up to ₹1,500) on orders above ₹1,999.',
      couponCode: 'WELCOME10',
      discountTerms: '10% OFF up to ₹1,500 on orders above ₹1,999',
      minOrderAmount: 1999,
      maxDiscountAmount: 1500
    });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return res.status(500).json({ error: 'Failed to process subscription. Please try again.' });
  }
});

module.exports = router;

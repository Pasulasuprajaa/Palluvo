const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { createRazorpayOrder, verifyPaymentSignature, key_id } = require('../services/razorpay');

// POST /api/payments/create-order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { address_id, address_data, coupon_code, items: directItems } = req.body;

    // 1. Resolve Shipping Address
    let address = null;
    if (address_id) {
      address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(address_id, req.user.id);
    } else if (address_data) {
      address = address_data;
    }

    if (!address) {
      return res.status(400).json({ error: 'Please select or provide a valid shipping address.' });
    }

    // 2. Resolve Items (either from user's DB cart or direct Buy Now payload)
    let cartItems = [];
    if (directItems && Array.isArray(directItems) && directItems.length > 0) {
      for (const item of directItems) {
        const prod = db.prepare('SELECT id, name, price, mrp, stock_quantity FROM products WHERE id = ?').get(item.product_id);
        const img = db.prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC LIMIT 1').get(item.product_id);
        let variant = null;
        if (item.variant_id) {
          variant = db.prepare('SELECT id, color_name, color_hex FROM product_variants WHERE id = ?').get(item.variant_id);
        }
        if (prod) {
          cartItems.push({
            product_id: prod.id,
            name: prod.name,
            price: prod.price,
            mrp: prod.mrp,
            quantity: item.quantity || 1,
            variant_name: variant ? variant.color_name : null,
            color_hex: variant ? variant.color_hex : null,
            image_url: img ? img.image_url : null
          });
        }
      }
    } else {
      // From cart_items table
      const dbItems = db.prepare(`
        SELECT 
          ci.product_id,
          ci.quantity,
          p.name,
          p.price,
          p.mrp,
          p.stock_quantity,
          pv.color_name as variant_name,
          pv.color_hex,
          (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.user_id = ?
      `).all(req.user.id);

      if (!dbItems || dbItems.length === 0) {
        return res.status(400).json({ error: 'Your shopping bag is empty.' });
      }

      cartItems = dbItems;
    }

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'No items found to checkout.' });
    }

    // 3. Compute accurate server-side amounts
    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const freeDeliveryThreshold = 1999;
    const deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : 150;
    
    // Validate Coupon
    let discountAmount = 0;
    let validCouponCode = null;
    if (coupon_code) {
      const cleanCode = coupon_code.trim().toUpperCase();
      const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(cleanCode);
      if (coupon && (!coupon.min_order_amount || subtotal >= coupon.min_order_amount)) {
        let disc = Math.round((subtotal * coupon.discount_percent) / 100);
        if (coupon.max_discount_amount && disc > coupon.max_discount_amount) {
          disc = coupon.max_discount_amount;
        }
        discountAmount = disc;
        validCouponCode = coupon.code;
      }
    }

    const totalAmount = Math.max(0, subtotal - discountAmount + deliveryFee);
    // Generate cryptographically secure, unguessable high-entropy tokens (CSPRNG, 96 bits of entropy)
    const orderNumber = `PAL-${new Date().getFullYear()}-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
    const trackingNumber = `BLR-BD-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;

    // 4. Create Razorpay Order
    const rzpOrder = await createRazorpayOrder({
      amount: totalAmount,
      currency: 'INR',
      receipt: orderNumber,
      notes: {
        userId: req.user.id,
        userEmail: req.user.email,
        orderNumber
      }
    });

    // 5. Insert Pending Order in DB
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, address_data, subtotal, discount_amount, coupon_code,
        delivery_fee, tax_amount, total_amount, status, payment_status, payment_method,
        razorpay_order_id, tracking_number, courier_partner, estimated_delivery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const orderRes = insertOrder.run(
      orderNumber,
      req.user.id,
      JSON.stringify(address),
      subtotal,
      discountAmount,
      validCouponCode,
      deliveryFee,
      0, // GST included in MRP
      totalAmount,
      'Placed',
      'Pending',
      'Razorpay',
      rzpOrder.id,
      trackingNumber,
      'BlueDart Luxury Express',
      '3-4 Business Days'
    );

    const orderId = orderRes.lastInsertRowid;

    // Insert Order Items
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, variant_name, color_hex, price, quantity, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of cartItems) {
      insertItem.run(
        orderId,
        item.product_id,
        item.name,
        item.variant_name || null,
        item.color_hex || null,
        item.price,
        item.quantity,
        item.image_url || null
      );
    }

    res.json({
      orderId,
      orderNumber,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      keyId: key_id,
      isMock: rzpOrder.is_mock,
      summary: {
        subtotal,
        discountAmount,
        deliveryFee,
        totalAmount,
        itemCount: cartItems.length
      },
      customer: {
        name: address.name || req.user.name,
        email: req.user.email,
        phone: address.phone || req.user.phone || '+91 98765 43210'
      }
    });
  } catch (err) {
    console.error('Payment order creation error:', err);
    res.status(500).json({ error: 'Failed to initiate secure payment order.' });
  }
});

// POST /api/payments/verify (Verify Razorpay signature and finalize order)
router.post('/verify', authenticateToken, (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Incomplete payment verification payload.' });
    }

    // 1. Fetch exact order belonging strictly to the authenticated caller
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found or unauthorized access.' });
    }

    // 2. Validate current order state
    if (order.payment_status === 'Paid') {
      return res.status(400).json({ error: 'Order has already been paid and processed.' });
    }
    if (order.status === 'Cancelled') {
      return res.status(400).json({ error: 'Cannot complete payment for a cancelled order.' });
    }

    // 3. Match persisted gateway order identifier
    if (!order.razorpay_order_id || order.razorpay_order_id !== razorpay_order_id) {
      return res.status(400).json({ error: 'Payment gateway order identifier mismatch.' });
    }

    // 4. Verify cryptographic signature with live vs. mock distinction
    const isMockOrder = Boolean(order.razorpay_order_id && order.razorpay_order_id.startsWith('order_mock_'));
    const isValid = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      is_mock_order: isMockOrder
    });

    if (!isValid) {
      db.prepare('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
        .run('Failed', order.id, req.user.id);
      return res.status(400).json({ error: 'Payment signature verification failed. Please try again or contact support.' });
    }

    // 5. Atomically transition order state only if currently Pending
    const updateResult = db.prepare(`
      UPDATE orders SET
        payment_status = 'Paid',
        status = 'Placed',
        razorpay_payment_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND payment_status = 'Pending'
    `).run(razorpay_payment_id, order.id, req.user.id);

    if (updateResult.changes === 0) {
      return res.status(400).json({ error: 'Order payment status transition failed or already processed.' });
    }

    // 6. Record Payment
    db.prepare(`
      INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
      VALUES (?, ?, ?, ?, ?, 'INR', 'Captured', 'Razorpay')
    `).run(order.id, razorpay_order_id, razorpay_payment_id, razorpay_signature, order.total_amount * 100);

    // 7. Decrement Inventory & Update Coupon Usage
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    for (const item of items) {
      db.prepare('UPDATE products SET stock_quantity = MAX(0, stock_quantity - ?) WHERE id = ?')
        .run(item.quantity, item.product_id);
    }

    if (order.coupon_code) {
      db.prepare('UPDATE coupons SET times_used = times_used + 1 WHERE code = ?').run(order.coupon_code);
    }

    // 8. Clear User Cart
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

    let parsedAddress = {};
    try {
      parsedAddress = JSON.parse(order.address_data);
    } catch (e) {
      parsedAddress = { raw: order.address_data };
    }

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);

    res.json({
      success: true,
      message: '✨ Payment verified successfully! Your PALLUVO journey has begun.',
      order: {
        ...updatedOrder,
        address: parsedAddress,
        items
      }
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'Internal server error while verifying payment.' });
  }
});

module.exports = router;

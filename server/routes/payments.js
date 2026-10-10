const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { createRazorpayOrder, verifyPaymentSignature, key_id } = require('../services/razorpay');
const { requireDurableStorage } = require('../middleware/storageGuard');

const ORDER_RESERVATION_TTL_MS = 15 * 60 * 1000; // 15-minute pending reservation TTL

/**
 * Reconciles abandoned pending orders whose checkout reservation has expired,
 * releasing reserved product/variant inventory and coupon quota exactly once.
 */
function reconcileExpiredReservations(options = {}) {
  const now = options.now || Date.now();
  const cutoffSql = new Date(now - ORDER_RESERVATION_TTL_MS).toISOString().replace('T', ' ').slice(0, 19);

  // Find pending orders that have exceeded their reservation lifetime
  const expiredOrders = db.prepare(`
    SELECT id, coupon_code 
    FROM orders 
    WHERE payment_status = 'Pending'
      AND status != 'Cancelled'
      AND (
        (expires_at IS NOT NULL AND expires_at <= ?)
        OR (expires_at IS NULL AND created_at <= ?)
      )
  `).all(now, cutoffSql);

  if (!expiredOrders || expiredOrders.length === 0) {
    return 0;
  }

  let reconciledCount = 0;

  for (const expOrder of expiredOrders) {
    const releaseTx = db.transaction(() => {
      // Transition atomically from Pending -> Expired and Cancelled
      const updateRes = db.prepare(`
        UPDATE orders
        SET payment_status = 'Expired',
            status = 'Cancelled',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND payment_status = 'Pending' AND status != 'Cancelled'
      `).run(expOrder.id);

      // CRITICAL: Only restore stock and coupon if this transition changed the row
      if (updateRes.changes > 0) {
        const items = db.prepare('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?').all(expOrder.id);
        for (const item of items) {
          db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?')
            .run(item.quantity, item.product_id);
          if (item.variant_id) {
            db.prepare('UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?')
              .run(item.quantity, item.variant_id);
          }
        }

        if (expOrder.coupon_code) {
          db.prepare('UPDATE coupons SET times_used = MAX(0, times_used - 1) WHERE code = ?')
            .run(expOrder.coupon_code);
        }

        return true;
      }
      return false;
    });

    try {
      if (releaseTx()) {
        reconciledCount++;
      }
    } catch (err) {
      console.error(`Error reconciling expired order ${expOrder.id}:`, err);
    }
  }

  return reconciledCount;
}

/**
 * Reconciles a single order if it has expired
 */
function reconcileSingleExpiredOrder(orderId, now = Date.now()) {
  const cutoffSql = new Date(now - ORDER_RESERVATION_TTL_MS).toISOString().replace('T', ' ').slice(0, 19);
  const order = db.prepare(`
    SELECT id, coupon_code, expires_at, created_at, payment_status, status
    FROM orders
    WHERE id = ?
  `).get(orderId);

  if (!order || order.payment_status !== 'Pending' || order.status === 'Cancelled') {
    return false;
  }

  const isExpired = (order.expires_at && order.expires_at <= now) ||
    (!order.expires_at && order.created_at <= cutoffSql);

  if (!isExpired) return false;

  const releaseTx = db.transaction(() => {
    const updateRes = db.prepare(`
      UPDATE orders
      SET payment_status = 'Expired',
          status = 'Cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND payment_status = 'Pending' AND status != 'Cancelled'
    `).run(order.id);

    if (updateRes.changes > 0) {
      const items = db.prepare('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?').all(order.id);
      for (const item of items) {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?')
          .run(item.quantity, item.product_id);
        if (item.variant_id) {
          db.prepare('UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?')
            .run(item.quantity, item.variant_id);
        }
      }

      if (order.coupon_code) {
        db.prepare('UPDATE coupons SET times_used = MAX(0, times_used - 1) WHERE code = ?')
          .run(order.coupon_code);
      }
      return true;
    }
    return false;
  });

  return releaseTx();
}

// Periodic reconciliation interval for long-running server instances
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const reconciliationInterval = setInterval(() => {
    try {
      reconcileExpiredReservations();
    } catch (err) {
      console.error('Periodic order reservation reconciliation error:', err);
    }
  }, 60 * 1000);
  if (reconciliationInterval.unref) reconciliationInterval.unref();
}

// POST /api/payments/create-order
router.post('/create-order', authenticateToken, requireDurableStorage, async (req, res) => {
  try {
    // Reconcile any abandoned reservations before validating stock and coupons
    reconcileExpiredReservations();

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

    // 2. Resolve Items (either from direct Buy Now payload or user's DB cart)
    let cartItems = [];
    if (directItems && Array.isArray(directItems) && directItems.length > 0) {
      for (const item of directItems) {
        if (!item || !item.product_id) {
          return res.status(400).json({ error: 'Invalid product item in checkout request.' });
        }
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          return res.status(400).json({ error: 'Item quantity must be a positive integer.' });
        }

        const prod = db.prepare('SELECT id, name, price, mrp, stock_quantity FROM products WHERE id = ?').get(item.product_id);
        if (!prod) {
          return res.status(404).json({ error: 'Product not found.' });
        }

        if (prod.stock_quantity < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for "${prod.name}". Only ${prod.stock_quantity} available.`
          });
        }

        let variant = null;
        if (item.variant_id) {
          variant = db.prepare('SELECT id, product_id, color_name, color_hex, stock_quantity FROM product_variants WHERE id = ?').get(item.variant_id);
          if (!variant || variant.product_id !== prod.id) {
            return res.status(400).json({ error: `Invalid product variant for "${prod.name}".` });
          }
          if (variant.stock_quantity < item.quantity) {
            return res.status(400).json({
              error: `Insufficient stock for "${prod.name} (${variant.color_name})". Only ${variant.stock_quantity} available.`
            });
          }
        }

        const img = db.prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC LIMIT 1').get(item.product_id);

        cartItems.push({
          product_id: prod.id,
          variant_id: variant ? variant.id : null,
          name: prod.name,
          price: prod.price,
          mrp: prod.mrp,
          quantity: item.quantity,
          variant_name: variant ? variant.color_name : null,
          color_hex: variant ? variant.color_hex : null,
          image_url: img ? img.image_url : null
        });
      }
    } else {
      // From cart_items table
      const dbItems = db.prepare(`
        SELECT 
          ci.product_id,
          ci.variant_id,
          ci.quantity,
          p.name,
          p.price,
          p.mrp,
          p.stock_quantity,
          pv.color_name as variant_name,
          pv.color_hex,
          pv.stock_quantity as variant_stock,
          (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.user_id = ?
      `).all(req.user.id);

      if (!dbItems || dbItems.length === 0) {
        return res.status(400).json({ error: 'Your shopping bag is empty.' });
      }

      for (const item of dbItems) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          return res.status(400).json({ error: `Invalid quantity in bag for "${item.name}".` });
        }
        if (item.stock_quantity < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for "${item.name}". Only ${item.stock_quantity} available.`
          });
        }
        if (item.variant_id && item.variant_stock !== null && item.variant_stock !== undefined && item.variant_stock < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for "${item.name} (${item.variant_name})". Only ${item.variant_stock} available.`
          });
        }
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
    
    // Authoritative Coupon Validation at Checkout Boundary
    let discountAmount = 0;
    let validCouponCode = null;
    if (coupon_code) {
      const cleanCode = coupon_code.trim().toUpperCase();
      const todayStr = new Date().toISOString().slice(0, 10);
      const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(cleanCode);

      if (!coupon) {
        return res.status(400).json({ error: `Coupon "${cleanCode}" is invalid or inactive.` });
      }

      if (coupon.expiry_date && coupon.expiry_date < todayStr) {
        return res.status(400).json({ error: `Coupon "${cleanCode}" has expired.` });
      }

      if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
        return res.status(400).json({ error: `Coupon "${cleanCode}" has reached its maximum usage limit.` });
      }

      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        return res.status(400).json({
          error: `Code "${cleanCode}" requires a minimum purchase of ₹${coupon.min_order_amount.toLocaleString('en-IN')}.`
        });
      }

      let disc = Math.round((subtotal * coupon.discount_percent) / 100);
      if (coupon.max_discount_amount && disc > coupon.max_discount_amount) {
        disc = coupon.max_discount_amount;
      }
      discountAmount = disc;
      validCouponCode = coupon.code;
    }

    const totalAmount = Math.max(0, subtotal - discountAmount + deliveryFee);
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

    // 5. Atomically reserve product/variant stock, coupon usage, and insert pending order
    const createOrderTx = db.transaction(() => {
      // Atomically decrement stock with conditional boundary checks (fails if quantity > available stock)
      for (const item of cartItems) {
        const prodRes = db.prepare(`
          UPDATE products
          SET stock_quantity = stock_quantity - ?
          WHERE id = ? AND stock_quantity >= ?
        `).run(item.quantity, item.product_id, item.quantity);

        if (prodRes.changes === 0) {
          const current = db.prepare('SELECT name, stock_quantity FROM products WHERE id = ?').get(item.product_id);
          const err = new Error(`Insufficient stock for "${item.name}". Only ${current?.stock_quantity ?? 0} available.`);
          err.status = 400;
          throw err;
        }

        if (item.variant_id) {
          const varRes = db.prepare(`
            UPDATE product_variants
            SET stock_quantity = stock_quantity - ?
            WHERE id = ? AND stock_quantity >= ?
          `).run(item.quantity, item.variant_id, item.quantity);

          if (varRes.changes === 0) {
            const currentVar = db.prepare('SELECT color_name, stock_quantity FROM product_variants WHERE id = ?').get(item.variant_id);
            const err = new Error(`Insufficient stock for "${item.name} (${item.variant_name || currentVar?.color_name})". Only ${currentVar?.stock_quantity ?? 0} available.`);
            err.status = 400;
            throw err;
          }
        }
      }

      // Atomically reserve coupon usage
      if (validCouponCode) {
        const couponRes = db.prepare(`
          UPDATE coupons
          SET times_used = times_used + 1
          WHERE code = ?
            AND is_active = 1
            AND (expiry_date IS NULL OR expiry_date >= DATE('now'))
            AND (usage_limit IS NULL OR times_used < usage_limit)
        `).run(validCouponCode);

        if (couponRes.changes === 0) {
          const err = new Error(`Coupon "${validCouponCode}" is no longer available or has reached its usage limit.`);
          err.status = 400;
          throw err;
        }
      }

      const expiresAt = Date.now() + ORDER_RESERVATION_TTL_MS;

      // Insert Pending Order
      const insertOrder = db.prepare(`
        INSERT INTO orders (
          order_number, user_id, address_data, subtotal, discount_amount, coupon_code,
          delivery_fee, tax_amount, total_amount, status, payment_status, payment_method,
          razorpay_order_id, tracking_number, courier_partner, estimated_delivery,
          expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        '3-4 Business Days',
        expiresAt
      );

      const orderId = orderRes.lastInsertRowid;

      // Insert Order Items with variant_id
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, color_hex, price, quantity, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of cartItems) {
        insertItem.run(
          orderId,
          item.product_id,
          item.variant_id || null,
          item.name,
          item.variant_name || null,
          item.color_hex || null,
          item.price,
          item.quantity,
          item.image_url || null
        );
      }

      return { orderId, expiresAt };
    });

    let orderInfo;
    try {
      orderInfo = createOrderTx();
    } catch (txErr) {
      if (txErr.status) {
        return res.status(txErr.status).json({ error: txErr.message });
      }
      throw txErr;
    }

    const { orderId, expiresAt } = orderInfo;

    res.json({
      orderId,
      orderNumber,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      keyId: key_id,
      isMock: rzpOrder.is_mock,
      expiresAt,
      reservationExpiresInMs: ORDER_RESERVATION_TTL_MS,
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
router.post('/verify', authenticateToken, requireDurableStorage, (req, res) => {
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

    // 2. Validate current order state: reject terminal and non-pending orders
    if (order.payment_status === 'Paid') {
      return res.status(400).json({ error: 'Order has already been paid and processed.' });
    }
    if (order.status === 'Cancelled') {
      return res.status(400).json({ error: 'Cannot complete payment for a cancelled order.' });
    }
    if (order.payment_status === 'Failed') {
      return res.status(400).json({ error: 'Payment for this order has already failed and reservation was released.' });
    }
    if (order.payment_status === 'Expired') {
      return res.status(400).json({ error: 'Order reservation has expired.' });
    }
    if (order.payment_status !== 'Pending') {
      return res.status(400).json({ error: `Order cannot be verified: invalid payment status "${order.payment_status}".` });
    }

    // Check if order reservation has expired by TTL
    const isExpired = (order.expires_at && order.expires_at <= Date.now()) ||
      (!order.expires_at && new Date((order.created_at || '').replace(' ', 'T') + 'Z').getTime() <= Date.now() - ORDER_RESERVATION_TTL_MS);
    if (isExpired) {
      reconcileSingleExpiredOrder(order.id);
      return res.status(400).json({ error: 'Order reservation has expired. Please initiate checkout again.' });
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
      // Signature verification failed: release reserved stock and coupon ONLY IF
      // the conditional transition from Pending -> Failed succeeds
      const releaseTx = db.transaction(() => {
        const updateRes = db.prepare(`
          UPDATE orders 
          SET payment_status = 'Failed', 
              status = 'Cancelled', 
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND user_id = ? AND payment_status = 'Pending' AND status != 'Cancelled'
        `).run(order.id, req.user.id);

        if (updateRes.changes > 0) {
          const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
          for (const item of items) {
            db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?')
              .run(item.quantity, item.product_id);
            if (item.variant_id) {
              db.prepare('UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?')
                .run(item.quantity, item.variant_id);
            }
          }
          if (order.coupon_code) {
            db.prepare('UPDATE coupons SET times_used = MAX(0, times_used - 1) WHERE code = ?')
              .run(order.coupon_code);
          }
          return true;
        }
        return false;
      });
      releaseTx();

      return res.status(400).json({ error: 'Payment signature verification failed. Please try again or contact support.' });
    }

    // 5. Atomically transition order state only if currently Pending
    const updateResult = db.prepare(`
      UPDATE orders SET
        payment_status = 'Paid',
        status = 'Placed',
        razorpay_payment_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND payment_status = 'Pending' AND status != 'Cancelled'
    `).run(razorpay_payment_id, order.id, req.user.id);

    if (updateResult.changes === 0) {
      return res.status(400).json({ error: 'Order payment status transition failed or already processed.' });
    }

    // 6. Record Payment
    db.prepare(`
      INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
      VALUES (?, ?, ?, ?, ?, 'INR', 'Captured', 'Razorpay')
    `).run(order.id, razorpay_order_id, razorpay_payment_id, razorpay_signature, order.total_amount * 100);

    // 7. Clear User Cart (stock and coupon usage were atomically reserved at order creation)
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

    let parsedAddress = {};
    try {
      parsedAddress = JSON.parse(order.address_data);
    } catch (e) {
      parsedAddress = { raw: order.address_data };
    }

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

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
module.exports.reconcileExpiredReservations = reconcileExpiredReservations;
module.exports.reconcileSingleExpiredOrder = reconcileSingleExpiredOrder;
module.exports.ORDER_RESERVATION_TTL_MS = ORDER_RESERVATION_TTL_MS;

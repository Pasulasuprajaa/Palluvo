const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// GET /api/orders (List user orders)
router.get('/', authenticateToken, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT * FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    const enrichedOrders = orders.map(order => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      let parsedAddress = {};
      try {
        parsedAddress = JSON.parse(order.address_data);
      } catch (e) {
        parsedAddress = { raw: order.address_data };
      }
      return {
        ...order,
        address: parsedAddress,
        items
      };
    });

    res.json({ orders: enrichedOrders });
  } catch (err) {
    console.error('Orders fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// GET /api/orders/track/:identifier (Track order by high-entropy Order Number or Tracking Number ONLY)
router.get('/track/:identifier', optionalAuth, (req, res) => {
  try {
    const { identifier } = req.params;
    const cleanId = (identifier || '').trim();

    if (!cleanId) {
      return res.status(400).json({ error: 'Please provide an Order Number or Tracking Number.' });
    }

    // High-entropy lookup only (do not allow auto-increment numeric id enumeration)
    const order = db.prepare(`
      SELECT id, order_number, tracking_number, courier_partner, estimated_delivery, status, payment_status, created_at
      FROM orders
      WHERE order_number = ? OR tracking_number = ?
    `).get(cleanId, cleanId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found. Please check your Order ID or Tracking Number.' });
    }

    const items = db.prepare(`
      SELECT product_name, variant_name, quantity, image_url, price 
      FROM order_items 
      WHERE order_id = ?
    `).all(order.id);

    // Map current order status to milestone index
    const statusMap = {
      'Placed': 0,
      'Processing': 1,
      'Payment Verified': 1,
      'Packed': 2,
      'Shipped': 3,
      'Out for Delivery': 4,
      'Delivered': 5,
      'Cancelled': -1
    };

    const currentStageIndex = statusMap[order.status] !== undefined ? statusMap[order.status] : 1;

    const timeline = [
      {
        stage: 'Order Placed',
        status: currentStageIndex >= 0 ? 'completed' : 'pending',
        description: 'We have received your drape order.',
        timestamp: order.created_at
      },
      {
        stage: 'Payment Verified',
        status: currentStageIndex >= 1 ? 'completed' : (order.status === 'Cancelled' ? 'cancelled' : 'pending'),
        description: order.payment_status === 'Paid' ? 'Payment captured securely via Razorpay.' : 'Awaiting payment confirmation.',
        timestamp: order.created_at
      },
      {
        stage: 'Artisan Quality Check & Packed',
        status: currentStageIndex >= 2 ? 'completed' : (order.status === 'Cancelled' ? 'cancelled' : (currentStageIndex === 1 ? 'current' : 'pending')),
        description: 'Saree steamed, hand-checked for zari weave integrity, and placed in signature luxury gift box.',
        timestamp: currentStageIndex >= 2 ? 'Completed' : null
      },
      {
        stage: 'Handed to Courier Partner',
        status: currentStageIndex >= 3 ? 'completed' : (order.status === 'Cancelled' ? 'cancelled' : (currentStageIndex === 2 ? 'current' : 'pending')),
        description: `Dispatched with ${order.courier_partner || 'BlueDart Luxury Express'} (AWB: ${order.tracking_number || 'BLR-BD-' + order.id * 117})`,
        timestamp: currentStageIndex >= 3 ? 'In Transit' : null
      },
      {
        stage: 'Out for Delivery',
        status: currentStageIndex >= 4 ? 'completed' : (order.status === 'Cancelled' ? 'cancelled' : (currentStageIndex === 3 ? 'current' : 'pending')),
        description: 'Delivery associate assigned for doorstep handover.',
        timestamp: currentStageIndex >= 4 ? 'Out for Delivery' : null
      },
      {
        stage: 'Delivered',
        status: currentStageIndex >= 5 ? 'completed' : (order.status === 'Cancelled' ? 'cancelled' : 'pending'),
        description: 'Delivered to recipient with luxury unboxing package.',
        timestamp: currentStageIndex >= 5 ? order.estimated_delivery : `Expected by ${order.estimated_delivery || '3-4 business days'}`
      }
    ];

    // Return only minimum non-PII fields needed for tracking
    res.json({
      order: {
        order_number: order.order_number,
        tracking_number: order.tracking_number,
        courier_partner: order.courier_partner,
        estimated_delivery: order.estimated_delivery,
        status: order.status,
        timeline,
        currentStageIndex,
        isCancelled: order.status === 'Cancelled',
        items
      }
    });
  } catch (err) {
    console.error('Track order error:', err);
    res.status(500).json({ error: 'Failed to track order.' });
  }
});

// GET /api/orders/:id (Single order detail - Authenticated & Owner Checked)
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = (id || '').trim();
    const isNum = !isNaN(cleanId) && cleanId !== '';
    const numericId = isNum ? parseInt(cleanId, 10) : -1;

    const order = db.prepare(`
      SELECT * FROM orders 
      WHERE (id = ? OR order_number = ?) 
        AND (user_id = ? OR ? = 'admin')
    `).get(numericId, cleanId, req.user.id, req.user.role || 'user');

    if (!order) {
      return res.status(404).json({ error: 'Order not found or unauthorized.' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    let address = {};
    try {
      address = JSON.parse(order.address_data);
    } catch (e) {
      address = { raw: order.address_data };
    }

    res.json({ order: { ...order, address, items } });
  } catch (err) {
    console.error('Order fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

// POST /api/orders/cancel/:id
router.post('/cancel/:id', authenticateToken, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.status === 'Shipped' || order.status === 'Delivered') {
      return res.status(400).json({ error: 'Orders that are already shipped or delivered cannot be cancelled. Please contact concierge support for returns.' });
    }

    db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('Cancelled', order.id);

    res.json({ message: 'Order cancelled successfully. Refund will be credited within 3-5 business days.' });
  } catch (err) {
    console.error('Order cancellation error:', err);
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
});

// POST /api/orders/return/:id (Flipkart/Amazon style hassle-free 7-day return/exchange request)
router.post('/return/:id', authenticateToken, (req, res) => {
  try {
    const { reason, return_type = 'Return & Refund', pickup_date } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Please select a reason for return or exchange.' });
    }

    const returnStatus = return_type === 'Exchange' ? 'Exchange Requested' : 'Return Requested';
    db.prepare('UPDATE orders SET return_status = ?, return_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(returnStatus, `${reason.trim()} (Pickup requested on ${pickup_date || 'next business day'})`, order.id);

    res.json({
      message: `Your ${return_type.toLowerCase()} request has been scheduled. Our luxury courier concierge will pick up the parcel from your address on ${pickup_date || 'the next business day'}.`,
      return_status: returnStatus
    });
  } catch (err) {
    console.error('Order return request error:', err);
    res.status(500).json({ error: 'Failed to process return request.' });
  }
});

module.exports = router;

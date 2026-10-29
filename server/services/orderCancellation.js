const db = require('../db/database');
const { refundRazorpayPayment } = require('./razorpay');
const { buildRefundPayload } = require('../routes/payments');

/**
 * Shared order cancellation workflow supporting both customer and admin cancellation.
 * Performs all side effects atomically:
 * 1. Validates order status (rejecting Shipped, Out for Delivery, Delivered, Cancelled, and already Refunded orders).
 * 2. Persists/locks cancellation intent and restores inventory and coupons atomically with optimistic concurrency check (expectedVersion) BEFORE calling Razorpay.
 * 3. For paid orders, initiates idempotent Razorpay refund and reconciles the gateway result onto the order and payments ledger.
 *
 * @param {number|string} orderId
 * @param {object} options
 * @param {number} [options.userId] - Optional: enforce user ownership (for customer cancellation)
 * @param {number} [options.expectedVersion] - Optional: optimistic locking on order version
 * @param {string} [options.actor='customer'] - 'admin' or 'customer'
 * @param {string} [options.operatorId] - Admin operator ID for audit log if carrier updated
 * @param {string|null} [options.courierPartner] - Carrier if updated during admin status change
 * @param {string|null} [options.trackingNumber] - Tracking number if updated
 * @param {string|null} [options.estimatedDelivery] - Estimated delivery if updated
 * @param {boolean} [options.isExplicitCarrier] - Carrier assigned explicitly
 * @param {number} [options.existingExplicit] - Prior carrier_assigned_explicitly flag
 * @returns {Promise<{ success: boolean, order?: object, error?: string, statusCode?: number, refunded?: boolean, refundId?: string, payment_status?: string, message?: string }>}
 */
async function cancelOrder(orderId, options = {}) {
  const {
    userId,
    expectedVersion,
    actor = 'customer',
    operatorId,
    courierPartner,
    trackingNumber,
    estimatedDelivery,
    isExplicitCarrier = false,
    existingExplicit = 0
  } = options;

  let query = 'SELECT * FROM orders WHERE id = ?';
  const queryParams = [orderId];
  if (userId != null) {
    query += ' AND user_id = ?';
    queryParams.push(userId);
  }

  const order = db.prepare(query).get(...queryParams);
  if (!order) {
    return { error: 'Order not found.', statusCode: 404 };
  }

  if (order.status === 'Cancelled') {
    return { error: 'Order is already cancelled.', statusCode: 400 };
  }

  // Guard against cancelling dispatched or delivered shipments (including Out for Delivery)
  if (order.status === 'Shipped' || order.status === 'Out for Delivery' || order.status === 'Delivered') {
    return {
      error: 'Orders that are already shipped, out for delivery, or delivered cannot be cancelled. Please contact concierge support for returns.',
      statusCode: 400
    };
  }

  if (order.payment_status === 'Refunded' || order.payment_status === 'Refund_Pending') {
    return { error: 'Order cancellation and refund are already in progress or completed.', statusCode: 400 };
  }

  if (order.payment_status === 'Failed' || order.payment_status === 'Expired') {
    return { error: 'Order payment failed or expired; reservation has already been released.', statusCode: 400 };
  }

  const isPaid = order.payment_status === 'Paid';
  let paymentId = order.razorpay_payment_id || null;
  let initialIdempotencyKey = null;

  if (isPaid) {
    if (!paymentId) {
      const paymentRow = db.prepare('SELECT razorpay_payment_id FROM payments WHERE order_id = ? AND razorpay_payment_id IS NOT NULL ORDER BY id DESC LIMIT 1').get(order.id);
      paymentId = paymentRow?.razorpay_payment_id || null;
    }

    if (!paymentId) {
      return { error: 'Cannot cancel paid order without valid payment reference. Please contact concierge support.', statusCode: 400 };
    }

    initialIdempotencyKey = order.refund_idempotency_key || `rfnd_${order.id}_${order.order_number}`;
  }

  // Determine updated carrier and tracking fields
  const carrierVal = courierPartner !== undefined ? courierPartner : (order.courier_partner ? String(order.courier_partner).trim() : null);
  const trackingVal = trackingNumber !== undefined ? trackingNumber : null;
  const estDeliveryVal = estimatedDelivery !== undefined ? estimatedDelivery : null;

  // Initial target payment status when committing cancellation intent
  const lockedPaymentStatus = isPaid ? 'Refund_Pending' : (order.payment_status === 'Pending' ? 'Cancelled' : order.payment_status);

  // Phase 1: Atomically commit cancellation intent, lock refund-pending state, and restore stock/coupons
  // Enforces expectedVersion BEFORE calling external gateway so concurrent modifications fail closed with 409
  const commitCancellationIntentTx = db.transaction(() => {
    let whereClause = "id = ? AND status != 'Cancelled' AND status NOT IN ('Shipped', 'Out for Delivery', 'Delivered') AND payment_status NOT IN ('Failed', 'Expired', 'Refunded')";
    const whereParams = [order.id];

    if (userId != null) {
      whereClause += ' AND user_id = ?';
      whereParams.push(userId);
    }

    if (expectedVersion != null) {
      whereClause += ' AND (version = ? OR (version IS NULL AND ? = 1))';
      whereParams.push(expectedVersion, expectedVersion);
    }

    const updateRes = db.prepare(`
      UPDATE orders 
      SET status = 'Cancelled',
          payment_status = ?,
          razorpay_payment_id = COALESCE(?, razorpay_payment_id),
          refund_idempotency_key = COALESCE(?, refund_idempotency_key),
          tracking_number = COALESCE(?, tracking_number),
          courier_partner = ?,
          estimated_delivery = COALESCE(?, estimated_delivery),
          carrier_assigned_explicitly = CASE WHEN ? IS NULL THEN 0 WHEN ? = 1 THEN 1 ELSE ? END,
          version = COALESCE(version, 1) + 1,
          updated_at = CURRENT_TIMESTAMP 
      WHERE ${whereClause}
    `).run(
      lockedPaymentStatus,
      paymentId,
      initialIdempotencyKey,
      trackingVal,
      carrierVal,
      estDeliveryVal,
      carrierVal,
      isExplicitCarrier ? 1 : 0,
      existingExplicit,
      ...whereParams
    );

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

      if (isExplicitCarrier && operatorId) {
        db.prepare(`
          INSERT INTO carrier_assignment_audit (order_number, courier_partner, assigned_by, evidence_source)
          VALUES (?, ?, ?, 'admin-dashboard-status-update')
        `).run(order.order_number, carrierVal, operatorId);
      }

      return true;
    }
    return false;
  });

  const didCommitIntent = commitCancellationIntentTx();
  if (!didCommitIntent) {
    if (expectedVersion != null) {
      return { error: 'Order was updated by another session (atomic version conflict). Please reload and retry.', statusCode: 409 };
    }
    return { error: 'Order could not be cancelled or has already been cancelled.', statusCode: 400 };
  }

  // Phase 2: If the order was not paid, cancellation is fully complete
  if (!isPaid) {
    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    return {
      success: true,
      order: updatedOrder,
      message: 'Order cancelled successfully.'
    };
  }

  // Phase 3: For paid orders, the order is now locked in 'Cancelled' and 'Refund_Pending'
  // Issue the external refund via Razorpay and reconcile the result onto the database
  let refundResult = null;
  let refundError = null;
  try {
    const refundPayload = buildRefundPayload(order, initialIdempotencyKey);
    if (refundPayload.notes) {
      refundPayload.notes.reason = actor === 'admin' ? 'admin_cancellation' : 'customer_cancellation';
    }
    refundResult = await refundRazorpayPayment(paymentId, refundPayload);
  } catch (refErr) {
    console.error('Refund initiation error for cancelled order:', refErr);
    refundError = refErr.message || 'Refund initiation failed';
  }

  const isRefundProcessed = Boolean(refundResult && refundResult.status === 'processed');
  const isRefundFull = isRefundProcessed && (!refundResult.amount || refundResult.amount >= Math.round(order.total_amount * 100));
  const refundId = refundResult ? refundResult.id : null;

  // Reconcile gateway response idempotently onto orders and payments ledger
  db.transaction(() => {
    if (isRefundFull) {
      db.prepare(`
        UPDATE orders 
        SET payment_status = 'Refunded',
            refund_id = ?,
            refund_error = NULL,
            version = COALESCE(version, 1) + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(refundId, order.id);

      db.prepare(`
        UPDATE payments
        SET status = 'Refunded'
        WHERE order_id = ?
      `).run(order.id);
    } else if (refundId) {
      db.prepare(`
        UPDATE orders 
        SET refund_id = ?,
            refund_error = ?,
            version = COALESCE(version, 1) + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(refundId, refundError, order.id);
    } else if (refundError) {
      db.prepare(`
        UPDATE orders 
        SET refund_error = ?,
            version = COALESCE(version, 1) + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(refundError, order.id);
    }
  })();

  const finalOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  const isFullyRefunded = finalOrder.payment_status === 'Refunded';

  return {
    success: true,
    order: finalOrder,
    refunded: isFullyRefunded,
    refund_id: finalOrder.refund_id || refundId,
    payment_status: finalOrder.payment_status,
    message: isFullyRefunded
      ? 'Order cancelled successfully. A full refund has been credited to your original payment method.'
      : 'Order cancelled successfully. A refund has been initiated and will arrive within 3-5 business days.'
  };
}

module.exports = {
  cancelOrder
};

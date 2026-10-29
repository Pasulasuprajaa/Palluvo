const db = require('../db/database');
const { refundRazorpayPayment } = require('./razorpay');
const { buildRefundPayload } = require('../routes/payments');

/**
 * Shared order cancellation workflow supporting both customer and admin cancellation.
 * Performs all side effects atomically:
 * - Checks order lifecycle and payment state
 * - Initiates idempotent Razorpay refund for paid orders
 * - Updates payment_status and payments ledger
 * - Restores inventory (products and product_variants stock_quantity)
 * - Restores coupon usage
 * - Sets status = 'Cancelled' and advances monotonic version
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

  if (order.payment_status === 'Refunded' || order.payment_status === 'Refund_Pending') {
    return { error: 'Order cancellation and refund are already in progress or completed.', statusCode: 400 };
  }

  if (order.payment_status === 'Failed' || order.payment_status === 'Expired') {
    return { error: 'Order payment failed or expired; reservation has already been released.', statusCode: 400 };
  }

  if (order.status === 'Shipped' || order.status === 'Delivered') {
    return { error: 'Orders that are already shipped or delivered cannot be cancelled. Please contact concierge support for returns.', statusCode: 400 };
  }

  let finalPaymentStatus = order.payment_status;
  let refundId = order.refund_id || null;
  let refundError = null;
  let initialIdempotencyKey = order.refund_idempotency_key || null;
  let paymentId = order.razorpay_payment_id || null;
  let isRefundFull = false;

  // Persist and initiate idempotent refund workflow for captured paid orders
  if (order.payment_status === 'Paid') {
    if (!paymentId) {
      const paymentRow = db.prepare('SELECT razorpay_payment_id FROM payments WHERE order_id = ? AND razorpay_payment_id IS NOT NULL ORDER BY id DESC LIMIT 1').get(order.id);
      paymentId = paymentRow?.razorpay_payment_id || null;
    }

    if (!paymentId) {
      return { error: 'Cannot cancel paid order without valid payment reference. Please contact concierge support.', statusCode: 400 };
    }

    initialIdempotencyKey = order.refund_idempotency_key || `rfnd_${order.id}_${order.order_number}`;
    let refundResult = null;
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
    isRefundFull = isRefundProcessed && (!refundResult.amount || refundResult.amount >= Math.round(order.total_amount * 100));
    refundId = refundResult ? refundResult.id : null;
    finalPaymentStatus = isRefundFull ? 'Refunded' : 'Refund_Pending';
  }

  // Determine updated carrier and tracking fields
  const carrierVal = courierPartner !== undefined ? courierPartner : (order.courier_partner ? String(order.courier_partner).trim() : null);
  const trackingVal = trackingNumber !== undefined ? trackingNumber : null;
  const estDeliveryVal = estimatedDelivery !== undefined ? estimatedDelivery : null;

  const cancelTx = db.transaction(() => {
    let whereClause = "id = ? AND status != 'Cancelled' AND payment_status NOT IN ('Failed', 'Expired')";
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
          refund_id = ?,
          refund_error = ?,
          refund_idempotency_key = ?,
          tracking_number = COALESCE(?, tracking_number),
          courier_partner = ?,
          estimated_delivery = COALESCE(?, estimated_delivery),
          carrier_assigned_explicitly = CASE WHEN ? IS NULL THEN 0 WHEN ? = 1 THEN 1 ELSE ? END,
          version = COALESCE(version, 1) + 1,
          updated_at = CURRENT_TIMESTAMP 
      WHERE ${whereClause}
    `).run(
      finalPaymentStatus,
      paymentId,
      refundId,
      refundError,
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
      if (isRefundFull) {
        db.prepare(`
          UPDATE payments
          SET status = 'Refunded'
          WHERE order_id = ?
        `).run(order.id);
      }

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

  const didCancel = cancelTx();
  if (!didCancel) {
    if (expectedVersion != null) {
      return { error: 'Order was updated by another session (atomic version conflict). Please reload and retry.', statusCode: 409 };
    }
    return { error: 'Order could not be cancelled or has already been cancelled.', statusCode: 400 };
  }

  const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  const isFull = finalPaymentStatus === 'Refunded';

  return {
    success: true,
    order: updatedOrder,
    refunded: isFull,
    refund_id: refundId,
    payment_status: finalPaymentStatus,
    message: order.payment_status === 'Paid'
      ? (isFull
          ? 'Order cancelled successfully. A full refund has been credited to your original payment method.'
          : 'Order cancelled successfully. A refund has been initiated and will arrive within 3-5 business days.')
      : 'Order cancelled successfully.'
  };
}

module.exports = {
  cancelOrder
};

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const { authenticateToken, verifyCronSecret } = require('../middleware/auth');
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchRazorpayOrder,
  fetchRazorpayOrderPayments,
  fetchRazorpayPayment,
  fetchRazorpayRefund,
  fetchRazorpayPaymentRefunds,
  refundRazorpayPayment,
  isGatewayConfigured,
  key_id
} = require('../services/razorpay');
const { requireDurableStorage } = require('../middleware/storageGuard');

const ORDER_RESERVATION_TTL_MS = 15 * 60 * 1000; // 15-minute pending reservation TTL

/**
 * Helper to build identical refund payloads across initial verification and reconciliation retries.
 * Razorpay idempotency requires the request body to be identical when reusing a key.
 */
function buildRefundPayload(order, idempotencyKey) {
  return {
    amount: order.total_amount * 100,
    receipt: `rfnd_${order.order_number}`.slice(0, 40),
    idempotencyKey,
    notes: {
      order_id: order.id,
      order_number: order.order_number,
      idempotency_key: idempotencyKey,
      reason: 'Delayed payment on expired order with exhausted inventory'
    }
  };
}

/**
 * Reconciles pending or failed refunds until completion is positively confirmed by Razorpay.
 */
async function reconcilePendingRefunds(options = {}) {
  let query = `
    SELECT id, order_number, user_id, razorpay_order_id, razorpay_payment_id, total_amount, refund_id, payment_status, refund_error, refund_idempotency_key, failed_refund_id, refund_claimed_at, refund_claim_token
    FROM orders
    WHERE payment_status IN ('Refund_Pending', 'Refund_Failed')
      AND razorpay_payment_id IS NOT NULL
  `;
  const params = [];

  if (options && options.orderIds && Array.isArray(options.orderIds) && options.orderIds.length > 0) {
    const placeholders = options.orderIds.map(() => '?').join(', ');
    query += ` AND id IN (${placeholders})`;
    params.push(...options.orderIds);
  } else if (options && options.orderId) {
    query += ` AND id = ?`;
    params.push(options.orderId);
  }

  const pendingOrders = db.prepare(query).all(...params);

  if (!pendingOrders || pendingOrders.length === 0) {
    return 0;
  }

  let resolvedRefunds = 0;

  for (const pOrder of pendingOrders) {
    // Concurrency guard: Atomically claim order with unique owner token to prevent concurrent workers from issuing separate attempts
    const claimTime = Date.now();
    const lockTimeout = 60 * 1000; // 60-second lease
    const ownerToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const claimResult = db.prepare(`
      UPDATE orders
      SET refund_claimed_at = ?,
          refund_claim_token = ?
      WHERE id = ?
        AND (refund_claimed_at IS NULL OR refund_claimed_at < ?)
    `).run(claimTime, ownerToken, pOrder.id, claimTime - lockTimeout);

    if (claimResult.changes === 0) {
      // Another concurrent worker holds an active lease for this order; skip to prevent duplicate attempts
      continue;
    }

    let renewalInterval = null;
    try {
      // Lease renewal: keep active worker's lease from expiring during long gateway operations
      renewalInterval = setInterval(() => {
        try {
          db.prepare(`
            UPDATE orders
            SET refund_claimed_at = ?
            WHERE id = ? AND refund_claim_token = ?
          `).run(Date.now(), pOrder.id, ownerToken);
        } catch (renewErr) {
          // ignore renewal errors on closing/busy db
        }
      }, 15000);
      if (renewalInterval && renewalInterval.unref) {
        renewalInterval.unref();
      }
      const isMockPayment = typeof pOrder.razorpay_payment_id === 'string' &&
        (pOrder.razorpay_payment_id.startsWith('pay_mock_') || pOrder.razorpay_payment_id.startsWith('mock_'));
      if (!isMockPayment && !isGatewayConfigured) {
        console.warn(`No Razorpay client configured for real payment order ${pOrder.id} (${pOrder.razorpay_payment_id}); keeping refund pending.`);
        continue;
      }

      let isCompleted = false;
      let isPending = false;
      let finalRefundId = pOrder.refund_id;
      let pendingRefundId = null;
      let hasLookupError = false;
      let confirmedFailedOrCancelled = false;
      const currentConfirmedFailedIds = [];

      // 1. Inspect existing refund status if a refund ID exists
      if (pOrder.refund_id) {
        try {
          const refund = await fetchRazorpayRefund(pOrder.refund_id);
          if (refund) {
            if (refund.status === 'processed') {
              isCompleted = true;
              finalRefundId = refund.id;
            } else if (refund.status === 'pending') {
              isPending = true;
              pendingRefundId = refund.id;
            } else if (refund.status === 'failed' || refund.status === 'cancelled') {
              confirmedFailedOrCancelled = true;
              if (refund.id && !currentConfirmedFailedIds.includes(refund.id)) {
                currentConfirmedFailedIds.push(refund.id);
              }
            }
          }
        } catch (e) {
          hasLookupError = true;
          console.warn(`Lookup for refund ${pOrder.refund_id} failed:`, e.message);
        }
      }

      // 2. Inspect payment refund list from gateway
      let refunds = [];
      if (!isCompleted) {
        try {
          refunds = await fetchRazorpayPaymentRefunds(pOrder.razorpay_payment_id);
          const processed = refunds.find(r => r.status === 'processed');
          if (processed) {
            isCompleted = true;
            finalRefundId = processed.id;
          } else {
            const pending = refunds.find(r => r.status === 'pending');
            if (pending) {
              isPending = true;
              if (!pendingRefundId) {
                pendingRefundId = pending.id;
              }
            } else if (refunds.length > 0 && refunds.every(r => r.status === 'failed' || r.status === 'cancelled')) {
              confirmedFailedOrCancelled = true;
              for (const r of refunds) {
                if (r && r.id && !currentConfirmedFailedIds.includes(r.id)) {
                  currentConfirmedFailedIds.push(r.id);
                }
              }
            }
          }
        } catch (e) {
          hasLookupError = true;
          console.warn(`Lookup for payment refunds ${pOrder.razorpay_payment_id} failed:`, e.message);
        }
      }

      // 3. Inspect payment object amount_refunded
      if (!isCompleted) {
        try {
          const payment = await fetchRazorpayPayment(pOrder.razorpay_payment_id);
          if (payment && (payment.amount_refunded >= payment.amount || payment.refund_status === 'full' || payment.status === 'refunded')) {
            isCompleted = true;
          }
        } catch (e) {
          hasLookupError = true;
          console.warn(`Lookup for payment ${pOrder.razorpay_payment_id} failed:`, e.message);
        }
      }

      // Step A: Completed / Processed Refund confirmed
      if (isCompleted) {
        db.transaction(() => {
          db.prepare(`
            UPDATE orders
            SET payment_status = 'Refunded',
                refund_id = ?,
                refund_error = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(finalRefundId, pOrder.id);

          db.prepare(`
            UPDATE payments
            SET status = 'Refunded'
            WHERE order_id = ?
          `).run(pOrder.id);
        })();

        resolvedRefunds++;
        continue;
      }

      // Step B: In-flight / Pending Refund detected
      // Retain existing pending refund; NEVER resubmit or overwrite while refund is pending
      if (isPending) {
        const retainedRefundId = pendingRefundId || pOrder.refund_id;
        db.prepare(`
          UPDATE orders
          SET payment_status = 'Refund_Pending',
              refund_id = ?,
              refund_error = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(retainedRefundId, pOrder.id);

        console.info(`Refund ${retainedRefundId} for order ${pOrder.id} is pending; retaining in-flight refund without resubmission.`);
        continue;
      }

      // Step C: Gateway lookup uncertainty
      // If gateway lookup failed, do not assume state or retry; retain pending status
      if (hasLookupError) {
        console.warn(`Refund status lookup uncertain for order ${pOrder.id}; preserving pending status and skipping retry.`);
        continue;
      }

      // Step D: Only retry after Razorpay confirms previous attempt failed/cancelled,
      // or if retrying an ambiguous in-flight attempt under an existing key,
      // or if no prior refund was ever created at Razorpay.
      const hasPriorRefundAttempt = Boolean(pOrder.refund_id || (refunds && refunds.length > 0));
      const canRetry = !hasPriorRefundAttempt ||
        confirmedFailedOrCancelled ||
        (refunds.length > 0 && refunds.every(r => r.status === 'failed' || r.status === 'cancelled')) ||
        Boolean(pOrder.refund_idempotency_key);

      if (!canRetry) {
        console.warn(`Previous refund attempt for order ${pOrder.id} not confirmed failed/cancelled by gateway; skipping retry.`);
        continue;
      }

      // 4. Retry initiating refund:
      // - Persist/claim a fresh key ONCE when a previous attempt is confirmed failed/cancelled.
      // - For subsequent ambiguous retries, REUSE that attempt's key until its status is confirmed by the gateway.
      try {
        let idempotencyKey;

        // Parse already recorded failed refund IDs:
        const recordedFailedIds = (pOrder.failed_refund_id || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        // Check if there are any confirmed failed refund IDs from either lookup source
        // that have not yet been recorded in failed_refund_id:
        const hasUnrecordedFailure = confirmedFailedOrCancelled &&
          currentConfirmedFailedIds.length > 0 &&
          currentConfirmedFailedIds.some(id => !recordedFailedIds.includes(id));

        if (hasUnrecordedFailure) {
          // Confirmed failed attempt: Razorpay requires a fresh key for a distinct attempt.
          // Persist the new key and record all confirmed failed refund IDs immediately so subsequent retries reuse this key.
          idempotencyKey = `rfnd_${pOrder.id}_${pOrder.order_number}_att_${Date.now()}`;
          const allFailedIds = Array.from(new Set([...recordedFailedIds, ...currentConfirmedFailedIds])).join(',');
          db.prepare(`
            UPDATE orders
            SET refund_idempotency_key = ?,
                failed_refund_id = ?,
                refund_id = NULL
            WHERE id = ?
          `).run(idempotencyKey, allFailedIds, pOrder.id);
        } else {
          // Ambiguous retry or continuation of existing attempt:
          // Reuse the stored idempotency key to satisfy Razorpay's idempotency guarantee.
          idempotencyKey = pOrder.refund_idempotency_key || `rfnd_${pOrder.id}_${pOrder.order_number}`;
          if (!pOrder.refund_idempotency_key) {
            db.prepare('UPDATE orders SET refund_idempotency_key = ? WHERE id = ?').run(idempotencyKey, pOrder.id);
          }
        }

        const refundPayload = buildRefundPayload(pOrder, idempotencyKey);
        const refundResult = await refundRazorpayPayment(pOrder.razorpay_payment_id, refundPayload);

        if (refundResult && refundResult.status === 'processed') {
          db.transaction(() => {
            db.prepare(`
              UPDATE orders
              SET payment_status = 'Refunded',
                  refund_id = ?,
                  refund_error = NULL,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(refundResult.id, pOrder.id);

            db.prepare(`
              UPDATE payments
              SET status = 'Refunded'
              WHERE order_id = ?
            `).run(pOrder.id);
          })();

          resolvedRefunds++;
        } else if (refundResult && refundResult.status === 'pending') {
          db.prepare(`
            UPDATE orders
            SET payment_status = 'Refund_Pending',
                refund_id = ?,
                refund_error = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(refundResult.id, pOrder.id);
        } else if (refundResult && (refundResult.status === 'failed' || refundResult.status === 'cancelled')) {
          db.prepare(`
            UPDATE orders
            SET payment_status = 'Refund_Failed',
                refund_id = ?,
                refund_error = 'Gateway reported refund failure',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(refundResult.id, pOrder.id);
        }
      } catch (retryErr) {
        console.warn(`Refund retry failed for order ${pOrder.id}:`, retryErr.message);
        db.prepare(`
          UPDATE orders
          SET payment_status = 'Refund_Failed',
              refund_error = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(retryErr.message, pOrder.id);
      }
    } catch (err) {
      console.error(`Refund reconciliation error for order ${pOrder.id}:`, err);
    } finally {
      if (renewalInterval) {
        clearInterval(renewalInterval);
      }
      try {
        // Conditioned release: release claim only if this worker still owns the claim token
        db.prepare(`
          UPDATE orders
          SET refund_claimed_at = NULL,
              refund_claim_token = NULL
          WHERE id = ? AND refund_claim_token = ?
        `).run(pOrder.id, ownerToken);
      } catch (claimErr) {
        console.warn(`Failed to release claim on order ${pOrder.id}:`, claimErr.message);
      }
    }
  }

  return resolvedRefunds;
}

/**
 * Payment-aware reconciliation of expired order reservations.
 * 
 * Before releasing inventory or cancelling, the gateway order status is inspected
 * with Razorpay. If Razorpay shows the order has been paid/captured, the reservation
 * is retained and the order is marked 'Paid' instead of being cancelled.
 * If the gateway lookup times out or fails, the reservation is KEPT PENDING and retried.
 * Stock/coupon reservations are ONLY released when the gateway positively confirms unpaid status.
 */
async function reconcileExpiredReservations(options = {}) {
  const now = options.now || Date.now();
  const cutoffSql = new Date(now - ORDER_RESERVATION_TTL_MS).toISOString().replace('T', ' ').slice(0, 19);

  let reconciledCount = 0;

  // 1. Reconcile any pending or retrying refunds
  const resolvedRefunds = await reconcilePendingRefunds(options);
  reconciledCount += resolvedRefunds;

  // 2. Find pending orders that have exceeded their reservation lifetime
  const expiredOrders = db.prepare(`
    SELECT id, order_number, user_id, razorpay_order_id, coupon_code, total_amount
    FROM orders 
    WHERE payment_status = 'Pending'
      AND status != 'Cancelled'
      AND (
        (expires_at IS NOT NULL AND expires_at <= ?)
        OR (expires_at IS NULL AND created_at <= ?)
      )
  `).all(now, cutoffSql);

  if (!expiredOrders || expiredOrders.length === 0) {
    return reconciledCount;
  }

  for (const expOrder of expiredOrders) {
    try {
      let gatewayOrder = null;
      let gatewayConfirmedUnpaid = false;

      // 1. Gateway Status Check: Verify with Razorpay before cancelling
      if (expOrder.razorpay_order_id) {
        const isMockOrder = typeof expOrder.razorpay_order_id === 'string' && expOrder.razorpay_order_id.startsWith('order_mock_');
        if (!isMockOrder && !isGatewayConfigured) {
          console.warn(`No Razorpay client configured for real gateway order ${expOrder.id} (${expOrder.razorpay_order_id}); preserving reservation as pending.`);
          continue;
        }

        try {
          gatewayOrder = await fetchRazorpayOrder(expOrder.razorpay_order_id);
        } catch (fetchErr) {
          console.warn(`Gateway status lookup failed for order ${expOrder.id} (${expOrder.razorpay_order_id}); keeping reservation pending:`, fetchErr.message);
          // State is UNKNOWN (network timeout / temporary failure / unconfigured client): DO NOT release stock!
          continue;
        }

        if (!gatewayOrder) {
          // Inconclusive status: keep reservation pending and retry on next run
          continue;
        }

        // If Razorpay reports that the customer actually completed payment:
        const isPaid = gatewayOrder.status === 'paid' || (gatewayOrder.amount_paid && gatewayOrder.amount_paid > 0);
        if (isPaid) {
          let payments = [];
          try {
            payments = await fetchRazorpayOrderPayments(expOrder.razorpay_order_id);
          } catch (pErr) {
            console.warn(`Gateway payments fetch failed for order ${expOrder.id}:`, pErr.message);
          }
          const successfulPayment = payments.find(p => p.status === 'captured') || payments[0];
          const paymentId = successfulPayment ? successfulPayment.id : `pay_rec_${Date.now()}`;

          const paidTx = db.transaction(() => {
            const updateRes = db.prepare(`
              UPDATE orders
              SET payment_status = 'Paid',
                  status = 'Placed',
                  razorpay_payment_id = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND payment_status = 'Pending'
            `).run(paymentId, expOrder.id);

            if (updateRes.changes > 0) {
              db.prepare(`
                INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
                VALUES (?, ?, ?, 'gateway_reconciled', ?, 'INR', 'Captured', 'Razorpay')
              `).run(expOrder.id, expOrder.razorpay_order_id, paymentId, (gatewayOrder.amount_paid || expOrder.total_amount * 100));

              db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(expOrder.user_id);
              return true;
            }
            return false;
          });

          if (paidTx()) {
            reconciledCount++;
            continue; // Successfully recovered as Paid, DO NOT cancel or release stock
          }
        }

        // Gateway order exists and is not reported paid.
        // Check payments list to verify no captured payment exists
        let payments = [];
        try {
          payments = await fetchRazorpayOrderPayments(expOrder.razorpay_order_id);
        } catch (pErr) {
          console.warn(`Gateway payments check failed for order ${expOrder.id}; preserving reservation:`, pErr.message);
          // Payment state unknown: keep pending and retry
          continue;
        }

        const capturedPayment = payments.find(p => p.status === 'captured');
        if (capturedPayment) {
          const paymentId = capturedPayment.id;
          const paidTx = db.transaction(() => {
            const updateRes = db.prepare(`
              UPDATE orders
              SET payment_status = 'Paid',
                  status = 'Placed',
                  razorpay_payment_id = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND payment_status = 'Pending'
            `).run(paymentId, expOrder.id);

            if (updateRes.changes > 0) {
              db.prepare(`
                INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
                VALUES (?, ?, ?, 'gateway_reconciled', ?, 'INR', 'Captured', 'Razorpay')
              `).run(expOrder.id, expOrder.razorpay_order_id, paymentId, (capturedPayment.amount || expOrder.total_amount * 100));

              db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(expOrder.user_id);
              return true;
            }
            return false;
          });

          if (paidTx()) {
            reconciledCount++;
            continue;
          }
        }

        // Positively confirmed unpaid: gateway order exists, amount_paid == 0, and no captured payments
        gatewayConfirmedUnpaid = true;
      } else {
        // No gateway order ID was ever created for this order
        gatewayConfirmedUnpaid = true;
      }

      if (!gatewayConfirmedUnpaid) {
        continue;
      }

      // 2. Gateway positively confirms order is NOT paid: release reservation exactly once
      const releaseTx = db.transaction(() => {
        const updateRes = db.prepare(`
          UPDATE orders
          SET payment_status = 'Expired',
              status = 'Cancelled',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND payment_status = 'Pending' AND status != 'Cancelled'
        `).run(expOrder.id);

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

      if (releaseTx()) {
        reconciledCount++;
      }
    } catch (err) {
      console.error(`Error during payment-aware reconciliation for order ${expOrder.id}:`, err);
    }
  }

  return reconciledCount;
}

/**
 * Reconciles a single order if it has expired, checking gateway status first
 */
async function reconcileSingleExpiredOrder(orderId, now = Date.now()) {
  const cutoffSql = new Date(now - ORDER_RESERVATION_TTL_MS).toISOString().replace('T', ' ').slice(0, 19);
  const order = db.prepare(`
    SELECT id, order_number, user_id, razorpay_order_id, coupon_code, total_amount, expires_at, created_at, payment_status, status
    FROM orders
    WHERE id = ?
  `).get(orderId);

  if (!order || order.payment_status !== 'Pending' || order.status === 'Cancelled') {
    return false;
  }

  const isExpired = (order.expires_at && order.expires_at <= now) ||
    (!order.expires_at && order.created_at <= cutoffSql);

  if (!isExpired) return false;

  let gatewayOrder = null;
  let gatewayConfirmedUnpaid = false;

  if (order.razorpay_order_id) {
    const isMockOrder = typeof order.razorpay_order_id === 'string' && order.razorpay_order_id.startsWith('order_mock_');
    if (!isMockOrder && !isGatewayConfigured) {
      console.warn(`No Razorpay client configured for real gateway order ${order.id} (${order.razorpay_order_id}); preserving reservation.`);
      return false;
    }

    try {
      gatewayOrder = await fetchRazorpayOrder(order.razorpay_order_id);
    } catch (err) {
      console.warn(`Gateway check failed for order ${order.id}; keeping pending:`, err.message);
      return false; // Unknown status, do not cancel
    }

    if (!gatewayOrder) return false;

    if (gatewayOrder.status === 'paid' || (gatewayOrder.amount_paid && gatewayOrder.amount_paid > 0)) {
      let payments = [];
      try {
        payments = await fetchRazorpayOrderPayments(order.razorpay_order_id);
      } catch (pErr) {
        console.warn(`Gateway payments fetch failed for order ${order.id}:`, pErr.message);
      }
      const successfulPayment = payments.find(p => p.status === 'captured') || payments[0];
      const paymentId = successfulPayment ? successfulPayment.id : `pay_rec_${Date.now()}`;

      const paidTx = db.transaction(() => {
        const updateRes = db.prepare(`
          UPDATE orders
          SET payment_status = 'Paid',
              status = 'Placed',
              razorpay_payment_id = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND payment_status = 'Pending'
        `).run(paymentId, order.id);

        if (updateRes.changes > 0) {
          db.prepare(`
            INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
            VALUES (?, ?, ?, 'gateway_reconciled', ?, 'INR', 'Captured', 'Razorpay')
          `).run(order.id, order.razorpay_order_id, paymentId, (gatewayOrder.amount_paid || order.total_amount * 100));

          db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(order.user_id);
          return true;
        }
        return false;
      });

      return paidTx();
    }

    let payments = [];
    try {
      payments = await fetchRazorpayOrderPayments(order.razorpay_order_id);
    } catch (pErr) {
      console.warn(`Gateway payments check failed for order ${order.id}; keeping pending:`, pErr.message);
      return false;
    }

    const capturedPayment = payments.find(p => p.status === 'captured');
    if (capturedPayment) {
      const paymentId = capturedPayment.id;
      const paidTx = db.transaction(() => {
        const updateRes = db.prepare(`
          UPDATE orders
          SET payment_status = 'Paid',
              status = 'Placed',
              razorpay_payment_id = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND payment_status = 'Pending'
        `).run(paymentId, order.id);

        if (updateRes.changes > 0) {
          db.prepare(`
            INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
            VALUES (?, ?, ?, 'gateway_reconciled', ?, 'INR', 'Captured', 'Razorpay')
          `).run(order.id, order.razorpay_order_id, paymentId, (capturedPayment.amount || order.total_amount * 100));

          db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(order.user_id);
          return true;
        }
        return false;
      });

      return paidTx();
    }

    gatewayConfirmedUnpaid = true;
  } else {
    gatewayConfirmedUnpaid = true;
  }

  if (!gatewayConfirmedUnpaid) return false;

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
    reconcileExpiredReservations().catch(err => {
      console.error('Periodic order reservation reconciliation error:', err);
    });
  }, 60 * 1000);
  if (reconciliationInterval.unref) reconciliationInterval.unref();
}

// GET /api/payments/reconcile (Scheduled Vercel Cron and monitoring endpoint)
router.get('/reconcile', verifyCronSecret, async (req, res) => {
  try {
    const reconciledCount = await reconcileExpiredReservations();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      reconciledCount
    });
  } catch (err) {
    console.error('Reconciliation endpoint error:', err);
    res.status(500).json({ error: 'Reconciliation failed' });
  }
});

// Reject non-GET requests to the reconciliation endpoint
router.all('/reconcile', (req, res) => {
  res.setHeader('Allow', 'GET');
  res.status(405).json({ error: 'Method not allowed. Scheduled reconciliation endpoint only accepts GET requests.' });
});

// POST /api/payments/create-order
router.post('/create-order', authenticateToken, requireDurableStorage, async (req, res) => {
  try {
    // Reconcile any abandoned reservations before validating stock and coupons
    await reconcileExpiredReservations();

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
router.post('/verify', authenticateToken, requireDurableStorage, async (req, res) => {
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

    // 2. Reject already terminal completed states
    if (order.payment_status === 'Paid') {
      return res.status(400).json({ error: 'Order has already been paid and processed.' });
    }
    if (order.payment_status === 'Refunded') {
      return res.status(400).json({ error: 'Order has already been refunded.' });
    }
    if (order.payment_status === 'Refund_Pending') {
      return res.status(409).json({
        error: 'Order refund is currently in progress. Our automated reconciler will confirm completion.',
        payment_status: 'Refund_Pending',
        refunded: false,
        refund_id: order.refund_id,
        order_number: order.order_number
      });
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
      // Reject non-pending / cancelled orders on invalid signature replay
      if (order.payment_status !== 'Pending' || order.status === 'Cancelled') {
        return res.status(400).json({ error: 'Payment signature verification failed for finalized order.' });
      }

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

    // 5. Signature IS VALID: Customer was charged at gateway
    // Standard Active Path: Order is currently Pending (reservation still held)
    if (order.payment_status === 'Pending') {
      const updateResult = db.prepare(`
        UPDATE orders SET
          payment_status = 'Paid',
          status = 'Placed',
          razorpay_payment_id = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ? AND payment_status = 'Pending'
      `).run(razorpay_payment_id, order.id, req.user.id);

      if (updateResult.changes > 0) {
        db.prepare(`
          INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
          VALUES (?, ?, ?, ?, ?, 'INR', 'Captured', 'Razorpay')
        `).run(order.id, razorpay_order_id, razorpay_payment_id, razorpay_signature, order.total_amount * 100);

        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

        let parsedAddress = {};
        try {
          parsedAddress = JSON.parse(order.address_data);
        } catch (e) {
          parsedAddress = { raw: order.address_data };
        }

        const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

        return res.json({
          success: true,
          message: '✨ Payment verified successfully! Your PALLUVO journey has begun.',
          order: {
            ...updatedOrder,
            address: parsedAddress,
            items
          }
        });
      }
    }

    // 6. Delayed Payment Handling for already Expired/Cancelled orders:
    // A captured payment arrived after the local reservation TTL had expired.
    // Check if the items can be re-reserved and the order recovered:
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    let canFulfill = true;
    for (const item of items) {
      const prod = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id);
      if (!prod || prod.stock_quantity < item.quantity) {
        canFulfill = false;
        break;
      }
      if (item.variant_id) {
        const v = db.prepare('SELECT stock_quantity FROM product_variants WHERE id = ?').get(item.variant_id);
        if (!v || v.stock_quantity < item.quantity) {
          canFulfill = false;
          break;
        }
      }
    }

    // Fulfilment Recovery: Re-reserve inventory and fulfill order
    if (canFulfill) {
      const recoverTx = db.transaction(() => {
        for (const item of items) {
          db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?')
            .run(item.quantity, item.product_id, item.quantity);
          if (item.variant_id) {
            db.prepare('UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?')
              .run(item.quantity, item.variant_id, item.quantity);
          }
        }
        if (order.coupon_code) {
          db.prepare('UPDATE coupons SET times_used = times_used + 1 WHERE code = ?').run(order.coupon_code);
        }

        db.prepare(`
          UPDATE orders SET
            payment_status = 'Paid',
            status = 'Placed',
            razorpay_payment_id = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `).run(razorpay_payment_id, order.id, req.user.id);

        db.prepare(`
          INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
          VALUES (?, ?, ?, ?, ?, 'INR', 'Captured', 'Razorpay')
        `).run(order.id, razorpay_order_id, razorpay_payment_id, razorpay_signature, order.total_amount * 100);

        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
      });

      recoverTx();

      let parsedAddress = {};
      try {
        parsedAddress = JSON.parse(order.address_data);
      } catch (e) {
        parsedAddress = { raw: order.address_data };
      }

      const recoveredOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);

      return res.json({
        success: true,
        recovered: true,
        message: '✨ Payment verified! Your order reservation was recovered and placed successfully.',
        order: {
          ...recoveredOrder,
          address: parsedAddress,
          items
        }
      });
    }

    // Automated Refund Recovery: Items are no longer in stock
    let refundResult = null;
    let refundError = null;
    const initialIdempotencyKey = order.refund_idempotency_key || `rfnd_${order.id}_${order.order_number}`;
    try {
      const refundPayload = buildRefundPayload(order, initialIdempotencyKey);
      refundResult = await refundRazorpayPayment(razorpay_payment_id, refundPayload);
    } catch (refErr) {
      console.error('Automated refund error for expired order:', refErr);
      refundError = refErr.message || 'Refund initiation failed';
    }

    const isRefundProcessed = Boolean(refundResult && refundResult.status === 'processed');
    const isRefundPending = Boolean(refundResult && refundResult.status === 'pending');
    const refundId = refundResult ? refundResult.id : null;
    const finalPaymentStatus = isRefundProcessed ? 'Refunded' : 'Refund_Pending';
    const paymentRecordStatus = isRefundProcessed ? 'Refunded' : (isRefundPending ? 'Refund_Pending' : 'Captured');

    db.transaction(() => {
      db.prepare(`
        UPDATE orders SET
          payment_status = ?,
          status = 'Cancelled',
          razorpay_payment_id = ?,
          refund_id = ?,
          refund_error = ?,
          refund_idempotency_key = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(finalPaymentStatus, razorpay_payment_id, refundId, refundError, initialIdempotencyKey, order.id, req.user.id);

      db.prepare(`
        INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
        VALUES (?, ?, ?, ?, ?, 'INR', ?, 'Razorpay')
      `).run(order.id, razorpay_order_id, razorpay_payment_id, razorpay_signature, order.total_amount * 100, paymentRecordStatus);
    })();

    if (isRefundProcessed) {
      return res.status(409).json({
        error: 'Payment was charged, but the checkout reservation expired and the selected saree is no longer in stock. A full refund has been completed to your original payment method.',
        payment_status: 'Refunded',
        refunded: true,
        refund_id: refundId,
        order_number: order.order_number
      });
    }

    return res.status(409).json({
      error: 'Payment was charged, but the checkout reservation expired and the selected saree is no longer in stock. A full refund has been initiated and is currently processing. Our automated reconciler will confirm completion.',
      payment_status: 'Refund_Pending',
      refunded: false,
      refund_id: refundId,
      order_number: order.order_number
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'Internal server error while verifying payment.' });
  }
});

module.exports = router;
module.exports.reconcileExpiredReservations = reconcileExpiredReservations;
module.exports.reconcileSingleExpiredOrder = reconcileSingleExpiredOrder;
module.exports.reconcilePendingRefunds = reconcilePendingRefunds;
module.exports.ORDER_RESERVATION_TTL_MS = ORDER_RESERVATION_TTL_MS;

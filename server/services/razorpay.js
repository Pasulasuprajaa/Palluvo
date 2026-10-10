const Razorpay = require('razorpay');
const crypto = require('crypto');

const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_palluvo2026';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_sec_palluvo_drape_magic_key';

const isProduction = process.env.NODE_ENV === 'production';

// Razorpay key mode validation:
// Live Mode keys strictly start with 'rzp_live_'
// Test Mode keys start with 'rzp_test_'
const isLiveKeyMode = Boolean(
  key_id &&
  key_secret &&
  key_id.startsWith('rzp_live_') &&
  !key_id.includes('sample') &&
  !key_id.includes('palluvo2026') &&
  key_secret !== 'rzp_sec_palluvo_drape_magic_key'
);

const isTestKeyMode = Boolean(
  key_id &&
  key_secret &&
  key_id.startsWith('rzp_test_') &&
  !key_id.includes('sample') &&
  !key_id.includes('palluvo2026') &&
  key_secret !== 'rzp_sec_palluvo_drape_magic_key'
);

// In production, only Live Mode (rzp_live_...) is permitted. Test-mode keys (rzp_test_...) are strictly rejected.
const isLiveCredentials = isProduction ? isLiveKeyMode : (isLiveKeyMode || isTestKeyMode);

let razorpayInstance = null;

if (isLiveCredentials) {
  try {
    razorpayInstance = new Razorpay({
      key_id: key_id,
      key_secret: key_secret
    });
  } catch (err) {
    console.warn('Razorpay instance initialization warning:', err.message);
  }
}

async function createRazorpayOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  // Amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(amount * 100);

  // In production: Fail closed if real gateway is disabled or mock order is attempted.
  // Mock order fallback is strictly restricted to non-production environments.
  const currentIsProduction = process.env.NODE_ENV === 'production' || isProduction;

  // Network isolation guard for tests and offline development:
  // Return simulated mock order without making outbound gateway calls (non-production only)
  if (process.env.DISABLE_REAL_GATEWAY === 'true') {
    if (currentIsProduction) {
      throw new Error('Real gateway calls are disabled via DISABLE_REAL_GATEWAY, but mock order fallback is strictly forbidden in production. Failing closed.');
    }
    const mockOrderId = 'order_mock_' + crypto.randomBytes(12).toString('hex');
    return {
      id: mockOrderId,
      amount: amountInPaise,
      currency,
      receipt,
      key_id: key_id || 'rzp_test_mock_palluvo',
      is_mock: true
    };
  }

  // In production: Fail closed unless genuine Live Mode credentials (rzp_live_...) are configured
  if (currentIsProduction) {
    if (!isLiveKeyMode || !razorpayInstance || key_id.startsWith('rzp_test_')) {
      throw new Error('Live Razorpay credentials (RAZORPAY_KEY_ID starting with rzp_live_ & RAZORPAY_KEY_SECRET) must be set in production. Test-mode keys (rzp_test_...) are strictly rejected.');
    }
    try {
      const options = {
        amount: amountInPaise,
        currency,
        receipt,
        notes
      };
      const order = await razorpayInstance.orders.create(options);
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: key_id,
        is_mock: false
      };
    } catch (error) {
      console.error('Razorpay live order error:', error.message);
      throw new Error('Payment gateway order creation failed.');
    }
  }

  // In development / test environment with configured gateway keys
  if (isLiveCredentials && razorpayInstance) {
    try {
      const options = {
        amount: amountInPaise,
        currency,
        receipt,
        notes
      };
      const order = await razorpayInstance.orders.create(options);
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: key_id,
        is_mock: false
      };
    } catch (error) {
      console.error('Razorpay sandbox order error:', error.message);
    }
  }

  // Non-production sandbox / simulator fallback order creation
  const mockOrderId = 'order_mock_' + crypto.randomBytes(12).toString('hex');
  return {
    id: mockOrderId,
    amount: amountInPaise,
    currency,
    receipt,
    key_id: key_id,
    is_mock: true
  };
}

function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature, is_mock_order = false }) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  // In production: Fail closed. Test-mode keys, mock orders, or mock signatures are unconditionally rejected
  if (isProduction) {
    if (!isLiveKeyMode || key_id.startsWith('rzp_test_') || is_mock_order || razorpay_signature.startsWith('mock_')) {
      return false;
    }

    try {
      const generated_signature = crypto
        .createHmac('sha256', key_secret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      const expectedBuffer = Buffer.from(generated_signature, 'utf8');
      const actualBuffer = Buffer.from(razorpay_signature, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  // In non-production with configured gateway (test or live key)
  if (isLiveCredentials && !is_mock_order) {
    if (razorpay_signature.startsWith('mock_')) {
      return false;
    }

    try {
      const generated_signature = crypto
        .createHmac('sha256', key_secret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      const expectedBuffer = Buffer.from(generated_signature, 'utf8');
      const actualBuffer = Buffer.from(razorpay_signature, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  // In non-production only: allow verified mock signature for explicitly marked sandbox mock orders
  if (!isProduction && is_mock_order && razorpay_order_id.startsWith('order_mock_')) {
    return razorpay_signature.startsWith('mock_verified_') || razorpay_signature.startsWith('mock_sig_');
  }

  return false;
}

async function fetchRazorpayOrder(orderId) {
  if (!orderId) return null;
  if (orderId.startsWith('order_mock_paid_')) {
    return {
      id: orderId,
      status: 'paid',
      amount_paid: 100000,
      is_mock: true
    };
  }
  if (orderId.startsWith('order_mock_failed_lookup_')) {
    throw new Error('Simulated gateway lookup failure (network timeout)');
  }
  if (orderId.startsWith('order_mock_')) {
    return {
      id: orderId,
      status: 'created',
      amount_paid: 0,
      is_mock: true
    };
  }

  // Real non-mock order ID: requires an active Razorpay client instance
  if (process.env.DISABLE_REAL_GATEWAY === 'true') {
    throw new Error(`Real Razorpay gateway calls are disabled in this environment (test isolation); order ${orderId} cannot be fetched`);
  }

  if (razorpayInstance) {
    const order = await razorpayInstance.orders.fetch(orderId);
    return order;
  }

  throw new Error(`Razorpay client instance is not configured; status of non-mock order ${orderId} is unknown`);
}

async function fetchRazorpayOrderPayments(orderId) {
  if (!orderId) return [];
  if (orderId.startsWith('order_mock_paid_')) {
    return [{
      id: `pay_mock_${orderId.slice(16) || 'test'}`,
      status: 'captured',
      amount: 100000,
      order_id: orderId
    }];
  }
  if (orderId.startsWith('order_mock_failed_lookup_')) {
    throw new Error('Simulated gateway payments lookup failure');
  }
  if (orderId.startsWith('order_mock_')) {
    return [];
  }

  // Real non-mock order ID: requires an active Razorpay client instance
  if (process.env.DISABLE_REAL_GATEWAY === 'true') {
    throw new Error(`Real Razorpay gateway calls are disabled in this environment (test isolation); payments for order ${orderId} cannot be fetched`);
  }

  if (razorpayInstance) {
    const payments = await razorpayInstance.orders.fetchPayments(orderId);
    return payments.items || [];
  }

  throw new Error(`Razorpay client instance is not configured; payments for non-mock order ${orderId} are unknown`);
}

async function fetchRazorpayPayment(paymentId) {
  if (!paymentId) return null;
  if (paymentId.startsWith('pay_mock_refund_failed_')) {
    return {
      id: paymentId,
      status: 'captured',
      amount: 100000,
      amount_refunded: 0,
      refund_status: null,
      is_mock: true
    };
  }
  if (paymentId.startsWith('pay_mock_refund_status_mismatch_')) {
    return {
      id: paymentId,
      status: 'refunded',
      amount: 500000,
      amount_refunded: 100000,
      refund_status: 'partial',
      is_mock: true
    };
  }
  if (paymentId.startsWith('pay_mock_refund_partial_')) {
    return {
      id: paymentId,
      status: 'captured',
      amount: 500000,
      amount_refunded: 100000,
      refund_status: 'partial',
      is_mock: true
    };
  }
  if (paymentId.startsWith('pay_mock_refund_paginated_')) {
    return {
      id: paymentId,
      status: 'captured',
      amount: 200000,
      amount_refunded: 0,
      refund_status: null,
      is_mock: true
    };
  }
  if (paymentId.startsWith('pay_mock_refund_balance_failed_') ||
      paymentId.startsWith('pay_mock_refund_balance_retry_fail_') ||
      paymentId.startsWith('pay_mock_refund_balance_pending_')) {
    return {
      id: paymentId,
      status: 'captured',
      amount: 500000,
      amount_refunded: 100000,
      refund_status: 'partial',
      is_mock: true
    };
  }
  if (paymentId.startsWith('pay_mock_refund_pending_')) {
    return {
      id: paymentId,
      status: 'captured',
      amount: 100000,
      amount_refunded: 0,
      refund_status: null,
      is_mock: true
    };
  }
  if (paymentId.startsWith('pay_mock_refunded_')) {
    return {
      id: paymentId,
      status: 'refunded',
      amount: 100000,
      amount_refunded: 100000,
      refund_status: 'full',
      is_mock: true
    };
  }
  if (paymentId.startsWith('pay_mock_') || paymentId.startsWith('mock_')) {
    return {
      id: paymentId,
      status: 'captured',
      amount: 100000,
      amount_refunded: 0,
      is_mock: true
    };
  }

  if (process.env.DISABLE_REAL_GATEWAY === 'true' && (!razorpayInstance || !razorpayInstance._isMock)) {
    throw new Error(`Real Razorpay gateway calls are disabled in this environment (test isolation); payment ${paymentId} cannot be fetched`);
  }

  if (razorpayInstance) {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return payment;
  }

  throw new Error(`Razorpay client instance is not configured; status of non-mock payment ${paymentId} is unknown`);
}

async function fetchRazorpayRefund(refundId) {
  if (!refundId) return null;
  if (refundId.startsWith('rfnd_mock_pending_')) {
    return {
      id: refundId,
      status: 'pending',
      is_mock: true
    };
  }
  if (refundId.startsWith('rfnd_mock_failed_')) {
    return {
      id: refundId,
      status: 'failed',
      is_mock: true
    };
  }
  if (refundId.startsWith('rfnd_mock_')) {
    return {
      id: refundId,
      status: 'processed',
      is_mock: true
    };
  }

  if (process.env.DISABLE_REAL_GATEWAY === 'true') {
    throw new Error(`Real Razorpay gateway calls are disabled in this environment (test isolation); refund ${refundId} cannot be fetched`);
  }

  if (razorpayInstance) {
    const refund = await razorpayInstance.refunds.fetch(refundId);
    return refund;
  }

  throw new Error(`Razorpay client instance is not configured; status of non-mock refund ${refundId} is unknown`);
}

async function fetchRazorpayPaymentRefunds(paymentId) {
  if (!paymentId) return [];
  if (paymentId.startsWith('pay_mock_refund_failed_lookup_')) {
    throw new Error('Simulated gateway refund lookup failure (network timeout)');
  }
  if (paymentId.startsWith('pay_mock_refund_status_mismatch_')) {
    return [{
      id: 'rfnd_mock_mismatch_partial_1',
      payment_id: paymentId,
      amount: 100000,
      status: 'processed',
      is_mock: true
    }];
  }
  if (paymentId.startsWith('pay_mock_refund_partial_')) {
    return [{
      id: 'rfnd_mock_partial_1',
      payment_id: paymentId,
      amount: 100000,
      status: 'processed',
      is_mock: true
    }];
  }
  if (paymentId.startsWith('pay_mock_refund_balance_failed_')) {
    return [
      {
        id: 'rfnd_mock_partial_1',
        payment_id: paymentId,
        amount: 100000,
        status: 'processed',
        is_mock: true
      },
      {
        id: 'rfnd_mock_failed_bal_1',
        payment_id: paymentId,
        amount: 400000,
        status: 'failed',
        is_mock: true
      }
    ];
  }
  if (paymentId.startsWith('pay_mock_refund_balance_retry_fail_')) {
    return [
      {
        id: 'rfnd_mock_partial_1',
        payment_id: paymentId,
        amount: 100000,
        status: 'processed',
        is_mock: true
      },
      {
        id: 'rfnd_mock_failed_bal_retry_1',
        payment_id: paymentId,
        amount: 400000,
        status: 'failed',
        is_mock: true
      }
    ];
  }
  if (paymentId.startsWith('pay_mock_refund_balance_pending_')) {
    return [
      {
        id: 'rfnd_mock_partial_1',
        payment_id: paymentId,
        amount: 100000,
        status: 'processed',
        is_mock: true
      },
      {
        id: 'rfnd_mock_pending_bal_1',
        payment_id: paymentId,
        amount: 400000,
        status: 'pending',
        is_mock: true
      }
    ];
  }
  if (paymentId.startsWith('pay_mock_refund_paginated_')) {
    // Simulated paginated list: page 1 has 100 failed refunds; page 2 has an older pending refund (item 101)
    const items = [];
    for (let i = 1; i <= 100; i++) {
      items.push({
        id: `rfnd_mock_paginated_failed_${i}`,
        payment_id: paymentId,
        amount: 200000,
        status: 'failed',
        is_mock: true
      });
    }
    // Older pending refund that falls outside the first page of 100 items (101st refund)
    items.push({
      id: 'rfnd_mock_paginated_older_pending',
      payment_id: paymentId,
      amount: 200000,
      status: 'pending',
      is_mock: true
    });
    return items;
  }
  if (paymentId.startsWith('pay_mock_refund_pending_')) {
    return [{
      id: 'rfnd_mock_pending_1',
      payment_id: paymentId,
      amount: 100000,
      status: 'pending',
      is_mock: true
    }];
  }
  if (paymentId.startsWith('pay_mock_refunded_')) {
    return [{
      id: 'rfnd_mock_processed_1',
      payment_id: paymentId,
      amount: 100000,
      status: 'processed',
      is_mock: true
    }];
  }
  if (paymentId.startsWith('pay_mock_refund_failed_')) {
    return [{
      id: 'rfnd_mock_failed_1',
      payment_id: paymentId,
      amount: 100000,
      status: 'failed',
      is_mock: true
    }];
  }
  if (paymentId.startsWith('pay_mock_') || paymentId.startsWith('mock_')) {
    return [];
  }

  if (process.env.DISABLE_REAL_GATEWAY === 'true' && (!razorpayInstance || !razorpayInstance._isMock)) {
    throw new Error(`Real Razorpay gateway calls are disabled in this environment (test isolation); refunds for payment ${paymentId} cannot be fetched`);
  }

  if (razorpayInstance) {
    // Page through all refund pages from Razorpay to guarantee complete visibility of in-flight and older refunds
    const allItems = [];
    let skip = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await razorpayInstance.payments.allRefunds(paymentId, {
        count: pageSize,
        skip: skip
      });
      const items = (response && Array.isArray(response.items)) ? response.items : [];
      allItems.push(...items);

      // Razorpay defines collection count as the number of items returned in that response (page count),
      // not the total count of matching refunds across all pages.
      // Therefore, pagination must continue while a page is full (items.length === pageSize),
      // unless response explicitly indicates has_more === false.
      if (!items || items.length < pageSize || (response && response.has_more === false)) {
        hasMore = false;
      } else {
        skip += items.length;
      }
    }

    return allItems;
  }

  throw new Error(`Razorpay client instance is not configured; refunds for non-mock payment ${paymentId} are unknown`);
}

async function refundRazorpayPayment(paymentId, options = {}) {
  if (!paymentId) throw new Error('Payment ID is required to process a refund.');

  const idempotencyKey = options.idempotencyKey || null;

  if (paymentId.startsWith('pay_mock_refund_failed_') || paymentId.startsWith('pay_mock_refund_balance_retry_fail_')) {
    throw new Error('Simulated gateway refund failure (network error)');
  }

  if (paymentId.startsWith('pay_mock_refund_pending_')) {
    return {
      id: 'rfnd_mock_pending_' + crypto.randomBytes(6).toString('hex'),
      payment_id: paymentId,
      amount: options.amount,
      status: 'pending',
      receipt: options.receipt || null,
      idempotency_key: idempotencyKey,
      headers: idempotencyKey ? { 'X-Refund-Idempotency': idempotencyKey } : {},
      is_mock: true
    };
  }

  if (paymentId.startsWith('pay_mock_') || paymentId.startsWith('mock_')) {
    return {
      id: 'rfnd_mock_' + crypto.randomBytes(8).toString('hex'),
      payment_id: paymentId,
      amount: options.amount,
      status: 'processed',
      receipt: options.receipt || null,
      idempotency_key: idempotencyKey,
      headers: idempotencyKey ? { 'X-Refund-Idempotency': idempotencyKey } : {},
      is_mock: true
    };
  }

  if (process.env.DISABLE_REAL_GATEWAY === 'true') {
    throw new Error(`Real Razorpay gateway calls are disabled in this environment (test isolation); cannot refund payment ${paymentId}`);
  }

  if (razorpayInstance) {
    const refundPayload = {
      amount: options.amount,
      notes: options.notes || {},
      speed: options.speed || 'normal'
    };
    if (options.receipt) {
      refundPayload.receipt = options.receipt;
    }

    const headers = {};
    if (idempotencyKey) {
      headers['X-Refund-Idempotency'] = idempotencyKey;
    }

    let refund;
    // Razorpay's refund API requires the X-Refund-Idempotency header for idempotency.
    // The underlying axios instance in razorpay SDK (razorpayInstance.api.rq) transmits custom headers.
    if (idempotencyKey && razorpayInstance.api && razorpayInstance.api.rq) {
      try {
        const response = await razorpayInstance.api.rq.post(
          `/v1/payments/${paymentId}/refund`,
          refundPayload,
          { headers }
        );
        refund = response.data;
      } catch (err) {
        if (err.response && err.response.data && err.response.data.error) {
          const apiError = new Error(err.response.data.error.description || 'Razorpay refund failed');
          apiError.statusCode = err.response.status;
          apiError.error = err.response.data.error;
          throw apiError;
        }
        throw err;
      }
    } else {
      refund = await razorpayInstance.payments.refund(paymentId, refundPayload);
    }
    return refund;
  }

  throw new Error(`Razorpay client instance is not configured; cannot process refund for non-mock payment ${paymentId}`);
}

function _setRazorpayInstanceForTest(instance) {
  razorpayInstance = instance;
}

function _getRazorpayInstanceForTest() {
  return razorpayInstance;
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchRazorpayOrder,
  fetchRazorpayOrderPayments,
  fetchRazorpayPayment,
  fetchRazorpayRefund,
  fetchRazorpayPaymentRefunds,
  refundRazorpayPayment,
  isLiveCredentials,
  isLiveKeyMode,
  isTestKeyMode,
  get isGatewayConfigured() {
    return Boolean(razorpayInstance && (process.env.DISABLE_REAL_GATEWAY !== 'true' || razorpayInstance._isMock));
  },
  key_id,
  key_secret,
  _setRazorpayInstanceForTest,
  _getRazorpayInstanceForTest
};

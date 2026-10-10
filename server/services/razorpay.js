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

  // In production: Fail closed unless genuine Live Mode credentials (rzp_live_...) are configured
  if (isProduction) {
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

  if (razorpayInstance) {
    // Fail loudly if Razorpay API call fails; do not return null to avoid false-unpaid assumptions
    const order = await razorpayInstance.orders.fetch(orderId);
    return order;
  }

  return {
    id: orderId,
    status: 'created',
    amount_paid: 0,
    is_mock: true
  };
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

  if (razorpayInstance) {
    const payments = await razorpayInstance.orders.fetchPayments(orderId);
    return payments.items || [];
  }

  return [];
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

  if (razorpayInstance) {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return payment;
  }

  return {
    id: paymentId,
    status: 'captured',
    amount: 100000,
    amount_refunded: 0,
    is_mock: true
  };
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
  if (refundId.startsWith('rfnd_mock_')) {
    return {
      id: refundId,
      status: 'processed',
      is_mock: true
    };
  }

  if (razorpayInstance) {
    const refund = await razorpayInstance.refunds.fetch(refundId);
    return refund;
  }

  return {
    id: refundId,
    status: 'processed',
    is_mock: true
  };
}

async function fetchRazorpayPaymentRefunds(paymentId) {
  if (!paymentId) return [];
  if (paymentId.startsWith('pay_mock_refund_pending_')) {
    return [{
      id: 'rfnd_mock_pending_1',
      payment_id: paymentId,
      status: 'pending',
      is_mock: true
    }];
  }
  if (paymentId.startsWith('pay_mock_refunded_')) {
    return [{
      id: 'rfnd_mock_processed_1',
      payment_id: paymentId,
      status: 'processed',
      is_mock: true
    }];
  }
  if (paymentId.startsWith('pay_mock_') || paymentId.startsWith('mock_')) {
    return [];
  }

  if (razorpayInstance) {
    const refunds = await razorpayInstance.payments.allRefunds(paymentId);
    return refunds.items || [];
  }

  return [];
}

async function refundRazorpayPayment(paymentId, options = {}) {
  if (!paymentId) throw new Error('Payment ID is required to process a refund.');

  if (paymentId.startsWith('pay_mock_refund_failed_')) {
    throw new Error('Simulated gateway refund failure (network error)');
  }

  if (paymentId.startsWith('pay_mock_refund_pending_')) {
    return {
      id: 'rfnd_mock_pending_' + crypto.randomBytes(6).toString('hex'),
      payment_id: paymentId,
      amount: options.amount,
      status: 'pending',
      is_mock: true
    };
  }

  if (paymentId.startsWith('pay_mock_') || paymentId.startsWith('mock_')) {
    return {
      id: 'rfnd_mock_' + crypto.randomBytes(8).toString('hex'),
      payment_id: paymentId,
      amount: options.amount,
      status: 'processed',
      is_mock: true
    };
  }

  if (razorpayInstance) {
    const refund = await razorpayInstance.payments.refund(paymentId, {
      amount: options.amount,
      notes: options.notes || {},
      speed: options.speed || 'normal'
    });
    return refund;
  }

  return {
    id: 'rfnd_mock_' + crypto.randomBytes(8).toString('hex'),
    payment_id: paymentId,
    amount: options.amount,
    status: 'processed',
    is_mock: true
  };
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
  key_id,
  key_secret
};

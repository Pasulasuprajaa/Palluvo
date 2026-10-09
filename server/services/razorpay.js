const Razorpay = require('razorpay');
const crypto = require('crypto');

const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_palluvo2026';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_sec_palluvo_drape_magic_key';

let razorpayInstance = null;

try {
  razorpayInstance = new Razorpay({
    key_id: key_id,
    key_secret: key_secret
  });
} catch (err) {
  console.warn('Razorpay instance initialization warning:', err.message);
}

const isProduction = process.env.NODE_ENV === 'production';

// Razorpay live keys start with 'rzp_live_', test keys start with 'rzp_test_'
const isLiveModeCredentials = Boolean(
  key_id &&
  key_secret &&
  key_id.startsWith('rzp_live_') &&
  !key_id.includes('sample') &&
  !key_id.includes('palluvo2026') &&
  key_secret !== 'rzp_sec_palluvo_drape_magic_key'
);

// Configured gateway keys for SDK initialization (live in prod, live/test in dev)
const isConfiguredGateway = Boolean(
  key_id &&
  key_secret &&
  !key_id.includes('sample') &&
  !key_id.includes('palluvo2026') &&
  key_secret !== 'rzp_sec_palluvo_drape_magic_key' &&
  (key_id.startsWith('rzp_live_') || (!isProduction && key_id.startsWith('rzp_test_')))
);

if (isConfiguredGateway) {
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

  if (isProduction) {
    if (!isLiveModeCredentials || !razorpayInstance) {
      throw new Error('Live Razorpay credentials (RAZORPAY_KEY_ID starting with rzp_live_ & RAZORPAY_KEY_SECRET) must be set in production.');
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

  if (isConfiguredGateway && razorpayInstance) {
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

  // Non-production sandbox / simulator order creation
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

  // Strictly disallow mock verification in production or for live credentials
  if (isProduction) {
    if (!isLiveModeCredentials || is_mock_order || razorpay_signature.startsWith('mock_')) {
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

  // In non-production with configured gateway
  if (isConfiguredGateway && !is_mock_order) {
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

  // In non-production only: allow verified mock signature for explicitly marked mock orders
  if (!isProduction && is_mock_order && razorpay_order_id.startsWith('order_mock_')) {
    return razorpay_signature.startsWith('mock_verified_') || razorpay_signature.startsWith('mock_sig_');
  }

  return false;
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  isLiveModeCredentials,
  isConfiguredGateway,
  key_id,
  key_secret
};

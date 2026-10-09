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

// Check if keys are real live/test keys or sandbox placeholders
const isLiveCredentials = Boolean(
  key_id &&
  key_secret &&
  !key_id.includes('sample') &&
  !key_id.includes('palluvo2026') &&
  key_secret !== 'rzp_sec_palluvo_drape_magic_key'
);

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
      console.error('Razorpay live order error:', error.message);
      if (isProduction) {
        throw new Error('Payment gateway order creation failed.');
      }
    }
  }

  // In production, live gateway credentials are required
  if (isProduction) {
    throw new Error('Live Razorpay credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) must be set in production.');
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

  // Strictly disallow mock verification in production, for live credentials, or for non-mock orders
  if (isProduction || isLiveCredentials || !is_mock_order) {
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
  isLiveCredentials,
  key_id,
  key_secret
};

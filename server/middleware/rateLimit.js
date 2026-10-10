const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Rate limiter for authentication attempts (login, register) to protect against credential-stuffing and brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 authentication requests per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMITED'
  }
});

// Targeted account protection: throttles attempts targeting the same email/account
const accountAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 attempts per targeted account in a 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body && typeof req.body.email === 'string') ? req.body.email.trim().toLowerCase() : '';
    if (email) {
      return `acct_${email}`;
    }
    return ipKeyGenerator(req);
  },
  message: {
    error: 'Too many login attempts for this account. Please wait 15 minutes before trying again.',
    code: 'ACCOUNT_RATE_LIMITED'
  }
});

// Rate limiter for public order tracking lookups to prevent enumeration / scanning attacks
const trackOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // Limit each IP to 25 tracking requests per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many order tracking requests from this IP. Please try again after 15 minutes.',
    code: 'TRACKING_RATE_LIMITED'
  }
});

// General API rate limiter for broad DoS and scraping prevention
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again later.',
    code: 'API_RATE_LIMITED'
  }
});

module.exports = {
  authLimiter,
  accountAuthLimiter,
  trackOrderLimiter,
  apiLimiter
};

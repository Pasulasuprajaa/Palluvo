const { rateLimit, ipKeyGenerator, MemoryStore } = require('express-rate-limit');

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NOW_REGION ||
  process.env.NETLIFY
);

/**
 * Shared distributed rate limit store supporting Vercel KV / Upstash Redis REST API.
 * In serverless environments (Vercel, AWS Lambda), a shared distributed store is required
 * and fails closed (HTTP 503) if unconfigured or unreachable to prevent distributed brute-force bypass.
 * In local development and non-serverless single-instance servers, falls back to process-local MemoryStore.
 */
class SharedRateLimitStore {
  constructor(prefix = 'rl') {
    this.prefix = prefix;
    this.localStore = new MemoryStore();
    this.windowMs = 15 * 60 * 1000;

    const restUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_URL;
    const restToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_TOKEN;

    if (restUrl && restToken) {
      this.restUrl = restUrl.replace(/\/$/, '');
      this.restToken = restToken;
      this.isShared = true;
    } else {
      this.isShared = false;
    }
  }

  init(options) {
    this.windowMs = options.windowMs || this.windowMs;
    this.localStore.init(options);
  }

  createStoreUnavailableError(details) {
    const err = new Error(
      `Shared rate limit storage is required for serverless deployments to prevent distributed quota bypass. ` +
      (details ? `(${details}) ` : '') +
      `Configure KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.`
    );
    err.status = 503;
    err.code = 'RATE_LIMIT_STORE_UNAVAILABLE';
    return err;
  }

  async get(key) {
    if (isServerless && !this.isShared) {
      throw this.createStoreUnavailableError('Missing shared KV/Redis credentials');
    }
    if (!this.isShared) {
      return this.localStore.get(key);
    }
    const fullKey = `palluvo:${this.prefix}:${key}`;
    try {
      const res = await fetch(`${this.restUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.restToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          ['GET', fullKey],
          ['TTL', fullKey]
        ])
      });
      if (!res.ok) throw new Error(`KV response status ${res.status}`);
      const data = await res.json();
      const count = parseInt(data[0]?.result, 10) || 0;
      const ttl = parseInt(data[1]?.result, 10) || -1;
      const resetTime = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : this.windowMs));
      return { totalHits: count, resetTime };
    } catch (err) {
      if (isServerless) {
        throw this.createStoreUnavailableError(err.message);
      }
      return this.localStore.get(key);
    }
  }

  async increment(key) {
    if (isServerless && !this.isShared) {
      throw this.createStoreUnavailableError('Missing shared KV/Redis credentials');
    }
    if (!this.isShared) {
      return this.localStore.increment(key);
    }
    const fullKey = `palluvo:${this.prefix}:${key}`;
    const windowSec = Math.max(1, Math.ceil(this.windowMs / 1000));
    try {
      const res = await fetch(`${this.restUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.restToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          ['INCR', fullKey],
          ['TTL', fullKey]
        ])
      });
      if (!res.ok) throw new Error(`KV response status ${res.status}`);
      const data = await res.json();
      const count = parseInt(data[0]?.result, 10) || 1;
      let ttl = parseInt(data[1]?.result, 10) || -1;

      // If the key was newly created and has no TTL, set expiration
      if (ttl === -1 || count === 1) {
        fetch(`${this.restUrl}/EXPIRE/${encodeURIComponent(fullKey)}/${windowSec}`, {
          headers: { Authorization: `Bearer ${this.restToken}` }
        }).catch(() => {});
        ttl = windowSec;
      }

      const resetTime = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : this.windowMs));
      return { totalHits: count, resetTime };
    } catch (err) {
      if (isServerless) {
        throw this.createStoreUnavailableError(err.message);
      }
      // Graceful fallback to local in-memory counter only for non-serverless
      return this.localStore.increment(key);
    }
  }

  async decrement(key) {
    if (isServerless && !this.isShared) {
      throw this.createStoreUnavailableError('Missing shared KV/Redis credentials');
    }
    if (!this.isShared) {
      return this.localStore.decrement(key);
    }
    const fullKey = `palluvo:${this.prefix}:${key}`;
    try {
      await fetch(`${this.restUrl}/DECR/${encodeURIComponent(fullKey)}`, {
        headers: { Authorization: `Bearer ${this.restToken}` }
      });
    } catch (err) {
      if (isServerless) {
        throw this.createStoreUnavailableError(err.message);
      }
      return this.localStore.decrement(key);
    }
  }

  async resetKey(key) {
    if (isServerless && !this.isShared) {
      throw this.createStoreUnavailableError('Missing shared KV/Redis credentials');
    }
    if (!this.isShared) {
      return this.localStore.resetKey(key);
    }
    const fullKey = `palluvo:${this.prefix}:${key}`;
    try {
      await fetch(`${this.restUrl}/DEL/${encodeURIComponent(fullKey)}`, {
        headers: { Authorization: `Bearer ${this.restToken}` }
      });
    } catch (err) {
      if (isServerless) {
        throw this.createStoreUnavailableError(err.message);
      }
      return this.localStore.resetKey(key);
    }
  }

  async resetAll() {
    if (!this.isShared) {
      return this.localStore.resetAll();
    }
  }

  shutdown() {
    this.localStore.shutdown?.();
  }
}

function getClientIp(req) {
  if (req.ip) return req.ip;
  const xForwardedFor = req.headers && req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return typeof xForwardedFor === 'string' ? xForwardedFor.split(',')[0].trim() : xForwardedFor[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function createSharedRateLimitStore(prefix) {
  return new SharedRateLimitStore(prefix);
}

// Rate limiter for authentication attempts (login, register) to protect against credential-stuffing and brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 authentication requests per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  store: createSharedRateLimitStore('auth_ip'),
  keyGenerator: (req) => getClientIp(req),
  message: {
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMITED'
  }
});

// Targeted brute-force protection: throttles attempts from a specific IP against a specific account
// Keys by composite (IP, Account) tuple so that an attacker cannot lock out legitimate users from other IPs
const targetedAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 attempts per (IP, targeted account) in a 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  store: createSharedRateLimitStore('auth_target'),
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const email = (req.body && typeof req.body.email === 'string') ? req.body.email.trim().toLowerCase() : '';
    return email ? `${ip}_${email}` : ip;
  },
  message: {
    error: 'Too many login attempts for this account from your IP. Please wait 15 minutes before trying again.',
    code: 'ACCOUNT_IP_RATE_LIMITED'
  }
});

// Rate limiter for public order tracking lookups to prevent enumeration / scanning attacks
const trackOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // Limit each IP to 25 tracking requests per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  store: createSharedRateLimitStore('track_order'),
  keyGenerator: (req) => getClientIp(req),
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
  validate: false,
  store: createSharedRateLimitStore('api_general'),
  keyGenerator: (req) => getClientIp(req),
  message: {
    error: 'Too many requests from this IP. Please try again later.',
    code: 'API_RATE_LIMITED'
  }
});

module.exports = {
  authLimiter,
  targetedAuthLimiter,
  trackOrderLimiter,
  apiLimiter,
  SharedRateLimitStore
};

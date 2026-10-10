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
 * and fails closed (HTTP 503) if unconfigured, unreachable, or reporting pipeline command errors
 * to prevent distributed brute-force bypass.
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
      if (!Array.isArray(data) || data.length < 2) {
        throw new Error('Invalid KV pipeline response format');
      }
      if (data[0]?.error) throw new Error(`KV GET command error: ${data[0].error}`);
      if (data[1]?.error) throw new Error(`KV TTL command error: ${data[1].error}`);

      const rawCount = data[0]?.result;
      const count = rawCount !== undefined && rawCount !== null ? (parseInt(rawCount, 10) || 0) : 0;
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
      if (!Array.isArray(data) || data.length < 2) {
        throw new Error('Invalid KV pipeline response format');
      }
      if (data[0]?.error) throw new Error(`KV INCR command error: ${data[0].error}`);
      if (data[1]?.error) throw new Error(`KV TTL command error: ${data[1].error}`);

      const rawCount = data[0]?.result;
      if (rawCount === undefined || rawCount === null) {
        throw new Error('KV pipeline returned missing INCR result');
      }
      const count = parseInt(rawCount, 10);
      if (isNaN(count)) {
        throw new Error('KV pipeline returned non-numeric INCR result');
      }
      let ttl = parseInt(data[1]?.result, 10) || -1;

      // If the key was newly created and has no TTL, set expiration
      if (ttl === -1 || count === 1) {
        const expireRes = await fetch(`${this.restUrl}/EXPIRE/${encodeURIComponent(fullKey)}/${windowSec}`, {
          headers: { Authorization: `Bearer ${this.restToken}` }
        });
        if (!expireRes.ok) {
          throw new Error(`KV EXPIRE command failed with HTTP status ${expireRes.status}`);
        }
        const expireData = await expireRes.json();
        if (expireData && expireData.error) {
          throw new Error(`KV EXPIRE command error: ${expireData.error}`);
        }
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
      const res = await fetch(`${this.restUrl}/DECR/${encodeURIComponent(fullKey)}`, {
        headers: { Authorization: `Bearer ${this.restToken}` }
      });
      if (!res.ok) throw new Error(`KV response status ${res.status}`);
      const data = await res.json();
      if (data && data.error) throw new Error(`KV DECR command error: ${data.error}`);
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
      const res = await fetch(`${this.restUrl}/DEL/${encodeURIComponent(fullKey)}`, {
        headers: { Authorization: `Bearer ${this.restToken}` }
      });
      if (!res.ok) throw new Error(`KV response status ${res.status}`);
      const data = await res.json();
      if (data && data.error) throw new Error(`KV DEL command error: ${data.error}`);
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

/**
 * Normalizes client IP addresses (including IPv6 subnets via ipKeyGenerator)
 * to prevent IPv6 rotation attacks against per-IP rate limits.
 */
function getNormalizedIp(req) {
  const rawIp = getClientIp(req);
  return ipKeyGenerator(rawIp);
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
  keyGenerator: (req) => getNormalizedIp(req),
  message: {
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMITED'
  }
});

// Targeted brute-force protection: throttles attempts from a specific IP against a specific account
// Keys by composite (Normalized IP, Account) tuple so that an attacker cannot lock out legitimate users from other IPs
const targetedAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 attempts per (IP, targeted account) in a 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  store: createSharedRateLimitStore('auth_target'),
  keyGenerator: (req) => {
    const ip = getNormalizedIp(req);
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
  keyGenerator: (req) => getNormalizedIp(req),
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
  keyGenerator: (req) => getNormalizedIp(req),
  message: {
    error: 'Too many requests from this IP. Please try again later.',
    code: 'API_RATE_LIMITED'
  }
});

/**
 * Tracks aggregate failed login attempts per account across all IPs.
 * Applies progressive non-locking computational friction against distributed botnets / multi-prefix credential stuffing.
 */
class AccountRiskTracker {
  constructor() {
    this.store = createSharedRateLimitStore('acct_risk');
    this.localCounts = new Map();
  }

  async getFailedCount(email) {
    if (!email || typeof email !== 'string') return 0;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const info = await this.store.get(cleanEmail);
      return info?.totalHits || 0;
    } catch (err) {
      if (isServerless) throw err;
      return this.localCounts.get(cleanEmail) || 0;
    }
  }

  async recordFailedAttempt(email) {
    if (!email || typeof email !== 'string') return 0;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const info = await this.store.increment(cleanEmail);
      return info?.totalHits || 1;
    } catch (err) {
      if (isServerless) throw err;
      const count = (this.localCounts.get(cleanEmail) || 0) + 1;
      this.localCounts.set(cleanEmail, count);
      return count;
    }
  }

  async resetFailedAttempts(email) {
    if (!email || typeof email !== 'string') return;
    const cleanEmail = email.trim().toLowerCase();
    try {
      await this.store.resetKey(cleanEmail);
    } catch (err) {
      if (isServerless) throw err;
    }
    this.localCounts.delete(cleanEmail);
  }
}

const accountRiskTracker = new AccountRiskTracker();

module.exports = {
  authLimiter,
  targetedAuthLimiter,
  trackOrderLimiter,
  apiLimiter,
  SharedRateLimitStore,
  getNormalizedIp,
  AccountRiskTracker,
  accountRiskTracker
};

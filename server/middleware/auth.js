const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/database');

const isProduction = process.env.NODE_ENV === 'production';
const rawSecret = process.env.JWT_SECRET;

// In production, strictly enforce presence of a strong dedicated JWT_SECRET
if (isProduction) {
  if (!rawSecret || rawSecret.length < 32 || rawSecret.includes('palluvo_super_secret') || rawSecret.includes('change_me') || rawSecret.includes('your_jwt_secret')) {
    console.error('FATAL: A strong, dedicated JWT_SECRET environment variable (minimum 32 characters) must be configured in production. Startup aborted.');
    process.exit(1);
  }
}

// In non-production, fallback to an unguessable ephemeral key generated at runtime to prevent static token forgery
const JWT_SECRET = rawSecret || crypto.randomBytes(32).toString('hex');
if (!rawSecret && !isProduction) {
  console.warn('⚠️ [DEV NOTICE] No JWT_SECRET in environment. Using ephemeral runtime signing key.');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User account not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token. Please sign in again.' });
  }
}

// Optional Auth (for guest carts or browsing users)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch (e) {
      // ignore invalid optional token
    }
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required. Authorization denied.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  JWT_SECRET
};

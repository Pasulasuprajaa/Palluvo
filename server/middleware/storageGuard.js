const db = require('../db/database');

/**
 * Middleware to protect mutating commerce endpoints against ephemeral storage state loss.
 * Restricts writes in serverless/production environments when no durable shared database is configured.
 */
function requireDurableStorage(req, res, next) {
  if (!db.isDurable) {
    return res.status(503).json({
      error: 'Durable database storage is not configured. Production commerce writes are restricted until a durable shared database or persistent volume is attached (via DATABASE_URL or DATABASE_PATH).',
      code: 'EPHEMERAL_STORAGE_RESTRICTED'
    });
  }
  next();
}

module.exports = {
  requireDurableStorage
};

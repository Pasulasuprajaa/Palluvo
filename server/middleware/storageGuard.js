const db = require('../db/database');

/**
 * Middleware to protect mutating commerce endpoints against ephemeral storage state loss.
 * Restricts writes in serverless/production environments when no durable shared database is configured.
 */
function requireDurableStorage(req, res, next) {
  if (!db.isDurable) {
    return res.status(503).json({
      error: 'Durable shared database storage is not available in this environment. Mutating commerce operations (user registration, bag/cart updates, order placement, payments, reviews) are restricted on ephemeral or serverless instances to prevent data divergence and state loss.',
      code: 'EPHEMERAL_STORAGE_RESTRICTED',
      storageType: db.storageType
    });
  }
  next();
}

module.exports = {
  requireDurableStorage
};

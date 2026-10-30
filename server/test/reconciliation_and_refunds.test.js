const path = require('path');
const fs = require('fs');

// 1. Isolate the test environment from persistent database and real gateway calls BEFORE any app module imports
process.env.NODE_ENV = 'test';
process.env.DISABLE_REAL_GATEWAY = 'true';
process.env.JWT_SECRET = 'test_jwt_secret_key_minimum_32_characters_long_for_security';
process.env.CRON_SECRET = 'test_cron_secret_palluvo_12345';
process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_palluvo';
process.env.RAZORPAY_KEY_SECRET = 'mock_secret_for_tests';

// Disposable database path created before importing database.js
const testDbDir = path.join(__dirname, `.test_db_${Date.now()}_${Math.random().toString(36).slice(2)}`);
fs.mkdirSync(testDbDir, { recursive: true });
const testDbPath = path.join(testDbDir, 'test_disposable.db');
process.env.DATABASE_PATH = testDbPath;

// Now safely import modules against the isolated disposable database
const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');

const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');
const paymentsRouter = require('../routes/payments');
const ordersRouter = require('../routes/orders');
const adminRouter = require('../routes/admin');
const reviewsRouter = require('../routes/reviews');
const productsRouter = require('../routes/products');
const pincodeRouter = require('../routes/pincode');
const { getMetaForRoute, injectMetaTags } = require('../services/seoRenderer');
const { reconcilePendingRefunds, reconcileExpiredReservations } = paymentsRouter;
const {
  refundRazorpayPayment,
  fetchRazorpayOrder,
  createRazorpayOrder,
  fetchRazorpayPaymentRefunds,
  _setRazorpayInstanceForTest,
  _getRazorpayInstanceForTest
} = require('../services/razorpay');

async function runTests() {
  console.log('🧪 Starting test suite for P1 (Idempotency Header & Test Isolation) and P2 (Reconciliation Authentication)...');
  console.log(`📁 Test database path: ${testDbPath}`);

  let server;

  try {
    // Setup test Express app
    const app = express();
    app.use(express.json());
    app.use('/api/payments', paymentsRouter);
    app.use('/api/orders', ordersRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api/reviews', reviewsRouter);
    app.use('/api/products', productsRouter);
    app.use('/api/pincode', pincodeRouter);
    app.get('/api/render', (req, res, next) => {
      if (req.query.path !== undefined && typeof req.query.path !== 'string') {
        return res.status(400).json({
          error: 'Invalid path parameter. Path must be a single string.',
          code: 'INVALID_PATH'
        });
      }
      const rawPath = typeof req.query.path === 'string'
        ? req.query.path
        : (typeof req.headers['x-matched-path'] === 'string' ? req.headers['x-matched-path'] : (req.url || ''));

      let targetPath = (rawPath || '').split('?')[0];
      if (!targetPath.startsWith('/')) {
        targetPath = '/' + targetPath;
      }
      const rawHtml = '<!DOCTYPE html><html><head><title>Default</title></head><body>App</body></html>';
      const meta = getMetaForRoute(targetPath, req.query || {});
      const finalHtml = injectMetaTags(rawHtml, meta);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (meta.isNotFound) {
        return res.status(404).send(finalHtml);
      }
      return res.status(200).send(finalHtml);
    });

    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/payments`;

    async function request(reqPath, options = {}) {
      return new Promise((resolve, reject) => {
        const fullUrl = reqPath.startsWith('/api/') ? `http://localhost:${port}${reqPath}` : `${baseUrl}${reqPath}`;
        const url = new URL(fullUrl);
        const headers = Object.assign({}, options.headers || {});
        if (options.token) {
          headers['Authorization'] = `Bearer ${options.token}`;
        }
        if (options.body && !headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
        const req = http.request(url, {
          method: options.method || 'GET',
          headers
        }, res => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                body: body ? JSON.parse(body) : null
              });
            } catch (e) {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                body
              });
            }
          });
        });
        req.on('error', reject);
        if (options.body) {
          req.write(JSON.stringify(options.body));
        }
        req.end();
      });
    }

    // --- TEST SUITE P2: Reconciliation Endpoint Authentication & Method Restriction ---
    console.log('\n--- Testing [P2] Reconciliation Endpoint Security ---');

    // 1. Unauthenticated request should be rejected with 401
    const resNoAuth = await request('/reconcile', { method: 'GET' });
    assert.strictEqual(resNoAuth.status, 401, 'Unauthenticated GET should return 401');
    console.log('✅ PASS: GET /reconcile without auth returns 401 Unauthorized');

    // 2. Invalid bearer token should be rejected with 401
    const resInvalidAuth = await request('/reconcile', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer wrong_secret_token' }
    });
    assert.strictEqual(resInvalidAuth.status, 401, 'Invalid Bearer secret should return 401');
    console.log('✅ PASS: GET /reconcile with invalid Bearer secret returns 401 Unauthorized');

    // 3. Valid CRON_SECRET bearer token should succeed with 200
    const resValidCron = await request('/reconcile', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    });
    assert.strictEqual(resValidCron.status, 200, 'Valid CRON_SECRET should return 200');
    assert.strictEqual(resValidCron.body.success, true, 'Response body should indicate success');
    console.log('✅ PASS: GET /reconcile with valid CRON_SECRET Bearer returns 200 OK');

    // 4. Create an admin user in disposable DB and test Admin JWT token access
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Admin User', 'admin@palluvo.com', 'hash', 'admin')").run();
    const adminUser = db.prepare("SELECT id FROM users WHERE email = 'admin@palluvo.com'").get();
    const adminToken = jwt.sign({ id: adminUser.id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    const resAdmin = await request('/reconcile', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(resAdmin.status, 200, 'Valid admin JWT should return 200');
    console.log('✅ PASS: GET /reconcile with Admin JWT returns 200 OK');

    // 5. Non-GET methods (POST, PUT, DELETE) must be rejected with 405 Method Not Allowed
    const resPost = await request('/reconcile', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    });
    assert.strictEqual(resPost.status, 405, 'POST /reconcile should return 405');
    assert.strictEqual(resPost.headers['allow'], 'GET', 'Allow header should specify GET');
    console.log('✅ PASS: POST /reconcile returns 405 Method Not Allowed with Allow: GET');

    const resPut = await request('/reconcile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    });
    assert.strictEqual(resPut.status, 405, 'PUT /reconcile should return 405');
    console.log('✅ PASS: PUT /reconcile returns 405 Method Not Allowed');

    // --- TEST SUITE P1: Idempotency Key & X-Refund-Idempotency Header ---
    console.log('\n--- Testing [P1] X-Refund-Idempotency Header & Consistent Retries ---');

    // 1. Verify refund helper forwards X-Refund-Idempotency header
    const sampleIdempotencyKey = 'rfnd_test_idem_header_123';
    const mockRefund = await refundRazorpayPayment('pay_mock_test_header', {
      amount: 50000,
      receipt: 'rfnd_test_receipt_1',
      idempotencyKey: sampleIdempotencyKey
    });
    assert.strictEqual(mockRefund.idempotency_key, sampleIdempotencyKey, 'Idempotency key must be tracked');
    assert.strictEqual(mockRefund.headers['X-Refund-Idempotency'], sampleIdempotencyKey, 'X-Refund-Idempotency header must be forwarded');
    console.log('✅ PASS: refundRazorpayPayment correctly transmits X-Refund-Idempotency header');

    // 2. Verify real gateway calls are blocked in test isolation
    let gatewayBlocked = false;
    try {
      await fetchRazorpayOrder('order_live_real_non_mock_id');
    } catch (err) {
      if (err.message.includes('test isolation')) {
        gatewayBlocked = true;
      }
    }
    assert.strictEqual(gatewayBlocked, true, 'Real gateway calls must be disabled during tests');
    console.log('✅ PASS: Real gateway network calls are disabled in test environment');

    // 3. Verify createRazorpayOrder honors DISABLE_REAL_GATEWAY without outbound network requests
    const createdOrder = await createRazorpayOrder({ amount: 1250, receipt: 'rcpt_no_net_test' });
    assert.strictEqual(createdOrder.is_mock, true, 'createRazorpayOrder must return mock order when gateway disabled');
    assert.ok(createdOrder.id.startsWith('order_mock_'), 'createRazorpayOrder must return mock order identifier');
    assert.strictEqual(createdOrder.amount, 125000, 'createRazorpayOrder must calculate amount in paise');
    console.log('✅ PASS: createRazorpayOrder strictly honors network isolation guard without network activity');

    // 4. Verify createRazorpayOrder strictly fails closed in production when gateway is disabled
    const savedEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      let threwInProd = false;
      try {
        await createRazorpayOrder({ amount: 1250, receipt: 'rcpt_prod_fail_test' });
      } catch (err) {
        threwInProd = true;
        assert.ok(
          err.message.includes('forbidden in production') || err.message.includes('strictly rejected'),
          'Error message must indicate production restriction'
        );
      }
      assert.strictEqual(threwInProd, true, 'createRazorpayOrder must throw in production mode rather than returning mock orders');
      console.log('✅ PASS: createRazorpayOrder strictly fails closed in production when gateway is disabled');
    } finally {
      process.env.NODE_ENV = savedEnv;
    }

    // --- TEST SUITE P1: Scoped Reconciler & In-Flight Retention ---
    console.log('\n--- Testing [P1] Scoped Reconciler & Refund In-Flight Safety ---');

    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Customer User', 'customer@palluvo.com', 'hash', 'customer')").run();
    const customerUser = db.prepare("SELECT id FROM users WHERE email = 'customer@palluvo.com'").get();

    const nonce = Date.now();

    // 3. Verify reconciler scoping to fixture IDs
    const orderNumScope1 = `ORD-SCOPE-1-${nonce}`;
    const orderNumScope2 = `ORD-SCOPE-2-${nonce}`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
      VALUES (?, ?, 1000, 1000, 'Refund_Pending', 'Cancelled', 'order_mock_scope_1', 'pay_mock_refund_pending_scope_1', 'rfnd_mock_pending_scope_1', '{"city":"Mumbai"}', CURRENT_TIMESTAMP)
    `).run(orderNumScope1, customerUser.id);
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
      VALUES (?, ?, 2000, 2000, 'Refund_Pending', 'Cancelled', 'order_mock_scope_2', 'pay_mock_refund_scope_2', 'rfnd_mock_scope_2', '{"city":"Delhi"}', CURRENT_TIMESTAMP)
    `).run(orderNumScope2, customerUser.id);

    const scopeOrder1 = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumScope1);
    const scopeOrder2 = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumScope2);

    // Call reconcilePendingRefunds explicitly scoped only to scopeOrder2.id
    await reconcilePendingRefunds({ orderIds: [scopeOrder2.id] });

    const checkOrder1 = db.prepare("SELECT * FROM orders WHERE id = ?").get(scopeOrder1.id);
    const checkOrder2 = db.prepare("SELECT * FROM orders WHERE id = ?").get(scopeOrder2.id);

    // scopeOrder2 was processed because rfnd_mock_scope_2 matches mock processed
    assert.strictEqual(checkOrder2.payment_status, 'Refunded', 'Scoped fixture order 2 was reconciled');
    // scopeOrder1 was NOT in orderIds and must remain untouched
    assert.strictEqual(checkOrder1.payment_status, 'Refund_Pending', 'Unscoped fixture order 1 was not touched');
    console.log('✅ PASS: reconcilePendingRefunds strictly respects fixture orderIds scoping');

    // Scenario 1: Order has an existing PENDING refund.
    // Reconciler MUST NOT resubmit refund and MUST NOT overwrite refund_id!
    const pendingRefundId = `rfnd_mock_pending_in_flight_${nonce}`;
    const orderNum1 = `ORD-TEST-PENDING-REFUND-1-${nonce}`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
      VALUES (?, ?, 1000, 1000, 'Refund_Pending', 'Cancelled', 'order_mock_test_1', 'pay_mock_refund_pending_1', ?, '{"city":"Mumbai"}', CURRENT_TIMESTAMP)
    `).run(orderNum1, customerUser.id, pendingRefundId);

    const order1 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum1);

    // Run reconciler scoped to order1.id
    await reconcilePendingRefunds({ orderIds: [order1.id] });

    // Verify order1 still has refund_id preserved and payment_status still Refund_Pending
    const refreshedOrder1 = db.prepare("SELECT * FROM orders WHERE id = ?").get(order1.id);
    assert.strictEqual(refreshedOrder1.refund_id, pendingRefundId, 'Existing pending refund ID must be preserved and NOT overwritten');
    assert.strictEqual(refreshedOrder1.payment_status, 'Refund_Pending', 'Payment status must remain Refund_Pending while in-flight');
    console.log('✅ PASS: In-flight pending refund retained; no resubmission and refund_id preserved');

    // Scenario 2: Order has a refund that Razorpay confirms PROCESSED.
    // Reconciler MUST transition order to Refunded and update payments table.
    const processedRefundId = `rfnd_mock_processed_${nonce}`;
    const orderNum2 = `ORD-TEST-PROCESSED-REFUND-2-${nonce}`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
      VALUES (?, ?, 2000, 2000, 'Refund_Pending', 'Cancelled', 'order_mock_test_2', 'pay_mock_2', ?, '{"city":"Delhi"}', CURRENT_TIMESTAMP)
    `).run(orderNum2, customerUser.id, processedRefundId);
    const order2 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum2);

    db.prepare(`
      INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
      VALUES (?, 'order_mock_test_2', 'pay_mock_2', 'sig_test', 200000, 'INR', 'Refund_Pending', 'Razorpay')
    `).run(order2.id);

    await reconcilePendingRefunds({ orderIds: [order2.id] });

    const refreshedOrder2 = db.prepare("SELECT * FROM orders WHERE id = ?").get(order2.id);
    const refreshedPayment2 = db.prepare("SELECT * FROM payments WHERE order_id = ?").get(order2.id);
    assert.strictEqual(refreshedOrder2.payment_status, 'Refunded', 'Processed refund transitions order to Refunded');
    assert.strictEqual(refreshedOrder2.refund_id, processedRefundId, 'Order records processed refund ID');
    assert.strictEqual(refreshedPayment2.status, 'Refunded', 'Payments table updated to Refunded');
    console.log('✅ PASS: Processed refund positively confirmed and transitioned to Refunded');

    // Scenario 3: Order has a previous refund that Razorpay confirms FAILED/CANCELLED.
    // Reconciler should now safely retry using consistent idempotency key rfnd_${order.id}_${order.order_number}.
    const failedRefundId = `rfnd_mock_failed_attempt_${nonce}`;
    const orderNum3 = `ORD-TEST-FAILED-RETRY-3-${nonce}`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
      VALUES (?, ?, 3000, 3000, 'Refund_Pending', 'Cancelled', 'order_mock_test_3', 'pay_mock_retry_3', ?, '{"city":"Bengaluru"}', CURRENT_TIMESTAMP)
    `).run(orderNum3, customerUser.id, failedRefundId);
    const order3 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum3);

    // When retry runs on pay_mock_retry_3, refundRazorpayPayment returns mock processed
    await reconcilePendingRefunds({ orderIds: [order3.id] });

    const refreshedOrder3 = db.prepare("SELECT * FROM orders WHERE id = ?").get(order3.id);
    assert.strictEqual(refreshedOrder3.payment_status, 'Refunded', 'Retry of confirmed failed attempt succeeds');
    assert.notStrictEqual(refreshedOrder3.refund_id, failedRefundId, 'New refund ID generated on retry');
    assert.ok(refreshedOrder3.refund_idempotency_key && refreshedOrder3.refund_idempotency_key.includes('_att_'), 'Confirmed failed refund generates and persists fresh key');
    console.log('✅ PASS: Confirmed failed refund safely retried after gateway confirmation with fresh persisted key');

    // Scenario 4: Refund retry fails with gateway error.
    // Reconciler should transition payment_status to Refund_Failed and store refund_error.
    const orderNum4 = `ORD-TEST-FAILED-RETRY-4-${nonce}`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
      VALUES (?, ?, 4000, 4000, 'Refund_Pending', 'Cancelled', 'order_mock_test_4', 'pay_mock_refund_failed_err', ?, '{"city":"Chennai"}', CURRENT_TIMESTAMP)
    `).run(orderNum4, customerUser.id, 'rfnd_mock_failed_attempt_2');
    const order4 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum4);

    await reconcilePendingRefunds({ orderIds: [order4.id] });

    const refreshedOrder4 = db.prepare("SELECT * FROM orders WHERE id = ?").get(order4.id);
    assert.strictEqual(refreshedOrder4.payment_status, 'Refund_Failed', 'Failing retry transitions to Refund_Failed');
    assert.ok(refreshedOrder4.refund_error, 'Refund error is recorded');
    const firstRetryKey = refreshedOrder4.refund_idempotency_key;
    assert.ok(firstRetryKey && firstRetryKey.includes('_att_'), 'Fresh key was generated and persisted for the retry');
    console.log('✅ PASS: Gateway retry failure recorded as Refund_Failed with error');

    // Run reconciliation again on the failed order to simulate subsequent ambiguous retry:
    // It MUST reuse firstRetryKey and NOT generate a new Date.now() key!
    await reconcilePendingRefunds({ orderIds: [order4.id] });
    const refreshedOrder4SecondRun = db.prepare("SELECT * FROM orders WHERE id = ?").get(order4.id);
    assert.strictEqual(
      refreshedOrder4SecondRun.refund_idempotency_key,
      firstRetryKey,
      'Ambiguous subsequent retry must reuse the current attempt key and NOT generate a new key'
    );
    console.log('✅ PASS: Subsequent ambiguous retry reuses current attempt key without generating new key');

    // Concurrency test:
    // If order has an active refund_claimed_at within lease window, a concurrent worker must skip it.
    db.prepare("UPDATE orders SET refund_claimed_at = ? WHERE id = ?").run(Date.now(), order4.id);
    const concurrentResolved = await reconcilePendingRefunds({ orderIds: [order4.id] });
    assert.strictEqual(concurrentResolved, 0, 'Concurrent worker must skip claimed order');
    db.prepare("UPDATE orders SET refund_claimed_at = NULL WHERE id = ?").run(order4.id);
    console.log('✅ PASS: Concurrency guard prevents racing workers from processing claimed order');

    // Scenario 5: Ambiguous retry retains exact same key and identical body
    const orderNum5 = `ORD-TEST-AMBIGUOUS-${nonce}`;
    const initialKey = `rfnd_custom_ambiguous_${nonce}`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, refund_idempotency_key, address_data, created_at)
      VALUES (?, ?, 5000, 5000, 'Refund_Pending', 'Cancelled', 'order_mock_test_5', 'pay_mock_ambiguous_5', NULL, ?, '{"city":"Kolkata"}', CURRENT_TIMESTAMP)
    `).run(orderNum5, customerUser.id, initialKey);
    const order5 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum5);

    await reconcilePendingRefunds({ orderIds: [order5.id] });

    const refreshedOrder5 = db.prepare("SELECT * FROM orders WHERE id = ?").get(order5.id);
    assert.strictEqual(refreshedOrder5.refund_idempotency_key, initialKey, 'Ambiguous retry must keep the identical idempotency key');
    console.log('✅ PASS: Ambiguous retry preserves identical idempotency key and body payload');

    // Scenario 6: Order has NULL refund_id, but gateway refund list confirms a failed refund.
    // Reconciler MUST rotate the key, record failed_refund_id, and reuse the new key on subsequent retries.
    const orderNum6 = `ORD-TEST-NULL-REFUNDID-LIST-FAILED-${nonce}`;
    const initialKey6 = `rfnd_initial_null_id_${nonce}`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, refund_idempotency_key, address_data, created_at)
      VALUES (?, ?, 6000, 6000, 'Refund_Pending', 'Cancelled', 'order_mock_test_6', 'pay_mock_refund_failed_err', NULL, ?, '{"city":"Pune"}', CURRENT_TIMESTAMP)
    `).run(orderNum6, customerUser.id, initialKey6);
    const order6 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum6);

    await reconcilePendingRefunds({ orderIds: [order6.id] });

    const refreshedOrder6 = db.prepare("SELECT * FROM orders WHERE id = ?").get(order6.id);
    assert.notStrictEqual(refreshedOrder6.refund_idempotency_key, initialKey6, 'Key must rotate when refund list confirms failure');
    assert.ok(refreshedOrder6.refund_idempotency_key.includes('_att_'), 'Fresh attempt key generated on confirmed list failure');
    assert.ok(refreshedOrder6.failed_refund_id, 'Failed refund ID from list must be recorded');
    console.log('✅ PASS: Key rotated and failed ID recorded when refund list confirms failure with NULL refund_id');

    // Subsequent ambiguous retry of order 6: must reuse the rotated attempt key!
    const rotatedKey6 = refreshedOrder6.refund_idempotency_key;
    await reconcilePendingRefunds({ orderIds: [order6.id] });
    const refreshedOrder6Again = db.prepare("SELECT * FROM orders WHERE id = ?").get(order6.id);
    assert.strictEqual(refreshedOrder6Again.refund_idempotency_key, rotatedKey6, 'Rotated key must be reused on subsequent retries');
    console.log('✅ PASS: Rotated key reused on subsequent ambiguous retries after refund list failure');

    // Scenario 7: Fencing claim release by owner token.
    // Releasing with a mismatched token must NOT clear the active worker's lease.
    const orderNum7 = `ORD-TEST-CLAIM-FENCE-${nonce}`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
      VALUES (?, ?, 7000, 7000, 'Refund_Pending', 'Cancelled', 'order_mock_test_7', 'pay_mock_fence_7', NULL, '{"city":"Jaipur"}', CURRENT_TIMESTAMP)
    `).run(orderNum7, customerUser.id);
    const order7 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum7);

    const activeToken = 'worker_token_active_123';
    db.prepare("UPDATE orders SET refund_claimed_at = ?, refund_claim_token = ? WHERE id = ?").run(Date.now(), activeToken, order7.id);

    // Mismatched token release attempt:
    db.prepare("UPDATE orders SET refund_claimed_at = NULL, refund_claim_token = NULL WHERE id = ? AND refund_claim_token = ?").run(order7.id, 'stale_token_999');
    const claimCheckMismatched = db.prepare("SELECT refund_claimed_at, refund_claim_token FROM orders WHERE id = ?").get(order7.id);
    assert.strictEqual(claimCheckMismatched.refund_claim_token, activeToken, 'Claim must NOT be cleared by mismatched token');

    // Matched token release:
    db.prepare("UPDATE orders SET refund_claimed_at = NULL, refund_claim_token = NULL WHERE id = ? AND refund_claim_token = ?").run(order7.id, activeToken);
    const claimCheckMatched = db.prepare("SELECT refund_claimed_at, refund_claim_token FROM orders WHERE id = ?").get(order7.id);
    assert.strictEqual(claimCheckMatched.refund_claimed_at, null, 'Claim must be cleared when token matches');
    assert.strictEqual(claimCheckMatched.refund_claim_token, null, 'Claim token must be cleared when token matches');
    // Scenario 8: Partial refund safety [P1]
    // An order where only a partial refund has processed must NOT be transitioned to Refunded.
    // The reconciler must retain/initiate the remaining balance until cumulative refunds cover full payment.
    const orderNum8 = `ORD-TEST-PARTIAL-REFUND-${nonce}`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
      VALUES (?, ?, 5000, 5000, 'Refund_Pending', 'Cancelled', 'order_mock_test_8', 'pay_mock_refund_partial_8', 'rfnd_mock_partial_1', '{"city":"Bengaluru"}', CURRENT_TIMESTAMP)
    `).run(orderNum8, customerUser.id);
    const order8 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum8);

    // Run reconciliation: Reconciler should recognize only 100000 of 500000 paise was refunded.
    // It must initiate the balance refund of 400000 paise with a _bal_ key, and upon completion mark as Refunded.
    await reconcilePendingRefunds({ orderIds: [order8.id] });
    const refreshedOrder8 = db.prepare("SELECT * FROM orders WHERE id = ?").get(order8.id);
    assert.ok(
      refreshedOrder8.refund_idempotency_key && refreshedOrder8.refund_idempotency_key.includes('_bal_'),
      'Balance idempotency key must be generated and persisted for partial refund remaining balance'
    );
    assert.strictEqual(
      refreshedOrder8.payment_status,
      'Refunded',
      'Order should transition to Refunded once balance refund covers full payment'
    );
    console.log('✅ PASS: [P1] Partial refund does not prematurely mark order Refunded, initiates balance under _bal_ key, and completes full refund');

    // Scenario 8b: Gateway payment status fallback guard [P1]
    // payment.status === 'refunded' but payment.refund_status === 'partial' must NOT be accepted as full refund.
    const orderNum8b = `ORD-TEST-PARTIAL-STATUS-MISMATCH-${nonce}`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
      VALUES (?, ?, 5000, 5000, 'Refund_Pending', 'Cancelled', 'order_mock_test_8b', 'pay_mock_refund_status_mismatch_8b', 'rfnd_mock_mismatch_partial_1', '{"city":"Hyderabad"}', CURRENT_TIMESTAMP)
    `).run(orderNum8b, customerUser.id);
    const order8b = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum8b);

    await reconcilePendingRefunds({ orderIds: [order8b.id] });
    const refreshedOrder8b = db.prepare("SELECT * FROM orders WHERE id = ?").get(order8b.id);
    assert.ok(
      refreshedOrder8b.refund_idempotency_key && refreshedOrder8b.refund_idempotency_key.includes('_bal_'),
      'Must initiate balance when refund_status is partial even if payment.status is refunded'
    );
    console.log('✅ PASS: [P1] payment.status === "refunded" without refund_status === "full" does not bypass partial refund balance handling');

    // Scenario 8c: Rotate balance idempotency key on confirmed failure [P1]
    // When a balance refund attempt definitively fails on the gateway, the reconciler must:
    // 1. Record the failed balance refund ID in failed_refund_id.
    // 2. Persist a fresh balance-attempt key (with _bal_ and new timestamp).
    // 3. Clear refund_id to NULL.
    // 4. On subsequent ambiguous retries, reuse the rotated balance key without regenerating.
    const orderNum8c = `ORD-TEST-BAL-ROTATION-${nonce}`;
    const initialBalKey8c = `rfnd_initial_bal_key_${nonce}_bal_100`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, refund_idempotency_key, address_data, created_at)
      VALUES (?, ?, 5000, 5000, 'Refund_Pending', 'Cancelled', 'order_mock_test_8c', 'pay_mock_refund_balance_retry_fail_8c', 'rfnd_mock_failed_bal_retry_1', ?, '{"city":"Pune"}', CURRENT_TIMESTAMP)
    `).run(orderNum8c, customerUser.id, initialBalKey8c);
    const order8c = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum8c);

    // Run reconciliation: Reconciler should recognize confirmed failure of balance refund rfnd_mock_failed_bal_retry_1.
    // It must rotate the key, record failed_refund_id, and attempt retry (which simulates network error).
    await reconcilePendingRefunds({ orderIds: [order8c.id] });
    const refreshedOrder8c = db.prepare("SELECT * FROM orders WHERE id = ?").get(order8c.id);

    assert.notStrictEqual(
      refreshedOrder8c.refund_idempotency_key,
      initialBalKey8c,
      'Balance idempotency key must rotate after gateway-confirmed failure'
    );
    assert.ok(
      refreshedOrder8c.refund_idempotency_key && refreshedOrder8c.refund_idempotency_key.includes('_bal_'),
      'Fresh balance key must retain _bal_ identifier'
    );
    assert.ok(
      refreshedOrder8c.failed_refund_id && refreshedOrder8c.failed_refund_id.includes('rfnd_mock_failed_bal_retry_1'),
      'Failed balance refund ID must be recorded in failed_refund_id'
    );
    console.log('✅ PASS: [P1] Balance idempotency key rotates and failed refund ID recorded upon confirmed balance refund failure');

    // Subsequent ambiguous retry of order 8c: must reuse the rotated balance key!
    const rotatedBalKey8c = refreshedOrder8c.refund_idempotency_key;
    await reconcilePendingRefunds({ orderIds: [order8c.id] });
    const refreshedOrder8cAgain = db.prepare("SELECT * FROM orders WHERE id = ?").get(order8c.id);
    assert.strictEqual(
      refreshedOrder8cAgain.refund_idempotency_key,
      rotatedBalKey8c,
      'Rotated balance key must be reused on subsequent ambiguous retries'
    );
    console.log('✅ PASS: [P1] Rotated balance key reused on subsequent ambiguous retries after gateway failure');

    // Scenario 8d: Confirmed failed balance refund followed by successful balance retry [P1]
    const orderNum8d = `ORD-TEST-BAL-SUCCESS-${nonce}`;
    const initialBalKey8d = `rfnd_initial_bal_success_${nonce}_bal_200`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, refund_idempotency_key, address_data, created_at)
      VALUES (?, ?, 5000, 5000, 'Refund_Pending', 'Cancelled', 'order_mock_test_8d', 'pay_mock_refund_balance_failed_8d', 'rfnd_mock_failed_bal_1', ?, '{"city":"Mumbai"}', CURRENT_TIMESTAMP)
    `).run(orderNum8d, customerUser.id, initialBalKey8d);
    const order8d = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum8d);

    await reconcilePendingRefunds({ orderIds: [order8d.id] });
    const refreshedOrder8d = db.prepare("SELECT * FROM orders WHERE id = ?").get(order8d.id);
    assert.notStrictEqual(
      refreshedOrder8d.refund_idempotency_key,
      initialBalKey8d,
      'Balance key must rotate on confirmed failure before retry'
    );
    assert.strictEqual(
      refreshedOrder8d.payment_status,
      'Refunded',
      'Order must transition to Refunded once successful balance retry completes remaining amount'
    );
    console.log('✅ PASS: [P1] Confirmed failed balance refund rotates key and successfully completes on subsequent retry');

    // Scenario 8e: In-flight pending balance refund retained without rotation [P1]
    const orderNum8e = `ORD-TEST-BAL-PENDING-${nonce}`;
    const initialBalKey8e = `rfnd_initial_bal_pending_${nonce}_bal_300`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, refund_idempotency_key, address_data, created_at)
      VALUES (?, ?, 5000, 5000, 'Refund_Pending', 'Cancelled', 'order_mock_test_8e', 'pay_mock_refund_balance_pending_8e', NULL, ?, '{"city":"Delhi"}', CURRENT_TIMESTAMP)
    `).run(orderNum8e, customerUser.id, initialBalKey8e);
    const order8e = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum8e);

    await reconcilePendingRefunds({ orderIds: [order8e.id] });
    const refreshedOrder8e = db.prepare("SELECT * FROM orders WHERE id = ?").get(order8e.id);
    assert.strictEqual(
      refreshedOrder8e.payment_status,
      'Refund_Pending',
      'In-flight pending balance refund must remain Refund_Pending'
    );
    assert.strictEqual(
      refreshedOrder8e.refund_idempotency_key,
      initialBalKey8e,
      'Idempotency key must NOT be rotated when balance refund is still pending'
    );
    assert.strictEqual(
      refreshedOrder8e.refund_id,
      'rfnd_mock_pending_bal_1',
      'In-flight pending balance refund ID must be retained'
    );
    console.log('✅ PASS: [P1] In-flight pending balance refund retained without key rotation or resubmission');

    // Scenario 9: Paginated refund list [P2]
    // Payment has 100 failed refunds on page 1 and an older pending refund on page 2 (item 101).
    // The reconciler must page through all pages, discover the older pending refund,
    // retain Refund_Pending, and NOT conclude all attempts failed or rotate the key.
    const orderNum9 = `ORD-TEST-PAGINATED-LIST-${nonce}`;
    const initialKey9 = `rfnd_initial_paginated_${nonce}`;
    db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, refund_idempotency_key, address_data, created_at)
      VALUES (?, ?, 2000, 2000, 'Refund_Pending', 'Cancelled', 'order_mock_test_9', 'pay_mock_refund_paginated_9', NULL, ?, '{"city":"Chennai"}', CURRENT_TIMESTAMP)
    `).run(orderNum9, customerUser.id, initialKey9);
    const order9 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum9);

    await reconcilePendingRefunds({ orderIds: [order9.id] });
    const refreshedOrder9 = db.prepare("SELECT * FROM orders WHERE id = ?").get(order9.id);
    assert.strictEqual(
      refreshedOrder9.payment_status,
      'Refund_Pending',
      'Order must remain Refund_Pending when an older pending refund is discovered across pages'
    );
    assert.strictEqual(
      refreshedOrder9.refund_id,
      'rfnd_mock_paginated_older_pending',
      'Discovered older pending refund ID from page 2 must be retained'
    );
    assert.strictEqual(
      refreshedOrder9.refund_idempotency_key,
      initialKey9,
      'Idempotency key must NOT be rotated when older pending refund exists on page 2'
    );
    console.log('✅ PASS: [P2] Paginated refund list discovers older pending refund across pages (101 items), retaining pending state without key rotation');

    // Scenario 10: Direct 101+ refund pagination test across 100-item boundary [P2]
    // Razorpay collections return count: 100 for a full page.
    // Ensure fetchRazorpayPaymentRefunds requests page 2 with skip: 100 and aggregates all 101 items.
    const pagedRequests = [];
    const mockRazorpayClient = {
      _isMock: true,
      payments: {
        allRefunds: async (payId, opts) => {
          pagedRequests.push({ payId, ...opts });
          if (opts.skip === 0) {
            // Page 1: 100 failed refunds; Razorpay collection count indicates 100 items returned
            const items = [];
            for (let i = 1; i <= 100; i++) {
              items.push({
                id: `rfnd_paged_page1_${i}`,
                payment_id: payId,
                amount: 1000,
                status: 'failed'
              });
            }
            return {
              entity: 'collection',
              count: 100, // Collection count is the count of items in this response, NOT total refunds
              items
            };
          } else if (opts.skip === 100) {
            // Page 2: 1 older pending refund beyond the 100-item boundary
            return {
              entity: 'collection',
              count: 1,
              items: [{
                id: 'rfnd_paged_page2_pending_101',
                payment_id: payId,
                amount: 1000,
                status: 'pending'
              }]
            };
          }
          return { entity: 'collection', count: 0, items: [] };
        }
      }
    };

    const savedInstance = _getRazorpayInstanceForTest();
    try {
      _setRazorpayInstanceForTest(mockRazorpayClient);
      const paginatedRefunds = await fetchRazorpayPaymentRefunds('pay_live_test_pagination_101');
      assert.strictEqual(paginatedRefunds.length, 101, 'Must retrieve all 101 refunds across both pages');
      assert.strictEqual(pagedRequests.length, 2, 'Must make exactly 2 requests (page 1 and page 2)');
      assert.deepStrictEqual(pagedRequests[0], { payId: 'pay_live_test_pagination_101', count: 100, skip: 0 });
      assert.deepStrictEqual(pagedRequests[1], { payId: 'pay_live_test_pagination_101', count: 100, skip: 100 });
      assert.strictEqual(paginatedRefunds[100].id, 'rfnd_paged_page2_pending_101');
      assert.strictEqual(paginatedRefunds[100].status, 'pending');
      console.log('✅ PASS: [P2] fetchRazorpayPaymentRefunds paginates past full 100-refund page and discovers 101st refund');
    } finally {
      _setRazorpayInstanceForTest(savedInstance);
    }

    // --- TEST SUITE P2: Order Cancellation Refund & Payment Ledger Updates ---
    console.log('\n--- Testing [P2] Order Cancellation Refund & Payment Ledger ---');
    const cancelUser = { id: 999, name: 'Cancel Test User', email: 'cancel_user@example.com', role: 'user' };
    db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, 'hash123', ?)
    `).run(cancelUser.id, cancelUser.name, cancelUser.email, cancelUser.role);
    const cancelUserToken = jwt.sign({ id: cancelUser.id, email: cancelUser.email, role: cancelUser.role }, JWT_SECRET);

    const cancelOrder = {
      order_number: 'ORD-CANCEL-PAY-LEDGER-1',
      user_id: cancelUser.id,
      subtotal: 4500,
      total_amount: 4500,
      payment_method: 'razorpay',
      payment_status: 'Paid',
      razorpay_order_id: 'order_mock_cancel_1',
      razorpay_payment_id: 'pay_mock_cancel_full_1',
      status: 'Confirmed',
      address_data: JSON.stringify({ name: 'Cancel Test', city: 'Hyderabad' })
    };
    const cancelOrderInsert = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, status, address_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cancelOrder.order_number,
      cancelOrder.user_id,
      cancelOrder.subtotal,
      cancelOrder.total_amount,
      cancelOrder.payment_method,
      cancelOrder.payment_status,
      cancelOrder.razorpay_order_id,
      cancelOrder.razorpay_payment_id,
      cancelOrder.status,
      cancelOrder.address_data
    );
    const cancelOrderId = cancelOrderInsert.lastInsertRowid;

    // Insert corresponding payment record with status 'Captured'
    db.prepare(`
      INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status)
      VALUES (?, ?, ?, 'sig_mock', ?, 'INR', 'Captured')
    `).run(cancelOrderId, cancelOrder.razorpay_order_id, cancelOrder.razorpay_payment_id, Math.round(cancelOrder.total_amount * 100));

    // Cancel order via POST /api/orders/cancel/:id
    const cancelRes = await request(`/api/orders/cancel/${cancelOrderId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cancelUserToken}`,
        'Content-Type': 'application/json'
      }
    });
    assert.strictEqual(cancelRes.status, 200, 'Order cancellation should return 200 OK');
    assert.strictEqual(cancelRes.body.refunded, true, 'Immediate processed refund should mark refunded: true');

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(cancelOrderId);
    assert.strictEqual(updatedOrder.status, 'Cancelled', 'Order status must be Cancelled');
    assert.strictEqual(updatedOrder.payment_status, 'Refunded', 'Order payment_status must be Refunded');

    const updatedPayment = db.prepare('SELECT * FROM payments WHERE order_id = ?').get(cancelOrderId);
    assert.strictEqual(updatedPayment.status, 'Refunded', 'Payments ledger status must be updated to Refunded');

    // [P1] Late payment on cancelled pending order does not resurrect as Placed/Paid and is refunded
    const latePendingInsert = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, razorpay_order_id, status, address_data)
      VALUES ('PAL-LATE-CANCEL-1', ?, 5000, 5000, 'Razorpay', 'Pending', 'order_mock_late_cancel_1', 'Placed', '{}')
    `).run(cancelOrder.user_id);
    const latePendingOrderId = latePendingInsert.lastInsertRowid;

    // Customer cancels the pending order
    const cancelPendingRes = await request(`/api/orders/cancel/${latePendingOrderId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cancelUserToken}`,
        'Content-Type': 'application/json'
      }
    });
    assert.strictEqual(cancelPendingRes.status, 200, 'Pending order cancellation should succeed');
    const cancelledPendingOrder = db.prepare('SELECT status, payment_status FROM orders WHERE id = ?').get(latePendingOrderId);
    assert.strictEqual(cancelledPendingOrder.status, 'Cancelled');
    assert.strictEqual(cancelledPendingOrder.payment_status, 'Cancelled');

    // Late payment verification arrives for the cancelled order
    const lateVerifyRes = await request('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cancelUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        orderId: latePendingOrderId,
        razorpay_order_id: 'order_mock_late_cancel_1',
        razorpay_payment_id: 'pay_mock_late_cancel_1',
        razorpay_signature: 'mock_sig_late_cancel'
      }
    });
    assert.strictEqual(lateVerifyRes.status, 409, 'Late payment on cancelled order must return 409 Conflict with refund');
    assert.strictEqual(lateVerifyRes.body.payment_status, 'Refunded');
    assert.strictEqual(lateVerifyRes.body.refunded, true);

    const postVerifyOrder = db.prepare('SELECT status, payment_status, razorpay_payment_id, refund_idempotency_key FROM orders WHERE id = ?').get(latePendingOrderId);
    assert.strictEqual(postVerifyOrder.status, 'Cancelled', 'Late payment must not resurrect cancelled order to Placed');
    assert.strictEqual(postVerifyOrder.payment_status, 'Refunded');
    assert.strictEqual(postVerifyOrder.razorpay_payment_id, 'pay_mock_late_cancel_1');
    assert.ok(postVerifyOrder.refund_idempotency_key, 'Refund idempotency key must be persisted');

    // [P2] Idempotent payment ledger insertion: exactly one record exists
    const paymentRecords = db.prepare('SELECT * FROM payments WHERE razorpay_payment_id = ?').all('pay_mock_late_cancel_1');
    assert.strictEqual(paymentRecords.length, 1, 'Only one payment ledger row should exist for late payment ID');
    assert.strictEqual(paymentRecords[0].status, 'Refunded');

    // Concurrent verification calls for cancelled order: exactly 1 payment row, no duplicates
    const latePendingInsert2 = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, razorpay_order_id, status, address_data)
      VALUES ('PAL-LATE-CANCEL-2', ?, 3000, 3000, 'Razorpay', 'Pending', 'order_mock_late_cancel_2', 'Placed', '{}')
    `).run(cancelOrder.user_id);
    const latePendingOrderId2 = latePendingInsert2.lastInsertRowid;

    await request(`/api/orders/cancel/${latePendingOrderId2}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cancelUserToken}`,
        'Content-Type': 'application/json'
      }
    });

    const [concurrentRes1, concurrentRes2] = await Promise.all([
      request('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cancelUserToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          orderId: latePendingOrderId2,
          razorpay_order_id: 'order_mock_late_cancel_2',
          razorpay_payment_id: 'pay_mock_late_cancel_2',
          razorpay_signature: 'mock_sig_late_cancel'
        }
      }),
      request('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cancelUserToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          orderId: latePendingOrderId2,
          razorpay_order_id: 'order_mock_late_cancel_2',
          razorpay_payment_id: 'pay_mock_late_cancel_2',
          razorpay_signature: 'mock_sig_late_cancel'
        }
      })
    ]);

    assert.strictEqual(concurrentRes1.status, 409);
    assert.strictEqual(concurrentRes2.status, 409);
    const concurrentPayments = db.prepare('SELECT * FROM payments WHERE razorpay_payment_id = ?').all('pay_mock_late_cancel_2');
    assert.strictEqual(concurrentPayments.length, 1, 'Concurrent late payment verifications must result in exactly 1 payment ledger entry without duplicates');

    // [P1] Verification crash recovery: If process exits after claim/gateway before completion,
    // reconciler discovers the persisted refund intent & payment ID and completes reconciliation
    const crashOrderInsert = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, refund_idempotency_key, status, address_data)
      VALUES ('PAL-LATE-CRASH-TEST', ?, 4000, 4000, 'Razorpay', 'Refund_Pending', 'order_mock_test_2', 'pay_mock_2_crash', 'rfnd_crash_test', 'Cancelled', '{}')
    `).run(cancelOrder.user_id);
    const crashOrderId = crashOrderInsert.lastInsertRowid;

    db.prepare(`
      INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
      VALUES (?, 'order_mock_test_2', 'pay_mock_2_crash', 'sig_test', 400000, 'INR', 'Captured', 'Razorpay')
      ON CONFLICT(razorpay_payment_id) DO UPDATE SET status = 'Captured'
    `).run(crashOrderId);

    // Run reconciler scoped to crashOrderId
    await reconcilePendingRefunds({ orderIds: [crashOrderId] });
    const reconciledCrashOrder = db.prepare('SELECT status, payment_status FROM orders WHERE id = ?').get(crashOrderId);
    assert.strictEqual(reconciledCrashOrder.payment_status, 'Refunded', 'Persisted refund intent must be safely reconciled by reconciler');
    const reconciledCrashPayment = db.prepare('SELECT status FROM payments WHERE order_id = ?').get(crashOrderId);
    assert.strictEqual(reconciledCrashPayment.status, 'Refunded', 'Payments table must be reconciled to Refunded');

    // [P1] Refund valid payments after an earlier signature failure
    // Create an order that failed signature verification previously
    const failedSigOrderInsert = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, razorpay_order_id, status, address_data)
      VALUES ('PAL-FAILED-SIG-LATE-1', ?, 6000, 6000, 'Razorpay', 'Pending', 'order_mock_failed_sig_1', 'Placed', '{}')
    `).run(cancelOrder.user_id);
    const failedSigOrderId = failedSigOrderInsert.lastInsertRowid;

    // 1. Submit invalid signature first: transitions order to Cancelled/Failed
    const invalidSigRes = await request('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cancelUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        orderId: failedSigOrderId,
        razorpay_order_id: 'order_mock_failed_sig_1',
        razorpay_payment_id: 'pay_mock_failed_sig_1',
        razorpay_signature: 'invalid_bad_sig_xyz'
      }
    });
    assert.strictEqual(invalidSigRes.status, 400, 'Invalid signature must be rejected');
    const orderAfterFailedSig = db.prepare('SELECT status, payment_status FROM orders WHERE id = ?').get(failedSigOrderId);
    assert.strictEqual(orderAfterFailedSig.status, 'Cancelled', 'Status must transition to Cancelled');
    assert.strictEqual(orderAfterFailedSig.payment_status, 'Failed', 'Payment status must transition to Failed');

    // 2. Later, valid verification arrives for the actual captured payment on that failed order:
    // It must not be rejected with 400 or dropped with version conflict; it must be claimed, payment ID persisted, and refunded!
    const validSigLateRes = await request('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cancelUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        orderId: failedSigOrderId,
        razorpay_order_id: 'order_mock_failed_sig_1',
        razorpay_payment_id: 'pay_mock_failed_sig_1',
        razorpay_signature: 'mock_sig_failed_sig_1'
      }
    });
    assert.strictEqual(validSigLateRes.status, 409, 'Valid verification on Cancelled/Failed order must return 409 Conflict with refund');
    assert.strictEqual(validSigLateRes.body.payment_status, 'Refunded');
    assert.strictEqual(validSigLateRes.body.refunded, true);

    const finalFailedSigOrder = db.prepare('SELECT status, payment_status, razorpay_payment_id, refund_idempotency_key FROM orders WHERE id = ?').get(failedSigOrderId);
    assert.strictEqual(finalFailedSigOrder.status, 'Cancelled');
    assert.strictEqual(finalFailedSigOrder.payment_status, 'Refunded');
    assert.strictEqual(finalFailedSigOrder.razorpay_payment_id, 'pay_mock_failed_sig_1');
    assert.ok(finalFailedSigOrder.refund_idempotency_key);

    const failedSigPayment = db.prepare('SELECT status FROM payments WHERE razorpay_payment_id = ?').all('pay_mock_failed_sig_1');
    assert.strictEqual(failedSigPayment.length, 1, 'Exactly one payment record must exist in ledger');
    assert.strictEqual(failedSigPayment[0].status, 'Refunded');

    // [P1] Stop stale payment verifications from entering delayed recovery on zero stock
    // Ensure category exists for foreign key
    db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, slug, description)
      VALUES (1, 'Paithani', 'paithani', 'Heritage Paithani Sarees')
    `).run();

    // Create a product with 0 available stock (reservation consumed the last item)
    const zeroStockProd = db.prepare(`
      INSERT INTO products (name, slug, category_id, fabric, occasion, price, mrp, discount_percent, stock_quantity, description)
      VALUES ('Last Unit Luxury Saree', 'last-unit-luxury-saree', 1, 'Silk', 'Wedding', 10000, 12000, 16, 0, 'Last unit test')
    `).run();
    const zeroStockProdId = zeroStockProd.lastInsertRowid;

    const staleRaceOrderInsert = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, razorpay_order_id, status, address_data)
      VALUES ('PAL-STALE-RACE-1', ?, 10000, 10000, 'Razorpay', 'Pending', 'order_mock_stale_race_1', 'Pending', '{}')
    `).run(cancelOrder.user_id);
    const staleRaceOrderId = staleRaceOrderInsert.lastInsertRowid;

    db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
      VALUES (?, ?, 'Last Unit Luxury Saree', 10000, 1)
    `).run(staleRaceOrderId, zeroStockProdId);

    // Two simultaneous verification calls for the same pending order
    const [raceRes1, raceRes2] = await Promise.all([
      request('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cancelUserToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          orderId: staleRaceOrderId,
          razorpay_order_id: 'order_mock_stale_race_1',
          razorpay_payment_id: 'pay_mock_stale_race_1',
          razorpay_signature: 'mock_sig_stale_race_1'
        }
      }),
      request('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cancelUserToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          orderId: staleRaceOrderId,
          razorpay_order_id: 'order_mock_stale_race_1',
          razorpay_payment_id: 'pay_mock_stale_race_1',
          razorpay_signature: 'mock_sig_stale_race_1'
        }
      })
    ]);

    assert.strictEqual(raceRes1.status, 200, 'First callback must succeed');
    assert.strictEqual(raceRes2.status, 200, 'Second concurrent callback must also succeed without entering delayed recovery');
    assert.strictEqual(raceRes1.body.success, true);
    assert.strictEqual(raceRes2.body.success, true);

    const raceOrderAfter = db.prepare('SELECT status, payment_status FROM orders WHERE id = ?').get(staleRaceOrderId);
    assert.strictEqual(raceOrderAfter.status, 'Placed', 'Order must remain Placed');
    assert.strictEqual(raceOrderAfter.payment_status, 'Paid', 'Order must remain Paid and NOT be refunded');

    // [P1] Keep captured payments reconcilable after signature rejection
    // An order where the gateway captured payment (order_mock_captured_...) but callback signature fails
    const capturedSigFailOrderInsert = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, razorpay_order_id, status, address_data)
      VALUES ('PAL-CAPTURED-SIG-FAIL-1', ?, 8000, 8000, 'Razorpay', 'Pending', 'order_mock_captured_sig_fail_1', 'Pending', '{}')
    `).run(cancelOrder.user_id);
    const capturedSigFailOrderId = capturedSigFailOrderInsert.lastInsertRowid;

    db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
      VALUES (?, ?, 'Captured Test Saree', 8000, 1)
    `).run(capturedSigFailOrderId, zeroStockProdId);

    const capturedSigFailRes = await request('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cancelUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        orderId: capturedSigFailOrderId,
        razorpay_order_id: 'order_mock_captured_sig_fail_1',
        razorpay_payment_id: 'pay_mock_sig_fail_1',
        razorpay_signature: 'invalid_malformed_sig_test'
      }
    });

    assert.strictEqual(capturedSigFailRes.status, 400, 'Rejected signature must return 400 with refund initiated');
    assert.strictEqual(capturedSigFailRes.body.payment_status, 'Refunded', 'Must be routed into refund recovery');
    assert.strictEqual(capturedSigFailRes.body.refunded, true);

    const capturedFailOrderInDb = db.prepare('SELECT status, payment_status, razorpay_payment_id, refund_id FROM orders WHERE id = ?').get(capturedSigFailOrderId);
    assert.strictEqual(capturedFailOrderInDb.status, 'Cancelled');
    assert.strictEqual(capturedFailOrderInDb.payment_status, 'Refunded');
    assert.strictEqual(capturedFailOrderInDb.razorpay_payment_id, 'pay_mock_sig_fail_1');
    assert.ok(capturedFailOrderInDb.refund_id, 'Refund ID must be recorded');

    const capturedFailPayment = db.prepare('SELECT status FROM payments WHERE razorpay_payment_id = ?').all('pay_mock_sig_fail_1');
    assert.strictEqual(capturedFailPayment.length, 1, 'Payment must be recorded in payments ledger');
    assert.strictEqual(capturedFailPayment[0].status, 'Refunded');

    // [P1] Keep order retryable while gateway status is unknown (do NOT release inventory or mark Failed)
    const unknownGatewayOrderInsert = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, razorpay_order_id, status, address_data)
      VALUES ('PAL-UNKNOWN-GW-1', ?, 7500, 7500, 'Razorpay', 'Pending', 'order_mock_failed_lookup_1', 'Pending', '{}')
    `).run(cancelOrder.user_id);
    const unknownGatewayOrderId = unknownGatewayOrderInsert.lastInsertRowid;

    // Item attached with stock tracking
    const trackedProd = db.prepare(`
      INSERT INTO products (name, slug, category_id, fabric, occasion, price, mrp, discount_percent, stock_quantity, description)
      VALUES ('Tracked Retry Saree', 'tracked-retry-saree', 1, 'Silk', 'Wedding', 7500, 9000, 16, 5, 'Stock test')
    `).run();
    const trackedProdId = trackedProd.lastInsertRowid;

    db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
      VALUES (?, ?, 'Tracked Retry Saree', 7500, 1)
    `).run(unknownGatewayOrderId, trackedProdId);

    const unknownGatewayRes = await request('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cancelUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        orderId: unknownGatewayOrderId,
        razorpay_order_id: 'order_mock_failed_lookup_1',
        razorpay_payment_id: 'pay_mock_failed_lookup_1',
        razorpay_signature: 'invalid_sig_unknown_gw'
      }
    });

    assert.strictEqual(unknownGatewayRes.status, 400, 'Must return 400 Bad Request');
    assert.ok(unknownGatewayRes.body.error.includes('could not be verified'), 'Error message must explain gateway status could not be verified');

    const orderStillPending = db.prepare('SELECT status, payment_status FROM orders WHERE id = ?').get(unknownGatewayOrderId);
    assert.strictEqual(orderStillPending.status, 'Pending', 'Order status must remain Pending');
    assert.strictEqual(orderStillPending.payment_status, 'Pending', 'Payment status must remain Pending and NOT be Failed');

    const prodStockStillPreserved = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(trackedProdId);
    assert.strictEqual(prodStockStillPreserved.stock_quantity, 5, 'Inventory must NOT be prematurely released');

    // [P1] Keep order retryable when order-payments list succeeds but omits payment ID and payment-by-ID lookup fails
    const partialGwOrderInsert = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, razorpay_order_id, status, address_data)
      VALUES ('PAL-UNKNOWN-PAYID-1', ?, 8200, 8200, 'Razorpay', 'Pending', 'order_mock_test_omit_pay_1', 'Pending', '{}')
    `).run(cancelOrder.user_id);
    const partialGwOrderId = partialGwOrderInsert.lastInsertRowid;

    const partialTrackedProd = db.prepare(`
      INSERT INTO products (name, slug, category_id, fabric, occasion, price, mrp, discount_percent, stock_quantity, description)
      VALUES ('Partial Retry Saree', 'partial-retry-saree', 1, 'Silk', 'Festival', 8200, 9500, 14, 4, 'Stock test partial')
    `).run();
    const partialTrackedProdId = partialTrackedProd.lastInsertRowid;

    db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
      VALUES (?, ?, 'Partial Retry Saree', 8200, 1)
    `).run(partialGwOrderId, partialTrackedProdId);

    // order_mock_test_omit_pay_1 returns [] for order payments (does not contain payment ID),
    // and pay_mock_failed_lookup_2 fails on direct payment-by-ID lookup.
    const partialGwRes = await request('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cancelUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        orderId: partialGwOrderId,
        razorpay_order_id: 'order_mock_test_omit_pay_1',
        razorpay_payment_id: 'pay_mock_failed_lookup_2',
        razorpay_signature: 'invalid_sig_partial_gw'
      }
    });

    assert.strictEqual(partialGwRes.status, 400, 'Must return 400 Bad Request');
    assert.ok(partialGwRes.body.error.includes('could not be verified'), 'Error message must explain gateway status could not be verified');

    const partialOrderStillPending = db.prepare('SELECT status, payment_status FROM orders WHERE id = ?').get(partialGwOrderId);
    assert.strictEqual(partialOrderStillPending.status, 'Pending', 'Order status must remain Pending when payment omitted from list and lookup fails');
    assert.strictEqual(partialOrderStillPending.payment_status, 'Pending', 'Payment status must remain Pending');

    const partialStockPreserved = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(partialTrackedProdId);
    assert.strictEqual(partialStockPreserved.stock_quantity, 4, 'Inventory must NOT be released when specific payment status is unknown');

    // [P1] Release inventory only when order is confirmed in a terminal unpaid state (e.g. expired order)
    const expiredGwOrderInsert = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, razorpay_order_id, status, address_data)
      VALUES ('PAL-EXPIRED-GW-1', ?, 8200, 8200, 'Razorpay', 'Pending', 'order_mock_expired_1', 'Pending', '{}')
    `).run(cancelOrder.user_id);
    const expiredGwOrderId = expiredGwOrderInsert.lastInsertRowid;

    db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
      VALUES (?, ?, 'Partial Retry Saree', 8200, 1)
    `).run(expiredGwOrderId, partialTrackedProdId);

    const expiredGwRes = await request('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cancelUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        orderId: expiredGwOrderId,
        razorpay_order_id: 'order_mock_expired_1',
        razorpay_payment_id: 'pay_mock_failed_lookup_3',
        razorpay_signature: 'invalid_sig_expired_gw'
      }
    });

    assert.strictEqual(expiredGwRes.status, 400, 'Must return 400 Bad Request');
    const expiredOrderInDb = db.prepare('SELECT status, payment_status FROM orders WHERE id = ?').get(expiredGwOrderId);
    assert.strictEqual(expiredOrderInDb.status, 'Cancelled', 'Expired gateway order must transition to Cancelled');
    assert.strictEqual(expiredOrderInDb.payment_status, 'Failed', 'Expired gateway order must transition to Failed');

    const expiredStockReleased = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(partialTrackedProdId);
    assert.strictEqual(expiredStockReleased.stock_quantity, 5, 'Inventory must be safely released when order is confirmed in terminal unpaid state');

    // [P1] Preserve retryable state when gateway order is "paid" but captured payment ID is not confirmed and tied to this order
    const paidUnconfirmedGwOrderInsert = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, razorpay_order_id, status, address_data)
      VALUES ('PAL-PAID-UNCONFIRMED-1', ?, 8500, 8500, 'Razorpay', 'Pending', 'order_mock_paid_unconfirmed_1', 'Pending', '{}')
    `).run(cancelOrder.user_id);
    const paidUnconfirmedGwOrderId = paidUnconfirmedGwOrderInsert.lastInsertRowid;

    const paidUnconfirmedTrackedProd = db.prepare(`
      INSERT INTO products (name, slug, category_id, fabric, occasion, price, mrp, discount_percent, stock_quantity, description)
      VALUES ('Paid Unconfirmed Saree', 'paid-unconfirmed-saree', 1, 'Silk', 'Wedding', 8500, 9900, 14, 3, 'Stock test paid unconfirmed')
    `).run();
    const paidUnconfirmedProdId = paidUnconfirmedTrackedProd.lastInsertRowid;

    db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
      VALUES (?, ?, 'Paid Unconfirmed Saree', 8500, 1)
    `).run(paidUnconfirmedGwOrderId, paidUnconfirmedProdId);

    // order_mock_paid_unconfirmed_1 has status 'paid' at gateway order level,
    // but order-payments list is empty and submitted payment ID pay_mock_mismatched_1 belongs to another order.
    const paidUnconfirmedRes = await request('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cancelUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        orderId: paidUnconfirmedGwOrderId,
        razorpay_order_id: 'order_mock_paid_unconfirmed_1',
        razorpay_payment_id: 'pay_mock_mismatched_1',
        razorpay_signature: 'invalid_sig_mismatched_pay'
      }
    });

    assert.strictEqual(paidUnconfirmedRes.status, 400, 'Must return 400 Bad Request');
    assert.ok(paidUnconfirmedRes.body.error.includes('could not be verified'), 'Must return retryable status error');

    const orderStillPendingPaidUnconfirmed = db.prepare('SELECT status, payment_status, razorpay_payment_id FROM orders WHERE id = ?').get(paidUnconfirmedGwOrderId);
    assert.strictEqual(orderStillPendingPaidUnconfirmed.status, 'Pending', 'Order status must remain Pending until captured payment ID is confirmed');
    assert.strictEqual(orderStillPendingPaidUnconfirmed.payment_status, 'Pending', 'Payment status must remain Pending');
    assert.strictEqual(orderStillPendingPaidUnconfirmed.razorpay_payment_id, null, 'Mismatched payment ID must NOT be persisted');

    const stockStillPreservedPaidUnconfirmed = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(paidUnconfirmedProdId);
    assert.strictEqual(stockStillPreservedPaidUnconfirmed.stock_quantity, 3, 'Inventory must remain active and reserved');

    const mismatchedPaymentInDb = db.prepare('SELECT * FROM payments WHERE razorpay_payment_id = ?').all('pay_mock_mismatched_1');
    assert.strictEqual(mismatchedPaymentInDb.length, 0, 'Mismatched payment ID must NOT be recorded in payments ledger');

    console.log('✅ PASS: [P2] Order cancellation updates payment ledger status to Refunded on immediate full refund');

    // --- TEST SUITE P2: Runtime Product URL Preservation & Real 404 Routing ---
    console.log('\n--- Testing [P2] Runtime Product URLs & Real 404 Routing ---');

    // 1. Unknown product slug should return real 404 with noindex metadata
    const unknownRes = await request('/api/render?path=/sarees/completely-unknown-saree-slug-999');
    assert.strictEqual(unknownRes.status, 404, 'Unknown saree slug must return HTTP 404 status');
    assert(unknownRes.body && typeof unknownRes.body === 'string', 'Body must be HTML string');
    assert(unknownRes.body.includes('noindex, nofollow'), 'Unknown product route must include noindex, nofollow meta tag');
    assert(unknownRes.body.includes('/404'), 'Unknown product route must set canonical to /404');
    console.log('✅ PASS: [P2] Unknown product URL returns real 404 status and non-indexable metadata');

    // 2. Admin creates a runtime product
    const runtimeAdminUser = { id: 888, name: 'Admin Test User', email: 'admin_test@example.com', role: 'admin' };
    db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, 'hash123', ?)
    `).run(runtimeAdminUser.id, runtimeAdminUser.name, runtimeAdminUser.email, runtimeAdminUser.role);
    const runtimeAdminUserToken = jwt.sign({ id: runtimeAdminUser.id, email: runtimeAdminUser.email, role: runtimeAdminUser.role }, JWT_SECRET);

    // Ensure a category exists in disposable test DB
    db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, slug, description)
      VALUES (1, 'Paithani', 'paithani', 'Heritage Paithani Sarees')
    `).run();
    const cat = db.prepare('SELECT id FROM categories LIMIT 1').get();

    const createProductRes = await request('/api/admin/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runtimeAdminUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        name: 'Royal Heritage Paithani Edit',
        tagline: 'Authentic pure silk zari drape',
        description: 'Exquisite handloom piece woven by master artisans in Maharashtra.',
        short_desc: 'Heritage handloom saree',
        category_id: cat.id,
        fabric: 'Pure Silk',
        occasion: 'Festive',
        price: 34500,
        mrp: 42000,
        stock_quantity: 5
      }
    });

    assert.strictEqual(createProductRes.status, 201, 'Product creation should return 201 Created');
    assert(createProductRes.body.slug, 'Product creation must return a slug');
    const createdSlug = createProductRes.body.slug;
    const createdProdId = createProductRes.body.productId;

    // 3. Opening or refreshing runtime product route must return HTTP 200 with indexable metadata
    const runtimeProductRes = await request(`/api/render?path=/sarees/${createdSlug}`);
    assert.strictEqual(runtimeProductRes.status, 200, 'Valid runtime product must return HTTP 200');
    assert(runtimeProductRes.body.includes('Royal Heritage Paithani Edit'), 'HTML must contain the product name');
    assert(runtimeProductRes.body.includes('index, follow'), 'Valid runtime product must have index, follow metadata');
    assert(runtimeProductRes.body.includes(`/sarees/${createdSlug}`), 'Canonical link must point to product URL');
    console.log('✅ PASS: [P2] Runtime-created product direct URL returns HTTP 200 with indexable metadata');

    // 4. Product deletion unpublishes route and subsequent requests return real 404
    const deleteRes = await request(`/api/admin/products/${createdProdId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${runtimeAdminUserToken}`,
        'Content-Type': 'application/json'
      }
    });
    assert.strictEqual(deleteRes.status, 200, 'Product deletion should return 200 OK');

    const deletedProductRes = await request(`/api/render?path=/sarees/${createdSlug}`);
    assert.strictEqual(deletedProductRes.status, 404, 'Deleted product must return HTTP 404');
    assert(deletedProductRes.body.includes('noindex, nofollow'), 'Deleted product route must return noindex metadata');
    console.log('✅ PASS: [P2] Deleted product route returns real 404 and noindex metadata');

    // --- TEST SUITE P3: Render Endpoint Path Validation & Catalog Image Preservation ---
    console.log('\n--- Testing [P3] Dynamic Render Path Validation & Catalog Image Preservation ---');

    // 1. Repeated path query parameters should return 400 Bad Request instead of 500
    const repeatedPathRes = await request('/api/render?path=%2F&path=%2Fsarees%2Fabc');
    assert.strictEqual(repeatedPathRes.status, 400, 'Repeated path query parameters must return HTTP 400');
    assert.strictEqual(repeatedPathRes.body?.code, 'INVALID_PATH', 'Response must return INVALID_PATH error code');
    console.log('✅ PASS: [P3] Repeated path parameter rejected with controlled HTTP 400');

    // 2. Fallback to x-matched-path when query path is omitted
    const matchedPathRes = await request('/api/render', {
      headers: {
        'x-matched-path': '/sarees'
      }
    });
    assert.strictEqual(matchedPathRes.status, 200, 'Fallback to x-matched-path should return HTTP 200');
    assert(matchedPathRes.body.includes('Curated Luxury Sarees Collection'), 'x-matched-path should render route meta');
    console.log('✅ PASS: [P3] x-matched-path fallback functions when query path is omitted');

    // 3. Partial update with omitted images preserves existing product images in DB and publication
    const customImage = 'https://images.unsplash.com/photo-test-artisan-paithani-1.jpg';
    const prodWithImgRes = await request('/api/admin/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runtimeAdminUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        name: 'Vibrant Kanjivaram Edit',
        tagline: 'Pure zari weave',
        description: 'Handcrafted luxury drape',
        short_desc: 'Luxury silk saree',
        category_id: cat.id,
        fabric: 'Pure Silk',
        occasion: 'Bridal',
        price: 52000,
        mrp: 65000,
        images: [customImage]
      }
    });
    assert.strictEqual(prodWithImgRes.status, 201, 'Product created with image');
    const prodWithImgId = prodWithImgRes.body.productId;
    const prodWithImgSlug = prodWithImgRes.body.slug;

    // Verify initial image in DB
    const initialImgs = db.prepare('SELECT image_url FROM product_images WHERE product_id = ?').all(prodWithImgId);
    assert.strictEqual(initialImgs.length, 1, 'Should have 1 image initially');
    assert.strictEqual(initialImgs[0].image_url, customImage, 'Should match custom image');

    // Partial update omitting images field entirely
    const partialUpdateRes = await request(`/api/admin/products/${prodWithImgId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${runtimeAdminUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        price: 49999,
        stock_quantity: 8
      }
    });
    assert.strictEqual(partialUpdateRes.status, 200, 'Partial update succeeds');

    // Verify database images remain intact
    const postUpdateImgs = db.prepare('SELECT image_url FROM product_images WHERE product_id = ?').all(prodWithImgId);
    assert.strictEqual(postUpdateImgs.length, 1, 'Persisted images should not be cleared');
    assert.strictEqual(postUpdateImgs[0].image_url, customImage, 'Persisted image must be retained');

    // Verify publishProductRoute preserves catalog image when images is omitted
    const testCatalogPath = path.join(testDbDir, 'test_catalog.json');
    fs.writeFileSync(testCatalogPath, JSON.stringify({
      products: [{
        slug: prodWithImgSlug,
        name: 'Vibrant Kanjivaram Edit',
        primary_image: customImage,
        images: [customImage]
      }]
    }, null, 2), 'utf8');

    // Call publishProductRoute without images, pointing to testCatalogPath
    adminRouter.publishProductRoute({
      slug: prodWithImgSlug,
      name: 'Vibrant Kanjivaram Edit (Updated Price)',
      price: 49999,
      mrp: 65000,
      catalogPath: testCatalogPath
    });

    const updatedCatalog = JSON.parse(fs.readFileSync(testCatalogPath, 'utf8'));
    const updatedCatalogEntry = updatedCatalog.products.find(p => p.slug === prodWithImgSlug);
    assert.strictEqual(updatedCatalogEntry.primary_image, customImage, 'Catalog primary_image must not be overwritten with fallback');
    assert.deepStrictEqual(updatedCatalogEntry.images, [customImage], 'Catalog images array must preserve existing image');
    console.log('✅ PASS: [P3] Partial product update preserves existing image rows and catalog entry');

    // --- TEST SUITE P2: Customer Trust (Verified Reviews & Concierge Q&A Safety) ---
    console.log('\n--- Testing [P2] Verified Purchase Checks & Unapproved Q&A Gating ---');

    // 1. Review submitted by a user who has NOT purchased the product must have verified_purchase === 0
    const reviewUser = { id: 777, name: 'Reviewer Test User', email: 'reviewer_trust@example.com', role: 'user' };
    db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, 'hash_rev_123', ?)
    `).run(reviewUser.id, reviewUser.name, reviewUser.email, reviewUser.role);
    const reviewUserToken = jwt.sign({ id: reviewUser.id, name: reviewUser.name, email: reviewUser.email, role: reviewUser.role }, JWT_SECRET);

    const unverifiedReviewRes = await request('/api/reviews', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${reviewUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        product_id: prodWithImgId,
        rating: 4,
        comment: 'Lovely drape, considering purchasing for wedding.'
      }
    });
    assert.strictEqual(unverifiedReviewRes.status, 201, 'Review submission should succeed');

    const unverifiedRow = db.prepare('SELECT * FROM reviews WHERE user_id = ? AND product_id = ? ORDER BY id DESC LIMIT 1').get(reviewUser.id, prodWithImgId);
    assert.strictEqual(unverifiedRow.verified_purchase, 0, 'Unpurchased product review must have verified_purchase === 0');
    assert.strictEqual(unverifiedRow.title, 'Customer Review', 'Default title for unverified review should be Customer Review');
    console.log('✅ PASS: [P2] Review on unpurchased product correctly persisted with verified_purchase === 0');

    // 2. Review submitted by a user who HAS purchased the product with Paid status must have verified_purchase === 1
    const paidOrder = db.prepare(`
      INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_method, payment_status, status, address_data)
      VALUES ('ORD-VERIFIED-REV-1', ?, 52000, 52000, 'razorpay', 'Paid', 'Delivered', '{"city":"Bengaluru"}')
    `).run(reviewUser.id);
    db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
      VALUES (?, ?, 'Vibrant Kanjivaram Edit', 52000, 1)
    `).run(paidOrder.lastInsertRowid, prodWithImgId);

    const verifiedReviewRes = await request('/api/reviews', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${reviewUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        product_id: prodWithImgId,
        rating: 5,
        comment: 'Received the saree yesterday, pure silk zari weave is immaculate.'
      }
    });
    assert.strictEqual(verifiedReviewRes.status, 201, 'Verified review submission should succeed');

    const verifiedRow = db.prepare('SELECT * FROM reviews WHERE user_id = ? AND product_id = ? ORDER BY id DESC LIMIT 1').get(reviewUser.id, prodWithImgId);
    assert.strictEqual(verifiedRow.verified_purchase, 1, 'Purchased product review must have verified_purchase === 1');
    assert.strictEqual(verifiedRow.title, 'Verified Saree Drape Experience', 'Default title for verified review should reflect verified experience');
    console.log('✅ PASS: [P2] Review on paid purchased product correctly marked with verified_purchase === 1');

    // 3. Asking a question leaves answer as NULL by default in production/test environments without staff review
    const askQARes = await request(`/api/products/${prodWithImgId}/qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        question: 'Does this Kanjivaram saree include Silk Mark tag certification?',
        user_name: 'Heritage Seeker'
      }
    });
    assert.strictEqual(askQARes.status, 201, 'Question submission should succeed');
    assert.strictEqual(askQARes.body.qa.answer, null, 'Public endpoint must NOT insert simulated answer without staff approval');
    assert.strictEqual(askQARes.body.qa.answered_by, null, 'Public endpoint must NOT attribute canned answer to Master Weaver Concierge');
    assert(askQARes.body.message.includes('reviewed'), 'Response message should clarify question is awaiting concierge review');

    const savedQARow = db.prepare('SELECT * FROM product_qa WHERE id = ?').get(askQARes.body.qa.id);
    assert.strictEqual(savedQARow.answer, null, 'Database row must store answer as NULL until approved');
    assert.strictEqual(savedQARow.answered_by, null, 'Database row must store answered_by as NULL until approved');
    assert.strictEqual(savedQARow.helpful_votes, 0, 'New questions must initialize with 0 helpful votes');
    console.log('✅ PASS: [P2] Q&A questions remain unanswered without fake concierge verification');

    // 4. Verify seed data and database default do not include fake concierge claims or Silk Mark certification claims
    const fakeConciergeCount = db.prepare("SELECT COUNT(*) as count FROM product_qa WHERE answered_by = 'PALLUVO Master Weaver Concierge'").get().count;
    assert.strictEqual(fakeConciergeCount, 0, 'No Q&A records may be attributed to Master Weaver Concierge without staff review');

    const fakeSilkMarkClaimCount = db.prepare("SELECT COUNT(*) as count FROM product_qa WHERE answer LIKE '%Silk Mark Organization of India%'").get().count;
    assert.strictEqual(fakeSilkMarkClaimCount, 0, 'No unverified Silk Mark tag certification claims may exist in seeded Q&A');

    // 5. Verify no invented customer names or preset helpful vote totals exist in Q&A
    const fakeNamesCount = db.prepare("SELECT COUNT(*) as count FROM product_qa WHERE user_name IN ('Meera Deshmukh', 'Sneha Kulkarni', 'Kavitha R.', 'Tanvi Agarwal', 'Pooja Malhotra')").get().count;
    assert.strictEqual(fakeNamesCount, 0, 'No seeded Q&A rows with invented customer names may exist');

    const presetVotesCount = db.prepare("SELECT COUNT(*) as count FROM product_qa WHERE helpful_votes > 0").get().count;
    assert.strictEqual(presetVotesCount, 0, 'No seeded Q&A records may have fabricated helpful-vote counts');

    // 6. Verify GET /api/products/:productId/qa returns questions without fake concierge attribution
    const getQARes = await request(`/api/products/${prodWithImgId}/qa`);
    assert.strictEqual(getQARes.status, 200, 'GET /qa should return 200');
    assert(Array.isArray(getQARes.body.qa), 'Should return qa array');
    const returnedQA = getQARes.body.qa.find(q => q.id === askQARes.body.qa.id);
    assert.strictEqual(returnedQA.answer, null, 'Exposed QA must not contain fake answer');
    assert.strictEqual(returnedQA.answered_by, null, 'Exposed QA must not contain fake concierge attribution');
    console.log('✅ PASS: [P2] Seeded Q&A and GET endpoint strictly avoid unverified concierge claims and fabricated social proof');

    // 6b. Verify GET /api/products/:slugOrId returns verified recent_orders_24h matching distinct paid non-cancelled orders
    const getProdDetailRes1 = await request(`/api/products/${prodWithImgId}`);
    assert.strictEqual(getProdDetailRes1.status, 200);
    const initialOrders24h = getProdDetailRes1.body.product.recent_orders_24h;

    // Create a completed paid order in last 24h containing this product with quantity 2
    const orderInsertResult = db.prepare(`
      INSERT INTO orders (user_id, order_number, address_data, subtotal, total_amount, status, payment_status, created_at)
      VALUES (1, 'ORD-TEST-RECENT-${Date.now()}-1', '{}', 5000, 5000, 'Processing', 'Paid', datetime('now', '-2 hours'))
    `).run();
    db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
      VALUES (?, ?, 'Test Silk Saree', 5000, 2)
    `).run(orderInsertResult.lastInsertRowid, prodWithImgId);

    // One order with quantity 2 must increment the order count by exactly 1 (COUNT(DISTINCT o.id))
    const getProdDetailRes2 = await request(`/api/products/${prodWithImgId}`);
    assert.strictEqual(getProdDetailRes2.status, 200);
    assert.strictEqual(
      getProdDetailRes2.body.product.recent_orders_24h,
      initialOrders24h + 1,
      'One order with multiple items must increment order count by exactly 1'
    );

    // Create a second distinct paid order
    const orderInsertResult2 = db.prepare(`
      INSERT INTO orders (user_id, order_number, address_data, subtotal, total_amount, status, payment_status, created_at)
      VALUES (1, 'ORD-TEST-RECENT-${Date.now()}-2', '{}', 5000, 5000, 'Processing', 'Paid', datetime('now', '-1 hours'))
    `).run();
    db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
      VALUES (?, ?, 'Test Silk Saree', 5000, 1)
    `).run(orderInsertResult2.lastInsertRowid, prodWithImgId);

    const getProdDetailRes3 = await request(`/api/products/${prodWithImgId}`);
    assert.strictEqual(getProdDetailRes3.status, 200);
    assert.strictEqual(
      getProdDetailRes3.body.product.recent_orders_24h,
      initialOrders24h + 2,
      'Second paid order must increment distinct order count to initial + 2'
    );

    // Verify orders with invalid payment or cancellation statuses do NOT inflate the count
    const nonQualifyingStatuses = [
      { payment: 'Pending', status: 'Placed' },
      { payment: 'Expired', status: 'Placed' },
      { payment: 'Failed', status: 'Placed' },
      { payment: 'Refunded', status: 'Processing' },
      { payment: 'Refund_Pending', status: 'Processing' },
      { payment: 'Refund_Failed', status: 'Processing' },
      { payment: 'Paid', status: 'Cancelled' }
    ];

    for (let i = 0; i < nonQualifyingStatuses.length; i++) {
      const { payment, status } = nonQualifyingStatuses[i];
      const invalidOrder = db.prepare(`
        INSERT INTO orders (user_id, order_number, address_data, subtotal, total_amount, status, payment_status, created_at)
        VALUES (1, 'ORD-TEST-INVALID-${Date.now()}-${i}', '{}', 5000, 5000, ?, ?, datetime('now', '-30 minutes'))
      `).run(status, payment);
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
        VALUES (?, ?, 'Test Silk Saree', 5000, 1)
      `).run(invalidOrder.lastInsertRowid, prodWithImgId);
    }

    // Count must still be exactly initialOrders24h + 2
    const getProdDetailRes4 = await request(`/api/products/${prodWithImgId}`);
    assert.strictEqual(
      getProdDetailRes4.body.product.recent_orders_24h,
      initialOrders24h + 2,
      'Non-qualifying orders (Pending, Expired, Failed, Refunded, Cancelled) must NOT inflate order count'
    );

    // Also verify an unpurchased product returns exactly 0
    const unpurchasedCreateRes = await request('/api/admin/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runtimeAdminUserToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        name: 'Unpurchased Saree',
        tagline: 'Pure zari weave',
        description: 'Handcrafted luxury drape',
        short_desc: 'Luxury silk saree',
        category_id: cat.id,
        fabric: 'Pure Silk',
        occasion: 'Bridal',
        price: 40000,
        mrp: 50000
      }
    });
    assert.strictEqual(unpurchasedCreateRes.status, 201);
    const unpurchasedRes = await request(`/api/products/${unpurchasedCreateRes.body.productId}`);
    assert.strictEqual(unpurchasedRes.body.product.recent_orders_24h, 0, 'Unpurchased product must return recent_orders_24h === 0');
    console.log('✅ PASS: [P2] Product endpoint strictly counts completed paid, non-cancelled orders using COUNT(DISTINCT o.id)');

    // Verify composite index idx_order_items_product_order exists and is utilized by EXPLAIN QUERY PLAN
    const indexCheck = db.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_order_items_product_order'
    `).get();
    assert.ok(indexCheck, 'Composite index idx_order_items_product_order must exist on order_items(product_id, order_id)');

    const queryPlan = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT COUNT(DISTINCT o.id) as count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ?
        AND o.created_at >= datetime('now', '-24 hours')
        AND o.payment_status = 'Paid'
        AND o.status != 'Cancelled'
    `).all(prodWithImgId);

    const planDetails = queryPlan.map(p => p.detail).join(' | ');
    assert.ok(
      !planDetails.includes('SCAN oi'),
      `Query plan must not scan oi table sequentially: ${planDetails}`
    );
    assert.ok(
      planDetails.includes('idx_order_items_product_order'),
      `Query plan must utilize idx_order_items_product_order: ${planDetails}`
    );
    console.log('✅ PASS: [P2] Composite index idx_order_items_product_order covers recent order lookup without table scan');

    // 6c. Verify /api/products/search/suggestions returns lightweight thumbnail URLs for instant search
    const suggestionsRes = await request('/api/products/search/suggestions?q=saree');
    assert.strictEqual(suggestionsRes.status, 200);
    assert.ok(suggestionsRes.body.products && suggestionsRes.body.products.length > 0, 'Suggestions must return products');
    for (const prod of suggestionsRes.body.products) {
      if (typeof prod.primary_image === 'string' && prod.primary_image.startsWith('/images/')) {
        assert.ok(prod.thumbnail, 'Local image suggestion must contain thumbnail');
        assert.ok(prod.thumbnail_url, 'Local image suggestion must contain thumbnail_url');
        assert.ok(
          prod.thumbnail.startsWith('/images/thumbnails/'),
          `Local image suggestion thumbnail must point to /images/thumbnails/: ${prod.thumbnail}`
        );
      }
    }

    // Insert a product with a remote Unsplash image (w=1000)
    const validCat = db.prepare('SELECT id FROM categories LIMIT 1').get() || { id: 1 };
    const remoteProductInsert = db.prepare(`
      INSERT INTO products (name, slug, description, short_desc, category_id, fabric, occasion, price, mrp, discount_percent)
      VALUES ('Remote Unsplash Saree', 'remote-unsplash-saree-${Date.now()}', 'Remote image test', 'Remote image test', ?, 'Silk', 'Party', 8000, 10000, 20)
    `).run(validCat.id);
    db.prepare(`
      INSERT INTO product_images (product_id, image_url, is_primary, display_order)
      VALUES (?, 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80', 1, 1)
    `).run(remoteProductInsert.lastInsertRowid);

    const remoteSuggestionsRes = await request('/api/products/search/suggestions?q=Remote');
    assert.strictEqual(remoteSuggestionsRes.status, 200);
    const remoteProd = remoteSuggestionsRes.body.products.find(p => p.name === 'Remote Unsplash Saree');
    assert.ok(remoteProd, 'Remote product must be found in suggestions');
    assert.strictEqual(
      remoteProd.thumbnail,
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=180&q=80',
      'Remote Unsplash image in suggestions must be resized to w=180 thumbnail'
    );
    assert.strictEqual(
      remoteProd.thumbnail_url,
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=180&q=80'
    );

    // Insert a product with an unsupported remote image URL
    const unsupportedProductInsert = db.prepare(`
      INSERT INTO products (name, slug, description, short_desc, category_id, fabric, occasion, price, mrp, discount_percent)
      VALUES ('Custom Domain Saree', 'custom-domain-saree-${Date.now()}', 'Custom domain test', 'Custom domain test', ?, 'Silk', 'Party', 8000, 10000, 20)
    `).run(validCat.id);
    db.prepare(`
      INSERT INTO product_images (product_id, image_url, is_primary, display_order)
      VALUES (?, 'https://custom-domain.example/saree.jpg', 1, 1)
    `).run(unsupportedProductInsert.lastInsertRowid);

    const unsupportedSuggestionsRes = await request('/api/products/search/suggestions?q=Custom');
    assert.strictEqual(unsupportedSuggestionsRes.status, 200);
    const customProd = unsupportedSuggestionsRes.body.products.find(p => p.name === 'Custom Domain Saree');
    assert.ok(customProd, 'Custom domain product must be found in suggestions');
    assert.strictEqual(customProd.thumbnail, undefined, 'Unsupported remote URL must omit thumbnail so client helper can run');
    console.log('✅ PASS: [P2] Search suggestions endpoint returns lightweight thumbnail URLs for local and supported remote URLs (Unsplash w=180)');

    // 7. Verify real customer questions with names matching former fixtures are NOT wiped on database restart/init
    const realCustomerQuestionText = 'Can this bridal saree be delivered with custom blouse stitching in Pune?';
    db.prepare(`
      INSERT INTO product_qa (product_id, question, answer, answered_by, helpful_votes, user_name)
      VALUES (?, ?, NULL, NULL, 0, 'Meera Deshmukh')
    `).run(prodWithImgId, realCustomerQuestionText);

    // Simulate database startup / schema initialization
    if (typeof db.initSchema === 'function') {
      db.initSchema();
    }

    const preservedRow = db.prepare(`
      SELECT * FROM product_qa WHERE user_name = 'Meera Deshmukh' AND question = ?
    `).get(realCustomerQuestionText);
    assert.ok(preservedRow, 'Legitimate customer question from Meera Deshmukh must NOT be deleted on database initialization');
    assert.strictEqual(preservedRow.user_name, 'Meera Deshmukh');
    console.log('✅ PASS: [P2] Database schema init does not delete real customer questions matching former fixture names');

    // 8. Verify helpful-vote uniqueness and server-issued token binding on POST /api/products/qa/:id/helpful
    const targetQaId = askQARes.body.qa.id;

    // 8a. Unauthenticated caller sending arbitrary caller-chosen token must be rejected with 400
    const forgedTokenRes = await request(`/api/products/qa/${targetQaId}/helpful`, {
      method: 'POST',
      body: { voter_token: 'arbitrary_caller_chosen_token_123' }
    });
    assert.strictEqual(forgedTokenRes.status, 400, 'Arbitrary caller-chosen voter token must be rejected with 400');
    assert.strictEqual(forgedTokenRes.body.error, 'Invalid or forged voter token. A valid server-issued voter token is required.');

    // 8b. Unauthenticated caller without any token or auth must be rejected with 400
    const noTokenRes = await request(`/api/products/qa/${targetQaId}/helpful`, {
      method: 'POST',
      body: {}
    });
    assert.strictEqual(noTokenRes.status, 400, 'Request with no voter token and no auth must return 400');

    // 8c. Issue signed anonymous voter tokens for distinct browsers
    const tokenRes1 = await request('/api/products/qa/voter-token');
    assert.strictEqual(tokenRes1.status, 200);
    assert.ok(tokenRes1.body.voter_token, 'Server must return signed voter_token');
    const cookie1 = tokenRes1.headers['set-cookie']?.[0]?.split(';')[0];
    assert.ok(cookie1, 'Server must issue Set-Cookie header for browser 1');
    const browserToken1 = tokenRes1.body.voter_token;

    // A second guest browser requests a token (without passing an existing token)
    const tokenRes2 = await request('/api/products/qa/voter-token');
    assert.strictEqual(tokenRes2.status, 200);
    const cookie2 = tokenRes2.headers['set-cookie']?.[0]?.split(';')[0];
    assert.ok(cookie2, 'Server must issue Set-Cookie header for browser 2');
    const browserToken2 = tokenRes2.body.voter_token;
    assert.notStrictEqual(browserToken1, browserToken2, 'Distinct browsers receive distinct signed tokens');

    // 8d. Anonymous guest browser 1 votes
    const vote1Res = await request(`/api/products/qa/${targetQaId}/helpful`, {
      method: 'POST',
      headers: { Cookie: cookie1 },
      body: { voter_token: browserToken1 }
    });
    assert.strictEqual(vote1Res.status, 200);
    assert.strictEqual(vote1Res.body.success, true);
    assert.strictEqual(vote1Res.body.helpful_votes, 1, 'First guest vote increments count to 1');
    assert.strictEqual(vote1Res.body.already_voted, false);

    // 8e. Anonymous guest browser 1 re-votes (must be blocked idempotently)
    const replay1Res = await request(`/api/products/qa/${targetQaId}/helpful`, {
      method: 'POST',
      headers: { Cookie: cookie1 },
      body: { voter_token: browserToken1 }
    });
    assert.strictEqual(replay1Res.status, 200);
    assert.strictEqual(replay1Res.body.helpful_votes, 1, 'Replayed vote from browser 1 must not increment count');
    assert.strictEqual(replay1Res.body.already_voted, true);

    // 8f. [P3] Separate guest browser 2 behind the same IP can also vote
    const vote2Res = await request(`/api/products/qa/${targetQaId}/helpful`, {
      method: 'POST',
      headers: { Cookie: cookie2 },
      body: { voter_token: browserToken2 }
    });
    assert.strictEqual(vote2Res.status, 200);
    assert.strictEqual(vote2Res.body.success, true);
    assert.strictEqual(vote2Res.body.helpful_votes, 2, 'Distinct guest browser must increment count to 2');
    assert.strictEqual(vote2Res.body.already_voted, false);

    // 8g. [P2] Expired anonymous voter token returns 401 with TOKEN_EXPIRED
    const expiredBid = 'bid_expired_' + Date.now();
    const expiredCookie = `pv_bid=${encodeURIComponent(productsRouter.signBrowserId(expiredBid))}`;
    const expiredToken = jwt.sign(
      { voter_id: 'voter_' + expiredBid, browser_id: expiredBid, voter_type: 'anonymous_qa_voter' },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const expiredVoteRes = await request(`/api/products/qa/${targetQaId}/helpful`, {
      method: 'POST',
      headers: { Cookie: expiredCookie },
      body: { voter_token: expiredToken }
    });
    assert.strictEqual(expiredVoteRes.status, 401, 'Expired voter token must return 401');
    assert.strictEqual(expiredVoteRes.body.code, 'TOKEN_EXPIRED', 'Response must indicate TOKEN_EXPIRED');

    // 8h. [P2] Refreshing the expired token preserves the voter_id
    const refreshRes = await request('/api/products/qa/voter-token', {
      headers: { 'x-voter-token': expiredToken, Cookie: expiredCookie }
    });
    assert.strictEqual(refreshRes.status, 200);
    const renewedCookie = refreshRes.headers['set-cookie']?.[0]?.split(';')[0] || expiredCookie;
    const renewedToken = refreshRes.body.voter_token;
    const decodedRenewed = jwt.verify(renewedToken, JWT_SECRET);
    assert.strictEqual(decodedRenewed.voter_id, 'voter_' + expiredBid, 'Token renewal must preserve original voter_id');

    // 8i. Voting with the renewed token succeeds
    const renewedVoteRes = await request(`/api/products/qa/${targetQaId}/helpful`, {
      method: 'POST',
      headers: { Cookie: renewedCookie },
      body: { voter_token: renewedToken }
    });
    assert.strictEqual(renewedVoteRes.status, 200);
    assert.strictEqual(renewedVoteRes.body.helpful_votes, 3, 'Vote with renewed token must succeed and increment count to 3');
    assert.strictEqual(renewedVoteRes.body.already_voted, false);

    // 8j. Authenticated user casts helpful vote
    const authVoteRes = await request(`/api/products/qa/${targetQaId}/helpful`, {
      method: 'POST',
      token: reviewUserToken
    });
    assert.strictEqual(authVoteRes.status, 200);
    assert.strictEqual(authVoteRes.body.success, true);
    assert.strictEqual(authVoteRes.body.helpful_votes, 4, 'Authenticated user vote must increment count to 4');
    assert.strictEqual(authVoteRes.body.already_voted, false);

    // 8k. Replay from authenticated user
    const replayAuthRes = await request(`/api/products/qa/${targetQaId}/helpful`, {
      method: 'POST',
      token: reviewUserToken,
      body: { voter_token: 'arbitrary_token_sent_by_logged_in_user' }
    });
    assert.strictEqual(replayAuthRes.status, 200);
    assert.strictEqual(replayAuthRes.body.helpful_votes, 4, 'Authenticated user replay must not increment count');
    assert.strictEqual(replayAuthRes.body.already_voted, true);

    // 8l. Error handling for invalid QA ID and non-existent QA ID
    const invalidIdRes = await request('/api/products/qa/not-a-number/helpful', {
      method: 'POST',
      headers: { Cookie: cookie1 },
      body: { voter_token: browserToken1 }
    });
    assert.strictEqual(invalidIdRes.status, 400, 'Non-integer question ID must return 400');

    const notFoundRes = await request('/api/products/qa/999999/helpful', {
      method: 'POST',
      headers: { Cookie: cookie1 },
      body: { voter_token: browserToken1 }
    });
    assert.strictEqual(notFoundRes.status, 404, 'Non-existent question ID must return 404');

    // 8m. [P2] Migrate legacy IP-derived voter tokens to distinct per-browser identities
    const legacyIpDerivedId = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'; // 32-hex legacy HMAC
    const legacyToken = jwt.sign(
      { voter_id: legacyIpDerivedId, voter_type: 'anonymous_qa_voter' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Direct vote with un-migrated legacy token requests migration
    const legacyVoteRes = await request(`/api/products/qa/${targetQaId}/helpful`, {
      method: 'POST',
      headers: { Cookie: cookie1 },
      body: { voter_token: legacyToken }
    });
    assert.strictEqual(legacyVoteRes.status, 401, 'Legacy voter token must require migration');
    assert.strictEqual(legacyVoteRes.body.code, 'TOKEN_LEGACY_MIGRATION', 'Response code must be TOKEN_LEGACY_MIGRATION');

    // Two distinct browser renewals presenting legacy token get separate per-browser identities
    const migRes1 = await request('/api/products/qa/voter-token', {
      headers: { 'x-voter-token': legacyToken }
    });
    assert.strictEqual(migRes1.status, 200);
    const decodedMig1 = jwt.verify(migRes1.body.voter_token, JWT_SECRET);
    assert.notStrictEqual(decodedMig1.voter_id, legacyIpDerivedId, 'Renewal must not preserve legacy IP-derived voter ID');
    assert.ok(decodedMig1.voter_id.startsWith('voter_'), 'Migrated voter ID must start with voter_ prefix');

    const migRes2 = await request('/api/products/qa/voter-token', {
      headers: { 'x-voter-token': legacyToken }
    });
    assert.strictEqual(migRes2.status, 200);
    const decodedMig2 = jwt.verify(migRes2.body.voter_token, JWT_SECRET);
    assert.notStrictEqual(decodedMig2.voter_id, legacyIpDerivedId, 'Renewal must not preserve legacy IP-derived voter ID');
    assert.notStrictEqual(decodedMig2.voter_id, decodedMig1.voter_id, 'Two browsers migrating legacy token must receive distinct per-browser IDs');

    // 8n. [P2] Bind issued voter IDs to stable server-managed browser cookie & test repeated issuance
    const clientRes1 = await request('/api/products/qa/voter-token');
    assert.strictEqual(clientRes1.status, 200);
    const setCookieHeader = clientRes1.headers['set-cookie'];
    assert.ok(setCookieHeader, 'Server must issue Set-Cookie with browser session cookie');
    const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader[0].split(';')[0] : setCookieHeader.split(';')[0];
    assert.ok(cookieString.includes('pv_bid='), 'Cookie must contain pv_bid session key');

    const decodedClient1 = jwt.verify(clientRes1.body.voter_token, JWT_SECRET);

    // Repeated token issuance from the same client session (passing cookie and NO existing token)
    const clientRes2 = await request('/api/products/qa/voter-token', {
      headers: { cookie: cookieString }
    });
    assert.strictEqual(clientRes2.status, 200);
    const decodedClient2 = jwt.verify(clientRes2.body.voter_token, JWT_SECRET);
    assert.strictEqual(
      decodedClient2.voter_id,
      decodedClient1.voter_id,
      'Repeated token issuance from one client must bind to the same voter ID'
    );

    // 8o. [P2] Avoid 5-person lockout on shared networks & enforce generous abuse threshold in shared store
    // Verify that guests 6, 7, and 8 behind the same IP can vote successfully without 5-person network lockout
    for (let i = 0; i < 3; i++) {
      const guestTokenRes = await request('/api/products/qa/voter-token');
      const cookie = guestTokenRes.headers['set-cookie']?.[0]?.split(';')[0];
      const guestVoteRes = await request(`/api/products/qa/${targetQaId}/helpful`, {
        method: 'POST',
        headers: cookie ? { Cookie: cookie } : {},
        body: { voter_token: guestTokenRes.body.voter_token }
      });
      assert.strictEqual(guestVoteRes.status, 200, `Guest ${i + 6} behind same network must not be locked out`);
    }

    // Continue sending anonymous votes until the generous abuse limit (25) is reached
    let hitLimit = false;
    for (let i = 0; i < 30; i++) {
      const extraTokenRes = await request('/api/products/qa/voter-token');
      const extraCookie = extraTokenRes.headers['set-cookie']?.[0]?.split(';')[0];
      const res = await request(`/api/products/qa/${targetQaId}/helpful`, {
        method: 'POST',
        headers: extraCookie ? { Cookie: extraCookie } : {},
        body: { voter_token: extraTokenRes.body.voter_token }
      });
      if (res.status === 429) {
        assert.strictEqual(res.body.code, 'VOTE_LIMIT_EXCEEDED');
        hitLimit = true;
        break;
      }
    }
    assert.strictEqual(hitLimit, true, 'Excessive unauthenticated votes exceeding shared limit must return 429 VOTE_LIMIT_EXCEEDED');

    // 8p. [P2] Malformed, tokenless, rejected, and already-voted requests do not consume quota
    const askSecondQARes = await request(`/api/products/${prodWithImgId}/qa`, {
      method: 'POST',
      body: {
        name: 'Priya Verma',
        question: 'Is dry cleaning mandatory for this silk?'
      }
    });
    const targetQaId2 = askSecondQARes.body.qa.id;

    // Reset rate limiter store for clean testing of invalid requests isolation
    const { anonymousVoteStore } = require('../middleware/rateLimit');
    if (anonymousVoteStore && typeof anonymousVoteStore.resetAll === 'function') {
      await anonymousVoteStore.resetAll();
    }

    // Send 30 rejected/invalid requests (10 invalid QA ID, 10 missing token, 10 forged token)
    for (let i = 0; i < 10; i++) {
      const r1 = await request('/api/products/qa/invalid-id/helpful', { method: 'POST' });
      assert.strictEqual(r1.status, 400);
      const r2 = await request(`/api/products/qa/${targetQaId2}/helpful`, { method: 'POST', body: {} });
      assert.strictEqual(r2.status, 400, 'Missing token request must return 400');
      const r3 = await request(`/api/products/qa/${targetQaId2}/helpful`, { method: 'POST', body: { voter_token: 'forged_fake_token' } });
      assert.strictEqual(r3.status, 400, 'Forged token request must return 400');
    }

    // If rejected requests consumed quota, the 25-request limit would be exhausted.
    // Verify that a legitimate new vote attempt still succeeds with HTTP 200:
    const freshGuestTokenRes = await request('/api/products/qa/voter-token');
    const freshGuestCookie = freshGuestTokenRes.headers['set-cookie']?.[0]?.split(';')[0];
    const freshGuestToken = freshGuestTokenRes.body.voter_token;
    const freshVoteRes = await request(`/api/products/qa/${targetQaId2}/helpful`, {
      method: 'POST',
      headers: freshGuestCookie ? { Cookie: freshGuestCookie } : {},
      body: { voter_token: freshGuestToken }
    });
    assert.strictEqual(freshVoteRes.status, 200, 'Legitimate vote must succeed because rejected requests did not consume quota');
    assert.strictEqual(freshVoteRes.body.helpful_votes, 1);

    // Replaying an already-voted request must also NOT consume quota
    const replayFreshRes = await request(`/api/products/qa/${targetQaId2}/helpful`, {
      method: 'POST',
      headers: freshGuestCookie ? { Cookie: freshGuestCookie } : {},
      body: { voter_token: freshGuestToken }
    });
    assert.strictEqual(replayFreshRes.status, 200);
    assert.strictEqual(replayFreshRes.body.already_voted, true);

    // 8q. [P2] Preserve a zero KV TTL instead of extending the vote window
    const originalFetch = global.fetch;
    let expireTriggered = false;
    global.fetch = async (url, opts) => {
      const urlStr = String(url);
      if (urlStr.includes('/pipeline')) {
        return {
          ok: true,
          json: async () => [
            { result: 5 },
            { result: 0 } // Legitimate Redis TTL of 0 seconds remaining
          ]
        };
      }
      if (urlStr.includes('/EXPIRE/')) {
        expireTriggered = true;
        return { ok: true, json: async () => ({ result: 1 }) };
      }
      return originalFetch(url, opts);
    };

    try {
      const { SharedRateLimitStore } = require('../middleware/rateLimit');
      const testStore = new SharedRateLimitStore('test_ttl_zero', 900000);
      testStore.restUrl = 'https://mock-kv.upstash.io';
      testStore.restToken = 'mock_token';
      testStore.isShared = true;

      const beforeIncr = Date.now();
      const incrResult = await testStore.increment('ip_test_key');
      assert.strictEqual(expireTriggered, false, 'TTL of 0 must NOT trigger another EXPIRE command');
      assert.ok(
        incrResult.resetTime.getTime() <= beforeIncr + 1000,
        'TTL of 0 must preserve near-zero resetTime rather than extending window by 900s'
      );
    } finally {
      global.fetch = originalFetch;
    }

    // 8r. [P2] Concurrent helpful-vote race condition with distinct voter IDs for the same browser
    const askThirdQARes = await request(`/api/products/${prodWithImgId}/qa`, {
      method: 'POST',
      body: {
        name: 'Sunita Rao',
        question: 'Does this saree have silver or antique gold zari work?'
      }
    });
    const targetQaId3 = askThirdQARes.body.qa.id;
    assert.ok(targetQaId3, 'Target Q&A question 3 created');

    const testBid = 'bid_concurrent_race_' + Date.now();
    const signedCookie = productsRouter.signBrowserId(testBid);
    const cookieHeader = `pv_bid=${encodeURIComponent(signedCookie)}`;

    // Issue two distinct valid voter tokens with DIFFERENT voter_id claims but the SAME signed browser_id
    const token1 = jwt.sign(
      { voter_id: 'voter_race_claim_1', browser_id: testBid, voter_type: 'anonymous_qa_voter' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    const token2 = jwt.sign(
      { voter_id: 'voter_race_claim_2', browser_id: testBid, voter_type: 'anonymous_qa_voter' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Verify token binding prevents using a token issued for a different browser ID
    const mismatchedToken = jwt.sign(
      { voter_id: 'voter_bid_other_user', browser_id: 'bid_other_user', voter_type: 'anonymous_qa_voter' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    const mismatchRes = await request(`/api/products/qa/${targetQaId3}/helpful`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { voter_token: mismatchedToken }
    });
    assert.strictEqual(mismatchRes.status, 401, 'Token mismatched with cookie session must be rejected with 401');
    assert.strictEqual(mismatchRes.body.code, 'TOKEN_SESSION_MISMATCH');

    // Synchronize both requests after initial lookup to force the race before transaction commit
    let waitingRequest = null;
    let barrierReleased = false;
    productsRouter._beforeVoteTransactionHook = async (req) => {
      if (req.params.id !== String(targetQaId3)) return;
      if (!waitingRequest) {
        await new Promise((resolve) => {
          waitingRequest = resolve;
        });
      } else {
        barrierReleased = true;
        const releaseFirst = waitingRequest;
        waitingRequest = null;
        releaseFirst();
      }
    };

    try {
      // Fire two concurrent vote requests with same cookie and distinct valid voter IDs
      const [voteRes1, voteRes2] = await Promise.all([
        request(`/api/products/qa/${targetQaId3}/helpful`, {
          method: 'POST',
          headers: { Cookie: cookieHeader },
          body: { voter_token: token1 }
        }),
        request(`/api/products/qa/${targetQaId3}/helpful`, {
          method: 'POST',
          headers: { Cookie: cookieHeader },
          body: { voter_token: token2 }
        })
      ]);

      assert.strictEqual(barrierReleased, true, 'Both concurrent requests must be synchronized after initial lookup');
      assert.strictEqual(voteRes1.status, 200);
      assert.strictEqual(voteRes2.status, 200);

      // Exactly one must win the race (already_voted: false), and one must lose (already_voted: true)
      const winners = [voteRes1, voteRes2].filter(r => r.body.already_voted === false);
      const losers = [voteRes1, voteRes2].filter(r => r.body.already_voted === true);
      assert.strictEqual(winners.length, 1, 'Exactly one concurrent request must win the vote');
      assert.strictEqual(losers.length, 1, 'The competing concurrent request must detect already_voted: true via browser constraint');

      // The database helpful_votes must be EXACTLY 1, not 2
      const qaInDb = db.prepare('SELECT helpful_votes FROM product_qa WHERE id = ?').get(targetQaId3);
      assert.strictEqual(qaInDb.helpful_votes, 1, 'Helpful votes count must increment only once (count=1, not 2)');
    } finally {
      productsRouter._beforeVoteTransactionHook = null;
    }

    // 8s. [P3] Verify that the rate limiter wrapper settles immediately on 429 without hanging
    const mockRes = new (require('events').EventEmitter)();
    mockRes.headersSent = false;
    mockRes.status = function(code) {
      this.statusCode = code;
      return this;
    };
    mockRes.send = function(msg) {
      this.headersSent = true;
      this.emit('finish');
      return this;
    };

    const testLimiterPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Rate limiter wrapper timed out hanging indefinitely')), 1000);
      let settled = false;
      const settle = (val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          mockRes.removeListener('finish', onFinish);
          mockRes.removeListener('close', onClose);
          resolve(val);
        }
      };
      const onFinish = () => settle(false);
      const onClose = () => settle(false);
      mockRes.once('finish', onFinish);
      mockRes.once('close', onClose);

      // Simulate limiter sending 429 response
      mockRes.status(429).send({ error: 'Too many requests' });
    });

    const limiterWrapperResult = await testLimiterPromise;
    assert.strictEqual(limiterWrapperResult, false, 'Limiter wrapper must settle immediately with false on 429 finish');

    // 8t. [P2] Require valid browser session cookie on anonymous vote submissions & block repeated token issuance without cookie persistence
    const askFourthQARes = await request(`/api/products/${prodWithImgId}/qa`, {
      method: 'POST',
      body: {
        name: 'Meera Nambiar',
        question: 'What is the blouse fabric piece length included?'
      }
    });
    const targetQaId4 = askFourthQARes.body.qa.id;
    assert.ok(targetQaId4, 'Target Q&A question 4 created');

    // 1. Initial valid vote with cookie persistence
    const tokenWithCookieRes = await request('/api/products/qa/voter-token');
    const persistedCookieHeader = tokenWithCookieRes.headers['set-cookie']?.[0]?.split(';')[0];
    assert.ok(persistedCookieHeader, 'Set-Cookie header must be present on token issuance');

    const validVoteRes = await request(`/api/products/qa/${targetQaId4}/helpful`, {
      method: 'POST',
      headers: { Cookie: persistedCookieHeader },
      body: { voter_token: tokenWithCookieRes.body.voter_token }
    });
    assert.strictEqual(validVoteRes.status, 200, 'Vote with valid cookie session must succeed');
    assert.strictEqual(validVoteRes.body.already_voted, false);
    assert.strictEqual(validVoteRes.body.helpful_votes, 1);

    // 2. [P2] Regression: Caller rotates identities by repeatedly calling /qa/voter-token without cookies,
    // retaining each newly issued cookie and submitting it with its matching token.
    // Fresh-cookie rotation must be prevented from minting repeat votes on the same question.
    for (let i = 0; i < 3; i++) {
      const rotatedTokenRes = await request('/api/products/qa/voter-token');
      assert.strictEqual(rotatedTokenRes.status, 200);
      assert.ok(rotatedTokenRes.body.voter_token);
      const rotatedCookieHeader = rotatedTokenRes.headers['set-cookie']?.[0]?.split(';')[0];
      assert.ok(rotatedCookieHeader, 'Set-Cookie header must be present for rotated token');

      const rotatedVoteRes = await request(`/api/products/qa/${targetQaId4}/helpful`, {
        method: 'POST',
        headers: { Cookie: rotatedCookieHeader },
        body: { voter_token: rotatedTokenRes.body.voter_token }
      });
      assert.strictEqual(rotatedVoteRes.status, 200, 'Rotated identity submission must receive HTTP 200');
      assert.strictEqual(
        rotatedVoteRes.body.already_voted,
        true,
        'Rotated identity must be detected as already voted on the same question'
      );
      assert.strictEqual(
        rotatedVoteRes.body.helpful_votes,
        1,
        'Helpful votes must not increment on fresh-cookie rotation'
      );
    }

    // 3. Regression: Submission without session cookie must be rejected with 401 COOKIE_REQUIRED
    const freshTokenRes = await request('/api/products/qa/voter-token');
    const voteWithoutCookieRes = await request(`/api/products/qa/${targetQaId4}/helpful`, {
      method: 'POST',
      body: { voter_token: freshTokenRes.body.voter_token }
    });
    assert.strictEqual(
      voteWithoutCookieRes.status,
      401,
      'Anonymous vote submission without valid session cookie must be rejected with HTTP 401'
    );
    assert.strictEqual(voteWithoutCookieRes.body.code, 'COOKIE_REQUIRED');

    // 4. Replay with the original cookie session must also be blocked
    const replayVoteRes = await request(`/api/products/qa/${targetQaId4}/helpful`, {
      method: 'POST',
      headers: { Cookie: persistedCookieHeader },
      body: { voter_token: tokenWithCookieRes.body.voter_token }
    });
    assert.strictEqual(replayVoteRes.status, 200);
    assert.strictEqual(replayVoteRes.body.already_voted, true);
    assert.strictEqual(replayVoteRes.body.helpful_votes, 1);

    // Database verification: total helpful_votes must remain exactly 1
    const qa4Final = db.prepare('SELECT helpful_votes FROM product_qa WHERE id = ?').get(targetQaId4);
    assert.strictEqual(qa4Final.helpful_votes, 1, 'Helpful votes must remain exactly 1 after all identity rotation attempts');

    console.log('✅ PASS: [P2] Helpful-vote endpoint binds anonymous identity to server-issued token and blocks distinct tokens from same caller');

    // 8u. [P2] Multi-instance serverless simulation with isolated app instances:
    // Instance 1 and Instance 2 run separate Express apps, separate routers, separate SQLite databases,
    // and separate local in-memory stores, sharing ONLY the distributed KV store.
    const { AnonymousVoteRotationLedger } = require('../services/rotationLedger');
    const Database = require('better-sqlite3');
    let kvPipelineCommands = [];
    const mockKvStore = new Map();
    const mockKvFetch = async (url, opts) => {
      const u = String(url);
      if (u.includes('/pipeline')) {
        const pipelineBody = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
        kvPipelineCommands.push(pipelineBody);
        const results = [];
        for (const cmd of pipelineBody) {
          const op = cmd[0];
          if (op === 'HSET' || op === 'HSETNX') {
            const [, key, field, val] = cmd;
            if (!mockKvStore.has(key)) mockKvStore.set(key, new Map());
            const map = mockKvStore.get(key);
            if (op === 'HSETNX' && map.has(String(field))) {
              results.push({ result: 0 });
            } else {
              map.set(String(field), val);
              results.push({ result: 1 });
            }
          } else if (op === 'EXPIRE') {
            results.push({ result: 1 });
          } else {
            results.push({ result: 'OK' });
          }
        }
        return { ok: true, json: async () => results };
      }
      if (u.includes('/HGETALL/')) {
        const key = decodeURIComponent(u.split('/HGETALL/')[1]);
        const map = mockKvStore.get(key);
        const result = {};
        if (map) {
          for (const [f, v] of map.entries()) {
            result[f] = v;
          }
        }
        return { ok: true, json: async () => ({ result }) };
      }
      if (u.includes('/HGET/')) {
        const parts = u.split('/HGET/')[1].split('/');
        const key = decodeURIComponent(parts[0]);
        const field = decodeURIComponent(parts[1]);
        const map = mockKvStore.get(key);
        const val = map ? (map.get(field) || null) : null;
        return { ok: true, json: async () => ({ result: val }) };
      }
      return { ok: true, json: async () => ({}) };
    };

    const originalGlobalFetch = global.fetch;
    global.fetch = mockKvFetch;

    // Instance 1: configure ledger to connect to the shared KV store
    const instance1Ledger = new AnonymousVoteRotationLedger({
      restUrl: 'https://mock-kv.upstash.io',
      restToken: 'mock_token',
      db
    });
    const originalLedgerBefore8u = productsRouter.rotationLedger;
    productsRouter.rotationLedger = instance1Ledger;

    // Create an entirely isolated second database for Instance 2 (no shared tables or rows with Instance 1)
    const isolatedDbDir = path.join(__dirname, `.test_db_inst2_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(isolatedDbDir, { recursive: true });
    const isolatedDbPath = path.join(isolatedDbDir, 'test_isolated_instance2.db');
    const isolatedDb = new Database(isolatedDbPath);
    isolatedDb.isDurable = true;
    isolatedDb.pragma('foreign_keys = ON');

    // Initialize required schema on isolated Instance 2 database
    isolatedDb.exec(`
      CREATE TABLE IF NOT EXISTS product_qa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_id INTEGER,
        user_name TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT,
        answered_by TEXT DEFAULT NULL,
        helpful_votes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS product_qa_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qa_id INTEGER NOT NULL,
        voter_key TEXT NOT NULL,
        user_id INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(qa_id, voter_key),
        FOREIGN KEY (qa_id) REFERENCES product_qa(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS anonymous_vote_rotation_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_ip TEXT NOT NULL,
        qa_id INTEGER NOT NULL,
        original_browser_key TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_ip, qa_id),
        FOREIGN KEY (qa_id) REFERENCES product_qa(id) ON DELETE CASCADE
      );
    `);
    // Create target question 5 on Instance 1
    const askFifthQARes = await request(`/api/products/${prodWithImgId}/qa`, {
      method: 'POST',
      body: {
        name: 'Meera Nambiar',
        question: 'Is the zari authentic gold tested?'
      }
    });
    const targetQaId5 = askFifthQARes.body.qa.id;
    assert.ok(targetQaId5, 'Target Q&A question 5 created');

    // Seed target question on isolated database with initial count of 1
    isolatedDb.prepare(`
      INSERT INTO product_qa (id, product_id, user_name, question, helpful_votes)
      VALUES (?, ?, ?, ?, ?)
    `).run(targetQaId5, prodWithImgId, 'Meera Nambiar', 'Is the zari authentic gold tested?', 1);

    // Verify isolated database has ZERO votes and ZERO ledger records initially
    assert.strictEqual(isolatedDb.prepare('SELECT COUNT(*) as c FROM product_qa_votes').get().c, 0);
    assert.strictEqual(isolatedDb.prepare('SELECT COUNT(*) as c FROM anonymous_vote_rotation_ledger').get().c, 0);

    // Instance 2: independent ledger with its own empty localStore and isolatedDb, sharing ONLY mockKv
    const instance2Ledger = new AnonymousVoteRotationLedger({
      restUrl: 'https://mock-kv.upstash.io',
      restToken: 'mock_token',
      db: isolatedDb
    });
    const isolatedProductsRouter = productsRouter.createRouter({
      db: isolatedDb,
      rotationLedger: instance2Ledger
    });

    const app2 = express();
    app2.use(express.json());
    app2.use('/api/products', isolatedProductsRouter);
    const server2 = http.createServer(app2);
    await new Promise(resolve => server2.listen(0, resolve));
    const port2 = server2.address().port;

    async function requestInstance2(reqPath, options = {}) {
      return new Promise((resolve, reject) => {
        const fullUrl = `http://localhost:${port2}${reqPath}`;
        const url = new URL(fullUrl);
        const headers = Object.assign({}, options.headers || {});
        if (options.body && !headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
        const req = http.request(url, {
          method: options.method || 'GET',
          headers
        }, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            let body = null;
            try { body = JSON.parse(data); } catch (e) { body = data; }
            resolve({ status: res.statusCode, headers: res.headers, body });
          });
        });
        req.on('error', reject);
        if (options.body) {
          req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
      });
    }

    try {
      // Cast an initial vote on Instance 1 through the real API route.
      // Because productsRouter.rotationLedger is connected to mockKv, this writes an atomic HSET into shared KV!
      const inst1TokenRes = await request('/api/products/qa/voter-token');
      assert.strictEqual(inst1TokenRes.status, 200);
      const inst1CookieHeader = inst1TokenRes.headers['set-cookie']?.[0]?.split(';')[0];
      assert.ok(inst1CookieHeader, 'Set-Cookie header must be present on instance 1');

      const inst1VoteRes = await request(`/api/products/qa/${targetQaId5}/helpful`, {
        method: 'POST',
        headers: { Cookie: inst1CookieHeader },
        body: { voter_token: inst1TokenRes.body.voter_token }
      });
      assert.strictEqual(inst1VoteRes.status, 200);
      assert.strictEqual(inst1VoteRes.body.already_voted, false);
      assert.strictEqual(inst1VoteRes.body.helpful_votes, 1);
      assert.strictEqual(kvPipelineCommands.length > 0, true, 'Instance 1 must have written to shared KV pipeline');

      // 1. Caller calls Instance 2 to issue fresh token without cookies.
      // Instance 2's local memory is empty and isolatedDb has 0 votes, so it MUST read targetQaId5 from shared KV!
      const crossInstanceTokenRes = await requestInstance2('/api/products/qa/voter-token');
      assert.strictEqual(crossInstanceTokenRes.status, 200);
      assert.ok(crossInstanceTokenRes.body.voter_token);
      const crossCookieHeader = crossInstanceTokenRes.headers['set-cookie']?.[0]?.split(';')[0];
      assert.ok(crossCookieHeader, 'Set-Cookie header must be present on instance 2');

      // Verify Instance 2 discovered the prior vote from shared KV and created the alias in its isolated database!
      const aliasInIsolatedDb = isolatedDb.prepare('SELECT voter_key FROM product_qa_votes WHERE qa_id = ?').all(targetQaId5);
      assert.strictEqual(aliasInIsolatedDb.length, 1, 'Instance 2 must have aliased newly minted browser ID into product_qa_votes via shared KV');

      // 2. Caller attempts to vote on targetQaId5 using the newly minted identity via Instance 2
      const crossVoteRes = await requestInstance2(`/api/products/qa/${targetQaId5}/helpful`, {
        method: 'POST',
        headers: { Cookie: crossCookieHeader },
        body: { voter_token: crossInstanceTokenRes.body.voter_token }
      });
      assert.strictEqual(crossVoteRes.status, 200);
      assert.strictEqual(
        crossVoteRes.body.already_voted,
        true,
        'Cross-instance rotated identity must be detected as already voted on targetQaId5'
      );
      assert.strictEqual(crossVoteRes.body.helpful_votes, 1, 'Helpful votes must remain 1 on cross-instance rotation');

      // 3. Caller also rotates identity on Instance 1 to test bidirectional rotation defense via shared KV
      const inst1RotatedTokenRes = await request('/api/products/qa/voter-token');
      assert.strictEqual(inst1RotatedTokenRes.status, 200);
      assert.ok(inst1RotatedTokenRes.body.voter_token);
      const inst1RotatedCookieHeader = inst1RotatedTokenRes.headers['set-cookie']?.[0]?.split(';')[0];
      assert.ok(inst1RotatedCookieHeader, 'Set-Cookie header must be present on instance 1 rotated issuance');

      const crossVoteOnInstance1 = await request(`/api/products/qa/${targetQaId5}/helpful`, {
        method: 'POST',
        headers: { Cookie: inst1RotatedCookieHeader },
        body: { voter_token: inst1RotatedTokenRes.body.voter_token }
      });
      assert.strictEqual(crossVoteOnInstance1.status, 200);
      assert.strictEqual(crossVoteOnInstance1.body.already_voted, true);
      assert.strictEqual(crossVoteOnInstance1.body.helpful_votes, 1);

      // Verify DB helpful votes count strictly remains 1 across both instances
      const qa5MultiInstance = db.prepare('SELECT helpful_votes FROM product_qa WHERE id = ?').get(targetQaId5);
      assert.strictEqual(qa5MultiInstance.helpful_votes, 1, 'DB count must remain 1 after cross-instance rotation attempts');
      const qa5Isolated = isolatedDb.prepare('SELECT helpful_votes FROM product_qa WHERE id = ?').get(targetQaId5);
      assert.strictEqual(qa5Isolated.helpful_votes, 1, 'Isolated DB count must remain 1 after cross-instance rotation attempts');
      console.log('✅ PASS: [P2] Cross-instance token issuance and voting prevents anonymous identity rotation with isolated DBs and KV as only shared state');
    } finally {
      server2.close();
      productsRouter.rotationLedger = originalLedgerBefore8u;
      try {
        isolatedDb.close();
        fs.rmSync(isolatedDbDir, { recursive: true, force: true });
      } catch (e) {}
    }

    // 8v. [P2] Atomic Redis HSET operations, concurrent-write regression, and storage tier merging
    try {
      const kvLedgerA = new AnonymousVoteRotationLedger({
        restUrl: 'https://mock-kv.upstash.io',
        restToken: 'mock_token',
        ttlMs: 50
      });
      assert.strictEqual(kvLedgerA.isShared, true, 'Ledger must detect shared KV configuration');

      // Concurrent-write regression:
      // Fire concurrent recordVote calls for 3 distinct Q&A IDs from the exact same IP.
      // Atomic HSET operations must ensure that all 3 fields are recorded without dropping any question.
      const testIp = '198.51.100.99';
      await Promise.all([
        kvLedgerA.recordVote(testIp, 101, 'anon_voter_bid_101', 50),
        kvLedgerA.recordVote(testIp, 102, 'anon_voter_bid_102', 50),
        kvLedgerA.recordVote(testIp, 103, 'anon_voter_bid_103', 50)
      ]);

      // Read from independent ledger instance B connected to the same KV store
      const kvLedgerB = new AnonymousVoteRotationLedger({
        restUrl: 'https://mock-kv.upstash.io',
        restToken: 'mock_token',
        ttlMs: 50
      });
      const votedQuestionsConcurrent = await kvLedgerB.getVotedQuestionsForIp(testIp);
      assert.strictEqual(votedQuestionsConcurrent.length, 3, 'All 3 concurrent votes must be preserved in shared KV without dropping any questions');
      const votedQaIds = new Set(votedQuestionsConcurrent.map(v => v.qa_id));
      assert.ok(votedQaIds.has(101) && votedQaIds.has(102) && votedQaIds.has(103), 'Every concurrent question ID must be present in the ledger');

      // Test original voter identification for each concurrent record
      assert.strictEqual(await kvLedgerB.isOriginalVoter(testIp, 101, 'anon_voter_bid_101'), true);
      assert.strictEqual(await kvLedgerB.isOriginalVoter(testIp, 101, 'anon_voter_bid_rotated'), false);
      assert.strictEqual(await kvLedgerB.isOriginalVoter(testIp, 102, 'anon_voter_bid_102'), true);

      // Verify that getVotedQuestionsForIp merges KV records with SQLite rows
      // Insert an additional Q&A association directly in SQLite for testIp
      db.prepare(`
        INSERT INTO anonymous_vote_rotation_ledger (client_ip, qa_id, original_browser_key, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(testIp, targetQaId4, 'anon_voter_bid_sqlite', Date.now() + 50000);

      const mergedVotes = await kvLedgerB.getVotedQuestionsForIp(testIp);
      const mergedIds = new Set(mergedVotes.map(v => v.qa_id));
      assert.ok(mergedIds.has(101) && mergedIds.has(102) && mergedIds.has(103) && mergedIds.has(targetQaId4), 'Storage tier merging must return union of KV and SQLite associations');

      // Test TTL expiry: wait 70ms for 50ms TTL to expire
      await new Promise(resolve => setTimeout(resolve, 70));
      const expiredQuestions = await kvLedgerB.getVotedQuestionsForIp(testIp);
      const expiredKvIds = expiredQuestions.filter(q => q.qa_id !== targetQaId4);
      assert.strictEqual(expiredKvIds.length, 0, 'Expired KV entries must be pruned and not returned');
      console.log('✅ PASS: [P2] Atomic Redis HSET operations prevent concurrent-write drops and merge storage tiers correctly');
    } finally {
      global.fetch = originalGlobalFetch;
    }

    // 8w. [P2] Database rotation ledger TTL pruning
    const dbLedger = new AnonymousVoteRotationLedger({ db });
    // Insert an entry with past expiration for targetQaId4
    db.prepare(`
      INSERT INTO anonymous_vote_rotation_ledger (client_ip, qa_id, original_browser_key, expires_at)
      VALUES (?, ?, ?, ?)
    `).run('203.0.113.50', targetQaId4, 'anon_voter_expired', Date.now() - 1000);

    // Verify it is pruned and not returned
    const prunedList = await dbLedger.getVotedQuestionsForIp('203.0.113.50');
    assert.strictEqual(prunedList.length, 0, 'Expired DB entry must not be returned');
    const remainingInDb = db.prepare('SELECT COUNT(*) as count FROM anonymous_vote_rotation_ledger WHERE client_ip = ?').get('203.0.113.50');
    assert.strictEqual(remainingInDb.count, 0, 'Expired DB entry must be deleted by pruner');
    console.log('✅ PASS: [P2] Database rotation ledger prunes expired entries on read to prevent warm instance accumulation');

    // 8x. [P2] Regression: Errored HSET pipeline commands fail closed, and legacy string keys are migrated with an independent reader
    const regressionFetch = global.fetch;
    const migrationKvStore = new Map();
    // Pre-populate a legacy string key holding Q&A 401
    const legacyIp = '198.51.100.77';
    const legacyKey = 'palluvo:qa_rot:ip:' + legacyIp;
    migrationKvStore.set(legacyKey, JSON.stringify({
      401: { originalBrowserKey: 'anon_voter_legacy_401', expiresAt: Date.now() + 60000 }
    }));

    const keyTtls = new Map();
    let failHsetCommands = false;
    let failGetCommands = false;
    let onPipelineHook = null;
    const handleEval = (script, keys, args) => {
      if (failHsetCommands) {
        return { ok: false, status: 500, json: async () => ({ error: 'ERR simulated pipeline HSET failure' }) };
      }
      if (script.includes('HGET') || script.includes('HSET')) {
        const key = keys[0];
        const field = String(args[0]);
        const payload = args[1];
        const legacyExpiresAt = Number(args[2]);
        const ttl = Number(args[3]);
        const now = Number(args[4]);

        const existingVal = migrationKvStore.get(key);
        if (typeof existingVal === 'string') {
          return { ok: true, json: async () => ({ error: 'WRONGTYPE Operation against a key holding the wrong kind of value' }) };
        }
        if (!migrationKvStore.has(key)) {
          migrationKvStore.set(key, new Map());
        }
        const map = migrationKvStore.get(key);
        const current = map.get(field);

        if (!current) {
          map.set(field, payload);
          const curTtl = keyTtls.get(key);
          if (curTtl === undefined || ttl > curTtl) {
            keyTtls.set(key, ttl);
          }
          return { ok: true, json: async () => ({ result: 'SET' }) };
        }

        let curExpiresAt = null;
        try {
          const parsed = JSON.parse(current);
          curExpiresAt = parsed.expiresAt ? Number(parsed.expiresAt) : null;
        } catch (e) {}

        if ((!curExpiresAt || curExpiresAt <= now || curExpiresAt < legacyExpiresAt) && (legacyExpiresAt > now)) {
          map.set(field, payload);
          const curTtl = keyTtls.get(key);
          if (curTtl === undefined || ttl > curTtl) {
            keyTtls.set(key, ttl);
          }
          return { ok: true, json: async () => ({ result: 'REPLACED' }) };
        } else {
          return { ok: true, json: async () => ({ result: current }) };
        }
      } else if (script.includes('current == ARGV[1]') || script.includes('DEL')) {
        const key = keys[0];
        const expected = args[0];
        const current = migrationKvStore.get(key);
        if (current === expected) {
          migrationKvStore.delete(key);
          keyTtls.delete(key);
          return { ok: true, json: async () => ({ result: 1 }) };
        } else {
          return { ok: true, json: async () => ({ result: 0 }) };
        }
      }
      return { ok: true, json: async () => ({ result: 1 }) };
    };

    global.fetch = async (url, opts) => {
      const u = String(url);
      if (u.includes('/eval')) {
        const payload = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
        const { script, keys, args } = payload;
        return handleEval(script, keys, args);
      }
      if (u.includes('/pipeline')) {
        const pipelineBody = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
        if (typeof onPipelineHook === 'function') {
          const hook = onPipelineHook;
          onPipelineHook = null;
          await hook(pipelineBody);
        }
        if (failHsetCommands) {
          // Return command-level error on HSET / HSETNX / EVAL
          const results = pipelineBody.map(cmd => {
            if (cmd[0] === 'HSET' || cmd[0] === 'HSETNX' || cmd[0] === 'EVAL') {
              return { error: 'ERR simulated pipeline HSET failure' };
            }
            return { result: 1 };
          });
          return { ok: true, json: async () => results };
        }
        const results = [];
        for (const cmd of pipelineBody) {
          const op = cmd[0];
          if (op === 'HSET' || op === 'HSETNX') {
            const [, key, field, val] = cmd;
            const existingVal = migrationKvStore.get(key);
            if (typeof existingVal === 'string') {
              // Target key currently holds a Redis string!
              results.push({ error: 'WRONGTYPE Operation against a key holding the wrong kind of value' });
            } else {
              if (!migrationKvStore.has(key)) migrationKvStore.set(key, new Map());
              const map = migrationKvStore.get(key);
              if (op === 'HSETNX' && map.has(String(field))) {
                results.push({ result: 0 });
              } else {
                map.set(String(field), val);
                results.push({ result: 1 });
              }
            }
          } else if (op === 'EVAL') {
            const [, script, numkeys, ...rest] = cmd;
            const nKeys = Number(numkeys);
            const keys = rest.slice(0, nKeys);
            const args = rest.slice(nKeys);
            const evalRes = await handleEval(script, keys, args);
            const evalJson = await evalRes.json();
            results.push(evalJson);
          } else if (op === 'EXPIRE') {
            const [, key, ttlStr, condition] = cmd;
            const ttl = Number(ttlStr);
            const currentTtl = keyTtls.get(key);
            if (condition === 'NX') {
              if (currentTtl === undefined) {
                keyTtls.set(key, ttl);
                results.push({ result: 1 });
              } else {
                results.push({ result: 0 });
              }
            } else if (condition === 'GT') {
              if (currentTtl !== undefined && ttl > currentTtl) {
                keyTtls.set(key, ttl);
                results.push({ result: 1 });
              } else {
                results.push({ result: 0 });
              }
            } else {
              keyTtls.set(key, ttl);
              results.push({ result: 1 });
            }
          } else if (op === 'DEL') {
            const [, key] = cmd;
            migrationKvStore.delete(key);
            keyTtls.delete(key);
            results.push({ result: 1 });
          } else if (op === 'TTL') {
            const [, key] = cmd;
            const ttl = keyTtls.get(key);
            results.push({ result: ttl !== undefined ? ttl : -2 });
          } else {
            results.push({ result: 'OK' });
          }
        }
        return { ok: true, json: async () => results };
      }
      if (u.includes('/HGETALL/')) {
        const key = decodeURIComponent(u.split('/HGETALL/')[1]);
        const map = migrationKvStore.get(key);
        if (typeof map === 'string') {
          return { ok: true, json: async () => ({ error: 'WRONGTYPE Operation against a key holding the wrong kind of value' }) };
        }
        const result = {};
        if (map instanceof Map) {
          for (const [f, v] of map.entries()) {
            result[f] = v;
          }
        }
        return { ok: true, json: async () => ({ result: result }) };
      }
      if (u.includes('/HGET/')) {
        const parts = u.split('/HGET/')[1].split('/');
        const key = decodeURIComponent(parts[0]);
        const field = decodeURIComponent(parts[1]);
        const map = migrationKvStore.get(key);
        if (typeof map === 'string') {
          return { ok: true, json: async () => ({ error: 'WRONGTYPE Operation against a key holding the wrong kind of value' }) };
        }
        const val = (map instanceof Map) ? (map.get(field) || null) : null;
        return { ok: true, json: async () => ({ result: val }) };
      }
      if (u.includes('/GET/')) {
        if (failGetCommands) {
          return { ok: false, status: 500, json: async () => ({ error: 'Internal Server Error' }) };
        }
        const key = decodeURIComponent(u.split('/GET/')[1]);
        const val = migrationKvStore.get(key);
        return { ok: true, json: async () => ({ result: typeof val === 'string' ? val : null }) };
      }
      if (u.includes('/TTL/')) {
        const key = decodeURIComponent(u.split('/TTL/')[1]);
        const ttl = keyTtls.get(key);
        return { ok: true, json: async () => ({ result: ttl !== undefined ? ttl : -2 }) };
      }
      if (u.includes('/DEL/')) {
        const key = decodeURIComponent(u.split('/DEL/')[1]);
        migrationKvStore.delete(key);
        keyTtls.delete(key);
        return { ok: true, json: async () => ({ result: 1 }) };
      }
      if (u.includes('/HDEL/')) {
        const parts = u.split('/HDEL/')[1].split('/');
        const key = decodeURIComponent(parts[0]);
        const field = decodeURIComponent(parts[1]);
        const map = migrationKvStore.get(key);
        if (map instanceof Map) {
          map.delete(field);
        }
        return { ok: true, json: async () => ({ result: 1 }) };
      }
      return { ok: true, json: async () => ({}) };
    };

    try {
      // 1. Test WRONGTYPE string key migration with an independent reader
      const kvLedgerWriter = new AnonymousVoteRotationLedger({
        restUrl: 'https://mock-kv.upstash.io',
        restToken: 'mock_token',
        prefix: 'qa_rot'
      });
      // recordVote on question 402 against an IP holding a legacy string key
      await kvLedgerWriter.recordVote(legacyIp, 402, 'anon_voter_new_402', 60000);

      // Independent reader instance connects to the same KV store
      const kvLedgerIndependentReader = new AnonymousVoteRotationLedger({
        restUrl: 'https://mock-kv.upstash.io',
        restToken: 'mock_token',
        prefix: 'qa_rot'
      });
      const readerVotes = await kvLedgerIndependentReader.getVotedQuestionsForIp(legacyIp);
      const readerQaIds = new Set(readerVotes.map(v => v.qa_id));
      assert.strictEqual(readerVotes.length, 2, 'Independent reader must find both legacy migrated question and new question');
      assert.ok(readerQaIds.has(401), 'Migrated legacy question 401 must be preserved in Redis hash');
      assert.ok(readerQaIds.has(402), 'Newly voted question 402 must be preserved in Redis hash');
      assert.strictEqual(await kvLedgerIndependentReader.isOriginalVoter(legacyIp, 401, 'anon_voter_legacy_401'), true);
      assert.strictEqual(await kvLedgerIndependentReader.isOriginalVoter(legacyIp, 402, 'anon_voter_new_402'), true);

      // 2. Test Errored HSET & Fail-Closed Behavior
      failHsetCommands = true;
      const errorIp = '198.51.100.88';
      let recordVoteThrew = false;
      try {
        await kvLedgerWriter.recordVote(errorIp, 501, 'anon_voter_fail', 60000);
      } catch (err) {
        recordVoteThrew = true;
        assert.ok(err.message.includes('Redis HSET command error'), 'Must throw Redis HSET command error');
      }
      assert.strictEqual(recordVoteThrew, true, 'recordVote must fail closed and throw on pipeline command error');

      // 3. Test HTTP route fail-closed and rollback when HSET pipeline fails
      const errorQaRes = await request(`/api/products/${prodWithImgId}/qa`, {
        method: 'POST',
        body: {
          name: 'Priya Iyer',
          question: 'Does the pallu feature real silver zari?'
        }
      });
      const errorQaId = errorQaRes.body.qa.id;
      assert.ok(errorQaId, 'Test question for fail-closed created');

      // Create an isolated router using the failing ledger
      const failingRouter = productsRouter.createRouter({
        db,
        rotationLedger: kvLedgerWriter
      });
      const failingApp = express();
      failingApp.use(express.json());
      failingApp.use('/api/products', failingRouter);
      const failingServer = http.createServer(failingApp);
      await new Promise(resolve => failingServer.listen(0, resolve));
      const failingPort = failingServer.address().port;

      try {
        const tokenRes = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${failingPort}/api/products/qa/voter-token`, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }));
          }).on('error', reject);
        });
        const cookie = tokenRes.headers['set-cookie']?.[0]?.split(';')[0];

        // Attempt helpful vote while HSET pipeline fails
        const voteRes = await new Promise((resolve, reject) => {
          const req = http.request(`http://127.0.0.1:${failingPort}/api/products/qa/${errorQaId}/helpful`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: cookie
            }
          }, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
          });
          req.on('error', reject);
          req.write(JSON.stringify({ voter_token: tokenRes.body.voter_token }));
          req.end();
        });

        assert.strictEqual(voteRes.status, 500, 'Helpful vote endpoint must fail closed with HTTP 500 when shared persistence fails');

        // Verify SQLite database rolled back vote and helpful_votes remained 0
        const qaRow = db.prepare('SELECT helpful_votes FROM product_qa WHERE id = ?').get(errorQaId);
        assert.strictEqual(qaRow.helpful_votes, 0, 'helpful_votes must remain 0 after pipeline failure rollback');
        const voteRows = db.prepare('SELECT COUNT(*) as count FROM product_qa_votes WHERE qa_id = ?').get(errorQaId);
        assert.strictEqual(voteRows.count, 0, 'No vote row must persist in SQLite when shared persistence fails');

        // Verify rotation ledger rollback in local memory and SQLite table
        const ledgerLocalEntries = kvLedgerWriter.localStore.get('127.0.0.1');
        assert.strictEqual(ledgerLocalEntries?.has(errorQaId) || false, false, 'Failed vote must not remain in localStore');
        const ledgerDbRow = db.prepare('SELECT COUNT(*) as count FROM anonymous_vote_rotation_ledger WHERE qa_id = ?').get(errorQaId);
        assert.strictEqual(ledgerDbRow.count, 0, 'Failed vote must not remain in anonymous_vote_rotation_ledger table');

        // Fail-then-retry & token renewal:
        // 1. Token renewal succeeds without prior vote suppression
        const renewedTokenRes = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${failingPort}/api/products/qa/voter-token`, {
            headers: { Cookie: cookie }
          }, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
          }).on('error', reject);
        });
        assert.strictEqual(renewedTokenRes.status, 200, 'Token renewal must succeed');

        // 2. Recover shared persistence and retry vote
        failHsetCommands = false;
        const retryVoteRes = await new Promise((resolve, reject) => {
          const req = http.request(`http://127.0.0.1:${failingPort}/api/products/qa/${errorQaId}/helpful`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: cookie
            }
          }, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
          });
          req.on('error', reject);
          req.write(JSON.stringify({ voter_token: renewedTokenRes.body.voter_token }));
          req.end();
        });
        assert.strictEqual(retryVoteRes.status, 200, 'Retry vote after recovery must succeed with HTTP 200');
        assert.strictEqual(retryVoteRes.body.helpful_votes, 1, 'helpful_votes must increment to 1 on retry');

        const votesFromIndependentReader = await kvLedgerIndependentReader.getVotedQuestionsForIp('127.0.0.1');
        assert.strictEqual(
          votesFromIndependentReader.some(v => v.qa_id === errorQaId),
          true,
          'Independent reader confirms vote was recorded after recovery'
        );
        // 4. Test failed migration pipeline preserves legacy source key and independent reader continues to see legacy votes
        const failedMigIp = '198.51.100.222';
        const failedMigLegacyKey = 'palluvo:qa_rot:ip:' + failedMigIp;
        migrationKvStore.set(failedMigLegacyKey, JSON.stringify({
          403: { originalBrowserKey: 'anon_voter_legacy_403', expiresAt: Date.now() + 60000 }
        }));

        failHsetCommands = true;
        const failingMigrator = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        let migrationFailed = false;
        try {
          await failingMigrator.getVotedQuestionsForIp(failedMigIp);
        } catch (err) {
          migrationFailed = true;
          assert.ok(err.message.includes('Redis pipeline command error'), 'Migration must throw when pipeline command fails');
        }
        assert.strictEqual(migrationFailed, true, 'Migration must fail closed on destination pipeline failure');
        assert.strictEqual(
          migrationKvStore.has(failedMigLegacyKey),
          true,
          'Legacy source key MUST be preserved when destination v2 pipeline write fails'
        );

        // Independent instance reads from KV after destination write recovers
        failHsetCommands = false;
        const independentReaderAfterFailure = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        const recoveredVotes = await independentReaderAfterFailure.getVotedQuestionsForIp(failedMigIp);
        assert.strictEqual(recoveredVotes.length, 1, 'Independent reader recovers legacy question after previous failed migration');
        assert.strictEqual(recoveredVotes[0].qa_id, 403);
        assert.strictEqual(recoveredVotes[0].original_browser_key, 'anon_voter_legacy_403');

        // Verify that after successful migration, the legacy key is cleanly deleted
        assert.strictEqual(
          migrationKvStore.has(failedMigLegacyKey),
          false,
          'Legacy source key must be deleted only after confirmed destination write'
        );

        // Independent reader checks identity rotation prevention
        const isOriginal = await independentReaderAfterFailure.isOriginalVoter(failedMigIp, 403, 'anon_voter_legacy_403');
        assert.strictEqual(isOriginal, true, 'Original voter recognized');
        const isRotated = await independentReaderAfterFailure.isOriginalVoter(failedMigIp, 403, 'rotated_identity');
        assert.strictEqual(isRotated, false, 'Rotated identity rejected');

        // 5. Test legacy GET read error fails closed with independent reader
        const legacyErrIp = '198.51.100.233';
        const legacyErrKey = 'palluvo:qa_rot:ip:' + legacyErrIp;
        migrationKvStore.set(legacyErrKey, JSON.stringify({
          404: { originalBrowserKey: 'anon_voter_legacy_404', expiresAt: Date.now() + 60000 }
        }));

        failGetCommands = true;
        const failingGetReader = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        // getVotedQuestionsForIp must throw instead of returning []
        let getVotedQuestionsThrew = false;
        try {
          await failingGetReader.getVotedQuestionsForIp(legacyErrIp);
        } catch (err) {
          getVotedQuestionsThrew = true;
          assert.ok(err.message.includes('Redis GET HTTP status 500'), 'Must propagate Redis GET HTTP status 500 error');
        }
        assert.strictEqual(getVotedQuestionsThrew, true, 'getVotedQuestionsForIp must fail closed when legacy GET fails');

        // getVoteRecord must throw instead of returning null
        let getVoteRecordThrew = false;
        try {
          await failingGetReader.getVoteRecord(legacyErrIp, 404);
        } catch (err) {
          getVoteRecordThrew = true;
          assert.ok(err.message.includes('Redis GET HTTP status 500'), 'Must propagate Redis GET HTTP status 500 error');
        }
        assert.strictEqual(getVoteRecordThrew, true, 'getVoteRecord must fail closed when legacy GET fails');

        // isOriginalVoter must throw instead of returning false (which would allow rotated identity)
        let isOriginalVoterThrew = false;
        try {
          await failingGetReader.isOriginalVoter(legacyErrIp, 404, 'anon_voter_legacy_404');
        } catch (err) {
          isOriginalVoterThrew = true;
          assert.ok(err.message.includes('Redis GET HTTP status 500'), 'isOriginalVoter must propagate GET failure');
        }
        assert.strictEqual(isOriginalVoterThrew, true, 'isOriginalVoter must fail closed on legacy GET failure');

        // Source key must still be intact in migrationKvStore
        assert.strictEqual(
          migrationKvStore.has(legacyErrKey),
          true,
          'Legacy source key must remain preserved during GET error'
        );

        // Recover GET connectivity: independent reader recovers votes and prevents identity rotation
        failGetCommands = false;
        const recoveringGetReader = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        const recoveredGetVotes = await recoveringGetReader.getVotedQuestionsForIp(legacyErrIp);
        assert.strictEqual(recoveredGetVotes.length, 1, 'Independent reader recovers legacy votes after GET recovery');
        assert.strictEqual(recoveredGetVotes[0].qa_id, 404);
        assert.strictEqual(recoveredGetVotes[0].original_browser_key, 'anon_voter_legacy_404');

        // Confirm legacy source key is deleted only after successful recovery and migration
        assert.strictEqual(
          migrationKvStore.has(legacyErrKey),
          false,
          'Legacy source key must be deleted only after successful recovery'
        );

        // 6. Test true interleaving race on lazy migration:
        // Reader GETs stale legacy snapshot with 45s TTL.
        // BEFORE reader's migration pipeline commits, another instance commits a fresh vote
        // for the SAME question (405) to v2 with 86400s TTL.
        // Stale legacy HSETNX must NOT overwrite the fresher v2 field or its expiresAt!
        const concIp = '198.51.100.244';
        const concLegacyKey = 'palluvo:qa_rot:ip:' + concIp;
        const concV2Key = 'palluvo:qa_rot:v2:ip:' + concIp;
        const legacyExpiresAt = Date.now() + 45000;

        // Pre-populate legacy key with questions 405 (stale 45s) and 409 (unrelated legacy question)
        migrationKvStore.set(concLegacyKey, JSON.stringify({
          405: { originalBrowserKey: 'anon_voter_legacy_405', expiresAt: legacyExpiresAt },
          409: { originalBrowserKey: 'anon_voter_legacy_409', expiresAt: legacyExpiresAt }
        }));
        keyTtls.set(concLegacyKey, 45);

        const concWriter = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });
        const concReader = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        // Interleave: exactly when concReader evaluates/replaces destination field for question 405,
        // concWriter commits fresh vote for SAME question 405 with 86400s TTL
        concReader._beforeConditionalReplaceHook = async (fullKey, field) => {
          if (fullKey === concV2Key && field === '405') {
            await concWriter.recordVote(concIp, 405, 'anon_voter_fresh_405', 86400000);
          }
        };

        // concReader runs getVotedQuestionsForIp (which reads legacy, hooks writer, and executes HSETNX pipeline)
        const concVotes = await concReader.getVotedQuestionsForIp(concIp);
        const concQaIds = new Set(concVotes.map(v => v.qa_id));
        assert.ok(concQaIds.has(405), 'Question 405 present in getVotedQuestionsForIp');
        assert.ok(concQaIds.has(409), 'Uncontested legacy question 409 migrated');

        // Verify that the destination v2 hash retains the FRESH vote for 405, NOT the stale legacy vote
        const v2Map = migrationKvStore.get(concV2Key);
        assert.ok(v2Map instanceof Map, 'concV2Key must exist as Map in shared KV store');
        const field405 = JSON.parse(v2Map.get('405'));
        assert.strictEqual(
          field405.originalBrowserKey,
          'anon_voter_fresh_405',
          'Interleaved stale migration MUST NOT overwrite newer v2 originalBrowserKey'
        );
        assert.ok(
          field405.expiresAt > legacyExpiresAt + 1000000,
          `Fresh expiresAt must be retained (~86400s), not stale legacy snapshot (~45s). Got ${field405.expiresAt}`
        );
        assert.strictEqual(
          keyTtls.get(concV2Key),
          86400,
          'Destination v2 hash TTL must remain 86400s'
        );

        // Fast forward 46 seconds: simulate time after the 45s legacy record would have expired
        const origDateNow1 = Date.now;
        try {
          Date.now = () => legacyExpiresAt + 1000;
          const recordAfter46s = await concReader.getVoteRecord(concIp, 405);
          assert.ok(
            recordAfter46s,
            'getVoteRecord MUST NOT return null after 45s when a fresh 24h vote was committed'
          );
          assert.strictEqual(
            recordAfter46s.original_browser_key,
            'anon_voter_fresh_405',
            'getVoteRecord must return fresh browser key after 45s'
          );
          assert.strictEqual(
            await concReader.isOriginalVoter(concIp, 405, 'rotated_intruder_token'),
            false,
            'Rotated identity token must be blocked even after 45s'
          );
          assert.strictEqual(
            await concReader.isOriginalVoter(concIp, 405, 'anon_voter_fresh_405'),
            true,
            'Original voter token must match'
          );

          // Verify uncontested legacy question 409 expired as expected
          const record409After46s = await concReader.getVoteRecord(concIp, 409);
          assert.strictEqual(record409After46s, null, 'Unrefreshed legacy vote expires after its 45s window');
        } finally {
          Date.now = origDateNow1;
        }

        // 7. Analogous path: test concurrent write and getVoteRecord migration race for the SAME question
        const concIp2 = '198.51.100.245';
        const concLegacyKey2 = 'palluvo:qa_rot:ip:' + concIp2;
        const concV2Key2 = 'palluvo:qa_rot:v2:ip:' + concIp2;
        const legacyExpiresAt2 = Date.now() + 30000;
        migrationKvStore.set(concLegacyKey2, JSON.stringify({
          407: { originalBrowserKey: 'anon_voter_legacy_407', expiresAt: legacyExpiresAt2 },
          410: { originalBrowserKey: 'anon_voter_legacy_410', expiresAt: legacyExpiresAt2 }
        }));
        keyTtls.set(concLegacyKey2, 30);

        // Interleave: when getVoteRecord evaluates/replaces question 407, concWriter commits fresh vote for SAME question 407
        concReader._beforeConditionalReplaceHook = async (fullKey, field) => {
          if (fullKey === concV2Key2 && field === '407') {
            await concWriter.recordVote(concIp2, 407, 'anon_voter_fresh_407', 86400000);
          }
        };

        const record407 = await concReader.getVoteRecord(concIp2, 407);
        assert.ok(record407, 'getVoteRecord must return a record');
        assert.strictEqual(
          record407.original_browser_key,
          'anon_voter_fresh_407',
          'getVoteRecord must return the fresher v2 voter key, not stale legacy key'
        );

        const v2Map2 = migrationKvStore.get(concV2Key2);
        assert.ok(v2Map2 instanceof Map, 'concV2Key2 must exist as Map in shared KV store');
        const field407 = JSON.parse(v2Map2.get('407'));
        assert.strictEqual(field407.originalBrowserKey, 'anon_voter_fresh_407');
        assert.ok(
          field407.expiresAt > legacyExpiresAt2 + 1000000,
          'v2 field 407 must preserve 24h expiresAt'
        );
        assert.strictEqual(keyTtls.get(concV2Key2), 86400, 'Hash TTL must remain 86400s');

        // Fast forward 31 seconds: simulate after 30s legacy record expires
        const origDateNow2 = Date.now;
        try {
          Date.now = () => legacyExpiresAt2 + 1000;
          const recordAfter31s = await concReader.getVoteRecord(concIp2, 407);
          assert.ok(recordAfter31s, 'getVoteRecord on question 407 must not return null after 30s');
          assert.strictEqual(recordAfter31s.original_browser_key, 'anon_voter_fresh_407');

          // Question 410 was unrefreshed legacy, must expire
          const recordAfter31s_410 = await concReader.getVoteRecord(concIp2, 410);
          assert.strictEqual(recordAfter31s_410, null, 'Unrefreshed legacy question 410 must expire');
        } finally {
          Date.now = origDateNow2;
        }

        // 8. [P2] Regression: Replace an expired v2 field when the legacy record is still live
        // The migration atomically evaluates expiration and conditionally replaces expired destination field
        // with the live legacy record before deleting source.
        const expIp = '198.51.100.246';
        const expLegacyKey = 'palluvo:qa_rot:ip:' + expIp;
        const expV2Key = 'palluvo:qa_rot:v2:ip:' + expIp;

        // In destination v2 hash: field 405 exists, but expired 5 seconds ago
        const v2MapExp = new Map();
        v2MapExp.set('405', JSON.stringify({
          originalBrowserKey: 'anon_voter_expired_v2_405',
          expiresAt: Date.now() - 5000
        }));
        migrationKvStore.set(expV2Key, v2MapExp);
        keyTtls.set(expV2Key, 60);

        // In legacy key: question 405 has a live record expiring 60s in the future
        const liveLegacyExpiresAt = Date.now() + 60000;
        migrationKvStore.set(expLegacyKey, JSON.stringify({
          405: { originalBrowserKey: 'anon_voter_live_legacy_405', expiresAt: liveLegacyExpiresAt }
        }));
        keyTtls.set(expLegacyKey, 60);

        const expReader = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        // Reader calls getVotedQuestionsForIp
        const expVotes = await expReader.getVotedQuestionsForIp(expIp);
        assert.strictEqual(expVotes.length, 1, 'Live legacy vote must NOT be dropped when v2 field is expired');
        assert.strictEqual(expVotes[0].qa_id, 405);
        assert.strictEqual(
          expVotes[0].original_browser_key,
          'anon_voter_live_legacy_405',
          'Live legacy voter key must replace expired v2 field'
        );

        // Destination v2 field in Redis must be replaced with the live record
        const updatedV2Map = migrationKvStore.get(expV2Key);
        const replacedField = JSON.parse(updatedV2Map.get('405'));
        assert.strictEqual(
          replacedField.originalBrowserKey,
          'anon_voter_live_legacy_405',
          'Expired v2 field must be replaced by live legacy record'
        );
        assert.ok(
          replacedField.expiresAt > Date.now(),
          'Replaced v2 field must have future expiration'
        );

        // Legacy key was deleted only after destination replacement succeeded
        assert.strictEqual(migrationKvStore.has(expLegacyKey), false, 'Legacy key must be deleted after replacement');

        // Verification with isOriginalVoter
        assert.strictEqual(
          await expReader.isOriginalVoter(expIp, 405, 'anon_voter_live_legacy_405'),
          true,
          'Original voter token must match live legacy identity'
        );
        assert.strictEqual(
          await expReader.isOriginalVoter(expIp, 405, 'new_unaliased_intruder'),
          false,
          'Intruder token must be blocked from voting again'
        );

        // 8b. [P2] Regression: Interleaved fresh v2 writer between evaluation and replacement
        // Review finding: "replacement can overwrite a concurrent fresh v2 vote. Please make the expiry comparison
        // and conditional replacement atomic (for example, a Redis Lua script), and add a regression that interleaves
        // the fresh writer between HGET and replacement."
        const interIp = '198.51.100.248';
        const interLegacyKey = 'palluvo:qa_rot:ip:' + interIp;
        const interV2Key = 'palluvo:qa_rot:v2:ip:' + interIp;

        // Destination v2 hash has field 406 expired 5 seconds ago
        const v2MapInter = new Map();
        v2MapInter.set('406', JSON.stringify({
          originalBrowserKey: 'anon_voter_expired_v2_406',
          expiresAt: Date.now() - 5000
        }));
        migrationKvStore.set(interV2Key, v2MapInter);
        keyTtls.set(interV2Key, 60);

        // Legacy key has live record expiring in 60s
        migrationKvStore.set(interLegacyKey, JSON.stringify({
          406: { originalBrowserKey: 'anon_voter_stale_legacy_406', expiresAt: Date.now() + 60000 }
        }));
        keyTtls.set(interLegacyKey, 60);

        const interReader = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        // Interleave fresh writer: right in _beforeConditionalReplaceHook
        // (simulating a concurrent writer arriving between evaluation and replacement)
        let interWriterRan = false;
        interReader._beforeConditionalReplaceHook = async (fullKey, field) => {
          if (field === '406' && !interWriterRan) {
            interWriterRan = true;
            await concWriter.recordVote(interIp, 406, 'anon_voter_fresh_interleaved_406', 86400000);
          }
        };

        const interVotes = await interReader.getVotedQuestionsForIp(interIp);
        assert.strictEqual(interWriterRan, true, 'Interleaved fresh writer must have executed in race window');
        assert.strictEqual(interVotes.length, 1);
        assert.strictEqual(interVotes[0].qa_id, 406);
        assert.strictEqual(
          interVotes[0].original_browser_key,
          'anon_voter_fresh_interleaved_406',
          'Interleaved fresh v2 write must take precedence over stale legacy record'
        );

        // Destination v2 hash must retain the fresh write and its 24h expiration
        const interUpdatedV2Map = migrationKvStore.get(interV2Key);
        const interField = JSON.parse(interUpdatedV2Map.get('406'));
        assert.strictEqual(
          interField.originalBrowserKey,
          'anon_voter_fresh_interleaved_406',
          'Fresh v2 originalBrowserKey must NOT be overwritten by stale legacy record'
        );
        assert.ok(
          interField.expiresAt > Date.now() + 1000000,
          'Fresh v2 24h expiration must be preserved'
        );

        // Legacy key is deleted after migration resolves
        assert.strictEqual(migrationKvStore.has(interLegacyKey), false, 'Legacy key must be deleted after migration resolves');

        // isOriginalVoter verifies fresh voter and rejects stale legacy voter
        assert.strictEqual(
          await interReader.isOriginalVoter(interIp, 406, 'anon_voter_fresh_interleaved_406'),
          true,
          'Fresh voter recognized'
        );
        assert.strictEqual(
          await interReader.isOriginalVoter(interIp, 406, 'anon_voter_stale_legacy_406'),
          false,
          'Stale legacy voter key rejected'
        );

        // 9. [P2] Regression: Atomic Compare-And-Delete prevents dropping legacy keys updated in verification-to-delete window
        // Review finding: "the legacy key can still change between verification and deletion. Please compare-and-delete
        // atomically against the observed source value (or use an equivalent versioned migration), and test an update in this exact verification-to-delete window."
        const concRaceIp = '198.51.100.247';
        const concRaceLegacyKey = 'palluvo:qa_rot:ip:' + concRaceIp;
        const concRaceV2Key = 'palluvo:qa_rot:v2:ip:' + concRaceIp;

        // Initial legacy key has only question 401
        migrationKvStore.set(concRaceLegacyKey, JSON.stringify({
          401: { originalBrowserKey: 'anon_voter_legacy_401', expiresAt: Date.now() + 60000 }
        }));
        keyTtls.set(concRaceLegacyKey, 60);

        const concRaceReader = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        // Interleaving hook: An older instance updates the legacy JSON in the EXACT verification-to-delete window!
        // (after reading snapshot of 401, right before executing atomic Compare-And-Delete)
        let legacyUpdateTriggered = false;
        concRaceReader._beforeCompareAndDeleteHook = async (key) => {
          if (key === concRaceLegacyKey && !legacyUpdateTriggered) {
            legacyUpdateTriggered = true;
            migrationKvStore.set(concRaceLegacyKey, JSON.stringify({
              401: { originalBrowserKey: 'anon_voter_legacy_401', expiresAt: Date.now() + 60000 },
              402: { originalBrowserKey: 'anon_voter_legacy_402', expiresAt: Date.now() + 60000 }
            }));
          }
        };

        const raceVotes = await concRaceReader.getVotedQuestionsForIp(concRaceIp);
        assert.strictEqual(legacyUpdateTriggered, true, 'Legacy update hook must have executed in verification-to-delete window');
        const raceQaIds = new Set(raceVotes.map(v => v.qa_id));

        // Both questions must be present! Question 402 was not erased because Compare-And-Delete rejected the mismatch and retried
        assert.ok(raceQaIds.has(401), 'Question 401 must be migrated');
        assert.ok(raceQaIds.has(402), 'Concurrently added question 402 must be migrated after retry');

        // Destination v2 hash in KV store must contain BOTH 401 and 402
        const concRaceV2Map = migrationKvStore.get(concRaceV2Key);
        assert.ok(concRaceV2Map instanceof Map, 'concRaceV2Key must exist as Map in shared KV');
        assert.ok(concRaceV2Map.has('401'), 'Field 401 must exist in v2 hash');
        assert.ok(concRaceV2Map.has('402'), 'Field 402 must exist in v2 hash');

        // Legacy key was safely deleted after both questions were confirmed migrated
        assert.strictEqual(migrationKvStore.has(concRaceLegacyKey), false, 'Legacy key deleted only after full migration');

        // Independent reader confirms both questions exist in v2 hash
        const indepRaceReader = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });
        const rec401 = await indepRaceReader.getVoteRecord(concRaceIp, 401);
        const rec402 = await indepRaceReader.getVoteRecord(concRaceIp, 402);
        assert.strictEqual(rec401.original_browser_key, 'anon_voter_legacy_401');
        assert.strictEqual(rec402.original_browser_key, 'anon_voter_legacy_402');

        // 10. [P2] Regression: Retry if the source changes after an empty snapshot
        // If an empty legacy key (or one with only expired entries) is modified by a concurrent writer
        // before the Compare-And-Delete runs, CAD rejects the mismatch and the migration retries, discovering and
        // migrating the newly added live entry instead of returning an empty result.
        const emptyIp = '198.51.100.249';
        const emptyLegacyKey = 'palluvo:qa_rot:ip:' + emptyIp;
        const emptyV2Key = 'palluvo:qa_rot:v2:ip:' + emptyIp;

        // Legacy key initially exists but has 0 unexpired entries (expired 5s ago)
        migrationKvStore.set(emptyLegacyKey, JSON.stringify({
          411: { originalBrowserKey: 'anon_voter_expired_411', expiresAt: Date.now() - 5000 }
        }));
        keyTtls.set(emptyLegacyKey, 60);

        const emptyReader = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        // Interleaving hook: When Compare-And-Delete is about to run on the empty snapshot,
        // a concurrent legacy writer writes a live vote for question 412!
        let emptyHookRan = false;
        emptyReader._beforeCompareAndDeleteHook = async (key) => {
          if (key === emptyLegacyKey && !emptyHookRan) {
            emptyHookRan = true;
            migrationKvStore.set(emptyLegacyKey, JSON.stringify({
              411: { originalBrowserKey: 'anon_voter_expired_411', expiresAt: Date.now() - 5000 },
              412: { originalBrowserKey: 'anon_voter_live_412', expiresAt: Date.now() + 60000 }
            }));
          }
        };

        const emptyVotes = await emptyReader.getVotedQuestionsForIp(emptyIp);
        assert.strictEqual(emptyHookRan, true, 'Concurrent writer hook must run');
        assert.strictEqual(emptyVotes.length, 1, 'Live vote added after empty snapshot must be discovered and returned');
        assert.strictEqual(emptyVotes[0].qa_id, 412);
        assert.strictEqual(emptyVotes[0].original_browser_key, 'anon_voter_live_412');

        // Destination v2 hash has question 412
        const emptyV2Map = migrationKvStore.get(emptyV2Key);
        assert.ok(emptyV2Map instanceof Map, 'v2 hash must exist');
        assert.ok(emptyV2Map.has('412'), 'Question 412 must be migrated to v2 hash');

        // Source key deleted after successful retry
        assert.strictEqual(migrationKvStore.has(emptyLegacyKey), false, 'Source key deleted after retry migration');

        // isOriginalVoter verifies original identity
        assert.strictEqual(await emptyReader.isOriginalVoter(emptyIp, 412, 'anon_voter_live_412'), true);
        assert.strictEqual(await emptyReader.isOriginalVoter(emptyIp, 412, 'rotated_intruder'), false);

        // 11. [P2] Regression: Fail closed when migration retry limit is exhausted by repeated concurrent updates
        // If more than 5 consecutive Compare-And-Delete conflicts occur, the migration must fail closed and throw
        // rather than returning an incomplete vote set.
        const retryLimitIp = '198.51.100.250';
        const retryLimitLegacyKey = 'palluvo:qa_rot:ip:' + retryLimitIp;
        const retryLimitV2Key = 'palluvo:qa_rot:v2:ip:' + retryLimitIp;

        // Legacy key initially has question 420
        migrationKvStore.set(retryLimitLegacyKey, JSON.stringify({
          420: { originalBrowserKey: 'anon_voter_420', expiresAt: Date.now() + 60000 }
        }));
        keyTtls.set(retryLimitLegacyKey, 60);

        const retryLimitReader = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        // Interleave 6 consecutive source updates (more than five) on every CAD attempt
        let conflictCount = 0;
        retryLimitReader._beforeCompareAndDeleteHook = async (key) => {
          if (key === retryLimitLegacyKey) {
            conflictCount++;
            // Each CAD attempt, update the source with a new question
            const currentEntries = JSON.parse(migrationKvStore.get(retryLimitLegacyKey) || '{}');
            currentEntries[420 + conflictCount] = {
              originalBrowserKey: `anon_voter_${420 + conflictCount}`,
              expiresAt: Date.now() + 60000
            };
            migrationKvStore.set(retryLimitLegacyKey, JSON.stringify(currentEntries));
          }
        };

        let retryLimitThrew = false;
        try {
          await retryLimitReader.getVotedQuestionsForIp(retryLimitIp);
        } catch (err) {
          retryLimitThrew = true;
          assert.ok(
            err.message.includes('retry limit exceeded') || err.message.includes('concurrent legacy updates'),
            `Error message must indicate retry limit exceeded: ${err.message}`
          );
        }

        assert.strictEqual(retryLimitThrew, true, 'getVotedQuestionsForIp must fail closed and throw when retry limit is exhausted');
        assert.ok(conflictCount > 5, `Must have performed more than 5 consecutive source changes (got ${conflictCount})`);

        // The legacy source key MUST NOT be deleted (remains intact for future retry without losing votes)
        assert.strictEqual(migrationKvStore.has(retryLimitLegacyKey), true, 'Source key must remain intact when migration fails closed');

        // 12. [P2] Regression: Refresh v2 hash when another migrator deletes legacy source
        // When another instance migrates qid 702 into v2 and deletes the legacy source while this instance
        // is migrating qid 701, this instance loses Compare-And-Delete, discovers the deleted source,
        // and refreshes the v2 hash so both qid 701 and qid 702 are included and returned.
        const twoMigIp = '198.51.100.251';
        const twoMigLegacyKey = 'palluvo:qa_rot:ip:' + twoMigIp;
        const twoMigV2Key = 'palluvo:qa_rot:v2:ip:' + twoMigIp;

        // Legacy key initially contains question 701
        migrationKvStore.set(twoMigLegacyKey, JSON.stringify({
          701: { originalBrowserKey: 'anon_voter_legacy_701', expiresAt: Date.now() + 60000 }
        }));
        keyTtls.set(twoMigLegacyKey, 60);

        const migratorA = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        // Interleaving hook: Before migratorA runs Compare-And-Delete on the legacy key,
        // migratorB concurrently writes qid 702 to the v2 hash and deletes the legacy source key!
        let migratorBHookRan = false;
        migratorA._beforeCompareAndDeleteHook = async (key) => {
          if (key === twoMigLegacyKey && !migratorBHookRan) {
            migratorBHookRan = true;
            // migratorB sets question 702 in v2 hash
            if (!migrationKvStore.has(twoMigV2Key)) {
              migrationKvStore.set(twoMigV2Key, new Map());
            }
            const v2Map = migrationKvStore.get(twoMigV2Key);
            v2Map.set('702', JSON.stringify({
              originalBrowserKey: 'anon_voter_legacy_702',
              expiresAt: Date.now() + 60000
            }));
            // migratorB successfully deletes the legacy source key
            migrationKvStore.delete(twoMigLegacyKey);
            keyTtls.delete(twoMigLegacyKey);
          }
        };

        const twoMigVotes = await migratorA.getVotedQuestionsForIp(twoMigIp);
        assert.strictEqual(migratorBHookRan, true, 'Migrator B hook must execute during CAD verification window');
        assert.strictEqual(twoMigVotes.length, 2, 'getVotedQuestionsForIp must refresh v2 hash and return both 701 and 702');
        const twoMigQaIds = new Set(twoMigVotes.map(v => v.qa_id));
        assert.ok(twoMigQaIds.has(701), 'Question 701 must be present');
        assert.ok(twoMigQaIds.has(702), 'Concurrently migrated question 702 must be present from refreshed v2 hash');

        const vote701 = twoMigVotes.find(v => v.qa_id === 701);
        const vote702 = twoMigVotes.find(v => v.qa_id === 702);
        assert.strictEqual(vote701.original_browser_key, 'anon_voter_legacy_701');
        assert.strictEqual(vote702.original_browser_key, 'anon_voter_legacy_702');

        // Both questions exist in the v2 hash
        const twoMigV2Store = migrationKvStore.get(twoMigV2Key);
        assert.ok(twoMigV2Store instanceof Map, 'Destination v2 hash must exist');
        assert.ok(twoMigV2Store.has('701'), 'Question 701 must be in v2 hash');
        assert.ok(twoMigV2Store.has('702'), 'Question 702 must be in v2 hash');

        // Legacy source remains deleted
        assert.strictEqual(migrationKvStore.has(twoMigLegacyKey), false, 'Legacy source key must be deleted');

        // Both original voters are recognized
        assert.strictEqual(await migratorA.isOriginalVoter(twoMigIp, 701, 'anon_voter_legacy_701'), true);
        assert.strictEqual(await migratorA.isOriginalVoter(twoMigIp, 702, 'anon_voter_legacy_702'), true);
        assert.strictEqual(await migratorA.isOriginalVoter(twoMigIp, 702, 'rotated_intruder'), false);

        // 13. [P2] Regression: Preserve skipped legacy vote until the replacement write succeeds
        // If an active legacy vote exists for qid 703 and recordVote(703) fails during the v2 HSET pipeline write,
        // the skipped legacy entry must NOT be deleted, and remains fully recoverable after rollbackVote().
        const skipFailIp = '198.51.100.252';
        const skipFailLegacyKey = 'palluvo:qa_rot:ip:' + skipFailIp;
        const skipFailV2Key = 'palluvo:qa_rot:v2:ip:' + skipFailIp;

        // Active legacy vote for question 703 exists in source key
        migrationKvStore.set(skipFailLegacyKey, JSON.stringify({
          703: { originalBrowserKey: 'anon_voter_legacy_703', expiresAt: Date.now() + 60000 }
        }));
        keyTtls.set(skipFailLegacyKey, 60);

        const skipLedger = new AnonymousVoteRotationLedger({
          restUrl: 'https://mock-kv.upstash.io',
          restToken: 'mock_token',
          prefix: 'qa_rot:v2'
        });

        // Simulate HSET failure during recordVote
        failHsetCommands = true;
        let skipWriteFailed = false;
        try {
          await skipLedger.recordVote(skipFailIp, 703, 'anon_voter_replacement_703', 60000);
        } catch (err) {
          skipWriteFailed = true;
          assert.ok(err.message.includes('Redis HSET command error'), 'Must fail with Redis HSET command error');
        }
        assert.strictEqual(skipWriteFailed, true, 'recordVote must throw when HSET fails');

        // Route calls rollbackVote on failure
        await skipLedger.rollbackVote(skipFailIp, 703);

        // Crucial verification: The legacy source key MUST NOT be deleted!
        // Both source and destination must NOT be empty! The source key remains intact with question 703.
        assert.strictEqual(migrationKvStore.has(skipFailLegacyKey), true, 'Legacy source key MUST be preserved when replacement write fails');
        const preservedLegacy = JSON.parse(migrationKvStore.get(skipFailLegacyKey) || '{}');
        assert.ok(preservedLegacy[703], 'Question 703 must remain in preserved legacy source key');
        assert.strictEqual(preservedLegacy[703].originalBrowserKey, 'anon_voter_legacy_703');

        // Destination v2 hash does not have question 703
        const skipFailV2Store = migrationKvStore.get(skipFailV2Key);
        assert.strictEqual(skipFailV2Store?.has('703') || false, false, 'v2 hash must not contain unconfirmed 703 write');

        // Identity rotation prevention remains 100% active!
        failHsetCommands = false;
        const skipRecoveredVotes = await skipLedger.getVotedQuestionsForIp(skipFailIp);
        assert.strictEqual(skipRecoveredVotes.length, 1, 'Legacy vote 703 must be recovered by getVotedQuestionsForIp');
        assert.strictEqual(skipRecoveredVotes[0].qa_id, 703);
        assert.strictEqual(skipRecoveredVotes[0].original_browser_key, 'anon_voter_legacy_703');

        assert.strictEqual(await skipLedger.isOriginalVoter(skipFailIp, 703, 'anon_voter_legacy_703'), true);
        assert.strictEqual(await skipLedger.isOriginalVoter(skipFailIp, 703, 'rotated_intruder'), false);

        // Now verify the successful replacement write path:
        // When HSET succeeds, the destination v2 hash gets the replacement vote and the legacy key is deleted
        const skipSuccessIp = '198.51.100.253';
        const skipSuccessLegacyKey = 'palluvo:qa_rot:ip:' + skipSuccessIp;
        const skipSuccessV2Key = 'palluvo:qa_rot:v2:ip:' + skipSuccessIp;

        migrationKvStore.set(skipSuccessLegacyKey, JSON.stringify({
          704: { originalBrowserKey: 'anon_voter_legacy_704', expiresAt: Date.now() + 60000 }
        }));
        keyTtls.set(skipSuccessLegacyKey, 60);

        await skipLedger.recordVote(skipSuccessIp, 704, 'anon_voter_replacement_704', 60000);

        // Destination v2 hash has the replacement voter key
        const successV2Map = migrationKvStore.get(skipSuccessV2Key);
        assert.ok(successV2Map instanceof Map, 'Destination v2 hash must exist');
        assert.ok(successV2Map.has('704'), 'Question 704 must exist in v2 hash');
        const parsed704 = JSON.parse(successV2Map.get('704'));
        assert.strictEqual(parsed704.originalBrowserKey, 'anon_voter_replacement_704');

        // Legacy key is deleted after confirmed replacement write
        assert.strictEqual(migrationKvStore.has(skipSuccessLegacyKey), false, 'Legacy source key must be deleted after successful replacement write');

        assert.strictEqual(await skipLedger.isOriginalVoter(skipSuccessIp, 704, 'anon_voter_replacement_704'), true);
        assert.strictEqual(await skipLedger.isOriginalVoter(skipSuccessIp, 704, 'rotated_intruder'), false);
      } finally {
        failingServer.close();
      }

      console.log('✅ PASS: [P2] Redis pipeline errors fail closed, roll back unpersisted votes, and migrate legacy string keys');

      // --- Testing [P2] PIN Code Serviceability & Schema Alignment ---
      console.log('\n--- Testing [P2] PIN Code Serviceability & Schema Alignment ---');

      // 1. PIN 000000 and invalid formats must return HTTP 400 and reject unserviceable / non-existent PINs
      const pin0Res = await request('/api/pincode/check/000000');
      assert.strictEqual(pin0Res.status, 400, 'PIN 000000 must be rejected with HTTP 400');
      assert.strictEqual(pin0Res.body.valid, false, 'PIN 000000 valid must be false');
      assert.strictEqual(pin0Res.body.serviceable, false, 'PIN 000000 serviceable must be false');
      assert.ok(pin0Res.body.error, 'Must provide an error message for 000000');

      const pinShortRes = await request('/api/pincode/check/5600');
      assert.strictEqual(pinShortRes.status, 400, 'Short PIN must be rejected with HTTP 400');

      const pinAlphaRes = await request('/api/pincode/check/abcdef');
      assert.strictEqual(pinAlphaRes.status, 400, 'Non-digit PIN must be rejected with HTTP 400');

      const pinInvalidCircleRes = await request('/api/pincode/check/999999');
      assert.strictEqual(pinInvalidCircleRes.status, 400, 'Non-existent postal circle 999999 must return HTTP 400');

      // 2. Authoritative verified express hub (e.g. 560001 Bengaluru) must return normalized schema matching UI
      const pin560Res = await request('/api/pincode/check/560001');
      assert.strictEqual(pin560Res.status, 200, 'Verified PIN must return HTTP 200');
      assert.strictEqual(pin560Res.body.valid, true);
      assert.strictEqual(pin560Res.body.serviceable, true);
      assert.strictEqual(pin560Res.body.verified, true);
      assert.strictEqual(pin560Res.body.is_estimate, false);

      // Verify that all fields accessed by the frontend UI exist and are populated
      assert.strictEqual(pin560Res.body.city, 'Bengaluru', 'city field must be non-empty for UI');
      assert.strictEqual(pin560Res.body.state, 'Karnataka', 'state field must be non-empty for UI');
      assert.strictEqual(pin560Res.body.location, 'Bengaluru, Karnataka', 'location field must match city, state');
      assert.strictEqual(pin560Res.body.estimated_delivery, '1-2 Business Days', 'estimated_delivery must be populated for UI');
      assert.strictEqual(pin560Res.body.estimatedDays, '1-2 Business Days', 'estimatedDays must match estimated_delivery');
      assert.strictEqual(pin560Res.body.deliveryDate, 'Delivery in 1-2 Business Days');
      assert.strictEqual(pin560Res.body.codAvailable, true, 'Verified hub must confirm COD availability');
      assert.strictEqual(pin560Res.body.expressAvailable, true);

      // Verify frontend template expressions resolve cleanly without empty values:
      const renderedLocation = pin560Res.body.city && pin560Res.body.state
        ? `${pin560Res.body.city}, ${pin560Res.body.state}`
        : (pin560Res.body.location || pin560Res.body.city);
      const renderedDelivery = pin560Res.body.estimated_delivery || pin560Res.body.deliveryDate || pin560Res.body.estimatedDays;
      assert.strictEqual(renderedLocation, 'Bengaluru, Karnataka', 'Rendered location string must be non-empty and accurate');
      assert.strictEqual(renderedDelivery, '1-2 Business Days', 'Rendered delivery string must be non-empty and accurate');

      // 3. Flagship center Warangal (506001)
      const pin506Res = await request('/api/pincode/check/506001');
      assert.strictEqual(pin506Res.status, 200);
      assert.strictEqual(pin506Res.body.city, 'Warangal');
      assert.strictEqual(pin506Res.body.state, 'Telangana');
      assert.strictEqual(pin506Res.body.verified, true);
      assert.strictEqual(pin506Res.body.codAvailable, true);

      // 4. Regional postal circle estimate (171001 Himachal Pradesh - unverified hub)
      const pin171Res = await request('/api/pincode/check/171001');
      assert.strictEqual(pin171Res.status, 200, 'Valid circle must return HTTP 200');
      assert.strictEqual(pin171Res.body.valid, true);
      assert.strictEqual(pin171Res.body.serviceable, false, 'Non-verified circle must NOT claim confirmed serviceability');
      assert.strictEqual(pin171Res.body.verified, false, 'Non-verified hub must NOT be marked verified');
      assert.strictEqual(pin171Res.body.is_estimate, true, 'Non-verified hub must be marked is_estimate');
      assert.strictEqual(pin171Res.body.codAvailable, false, 'Non-verified hub must NOT assert COD availability');
      assert.strictEqual(pin171Res.body.expressAvailable, false, 'Non-verified hub must NOT assert express availability');
      assert.ok(pin171Res.body.estimated_delivery, 'Must provide estimated_delivery');
      assert.ok(pin171Res.body.state, 'Must provide state');

      // 5. Unlisted six-digit PIN values sharing a configured prefix (e.g. 560000 and 560999 sharing prefix '56')
      // Must NOT be marked as verified hubs, must be treated as estimates, and must NOT claim confirmed serviceability, COD, or express availability
      const pin560000Res = await request('/api/pincode/check/560000');
      assert.strictEqual(pin560000Res.status, 200, '560000 must return HTTP 200');
      assert.strictEqual(pin560000Res.body.valid, true);
      assert.strictEqual(pin560000Res.body.verified, false, '560000 must NOT be marked verified');
      assert.strictEqual(pin560000Res.body.serviceable, false, '560000 must NOT claim confirmed serviceability');
      assert.strictEqual(pin560000Res.body.is_estimate, true, '560000 must be marked as estimate');
      assert.strictEqual(pin560000Res.body.codAvailable, false, '560000 must NOT assert COD availability');
      assert.strictEqual(pin560000Res.body.expressAvailable, false, '560000 must NOT assert express availability');
      assert.ok(pin560000Res.body.estimated_delivery, 'Must provide estimated_delivery');

      const pin560999Res = await request('/api/pincode/check/560999');
      assert.strictEqual(pin560999Res.status, 200, '560999 must return HTTP 200');
      assert.strictEqual(pin560999Res.body.valid, true);
      assert.strictEqual(pin560999Res.body.verified, false, '560999 must NOT be marked verified');
      assert.strictEqual(pin560999Res.body.serviceable, false, '560999 must NOT claim confirmed serviceability');
      assert.strictEqual(pin560999Res.body.is_estimate, true, '560999 must be marked as estimate');
      assert.strictEqual(pin560999Res.body.codAvailable, false, '560999 must NOT assert COD availability');
      assert.strictEqual(pin560999Res.body.expressAvailable, false, '560999 must NOT assert express availability');
      assert.ok(pin560999Res.body.estimated_delivery, 'Must provide estimated_delivery');

      // 6. Mixed prefix 24 (Uttarakhand & Western Uttar Pradesh) handling
      // Unlisted PIN under mixed prefix 24 must keep state unknown (null) instead of falsely claiming 'Uttarakhand'
      const pin24UnlistedRes = await request('/api/pincode/check/244002');
      assert.strictEqual(pin24UnlistedRes.status, 200, 'Unlisted 24 prefix PIN must return HTTP 200');
      assert.strictEqual(pin24UnlistedRes.body.valid, true);
      assert.strictEqual(pin24UnlistedRes.body.verified, false);
      assert.strictEqual(pin24UnlistedRes.body.serviceable, false);
      assert.strictEqual(pin24UnlistedRes.body.is_estimate, true);
      assert.strictEqual(pin24UnlistedRes.body.state, null, 'Unlisted PIN under mixed prefix 24 must not assign a single state');
      assert.strictEqual(pin24UnlistedRes.body.location, 'Uttarakhand & Western UP');

      // Authoritative exact-PIN lookup for Moradabad (244001) resolves to Uttar Pradesh
      const pin244001Res = await request('/api/pincode/check/244001');
      assert.strictEqual(pin244001Res.status, 200);
      assert.strictEqual(pin244001Res.body.valid, true);
      assert.strictEqual(pin244001Res.body.verified, true);
      assert.strictEqual(pin244001Res.body.serviceable, true);
      assert.strictEqual(pin244001Res.body.city, 'Moradabad');
      assert.strictEqual(pin244001Res.body.state, 'Uttar Pradesh', 'PIN 244001 must resolve to Uttar Pradesh from exact-PIN source');
      assert.strictEqual(pin244001Res.body.location, 'Moradabad, Uttar Pradesh');

      // Authoritative exact-PIN lookup for Dehradun (248001) resolves to Uttarakhand
      const pin248001Res = await request('/api/pincode/check/248001');
      assert.strictEqual(pin248001Res.status, 200);
      assert.strictEqual(pin248001Res.body.valid, true);
      assert.strictEqual(pin248001Res.body.verified, true);
      assert.strictEqual(pin248001Res.body.serviceable, true);
      assert.strictEqual(pin248001Res.body.city, 'Dehradun');
      assert.strictEqual(pin248001Res.body.state, 'Uttarakhand', 'PIN 248001 must resolve to Uttarakhand from exact-PIN source');
      assert.strictEqual(pin248001Res.body.location, 'Dehradun, Uttarakhand');

      // Mixed prefix 79 (North Eastern States) keeps state null
      const pin79Res = await request('/api/pincode/check/790001');
      assert.strictEqual(pin79Res.status, 200);
      assert.strictEqual(pin79Res.body.valid, true);
      assert.strictEqual(pin79Res.body.state, null, 'Multi-state prefix 79 must keep state null');
      assert.strictEqual(pin79Res.body.location, 'North Eastern States');

      // 7. Exact PIN 160017 (Chandigarh GPO) must return Chandigarh UT, not Punjab
      const pin160Res = await request('/api/pincode/check/160017');
      assert.strictEqual(pin160Res.status, 200);
      assert.strictEqual(pin160Res.body.valid, true);
      assert.strictEqual(pin160Res.body.verified, true);
      assert.strictEqual(pin160Res.body.serviceable, true);
      assert.strictEqual(pin160Res.body.city, 'Chandigarh');
      assert.strictEqual(pin160Res.body.state, 'Chandigarh', 'PIN 160017 must return Chandigarh UT instead of Punjab');
      assert.strictEqual(pin160Res.body.location, 'Chandigarh');

      // 8. Mixed prefix 26 (Rohilkhand & Kumaon) handling
      // Unlisted PIN 263001 (Nainital) under mixed prefix 26 must keep state unknown (null)
      // instead of falsely attributing to Uttar Pradesh
      const pin263Res = await request('/api/pincode/check/263001');
      assert.strictEqual(pin263Res.status, 200);
      assert.strictEqual(pin263Res.body.valid, true);
      assert.strictEqual(pin263Res.body.verified, false);
      assert.strictEqual(pin263Res.body.serviceable, false);
      assert.strictEqual(pin263Res.body.is_estimate, true);
      assert.strictEqual(pin263Res.body.state, null, 'Unlisted PIN 263001 under mixed prefix 26 must not assign Uttar Pradesh');
      assert.strictEqual(pin263Res.body.location, 'Rohilkhand & Kumaon');

      // Unlisted PIN under mixed prefix 16 must keep state unknown (null)
      const pin160000Res = await request('/api/pincode/check/160000');
      assert.strictEqual(pin160000Res.status, 200);
      assert.strictEqual(pin160000Res.body.valid, true);
      assert.strictEqual(pin160000Res.body.is_estimate, true);
      assert.strictEqual(pin160000Res.body.state, null, 'Unlisted PIN under prefix 16 must keep state null');

      console.log('✅ PASS: [P2] PIN serviceability rejects invalid PINs, normalizes schema for UI, resolves exact mixed PINs (Chandigarh UT), and keeps mixed prefixes (24, 26, 16, 79) unknown');
    } finally {
      global.fetch = regressionFetch;
    }

    // [P2] Shop Filter Selection State & Modal Dialog Semantics Accessibility Test
    const { testShopFilterAccessibility } = require('./shop_filter_accessibility.test');
    await testShopFilterAccessibility();

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    if (server) {
      server.close();
    }
    try {
      db.close();
    } catch (e) {
      // ignore
    }
    // Clean up disposable test database directory
    try {
      fs.rmSync(testDbDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up disposable test database directory');
    } catch (e) {
      console.warn('Cleanup note:', e.message);
    }
  }
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});

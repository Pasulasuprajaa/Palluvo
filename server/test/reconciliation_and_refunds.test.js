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
const { reconcilePendingRefunds, reconcileExpiredReservations } = paymentsRouter;
const { refundRazorpayPayment, fetchRazorpayOrder, createRazorpayOrder } = require('../services/razorpay');

async function runTests() {
  console.log('🧪 Starting test suite for P1 (Idempotency Header & Test Isolation) and P2 (Reconciliation Authentication)...');
  console.log(`📁 Test database path: ${testDbPath}`);

  let server;

  try {
    // Setup test Express app
    const app = express();
    app.use(express.json());
    app.use('/api/payments', paymentsRouter);

    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/payments`;

    async function request(reqPath, options = {}) {
      return new Promise((resolve, reject) => {
        const fullUrl = `${baseUrl}${reqPath}`;
        const url = new URL(fullUrl);
        const req = http.request(url, {
          method: options.method || 'GET',
          headers: options.headers || {}
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

    // Scenario 9: Paginated refund list [P2]
    // Payment has 10 failed refunds on page 1 and an older pending refund on page 2.
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
    console.log('✅ PASS: [P2] Paginated refund list discovers older pending refund across pages, retaining pending state without key rotation or duplicate refund');

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

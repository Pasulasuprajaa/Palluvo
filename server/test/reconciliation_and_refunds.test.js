const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');
const paymentsRouter = require('../routes/payments');
const { reconcilePendingRefunds, reconcileExpiredReservations } = paymentsRouter;

async function runTests() {
  console.log('🧪 Starting test suite for P1 (Pending Refund Retention) and P2 (Reconciliation Authentication)...');

  // Set test environment CRON_SECRET
  const TEST_CRON_SECRET = 'test_cron_secret_palluvo_12345';
  process.env.CRON_SECRET = TEST_CRON_SECRET;

  // Clean up any existing test orders and payments
  db.prepare("DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'ORD-TEST-%')").run();
  db.prepare("DELETE FROM orders WHERE order_number LIKE 'ORD-TEST-%'").run();

  // Setup test Express app
  const app = express();
  app.use(express.json());
  app.use('/api/payments', paymentsRouter);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/payments`;

  async function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const fullUrl = `${baseUrl}${path}`;
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
    headers: { 'Authorization': `Bearer ${TEST_CRON_SECRET}` }
  });
  assert.strictEqual(resValidCron.status, 200, 'Valid CRON_SECRET should return 200');
  assert.strictEqual(resValidCron.body.success, true, 'Response body should indicate success');
  console.log('✅ PASS: GET /reconcile with valid CRON_SECRET Bearer returns 200 OK');

  // 4. Valid Admin JWT token should also succeed with 200
  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (adminUser) {
    const adminToken = jwt.sign({ id: adminUser.id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    const resAdmin = await request('/reconcile', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(resAdmin.status, 200, 'Valid admin JWT should return 200');
    console.log('✅ PASS: GET /reconcile with Admin JWT returns 200 OK');
  }

  // 5. Non-GET methods (POST, PUT, DELETE) must be rejected with 405 Method Not Allowed
  const resPost = await request('/reconcile', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TEST_CRON_SECRET}` }
  });
  assert.strictEqual(resPost.status, 405, 'POST /reconcile should return 405');
  assert.strictEqual(resPost.headers['allow'], 'GET', 'Allow header should specify GET');
  console.log('✅ PASS: POST /reconcile returns 405 Method Not Allowed');

  const resPut = await request('/reconcile', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${TEST_CRON_SECRET}` }
  });
  assert.strictEqual(resPut.status, 405, 'PUT /reconcile should return 405');
  console.log('✅ PASS: PUT /reconcile returns 405 Method Not Allowed');

  // --- TEST SUITE P1: Pending Refund Retention & Retry Only on Confirmed Failure ---
  console.log('\n--- Testing [P1] Pending Refund Retention & Safe Retries ---');

  // Pre-cleanup any lingering test orders
  db.prepare("DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'ORD-TEST-%')").run();
  db.prepare("DELETE FROM orders WHERE order_number LIKE 'ORD-TEST-%'").run();

  // Create test user and product if needed
  let testUser = db.prepare("SELECT id FROM users LIMIT 1").get();
  if (!testUser) {
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Test User', 'testuser@palluvo.com', 'hash', 'customer')").run();
    testUser = db.prepare("SELECT id FROM users WHERE email = 'testuser@palluvo.com'").get();
  }

  const nonce = Date.now();
  // Scenario 1: Order has an existing PENDING refund.
  // Reconciler MUST NOT resubmit refund and MUST NOT overwrite refund_id!
  const pendingRefundId = `rfnd_mock_pending_in_flight_${nonce}`;
  const orderNum1 = `ORD-TEST-PENDING-REFUND-1-${nonce}`;
  db.prepare(`
    INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
    VALUES (?, ?, 1000, 1000, 'Refund_Pending', 'Cancelled', 'order_mock_test_1', 'pay_mock_refund_pending_1', ?, '{"city":"Mumbai"}', CURRENT_TIMESTAMP)
  `).run(orderNum1, testUser.id, pendingRefundId);

  const order1 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum1);

  // Run reconciler
  await reconcilePendingRefunds();

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
  `).run(orderNum2, testUser.id, processedRefundId);
  const order2 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum2);

  db.prepare(`
    INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
    VALUES (?, 'order_mock_test_2', 'pay_mock_2', 'sig_test', 200000, 'INR', 'Refund_Pending', 'Razorpay')
  `).run(order2.id);

  await reconcilePendingRefunds();

  const refreshedOrder2 = db.prepare("SELECT * FROM orders WHERE id = ?").get(order2.id);
  const refreshedPayment2 = db.prepare("SELECT * FROM payments WHERE order_id = ?").get(order2.id);
  assert.strictEqual(refreshedOrder2.payment_status, 'Refunded', 'Processed refund transitions order to Refunded');
  assert.strictEqual(refreshedOrder2.refund_id, processedRefundId, 'Order records processed refund ID');
  assert.strictEqual(refreshedPayment2.status, 'Refunded', 'Payments table updated to Refunded');
  console.log('✅ PASS: Processed refund positively confirmed and transitioned to Refunded');

  // Scenario 3: Order has a previous refund that Razorpay confirms FAILED/CANCELLED.
  // Reconciler should now safely retry with idempotency key.
  const failedRefundId = `rfnd_mock_failed_attempt_${nonce}`;
  const orderNum3 = `ORD-TEST-FAILED-RETRY-3-${nonce}`;
  db.prepare(`
    INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
    VALUES (?, ?, 3000, 3000, 'Refund_Pending', 'Cancelled', 'order_mock_test_3', 'pay_mock_retry_3', ?, '{"city":"Bengaluru"}', CURRENT_TIMESTAMP)
  `).run(orderNum3, testUser.id, failedRefundId);
  const order3 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum3);

  // When retry runs on pay_mock_retry_3, refundRazorpayPayment returns mock processed
  await reconcilePendingRefunds();

  const refreshedOrder3 = db.prepare("SELECT * FROM orders WHERE id = ?").get(order3.id);
  assert.strictEqual(refreshedOrder3.payment_status, 'Refunded', 'Retry of confirmed failed attempt succeeds');
  assert.notStrictEqual(refreshedOrder3.refund_id, failedRefundId, 'New refund ID generated on retry');
  console.log('✅ PASS: Confirmed failed refund safely retried after gateway confirmation');

  // Scenario 4: Refund retry fails with gateway error.
  // Reconciler should transition payment_status to Refund_Failed and store refund_error.
  const orderNum4 = `ORD-TEST-FAILED-RETRY-4-${nonce}`;
  db.prepare(`
    INSERT INTO orders (order_number, user_id, subtotal, total_amount, payment_status, status, razorpay_order_id, razorpay_payment_id, refund_id, address_data, created_at)
    VALUES (?, ?, 4000, 4000, 'Refund_Pending', 'Cancelled', 'order_mock_test_4', 'pay_mock_refund_failed_err', ?, '{"city":"Chennai"}', CURRENT_TIMESTAMP)
  `).run(orderNum4, testUser.id, 'rfnd_mock_failed_attempt_2');
  const order4 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get(orderNum4);

  await reconcilePendingRefunds();

  const refreshedOrder4 = db.prepare("SELECT * FROM orders WHERE id = ?").get(order4.id);
  assert.strictEqual(refreshedOrder4.payment_status, 'Refund_Failed', 'Failing retry transitions to Refund_Failed');
  assert.ok(refreshedOrder4.refund_error, 'Refund error is recorded');
  console.log('✅ PASS: Gateway retry failure recorded as Refund_Failed with error');

  // Cleanup test orders
  db.prepare("DELETE FROM payments WHERE order_id IN (?, ?, ?, ?)").run(order1.id, order2.id, order3.id, order4.id);
  db.prepare("DELETE FROM orders WHERE id IN (?, ?, ?, ?)").run(order1.id, order2.id, order3.id, order4.id);

  server.close();
  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});

const BASE = 'http://localhost:5000/api';
const testState = { testUserId: null, testUserToken: null, adminToken: null };
async function req(endpoint, opts, token) {
  opts = opts || {};
  const url = BASE + endpoint;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(url, Object.assign({}, opts, { headers: Object.assign({}, headers, opts.headers || {}) }));
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { _raw: text }; }
  return { status: res.status, ok: res.ok, data };
}
function log(label, status, detail) {
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[INFO]';
  console.log(icon + ' ' + label + (detail ? ': ' + detail : ''));
}
async function cleanup() {
  console.log('\n--- CLEANUP ---');
  try {
    if (testState.testUserId && testState.adminToken) {
      const r = await req('/admin/users', { method: 'DELETE', body: JSON.stringify({ userIds: [testState.testUserId] }) }, testState.adminToken);
      log('Delete test user (cascade deletes payment requests)', r.ok ? 'PASS' : 'FAIL', 'User: ' + testState.testUserId + ' status: ' + r.status);
    }
  } catch(err) { log('Cleanup error', 'WARN', err.message); }
}
async function main() {
  console.log('='.repeat(60));
  console.log('E2E TEST: Watch Pass + Subscription Admin Payment Approval');
  console.log('='.repeat(60));
  const results = [];
  try {
    console.log('\n--- STEP 1: Admin Login ---');
    let adminLogin = await req('/auth/admin-login', { method: 'POST', body: JSON.stringify({ adminId: 'admin', adminPassword: 'admin123' }) });
    if (!adminLogin.ok) {
      adminLogin = await req('/auth/admin-quick-login', { method: 'POST' });
    }
    if (adminLogin.ok && adminLogin.data && adminLogin.data.token) {
      testState.adminToken = adminLogin.data.token;
      log('Admin login', 'PASS', 'role: ' + (adminLogin.data.user && adminLogin.data.user.role));
      results.push({ test: 'Admin Login', status: 'PASS' });
    } else {
      log('Admin login', 'FAIL', JSON.stringify(adminLogin.data));
      results.push({ test: 'Admin Login', status: 'FAIL' });
      throw new Error('Cannot get admin token');
    }
    console.log('\n--- STEP 2: Create Test User ---');
    const ts = Date.now();
    const testEmail = 'e2e_test_' + ts + '@flopshow-test.invalid';
    const register = await req('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'E2E Test User', email: testEmail, password: 'TestPass123!' }) });
    if (!register.ok) {
      log('Register test user', 'FAIL', JSON.stringify(register.data));
      results.push({ test: 'Register Test User', status: 'FAIL' });
      throw new Error('Cannot create test user');
    }
    testState.testUserId = register.data.user && register.data.user.id;
    testState.testUserToken = register.data.token;
    log('Register test user', 'PASS', 'ID: ' + testState.testUserId);
    results.push({ test: 'Register Test User', status: 'PASS' });
    console.log('\n--- STEP 3: Get Payment Config ---');
    const cfg = await req('/payments/config', {}, testState.testUserToken);
    log('Payment config', cfg.ok ? 'PASS' : 'FAIL', cfg.ok ? 'UPI: ' + cfg.data.upiId + ' mode: ' + cfg.data.approvalMode : JSON.stringify(cfg.data));
    console.log('\n--- STEP 4: Submit Watch Pass ---');
    const wpUtr = 'WPTEST' + ts;
    const wpSubmit = await req('/watch-passes/submit-request', { method: 'POST', body: JSON.stringify({ contentId: null, plan: 'PASS_7D', utr: wpUtr, userName: 'E2E Test User', userEmail: testEmail }) }, testState.testUserToken);
    console.log('WatchPass response:', JSON.stringify(wpSubmit.data));
    if (wpSubmit.ok) {
      log('Submit Watch Pass', 'PASS', 'UTR: ' + wpUtr);
      results.push({ test: 'Submit Watch Pass Payment', status: 'PASS' });
    } else {
      log('Submit Watch Pass', 'FAIL', 'HTTP ' + wpSubmit.status + ': ' + JSON.stringify(wpSubmit.data));
      results.push({ test: 'Submit Watch Pass Payment', status: 'FAIL', detail: JSON.stringify(wpSubmit.data) });
    }
    console.log('\n--- STEP 5: Submit Subscription ---');
    const subUtr = 'SUBTEST' + ts;
    const subSubmit = await req('/subscriptions/submit-request', { method: 'POST', body: JSON.stringify({ plan: 'MONTHLY', utr: subUtr, userName: 'E2E Test User', userEmail: testEmail }) }, testState.testUserToken);
    console.log('Subscription response:', JSON.stringify(subSubmit.data));
    if (subSubmit.ok) {
      log('Submit Subscription', 'PASS', 'UTR: ' + subUtr);
      results.push({ test: 'Submit Subscription Payment', status: 'PASS' });
    } else {
      log('Submit Subscription', 'FAIL', 'HTTP ' + subSubmit.status + ': ' + JSON.stringify(subSubmit.data));
      results.push({ test: 'Submit Subscription Payment', status: 'FAIL', detail: JSON.stringify(subSubmit.data) });
    }
    console.log('\n--- STEP 6: Admin Payments Panel Visibility ---');
    const adminReqs = await req('/payments/admin/requests?status=ALL&limit=100', {}, testState.adminToken);
    console.log('Admin payments HTTP status:', adminReqs.status);
    if (!adminReqs.ok) {
      log('Admin payments API', 'FAIL', 'HTTP ' + adminReqs.status + ': ' + JSON.stringify(adminReqs.data));
      results.push({ test: 'Admin Payments API', status: 'FAIL' });
    } else {
      const reqs = adminReqs.data.requests || [];
      log('Admin payments API', 'PASS', 'Total: ' + reqs.length);
      results.push({ test: 'Admin Payments API', status: 'PASS' });
      const wpInAdmin = reqs.find(function(r) { return r.utr === wpUtr; });
      if (wpInAdmin) {
        log('Watch Pass visible in Admin Panel', 'PASS', 'product_type: ' + wpInAdmin.product_type + ' plan_id: ' + wpInAdmin.plan_id + ' status: ' + wpInAdmin.status);
        results.push({ test: 'Watch Pass Visible in Admin Panel', status: 'PASS' });
      } else {
        log('Watch Pass NOT visible in Admin Panel', 'FAIL', 'UTR: ' + wpUtr + ' not found. First 5 UTRs: ' + reqs.slice(0,5).map(function(r){return r.utr+'('+r.product_type+')'}).join(', '));
        results.push({ test: 'Watch Pass Visible in Admin Panel', status: 'FAIL' });
      }
      const subInAdmin = reqs.find(function(r) { return r.utr === subUtr; });
      if (subInAdmin) {
        log('Subscription visible in Admin Panel', 'PASS', 'product_type: ' + subInAdmin.product_type + ' plan_id: ' + subInAdmin.plan_id);
        results.push({ test: 'Subscription Visible in Admin Panel', status: 'PASS' });
      } else {
        log('Subscription NOT visible in Admin Panel', 'FAIL', 'UTR: ' + subUtr + ' not found');
        results.push({ test: 'Subscription Visible in Admin Panel', status: 'FAIL' });
      }
      var ptypes = [];
      reqs.forEach(function(r) { if (ptypes.indexOf(r.product_type) < 0) ptypes.push(r.product_type); });
      log('Product types present', 'INFO', ptypes.join(', ') || 'none');
    }
    console.log('\n--- STEP 7: PENDING Filter ---');
    const pending = await req('/payments/admin/requests?status=PENDING&limit=100', {}, testState.adminToken);
    if (pending.ok) {
      const pr = pending.data.requests || [];
      const wpP = pr.find(function(r){ return r.utr === wpUtr; });
      const subP = pr.find(function(r){ return r.utr === subUtr; });
      log('Watch Pass in PENDING filter: ' + (wpP ? 'YES' : 'NO'), wpP ? 'PASS' : 'FAIL');
      log('Subscription in PENDING filter: ' + (subP ? 'YES' : 'NO'), subP ? 'PASS' : 'FAIL');
      results.push({ test: 'Watch Pass in PENDING Filter', status: wpP ? 'PASS' : 'FAIL' });
      results.push({ test: 'Subscription in PENDING Filter', status: subP ? 'PASS' : 'FAIL' });
    }
    console.log('\n--- STEP 8: Approve Watch Pass ---');
    const allR2 = await req('/payments/admin/requests?status=ALL&limit=100', {}, testState.adminToken);
    const wpReq = (allR2.data.requests || []).find(function(r){ return r.utr === wpUtr; });
    if (wpReq && wpReq.id) {
      const apW = await req('/payments/admin/approve', { method: 'POST', body: JSON.stringify({ paymentRequestId: wpReq.id, adminNote: 'E2E Test' }) }, testState.adminToken);
      console.log('Approve WP response:', JSON.stringify(apW.data));
      if (apW.ok) {
        log('Approve Watch Pass', 'PASS', apW.data.message || '');
        results.push({ test: 'Approve Watch Pass', status: 'PASS' });
        const mp = await req('/watch-passes/my-passes', {}, testState.testUserToken);
        const ap = (mp.data.activePasses || []).find(function(p){ return p.payment_reference === wpUtr; });
        log('Watch Pass active after approval: ' + (ap ? 'YES plan=' + ap.plan : 'NO'), ap ? 'PASS' : 'FAIL');
        results.push({ test: 'Watch Pass Active After Approval', status: ap ? 'PASS' : 'FAIL' });
      } else {
        log('Approve Watch Pass', 'FAIL', 'HTTP ' + apW.status + ': ' + JSON.stringify(apW.data));
        results.push({ test: 'Approve Watch Pass', status: 'FAIL' });
      }
    } else {
      log('Watch Pass request not found for approval', 'FAIL');
      results.push({ test: 'Approve Watch Pass', status: 'FAIL' });
    }
    console.log('\n--- STEP 9: Approve Subscription ---');
    const allR3 = await req('/payments/admin/requests?status=ALL&limit=100', {}, testState.adminToken);
    const subReq = (allR3.data.requests || []).find(function(r){ return r.utr === subUtr; });
    if (subReq && subReq.id) {
      const apS = await req('/payments/admin/approve', { method: 'POST', body: JSON.stringify({ paymentRequestId: subReq.id, adminNote: 'E2E Test' }) }, testState.adminToken);
      console.log('Approve Sub response:', JSON.stringify(apS.data));
      if (apS.ok) {
        log('Approve Subscription', 'PASS', apS.data.message || '');
        results.push({ test: 'Approve Subscription', status: 'PASS' });
        const ms = await req('/subscriptions/my-status', {}, testState.testUserToken);
        console.log('Sub status after approval:', JSON.stringify(ms.data));
        log('Subscription active: ' + ms.data.hasActiveSubscription, ms.data.hasActiveSubscription ? 'PASS' : 'FAIL');
        results.push({ test: 'Subscription Active After Approval', status: ms.data.hasActiveSubscription ? 'PASS' : 'FAIL' });
      } else {
        log('Approve Subscription', 'FAIL', 'HTTP ' + apS.status + ': ' + JSON.stringify(apS.data));
        results.push({ test: 'Approve Subscription', status: 'FAIL' });
      }
    } else {
      log('Subscription request not found for approval', 'FAIL');
      results.push({ test: 'Approve Subscription', status: 'FAIL' });
    }
  } catch(err) {
    log('UNEXPECTED ERROR', 'FAIL', err.message);
    results.push({ test: 'Unexpected Error', status: 'FAIL', detail: err.message });
  } finally {
    await cleanup();
  }
  console.log('\n' + '='.repeat(60));
  console.log('E2E RESULTS');
  console.log('='.repeat(60));
  let passed = 0, failed = 0;
  results.forEach(function(r) {
    const icon = r.status === 'PASS' ? '[PASS]' : '[FAIL]';
    console.log(icon + ' ' + r.test + (r.detail ? ' -- ' + r.detail : ''));
    if (r.status === 'PASS') passed++; else failed++;
  });
  console.log('TOTAL: ' + passed + ' PASSED, ' + failed + ' FAILED');
  if (failed > 0) process.exit(1);
}
main().catch(function(err) { console.error('Fatal:', err); process.exit(1); });

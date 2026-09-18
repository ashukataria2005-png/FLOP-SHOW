import { createServer } from '../server.js';
import { runMigrationsAsync } from '../db/migrator.js';
import { seedDatabase } from '../db/seed.js';
import { Server } from 'http';
import { getAdapter } from '../db/adapter.js';
import { config } from '../config/env.js';
import bcrypt from 'bcryptjs';

interface TestResult {
  step: number;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(step: number, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ step, name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ [Check ${step}] ${name}`);
  } catch (err: any) {
    results.push({
      step,
      name,
      passed: false,
      error: err.message || String(err),
      durationMs: Date.now() - start
    });
    console.error(`  ✗ [Check ${step}] ${name}`);
    console.error(`    Error: ${err.message || String(err)}`);
  }
}

async function main() {
  console.log('========================================================================');
  console.log('FLOPSHOW DUAL MONETIZATION SYSTEM: 16-POINT ACCEPTANCE VERIFICATION');
  console.log('========================================================================\n');

  // Setup DB and seed
  await runMigrationsAsync();
  const seedReport = await seedDatabase();

  const app = createServer();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  let adminToken = '';
  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  const testMovieId = 'test-monetization-movie-1';
  const testUnpurchasedMovieId = 'test-monetization-movie-2';
  let user1SubId = '';
  let user2SubId = '';

  const db = getAdapter();

  try {
    // 0. Authentication & Fixtures Setup
    const testAdminEmail = `test_admin_${Date.now()}@test.com`;
    const testAdminPass = 'AdminTestPass123!';
    const hashedPw = await bcrypt.hash(testAdminPass, 10);
    const testAdminId = `admin-test-${Date.now()}`;

    await db.run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, 'Automated Test Admin', ?, ?, 'ADMIN', 'ACTIVE', NOW(), NOW());`,
      [testAdminId, testAdminEmail, hashedPw]
    );

    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: testAdminPass })
    });
    const adminData = await adminLoginRes.json();
    if (!adminLoginRes.ok || !adminData.token) {
      throw new Error(`Admin login failed (${adminLoginRes.status}): ${JSON.stringify(adminData)}`);
    }
    adminToken = adminData.token;

    const email1 = `sub_user1_${Date.now()}@test.com`;
    const regRes1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Subscriber User 1', email: email1, password: 'password123' })
    });
    const regData1 = await regRes1.json();
    user1Token = regData1.token;
    user1Id = regData1.user.id;

    const email2 = `sub_user2_${Date.now()}@test.com`;
    const regRes2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rejected User 2', email: email2, password: 'password123' })
    });
    const regData2 = await regRes2.json();
    user2Token = regData2.token;
    user2Id = regData2.user.id;

    // Insert 2 test movies into content (price in paise: 1000 paise = ₹10)
    await db.run(
      `INSERT INTO content (id, type, title, slug, description, poster, backdrop, price, release_year, video_url, status, created_at, updated_at)
       VALUES (?, 'MOVIE', ?, ?, 'Test movie 1', 'https://example.com/poster1.jpg', 'https://example.com/backdrop1.jpg', 1000, 2024, ?, 'PUBLISHED', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET price = 1000, video_url = excluded.video_url;`,
      [testMovieId, 'Monetization Movie 1', 'monetization-movie-1', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4']
    );

    await db.run(
      `INSERT INTO content (id, type, title, slug, description, poster, backdrop, price, release_year, video_url, status, created_at, updated_at)
       VALUES (?, 'MOVIE', ?, ?, 'Test movie 2', 'https://example.com/poster2.jpg', 'https://example.com/backdrop2.jpg', 1000, 2024, ?, 'PUBLISHED', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET price = 1000, video_url = excluded.video_url;`,
      [testUnpurchasedMovieId, 'Monetization Movie 2', 'monetization-movie-2', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4']
    );

    // Reset initial mode to PER_CONTENT
    await db.run("INSERT INTO app_settings (key, value, updated_at) VALUES ('monetization_mode', 'PER_CONTENT', NOW()) ON CONFLICT (key) DO UPDATE SET value = 'PER_CONTENT', updated_at = NOW();");

    // ------------------------------------------------------------------------
    // CHECKLIST 1: Default mode = PER_CONTENT
    // ------------------------------------------------------------------------
    await runTest(1, 'Default mode is PER_CONTENT', async () => {
      const res = await fetch(`${baseUrl}/api/monetization/config`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.mode !== 'PER_CONTENT') {
        throw new Error(`Expected mode PER_CONTENT, got: ${data.mode}`);
      }
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 2: Existing wallet/purchase flow still works
    // ------------------------------------------------------------------------
    await runTest(2, 'Existing wallet recharge + per-content movie purchase works in PER_CONTENT mode', async () => {
      // Credit wallet with ₹50 (5000 paise)
      await db.run('UPDATE wallets SET balance = 5000 WHERE user_id = ?;', [user1Id]);

      // Purchase testMovieId for ₹10
      const purchaseRes = await fetch(`${baseUrl}/api/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({ contentId: testMovieId })
      });
      if (!purchaseRes.ok) {
        const err = await purchaseRes.json();
        throw new Error(`Purchase failed: ${err.message || purchaseRes.statusText}`);
      }

      // Verify wallet balance is 4000 paise (₹40)
      const walletRes = await db.query('SELECT balance FROM wallets WHERE user_id = ?;', [user1Id]);
      const balance = Number(walletRes.rows[0].balance);
      if (balance !== 4000) throw new Error(`Expected wallet balance 4000 paise, got: ${balance}`);

      // Verify stream access for purchased movie
      const streamRes = await fetch(`${baseUrl}/api/media/content/${testMovieId}?type=MAIN`, {
        headers: { 'Authorization': `Bearer ${user1Token}` }
      });
      if (!streamRes.ok) throw new Error(`Stream access failed with status ${streamRes.status}`);
      const streamData = await streamRes.json();
      if (!streamData.url || !streamData.authorized) throw new Error('Expected authorized stream response');
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 3: Admin switches to SUBSCRIPTION
    // ------------------------------------------------------------------------
    await runTest(3, 'Admin switches monetization mode to SUBSCRIPTION', async () => {
      const res = await fetch(`${baseUrl}/api/monetization/admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          mode: 'SUBSCRIPTION',
          prices: { weekly: 49, monthly: 149, yearly: 999 }
        })
      });
      if (!res.ok) throw new Error(`Switch mode failed with HTTP ${res.status}`);
      const data = await res.json();
      if (data.mode !== 'SUBSCRIPTION') throw new Error(`Expected mode SUBSCRIPTION, got ${data.mode}`);

      // Check public config
      const pubRes = await fetch(`${baseUrl}/api/monetization/config`);
      const pubData = await pubRes.json();
      if (pubData.mode !== 'SUBSCRIPTION') throw new Error(`Public config mode expected SUBSCRIPTION, got ${pubData.mode}`);
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 4: Weekly/Monthly/Yearly prices work
    // ------------------------------------------------------------------------
    await runTest(4, 'Weekly (₹49), Monthly (₹149), Yearly (₹999) prices return correctly', async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions/plans`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const plans = data.plans;
      if (!Array.isArray(plans) || plans.length !== 3) throw new Error(`Expected 3 plans, got ${plans?.length}`);

      const weekly = plans.find((p: any) => p.plan === 'WEEKLY');
      const monthly = plans.find((p: any) => p.plan === 'MONTHLY');
      const yearly = plans.find((p: any) => p.plan === 'YEARLY');

      if (!weekly || weekly.price_inr !== 49) throw new Error(`Weekly price mismatch: ${weekly?.price_inr}`);
      if (!monthly || monthly.price_inr !== 149) throw new Error(`Monthly price mismatch: ${monthly?.price_inr}`);
      if (!yearly || yearly.price_inr !== 999) throw new Error(`Yearly price mismatch: ${yearly?.price_inr}`);
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 5: User submits subscription payment + UTR
    // ------------------------------------------------------------------------
    const utr1 = `UTR1${Date.now()}`;
    await runTest(5, 'User submits subscription payment with plan and UTR reference', async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions/submit-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({
          plan: 'MONTHLY',
          paymentReference: utr1
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Submit failed: ${err.message}`);
      }
      const data = await res.json();
      if (!data.subscription?.id) throw new Error('Expected subscription ID in response');
      user1SubId = data.subscription.id;
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 6: Subscription remains PENDING
    // ------------------------------------------------------------------------
    await runTest(6, 'Submitted subscription remains PENDING and is not automatically active', async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions/my-status`, {
        headers: { 'Authorization': `Bearer ${user1Token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.has_active !== false) throw new Error('has_active should be FALSE while pending');
      if (!data.pending) throw new Error('pending subscription info missing');
      if (data.pending.status !== 'PENDING') throw new Error(`Expected PENDING, got ${data.pending.status}`);
      if (data.pending.payment_reference !== utr1) throw new Error('Payment reference mismatch');
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 7: User does NOT get playback access while PENDING
    // ------------------------------------------------------------------------
    await runTest(7, 'User does NOT get subscription playback access while PENDING (returns 403 SUBSCRIPTION_REQUIRED)', async () => {
      const streamRes = await fetch(`${baseUrl}/api/media/content/${testUnpurchasedMovieId}?type=MAIN`, {
        headers: { 'Authorization': `Bearer ${user1Token}` }
      });
      if (streamRes.status !== 403) {
        throw new Error(`Expected 403 Forbidden while pending, got status ${streamRes.status}`);
      }
      const err = await streamRes.json();
      const code = err.code || err.error?.code;
      if (code !== 'SUBSCRIPTION_REQUIRED') {
        throw new Error(`Expected code SUBSCRIPTION_REQUIRED, got ${code}`);
      }
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 8: Admin approves
    // ------------------------------------------------------------------------
    await runTest(8, 'Admin reviews and approves subscription request', async () => {
      // Check admin sees request
      const listRes = await fetch(`${baseUrl}/api/subscriptions/admin/requests?status=PENDING`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const listData = await listRes.json();
      const found = listData.requests.find((r: any) => r.id === user1SubId);
      if (!found) throw new Error('Pending subscription not found in admin requests list');

      // Admin approves
      const approveRes = await fetch(`${baseUrl}/api/subscriptions/admin/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          subscriptionId: user1SubId,
          adminNote: 'Verified bank credit receipt'
        })
      });
      if (!approveRes.ok) {
        const err = await approveRes.json();
        throw new Error(`Approve failed: ${err.message}`);
      }
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 9: Subscription becomes ACTIVE
    // ------------------------------------------------------------------------
    await runTest(9, 'Subscription status transitions to ACTIVE with valid start and end dates', async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions/my-status`, {
        headers: { 'Authorization': `Bearer ${user1Token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.has_active !== true) throw new Error('Expected has_active to be TRUE');
      if (data.active?.status !== 'ACTIVE') throw new Error(`Expected ACTIVE status, got ${data.active?.status}`);
      if (!data.active?.end_date) throw new Error('Active subscription end_date is missing');
      if (data.active.daysRemaining <= 0) throw new Error('Active subscription daysRemaining should be > 0');
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 10: User gets playback access
    // ------------------------------------------------------------------------
    await runTest(10, 'Active subscriber successfully streams previously unpurchased title', async () => {
      const streamRes = await fetch(`${baseUrl}/api/media/content/${testUnpurchasedMovieId}?type=MAIN`, {
        headers: { 'Authorization': `Bearer ${user1Token}` }
      });
      if (!streamRes.ok) {
        throw new Error(`Stream failed with status ${streamRes.status}`);
      }
      const streamData = await streamRes.json();
      if (!streamData.url || !streamData.authorized) throw new Error('Expected authorized stream response');
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 11: Admin rejects another request
    // ------------------------------------------------------------------------
    const utr2 = `UTR2${Date.now()}`;
    await runTest(11, 'User 2 submits request and Admin rejects it', async () => {
      // User 2 submits request
      const subRes = await fetch(`${baseUrl}/api/subscriptions/submit-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user2Token}`
        },
        body: JSON.stringify({
          plan: 'WEEKLY',
          paymentReference: utr2
        })
      });
      const subData = await subRes.json();
      user2SubId = subData.subscription.id;

      // Admin rejects
      const rejectRes = await fetch(`${baseUrl}/api/subscriptions/admin/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          subscriptionId: user2SubId,
          adminNote: 'Payment reference not found in bank statement'
        })
      });
      if (!rejectRes.ok) {
        const err = await rejectRes.json();
        throw new Error(`Reject failed: ${err.message}`);
      }
      const rejectData = await rejectRes.json();
      if (rejectData.subscription.status !== 'REJECTED') {
        throw new Error(`Expected status REJECTED, got ${rejectData.subscription.status}`);
      }
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 12: Rejected user gets no subscription access
    // ------------------------------------------------------------------------
    await runTest(12, 'Rejected user does NOT receive subscription access', async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions/my-status`, {
        headers: { 'Authorization': `Bearer ${user2Token}` }
      });
      const data = await res.json();
      if (data.has_active !== false) throw new Error('Rejected user must not have active subscription');

      const streamRes = await fetch(`${baseUrl}/api/media/content/${testUnpurchasedMovieId}?type=MAIN`, {
        headers: { 'Authorization': `Bearer ${user2Token}` }
      });
      if (streamRes.status !== 403) {
        throw new Error(`Expected 403 Forbidden for rejected user, got ${streamRes.status}`);
      }
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 13: Subscription expiry prevents access
    // ------------------------------------------------------------------------
    await runTest(13, 'Expired subscription correctly prevents playback access', async () => {
      // Artificially set user1's subscription end date into the past
      const yesterdayIso = new Date(Date.now() - 86400000).toISOString();
      await db.run("UPDATE subscriptions SET end_date = ? WHERE id = ?", [yesterdayIso, user1SubId]);

      // Check status
      const res = await fetch(`${baseUrl}/api/subscriptions/my-status`, {
        headers: { 'Authorization': `Bearer ${user1Token}` }
      });
      const data = await res.json();
      if (data.has_active !== false) {
        throw new Error('Expired subscription must report has_active = false');
      }

      // Check stream access for unpurchased movie
      const streamRes = await fetch(`${baseUrl}/api/media/content/${testUnpurchasedMovieId}?type=MAIN`, {
        headers: { 'Authorization': `Bearer ${user1Token}` }
      });
      if (streamRes.status !== 403) {
        throw new Error(`Expected 403 Forbidden for expired subscription, got ${streamRes.status}`);
      }
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 14: Switching back to PER_CONTENT restores wallet/purchase UI
    // ------------------------------------------------------------------------
    await runTest(14, 'Admin switches back to PER_CONTENT mode successfully', async () => {
      const res = await fetch(`${baseUrl}/api/monetization/admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ mode: 'PER_CONTENT' })
      });
      if (!res.ok) throw new Error(`Failed to switch back to PER_CONTENT: ${res.status}`);

      const cfgRes = await fetch(`${baseUrl}/api/monetization/config`);
      const cfgData = await cfgRes.json();
      if (cfgData.mode !== 'PER_CONTENT') {
        throw new Error(`Expected PER_CONTENT, got ${cfgData.mode}`);
      }
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 15: Existing wallet balances and purchases remain untouched
    // ------------------------------------------------------------------------
    await runTest(15, 'Existing wallet balances and previous purchases remain untouched and valid', async () => {
      // Verify User 1 wallet balance remains exactly 4000 paise (₹40)
      const walletRes = await db.query('SELECT balance FROM wallets WHERE user_id = ?;', [user1Id]);
      const balance = Number(walletRes.rows[0].balance);
      if (balance !== 4000) {
        throw new Error(`Expected wallet balance to remain 4000 paise (₹40), got ${balance}`);
      }

      // Verify User 1 can still stream the movie purchased in Step 2
      const streamRes = await fetch(`${baseUrl}/api/media/content/${testMovieId}?type=MAIN`, {
        headers: { 'Authorization': `Bearer ${user1Token}` }
      });
      if (!streamRes.ok) {
        throw new Error(`Stream for previously purchased movie failed with status ${streamRes.status}`);
      }
      const streamData = await streamRes.json();
      if (!streamData.url || !streamData.authorized) throw new Error('Expected authorized stream response for purchased movie');

      // Verify unpurchased movie still requires purchase in PER_CONTENT mode
      const unpurchasedRes = await fetch(`${baseUrl}/api/media/content/${testUnpurchasedMovieId}?type=MAIN`, {
        headers: { 'Authorization': `Bearer ${user1Token}` }
      });
      if (unpurchasedRes.status !== 403) {
        throw new Error(`Expected 403 for unpurchased movie in PER_CONTENT, got ${unpurchasedRes.status}`);
      }
      const err = await unpurchasedRes.json();
      const code = err.code || err.error?.code;
      if (code !== 'PURCHASE_REQUIRED') {
        throw new Error(`Expected PURCHASE_REQUIRED code, got ${code}`);
      }
    });

    // ------------------------------------------------------------------------
    // CHECKLIST 16: Future Gateway Interface Test
    // ------------------------------------------------------------------------
    await runTest(16, 'Future Payment Gateway direct activation service functions cleanly without manual approval', async () => {
      // Create a new pending subscription
      const gatewayOrderRef = `GTWORDER${Date.now()}`;
      const gatewayTxnRef = `GTWTXN${Date.now()}`;

      const subRes = await fetch(`${baseUrl}/api/subscriptions/submit-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user2Token}`
        },
        body: JSON.stringify({ plan: 'YEARLY', paymentReference: gatewayOrderRef })
      });
      const subData = await subRes.json();
      if (!subData.subscription?.id) {
        throw new Error(`Failed to create gateway subscription request: ${JSON.stringify(subData)}`);
      }
      const newSubId = subData.subscription.id;

      // Simulate a future payment gateway webhook (e.g. Razorpay/Stripe) calling subscriptionService.activateSubscription directly
      const { subscriptionService } = await import('../services/subscriptionService.js');
      const activated = await subscriptionService.activateSubscription(newSubId, {
        paymentReference: gatewayTxnRef,
        method: 'GATEWAY',
        adminNote: 'Auto-activated via Payment Gateway Webhook'
      });

      if (activated.status !== 'ACTIVE') {
        throw new Error(`Expected status ACTIVE from gateway activation, got ${activated.status}`);
      }

      // Check User 2 status
      const res = await fetch(`${baseUrl}/api/subscriptions/my-status`, {
        headers: { 'Authorization': `Bearer ${user2Token}` }
      });
      const data = await res.json();
      if (data.has_active !== true || data.active?.plan !== 'YEARLY') {
        throw new Error('User 2 was not activated by the gateway activation method');
      }
    });

  } finally {
    server.close();
  }

  // Summary Report
  console.log('\n========================================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('========================================================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`Total Checks: ${results.length}`);
  console.log(`Passed:       ${passedCount}`);
  console.log(`Failed:       ${failedCount}`);

  if (failedCount > 0) {
    console.error('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.error(`  - Check ${r.step}: ${r.name} (${r.error})`);
    });
    process.exit(1);
  } else {
    console.log('\nALL 16 ACCEPTANCE REQUIREMENTS VERIFIED SUCCESSFULLY!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

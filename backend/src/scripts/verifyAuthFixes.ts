import { adminAccountService } from '../services/adminAccountService.js';
import { authService } from '../services/authService.js';
import { getAdapter } from '../db/adapter.js';
import { config } from '../config/env.js';

async function verify() {
  console.log('=== FLOPSHOW AUTHENTICATION & SINGLE ADMIN VERIFICATION ===');

  // 1. Verify single active admin account
  const audit = await adminAccountService.ensureSingleAdminAccount();
  console.log(`[TEST 1] Single Admin Guarantee:`);
  console.log(`- Canonical Admin ID: ${audit.canonicalAdminId}`);
  console.log(`- Canonical Admin Email: ${audit.adminEmail}`);
  console.log(`- Total Admins in DB: ${audit.totalAdminsNow}`);
  if (audit.totalAdminsNow !== 1) {
    throw new Error(`Expected exactly 1 administrator in DB, found ${audit.totalAdminsNow}`);
  }
  console.log('✓ PASS: Exactly 1 administrator account exists.');

  // 2. Verify admin login
  const adminId = config.adminId;
  const adminPassword = config.adminPassword;
  const loginRes = await authService.adminLogin({
    adminId,
    adminPassword
  });
  console.log(`[TEST 2] Admin Login:`);
  console.log(`- User ID: ${loginRes.user.id}`);
  console.log(`- Role: ${loginRes.user.role}`);
  console.log(`- Token generated: ${Boolean(loginRes.token)}`);
  if (loginRes.user.role !== 'ADMIN') {
    throw new Error('Admin login did not yield ADMIN role');
  }
  console.log('✓ PASS: Admin login successful with proper ADMIN role.');

  // 3. Verify token verification & session payload
  const tokenPayload = authService.verifyToken(loginRes.token);
  console.log(`[TEST 3] Token Verification:`);
  console.log(`- Payload ID: ${tokenPayload.id}`);
  console.log(`- Payload Role: ${tokenPayload.role}`);
  if (tokenPayload.role !== 'ADMIN') {
    throw new Error('Token verification failed for admin token');
  }
  console.log('✓ PASS: Token verified cryptographically.');

  // 4. Verify getUserProfile resolves correctly
  const profile = await authService.getUserProfile(tokenPayload.id);
  console.log(`[TEST 4] Admin User Profile:`);
  console.log(`- Name: ${profile?.name}`);
  console.log(`- Email: ${profile?.email}`);
  console.log(`- Status: ${profile?.status}`);
  if (!profile || profile.role !== 'ADMIN') {
    throw new Error('getUserProfile failed to return ADMIN profile');
  }
  console.log('✓ PASS: Admin profile retrieved correctly.');

  // 5. Verify invalid password rejection (genuine 401)
  try {
    await authService.adminLogin({
      adminId,
      adminPassword: 'WrongPassword123!'
    });
    throw new Error('Expected invalid credentials to throw 401');
  } catch (err: any) {
    if (err.statusCode !== 401) {
      throw new Error(`Expected statusCode 401, got ${err.statusCode}`);
    }
    console.log('✓ PASS: Invalid credentials correctly return 401 Unauthorized.');
  }

  console.log('\n=== ALL 5 AUTHENTICATION CHECKS PASSED SUCCESSFULLY ===');
  process.exit(0);
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

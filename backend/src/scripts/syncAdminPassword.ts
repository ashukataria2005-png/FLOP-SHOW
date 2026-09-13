import { getAdapter } from '../db/adapter.js';
import { config } from '../config/env.js';
import { authService } from '../services/authService.js';
import bcrypt from 'bcryptjs';

async function main() {
  const db = getAdapter();
  const adminEmail = config.devAdminEmail.toLowerCase().trim();
  const adminPassword = config.devAdminPassword;

  if (!adminPassword) {
    throw new Error('DEV_ADMIN_PASSWORD is empty in configuration.');
  }

  console.log(`Syncing password for admin email: ${adminEmail}`);
  console.log(`Password length: ${adminPassword.length} chars`);

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(adminPassword, salt);
  const now = new Date().toISOString();

  // Check if admin exists
  const { rows: existingRows } = await db.query(
    'SELECT id, email, role, status FROM users WHERE email = ?',
    [adminEmail]
  );
  const existing = existingRows[0] as any;

  if (existing) {
    console.log(`Updating existing admin account (ID: ${existing.id}, Role: ${existing.role})...`);
    await db.run(
      `UPDATE users SET password_hash = ?, role = 'ADMIN', status = 'ACTIVE', updated_at = ? WHERE email = ?;`,
      [newHash, now, adminEmail]
    );
  } else {
    console.log('Admin account not found in database, creating admin-dev-01...');
    await db.run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVE', ?, ?);`,
      ['admin-dev-01', 'FLOPSHOW System Admin', adminEmail, newHash, now, now]
    );

    await db.run(
      `INSERT INTO wallets (user_id, balance, updated_at)
       VALUES (?, 0, ?)
       ON CONFLICT (user_id) DO NOTHING;`,
      ['admin-dev-01', now]
    );
  }

  // Verify directly with bcrypt
  const { rows: verifyRows } = await db.query(
    'SELECT id, email, role, status, password_hash FROM users WHERE email = ?',
    [adminEmail]
  );
  const updatedUser = verifyRows[0] as any;
  const isMatch = bcrypt.compareSync(adminPassword, updatedUser.password_hash);
  console.log('Verification 1: Direct bcrypt match:', isMatch);

  if (!isMatch) {
    throw new Error('Password hash failed direct bcrypt match!');
  }

  // Verification 2: Verify via full authService.login() flow
  const loginResult = await authService.login({
    email: adminEmail,
    password: adminPassword,
  });

  console.log('Verification 2: authService.login() succeeded!');
  console.log('Authenticated User:', loginResult.user);
  console.log('Issued Admin JWT Token:', loginResult.token.slice(0, 25) + '...');
}

main().catch(err => {
  console.error('Failed to sync admin password:', err);
  process.exit(1);
});

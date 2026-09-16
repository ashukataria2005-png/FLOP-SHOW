import { getAdapter } from '../db/adapter.js';

async function main() {
  const db = getAdapter();
  const now = new Date().toISOString();

  console.log('1. Inspecting current users...');
  const { rows: allUsers } = await db.query('SELECT id, name, email, role, status FROM users');
  console.log(`Found ${allUsers.length} users in DB.`);

  // Identify Ashu Kataria account
  const ashu = (allUsers as any[]).find(u => u.email.toLowerCase() === 'ashukataria2005@gmail.com');
  if (ashu) {
    console.log(`Setting intended admin account ${ashu.email} (${ashu.id}) to ADMIN role...`);
    await db.run(
      'UPDATE users SET role = ?, status = ?, updated_at = ? WHERE id = ?',
      ['ADMIN', 'ACTIVE', now, ashu.id]
    );
  } else {
    console.warn('Ashu Kataria account not found by email ashukataria2005@gmail.com!');
  }

  // Remove unwanted "FlopShow TV" administrator account (admin@flopshow.tv / admin-dev-01)
  console.log('2. Removing unwanted "FlopShow TV" administrator account...');
  await db.run('DELETE FROM wallets WHERE user_id = ?', ['admin-dev-01']);
  await db.run('DELETE FROM users WHERE id = ? OR email = ?', ['admin-dev-01', 'admin@flopshow.tv']);

  // Remove demo user (demo@flopshow.tv / user-demo-01)
  console.log('3. Removing demo user account (demo@flopshow.tv)...');
  await db.run('DELETE FROM wallets WHERE user_id = ?', ['user-demo-01']);
  await db.run('DELETE FROM users WHERE id = ? OR email = ?', ['user-demo-01', 'demo@flopshow.tv']);

  // Clean up transient test accounts (tester_... and poor_...) created by automated test scripts
  console.log('4. Cleaning up transient test accounts created by old test scripts...');
  const { rows: testUsers } = await db.query(
    "SELECT id, email FROM users WHERE email LIKE 'tester_%@flopshow.test' OR email LIKE 'poor_%@flopshow.test' OR email LIKE 'verify_%@test.com' OR email LIKE 'verifyuser%@test.com'"
  );
  console.log(`Found ${testUsers.length} transient test accounts to clean.`);
  for (const tu of testUsers as any[]) {
    await db.run('DELETE FROM wallets WHERE user_id = ?', [tu.id]);
    await db.run('DELETE FROM users WHERE id = ?', [tu.id]);
  }

  // Verify final user state
  console.log('5. Verifying final users in database:');
  const { rows: finalUsers } = await db.query(
    'SELECT u.id, u.name, u.email, u.role, u.status, w.balance FROM users u LEFT JOIN wallets w ON u.id = w.user_id ORDER BY u.created_at ASC'
  );
  for (const u of finalUsers as any[]) {
    console.log(`User: ${u.id} | Name: "${u.name}" | Email: ${u.email} | Role: ${u.role} | Status: ${u.status} | Balance: ₹${((u.balance || 0) / 100).toFixed(2)}`);
  }

  console.log('Admin account cleanup completed successfully.');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});

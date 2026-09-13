import { getAdapter } from '../db/adapter.js';
import { config } from '../config/env.js';
import bcrypt from 'bcryptjs';

async function main() {
  const db = getAdapter();
  const { rows: users } = await db.query(
    'SELECT id, name, email, role, status, password_hash FROM users'
  );

  console.log('Total users in DB:', users.length);
  for (const u of users as any[]) {
    console.log(`User ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Status: ${u.status}`);
    if (u.email.toLowerCase() === config.devAdminEmail.toLowerCase()) {
      console.log('Admin account found!');
      const matchesConfig = bcrypt.compareSync(config.devAdminPassword, u.password_hash);
      console.log('Password matches current DEV_ADMIN_PASSWORD:', matchesConfig);
    }
  }
}

main().catch(err => {
  console.error('checkAdmin failed:', err);
  process.exit(1);
});

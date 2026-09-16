import { getAdapter } from '../db/adapter.js';
import { config } from '../config/env.js';
import bcrypt from 'bcryptjs';

async function main() {
  const db = getAdapter();
  const { rows: users } = await db.query(
    'SELECT id, name, email, role, status, password_hash FROM users'
  );

  for (const u of users as any[]) {
    if (u.email.includes('ashu')) {
      const match2005 = bcrypt.compareSync('Kataria2005#', u.password_hash);
      console.log(`User: ${u.email} | Match Kataria2005#: ${match2005}`);
    }
  }
}

main().catch(err => {
  console.error('checkAdmin failed:', err);
  process.exit(1);
});

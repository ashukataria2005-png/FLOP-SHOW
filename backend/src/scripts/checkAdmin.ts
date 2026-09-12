import { getDatabase } from '../db/connection.js';
import { config } from '../config/env.js';
import bcrypt from 'bcryptjs';

const db = getDatabase();
const users = db.prepare('SELECT id, name, email, role, status, password_hash FROM users').all() as any[];

console.log('Total users in DB:', users.length);
for (const u of users) {
  console.log(`User ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Status: ${u.status}`);
  if (u.email.toLowerCase() === config.devAdminEmail.toLowerCase()) {
    console.log('Admin account found!');
    const matchesConfig = bcrypt.compareSync(config.devAdminPassword, u.password_hash);
    console.log('Password matches current DEV_ADMIN_PASSWORD:', matchesConfig);
  }
}

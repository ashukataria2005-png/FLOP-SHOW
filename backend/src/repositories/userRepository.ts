import { getDatabase } from '../db/connection.js';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  created_at: string;
  updated_at: string;
}

export const userRepository = {
  create(user: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role?: 'USER' | 'ADMIN';
    status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
    now: string;
  }): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, role, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      user.id,
      user.name,
      user.email.toLowerCase().trim(),
      user.passwordHash,
      user.role || 'USER',
      user.status || 'ACTIVE',
      user.now,
      user.now
    );
  },

  findByEmail(email: string): UserRecord | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM users WHERE email = ? COLLATE NOCASE;
    `);
    const row = stmt.get(email.toLowerCase().trim()) as UserRecord | undefined;
    return row || null;
  },

  findById(id: string): UserRecord | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM users WHERE id = ?;
    `);
    const row = stmt.get(id) as UserRecord | undefined;
    return row || null;
  },

  updateProfile(id: string, name: string, now: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE users
      SET name = ?, updated_at = ?
      WHERE id = ?;
    `);
    stmt.run(name, now, id);
  }
};

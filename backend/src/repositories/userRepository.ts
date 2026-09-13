import { getAdapter } from '../db/adapter.js';

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
  async create(user: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role?: 'USER' | 'ADMIN';
    status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
    now: string;
  }): Promise<void> {
    const db = getAdapter();
    await db.run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        user.id,
        user.name,
        user.email.toLowerCase().trim(),
        user.passwordHash,
        user.role || 'USER',
        user.status || 'ACTIVE',
        user.now,
        user.now,
      ]
    );
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    const db = getAdapter();
    // COLLATE NOCASE is SQLite-specific; on PostgreSQL, email is CITEXT (case-insensitive already)
    const { rows } = await db.query(
      `SELECT * FROM users WHERE email = ?;`,
      [email.toLowerCase().trim()]
    );
    return (rows[0] as UserRecord) || null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    const db = getAdapter();
    const { rows } = await db.query(`SELECT * FROM users WHERE id = ?;`, [id]);
    return (rows[0] as UserRecord) || null;
  },

  async updateProfile(id: string, name: string, now: string): Promise<void> {
    const db = getAdapter();
    await db.run(
      `UPDATE users SET name = ?, updated_at = ? WHERE id = ?;`,
      [name, now, id]
    );
  },
};

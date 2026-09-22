import { getAdapter } from '../db/adapter.js';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  is_super_admin?: number | boolean;
  permissions?: string;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const userRepository = {
  async create(user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    passwordHash: string;
    role?: 'USER' | 'ADMIN';
    status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
    now: string;
  }): Promise<void> {
    const db = getAdapter();
    await db.run(
      `INSERT INTO users (id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        user.id,
        user.name,
        user.email.toLowerCase().trim(),
        user.phone ? user.phone.trim() : null,
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
    const { rows } = await db.query(
      `SELECT * FROM users WHERE email = ?;`,
      [email.toLowerCase().trim()]
    );
    return (rows[0] as UserRecord) || null;
  },

  async findByPhone(phone: string): Promise<UserRecord | null> {
    const db = getAdapter();
    const clean = phone.replace(/[^0-9]/g, '');
    const { rows } = await db.query(
      `SELECT * FROM users WHERE phone = ? OR phone = ?;`,
      [clean, `+91${clean}`]
    );
    return (rows[0] as UserRecord) || null;
  },

  async findByEmailOrPhone(identifier: string): Promise<UserRecord | null> {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return this.findByEmail(trimmed);
    }
    const cleanPhone = trimmed.replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 10) {
      const byPhone = await this.findByPhone(cleanPhone);
      if (byPhone) return byPhone;
      // also check synthetic email for mobile signup
      return this.findByEmail(`${cleanPhone}@flopshow.user`);
    }
    return this.findByEmail(trimmed);
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

  async updateProfileAndEmail(id: string, name: string, email: string, now: string): Promise<void> {
    const db = getAdapter();
    await db.run(
      `UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?;`,
      [name, email.toLowerCase().trim(), now, id]
    );
  },

  async updatePassword(id: string, passwordHash: string, now: string): Promise<void> {
    const db = getAdapter();
    await db.run(
      `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?;`,
      [passwordHash, now, id]
    );
  },

  async updateLastLogin(id: string, now: string): Promise<void> {
    const db = getAdapter();
    await db.run(
      `UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?;`,
      [now, now, id]
    );
  },

  async listAdmins(): Promise<UserRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT id, name, email, phone, password_hash, role, status, is_super_admin, permissions, last_login_at, created_at, updated_at
       FROM users
       WHERE role = 'ADMIN'
       ORDER BY is_super_admin DESC, created_at ASC;`
    );
    return rows as UserRecord[];
  },

  async createAdmin(admin: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    isSuperAdmin?: boolean;
    permissions: string[];
    status?: 'ACTIVE' | 'SUSPENDED';
    now: string;
  }): Promise<void> {
    const db = getAdapter();
    const permString = JSON.stringify(admin.permissions || []);
    await db.run(
      `INSERT INTO users (id, name, email, password_hash, role, status, is_super_admin, permissions, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ADMIN', ?, ?, ?, ?, ?);`,
      [
        admin.id,
        admin.name,
        admin.email.toLowerCase().trim(),
        admin.passwordHash,
        admin.status || 'ACTIVE',
        admin.isSuperAdmin ? 1 : 0,
        permString,
        admin.now,
        admin.now,
      ]
    );
  },

  async updateAdmin(
    id: string,
    updates: {
      name?: string;
      permissions?: string[];
      passwordHash?: string;
      status?: 'ACTIVE' | 'SUSPENDED';
      now: string;
    }
  ): Promise<void> {
    const db = getAdapter();
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [updates.now];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name.trim());
    }
    if (updates.permissions !== undefined) {
      sets.push('permissions = ?');
      params.push(JSON.stringify(updates.permissions));
    }
    if (updates.passwordHash !== undefined) {
      sets.push('password_hash = ?');
      params.push(updates.passwordHash);
    }
    if (updates.status !== undefined) {
      sets.push('status = ?');
      params.push(updates.status);
    }

    params.push(id);
    await db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?;`, params);
  },

  async setAdminStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', now: string): Promise<void> {
    const db = getAdapter();
    await db.run(
      `UPDATE users SET status = ?, updated_at = ? WHERE id = ?;`,
      [status, now, id]
    );
  },

  async deleteAdmin(id: string): Promise<void> {
    const db = getAdapter();
    await db.run('DELETE FROM wallets WHERE user_id = ?;', [id]);
    await db.run('DELETE FROM users WHERE id = ?;', [id]);
  },
};


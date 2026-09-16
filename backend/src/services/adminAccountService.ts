import bcrypt from 'bcryptjs';
import { getAdapter } from '../db/adapter.js';
import { config } from '../config/env.js';

export interface AdminCleanupResult {
  canonicalAdminId: string;
  adminEmail: string;
  cleanedCount: number;
  totalAdminsNow: number;
}

/**
 * Service to ensure that exactly ONE intended administrator account is active in the database.
 * Detects any extra, duplicate, or rogue administrator accounts and safely neutralizes them
 * (demotes role to 'USER' or cleans obsolete dev accounts) so only the official administrator
 * account exists.
 */
export const adminAccountService = {
  async ensureSingleAdminAccount(): Promise<AdminCleanupResult> {
    const db = getAdapter();
    const now = new Date().toISOString();
    const adminEmail = (config.devAdminEmail || 'admin@flopshow.tv').toLowerCase().trim();

    // Hash the configured admin password
    const passwordToHash = config.adminPassword || config.devAdminPassword || 'Kataria2005#';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordToHash, salt);

    // 1. Check if an admin account with this email already exists
    const { rows: existingRows } = await db.query(
      'SELECT id, email, role, status FROM users WHERE email = ?;',
      [adminEmail]
    );

    let canonicalAdminId = 'admin-dev-01';

    if (existingRows.length > 0) {
      const existing = existingRows[0] as any;
      canonicalAdminId = existing.id;
      // Ensure role is ADMIN, status is ACTIVE, and password hash is synchronized
      await db.run(
        `UPDATE users SET name = 'FLOPSHOW Admin', role = 'ADMIN', status = 'ACTIVE', password_hash = ?, updated_at = ? WHERE id = ?;`,
        [passwordHash, now, canonicalAdminId]
      );
    } else {
      // Check if admin-dev-01 exists by ID
      const { rows: idRows } = await db.query(
        'SELECT id FROM users WHERE id = ?;',
        ['admin-dev-01']
      );
      if (idRows.length > 0) {
        canonicalAdminId = 'admin-dev-01';
        await db.run(
          `UPDATE users SET email = ?, name = 'FLOPSHOW Admin', role = 'ADMIN', status = 'ACTIVE', password_hash = ?, updated_at = ? WHERE id = ?;`,
          [adminEmail, passwordHash, now, canonicalAdminId]
        );
      } else {
        // Create the admin account
        canonicalAdminId = 'admin-dev-01';
        await db.run(
          `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
           VALUES (?, 'FLOPSHOW Admin', ?, ?, 'ADMIN', 'ACTIVE', ?, ?);`,
          [canonicalAdminId, adminEmail, passwordHash, now, now]
        );
      }
    }

    // Ensure wallet exists for canonical admin
    await db.run(
      `INSERT INTO wallets (user_id, balance, updated_at)
       VALUES (?, 0, ?)
       ON CONFLICT (user_id) DO NOTHING;`,
      [canonicalAdminId, now]
    );

    // 2. Safe cleanup: Find all accounts where role = 'ADMIN' that are NOT the canonical admin
    const { rows: otherAdmins } = await db.query(
      `SELECT id, email FROM users WHERE role = 'ADMIN' AND id != ? AND email != ?;`,
      [canonicalAdminId, adminEmail]
    );

    let cleanedCount = 0;
    for (const other of otherAdmins as any[]) {
      console.log(`[Admin Audit] Demoting unauthorized/extra admin account: ${other.id} (${other.email}) to USER`);
      await db.run(
        `UPDATE users SET role = 'USER', updated_at = ? WHERE id = ?;`,
        [now, other.id]
      );
      cleanedCount++;
    }

    // 3. Verify final admin count
    const { rows: finalAdmins } = await db.query(
      `SELECT id, email, role, status FROM users WHERE role = 'ADMIN';`
    );

    return {
      canonicalAdminId,
      adminEmail,
      cleanedCount,
      totalAdminsNow: finalAdmins.length
    };
  }
};

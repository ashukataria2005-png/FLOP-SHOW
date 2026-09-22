import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getAdapter } from '../db/adapter.js';
import { config } from '../config/env.js';

export interface AdminCleanupResult {
  canonicalAdminId: string;
  adminEmail: string;
  cleanedCount: number;
  totalAdminsNow: number;
}

/**
 * Service to ensure that exactly the intended administrator account is active in the database.
 * Preserves the real administrator account (Ashu Kataria), removes any unwanted "FlopShow TV"
 * or dev admin accounts, and prevents automatic seeding of dummy accounts.
 */
export const adminAccountService = {
  async ensureSingleAdminAccount(): Promise<AdminCleanupResult> {
    const db = getAdapter();
    const now = new Date().toISOString();
    const targetAdminEmail = 'ashukataria2005@gmail.com';

    // 1. Permanently and forcefully remove all dummy, seeded, or test admin records
    const unwantedEmails = [
      'admin',
      'test_admin',
      'demo_admin',
      'admin@flopshow.tv',
      'demo@flopshow.tv',
      'admin@flopshow.com',
      'demo@flopshow.com',
      'test_admin@flopshow.com',
      'admin@test.com'
    ];
    const unwantedIds = ['admin', 'test_admin', 'demo_admin', 'admin-dev-01', 'user-demo-01'];

    for (const uId of unwantedIds) {
      await db.run('DELETE FROM wallets WHERE user_id = ?;', [uId]);
      await db.run('DELETE FROM users WHERE id = ?;', [uId]);
    }

    for (const uEmail of unwantedEmails) {
      if (uEmail.toLowerCase() === targetAdminEmail) continue;
      await db.run(
        `DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = ?);`,
        [uEmail]
      );
      await db.run('DELETE FROM users WHERE LOWER(email) = ?;', [uEmail]);
    }

    // Forcefully PURGE the dummy/test admin accounts created during hotfixes (e.g. test_admin_*, admin-test-*)
    await db.run(
      `DELETE FROM wallets WHERE user_id IN (
        SELECT id FROM users 
        WHERE (
          LOWER(email) LIKE '%test_admin%' 
          OR LOWER(email) LIKE '%admin@test%' 
          OR id LIKE 'admin-test-%'
          OR (role = 'ADMIN' AND LOWER(name) IN ('admin', 'test admin', 'demo admin', 'test_admin', 'demo_admin'))
        )
        AND LOWER(email) != ?
      );`,
      [targetAdminEmail]
    );

    await db.run(
      `DELETE FROM users 
       WHERE (
         LOWER(email) LIKE '%test_admin%' 
         OR LOWER(email) LIKE '%admin@test%' 
         OR id LIKE 'admin-test-%'
         OR (role = 'ADMIN' AND LOWER(name) IN ('admin', 'test admin', 'demo admin', 'test_admin', 'demo_admin'))
       )
       AND LOWER(email) != ?;`,
      [targetAdminEmail]
    );

    // 2. Remove is_super_admin flag from ALL other accounts.
    // ONLY ashukataria2005@gmail.com is the immutable Super Admin.
    await db.run(
      `UPDATE users 
       SET is_super_admin = 0 
       WHERE LOWER(email) != ?;`,
      [targetAdminEmail]
    );

    // 3. Check if the canonical Super Admin record already exists
    const { rows: existingRows } = await db.query(
      'SELECT id, name, email, role, status, is_super_admin, password_hash FROM users WHERE LOWER(email) = ?;',
      [targetAdminEmail]
    );

    let canonicalAdminId = '';
    const adminEmail = targetAdminEmail;

    if (existingRows.length > 0) {
      // Record exists — force-update to correct state with wildcard ["*"] permissions
      const existing = existingRows[0] as any;
      canonicalAdminId = existing.id;

      console.log(`[AdminAccountService] Super Admin found (id=${canonicalAdminId}). Reinforcing exclusive status, role, wildcard permissions...`);

      await db.run(
        `UPDATE users 
         SET status = 'ACTIVE', 
             is_super_admin = 1, 
             role = 'ADMIN',
             permissions = '["*"]',
             updated_at = ?
         WHERE LOWER(email) = ?;`,
        [now, targetAdminEmail]
      );

      console.log(`[AdminAccountService] ✓ Super Admin reinforced: status=ACTIVE, is_super_admin=1, permissions=["*"].`);
    } else {
      // Record does NOT exist — create it with a bcrypt-hashed password from env config
      console.log(`[AdminAccountService] Super Admin NOT found in DB. Creating fresh account...`);

      const rawPassword = config.adminPassword || 'Kataria2005#';
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(rawPassword, salt);
      canonicalAdminId = `admin-${crypto.randomUUID()}`;

      await db.run(
        `INSERT INTO users 
           (id, name, email, phone, password_hash, role, status, is_super_admin, permissions, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, 'ADMIN', 'ACTIVE', 1, '["*"]', ?, ?);`,
        [
          canonicalAdminId,
          'Ashu Kataria',
          targetAdminEmail,
          passwordHash,
          now,
          now,
        ]
      );

      console.log(`[AdminAccountService] ✓ Super Admin created (id=${canonicalAdminId}) with bcrypt-hashed env password and wildcard permissions.`);
    }

    // 4. Verify final admin count
    const { rows: finalAdmins } = await db.query(
      `SELECT id, email, role, is_super_admin, status FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE';`
    );

    console.log(`[AdminAccountService] Final active admin count: ${finalAdmins.length}`);
    finalAdmins.forEach((a: any) => {
      console.log(`  - [${a.id}] ${a.email} (${a.role}, is_super=${a.is_super_admin}, status=${a.status})`);
    });

    return {
      canonicalAdminId,
      adminEmail,
      cleanedCount: 0,
      totalAdminsNow: finalAdmins.length
    };
  }
};


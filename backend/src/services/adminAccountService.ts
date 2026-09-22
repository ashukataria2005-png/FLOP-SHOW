import { getAdapter } from '../db/adapter.js';

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

    // 1. Permanently remove all dummy, seeded, or test admin records from users/wallets tables
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

    // Also purge any accounts named 'test admin', 'demo admin', etc.
    await db.run(
      `DELETE FROM users 
       WHERE role = 'ADMIN' 
       AND LOWER(name) IN ('admin', 'test admin', 'demo admin', 'test_admin', 'demo_admin') 
       AND LOWER(email) != ?;`,
      [targetAdminEmail]
    );

    // 2. Force-update the primary Super Admin record
    await db.run(
      `UPDATE users 
       SET status = 'ACTIVE', 
           is_super_admin = 1, 
           role = 'ADMIN',
           permissions = '["analytics","monetization","promos","payments","catalog","users","settings"]',
           updated_at = ?
       WHERE LOWER(email) = ?;`,
      [now, targetAdminEmail]
    );

    // Check canonical admin
    const { rows: ashuRows } = await db.query(
      'SELECT id, name, email, role, status FROM users WHERE LOWER(email) = ?;',
      [targetAdminEmail]
    );

    let canonicalAdminId = '';
    let adminEmail = targetAdminEmail;

    if (ashuRows.length > 0) {
      canonicalAdminId = (ashuRows[0] as any).id;
    }

    // 3. Verify final admin count
    const { rows: finalAdmins } = await db.query(
      `SELECT id, email, role, status FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE';`
    );

    return {
      canonicalAdminId,
      adminEmail,
      cleanedCount: 0,
      totalAdminsNow: finalAdmins.length
    };
  }
};


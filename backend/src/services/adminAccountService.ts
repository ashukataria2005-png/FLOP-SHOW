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

    // 1. Check if Ashu Kataria account exists
    const { rows: ashuRows } = await db.query(
      'SELECT id, name, email, role, status FROM users WHERE LOWER(email) = ?;',
      [targetAdminEmail]
    );

    let canonicalAdminId = '';
    let adminEmail = targetAdminEmail;

    if (ashuRows.length > 0) {
      const ashu = ashuRows[0] as any;
      canonicalAdminId = ashu.id;
      adminEmail = ashu.email;
      // Guarantee role is ADMIN and status is ACTIVE
      await db.run(
        `UPDATE users SET role = 'ADMIN', status = 'ACTIVE', updated_at = ? WHERE id = ?;`,
        [now, canonicalAdminId]
      );
    } else {
      // Find any existing active ADMIN
      const { rows: currentAdmins } = await db.query(
        "SELECT id, email FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' LIMIT 1;"
      );
      if (currentAdmins.length > 0) {
        canonicalAdminId = (currentAdmins[0] as any).id;
        adminEmail = (currentAdmins[0] as any).email;
      }
    }

    // 2. Permanently remove the unwanted "FlopShow TV" / dev admin accounts if present
    const unwantedEmails = ['admin@flopshow.tv', 'demo@flopshow.tv'];
    const unwantedIds = ['admin-dev-01', 'user-demo-01'];

    for (const uId of unwantedIds) {
      await db.run('DELETE FROM wallets WHERE user_id = ?;', [uId]);
      await db.run('DELETE FROM users WHERE id = ?;', [uId]);
    }
    for (const uEmail of unwantedEmails) {
      await db.run('DELETE FROM users WHERE LOWER(email) = ?;', [uEmail]);
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


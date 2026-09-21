import { getAdapter } from '../db/adapter.js';
import { purchaseRepository } from '../repositories/purchaseRepository.js';
import crypto from 'crypto';

export interface PromoCodeRecord {
  id: string;
  code: string;
  description: string;
  validity_hours: number;
  status: 'ACTIVE' | 'DISABLED';
  perk_type: string;
  times_used: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  is_expired?: boolean;
  time_remaining_hours?: number;
}

export interface PromoRedemptionRecord {
  id: string;
  promo_code_id: string;
  promo_code: string;
  user_id: string;
  content_id: string;
  redeemed_at: string;
  expires_at: string;
  created_at: string;
  content_title?: string;
  content_poster?: string;
  content_type?: string;
  content_slug?: string;
}

export const promoService = {
  /**
   * Admin: List all promo codes
   */
  async getAllPromoCodesAdmin(): Promise<PromoCodeRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT * FROM promo_codes ORDER BY created_at DESC;`
    );

    const now = Date.now();
    return (rows as any[]).map(promo => {
      let isExpired = false;
      let timeRemainingHours = 0;
      if (promo.expires_at) {
        const expTime = new Date(promo.expires_at).getTime();
        isExpired = expTime <= now;
        timeRemainingHours = Math.max(0, Math.round((expTime - now) / (1000 * 60 * 60)));
      } else if (promo.validity_hours) {
        timeRemainingHours = promo.validity_hours;
      }

      return {
        ...promo,
        is_expired: isExpired,
        time_remaining_hours: timeRemainingHours,
      };
    });
  },

  /**
   * Admin: Create a new promo code
   */
  async createPromoCodeAdmin(params: {
    code: string;
    description?: string;
    validity_days?: number;
    validity_hours?: number;
    expires_at?: string;
  }): Promise<PromoCodeRecord> {
    const db = getAdapter();
    const code = (params.code || '').trim().toUpperCase();

    if (!code || code.length < 3) {
      throw new Error('Promo code must be at least 3 characters long.');
    }

    // Check uniqueness
    const { rows: existing } = await db.query(
      `SELECT id FROM promo_codes WHERE code = ? LIMIT 1;`,
      [code]
    );
    if (existing.length > 0) {
      throw new Error(`Promo code "${code}" already exists.`);
    }

    const now = new Date();
    const nowIso = now.toISOString();

    let totalHours = 720; // default 30 days
    if (params.validity_days && Number(params.validity_days) > 0) {
      totalHours = Math.round(Number(params.validity_days) * 24);
    } else if (params.validity_hours && Number(params.validity_hours) > 0) {
      totalHours = Math.round(Number(params.validity_hours));
    }

    let calculatedExpiresAt: string | null = null;
    if (params.expires_at && !isNaN(new Date(params.expires_at).getTime())) {
      calculatedExpiresAt = new Date(params.expires_at).toISOString();
    } else if (totalHours > 0) {
      calculatedExpiresAt = new Date(now.getTime() + totalHours * 60 * 60 * 1000).toISOString();
    }

    const id = `promo-${crypto.randomUUID()}`;
    const desc = params.description?.trim() || '1-Time Free Access to ANY Movie or Series of your choice.';

    await db.run(
      `INSERT INTO promo_codes (id, code, description, validity_hours, status, perk_type, times_used, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', 'FREE_CONTENT_PASS', 0, ?, ?, ?);`,
      [id, code, desc, totalHours, calculatedExpiresAt, nowIso, nowIso]
    );

    const { rows } = await db.query(`SELECT * FROM promo_codes WHERE id = ?;`, [id]);
    return rows[0] as PromoCodeRecord;
  },

  /**
   * Admin: Toggle status (ACTIVE / DISABLED)
   */
  async setPromoStatusAdmin(id: string, status: 'ACTIVE' | 'DISABLED'): Promise<PromoCodeRecord> {
    const db = getAdapter();
    const now = new Date().toISOString();
    await db.run(
      `UPDATE promo_codes SET status = ?, updated_at = ? WHERE id = ?;`,
      [status, now, id]
    );
    const { rows } = await db.query(`SELECT * FROM promo_codes WHERE id = ?;`, [id]);
    if (!rows[0]) throw new Error('Promo code not found.');
    return rows[0] as PromoCodeRecord;
  },

  /**
   * Admin: Delete promo code
   */
  async deletePromoCodeAdmin(id: string): Promise<boolean> {
    const db = getAdapter();
    await db.run(`DELETE FROM promo_codes WHERE id = ?;`, [id]);
    return true;
  },

  /**
   * User: Get Promo Hub data (Active, Expired, and Used Promos)
   */
  async getUserPromoHub(userId?: string): Promise<{
    canRedeem: boolean;
    redemptionCount: number;
    activePromos: PromoCodeRecord[];
    expiredPromos: PromoCodeRecord[];
    usedPromos: PromoRedemptionRecord[];
  }> {
    const db = getAdapter();
    const now = Date.now();
    const nowIso = new Date().toISOString();

    // 1. Fetch all promo codes
    const { rows: allPromosRaw } = await db.query(
      `SELECT * FROM promo_codes ORDER BY created_at DESC;`
    );

    const activePromos: PromoCodeRecord[] = [];
    const expiredPromos: PromoCodeRecord[] = [];

    for (const promo of allPromosRaw as any[]) {
      let isExpired = false;
      let timeRemainingHours = 0;
      if (promo.expires_at) {
        const expTime = new Date(promo.expires_at).getTime();
        isExpired = expTime <= now;
        timeRemainingHours = Math.max(0, Math.round((expTime - now) / (1000 * 60 * 60)));
      } else {
        timeRemainingHours = promo.validity_hours || 720;
      }

      const formatted: PromoCodeRecord = {
        ...promo,
        is_expired: isExpired,
        time_remaining_hours: timeRemainingHours,
      };

      if (promo.status === 'ACTIVE' && !isExpired) {
        activePromos.push(formatted);
      } else {
        expiredPromos.push(formatted);
      }
    }

    // 2. Fetch User Redemptions if logged in
    let usedPromos: PromoRedemptionRecord[] = [];
    let redemptionCount = 0;

    if (userId) {
      const { rows: userRedemptions } = await db.query(
        `SELECT r.id, r.promo_code_id, r.promo_code, r.user_id, r.content_id, r.redeemed_at, r.expires_at, r.created_at,
                c.title as content_title, c.poster as content_poster, c.type as content_type, c.slug as content_slug
         FROM promo_redemptions r
         LEFT JOIN content c ON r.content_id = c.id
         WHERE r.user_id = ?
         ORDER BY r.redeemed_at DESC;`,
        [userId]
      );
      usedPromos = userRedemptions as PromoRedemptionRecord[];
      redemptionCount = usedPromos.length;
    }

    // Restriction: Strictly 1-time use per new user account
    const canRedeem = redemptionCount === 0;

    return {
      canRedeem,
      redemptionCount,
      activePromos,
      expiredPromos,
      usedPromos,
    };
  },

  /**
   * User: Redeem Promo Code for 1 free Movie or Web Series
   */
  async redeemPromoCode(userId: string, codeInput: string, contentId: string): Promise<{
    success: boolean;
    message: string;
    unlockedTitle: string;
    expiresAt: string;
    redemption: PromoRedemptionRecord;
  }> {
    if (!userId) {
      throw new Error('User authentication required to redeem promo code.');
    }
    const code = (codeInput || '').trim().toUpperCase();
    if (!code) {
      throw new Error('Please enter a valid promo code.');
    }
    if (!contentId) {
      throw new Error('Please select a movie or series to unlock.');
    }

    const db = getAdapter();

    // 1. Restriction check: strictly 1 redemption per user account
    const { rows: priorRedemptions } = await db.query(
      `SELECT id FROM promo_redemptions WHERE user_id = ? LIMIT 1;`,
      [userId]
    );
    if (priorRedemptions.length > 0) {
      throw new Error('Account Welcome Restriction: Each user account is strictly eligible for 1 free promo redemption.');
    }

    // 2. Promo code verification
    const { rows: promoRows } = await db.query(
      `SELECT * FROM promo_codes WHERE code = ? LIMIT 1;`,
      [code]
    );
    if (promoRows.length === 0) {
      throw new Error(`Promo code "${code}" is invalid or does not exist.`);
    }

    const promo = promoRows[0] as any;
    if (promo.status !== 'ACTIVE') {
      throw new Error(`Promo code "${code}" is no longer active.`);
    }

    const now = Date.now();
    if (promo.expires_at && new Date(promo.expires_at).getTime() <= now) {
      throw new Error(`Promo code "${code}" has expired.`);
    }

    // 3. Content verification
    const { rows: contentRows } = await db.query(
      `SELECT id, title, type, poster, slug FROM content WHERE id = ? OR slug = ? LIMIT 1;`,
      [contentId, contentId]
    );
    if (contentRows.length === 0) {
      throw new Error('Selected movie or web series could not be found.');
    }
    const targetContent = contentRows[0] as any;

    // 4. Calculate validity window: 30 days access
    const validityDays = promo.validity_hours ? Math.max(1, Math.round(promo.validity_hours / 24)) : 30;
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    // 5. Grant instant access entitlement via purchaseRepository
    const purchaseId = `promo-grant-${crypto.randomUUID()}`;
    await purchaseRepository.createPurchase({
      id: purchaseId,
      userId,
      contentId: targetContent.id,
      amountPaid: 0,
      status: 'COMPLETED',
      purchasedAt: nowIso,
      expiresAt: expiresAt,
    });

    // 6. Record redemption audit log
    const redemptionId = `redempt-${crypto.randomUUID()}`;
    await db.run(
      `INSERT INTO promo_redemptions (id, promo_code_id, promo_code, user_id, content_id, redeemed_at, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [redemptionId, promo.id, promo.code, userId, targetContent.id, nowIso, expiresAt, nowIso]
    );

    // 7. Increment times_used on promo code
    await db.run(
      `UPDATE promo_codes SET times_used = times_used + 1, updated_at = ? WHERE id = ?;`,
      [nowIso, promo.id]
    );

    const redemptionRecord: PromoRedemptionRecord = {
      id: redemptionId,
      promo_code_id: promo.id,
      promo_code: promo.code,
      user_id: userId,
      content_id: targetContent.id,
      redeemed_at: nowIso,
      expires_at: expiresAt,
      created_at: nowIso,
      content_title: targetContent.title,
      content_poster: targetContent.poster,
      content_type: targetContent.type,
      content_slug: targetContent.slug,
    };

    return {
      success: true,
      message: `Congratulations! "${targetContent.title}" has been unlocked for ${validityDays} days.`,
      unlockedTitle: targetContent.title,
      expiresAt,
      redemption: redemptionRecord,
    };
  },
};

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
  visibility: 'PUBLIC' | 'PRIVATE';
  discount_enabled: boolean;
  discount_percent: number;
  max_uses: number | null;
  is_lifetime: boolean;
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
  content_id: string | null;
  redeemed_at: string;
  expires_at: string;
  created_at: string;
  item_type?: string;
  item_title?: string;
  original_price?: number;
  discount_percent?: number;
  amount_paid?: number;
  status?: string;
  payment_request_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  content_title?: string;
  content_poster?: string;
  content_type?: string;
  content_slug?: string;
}

function formatPromoRecord(promo: any, now: number): PromoCodeRecord {
  const isLifetime = Boolean(promo.is_lifetime);
  let isExpired = false;
  let timeRemainingHours: number | undefined = undefined;

  if (!isLifetime && promo.expires_at) {
    const expTime = new Date(promo.expires_at).getTime();
    isExpired = expTime <= now;
    timeRemainingHours = Math.max(0, Math.round((expTime - now) / (1000 * 60 * 60)));
  } else if (!isLifetime && promo.validity_hours) {
    timeRemainingHours = promo.validity_hours;
  }

  return {
    id: promo.id,
    code: promo.code,
    description: promo.description || '',
    validity_hours: Number(promo.validity_hours || 720),
    status: (promo.status || 'ACTIVE') as 'ACTIVE' | 'DISABLED',
    perk_type: promo.perk_type || (promo.discount_enabled ? 'DISCOUNT' : 'FREE_CONTENT_PASS'),
    times_used: Number(promo.times_used || 0),
    expires_at: promo.expires_at || null,
    visibility: (promo.visibility || 'PUBLIC') as 'PUBLIC' | 'PRIVATE',
    discount_enabled: Boolean(promo.discount_enabled),
    discount_percent: Number(promo.discount_percent || 0),
    max_uses: promo.max_uses !== null && promo.max_uses !== undefined && Number(promo.max_uses) > 0 ? Number(promo.max_uses) : null,
    is_lifetime: isLifetime,
    created_at: promo.created_at,
    updated_at: promo.updated_at,
    is_expired: isExpired,
    time_remaining_hours: timeRemainingHours,
  };
}

export const promoService = {
  /**
   * Admin: List all promo codes (both public and private)
   */
  async getAllPromoCodesAdmin(): Promise<PromoCodeRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT * FROM promo_codes ORDER BY created_at DESC;`
    );

    const now = Date.now();
    return (rows as any[]).map(promo => formatPromoRecord(promo, now));
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
    visibility?: 'PUBLIC' | 'PRIVATE';
    discount_enabled?: boolean | number;
    discount_percent?: number;
    max_uses?: number | null;
    is_lifetime?: boolean | number;
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

    const isLifetime = Boolean(params.is_lifetime);
    let totalHours = 720; // default 30 days
    let calculatedExpiresAt: string | null = null;

    if (isLifetime) {
      totalHours = 0;
      calculatedExpiresAt = null;
    } else {
      if (params.validity_days && Number(params.validity_days) > 0) {
        totalHours = Math.round(Number(params.validity_days) * 24);
      } else if (params.validity_hours && Number(params.validity_hours) > 0) {
        totalHours = Math.round(Number(params.validity_hours));
      }

      if (params.expires_at && !isNaN(new Date(params.expires_at).getTime())) {
        calculatedExpiresAt = new Date(params.expires_at).toISOString();
      } else if (totalHours > 0) {
        calculatedExpiresAt = new Date(now.getTime() + totalHours * 60 * 60 * 1000).toISOString();
      }
    }

    const id = `promo-${crypto.randomUUID()}`;
    const desc = params.description?.trim() || '1-Time Free Access to ANY Movie or Series of your choice.';
    const visibility = params.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
    const discountEnabled = params.discount_enabled ? 1 : 0;
    const discountPercent = discountEnabled ? Math.min(100, Math.max(1, Number(params.discount_percent || 0))) : 0;
    const maxUses = params.max_uses && Number(params.max_uses) > 0 ? Number(params.max_uses) : null;
    const isLifetimeInt = isLifetime ? 1 : 0;
    const perkType = discountEnabled ? 'DISCOUNT' : 'FREE_CONTENT_PASS';

    await db.run(
      `INSERT INTO promo_codes (
        id, code, description, validity_hours, status, perk_type,
        times_used, expires_at, visibility, discount_enabled,
        discount_percent, max_uses, is_lifetime, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, 0, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id, code, desc, totalHours, perkType, calculatedExpiresAt,
        visibility, discountEnabled, discountPercent, maxUses,
        isLifetimeInt, nowIso, nowIso
      ]
    );

    const { rows } = await db.query(`SELECT * FROM promo_codes WHERE id = ?;`, [id]);
    return formatPromoRecord(rows[0], Date.now());
  },

  /**
   * Admin: Update promo code (even if live/active)
   */
  async updatePromoCodeAdmin(id: string, params: {
    code?: string;
    description?: string;
    validity_days?: number;
    validity_hours?: number;
    expires_at?: string | null;
    visibility?: 'PUBLIC' | 'PRIVATE';
    discount_enabled?: boolean | number;
    discount_percent?: number;
    max_uses?: number | null;
    is_lifetime?: boolean | number;
    status?: 'ACTIVE' | 'DISABLED';
  }): Promise<PromoCodeRecord> {
    const db = getAdapter();

    const { rows: existingRows } = await db.query(
      `SELECT * FROM promo_codes WHERE id = ? LIMIT 1;`,
      [id]
    );
    if (!existingRows[0]) {
      throw new Error('Promo code not found.');
    }
    const current = existingRows[0] as any;

    let newCode = current.code;
    if (params.code && params.code.trim().toUpperCase() !== current.code) {
      newCode = params.code.trim().toUpperCase();
      const { rows: dupRows } = await db.query(
        `SELECT id FROM promo_codes WHERE code = ? AND id != ? LIMIT 1;`,
        [newCode, id]
      );
      if (dupRows.length > 0) {
        throw new Error(`Promo code "${newCode}" is already in use.`);
      }
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const isLifetime = params.is_lifetime !== undefined ? Boolean(params.is_lifetime) : Boolean(current.is_lifetime);
    let calculatedExpiresAt = current.expires_at;
    let totalHours = current.validity_hours;

    if (isLifetime) {
      calculatedExpiresAt = null;
      totalHours = 0;
    } else {
      if (params.expires_at !== undefined) {
        calculatedExpiresAt = params.expires_at && !isNaN(new Date(params.expires_at).getTime())
          ? new Date(params.expires_at).toISOString()
          : null;
      }
      if (params.validity_days !== undefined && Number(params.validity_days) > 0) {
        totalHours = Math.round(Number(params.validity_days) * 24);
        if (!params.expires_at) {
          calculatedExpiresAt = new Date(now.getTime() + totalHours * 60 * 60 * 1000).toISOString();
        }
      } else if (params.validity_hours !== undefined && Number(params.validity_hours) > 0) {
        totalHours = Math.round(Number(params.validity_hours));
        if (!params.expires_at) {
          calculatedExpiresAt = new Date(now.getTime() + totalHours * 60 * 60 * 1000).toISOString();
        }
      }
    }

    const desc = params.description !== undefined ? params.description.trim() : current.description;
    const status = params.status !== undefined ? params.status : current.status;
    const visibility = params.visibility !== undefined ? params.visibility : (current.visibility || 'PUBLIC');
    const discountEnabled = params.discount_enabled !== undefined ? (params.discount_enabled ? 1 : 0) : (current.discount_enabled ? 1 : 0);
    const discountPercent = discountEnabled
      ? (params.discount_percent !== undefined ? Math.min(100, Math.max(1, Number(params.discount_percent))) : Number(current.discount_percent || 0))
      : 0;
    const maxUses = params.max_uses !== undefined
      ? (params.max_uses && Number(params.max_uses) > 0 ? Number(params.max_uses) : null)
      : current.max_uses;
    const isLifetimeInt = isLifetime ? 1 : 0;
    const perkType = discountEnabled ? 'DISCOUNT' : 'FREE_CONTENT_PASS';

    await db.run(
      `UPDATE promo_codes SET
        code = ?,
        description = ?,
        validity_hours = ?,
        status = ?,
        perk_type = ?,
        expires_at = ?,
        visibility = ?,
        discount_enabled = ?,
        discount_percent = ?,
        max_uses = ?,
        is_lifetime = ?,
        updated_at = ?
      WHERE id = ?;`,
      [
        newCode, desc, totalHours, status, perkType, calculatedExpiresAt,
        visibility, discountEnabled, discountPercent, maxUses,
        isLifetimeInt, nowIso, id
      ]
    );

    const { rows: updatedRows } = await db.query(`SELECT * FROM promo_codes WHERE id = ?;`, [id]);
    return formatPromoRecord(updatedRows[0], Date.now());
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
    return formatPromoRecord(rows[0], Date.now());
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
   * Note: ONLY public active promos are exposed in activePromos list!
   * Private promos are strictly hidden until typed manually.
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

    // 1. Fetch all promo codes
    const { rows: allPromosRaw } = await db.query(
      `SELECT * FROM promo_codes ORDER BY created_at DESC;`
    );

    const activePromos: PromoCodeRecord[] = [];
    const expiredPromos: PromoCodeRecord[] = [];

    for (const raw of allPromosRaw as any[]) {
      const formatted = formatPromoRecord(raw, now);

      // PUBLIC promos are displayed in the list
      // PRIVATE promos are intentionally omitted from public listing
      if (formatted.visibility === 'PUBLIC') {
        if (formatted.status === 'ACTIVE' && !formatted.is_expired) {
          activePromos.push(formatted);
        } else if (formatted.is_expired) {
          expiredPromos.push(formatted);
        }
      }
    }

    // 2. Fetch User Redemptions if logged in
    let usedPromos: PromoRedemptionRecord[] = [];
    let redemptionCount = 0;

    if (userId) {
      const { rows: userRedemptions } = await db.query(
        `SELECT r.id, r.promo_code_id, r.promo_code, r.user_id, r.content_id, r.redeemed_at, r.expires_at, r.created_at,
                r.item_type, r.item_title, r.original_price, r.discount_percent, r.amount_paid, r.status, r.payment_request_id,
                c.title as content_title, c.poster as content_poster, c.type as content_type, c.slug as content_slug
         FROM promo_redemptions r
         LEFT JOIN content c ON r.content_id = c.id
         WHERE r.user_id = ?
         ORDER BY r.redeemed_at DESC;`,
        [userId]
      );
      usedPromos = userRedemptions as PromoRedemptionRecord[];
      redemptionCount = usedPromos.length;

      // Mark whether user has already claimed each active promo
      const claimedCodeSet = new Set(usedPromos.map(u => (u.promo_code || '').toUpperCase()));
      const claimedIdSet = new Set(usedPromos.map(u => u.promo_code_id));
      for (const p of activePromos) {
        if (claimedCodeSet.has(p.code.toUpperCase()) || claimedIdSet.has(p.id)) {
          (p as any).is_claimed = true;
        }
      }
    }

    // Universal promo redemption: Users can redeem any valid active promo code they haven't claimed yet
    const canRedeem = true;

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
   * Works for both PUBLIC and PRIVATE promo codes.
   * Enforces per-user-per-code check (users can redeem multiple different codes).
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

    // 1. Promo code verification
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

    // 2. Max claim limit check
    if (promo.max_uses !== null && promo.max_uses !== undefined && Number(promo.max_uses) > 0) {
      if (Number(promo.times_used || 0) >= Number(promo.max_uses)) {
        throw new Error('This promo code has reached its maximum claim limit.');
      }
    }

    // 3. Per-user-per-code check: prevent user from reusing the exact same promo code
    const { rows: priorThisCode } = await db.query(
      `SELECT id FROM promo_redemptions WHERE user_id = ? AND (promo_code_id = ? OR UPPER(promo_code) = ?) LIMIT 1;`,
      [userId, promo.id, code]
    );
    if (priorThisCode.length > 0) {
      throw new Error('You have already used this promo code.');
    }

    // 4. Expiration check (lifetime codes never expire)
    const isLifetime = Boolean(promo.is_lifetime);
    const now = Date.now();
    if (!isLifetime && promo.expires_at && new Date(promo.expires_at).getTime() <= now) {
      throw new Error(`Promo code "${code}" has expired.`);
    }

    // 5. Content verification
    const { rows: contentRows } = await db.query(
      `SELECT id, title, type, poster, slug FROM content WHERE id = ? OR slug = ? LIMIT 1;`,
      [contentId, contentId]
    );
    if (contentRows.length === 0) {
      throw new Error('Selected movie or web series could not be found.');
    }
    const targetContent = contentRows[0] as any;

    // 6. Calculate validity window
    const validityDays = isLifetime ? 3650 : (promo.validity_hours ? Math.max(1, Math.round(promo.validity_hours / 24)) : 30);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    // 7. Grant instant access entitlement via purchaseRepository
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

    // 8. Record redemption audit log
    const redemptionId = `redempt-${crypto.randomUUID()}`;
    const origPrice = targetContent.priceRupees ?? (targetContent.price > 0 ? Math.round(targetContent.price / 100) : (targetContent.type === 'SERIES' ? 35 : 30));
    await db.run(
      `INSERT INTO promo_redemptions (
        id, promo_code_id, promo_code, user_id, content_id,
        redeemed_at, expires_at, created_at,
        item_type, item_title, original_price, discount_percent, amount_paid, status, payment_request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        redemptionId,
        promo.id,
        promo.code,
        userId,
        targetContent.id,
        nowIso,
        expiresAt,
        nowIso,
        targetContent.type === 'SERIES' ? 'SERIES' : 'MOVIE',
        targetContent.title,
        origPrice,
        100,
        0,
        'APPROVED',
        null
      ]
    );

    // 9. Increment times_used on promo code & auto-disable if limit reached
    const currentTimesUsed = Number(promo.times_used || 0);
    const newTimesUsed = currentTimesUsed + 1;
    let newStatus = promo.status || 'ACTIVE';
    if (promo.max_uses !== null && promo.max_uses !== undefined && Number(promo.max_uses) > 0) {
      if (newTimesUsed >= Number(promo.max_uses)) {
        newStatus = 'DISABLED';
      }
    }

    await db.run(
      `UPDATE promo_codes SET times_used = ?, status = ?, updated_at = ? WHERE id = ?;`,
      [newTimesUsed, newStatus, nowIso, promo.id]
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
      item_type: targetContent.type === 'SERIES' ? 'SERIES' : 'MOVIE',
      item_title: targetContent.title,
      original_price: origPrice,
      discount_percent: 100,
      amount_paid: 0,
      status: 'APPROVED',
      content_title: targetContent.title,
      content_poster: targetContent.poster,
      content_type: targetContent.type,
      content_slug: targetContent.slug,
    };

    return {
      success: true,
      message: `Congratulations! "${targetContent.title}" has been unlocked ${isLifetime ? 'with Lifetime Access' : `for ${validityDays} days`}!`,
      unlockedTitle: targetContent.title,
      expiresAt,
      redemption: redemptionRecord,
    };
  },

  /**
   * Checkout: Validate promo code and calculate discount
   */
  async validatePromoForCheckout(userId: string | undefined, codeInput: string, originalAmountRupees: number): Promise<{
    valid: boolean;
    code: string;
    description: string;
    discountPercent: number;
    discountAmountRupees: number;
    finalAmountRupees: number;
    isFreePass: boolean;
    discountEnabled?: boolean;
    maxUses?: number | null;
    timesUsed?: number;
    isLifetime?: boolean;
    perkType?: string;
    message: string;
  }> {
    const code = (codeInput || '').trim().toUpperCase();
    if (!code) {
      throw new Error('Please enter a promo code.');
    }

    const db = getAdapter();

    // 1. Fetch code
    const { rows } = await db.query(
      `SELECT * FROM promo_codes WHERE code = ? LIMIT 1;`,
      [code]
    );
    if (rows.length === 0) {
      throw new Error(`Promo code "${code}" is invalid.`);
    }

    const promo = rows[0] as any;
    if (promo.status !== 'ACTIVE') {
      throw new Error(`Promo code "${code}" is no longer active.`);
    }

    // 2. Claim limit check (Requirement 3a)
    if (promo.max_uses !== null && promo.max_uses !== undefined && Number(promo.max_uses) > 0) {
      if (Number(promo.times_used || 0) >= Number(promo.max_uses)) {
        throw new Error('This promo code has reached its maximum claim limit.');
      }
    }

    // 3. If user is logged in, check per-user-per-code check (Requirement 3a)
    if (userId) {
      const { rows: priorThisCode } = await db.query(
        `SELECT id FROM promo_redemptions WHERE user_id = ? AND (promo_code_id = ? OR UPPER(promo_code) = ?) LIMIT 1;`,
        [userId, promo.id, code]
      );
      if (priorThisCode.length > 0) {
        throw new Error('You have already used this promo code.');
      }
    }

    // 4. Expiry
    const isLifetime = Boolean(promo.is_lifetime);
    if (!isLifetime && promo.expires_at && new Date(promo.expires_at).getTime() <= Date.now()) {
      throw new Error(`Promo code "${code}" has expired.`);
    }

    // 5. Calculate discount
    const isDiscount = Boolean(promo.discount_enabled);
    let discountPercent = isDiscount ? Math.min(100, Math.max(1, Number(promo.discount_percent || 0))) : 100;
    let discountAmountRupees = Math.round((originalAmountRupees * discountPercent) / 100);
    let finalAmountRupees = Math.max(0, originalAmountRupees - discountAmountRupees);
    const isFreePass = !isDiscount || discountPercent >= 100;

    return {
      valid: true,
      code: promo.code,
      description: promo.description || '',
      discountPercent,
      discountAmountRupees,
      finalAmountRupees,
      isFreePass,
      discountEnabled: isDiscount,
      maxUses: promo.max_uses,
      timesUsed: promo.times_used,
      isLifetime,
      perkType: promo.perk_type || (isDiscount ? 'DISCOUNT' : 'FREE_CONTENT_PASS'),
      message: isFreePass
        ? `Promo "${promo.code}" applied: 100% Free Access!`
        : `Promo "${promo.code}" applied: ${discountPercent}% discount! Save ₹${discountAmountRupees}.`
    };
  },

  /**
   * Requirement 3b: Admin Approval Trigger
   * When the admin approves a payment request that contains a promo_code:
   * 1. Increment times_used by 1 in promo_codes table.
   * 2. If times_used + 1 >= max_uses, automatically mark the promo code status as DISABLED / EXHAUSTED.
   * 3. Insert a permanent record into promo_redemptions linked to that user and promo ID.
   */
  async applyApprovedPromoRedemption(
    params: {
      paymentRequestId: string;
      userId: string;
      promoCode: string;
      productType: string;
      planName?: string | null;
      originalPriceRupees: number;
      discountPercent: number;
      amountPaidRupees: number;
      contentId?: string | null;
    },
    adapter?: any
  ): Promise<void> {
    const code = (params.promoCode || '').trim().toUpperCase();
    if (!code || !params.userId) return;

    const db = adapter || getAdapter();

    // Idempotency check: Don't duplicate redemption record for this payment request
    const { rows: existingRedemptions } = await db.query(
      `SELECT id FROM promo_redemptions WHERE payment_request_id = ? LIMIT 1;`,
      [params.paymentRequestId]
    );
    if (existingRedemptions && existingRedemptions.length > 0) {
      return;
    }

    const { rows: promoRows } = await db.query(
      `SELECT * FROM promo_codes WHERE UPPER(code) = ? LIMIT 1;`,
      [code]
    );
    if (promoRows.length === 0) return;

    const promo = promoRows[0] as any;
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Increment times_used and auto-disable if max_uses reached
    const currentTimesUsed = Number(promo.times_used || 0);
    const newTimesUsed = currentTimesUsed + 1;
    let newStatus = promo.status || 'ACTIVE';
    if (promo.max_uses !== null && promo.max_uses !== undefined && Number(promo.max_uses) > 0) {
      if (newTimesUsed >= Number(promo.max_uses)) {
        newStatus = 'DISABLED';
      }
    }

    await db.run(
      `UPDATE promo_codes SET times_used = ?, status = ?, updated_at = ? WHERE id = ?;`,
      [newTimesUsed, newStatus, nowIso, promo.id]
    );

    // 2. Calculate redemption expiration
    const isLifetime = Boolean(promo.is_lifetime);
    const validityDays = isLifetime ? 3650 : (promo.validity_hours ? Math.max(1, Math.round(promo.validity_hours / 24)) : 30);
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    const redemptionId = `redempt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const itemType = params.productType || 'MOVIE';
    const itemTitle = params.planName || (itemType === 'SUBSCRIPTION' ? 'VIP Subscription' : itemType === 'WATCH_PASS' ? 'Watch Pass' : 'Movie Pass');

    // 3. Insert permanent redemption record
    await db.run(
      `INSERT INTO promo_redemptions (
        id, promo_code_id, promo_code, user_id, content_id,
        redeemed_at, expires_at, created_at,
        item_type, item_title, original_price, discount_percent, amount_paid,
        status, payment_request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        redemptionId,
        promo.id,
        promo.code,
        params.userId,
        params.contentId || null,
        nowIso,
        expiresAt,
        nowIso,
        itemType,
        itemTitle,
        params.originalPriceRupees,
        params.discountPercent,
        params.amountPaidRupees,
        'APPROVED',
        params.paymentRequestId
      ]
    );
  },

  /**
   * Requirement 4: Admin "Used Promos Audit" Section
   * Returns all promo redemptions across all users with user details, item purchased, discount, amount paid, and timestamp.
   */
  async getAllRedemptionsAdmin(limit = 100): Promise<any[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT r.id, r.promo_code_id, r.promo_code, r.user_id, r.content_id, r.redeemed_at, r.expires_at, r.created_at,
              r.item_type, r.item_title, r.original_price, r.discount_percent, r.amount_paid, r.status, r.payment_request_id,
              u.name as user_name, u.email as user_email, u.phone as user_phone,
              c.title as content_title
       FROM promo_redemptions r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN content c ON r.content_id = c.id
       ORDER BY r.created_at DESC
       LIMIT ?;`,
      [limit]
    );
    return rows;
  },

  /**
   * Helper: Record promo redemption (legacy compatibility)
   */
  async recordPromoRedemption(userId: string, promoCode: string, targetIdOrPlan?: string): Promise<void> {
    const code = (promoCode || '').trim().toUpperCase();
    if (!userId || !code) return;
    await this.applyApprovedPromoRedemption({
      paymentRequestId: `legacy_${Date.now()}`,
      userId,
      promoCode: code,
      productType: targetIdOrPlan && targetIdOrPlan.startsWith('PASS_') ? 'WATCH_PASS' : (targetIdOrPlan && ['MONTHLY', '3_MONTHS', 'YEARLY'].includes(targetIdOrPlan) ? 'SUBSCRIPTION' : 'MOVIE'),
      planName: targetIdOrPlan || 'Promotional Pass',
      originalPriceRupees: 0,
      discountPercent: 100,
      amountPaidRupees: 0,
      contentId: targetIdOrPlan || null
    });
  }
};

import bcrypt from 'bcryptjs';
import { contentRepository, ContentRecord } from '../repositories/contentRepository.js';
import { getAdapter } from '../db/adapter.js';

export interface TodayStats {
  todayRevenueRupees: number;
  todayPurchasesRevenueRupees: number;
  todayUpiRevenueRupees: number;
  todayNewMembersCount: number;
  todayPurchasesCount: number;
  todayUpiApprovedCount: number;
  pendingPaymentRequestsCount: number;
  pendingPaymentAmountRupees: number;
  todayProfitRupees: number;
  profitNote: string;
  calendarDate: string;
  windowStart: string;
  windowEnd: string;
}

export interface AdMediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalMovies: number;
  totalSeries: number;
  totalPublished: number;
  totalUnpublished: number;
  totalPurchases: number;
  totalRevenueRupees: number;
  walletActivity: {
    totalRechargeRupees: number;
    totalTransactions: number;
  };
  accountingResetAt?: string | null;
  todayStats: TodayStats;
  currentTrending1: {
    id: string;
    title: string;
    type: string;
    poster: string;
    backdrop: string;
    priceRupees: number;
    releaseYear: number;
  } | null;
  recentlyAddedContent: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    poster: string;
    priceRupees: number;
    releaseYear: number;
    createdAt: string;
  }>;
  recentPurchases: Array<{
    id: string;
    userName: string;
    userEmail: string;
    contentTitle: string;
    amountRupees: number;
    purchasedAt: string;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  }>;
}

function getDayBounds(clientTzOffsetMinutes?: number) {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (typeof clientTzOffsetMinutes === 'number' && !isNaN(clientTzOffsetMinutes)) {
    // clientTzOffsetMinutes is from Date.prototype.getTimezoneOffset()
    const clientLocalNow = new Date(now.getTime() - clientTzOffsetMinutes * 60 * 1000);
    const y = clientLocalNow.getUTCFullYear();
    const m = clientLocalNow.getUTCMonth();
    const d = clientLocalNow.getUTCDate();
    start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) + clientTzOffsetMinutes * 60 * 1000);
    end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) + clientTzOffsetMinutes * 60 * 1000);
  } else {
    // Fall back to server calendar day
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    calendarDate: `${y}-${m}-${d}`,
  };
}

export const adminService = {
  async getDashboardStats(tzOffsetMinutes?: number): Promise<DashboardStats> {
    const db = getAdapter();
    const { startISO, endISO, calendarDate } = getDayBounds(tzOffsetMinutes);
    const settings = await this.getSettings();
    const resetAt = settings.finance_analytics_reset_at || null;

    const purchasesQuery = resetAt
      ? db.query("SELECT COUNT(*) as c FROM purchases WHERE status = 'COMPLETED' AND purchased_at >= ?", [resetAt])
      : db.query("SELECT COUNT(*) as c FROM purchases WHERE status = 'COMPLETED'");

    const revenueQuery = resetAt
      ? db.query("SELECT COALESCE(SUM(amount_paid), 0) as s FROM purchases WHERE status = 'COMPLETED' AND purchased_at >= ?", [resetAt])
      : db.query("SELECT COALESCE(SUM(amount_paid), 0) as s FROM purchases WHERE status = 'COMPLETED'");

    const rechargeQuery = resetAt
      ? db.query("SELECT COALESCE(SUM(amount), 0) as s FROM wallet_transactions WHERE type = 'RECHARGE' AND created_at >= ?", [resetAt])
      : db.query("SELECT COALESCE(SUM(amount), 0) as s FROM wallet_transactions WHERE type = 'RECHARGE'");

    const txCountQuery = resetAt
      ? db.query("SELECT COUNT(*) as c FROM wallet_transactions WHERE created_at >= ?", [resetAt])
      : db.query("SELECT COUNT(*) as c FROM wallet_transactions");

    const effectiveTodayPurchasesStart = (resetAt && resetAt > startISO) ? resetAt : startISO;
    const effectiveTodayUpiStart = (resetAt && resetAt > startISO) ? resetAt : startISO;

    const [
      { rows: [userCountRow] },
      { rows: [movieCountRow] },
      { rows: [seriesCountRow] },
      { rows: [publishedRow] },
      { rows: [unpublishedRow] },
      { rows: [purchasesRow] },
      { rows: [revenueRow] },
      { rows: [rechargeRow] },
      { rows: [txCountRow] },
      { rows: [todayPurchasesRow] },
      { rows: [todayUpiRow] },
      { rows: [todayUsersRow] },
      { rows: [pendingUpiRow] },
      { rows: trending1Rows },
      { rows: recentlyAddedRows },
      { rows: recentPurchasesRaw },
      { rows: recentUsersRaw },
    ] = await Promise.all([
      db.query("SELECT COUNT(*) as c FROM users WHERE role = 'USER'"),
      db.query("SELECT COUNT(*) as c FROM content WHERE type = 'MOVIE'"),
      db.query("SELECT COUNT(*) as c FROM content WHERE type = 'SERIES'"),
      db.query("SELECT COUNT(*) as c FROM content WHERE status = 'PUBLISHED'"),
      db.query("SELECT COUNT(*) as c FROM content WHERE status != 'PUBLISHED'"),
      purchasesQuery,
      revenueQuery,
      rechargeQuery,
      txCountQuery,
      db.query(
        "SELECT COUNT(*) as c, COALESCE(SUM(amount_paid), 0) as s FROM purchases WHERE status = 'COMPLETED' AND purchased_at >= ? AND purchased_at <= ?",
        [effectiveTodayPurchasesStart, endISO]
      ),
      db.query(
        "SELECT COUNT(*) as c, COALESCE(SUM(amount), 0) as s FROM upi_payment_requests WHERE status = 'APPROVED' AND ((processed_at >= ? AND processed_at <= ?) OR (processed_at IS NULL AND created_at >= ? AND created_at <= ?))",
        [effectiveTodayUpiStart, endISO, effectiveTodayUpiStart, endISO]
      ),
      db.query(
        "SELECT COUNT(*) as c FROM users WHERE role = 'USER' AND created_at >= ? AND created_at <= ?",
        [startISO, endISO]
      ),
      db.query("SELECT COUNT(*) as c, COALESCE(SUM(amount), 0) as s FROM upi_payment_requests WHERE status = 'PENDING'"),
      db.query("SELECT id, title, type, poster, backdrop, price, release_year FROM content WHERE trending_position = 1 LIMIT 1"),
      db.query("SELECT id, title, type, status, poster, price, release_year, created_at FROM content ORDER BY created_at DESC LIMIT 6"),
      db.query(`
        SELECT p.id, p.amount_paid, p.purchased_at, u.name as user_name, u.email as user_email, c.title as content_title
        FROM purchases p
        JOIN users u ON p.user_id = u.id
        JOIN content c ON p.content_id = c.id
        WHERE p.status = 'COMPLETED'
        ORDER BY p.purchased_at DESC
        LIMIT 6
      `),
      db.query("SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 6"),
    ]);

    const getCount = (row: any) => Number(row?.c ?? row?.count ?? 0);
    const getSum = (row: any) => Number(row?.s ?? row?.sum ?? 0);

    const trending1Row = trending1Rows[0] as any;
    const currentTrending1 = trending1Row
      ? {
          id: trending1Row.id,
          title: trending1Row.title,
          type: trending1Row.type,
          poster: trending1Row.poster,
          backdrop: trending1Row.backdrop,
          priceRupees: Math.round(trending1Row.price / 100),
          releaseYear: trending1Row.release_year,
        }
      : null;

    const todayPurchasesRevenue = Math.round(getSum(todayPurchasesRow) / 100);
    const todayUpiRevenue = Math.round(getSum(todayUpiRow) / 100);
    const todayTotalRevenue = todayPurchasesRevenue + todayUpiRevenue;
    const pendingRequestsCount = getCount(pendingUpiRow);
    const pendingAmountRupees = Math.round(getSum(pendingUpiRow) / 100);

    const todayStats: TodayStats = {
      todayRevenueRupees: todayTotalRevenue,
      todayPurchasesRevenueRupees: todayPurchasesRevenue,
      todayUpiRevenueRupees: todayUpiRevenue,
      todayNewMembersCount: getCount(todayUsersRow),
      todayPurchasesCount: getCount(todayPurchasesRow),
      todayUpiApprovedCount: getCount(todayUpiRow),
      pendingPaymentRequestsCount: pendingRequestsCount,
      pendingPaymentAmountRupees: pendingAmountRupees,
      todayProfitRupees: todayTotalRevenue,
      profitNote: 'External infrastructure and bandwidth expenses are not tracked in platform records. Profit reflects 100% gross operating margin.',
      calendarDate,
      windowStart: startISO,
      windowEnd: endISO,
    };

    return {
      totalUsers: getCount(userCountRow),
      totalMovies: getCount(movieCountRow),
      totalSeries: getCount(seriesCountRow),
      totalPublished: getCount(publishedRow),
      totalUnpublished: getCount(unpublishedRow),
      totalPurchases: getCount(purchasesRow),
      totalRevenueRupees: Math.round(getSum(revenueRow) / 100),
      walletActivity: {
        totalRechargeRupees: Math.round(getSum(rechargeRow) / 100),
        totalTransactions: getCount(txCountRow),
      },
      todayStats,
      accountingResetAt: resetAt,
      currentTrending1,
      recentlyAddedContent: (recentlyAddedRows as any[]).map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        status: r.status,
        poster: r.poster,
        priceRupees: Math.round(r.price / 100),
        releaseYear: r.release_year,
        createdAt: r.created_at,
      })),
      recentPurchases: (recentPurchasesRaw as any[]).map(r => ({
        id: r.id,
        userName: r.user_name,
        userEmail: r.user_email,
        contentTitle: r.content_title,
        amountRupees: Math.round(r.amount_paid / 100),
        purchasedAt: r.purchased_at,
      })),
      recentUsers: (recentUsersRaw as any[]).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.created_at,
      })),
    };
  },

  async getTodayDetails(type: string, tzOffsetMinutes?: number) {
    const db = getAdapter();
    const { startISO, endISO, calendarDate } = getDayBounds(tzOffsetMinutes);

    switch (type) {
      case 'members':
      case 'users': {
        const { rows } = await db.query(
          "SELECT id, name, email, role, status, created_at FROM users WHERE role = 'USER' AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC;",
          [startISO, endISO]
        );
        return {
          type: 'members',
          calendarDate,
          windowStart: startISO,
          windowEnd: endISO,
          records: rows
        };
      }
      case 'purchases': {
        const { rows } = await db.query(
          `SELECT p.id, p.amount_paid, p.purchased_at, u.name as user_name, u.email as user_email, c.title as content_title, c.type as content_type
           FROM purchases p
           JOIN users u ON p.user_id = u.id
           JOIN content c ON p.content_id = c.id
           WHERE p.status = 'COMPLETED' AND p.purchased_at >= ? AND p.purchased_at <= ?
           ORDER BY p.purchased_at DESC;`,
          [startISO, endISO]
        );
        return {
          type: 'purchases',
          calendarDate,
          windowStart: startISO,
          windowEnd: endISO,
          records: (rows as any[]).map(r => ({
            id: r.id,
            userName: r.user_name,
            userEmail: r.user_email,
            contentTitle: r.content_title,
            contentType: r.content_type,
            amountRupees: Math.round(r.amount_paid / 100),
            purchasedAt: r.purchased_at
          }))
        };
      }
      case 'upi': {
        const { rows } = await db.query(
          `SELECT id, user_id, user_name, user_email, amount, utr, status, submitted_at, processed_at, admin_note, created_at
           FROM upi_payment_requests
           WHERE (created_at >= ? AND created_at <= ?) OR (status = 'PENDING')
           ORDER BY created_at DESC;`,
          [startISO, endISO]
        );
        return {
          type: 'upi',
          calendarDate,
          windowStart: startISO,
          windowEnd: endISO,
          records: (rows as any[]).map(r => ({
            id: r.id,
            userName: r.user_name,
            userEmail: r.user_email,
            amountRupees: Math.round(r.amount / 100),
            utr: r.utr,
            status: r.status,
            submittedAt: r.submitted_at || r.created_at,
            processedAt: r.processed_at,
            adminNote: r.admin_note
          }))
        };
      }
      case 'revenue': {
        const [{ rows: purchaseRows }, { rows: upiRows }] = await Promise.all([
          db.query(
            `SELECT p.id, p.amount_paid, p.purchased_at, u.name as user_name, u.email as user_email, c.title as content_title
             FROM purchases p
             JOIN users u ON p.user_id = u.id
             JOIN content c ON p.content_id = c.id
             WHERE p.status = 'COMPLETED' AND p.purchased_at >= ? AND p.purchased_at <= ?
             ORDER BY p.purchased_at DESC;`,
            [startISO, endISO]
          ),
          db.query(
            `SELECT id, user_name, user_email, amount, utr, processed_at, created_at
             FROM upi_payment_requests
             WHERE status = 'APPROVED' AND ((processed_at >= ? AND processed_at <= ?) OR (processed_at IS NULL AND created_at >= ? AND created_at <= ?))
             ORDER BY created_at DESC;`,
            [startISO, endISO, startISO, endISO]
          )
        ]);

        const purchaseRecords = (purchaseRows as any[]).map(r => ({
          id: r.id,
          source: 'PURCHASE',
          title: `Content: ${r.content_title}`,
          userName: r.user_name,
          userEmail: r.user_email,
          amountRupees: Math.round(r.amount_paid / 100),
          timestamp: r.purchased_at
        }));

        const upiRecords = (upiRows as any[]).map(r => ({
          id: r.id,
          source: 'UPI_RECHARGE',
          title: `UPI Recharge (UTR: ${r.utr})`,
          userName: r.user_name,
          userEmail: r.user_email,
          amountRupees: Math.round(r.amount / 100),
          timestamp: r.processed_at || r.created_at
        }));

        const combined = [...purchaseRecords, ...upiRecords].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return {
          type: 'revenue',
          calendarDate,
          windowStart: startISO,
          windowEnd: endISO,
          records: combined
        };
      }
      case 'profit': {
        const [{ rows: purchaseSumRow }, { rows: upiSumRow }] = await Promise.all([
          db.query(
            "SELECT COALESCE(SUM(amount_paid), 0) as s, COUNT(*) as c FROM purchases WHERE status = 'COMPLETED' AND purchased_at >= ? AND purchased_at <= ?",
            [startISO, endISO]
          ),
          db.query(
            "SELECT COALESCE(SUM(amount), 0) as s, COUNT(*) as c FROM upi_payment_requests WHERE status = 'APPROVED' AND ((processed_at >= ? AND processed_at <= ?) OR (processed_at IS NULL AND created_at >= ? AND created_at <= ?))",
            [startISO, endISO, startISO, endISO]
          )
        ]);

        const purchasesRupees = Math.round(Number((purchaseSumRow[0] as any)?.s || 0) / 100);
        const upiRupees = Math.round(Number((upiSumRow[0] as any)?.s || 0) / 100);
        const grossRevenue = purchasesRupees + upiRupees;

        return {
          type: 'profit',
          calendarDate,
          windowStart: startISO,
          windowEnd: endISO,
          breakdown: {
            contentPurchasesRevenue: purchasesRupees,
            walletRechargeRevenue: upiRupees,
            totalGrossRevenue: grossRevenue,
            operatingExpensesRecorded: 0,
            netCalculatedProfit: grossRevenue,
            isCostConfigured: false,
            explanation: 'FLOPSHOW currently does not track external server, CDN, or hosting expenses. Profit reflects 100% gross operating revenue.'
          }
        };
      }
      default:
        throw new Error(`Unknown today metric type: ${type}`);
    }
  },

  async getAllUsers(): Promise<any[]> {
    const db = getAdapter();
    const { rows } = await db.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.status, u.created_at,
        w.balance,
        (SELECT COUNT(*) FROM purchases p WHERE p.user_id = u.id AND p.status = 'COMPLETED') as purchase_count
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      ORDER BY u.created_at DESC;
    `);
    return (rows as any[]).map(u => ({
      ...u,
      balanceRupees: u.balance ? Math.round(u.balance / 100) : 0,
      purchaseCount: Number(u.purchase_count ?? 0),
    }));
  },

  async getAllTransactions(limit = 100): Promise<any[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT wt.*, u.name as user_name, u.email as user_email
       FROM wallet_transactions wt
       JOIN users u ON wt.user_id = u.id
       ORDER BY wt.created_at DESC
       LIMIT ?;`,
      [limit]
    );
    return (rows as any[]).map(tx => ({
      ...tx,
      amountRupees: Math.round(tx.amount / 100),
      balanceAfterRupees: Math.round(tx.balance_after / 100),
    }));
  },

  async createContent(data: {
    type: 'MOVIE' | 'SERIES';
    title: string;
    slug?: string;
    description: string;
    poster: string;
    backdrop: string;
    trailerUrl?: string;
    videoUrl?: string;
    priceRupees: number;
    language?: string;
    releaseYear: number;
    duration?: string;
    ageRating?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    featured?: boolean;
    trendingPosition?: number | null;
    displayPriority?: number;
    categoryLabel?: string;
    tagline?: string;
    about?: string;
    rating?: number;
    director?: string;
    cast?: string[];
    genreIds?: string[];
    customPriceRupees?: number | null;
  }): Promise<string> {
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = slug;
    const pricePaise = Math.round(data.priceRupees * 100);
    const customPricePaise = data.customPriceRupees !== undefined && data.customPriceRupees !== null && data.customPriceRupees > 0
      ? Math.round(data.customPriceRupees * 100)
      : null;

    const record: Omit<ContentRecord, 'created_at' | 'updated_at'> = {
      id,
      type: data.type,
      title: data.title,
      slug,
      description: data.description,
      poster: data.poster || (data as any).posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba',
      backdrop: data.backdrop || (data as any).backdropUrl || 'https://images.unsplash.com/photo-1519681393784-d120267933ba',
      trailer_url: data.trailerUrl || null,
      video_url: data.videoUrl || null,
      price: customPricePaise ?? pricePaise,
      custom_price: customPricePaise,
      language: data.language || 'Hindi',
      release_year: data.releaseYear,
      duration: data.duration || null,
      age_rating: data.ageRating || 'U/A 13+',
      status: data.status || 'PUBLISHED',
      featured: data.featured ? 1 : 0,
      trending_position: data.trendingPosition || null,
      display_priority: data.displayPriority || 0,
      category_label: data.categoryLabel || null,
      tagline: data.tagline || null,
      about: data.about || null,
      rating: data.rating || 8.0,
      director: data.director || null,
      cast_json: JSON.stringify(data.cast || []),
    };

    await contentRepository.createContent(record, data.genreIds || []);

    if (data.trendingPosition) {
      await contentRepository.setTrendingPosition(id, data.trendingPosition);
    }

    return id;
  },

  async updateContent(
    id: string,
    updates: Partial<ContentRecord> & { genreIds?: string[]; priceRupees?: number } & Record<string, any>
  ): Promise<void> {
    const existing = await contentRepository.findByIdOrSlug(id);
    if (!existing) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const anyUpdates = updates as Record<string, any>;

    // Map Poster & Backdrop field aliases
    if (updates.poster === undefined) {
      if (anyUpdates.posterUrl !== undefined) updates.poster = anyUpdates.posterUrl;
      else if (anyUpdates.poster_url !== undefined) updates.poster = anyUpdates.poster_url;
    }
    if (updates.backdrop === undefined) {
      if (anyUpdates.backdropUrl !== undefined) updates.backdrop = anyUpdates.backdropUrl;
      else if (anyUpdates.backdrop_url !== undefined) updates.backdrop = anyUpdates.backdrop_url;
    }

    if (updates.trailer_url === undefined && anyUpdates.trailerUrl !== undefined) {
      updates.trailer_url = anyUpdates.trailerUrl;
    }
    if (updates.trailer_url === '' || updates.trailer_url === null) {
      updates.trailer_url = null;
      const db = getAdapter();
      await db.run('UPDATE media SET is_active = 0 WHERE content_id = ? AND media_type = ?;', [existing.id, 'TRAILER']);
    }
    if (updates.video_url === undefined && anyUpdates.videoUrl !== undefined) {
      updates.video_url = anyUpdates.videoUrl;
    }
    if (updates.release_year === undefined && anyUpdates.releaseYear !== undefined) {
      updates.release_year = anyUpdates.releaseYear;
    }
    if (updates.duration === undefined && anyUpdates.runtime !== undefined) {
      updates.duration = anyUpdates.runtime;
    }
    if (updates.featured === undefined && anyUpdates.isFeatured !== undefined) {
      updates.featured = anyUpdates.isFeatured ? 1 : 0;
    }
    if (updates.trending_position === undefined && anyUpdates.trendingPosition !== undefined) {
      updates.trending_position = anyUpdates.trendingPosition;
    }
    if (updates.cast_json === undefined && Array.isArray(anyUpdates.cast)) {
      updates.cast_json = JSON.stringify(anyUpdates.cast);
    }

    if (updates.priceRupees !== undefined) {
      updates.price = Math.round(updates.priceRupees * 100);
    }

    if (anyUpdates.customPriceRupees !== undefined) {
      updates.custom_price = (anyUpdates.customPriceRupees === null || anyUpdates.customPriceRupees === '' || Number(anyUpdates.customPriceRupees) <= 0)
        ? null
        : Math.round(Number(anyUpdates.customPriceRupees) * 100);
    } else if (anyUpdates.custom_price !== undefined) {
      updates.custom_price = (anyUpdates.custom_price === null || anyUpdates.custom_price === '' || Number(anyUpdates.custom_price) <= 0)
        ? null
        : Math.round(Number(anyUpdates.custom_price));
    }

    await contentRepository.updateContent(existing.id, updates);

    if (updates.trending_position !== undefined) {
      await contentRepository.setTrendingPosition(existing.id, updates.trending_position);
    }

    if (updates.genreIds && Array.isArray(updates.genreIds)) {
      await contentRepository.syncGenres(existing.id, updates.genreIds);
    }
  },

  async setTrendingPosition(id: string, position: number | null): Promise<void> {
    const existing = await contentRepository.findByIdOrSlug(id);
    if (!existing) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }
    await contentRepository.setTrendingPosition(existing.id, position);
  },

  async deleteContent(id: string): Promise<void> {
    const existing = await contentRepository.findByIdOrSlug(id);
    if (!existing) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }
    await contentRepository.deleteContent(existing.id);
  },

  async updateStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'): Promise<void> {
    const existing = await contentRepository.findByIdOrSlug(id);
    if (!existing) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }
    await contentRepository.updateStatus(existing.id, status);
  },

  async updatePrice(id: string, priceRupees: number, customPriceRupees?: number | null): Promise<void> {
    const existing = await contentRepository.findByIdOrSlug(id);
    if (!existing) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }
    if (priceRupees < 0) {
      const err = new Error('Price cannot be negative.');
      (err as any).statusCode = 400;
      throw err;
    }
    const defaults = await contentRepository.getDefaultPrices();
    const defaultPrice = existing.type === 'SERIES' ? defaults.defaultSeriesPrice : defaults.defaultMoviePrice;

    let customPricePaise: number | null;
    if (customPriceRupees !== undefined) {
      customPricePaise = (customPriceRupees === null || customPriceRupees <= 0)
        ? null
        : Math.round(customPriceRupees * 100);
    } else {
      // Caller updated price without specifying customPriceRupees
      if (priceRupees === 0 || priceRupees === defaultPrice) {
        customPricePaise = null;
      } else {
        customPricePaise = Math.round(priceRupees * 100);
      }
    }
    await contentRepository.updatePrice(existing.id, Math.round(priceRupees * 100), customPricePaise);
  },

  async createGenre(name: string, slug?: string): Promise<string> {
    const cleanName = name.trim();
    const cleanSlug = (slug || cleanName).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = `genre-${cleanSlug}`;
    await contentRepository.createGenre(id, cleanName, cleanSlug);
    return id;
  },

  async createSeason(contentId: string, seasonNumber: number, title: string): Promise<string> {
    const existing = await contentRepository.findByIdOrSlug(contentId);
    if (!existing) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }
    const seasonId = `${existing.id}-s${seasonNumber}`;
    await contentRepository.createSeason({ id: seasonId, contentId: existing.id, seasonNumber, title });
    return seasonId;
  },

  async updateSeason(seasonId: string, title: string, seasonNumber?: number): Promise<void> {
    await contentRepository.updateSeason(seasonId, title, seasonNumber);
  },

  async deleteSeason(seasonId: string): Promise<void> {
    await contentRepository.deleteSeason(seasonId);
  },

  async createEpisode(
    seasonId: string,
    episode: {
      episodeNumber: number;
      title: string;
      description?: string;
      thumbnail?: string;
      duration?: string;
      durationSeconds?: number;
      videoUrl: string;
    }
  ): Promise<string> {
    const id = `${seasonId}-e${episode.episodeNumber}`;
    await contentRepository.createEpisode({
      id,
      seasonId,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      description: episode.description,
      thumbnail: episode.thumbnail,
      duration: episode.duration,
      durationSeconds: episode.durationSeconds,
      videoUrl: episode.videoUrl,
    });
    return id;
  },

  async updateEpisode(episodeId: string, updates: any): Promise<void> {
    await contentRepository.updateEpisode(episodeId, updates);
  },

  async deleteEpisode(episodeId: string): Promise<void> {
    await contentRepository.deleteEpisode(episodeId);
  },

  async listAllContent(
    filters: {
      status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'ALL';
      type?: 'MOVIE' | 'SERIES';
      genreSlug?: string;
      featured?: boolean;
      trendingOnly?: boolean;
      search?: string;
      sortBy?: 'newest' | 'oldest' | 'title' | 'price_asc' | 'price_desc' | 'featured' | 'priority';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    const rawItems = await contentRepository.list(filters);
    return rawItems.map(item => ({
      ...item,
      priceRupees: Math.round(item.price / 100),
      isFree: item.price === 0,
      isFeatured: Boolean(item.featured),
      isTrending1: item.trending_position === 1,
      posterUrl: item.poster,
      backdropUrl: item.backdrop,
      trailerUrl: item.trailer_url,
      videoUrl: item.video_url,
    }));
  },

  async updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<void> {
    const db = getAdapter();
    const { rows } = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (!rows[0]) {
      const err = new Error('User not found.');
      (err as any).statusCode = 404;
      throw err;
    }
    await db.run('UPDATE users SET status = ?, updated_at = ? WHERE id = ?', [
      status,
      new Date().toISOString(),
      userId,
    ]);
  },

  async getUserPurchases(userId: string): Promise<any[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT p.id, p.amount_paid, p.status, p.purchased_at,
              c.id as content_id, c.title as content_title, c.type as content_type, c.poster as content_poster
       FROM purchases p
       JOIN content c ON p.content_id = c.id
       WHERE p.user_id = ?
       ORDER BY p.purchased_at DESC;`,
      [userId]
    );
    return (rows as any[]).map(r => ({ ...r, amountRupees: Math.round(r.amount_paid / 100) }));
  },

  async getUserTransactions(userId: string): Promise<any[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC;`,
      [userId]
    );
    return (rows as any[]).map(tx => ({
      ...tx,
      amountRupees: Math.round(tx.amount / 100),
      balanceAfterRupees: Math.round(tx.balance_after / 100),
    }));
  },

  async getAllPurchases(limit = 100, offset = 0): Promise<any[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT p.id, p.user_id, p.content_id, p.amount_paid, p.status, p.purchased_at,
              u.name as user_name, u.email as user_email,
              c.title as content_title, c.type as content_type, c.poster as content_poster
       FROM purchases p
       JOIN users u ON p.user_id = u.id
       JOIN content c ON p.content_id = c.id
       ORDER BY p.purchased_at DESC
       LIMIT ? OFFSET ?;`,
      [limit, offset]
    );
    return (rows as any[]).map(r => ({ ...r, amountRupees: Math.round(r.amount_paid / 100) }));
  },

  async getAllGenresWithCounts(): Promise<any[]> {
    return contentRepository.getGenresWithCounts();
  },

  async updateGenre(id: string, name: string, slug?: string): Promise<void> {
    await contentRepository.updateGenre(id, name, slug);
  },

  async deleteGenre(id: string): Promise<void> {
    await contentRepository.deleteGenre(id);
  },

  async getSettings(): Promise<Record<string, string>> {
    const db = getAdapter();
    const { rows } = await db.query('SELECT key, value FROM app_settings;');
    const result: Record<string, string> = {};
    for (const r of rows as { key: string; value: string }[]) {
      result[r.key] = r.value;
    }
    if (!result.per_movie_price) result.per_movie_price = '30';
    if (!result.per_series_price) result.per_series_price = '35';
    return result;
  },

  async updateSettings(settings: Record<string, string>): Promise<void> {
    const db = getAdapter();
    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(settings)) {
      await db.run(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;`,
        [key, String(value), now]
      );
    }
  },

  async getHero(): Promise<ContentRecord | null> {
    return contentRepository.getHero();
  },

  async setHero(contentId: string | null): Promise<void> {
    await contentRepository.setHero(contentId);
  },

  async getSpotlight(): Promise<ContentRecord | null> {
    return contentRepository.getSpotlight();
  },

  async getSpotlights(): Promise<ContentRecord[]> {
    return contentRepository.getSpotlights();
  },

  async setSpotlight(contentId: string | null): Promise<void> {
    await contentRepository.setSpotlight(contentId);
  },

  async setSpotlights(contentIds: string[]): Promise<void> {
    await contentRepository.setSpotlights(contentIds);
  },

  async addSpotlight(contentId: string): Promise<void> {
    const existing = await contentRepository.getSpotlights();
    const existingIds = existing.map(e => e.id);
    if (!existingIds.includes(contentId)) {
      await contentRepository.setSpotlights([...existingIds, contentId]);
    }
  },

  async removeSpotlight(contentId: string): Promise<void> {
    const existing = await contentRepository.getSpotlights();
    const filteredIds = existing.map(e => e.id).filter(id => id !== contentId);
    await contentRepository.setSpotlights(filteredIds);
  },

  async getAdsConfig() {
    const settings = await this.getSettings();
    return {
      enabled: settings.ad_enabled === 'true',
      type: ((settings.ad_type || 'IMAGE').toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO',
      mediaUrl: settings.ad_media_url || '',
      durationSeconds: parseInt(settings.ad_duration_seconds || '10', 10) || 10,
      skipEnabled: settings.ad_skip_enabled !== 'false',
      skipAfterSeconds: parseInt(settings.ad_skip_after_seconds || '5', 10) || 5,
      title: settings.ad_title || 'Advertisement',
      clickUrl: settings.ad_click_url || '',
    };
  },

  async updateAdsConfig(cfg: {
    enabled?: boolean;
    type?: 'IMAGE' | 'VIDEO';
    mediaUrl?: string;
    durationSeconds?: number;
    skipEnabled?: boolean;
    skipAfterSeconds?: number;
    title?: string;
    clickUrl?: string;
  }) {
    const toUpdate: Record<string, string> = {};
    if (cfg.enabled !== undefined) toUpdate.ad_enabled = String(cfg.enabled);
    if (cfg.type !== undefined) toUpdate.ad_type = String(cfg.type);
    if (cfg.mediaUrl !== undefined) toUpdate.ad_media_url = String(cfg.mediaUrl);
    if (cfg.durationSeconds !== undefined) toUpdate.ad_duration_seconds = String(cfg.durationSeconds);
    if (cfg.skipEnabled !== undefined) toUpdate.ad_skip_enabled = String(cfg.skipEnabled);
    if (cfg.skipAfterSeconds !== undefined) toUpdate.ad_skip_after_seconds = String(cfg.skipAfterSeconds);
    if (cfg.title !== undefined) toUpdate.ad_title = String(cfg.title);
    if (cfg.clickUrl !== undefined) toUpdate.ad_click_url = String(cfg.clickUrl);

    await this.updateSettings(toUpdate);
    return this.getAdsConfig();
  },

  async getAdMediaLibrary(type?: 'IMAGE' | 'VIDEO'): Promise<AdMediaItem[]> {
    const settings = await this.getSettings();
    let library: AdMediaItem[] = [];
    if (settings.ad_media_library) {
      try {
        library = JSON.parse(settings.ad_media_library);
      } catch {
        library = [];
      }
    }
    if (type) {
      return library.filter(item => item.type === type);
    }
    return library;
  },

  async addAdMediaItems(items: Array<{ type: 'IMAGE' | 'VIDEO'; url: string; name: string; size?: number; mimeType?: string }>): Promise<AdMediaItem[]> {
    const library = await this.getAdMediaLibrary();
    // Avoid duplicate entries for the exact same media URL
    const existingUrls = new Set(library.map(i => i.url.trim()));
    const toAdd = items.filter(item => !existingUrls.has(item.url.trim()));

    const newEntries: AdMediaItem[] = toAdd.map(item => ({
      id: `ad-media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: item.type,
      url: item.url,
      name: item.name,
      size: item.size,
      mimeType: item.mimeType,
      createdAt: new Date().toISOString()
    }));
    const updated = [...newEntries, ...library];
    await this.updateSettings({ ad_media_library: JSON.stringify(updated) });
    return updated;
  },

  async deleteAdMediaItem(id: string): Promise<boolean> {
    const library = await this.getAdMediaLibrary();
    const updated = library.filter(item => item.id !== id);
    await this.updateSettings({ ad_media_library: JSON.stringify(updated) });
    return true;
  },

  async resetFinancialAnalytics(): Promise<{ success: boolean; resetAt: string; message: string }> {
    const now = new Date().toISOString();
    await this.updateSettings({ finance_analytics_reset_at: now });
    return {
      success: true,
      resetAt: now,
      message: 'Platform financial and transactional analytics summary counters have been reset successfully. A fresh accounting period has started.'
    };
  },

  async getUserDetails(userId: string): Promise<any> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at,
              w.balance,
              (SELECT COUNT(*) FROM purchases p WHERE p.user_id = u.id AND p.status = 'COMPLETED') as purchase_count,
              (SELECT COALESCE(SUM(p.amount_paid), 0) FROM purchases p WHERE p.user_id = u.id AND p.status = 'COMPLETED') as total_spent
       FROM users u
       LEFT JOIN wallets w ON u.id = w.user_id
       WHERE u.id = ?;`,
      [userId]
    );
    if (!rows[0]) {
      const err = new Error('User not found.');
      (err as any).statusCode = 404;
      throw err;
    }
    const user = rows[0] as any;

    const purchases = await this.getUserPurchases(userId);
    const transactions = await this.getUserTransactions(userId);

    const upiRes = await db.query(
      `SELECT id, amount, utr, status, created_at, processed_at, admin_note
       FROM upi_payment_requests
       WHERE user_id = ?
       ORDER BY created_at DESC;`,
      [userId]
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status || 'ACTIVE',
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      balanceRupees: user.balance ? Math.round(user.balance / 100) : 0,
      purchaseCount: Number(user.purchase_count ?? 0),
      totalSpentRupees: Math.round(Number(user.total_spent ?? 0) / 100),
      purchases,
      transactions,
      upiRecharges: (upiRes.rows as any[]).map(r => ({
        ...r,
        amountRupees: Math.round(r.amount / 100),
      })),
    };
  },

  async resetUserPassword(userId: string, newPlainPassword: string): Promise<void> {
    if (!newPlainPassword || newPlainPassword.trim().length < 6) {
      const err = new Error('Password must be at least 6 characters long.');
      (err as any).statusCode = 400;
      throw err;
    }
    const db = getAdapter();
    const { rows } = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (!rows[0]) {
      const err = new Error('User not found.');
      (err as any).statusCode = 404;
      throw err;
    }
    const passwordHash = await bcrypt.hash(newPlainPassword.trim(), 10);
    await db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [
      passwordHash,
      new Date().toISOString(),
      userId,
    ]);
  },

  async deleteUsers(currentAdminUserId: string | undefined, userIds: string[]): Promise<{ deletedCount: number; message: string }> {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      const err = new Error('No users selected for deletion.');
      (err as any).statusCode = 400;
      throw err;
    }

    const db = getAdapter();

    const placeholders = userIds.map(() => '?').join(',');
    const { rows: targetUsers } = await db.query(
      `SELECT id, email, role FROM users WHERE id IN (${placeholders})`,
      userIds
    );

    // Prevent deleting any ADMIN accounts or current logged-in admin
    const adminTargets = (targetUsers as any[]).filter(
      u => u.role === 'ADMIN' || (currentAdminUserId && u.id === currentAdminUserId)
    );

    if (adminTargets.length > 0) {
      const err = new Error('Admin accounts cannot be deleted.');
      (err as any).statusCode = 403;
      throw err;
    }

    const validTargetIds = (targetUsers as any[]).map(u => u.id);
    if (validTargetIds.length === 0) {
      return { deletedCount: 0, message: 'No valid non-admin users found to delete.' };
    }

    for (const uid of validTargetIds) {
      await db.run('DELETE FROM subscriptions WHERE user_id = ?', [uid]);
      await db.run('DELETE FROM upi_payment_requests WHERE user_id = ?', [uid]);
      await db.run('DELETE FROM watch_history WHERE user_id = ?', [uid]);
      await db.run('DELETE FROM my_list WHERE user_id = ?', [uid]);
      await db.run('DELETE FROM watch_progress WHERE user_id = ?', [uid]);
      await db.run('DELETE FROM wallet_transactions WHERE user_id = ?', [uid]);
      await db.run('DELETE FROM purchases WHERE user_id = ?', [uid]);
      await db.run('DELETE FROM wallets WHERE user_id = ?', [uid]);
      await db.run('DELETE FROM users WHERE id = ?', [uid]);
    }

    return {
      deletedCount: validTargetIds.length,
      message: `Successfully deleted ${validTargetIds.length} user(s).`
    };
  },

  async getUnifiedAnalytics(filter = 'ALL') {
    const db = getAdapter();
    const now = new Date().toISOString();

    let movieSeries = { total: 0, revenueRupees: 0, successful: 0, active: 0, expired: 0, pending: 0, rejected: 0, byPlan: {} as Record<string, number> };
    if (filter === 'ALL' || filter === 'MOVIE_SERIES') {
      const [{ rows: [t] }, { rows: [r] }, { rows: [a] }, { rows: [e] }, { rows: [p] }, { rows: [rj] }, { rows: contentTypes }] = await Promise.all([
        db.query("SELECT COUNT(*) as c FROM purchases WHERE status = 'COMPLETED'"),
        db.query("SELECT COALESCE(SUM(amount_paid), 0) as s FROM purchases WHERE status = 'COMPLETED'"),
        db.query("SELECT COUNT(*) as c FROM purchases WHERE status = 'COMPLETED' AND (expires_at IS NULL OR expires_at > ?)", [now]),
        db.query("SELECT COUNT(*) as c FROM purchases WHERE status = 'COMPLETED' AND expires_at IS NOT NULL AND expires_at <= ?", [now]),
        db.query("SELECT COUNT(*) as c FROM upi_payment_requests WHERE content_id IS NOT NULL AND status = 'PENDING'"),
        db.query("SELECT COUNT(*) as c FROM upi_payment_requests WHERE content_id IS NOT NULL AND status = 'REJECTED'"),
        db.query("SELECT c.type, COUNT(*) as cnt, COALESCE(SUM(p.amount_paid), 0) as rev FROM purchases p JOIN content c ON p.content_id = c.id WHERE p.status = 'COMPLETED' GROUP BY c.type"),
      ]);
      const byPlan: Record<string, number> = {};
      for (const row of (contentTypes || []) as any[]) {
        if (row.type) {
          byPlan[row.type] = Math.round(Number(row.rev || 0) / 100);
        }
      }
      movieSeries = {
        total: Number((t as any)?.c || 0),
        revenueRupees: Math.round(Number((r as any)?.s || 0) / 100),
        successful: Number((t as any)?.c || 0),
        active: Number((a as any)?.c || 0),
        expired: Number((e as any)?.c || 0),
        pending: Number((p as any)?.c || 0),
        rejected: Number((rj as any)?.c || 0),
        byPlan,
      };
    }

    let watchPass = { total: 0, revenueRupees: 0, successful: 0, active: 0, expired: 0, pending: 0, rejected: 0, byPlan: {} as Record<string, number> };
    if (filter === 'ALL' || filter === 'WATCH_PASS') {
      const [{ rows: [t] }, { rows: [r] }, { rows: [a] }, { rows: [ex] }, { rows: [p] }, { rows: [rj] }, { rows: plans }] = await Promise.all([
        db.query("SELECT COUNT(*) as c FROM watch_passes"),
        db.query("SELECT COALESCE(SUM(amount_paid), 0) as s FROM watch_passes WHERE status IN ('ACTIVE', 'EXPIRED')"),
        db.query("SELECT COUNT(*) as c FROM watch_passes WHERE status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > ?)", [now]),
        db.query("SELECT COUNT(*) as c FROM watch_passes WHERE status = 'EXPIRED' OR (status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= ?)", [now]),
        db.query("SELECT COUNT(*) as c FROM watch_passes WHERE status = 'PENDING'"),
        db.query("SELECT COUNT(*) as c FROM watch_passes WHERE status = 'REJECTED'"),
        db.query("SELECT plan, COALESCE(SUM(amount_paid), 0) as rev FROM watch_passes WHERE status IN ('ACTIVE', 'EXPIRED') GROUP BY plan"),
      ]);
      const byPlan: Record<string, number> = {};
      for (const row of (plans || []) as any[]) {
        if (row.plan) {
          byPlan[row.plan] = Math.round(Number(row.rev || 0));
        }
      }
      watchPass = {
        total: Number((t as any)?.c || 0),
        revenueRupees: Math.round(Number((r as any)?.s || 0)),
        successful: Number((a as any)?.c || 0) + Number((ex as any)?.c || 0),
        active: Number((a as any)?.c || 0),
        expired: Number((ex as any)?.c || 0),
        pending: Number((p as any)?.c || 0),
        rejected: Number((rj as any)?.c || 0),
        byPlan,
      };
    }

    let vipPlans = { total: 0, revenueRupees: 0, successful: 0, active: 0, expired: 0, pending: 0, rejected: 0, byPlan: {} as Record<string, number> };
    if (filter === 'ALL' || filter === 'VIP_PLANS') {
      const [{ rows: [t] }, { rows: [r] }, { rows: [a] }, { rows: [ex] }, { rows: [p] }, { rows: [rj] }, { rows: plans }] = await Promise.all([
        db.query("SELECT COUNT(*) as c FROM subscriptions"),
        db.query("SELECT COALESCE(SUM(amount_paid), 0) as s FROM subscriptions WHERE status IN ('ACTIVE', 'EXPIRED')"),
        db.query("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'ACTIVE' AND (end_date IS NULL OR end_date > ?)", [now]),
        db.query("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'EXPIRED' OR (status = 'ACTIVE' AND end_date IS NOT NULL AND end_date <= ?)", [now]),
        db.query("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'PENDING'"),
        db.query("SELECT COUNT(*) as c FROM subscriptions WHERE status IN ('REJECTED', 'CANCELLED')"),
        db.query("SELECT plan, COALESCE(SUM(amount_paid), 0) as rev FROM subscriptions WHERE status IN ('ACTIVE', 'EXPIRED') GROUP BY plan"),
      ]);
      const byPlan: Record<string, number> = {};
      for (const row of (plans || []) as any[]) {
        if (row.plan) {
          byPlan[row.plan] = Math.round(Number(row.rev || 0));
        }
      }
      vipPlans = {
        total: Number((t as any)?.c || 0),
        revenueRupees: Math.round(Number((r as any)?.s || 0)),
        successful: Number((a as any)?.c || 0) + Number((ex as any)?.c || 0),
        active: Number((a as any)?.c || 0),
        expired: Number((ex as any)?.c || 0),
        pending: Number((p as any)?.c || 0),
        rejected: Number((rj as any)?.c || 0),
        byPlan,
      };
    }

    let recentTransactions: any[] = [];
    if (filter === 'ALL' || filter === 'MOVIE_SERIES') {
      const { rows } = await db.query(
        `SELECT p.id, u.name as user_name, c.title as content_title, c.type as content_type, p.amount_paid as amount, p.purchased_at as ts
         FROM purchases p
         JOIN users u ON p.user_id = u.id
         JOIN content c ON p.content_id = c.id
         WHERE p.status = 'COMPLETED'
         ORDER BY p.purchased_at DESC LIMIT 20`
      );
      recentTransactions.push(
        ...(rows as any[]).map(r => ({
          id: r.id,
          category: 'MOVIE_SERIES',
          userName: r.user_name,
          title: `${r.content_title} (${r.content_type})`,
          amountRupees: Math.round(Number(r.amount) / 100),
          timestamp: r.ts,
        }))
      );
    }

    if (filter === 'ALL' || filter === 'WATCH_PASS') {
      const { rows } = await db.query(
        `SELECT wp.id, u.name as user_name, wp.plan, wp.amount_paid as amount, wp.submitted_at as ts
         FROM watch_passes wp
         JOIN users u ON wp.user_id = u.id
         WHERE wp.status IN ('ACTIVE', 'EXPIRED')
         ORDER BY wp.submitted_at DESC LIMIT 20`
      );
      recentTransactions.push(
        ...(rows as any[]).map(r => ({
          id: r.id,
          category: 'WATCH_PASS',
          userName: r.user_name,
          title: `Watch Pass (${r.plan})`,
          amountRupees: Math.round(Number(r.amount)),
          timestamp: r.ts,
        }))
      );
    }

    if (filter === 'ALL' || filter === 'VIP_PLANS') {
      const { rows } = await db.query(
        `SELECT s.id, u.name as user_name, s.plan, s.amount_paid as amount, s.submitted_at as ts
         FROM subscriptions s
         JOIN users u ON s.user_id = u.id
         WHERE s.status IN ('ACTIVE', 'EXPIRED')
         ORDER BY s.submitted_at DESC LIMIT 20`
      );
      recentTransactions.push(
        ...(rows as any[]).map(r => ({
          id: r.id,
          category: 'VIP_PLANS',
          userName: r.user_name,
          title: `VIP Subscription (${r.plan})`,
          amountRupees: Math.round(Number(r.amount)),
          timestamp: r.ts,
        }))
      );
    }

    recentTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalRevenueRupees =
      filter === 'MOVIE_SERIES'
        ? movieSeries.revenueRupees
        : filter === 'WATCH_PASS'
        ? watchPass.revenueRupees
        : filter === 'VIP_PLANS'
        ? vipPlans.revenueRupees
        : movieSeries.revenueRupees + watchPass.revenueRupees + vipPlans.revenueRupees;

    const totalSales =
      filter === 'MOVIE_SERIES'
        ? movieSeries.successful
        : filter === 'WATCH_PASS'
        ? watchPass.successful
        : filter === 'VIP_PLANS'
        ? vipPlans.successful
        : movieSeries.successful + watchPass.successful + vipPlans.successful;

    const successful = totalSales;
    const pending =
      filter === 'MOVIE_SERIES'
        ? movieSeries.pending
        : filter === 'WATCH_PASS'
        ? watchPass.pending
        : filter === 'VIP_PLANS'
        ? vipPlans.pending
        : movieSeries.pending + watchPass.pending + vipPlans.pending;

    const rejected =
      filter === 'MOVIE_SERIES'
        ? movieSeries.rejected
        : filter === 'WATCH_PASS'
        ? watchPass.rejected
        : filter === 'VIP_PLANS'
        ? vipPlans.rejected
        : movieSeries.rejected + watchPass.rejected + vipPlans.rejected;

    const active =
      filter === 'MOVIE_SERIES'
        ? movieSeries.active
        : filter === 'WATCH_PASS'
        ? watchPass.active
        : filter === 'VIP_PLANS'
        ? vipPlans.active
        : movieSeries.active + watchPass.active + vipPlans.active;

    const expired =
      filter === 'MOVIE_SERIES'
        ? movieSeries.expired
        : filter === 'WATCH_PASS'
        ? watchPass.expired
        : filter === 'VIP_PLANS'
        ? vipPlans.expired
        : movieSeries.expired + watchPass.expired + vipPlans.expired;

    return {
      filter,
      totalRevenueRupees,
      totalSales,
      successful,
      pending,
      rejected,
      active,
      expired,
      movieSeries,
      watchPass,
      vipPlans,
      recentTransactions: recentTransactions.slice(0, 30),
    };
  },

  async getDailyAnalytics(filter = 'ALL', tzOffsetMinutes?: number) {
    const db = getAdapter();
    const { startISO, endISO, calendarDate } = getDayBounds(tzOffsetMinutes);
    let oneTitle = { sales: 0, revenueRupees: 0 };
    let pass = { sales: 0, revenueRupees: 0, pending: 0 };
    let vip = { sales: 0, revenueRupees: 0, pending: 0 };
    if (filter === 'ALL' || filter === 'ONE_TITLE') {
      const { rows: [r] } = await db.query(`SELECT COUNT(*) as c, COALESCE(SUM(amount_paid),0) as s FROM purchases WHERE status='COMPLETED' AND purchased_at >= ? AND purchased_at <= ?`, [startISO, endISO]);
      oneTitle = { sales: Number((r as any)?.c||0), revenueRupees: Math.round(Number((r as any)?.s||0)/100) };
    }
    if (filter === 'ALL' || filter === 'PASS') {
      const [{ rows: [r] }, { rows: [p] }] = await Promise.all([
        db.query(`SELECT COUNT(*) as c, COALESCE(SUM(amount_paid),0) as s FROM watch_passes WHERE status IN ('ACTIVE','EXPIRED') AND activated_at >= ? AND activated_at <= ?`, [startISO, endISO]),
        db.query("SELECT COUNT(*) as c FROM watch_passes WHERE status = 'PENDING'"),
      ]);
      pass = { sales: Number((r as any)?.c||0), revenueRupees: Math.round(Number((r as any)?.s||0)), pending: Number((p as any)?.c||0) };
    }
    if (filter === 'ALL' || filter === 'VIP_PLANS') {
      const [{ rows: [r] }, { rows: [p] }] = await Promise.all([
        db.query(`SELECT COUNT(*) as c, COALESCE(SUM(amount_paid),0) as s FROM subscriptions WHERE status IN ('ACTIVE','EXPIRED') AND activated_at >= ? AND activated_at <= ?`, [startISO, endISO]),
        db.query("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'PENDING'"),
      ]);
      vip = { sales: Number((r as any)?.c||0), revenueRupees: Math.round(Number((r as any)?.s||0)), pending: Number((p as any)?.c||0) };
    }
    return { filter, calendarDate, windowStart: startISO, windowEnd: endISO, totalSales: oneTitle.sales + pass.sales + vip.sales, totalRevenueRupees: oneTitle.revenueRupees + pass.revenueRupees + vip.revenueRupees, oneTitle, pass, vip };
  },
};

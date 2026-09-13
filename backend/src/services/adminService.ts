import { contentRepository, ContentRecord } from '../repositories/contentRepository.js';
import { getAdapter } from '../db/adapter.js';

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

export const adminService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const db = getAdapter();

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
      db.query("SELECT COUNT(*) as c FROM purchases WHERE status = 'COMPLETED'"),
      db.query("SELECT COALESCE(SUM(amount_paid), 0) as s FROM purchases WHERE status = 'COMPLETED'"),
      db.query("SELECT COALESCE(SUM(amount), 0) as s FROM wallet_transactions WHERE type = 'RECHARGE'"),
      db.query("SELECT COUNT(*) as c FROM wallet_transactions"),
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
  }): Promise<string> {
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = slug;
    const pricePaise = Math.round(data.priceRupees * 100);

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
      price: pricePaise,
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

  async updatePrice(id: string, priceRupees: number): Promise<void> {
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
    await contentRepository.updatePrice(existing.id, Math.round(priceRupees * 100));
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
};

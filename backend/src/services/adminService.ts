import { contentRepository, ContentRecord } from '../repositories/contentRepository.js';
import { getDatabase } from '../db/connection.js';

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
  getDashboardStats(): DashboardStats {
    const db = getDatabase();

    const totalUsers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'USER'").get() as any).c;
    const totalMovies = (db.prepare("SELECT COUNT(*) as c FROM content WHERE type = 'MOVIE'").get() as any).c;
    const totalSeries = (db.prepare("SELECT COUNT(*) as c FROM content WHERE type = 'SERIES'").get() as any).c;
    const totalPublished = (db.prepare("SELECT COUNT(*) as c FROM content WHERE status = 'PUBLISHED'").get() as any).c;
    const totalUnpublished = (db.prepare("SELECT COUNT(*) as c FROM content WHERE status != 'PUBLISHED'").get() as any).c;
    const totalPurchases = (db.prepare("SELECT COUNT(*) as c FROM purchases WHERE status = 'COMPLETED'").get() as any).c;
    const revenueRow = db.prepare("SELECT COALESCE(SUM(amount_paid), 0) as s FROM purchases WHERE status = 'COMPLETED'").get() as any;
    const totalRevenueRupees = Math.round((revenueRow.s || 0) / 100);

    const rechargeRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as s, COUNT(*) as c FROM wallet_transactions WHERE type = 'RECHARGE'").get() as any;
    const totalRechargeRupees = Math.round((rechargeRow.s || 0) / 100);
    const totalTransactions = (db.prepare("SELECT COUNT(*) as c FROM wallet_transactions").get() as any).c;

    const trending1Row = db.prepare(`
      SELECT id, title, type, poster, backdrop, price, release_year
      FROM content
      WHERE trending_position = 1
      LIMIT 1;
    `).get() as any;

    const currentTrending1 = trending1Row
      ? {
          id: trending1Row.id,
          title: trending1Row.title,
          type: trending1Row.type,
          poster: trending1Row.poster,
          backdrop: trending1Row.backdrop,
          priceRupees: Math.round(trending1Row.price / 100),
          releaseYear: trending1Row.release_year
        }
      : null;

    const recentlyAddedRows = db.prepare(`
      SELECT id, title, type, status, poster, price, release_year, created_at
      FROM content
      ORDER BY created_at DESC
      LIMIT 6;
    `).all() as any[];

    const recentlyAddedContent = recentlyAddedRows.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      status: r.status,
      poster: r.poster,
      priceRupees: Math.round(r.price / 100),
      releaseYear: r.release_year,
      createdAt: r.created_at
    }));

    const recentPurchasesRaw = db.prepare(`
      SELECT p.id, p.amount_paid, p.purchased_at, u.name as user_name, u.email as user_email, c.title as content_title
      FROM purchases p
      JOIN users u ON p.user_id = u.id
      JOIN content c ON p.content_id = c.id
      WHERE p.status = 'COMPLETED'
      ORDER BY p.purchased_at DESC
      LIMIT 6;
    `).all() as any[];

    const recentPurchases = recentPurchasesRaw.map(r => ({
      id: r.id,
      userName: r.user_name,
      userEmail: r.user_email,
      contentTitle: r.content_title,
      amountRupees: Math.round(r.amount_paid / 100),
      purchasedAt: r.purchased_at
    }));

    const recentUsersRaw = db.prepare(`
      SELECT id, name, email, role, status, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 6;
    `).all() as any[];

    const recentUsers = recentUsersRaw.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.created_at
    }));

    return {
      totalUsers,
      totalMovies,
      totalSeries,
      totalPublished,
      totalUnpublished,
      totalPurchases,
      totalRevenueRupees,
      walletActivity: {
        totalRechargeRupees,
        totalTransactions
      },
      currentTrending1,
      recentlyAddedContent,
      recentPurchases,
      recentUsers
    };
  },

  getAllUsers(): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.status, 
        u.created_at, 
        w.balance,
        (SELECT COUNT(*) FROM purchases p WHERE p.user_id = u.id AND p.status = 'COMPLETED') as purchase_count
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      ORDER BY u.created_at DESC;
    `).all().map((u: any) => ({
      ...u,
      balanceRupees: u.balance ? Math.round(u.balance / 100) : 0,
      purchaseCount: Number(u.purchase_count || 0)
    }));
  },

  getAllTransactions(limit: number = 100): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT wt.*, u.name as user_name, u.email as user_email
      FROM wallet_transactions wt
      JOIN users u ON wt.user_id = u.id
      ORDER BY wt.created_at DESC
      LIMIT ?;
    `).all(limit).map((tx: any) => ({
      ...tx,
      amountRupees: Math.round(tx.amount / 100),
      balanceAfterRupees: Math.round(tx.balance_after / 100)
    }));
  },

  createContent(
    data: {
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
    }
  ): string {
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
      cast_json: JSON.stringify(data.cast || [])
    };

    contentRepository.createContent(record, data.genreIds || []);

    if (data.trendingPosition) {
      contentRepository.setTrendingPosition(id, data.trendingPosition);
    }

    return id;
  },

  updateContent(id: string, updates: Partial<ContentRecord> & { genreIds?: string[]; priceRupees?: number } & Record<string, any>): void {
    const existing = contentRepository.findByIdOrSlug(id);
    if (!existing) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const anyUpdates = updates as Record<string, any>;

    // Map Poster & Backdrop (supports posterUrl, poster_url, backdropUrl, backdrop_url)
    if (updates.poster === undefined) {
      if (anyUpdates.posterUrl !== undefined) updates.poster = anyUpdates.posterUrl;
      else if (anyUpdates.poster_url !== undefined) updates.poster = anyUpdates.poster_url;
    }
    if (updates.backdrop === undefined) {
      if (anyUpdates.backdropUrl !== undefined) updates.backdrop = anyUpdates.backdropUrl;
      else if (anyUpdates.backdrop_url !== undefined) updates.backdrop = anyUpdates.backdrop_url;
    }

    // Map other frontend field aliases if present
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

    contentRepository.updateContent(existing.id, updates);

    if (updates.trending_position !== undefined) {
      contentRepository.setTrendingPosition(existing.id, updates.trending_position);
    }

    if (updates.genreIds && Array.isArray(updates.genreIds)) {
      contentRepository.syncGenres(existing.id, updates.genreIds);
    }
  },

  setTrendingPosition(id: string, position: number | null): void {
    const existing = contentRepository.findByIdOrSlug(id);
    if (!existing) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    contentRepository.setTrendingPosition(existing.id, position);
  },

  deleteContent(id: string): void {
    const existing = contentRepository.findByIdOrSlug(id);
    if (!existing) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    contentRepository.deleteContent(existing.id);
  },

  updateStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'): void {
    const existing = contentRepository.findByIdOrSlug(id);
    if (!existing) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    contentRepository.updateStatus(existing.id, status);
  },

  updatePrice(id: string, priceRupees: number): void {
    const existing = contentRepository.findByIdOrSlug(id);
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

    const pricePaise = Math.round(priceRupees * 100);
    contentRepository.updatePrice(existing.id, pricePaise);
  },

  createGenre(name: string, slug?: string): string {
    const cleanName = name.trim();
    const cleanSlug = (slug || cleanName).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = `genre-${cleanSlug}`;
    contentRepository.createGenre(id, cleanName, cleanSlug);
    return id;
  },

  createSeason(contentId: string, seasonNumber: number, title: string): string {
    const existing = contentRepository.findByIdOrSlug(contentId);
    if (!existing) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const seasonId = `${existing.id}-s${seasonNumber}`;
    contentRepository.createSeason({
      id: seasonId,
      contentId: existing.id,
      seasonNumber,
      title
    });
    return seasonId;
  },

  updateSeason(seasonId: string, title: string, seasonNumber?: number): void {
    contentRepository.updateSeason(seasonId, title, seasonNumber);
  },

  deleteSeason(seasonId: string): void {
    contentRepository.deleteSeason(seasonId);
  },

  createEpisode(
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
  ): string {
    const id = `${seasonId}-e${episode.episodeNumber}`;
    contentRepository.createEpisode({
      id,
      seasonId,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      description: episode.description,
      thumbnail: episode.thumbnail,
      duration: episode.duration,
      durationSeconds: episode.durationSeconds,
      videoUrl: episode.videoUrl
    });
    return id;
  },

  updateEpisode(episodeId: string, updates: any): void {
    contentRepository.updateEpisode(episodeId, updates);
  },

  deleteEpisode(episodeId: string): void {
    contentRepository.deleteEpisode(episodeId);
  },

  listAllContent(filters: {
    status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'ALL';
    type?: 'MOVIE' | 'SERIES';
    genreSlug?: string;
    featured?: boolean;
    trendingOnly?: boolean;
    search?: string;
    sortBy?: 'newest' | 'oldest' | 'title' | 'price_asc' | 'price_desc' | 'featured' | 'priority';
    limit?: number;
    offset?: number;
  } = {}): any[] {
    const rawItems = contentRepository.list(filters);
    return rawItems.map(item => ({
      ...item,
      priceRupees: Math.round(item.price / 100),
      isFree: item.price === 0,
      isFeatured: Boolean(item.featured),
      isTrending1: item.trending_position === 1,
      posterUrl: item.poster,
      backdropUrl: item.backdrop,
      trailerUrl: item.trailer_url,
      videoUrl: item.video_url
    }));
  },

  updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED'): void {
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!existing) {
      const err = new Error('User not found.');
      (err as any).statusCode = 404;
      throw err;
    }
    db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), userId);
  },

  getUserPurchases(userId: string): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        p.id, 
        p.amount_paid, 
        p.status, 
        p.purchased_at, 
        c.id as content_id, 
        c.title as content_title, 
        c.type as content_type, 
        c.poster as content_poster
      FROM purchases p
      JOIN content c ON p.content_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.purchased_at DESC;
    `).all(userId).map((r: any) => ({
      ...r,
      amountRupees: Math.round(r.amount_paid / 100)
    }));
  },

  getUserTransactions(userId: string): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT *
      FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC;
    `).all(userId).map((tx: any) => ({
      ...tx,
      amountRupees: Math.round(tx.amount / 100),
      balanceAfterRupees: Math.round(tx.balance_after / 100)
    }));
  },

  getAllPurchases(limit: number = 100, offset: number = 0): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        p.id,
        p.user_id,
        p.content_id,
        p.amount_paid,
        p.status,
        p.purchased_at,
        u.name as user_name,
        u.email as user_email,
        c.title as content_title,
        c.type as content_type,
        c.poster as content_poster
      FROM purchases p
      JOIN users u ON p.user_id = u.id
      JOIN content c ON p.content_id = c.id
      ORDER BY p.purchased_at DESC
      LIMIT ? OFFSET ?;
    `).all(limit, offset).map((r: any) => ({
      ...r,
      amountRupees: Math.round(r.amount_paid / 100)
    }));
  },

  getAllGenresWithCounts(): any[] {
    return contentRepository.getGenresWithCounts();
  },

  updateGenre(id: string, name: string, slug?: string): void {
    contentRepository.updateGenre(id, name, slug);
  },

  deleteGenre(id: string): void {
    contentRepository.deleteGenre(id);
  },

  getSettings(): Record<string, string> {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM app_settings;').all() as Array<{ key: string; value: string }>;
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  },

  updateSettings(settings: Record<string, string>): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
    `);

    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, String(value), now);
    }
  },

  getHero(): ContentRecord | null {
    return contentRepository.getHero();
  },

  setHero(contentId: string | null): void {
    contentRepository.setHero(contentId);
  },

  getAdsConfig() {
    const settings = this.getSettings();
    return {
      enabled: settings.ad_enabled === 'true',
      type: ((settings.ad_type || 'IMAGE').toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO',
      mediaUrl: settings.ad_media_url || '',
      durationSeconds: parseInt(settings.ad_duration_seconds || '10', 10) || 10,
      skipEnabled: settings.ad_skip_enabled !== 'false',
      skipAfterSeconds: parseInt(settings.ad_skip_after_seconds || '5', 10) || 5,
      title: settings.ad_title || 'Advertisement',
      clickUrl: settings.ad_click_url || ''
    };
  },

  updateAdsConfig(config: {
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
    if (config.enabled !== undefined) toUpdate.ad_enabled = String(config.enabled);
    if (config.type !== undefined) toUpdate.ad_type = String(config.type);
    if (config.mediaUrl !== undefined) toUpdate.ad_media_url = String(config.mediaUrl);
    if (config.durationSeconds !== undefined) toUpdate.ad_duration_seconds = String(config.durationSeconds);
    if (config.skipEnabled !== undefined) toUpdate.ad_skip_enabled = String(config.skipEnabled);
    if (config.skipAfterSeconds !== undefined) toUpdate.ad_skip_after_seconds = String(config.skipAfterSeconds);
    if (config.title !== undefined) toUpdate.ad_title = String(config.title);
    if (config.clickUrl !== undefined) toUpdate.ad_click_url = String(config.clickUrl);

    this.updateSettings(toUpdate);
    return this.getAdsConfig();
  }
};


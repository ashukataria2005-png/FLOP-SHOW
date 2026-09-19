import { getAdapter } from '../db/adapter.js';

export interface ContentRecord {
  id: string;
  type: 'MOVIE' | 'SERIES';
  title: string;
  slug: string;
  description: string;
  poster: string;
  backdrop: string;
  trailer_url: string | null;
  video_url: string | null;
  price: number;
  custom_price?: number | null;
  priceRupees?: number;
  customPriceRupees?: number | null;
  language: string;
  release_year: number;
  duration: string | null;
  age_rating: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  featured: number;
  trending_position: number | null;
  display_priority: number;
  category_label: string | null;
  tagline: string | null;
  about: string | null;
  rating: number;
  director: string | null;
  cast_json: string;
  created_at: string;
  updated_at: string;
  is_hero?: number;
  vcdn_video_id?: string | null;
  vcdn_status?: string | null;
  vcdn_playback_url?: string | null;
  vcdn_embed_url?: string | null;
  vcdn_thumbnail_url?: string | null;
  media_provider?: string | null;
  genres?: string[]; // array of genre names
}

export async function getDefaultPrices(): Promise<{ defaultMoviePrice: number; defaultSeriesPrice: number }> {
  try {
    const db = getAdapter();
    const { rows } = await db.query(
      "SELECT key, value FROM app_settings WHERE key IN ('per_movie_price', 'per_series_price');"
    );
    let defaultMoviePrice = 30;
    let defaultSeriesPrice = 35;
    for (const r of rows as { key: string; value: string }[]) {
      if (r.key === 'per_movie_price') defaultMoviePrice = parseInt(r.value, 10) || 30;
      if (r.key === 'per_series_price') defaultSeriesPrice = parseInt(r.value, 10) || 35;
    }
    return { defaultMoviePrice, defaultSeriesPrice };
  } catch {
    return { defaultMoviePrice: 30, defaultSeriesPrice: 35 };
  }
}

export function resolveContentPricing(
  r: ContentRecord,
  defaults: { defaultMoviePrice: number; defaultSeriesPrice: number }
): ContentRecord & { priceRupees: number; customPriceRupees: number | null } {
  // Free content (price === 0)
  if (r.price === 0) {
    return {
      ...r,
      price: 0,
      priceRupees: 0,
      custom_price: null,
      customPriceRupees: null
    };
  }

  // Individual/Custom Override Price (> 0)
  if (r.custom_price !== null && r.custom_price !== undefined && Number(r.custom_price) > 0) {
    const cpPaise = Number(r.custom_price);
    const cpRupees = Math.round(cpPaise / 100);
    return {
      ...r,
      price: cpPaise,
      priceRupees: cpRupees,
      custom_price: cpPaise,
      customPriceRupees: cpRupees
    };
  }

  // Fallback to central system defaults
  const defaultRupees = r.type === 'SERIES' ? defaults.defaultSeriesPrice : defaults.defaultMoviePrice;
  const defaultPaise = defaultRupees * 100;
  return {
    ...r,
    price: defaultPaise,
    priceRupees: defaultRupees,
    custom_price: null,
    customPriceRupees: null
  };
}

export interface GenreRecord {
  id: string;
  name: string;
  slug: string;
}

export interface SeasonRecord {
  id: string;
  content_id: string;
  season_number: number;
  title: string;
  created_at: string;
  episodes?: EpisodeRecord[];
}

export interface EpisodeRecord {
  id: string;
  season_id: string;
  episode_number: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  duration: string | null;
  duration_seconds: number;
  video_url: string;
  vcdn_video_id?: string | null;
  vcdn_status?: string | null;
  vcdn_playback_url?: string | null;
  vcdn_embed_url?: string | null;
  vcdn_thumbnail_url?: string | null;
  media_provider?: string | null;
  created_at: string;
  updated_at: string;
}

export const contentRepository = {
  getDefaultPrices,
  resolveContentPricing,

  async list(
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
  ): Promise<ContentRecord[]> {
    const db = getAdapter();
    const joinParams: (string | number)[] = [];
    const whereConditions: string[] = [];
    const whereParams: (string | number)[] = [];

    let genreJoin = '';
    if (filters.genreSlug && filters.genreSlug.toLowerCase() !== 'all') {
      genreJoin = `
        JOIN content_genres cg ON c.id = cg.content_id
        JOIN genres g ON cg.genre_id = g.id AND (g.slug = ? OR g.name = ?)
      `;
      joinParams.push(filters.genreSlug.toLowerCase(), filters.genreSlug);
    }

    if (filters.status && filters.status !== 'ALL') {
      whereConditions.push('c.status = ?');
      whereParams.push(filters.status);
    } else if (!filters.status) {
      whereConditions.push("c.status = 'PUBLISHED'");
    }

    if (filters.type) {
      whereConditions.push('c.type = ?');
      whereParams.push(filters.type);
    }

    if (filters.featured !== undefined) {
      whereConditions.push('c.featured = ?');
      whereParams.push(filters.featured ? 1 : 0);
    }

    if (filters.trendingOnly) {
      whereConditions.push('c.trending_position IS NOT NULL');
    }

    if (filters.search && filters.search.trim() !== '') {
      whereConditions.push('(c.title LIKE ? OR c.description LIKE ? OR c.director LIKE ? OR c.slug LIKE ?)');
      const term = `%${filters.search.trim()}%`;
      whereParams.push(term, term, term, term);
    }

    let orderBy = 'c.featured DESC, c.release_year DESC, c.created_at DESC';
    if (filters.sortBy === 'newest') {
      orderBy = 'c.created_at DESC, c.release_year DESC';
    } else if (filters.sortBy === 'oldest') {
      orderBy = 'c.created_at ASC, c.release_year ASC';
    } else if (filters.sortBy === 'title') {
      orderBy = 'c.title ASC';
    } else if (filters.sortBy === 'price_asc') {
      orderBy = 'c.price ASC';
    } else if (filters.sortBy === 'price_desc') {
      orderBy = 'c.price DESC';
    } else if (filters.sortBy === 'priority') {
      orderBy = 'c.display_priority DESC, c.created_at DESC';
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const limit = filters.limit !== undefined ? filters.limit : 1000;
    const offset = filters.offset || 0;

    const sql = `
      SELECT DISTINCT c.*,
             COALESCE((SELECT url FROM media WHERE content_id = c.id AND media_type = 'MAIN' AND is_active = 1 ORDER BY created_at DESC LIMIT 1), c.video_url) as video_url,
             COALESCE((SELECT url FROM media WHERE content_id = c.id AND media_type = 'TRAILER' AND is_active = 1 ORDER BY created_at DESC LIMIT 1), c.trailer_url) as trailer_url
      FROM content c
      ${genreJoin}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?;
    `;

    const allParams = [...joinParams, ...whereParams, limit, offset];
    const { rows } = await db.query(sql, allParams);

    const records = rows as ContentRecord[];
    if (records.length === 0) return [];

    // Batch fetch genres for all content items in a single query
    const contentIds = records.map(r => r.id);
    const placeholders = contentIds.map(() => '?').join(', ');
    const { rows: genreRows } = await db.query(
      `SELECT cg.content_id, g.name
       FROM genres g
       JOIN content_genres cg ON g.id = cg.genre_id
       WHERE cg.content_id IN (${placeholders})
       ORDER BY g.name ASC;`,
      contentIds
    );

    const genresByContentId = new Map<string, string[]>();
    for (const gr of genreRows as { content_id: string; name: string }[]) {
      if (!genresByContentId.has(gr.content_id)) {
        genresByContentId.set(gr.content_id, []);
      }
      genresByContentId.get(gr.content_id)!.push(gr.name);
    }

    const defaultPrices = await getDefaultPrices();
    return records.map(r => resolveContentPricing({
      ...r,
      genres: genresByContentId.get(r.id) || []
    }, defaultPrices));
  },

  async findByIdOrSlug(idOrSlug: string): Promise<ContentRecord | null> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT c.*,
              COALESCE((SELECT url FROM media WHERE content_id = c.id AND media_type = 'MAIN' AND is_active = 1 ORDER BY created_at DESC LIMIT 1), c.video_url) as video_url,
              COALESCE((SELECT url FROM media WHERE content_id = c.id AND media_type = 'TRAILER' AND is_active = 1 ORDER BY created_at DESC LIMIT 1), c.trailer_url) as trailer_url
       FROM content c WHERE c.id = ? OR c.slug = ?;`,
      [idOrSlug, idOrSlug]
    );
    if (!rows[0]) return null;
    const row = rows[0] as ContentRecord;
    const defaultPrices = await getDefaultPrices();
    return resolveContentPricing({
      ...row,
      genres: await contentRepository.getGenresForContent(row.id),
    }, defaultPrices);
  },

  async search(
    query: string,
    options: { type?: 'MOVIE' | 'SERIES'; genreSlug?: string } = {}
  ): Promise<ContentRecord[]> {
    const db = getAdapter();
    const joinParams: (string | number)[] = [];
    const whereConditions: string[] = ["UPPER(c.status) = 'PUBLISHED'"];
    const whereParams: (string | number)[] = [];

    let genreJoin = '';
    if (options.genreSlug && options.genreSlug.toLowerCase() !== 'all') {
      genreJoin = `
        JOIN content_genres cg ON c.id = cg.content_id
        JOIN genres g ON cg.genre_id = g.id AND (g.slug = ? OR g.name = ?)
      `;
      joinParams.push(options.genreSlug.toLowerCase(), options.genreSlug);
    }

    if (query.trim() !== '') {
      whereConditions.push(`(
        LOWER(c.title) LIKE ? OR
        LOWER(c.description) LIKE ? OR
        LOWER(c.director) LIKE ? OR
        LOWER(c.cast_json) LIKE ?
      )`);
      const term = `%${query.trim().toLowerCase()}%`;
      whereParams.push(term, term, term, term);
    }

    if (options.type) {
      whereConditions.push('c.type = ?');
      whereParams.push(options.type);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    const sql = `
      SELECT DISTINCT c.*
      FROM content c
      ${genreJoin}
      ${whereClause}
      ORDER BY c.featured DESC, c.release_year DESC;
    `;

    const allParams = [...joinParams, ...whereParams];
    const { rows } = await db.query(sql, allParams);
    const records = rows as ContentRecord[];
    const defaultPrices = await getDefaultPrices();
    return Promise.all(records.map(async r => resolveContentPricing({
      ...r,
      genres: await contentRepository.getGenresForContent(r.id),
    }, defaultPrices)));
  },

  async getGenresForContent(contentId: string): Promise<string[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT g.name
       FROM genres g
       JOIN content_genres cg ON g.id = cg.genre_id
       WHERE cg.content_id = ?
       ORDER BY g.name ASC;`,
      [contentId]
    );
    return (rows as { name: string }[]).map(r => r.name);
  },

  async getAllGenres(): Promise<GenreRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(`SELECT * FROM genres ORDER BY name ASC;`);
    return rows as GenreRecord[];
  },

  async getSeasonsWithEpisodes(contentId: string): Promise<SeasonRecord[]> {
    const db = getAdapter();
    const { rows: seasonRows } = await db.query(
      `SELECT * FROM seasons WHERE content_id = ? ORDER BY season_number ASC;`,
      [contentId]
    );
    const seasons = seasonRows as SeasonRecord[];

    for (const s of seasons) {
      const { rows: episodeRows } = await db.query(
        `SELECT e.*,
                COALESCE((SELECT url FROM media WHERE episode_id = e.id AND media_type = 'MAIN' AND is_active = 1 ORDER BY created_at DESC LIMIT 1), e.video_url) as video_url
         FROM episodes e WHERE season_id = ? ORDER BY episode_number ASC;`,
        [s.id]
      );
      s.episodes = episodeRows as EpisodeRecord[];
    }

    return seasons;
  },

  async createContent(
    item: Omit<ContentRecord, 'created_at' | 'updated_at'>,
    genreIds: string[] = []
  ): Promise<void> {
    const db = getAdapter();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO content (
         id, type, title, slug, description, poster, backdrop,
         trailer_url, video_url, price, custom_price, language, release_year,
         duration, age_rating, status, featured, category_label,
         tagline, about, rating, director, cast_json,
         vcdn_video_id, vcdn_status, vcdn_playback_url,
         vcdn_embed_url, vcdn_thumbnail_url, media_provider,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        item.type,
        item.title,
        item.slug,
        item.description,
        item.poster,
        item.backdrop,
        item.trailer_url || null,
        item.video_url || null,
        item.price,
        item.custom_price ?? null,
        item.language || 'Hindi',
        item.release_year,
        item.duration || null,
        item.age_rating || 'U/A 13+',
        item.status || 'PUBLISHED',
        item.featured || 0,
        item.category_label || null,
        item.tagline || null,
        item.about || null,
        item.rating || 8.0,
        item.director || null,
        item.cast_json || '[]',
        item.vcdn_video_id || null,
        item.vcdn_status || null,
        item.vcdn_playback_url || null,
        item.vcdn_embed_url || null,
        item.vcdn_thumbnail_url || null,
        item.media_provider || (item.vcdn_video_id ? 'VCDN' : 'LOCAL'),
        now,
        now,
      ]
    );

    for (const gid of genreIds) {
      await db.run(
        `INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?) ON CONFLICT DO NOTHING;`,
        [item.id, gid]
      );
    }
  },

  async updateContent(id: string, updates: Partial<ContentRecord> & Record<string, any>): Promise<void> {
    const db = getAdapter();

    // Fallback normalisation for poster/backdrop artwork
    if (updates.poster === undefined) {
      if (updates.posterUrl !== undefined) updates.poster = updates.posterUrl;
      else if (updates.poster_url !== undefined) updates.poster = updates.poster_url;
    }
    if (updates.backdrop === undefined) {
      if (updates.backdropUrl !== undefined) updates.backdrop = updates.backdropUrl;
      else if (updates.backdrop_url !== undefined) updates.backdrop = updates.backdrop_url;
    }

    const allowedKeys: (keyof ContentRecord)[] = [
      'title', 'slug', 'description', 'poster', 'backdrop',
      'trailer_url', 'video_url', 'price', 'custom_price', 'language', 'release_year',
      'duration', 'age_rating', 'status', 'featured', 'category_label',
      'tagline', 'about', 'rating', 'director', 'cast_json',
      'vcdn_video_id', 'vcdn_status', 'vcdn_playback_url',
      'vcdn_embed_url', 'vcdn_thumbnail_url', 'media_provider'
    ];

    const setClauses: string[] = [];
    const params: (string | number | null)[] = [];

    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        params.push(updates[key] as string | number | null);
      }
    }

    if (setClauses.length === 0) return;

    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString(), id);

    await db.run(`UPDATE content SET ${setClauses.join(', ')} WHERE id = ?;`, params);
  },

  async updateStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'): Promise<void> {
    const db = getAdapter();
    await db.run(
      `UPDATE content SET status = ?, updated_at = ? WHERE id = ?;`,
      [status, new Date().toISOString(), id]
    );
  },

  async updatePrice(id: string, pricePaise: number, customPricePaise?: number | null): Promise<void> {
    const db = getAdapter();
    if (customPricePaise !== undefined) {
      await db.run(
        `UPDATE content SET price = ?, custom_price = ?, updated_at = ? WHERE id = ?;`,
        [pricePaise, customPricePaise, new Date().toISOString(), id]
      );
    } else {
      await db.run(
        `UPDATE content SET price = ?, updated_at = ? WHERE id = ?;`,
        [pricePaise, new Date().toISOString(), id]
      );
    }
  },

  async createGenre(id: string, name: string, slug: string): Promise<void> {
    const db = getAdapter();
    await db.run(
      `INSERT INTO genres (id, name, slug) VALUES (?, ?, ?) ON CONFLICT DO NOTHING;`,
      [id, name, slug]
    );
  },

  async getGenresWithCounts(): Promise<Array<GenreRecord & { contentCount: number }>> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT g.id, g.name, g.slug, COUNT(cg.content_id) as contentCount
       FROM genres g
       LEFT JOIN content_genres cg ON g.id = cg.genre_id
       GROUP BY g.id, g.name, g.slug
       ORDER BY g.name ASC;`
    );
    return (rows as any[]).map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      contentCount: Number(r.contentcount ?? r.contentCount ?? 0),
    }));
  },

  async updateGenre(id: string, name: string, slug?: string): Promise<void> {
    const db = getAdapter();
    const cleanName = name.trim();
    const cleanSlug = (slug || cleanName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    await db.run(
      `UPDATE genres SET name = ?, slug = ? WHERE id = ?;`,
      [cleanName, cleanSlug, id]
    );
  },

  async deleteGenre(id: string): Promise<void> {
    const db = getAdapter();
    await db.run(`DELETE FROM content_genres WHERE genre_id = ?;`, [id]);
    await db.run(`DELETE FROM genres WHERE id = ?;`, [id]);
  },

  async createSeason(season: {
    id: string;
    contentId: string;
    seasonNumber: number;
    title: string;
  }): Promise<void> {
    const db = getAdapter();
    await db.run(
      `INSERT INTO seasons (id, content_id, season_number, title, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;`,
      [season.id, season.contentId, season.seasonNumber, season.title, new Date().toISOString()]
    );
  },

  async createEpisode(ep: {
    id: string;
    seasonId: string;
    episodeNumber: number;
    title: string;
    description?: string;
    thumbnail?: string;
    duration?: string;
    durationSeconds?: number;
    videoUrl: string;
    vcdnVideoId?: string | null;
    vcdnStatus?: string | null;
    vcdnPlaybackUrl?: string | null;
    vcdnEmbedUrl?: string | null;
    vcdnThumbnailUrl?: string | null;
    mediaProvider?: string | null;
  }): Promise<void> {
    const db = getAdapter();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO episodes
         (id, season_id, episode_number, title, description,
          thumbnail, duration, duration_seconds, video_url,
          vcdn_video_id, vcdn_status, vcdn_playback_url,
          vcdn_embed_url, vcdn_thumbnail_url, media_provider,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         thumbnail = EXCLUDED.thumbnail,
         duration = EXCLUDED.duration,
         duration_seconds = EXCLUDED.duration_seconds,
         video_url = EXCLUDED.video_url,
         vcdn_video_id = COALESCE(EXCLUDED.vcdn_video_id, episodes.vcdn_video_id),
         vcdn_status = COALESCE(EXCLUDED.vcdn_status, episodes.vcdn_status),
         vcdn_playback_url = COALESCE(EXCLUDED.vcdn_playback_url, episodes.vcdn_playback_url),
         vcdn_embed_url = COALESCE(EXCLUDED.vcdn_embed_url, episodes.vcdn_embed_url),
         vcdn_thumbnail_url = COALESCE(EXCLUDED.vcdn_thumbnail_url, episodes.vcdn_thumbnail_url),
         media_provider = COALESCE(EXCLUDED.media_provider, episodes.media_provider),
         updated_at = EXCLUDED.updated_at;`,
      [
        ep.id,
        ep.seasonId,
        ep.episodeNumber,
        ep.title,
        ep.description || null,
        ep.thumbnail || null,
        ep.duration || null,
        ep.durationSeconds || 0,
        ep.videoUrl,
        ep.vcdnVideoId || null,
        ep.vcdnStatus || null,
        ep.vcdnPlaybackUrl || null,
        ep.vcdnEmbedUrl || null,
        ep.vcdnThumbnailUrl || null,
        ep.mediaProvider || (ep.vcdnVideoId ? 'VCDN' : 'LOCAL'),
        now,
        now,
      ]
    );
  },

  async setTrendingPosition(contentId: string, position: number | null): Promise<void> {
    const db = getAdapter();
    const now = new Date().toISOString();

    if (position === 1) {
      await db.run(
        `UPDATE content SET trending_position = NULL WHERE trending_position = 1;`
      );
    }

    await db.run(
      `UPDATE content SET trending_position = ?, updated_at = ? WHERE id = ?;`,
      [position, now, contentId]
    );
  },

  async deleteContent(id: string): Promise<void> {
    const db = getAdapter();
    await db.run(`DELETE FROM content WHERE id = ?;`, [id]);
  },

  async deleteSeason(seasonId: string): Promise<void> {
    const db = getAdapter();
    await db.run(`DELETE FROM seasons WHERE id = ?;`, [seasonId]);
  },

  async deleteEpisode(episodeId: string): Promise<void> {
    const db = getAdapter();
    await db.run(`DELETE FROM episodes WHERE id = ?;`, [episodeId]);
  },

  async updateSeason(seasonId: string, title: string, seasonNumber?: number): Promise<void> {
    const db = getAdapter();
    if (seasonNumber !== undefined) {
      await db.run(
        `UPDATE seasons SET title = ?, season_number = ? WHERE id = ?;`,
        [title, seasonNumber, seasonId]
      );
    } else {
      await db.run(`UPDATE seasons SET title = ? WHERE id = ?;`, [title, seasonId]);
    }
  },

  async updateEpisode(episodeId: string, updates: Partial<EpisodeRecord>): Promise<void> {
    const db = getAdapter();
    const allowedKeys: (keyof EpisodeRecord)[] = [
      'title', 'description', 'thumbnail', 'duration', 'duration_seconds', 'video_url', 'episode_number',
      'vcdn_video_id', 'vcdn_status', 'vcdn_playback_url', 'vcdn_embed_url', 'vcdn_thumbnail_url', 'media_provider'
    ];
    const setClauses: string[] = [];
    const params: (string | number | null)[] = [];

    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        params.push(updates[key] as string | number | null);
      }
    }

    if (setClauses.length === 0) return;
    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString(), episodeId);

    await db.run(
      `UPDATE episodes SET ${setClauses.join(', ')} WHERE id = ?;`,
      params
    );
  },

  async findByVcdnVideoId(vcdnVideoId: string): Promise<ContentRecord | null> {
    const db = getAdapter();
    const { rows } = await db.query(`SELECT * FROM content WHERE vcdn_video_id = ? LIMIT 1;`, [vcdnVideoId]);
    return (rows[0] as ContentRecord) || null;
  },

  async findEpisodeByVcdnVideoId(vcdnVideoId: string): Promise<EpisodeRecord | null> {
    const db = getAdapter();
    const { rows } = await db.query(`SELECT * FROM episodes WHERE vcdn_video_id = ? LIMIT 1;`, [vcdnVideoId]);
    return (rows[0] as EpisodeRecord) || null;
  },

  async updateContentVcdnStatus(
    vcdnVideoId: string,
    status: string,
    playbackUrl?: string,
    embedUrl?: string,
    thumbnailUrl?: string
  ): Promise<void> {
    const db = getAdapter();
    const now = new Date().toISOString();
    const updates: string[] = ['vcdn_status = ?', 'updated_at = ?'];
    const params: any[] = [status, now];

    if (playbackUrl) {
      updates.push('vcdn_playback_url = ?', 'video_url = ?');
      params.push(playbackUrl, playbackUrl);
    }
    if (embedUrl) {
      updates.push('vcdn_embed_url = ?');
      params.push(embedUrl);
    }
    if (thumbnailUrl) {
      updates.push('vcdn_thumbnail_url = ?');
      params.push(thumbnailUrl);
    }
    params.push(vcdnVideoId);

    await db.run(
      `UPDATE content SET ${updates.join(', ')} WHERE vcdn_video_id = ?;`,
      params
    );

    // Also update matching episode if any
    await db.run(
      `UPDATE episodes SET ${updates.join(', ')} WHERE vcdn_video_id = ?;`,
      params
    );
  },

  async isVcdnVideoReferencedElsewhere(vcdnVideoId: string, excludeContentId?: string, excludeEpisodeId?: string): Promise<boolean> {
    const db = getAdapter();
    const { rows: contentRows } = await db.query(
      `SELECT COUNT(*) as cnt FROM content WHERE vcdn_video_id = ? AND id != ?;`,
      [vcdnVideoId, excludeContentId || '']
    );
    const contentCount = parseInt(contentRows[0]?.cnt || '0', 10);

    const { rows: epRows } = await db.query(
      `SELECT COUNT(*) as cnt FROM episodes WHERE vcdn_video_id = ? AND id != ?;`,
      [vcdnVideoId, excludeEpisodeId || '']
    );
    const epCount = parseInt(epRows[0]?.cnt || '0', 10);

    return (contentCount + epCount) > 0;
  },

  async syncGenres(contentId: string, genreIds: string[]): Promise<void> {
    const db = getAdapter();
    await db.run(`DELETE FROM content_genres WHERE content_id = ?;`, [contentId]);
    for (const gid of genreIds) {
      await db.run(
        `INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?) ON CONFLICT DO NOTHING;`,
        [contentId, gid]
      );
    }
  },

  async getHero(): Promise<ContentRecord | null> {
    const db = getAdapter();
    try {
      const { rows: settingRows } = await db.query(
        `SELECT value FROM app_settings WHERE key = 'home_hero_id';`
      );
      const heroId = (settingRows[0] as { value: string } | undefined)?.value?.trim();
      if (heroId) {
        const item = await contentRepository.findByIdOrSlug(heroId);
        if (item && item.status === 'PUBLISHED') {
          return item;
        }
      }

      // Fallback: is_hero = 1
      const { rows } = await db.query(
        `SELECT * FROM content WHERE is_hero = 1 AND status = 'PUBLISHED' LIMIT 1;`
      );
      if (rows[0]) {
        const row = rows[0] as ContentRecord;
        const defaultPrices = await getDefaultPrices();
        return resolveContentPricing({
          ...row,
          genres: await contentRepository.getGenresForContent(row.id),
        }, defaultPrices);
      }
    } catch {
      // Return null on missing tables or columns
    }

    return null;
  },

  async setHero(contentId: string | null): Promise<void> {
    const db = getAdapter();
    const now = new Date().toISOString();

    await db.transaction(async txAdapter => {
      await txAdapter.run(
        `UPDATE content SET is_hero = 0 WHERE is_hero = 1;`
      );

      if (contentId && contentId.trim() !== '') {
        const cleanId = contentId.trim();
        await txAdapter.run(
          `UPDATE content SET is_hero = 1, updated_at = ? WHERE id = ? OR slug = ?;`,
          [now, cleanId, cleanId]
        );
        await txAdapter.run(
          `INSERT INTO app_settings (key, value, updated_at)
           VALUES ('home_hero_id', ?, ?)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;`,
          [cleanId, now]
        );
      } else {
        await txAdapter.run(
          `INSERT INTO app_settings (key, value, updated_at)
           VALUES ('home_hero_id', '', ?)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;`,
          [now]
        );
      }
    });
  },

  async getSpotlights(): Promise<ContentRecord[]> {
    const db = getAdapter();
    try {
      const { rows: settingRows } = await db.query(
        `SELECT key, value FROM app_settings WHERE key IN ('cinematic_spotlight_ids', 'cinematic_spotlight_id');`
      );
      const rowsMap = new Map((settingRows as { key: string; value: string }[]).map(r => [r.key, r.value]));

      let ids: string[] = [];
      const multiVal = rowsMap.get('cinematic_spotlight_ids');
      if (multiVal) {
        try {
          const parsed = JSON.parse(multiVal);
          if (Array.isArray(parsed)) {
            ids = parsed.map(id => String(id).trim()).filter(Boolean);
          }
        } catch {
          ids = multiVal.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      if (ids.length === 0) {
        const singleId = rowsMap.get('cinematic_spotlight_id')?.trim();
        if (singleId) {
          ids = [singleId];
        }
      }

      const uniqueIds = Array.from(new Set(ids));
      const items: ContentRecord[] = [];

      for (const id of uniqueIds) {
        const item = await contentRepository.findByIdOrSlug(id);
        if (item && item.status?.toUpperCase() === 'PUBLISHED') {
          if (!item.genres || item.genres.length === 0) {
            item.genres = await contentRepository.getGenresForContent(item.id);
          }
          items.push(item);
        }
      }

      return items;
    } catch {
      return [];
    }
  },

  async setSpotlights(contentIds: string[]): Promise<void> {
    const db = getAdapter();
    const now = new Date().toISOString();

    const uniqueIds = Array.from(new Set(contentIds.map(id => String(id).trim()).filter(Boolean)));
    const primaryId = uniqueIds[0] || '';
    const jsonValue = JSON.stringify(uniqueIds);

    await db.run(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('cinematic_spotlight_ids', ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;`,
      [jsonValue, now]
    );

    await db.run(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('cinematic_spotlight_id', ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;`,
      [primaryId, now]
    );
  },

  async getSpotlight(): Promise<ContentRecord | null> {
    const spotlights = await this.getSpotlights();
    return spotlights[0] || null;
  },

  async setSpotlight(contentId: string | null): Promise<void> {
    if (contentId && contentId.trim() !== '') {
      await this.setSpotlights([contentId.trim()]);
    } else {
      await this.setSpotlights([]);
    }
  },
};

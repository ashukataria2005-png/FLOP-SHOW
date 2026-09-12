import { getDatabase } from '../db/connection.js';

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
  genres?: string[]; // array of genre names
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
  created_at: string;
  updated_at: string;
}

export const contentRepository = {
  list(filters: {
    status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'ALL';
    type?: 'MOVIE' | 'SERIES';
    genreSlug?: string;
    featured?: boolean;
    trendingOnly?: boolean;
    search?: string;
    sortBy?: 'newest' | 'oldest' | 'title' | 'price_asc' | 'price_desc' | 'featured' | 'priority';
    limit?: number;
    offset?: number;
  } = {}): ContentRecord[] {
    const db = getDatabase();
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
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const sql = `
      SELECT DISTINCT c.*
      FROM content c
      ${genreJoin}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?;
    `;

    const allParams = [...joinParams, ...whereParams, limit, offset];
    const rows = db.prepare(sql).all(...allParams) as ContentRecord[];
    return rows.map(r => ({
      ...r,
      genres: contentRepository.getGenresForContent(r.id)
    }));
  },

  findByIdOrSlug(idOrSlug: string): ContentRecord | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM content WHERE id = ? OR slug = ? COLLATE NOCASE;
    `);
    const row = stmt.get(idOrSlug, idOrSlug) as ContentRecord | undefined;
    if (!row) return null;

    return {
      ...row,
      genres: contentRepository.getGenresForContent(row.id)
    };
  },

  search(
    query: string,
    options: { type?: 'MOVIE' | 'SERIES'; genreSlug?: string } = {}
  ): ContentRecord[] {
    const db = getDatabase();
    const joinParams: (string | number)[] = [];
    const whereConditions: string[] = ["c.status = 'PUBLISHED'"];
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
        c.title LIKE ? OR
        c.description LIKE ? OR
        c.director LIKE ? OR
        c.cast_json LIKE ?
      )`);
      const term = `%${query.trim()}%`;
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
    const rows = db.prepare(sql).all(...allParams) as ContentRecord[];
    return rows.map(r => ({
      ...r,
      genres: contentRepository.getGenresForContent(r.id)
    }));
  },

  getGenresForContent(contentId: string): string[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT g.name
      FROM genres g
      JOIN content_genres cg ON g.id = cg.genre_id
      WHERE cg.content_id = ?
      ORDER BY g.name ASC;
    `);
    const rows = stmt.all(contentId) as { name: string }[];
    return rows.map(r => r.name);
  },

  getAllGenres(): GenreRecord[] {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM genres ORDER BY name ASC;`);
    return stmt.all() as GenreRecord[];
  },

  getSeasonsWithEpisodes(contentId: string): SeasonRecord[] {
    const db = getDatabase();
    const seasonsStmt = db.prepare(`
      SELECT * FROM seasons WHERE content_id = ? ORDER BY season_number ASC;
    `);
    const seasons = seasonsStmt.all(contentId) as SeasonRecord[];

    const episodesStmt = db.prepare(`
      SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number ASC;
    `);

    for (const s of seasons) {
      s.episodes = episodesStmt.all(s.id) as EpisodeRecord[];
    }

    return seasons;
  },

  createContent(item: Omit<ContentRecord, 'created_at' | 'updated_at'>, genreIds: string[] = []): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO content (
        id, type, title, slug, description, poster, backdrop,
        trailer_url, video_url, price, language, release_year,
        duration, age_rating, status, featured, category_label,
        tagline, about, rating, director, cast_json, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      );
    `);

    stmt.run(
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
      now,
      now
    );

    if (genreIds.length > 0) {
      const linkStmt = db.prepare(`
        INSERT OR IGNORE INTO content_genres (content_id, genre_id) VALUES (?, ?);
      `);
      for (const gid of genreIds) {
        linkStmt.run(item.id, gid);
      }
    }
  },

  updateContent(id: string, updates: Partial<ContentRecord> & Record<string, any>): void {
    const db = getDatabase();

    // Fallback normalization for poster and backdrop artwork
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
      'trailer_url', 'video_url', 'price', 'language', 'release_year',
      'duration', 'age_rating', 'status', 'featured', 'category_label',
      'tagline', 'about', 'rating', 'director', 'cast_json'
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
    params.push(new Date().toISOString());
    params.push(id);

    const sql = `UPDATE content SET ${setClauses.join(', ')} WHERE id = ?;`;
    db.prepare(sql).run(...params);
  },

  updateStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE content SET status = ?, updated_at = ? WHERE id = ?;
    `);
    stmt.run(status, new Date().toISOString(), id);
  },

  updatePrice(id: string, pricePaise: number): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE content SET price = ?, updated_at = ? WHERE id = ?;
    `);
    stmt.run(pricePaise, new Date().toISOString(), id);
  },

  createGenre(id: string, name: string, slug: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO genres (id, name, slug) VALUES (?, ?, ?);
    `);
    stmt.run(id, name, slug);
  },

  getGenresWithCounts(): Array<GenreRecord & { contentCount: number }> {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT g.id, g.name, g.slug, COUNT(cg.content_id) as contentCount
      FROM genres g
      LEFT JOIN content_genres cg ON g.id = cg.genre_id
      GROUP BY g.id, g.name, g.slug
      ORDER BY g.name ASC;
    `).all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      contentCount: Number(r.contentCount || 0)
    }));
  },

  updateGenre(id: string, name: string, slug?: string): void {
    const db = getDatabase();
    const cleanName = name.trim();
    const cleanSlug = (slug || cleanName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    db.prepare('UPDATE genres SET name = ?, slug = ? WHERE id = ?;').run(cleanName, cleanSlug, id);
  },

  deleteGenre(id: string): void {
    const db = getDatabase();
    // Safely remove relations first, then delete genre
    db.prepare('DELETE FROM content_genres WHERE genre_id = ?;').run(id);
    db.prepare('DELETE FROM genres WHERE id = ?;').run(id);
  },

  createSeason(season: { id: string; contentId: string; seasonNumber: number; title: string }): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO seasons (id, content_id, season_number, title, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title;
    `);
    stmt.run(season.id, season.contentId, season.seasonNumber, season.title, new Date().toISOString());
  },

  createEpisode(ep: {
    id: string;
    seasonId: string;
    episodeNumber: number;
    title: string;
    description?: string;
    thumbnail?: string;
    duration?: string;
    durationSeconds?: number;
    videoUrl: string;
  }): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO episodes (
        id, season_id, episode_number, title, description,
        thumbnail, duration, duration_seconds, video_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        thumbnail = excluded.thumbnail,
        duration = excluded.duration,
        duration_seconds = excluded.duration_seconds,
        video_url = excluded.video_url,
        updated_at = excluded.updated_at;
    `);
    stmt.run(
      ep.id,
      ep.seasonId,
      ep.episodeNumber,
      ep.title,
      ep.description || null,
      ep.thumbnail || null,
      ep.duration || null,
      ep.durationSeconds || 0,
      ep.videoUrl,
      now,
      now
    );
  },

  setTrendingPosition(contentId: string, position: number | null): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    // If setting position = 1, atomically clear position 1 from any previous title
    if (position === 1) {
      db.prepare('UPDATE content SET trending_position = NULL WHERE trending_position = 1;').run();
    }

    db.prepare(`
      UPDATE content 
      SET trending_position = ?, updated_at = ? 
      WHERE id = ?;
    `).run(position, now, contentId);
  },

  deleteContent(id: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM content WHERE id = ?;').run(id);
  },

  deleteSeason(seasonId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM seasons WHERE id = ?;').run(seasonId);
  },

  deleteEpisode(episodeId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM episodes WHERE id = ?;').run(episodeId);
  },

  updateSeason(seasonId: string, title: string, seasonNumber?: number): void {
    const db = getDatabase();
    if (seasonNumber !== undefined) {
      db.prepare('UPDATE seasons SET title = ?, season_number = ? WHERE id = ?;')
        .run(title, seasonNumber, seasonId);
    } else {
      db.prepare('UPDATE seasons SET title = ? WHERE id = ?;')
        .run(title, seasonId);
    }
  },

  updateEpisode(episodeId: string, updates: Partial<EpisodeRecord>): void {
    const db = getDatabase();
    const allowedKeys: (keyof EpisodeRecord)[] = [
      'title', 'description', 'thumbnail', 'duration', 'duration_seconds', 'video_url', 'episode_number'
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
    params.push(new Date().toISOString());
    params.push(episodeId);

    const sql = `UPDATE episodes SET ${setClauses.join(', ')} WHERE id = ?;`;
    db.prepare(sql).run(...params);
  },

  syncGenres(contentId: string, genreIds: string[]): void {
    const db = getDatabase();
    db.prepare('DELETE FROM content_genres WHERE content_id = ?;').run(contentId);
    if (genreIds.length > 0) {
      const linkStmt = db.prepare('INSERT OR IGNORE INTO content_genres (content_id, genre_id) VALUES (?, ?);');
      for (const gid of genreIds) {
        linkStmt.run(contentId, gid);
      }
    }
  }
};

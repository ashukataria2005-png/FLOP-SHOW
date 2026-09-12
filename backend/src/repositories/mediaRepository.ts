import { getDatabase } from '../db/connection.js';

export interface MediaRecord {
  id: string;
  content_id: string | null;
  episode_id: string | null;
  media_type: 'MAIN' | 'TRAILER';
  source_type: 'UPLOAD' | 'DIRECT_URL' | 'YOUTUBE';
  url: string;
  mime_type: string | null;
  duration: string | null;
  duration_seconds: number;
  thumbnail: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export const mediaRepository = {
  create(media: {
    id: string;
    contentId?: string | null;
    episodeId?: string | null;
    mediaType: 'MAIN' | 'TRAILER';
    sourceType: 'UPLOAD' | 'DIRECT_URL' | 'YOUTUBE';
    url: string;
    mimeType?: string | null;
    duration?: string | null;
    durationSeconds?: number;
    thumbnail?: string | null;
    isActive?: number;
    now: string;
  }): void {
    const db = getDatabase();

    // If active, optionally deactivate other media of the same type for this target
    if (media.isActive !== 0) {
      if (media.contentId) {
        db.prepare(`
          UPDATE media SET is_active = 0 
          WHERE content_id = ? AND media_type = ?;
        `).run(media.contentId, media.mediaType);
      } else if (media.episodeId) {
        db.prepare(`
          UPDATE media SET is_active = 0 
          WHERE episode_id = ? AND media_type = ?;
        `).run(media.episodeId, media.mediaType);
      }
    }

    const stmt = db.prepare(`
      INSERT INTO media (
        id, content_id, episode_id, media_type, source_type,
        url, mime_type, duration, duration_seconds, thumbnail,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      media.id,
      media.contentId || null,
      media.episodeId || null,
      media.mediaType,
      media.sourceType,
      media.url,
      media.mimeType || null,
      media.duration || null,
      media.durationSeconds || 0,
      media.thumbnail || null,
      media.isActive ?? 1,
      media.now,
      media.now
    );
  },

  update(id: string, updates: Partial<MediaRecord>): void {
    const db = getDatabase();
    const allowedKeys: (keyof MediaRecord)[] = [
      'url', 'source_type', 'media_type', 'mime_type',
      'duration', 'duration_seconds', 'thumbnail', 'is_active'
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

    const sql = `UPDATE media SET ${setClauses.join(', ')} WHERE id = ?;`;
    db.prepare(sql).run(...params);
  },

  delete(id: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM media WHERE id = ?;').run(id);
  },

  findById(id: string): MediaRecord | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM media WHERE id = ?;').get(id) as MediaRecord | undefined;
    return row || null;
  },

  getMediaForContent(contentId: string, mediaType?: 'MAIN' | 'TRAILER'): MediaRecord[] {
    const db = getDatabase();
    if (mediaType) {
      const stmt = db.prepare(`
        SELECT * FROM media 
        WHERE content_id = ? AND media_type = ?
        ORDER BY is_active DESC, created_at DESC;
      `);
      return stmt.all(contentId, mediaType) as MediaRecord[];
    } else {
      const stmt = db.prepare(`
        SELECT * FROM media 
        WHERE content_id = ? 
        ORDER BY is_active DESC, created_at DESC;
      `);
      return stmt.all(contentId) as MediaRecord[];
    }
  },

  getActiveMediaForContent(contentId: string, mediaType: 'MAIN' | 'TRAILER'): MediaRecord | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM media 
      WHERE content_id = ? AND media_type = ? AND is_active = 1
      ORDER BY created_at DESC
      LIMIT 1;
    `);
    return (stmt.get(contentId, mediaType) as MediaRecord) || null;
  },

  getMediaForEpisode(episodeId: string, mediaType?: 'MAIN' | 'TRAILER'): MediaRecord[] {
    const db = getDatabase();
    if (mediaType) {
      const stmt = db.prepare(`
        SELECT * FROM media 
        WHERE episode_id = ? AND media_type = ?
        ORDER BY is_active DESC, created_at DESC;
      `);
      return stmt.all(episodeId, mediaType) as MediaRecord[];
    } else {
      const stmt = db.prepare(`
        SELECT * FROM media 
        WHERE episode_id = ?
        ORDER BY is_active DESC, created_at DESC;
      `);
      return stmt.all(episodeId) as MediaRecord[];
    }
  },

  getActiveMediaForEpisode(episodeId: string, mediaType: 'MAIN' | 'TRAILER'): MediaRecord | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM media 
      WHERE episode_id = ? AND media_type = ? AND is_active = 1
      ORDER BY created_at DESC
      LIMIT 1;
    `);
    return (stmt.get(episodeId, mediaType) as MediaRecord) || null;
  }
};

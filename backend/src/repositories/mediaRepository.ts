import { getAdapter } from '../db/adapter.js';

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
  vcdn_video_id?: string | null;
  vcdn_status?: string | null;
  vcdn_playback_url?: string | null;
  vcdn_embed_url?: string | null;
  vcdn_thumbnail_url?: string | null;
  media_provider?: string | null;
  created_at: string;
  updated_at: string;
}

export const mediaRepository = {
  async create(media: {
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
    vcdnVideoId?: string | null;
    vcdnStatus?: string | null;
    vcdnPlaybackUrl?: string | null;
    vcdnEmbedUrl?: string | null;
    vcdnThumbnailUrl?: string | null;
    mediaProvider?: string | null;
    now: string;
  }): Promise<void> {
    const db = getAdapter();

    // If active, deactivate other media of the same type for this target
    if (media.isActive !== 0) {
      if (media.contentId) {
        await db.run(
          `UPDATE media SET is_active = 0 WHERE content_id = ? AND media_type = ?;`,
          [media.contentId, media.mediaType]
        );
      } else if (media.episodeId) {
        await db.run(
          `UPDATE media SET is_active = 0 WHERE episode_id = ? AND media_type = ?;`,
          [media.episodeId, media.mediaType]
        );
      }
    }

    await db.run(
      `INSERT INTO media
         (id, content_id, episode_id, media_type, source_type,
          url, mime_type, duration, duration_seconds, thumbnail,
          is_active, vcdn_video_id, vcdn_status, vcdn_playback_url,
          vcdn_embed_url, vcdn_thumbnail_url, media_provider,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
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
        media.vcdnVideoId || null,
        media.vcdnStatus || null,
        media.vcdnPlaybackUrl || null,
        media.vcdnEmbedUrl || null,
        media.vcdnThumbnailUrl || null,
        media.mediaProvider || (media.vcdnVideoId ? 'VCDN' : 'LOCAL'),
        media.now,
        media.now,
      ]
    );
  },

  async update(id: string, updates: Partial<MediaRecord>): Promise<void> {
    const db = getAdapter();
    const allowedKeys: (keyof MediaRecord)[] = [
      'url', 'source_type', 'media_type', 'mime_type',
      'duration', 'duration_seconds', 'thumbnail', 'is_active',
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

    await db.run(
      `UPDATE media SET ${setClauses.join(', ')} WHERE id = ?;`,
      params
    );
  },

  async delete(id: string): Promise<void> {
    const db = getAdapter();
    await db.run(`DELETE FROM media WHERE id = ?;`, [id]);
  },

  async findById(id: string): Promise<MediaRecord | null> {
    const db = getAdapter();
    const { rows } = await db.query(`SELECT * FROM media WHERE id = ?;`, [id]);
    return (rows[0] as MediaRecord) || null;
  },

  async findByVcdnVideoId(vcdnVideoId: string): Promise<MediaRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT * FROM media WHERE vcdn_video_id = ? ORDER BY created_at DESC;`,
      [vcdnVideoId]
    );
    return rows as MediaRecord[];
  },

  async updateVcdnStatus(
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
      updates.push('vcdn_playback_url = ?', 'url = ?');
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
      `UPDATE media SET ${updates.join(', ')} WHERE vcdn_video_id = ?;`,
      params
    );
  },

  async isVcdnVideoReferencedElsewhere(vcdnVideoId: string, excludeMediaId?: string): Promise<boolean> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT COUNT(*) as cnt FROM media WHERE vcdn_video_id = ? AND id != ?;`,
      [vcdnVideoId, excludeMediaId || '']
    );
    const count = parseInt(rows[0]?.cnt || '0', 10);
    return count > 0;
  },

  async getMediaForContent(contentId: string, mediaType?: 'MAIN' | 'TRAILER'): Promise<MediaRecord[]> {
    const db = getAdapter();
    if (mediaType) {
      const { rows } = await db.query(
        `SELECT * FROM media WHERE content_id = ? AND media_type = ?
         ORDER BY is_active DESC, created_at DESC;`,
        [contentId, mediaType]
      );
      return rows as MediaRecord[];
    } else {
      const { rows } = await db.query(
        `SELECT * FROM media WHERE content_id = ? ORDER BY is_active DESC, created_at DESC;`,
        [contentId]
      );
      return rows as MediaRecord[];
    }
  },

  async getActiveMediaForContent(contentId: string, mediaType: 'MAIN' | 'TRAILER'): Promise<MediaRecord | null> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT * FROM media
       WHERE content_id = ? AND media_type = ? AND is_active = 1
       ORDER BY created_at DESC
       LIMIT 1;`,
      [contentId, mediaType]
    );
    return (rows[0] as MediaRecord) || null;
  },

  async getMediaForEpisode(episodeId: string, mediaType?: 'MAIN' | 'TRAILER'): Promise<MediaRecord[]> {
    const db = getAdapter();
    if (mediaType) {
      const { rows } = await db.query(
        `SELECT * FROM media WHERE episode_id = ? AND media_type = ?
         ORDER BY is_active DESC, created_at DESC;`,
        [episodeId, mediaType]
      );
      return rows as MediaRecord[];
    } else {
      const { rows } = await db.query(
        `SELECT * FROM media WHERE episode_id = ? ORDER BY is_active DESC, created_at DESC;`,
        [episodeId]
      );
      return rows as MediaRecord[];
    }
  },

  async getActiveMediaForEpisode(episodeId: string, mediaType: 'MAIN' | 'TRAILER'): Promise<MediaRecord | null> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT * FROM media
       WHERE episode_id = ? AND media_type = ? AND is_active = 1
       ORDER BY created_at DESC
       LIMIT 1;`,
      [episodeId, mediaType]
    );
    return (rows[0] as MediaRecord) || null;
  },
};

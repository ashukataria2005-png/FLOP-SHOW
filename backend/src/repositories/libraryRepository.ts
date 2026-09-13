import { getAdapter } from '../db/adapter.js';
import { ContentRecord } from './contentRepository.js';

export interface WatchProgressRecord {
  id: string;
  user_id: string;
  content_id: string;
  episode_id: string | null;
  progress_percent: number;
  current_time_seconds: number;
  duration_seconds: number;
  completed: number;
  updated_at: string;
  title?: string;
  poster?: string;
  type?: 'MOVIE' | 'SERIES';
  episode_title?: string;
}

export interface WatchHistoryRecord {
  id: string;
  user_id: string;
  content_id: string;
  episode_id: string | null;
  watched_at: string;
  title?: string;
  poster?: string;
}

export const libraryRepository = {
  // --------------------------------------------------------------------------
  // MY LIST
  // --------------------------------------------------------------------------
  async addToMyList(id: string, userId: string, contentId: string, createdAt: string): Promise<void> {
    const db = getAdapter();
    await db.run(
      `INSERT INTO my_list (id, user_id, content_id, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, content_id) DO NOTHING;`,
      [id, userId, contentId, createdAt]
    );
  },

  async removeFromMyList(userId: string, contentId: string): Promise<void> {
    const db = getAdapter();
    await db.run(
      `DELETE FROM my_list WHERE user_id = ? AND content_id = ?;`,
      [userId, contentId]
    );
  },

  async isInMyList(userId: string, contentId: string): Promise<boolean> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT 1 FROM my_list WHERE user_id = ? AND content_id = ?;`,
      [userId, contentId]
    );
    return rows.length > 0;
  },

  async getMyList(userId: string): Promise<ContentRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT c.*
       FROM my_list ml
       JOIN content c ON ml.content_id = c.id
       WHERE ml.user_id = ?
       ORDER BY ml.created_at DESC;`,
      [userId]
    );
    return rows as ContentRecord[];
  },

  // --------------------------------------------------------------------------
  // WATCH PROGRESS (Null-Safe Movie vs Episode)
  // --------------------------------------------------------------------------
  async saveProgress(data: {
    id: string;
    userId: string;
    contentId: string;
    episodeId?: string | null;
    progressPercent: number;
    currentTimeSeconds: number;
    durationSeconds: number;
    completed: number;
    updatedAt: string;
  }): Promise<void> {
    const db = getAdapter();
    const episodeId = data.episodeId || null;

    // Check for an existing record
    let existingId: string | null = null;
    if (episodeId === null) {
      const { rows } = await db.query(
        `SELECT id FROM watch_progress WHERE user_id = ? AND content_id = ? AND episode_id IS NULL;`,
        [data.userId, data.contentId]
      );
      existingId = rows[0]?.id || null;
    } else {
      const { rows } = await db.query(
        `SELECT id FROM watch_progress WHERE user_id = ? AND content_id = ? AND episode_id = ?;`,
        [data.userId, data.contentId, episodeId]
      );
      existingId = rows[0]?.id || null;
    }

    if (existingId) {
      await db.run(
        `UPDATE watch_progress
         SET progress_percent = ?, current_time_seconds = ?, duration_seconds = ?,
             completed = ?, updated_at = ?
         WHERE id = ?;`,
        [
          data.progressPercent,
          data.currentTimeSeconds,
          data.durationSeconds,
          data.completed,
          data.updatedAt,
          existingId,
        ]
      );
    } else {
      await db.run(
        `INSERT INTO watch_progress
           (id, user_id, content_id, episode_id,
            progress_percent, current_time_seconds, duration_seconds,
            completed, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          data.id,
          data.userId,
          data.contentId,
          episodeId,
          data.progressPercent,
          data.currentTimeSeconds,
          data.durationSeconds,
          data.completed,
          data.updatedAt,
        ]
      );
    }
  },

  async getProgress(
    userId: string,
    contentId: string,
    episodeId?: string | null
  ): Promise<WatchProgressRecord | null> {
    const db = getAdapter();
    const epId = episodeId || null;

    if (epId === null) {
      const { rows } = await db.query(
        `SELECT * FROM watch_progress WHERE user_id = ? AND content_id = ? AND episode_id IS NULL;`,
        [userId, contentId]
      );
      return (rows[0] as WatchProgressRecord) || null;
    } else {
      const { rows } = await db.query(
        `SELECT * FROM watch_progress WHERE user_id = ? AND content_id = ? AND episode_id = ?;`,
        [userId, contentId, epId]
      );
      return (rows[0] as WatchProgressRecord) || null;
    }
  },

  async getAllProgressForUser(userId: string): Promise<WatchProgressRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT wp.*, c.title, c.poster, c.type, e.title as episode_title
       FROM watch_progress wp
       JOIN content c ON wp.content_id = c.id
       LEFT JOIN episodes e ON wp.episode_id = e.id
       WHERE wp.user_id = ?
       ORDER BY wp.updated_at DESC;`,
      [userId]
    );
    return rows as WatchProgressRecord[];
  },

  // --------------------------------------------------------------------------
  // WATCH HISTORY
  // --------------------------------------------------------------------------
  async addHistory(
    id: string,
    userId: string,
    contentId: string,
    episodeId: string | null,
    watchedAt: string
  ): Promise<void> {
    const db = getAdapter();
    await db.run(
      `INSERT INTO watch_history (id, user_id, content_id, episode_id, watched_at)
       VALUES (?, ?, ?, ?, ?);`,
      [id, userId, contentId, episodeId, watchedAt]
    );
  },

  async getHistory(userId: string, limit = 30): Promise<WatchHistoryRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT wh.*, c.title, c.poster
       FROM watch_history wh
       JOIN content c ON wh.content_id = c.id
       WHERE wh.user_id = ?
       ORDER BY wh.watched_at DESC
       LIMIT ?;`,
      [userId, limit]
    );
    return rows as WatchHistoryRecord[];
  },
};

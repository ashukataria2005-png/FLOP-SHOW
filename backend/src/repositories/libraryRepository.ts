import { getDatabase } from '../db/connection.js';
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
  addToMyList(id: string, userId: string, contentId: string, createdAt: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO my_list (id, user_id, content_id, created_at)
      VALUES (?, ?, ?, ?);
    `);
    stmt.run(id, userId, contentId, createdAt);
  },

  removeFromMyList(userId: string, contentId: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM my_list WHERE user_id = ? AND content_id = ?;
    `);
    stmt.run(userId, contentId);
  },

  isInMyList(userId: string, contentId: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 1 FROM my_list WHERE user_id = ? AND content_id = ?;
    `);
    return !!stmt.get(userId, contentId);
  },

  getMyList(userId: string): ContentRecord[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT c.*
      FROM my_list ml
      JOIN content c ON ml.content_id = c.id
      WHERE ml.user_id = ?
      ORDER BY ml.created_at DESC;
    `);
    return stmt.all(userId) as ContentRecord[];
  },

  // --------------------------------------------------------------------------
  // WATCH PROGRESS (Null-Safe Movie vs Episode)
  // --------------------------------------------------------------------------
  saveProgress(data: {
    id: string;
    userId: string;
    contentId: string;
    episodeId?: string | null;
    progressPercent: number;
    currentTimeSeconds: number;
    durationSeconds: number;
    completed: number;
    updatedAt: string;
  }): void {
    const db = getDatabase();
    const episodeId = data.episodeId || null;

    // Check existing entry based on movie vs episode uniqueness
    let existing: { id: string } | undefined;

    if (episodeId === null) {
      existing = db.prepare(`
        SELECT id FROM watch_progress
        WHERE user_id = ? AND content_id = ? AND episode_id IS NULL;
      `).get(data.userId, data.contentId) as { id: string } | undefined;
    } else {
      existing = db.prepare(`
        SELECT id FROM watch_progress
        WHERE user_id = ? AND content_id = ? AND episode_id = ?;
      `).get(data.userId, data.contentId, episodeId) as { id: string } | undefined;
    }

    if (existing) {
      const updateStmt = db.prepare(`
        UPDATE watch_progress
        SET progress_percent = ?, current_time_seconds = ?, duration_seconds = ?,
            completed = ?, updated_at = ?
        WHERE id = ?;
      `);
      updateStmt.run(
        data.progressPercent,
        data.currentTimeSeconds,
        data.durationSeconds,
        data.completed,
        data.updatedAt,
        existing.id
      );
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO watch_progress (
          id, user_id, content_id, episode_id,
          progress_percent, current_time_seconds, duration_seconds,
          completed, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      insertStmt.run(
        data.id,
        data.userId,
        data.contentId,
        episodeId,
        data.progressPercent,
        data.currentTimeSeconds,
        data.durationSeconds,
        data.completed,
        data.updatedAt
      );
    }
  },

  getProgress(userId: string, contentId: string, episodeId?: string | null): WatchProgressRecord | null {
    const db = getDatabase();
    const epId = episodeId || null;

    let stmt;
    if (epId === null) {
      stmt = db.prepare(`
        SELECT * FROM watch_progress
        WHERE user_id = ? AND content_id = ? AND episode_id IS NULL;
      `);
      return (stmt.get(userId, contentId) as WatchProgressRecord) || null;
    } else {
      stmt = db.prepare(`
        SELECT * FROM watch_progress
        WHERE user_id = ? AND content_id = ? AND episode_id = ?;
      `);
      return (stmt.get(userId, contentId, epId) as WatchProgressRecord) || null;
    }
  },

  getAllProgressForUser(userId: string): WatchProgressRecord[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT wp.*, c.title, c.poster, c.type, e.title as episode_title
      FROM watch_progress wp
      JOIN content c ON wp.content_id = c.id
      LEFT JOIN episodes e ON wp.episode_id = e.id
      WHERE wp.user_id = ?
      ORDER BY wp.updated_at DESC;
    `);
    return stmt.all(userId) as WatchProgressRecord[];
  },

  // --------------------------------------------------------------------------
  // WATCH HISTORY
  // --------------------------------------------------------------------------
  addHistory(id: string, userId: string, contentId: string, episodeId: string | null, watchedAt: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO watch_history (id, user_id, content_id, episode_id, watched_at)
      VALUES (?, ?, ?, ?, ?);
    `);
    stmt.run(id, userId, contentId, episodeId, watchedAt);
  },

  getHistory(userId: string, limit: number = 30): WatchHistoryRecord[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT wh.*, c.title, c.poster
      FROM watch_history wh
      JOIN content c ON wh.content_id = c.id
      WHERE wh.user_id = ?
      ORDER BY wh.watched_at DESC
      LIMIT ?;
    `);
    return stmt.all(userId, limit) as WatchHistoryRecord[];
  }
};

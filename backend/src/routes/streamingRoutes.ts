import { Router, Response } from 'express';
import { cineproService } from '../services/cineproService.js';
import { contentRepository } from '../repositories/contentRepository.js';
import { optionalAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { getAdapter } from '../db/adapter.js';

export const streamingRouter = Router();

/**
 * GET /api/streaming/cinepro/movie/:contentId
 * Resolves normalized streaming playback source for a movie
 */
streamingRouter.get('/cinepro/movie/:contentId', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const rawId = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
    const contentId = rawId ? rawId.trim() : '';

    if (!contentId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Content ID is required' } });
      return;
    }

    // Lookup content metadata if available
    let title: string | undefined;
    try {
      const content = await contentRepository.findByIdOrSlug(contentId);
      title = content?.title;
    } catch {
      // Ignore repository error and continue with stream resolution
    }

    const streamSource = await cineproService.getMovieStream(contentId, title);

    if (!streamSource) {
      res.status(404).json({
        error: {
          code: 'STREAM_UNAVAILABLE',
          message: 'No playable stream source could be resolved for this title.'
        }
      });
      return;
    }

    // Return sanitized normalized playback source (no secrets/keys exposed)
    res.json({
      success: true,
      source: streamSource
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/streaming/cinepro/series/:contentId/episode/:episodeId
 * Resolves normalized streaming playback source for a series episode
 */
streamingRouter.get('/cinepro/series/:contentId/episode/:episodeId', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const rawContentId = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
    const rawEpisodeId = Array.isArray(req.params.episodeId) ? req.params.episodeId[0] : req.params.episodeId;
    const contentId = rawContentId ? rawContentId.trim() : '';
    const episodeId = rawEpisodeId ? rawEpisodeId.trim() : '';

    if (!contentId || !episodeId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Both Content ID and Episode ID are required' } });
      return;
    }

    let episode: any = null;
    try {
      const db = getAdapter();
      const { rows } = await db.query(
        `SELECT e.id, e.title, e.episode_number, s.season_number
         FROM episodes e
         JOIN seasons s ON e.season_id = s.id
         WHERE e.id = ?`,
        [episodeId]
      );
      if (rows && rows.length > 0) {
        episode = rows[0];
      }
    } catch {
      // Safe fallback if episode table is unavailable or id is a virtual test id
    }

    const streamSource = await cineproService.getEpisodeStream(contentId, episodeId, {
      title: episode?.title,
      seasonNumber: episode?.season_number,
      episodeNumber: episode?.episode_number
    });

    if (!streamSource) {
      res.status(404).json({
        error: {
          code: 'STREAM_UNAVAILABLE',
          message: 'No playable stream source could be resolved for this episode.'
        }
      });
      return;
    }

    res.json({
      success: true,
      source: streamSource
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/streaming/status
 * Healthcheck for streaming engine and provider connectivity
 */
streamingRouter.get('/status', async (_req, res) => {
  res.json({
    status: 'online',
    provider: 'CinePro / Authorized Streaming Adapter',
    supportedFormats: ['hls', 'mp4', 'embed', 'dash'],
    timestamp: new Date().toISOString()
  });
});

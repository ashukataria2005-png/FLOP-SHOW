import { Router, Response } from 'express';
import { cineproService, CineproError } from '../services/cineproService.js';
import { contentRepository } from '../repositories/contentRepository.js';
import { purchaseRepository } from '../repositories/purchaseRepository.js';
import { watchPassService } from '../services/watchPassService.js';
import { subscriptionService } from '../services/subscriptionService.js';
import { monetizationService } from '../services/monetizationService.js';
import { optionalAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { getAdapter } from '../db/adapter.js';

export const streamingRouter = Router();

/**
 * Helper to enforce FLOPSHOW's standard entitlement hierarchy:
 * 1. Admin -> allowed
 * 2. Free content (price === 0) -> allowed
 * 3. User purchased this content -> allowed
 * 4. User has active Watch Pass -> allowed
 * 5. User has active subscription -> allowed
 * Otherwise -> throws 403
 */
async function verifyContentEntitlement(content: any, userId?: string, userRole?: string): Promise<void> {
  const isAdmin = userRole === 'ADMIN';
  const isFree = content.price === 0;
  const isOwned = isAdmin || (userId ? await purchaseRepository.isOwned(userId, content.id) : false);
  const hasActivePass = userId ? await watchPassService.hasActivePass(userId) : false;
  const hasActiveSub = userId ? await subscriptionService.hasActiveSubscription(userId) : false;

  if (!isAdmin && !isFree && !isOwned && !hasActivePass && !hasActiveSub) {
    const monetizationMode = await monetizationService.getMonetizationMode();
    const err = new Error(
      monetizationMode === 'SUBSCRIPTION'
        ? 'Active subscription or Watch Pass required to watch this title.'
        : 'Purchase or Watch Pass required to watch this title.'
    );
    (err as any).statusCode = 403;
    (err as any).code = monetizationMode === 'SUBSCRIPTION' ? 'SUBSCRIPTION_REQUIRED' : 'PURCHASE_REQUIRED';
    throw err;
  }
}

/**
 * GET /api/streaming/status
 * Health telemetry for the CinePro streaming adapter
 */
streamingRouter.get('/status', async (_req, res) => {
  const health = await cineproService.getHealthStatus();
  res.json({
    status: 'online',
    provider: 'CinePro OMSS Streaming Adapter',
    upstream: health
  });
});

/**
 * GET /api/streaming/cinepro/movie/:contentId
 * Resolves normalized streaming playback source for a movie with entitlement enforcement
 */
streamingRouter.get('/cinepro/movie/:contentId', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const rawId = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
    const contentId = rawId ? rawId.trim() : '';

    if (!contentId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Content ID is required' } });
      return;
    }

    const content = await contentRepository.findByIdOrSlug(contentId);
    if (!content) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Movie content not found' } });
      return;
    }

    // Enforce FLOPSHOW server-side purchase / subscription / pass entitlement
    await verifyContentEntitlement(content, req.user?.id, req.user?.role);

    try {
      const streamSource = await cineproService.getMovieStream(content.id, content.title);
      res.json({
        success: true,
        source: streamSource
      });
    } catch (err: any) {
      const status = err.statusCode || (err instanceof CineproError ? err.statusCode : 503);
      res.status(status).json({
        error: {
          code: err.code || 'STREAM_UNAVAILABLE',
          message: err.message || 'Streaming source is currently unavailable from provider.'
        }
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/streaming/cinepro/series/:contentId/episode/:episodeId
 * Resolves normalized streaming playback source for a series episode with entitlement enforcement
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

    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT e.id, e.title, e.episode_number, s.season_number, s.content_id, c.title as series_title, c.price
       FROM episodes e
       JOIN seasons s ON e.season_id = s.id
       JOIN content c ON s.content_id = c.id
       WHERE e.id = ?`,
      [episodeId]
    );

    const episode = rows && rows.length > 0 ? rows[0] : null;
    if (!episode) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Episode not found' } });
      return;
    }

    // Enforce FLOPSHOW server-side purchase / subscription / pass entitlement
    await verifyContentEntitlement({ id: episode.content_id, price: episode.price }, req.user?.id, req.user?.role);

    try {
      const streamSource = await cineproService.getEpisodeStream(episode.content_id, episode.id, {
        title: episode.title,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number
      });

      res.json({
        success: true,
        source: streamSource
      });
    } catch (err: any) {
      const status = err.statusCode || (err instanceof CineproError ? err.statusCode : 503);
      res.status(status).json({
        error: {
          code: err.code || 'STREAM_UNAVAILABLE',
          message: err.message || 'Episode streaming source is currently unavailable from provider.'
        }
      });
    }
  } catch (err) {
    next(err);
  }
});

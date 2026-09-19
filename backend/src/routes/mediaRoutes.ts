import { Router, Response } from 'express';
import { mediaService } from '../services/mediaService.js';
import { optionalAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export const mediaRouter = Router();

// GET /api/media/content/:contentId
// Optional auth allows public trailers, but enforces ownership for main content
mediaRouter.get('/content/:contentId', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const mediaType = (req.query.type as 'MAIN' | 'TRAILER') || 'MAIN';
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const contentId = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
    const result = await mediaService.getPlayableContentMedia(contentId, mediaType, userId, userRole);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/media/episode/:episodeId
mediaRouter.get('/episode/:episodeId', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const mediaType = (req.query.type as 'MAIN' | 'TRAILER') || 'MAIN';
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const episodeId = Array.isArray(req.params.episodeId) ? req.params.episodeId[0] : req.params.episodeId;
    const result = await mediaService.getPlayableEpisodeMedia(episodeId, mediaType, userId, userRole);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/media/download/content/:contentId
// Secure server-side download authorization check
mediaRouter.get('/download/content/:contentId', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const contentId = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
    const result = await mediaService.getPlayableContentMedia(contentId, 'MAIN', userId, userRole);

    if (!result.downloadAllowed) {
      res.status(403).json({
        error: {
          code: 'DOWNLOAD_FORBIDDEN',
          message: 'Offline download is not permitted with 24-Hour or 3-Day Watch Passes. Upgrade to a 7-Day or 15-Day Pass, 1-Month Ownership, or VIP Subscription.',
        }
      });
      return;
    }

    res.json({
      success: true,
      downloadUrl: result.url,
      title: result.title,
      mimeType: result.mimeType,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/media/download/episode/:episodeId
mediaRouter.get('/download/episode/:episodeId', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const episodeId = Array.isArray(req.params.episodeId) ? req.params.episodeId[0] : req.params.episodeId;
    const result = await mediaService.getPlayableEpisodeMedia(episodeId, 'MAIN', userId, userRole);

    if (!result.downloadAllowed) {
      res.status(403).json({
        error: {
          code: 'DOWNLOAD_FORBIDDEN',
          message: 'Offline download is not permitted with 24-Hour or 3-Day Watch Passes. Upgrade to a 7-Day or 15-Day Pass, 1-Month Ownership, or VIP Subscription.',
        }
      });
      return;
    }

    res.json({
      success: true,
      downloadUrl: result.url,
      title: result.title,
      mimeType: result.mimeType,
    });
  } catch (err) {
    next(err);
  }
});

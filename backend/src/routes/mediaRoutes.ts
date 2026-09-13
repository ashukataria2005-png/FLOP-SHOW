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
    const result = await mediaService.getPlayableContentMedia(req.params.contentId, mediaType, userId);
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
    const result = await mediaService.getPlayableEpisodeMedia(req.params.episodeId, mediaType, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

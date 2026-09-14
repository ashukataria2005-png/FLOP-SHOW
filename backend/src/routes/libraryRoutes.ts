import { Router, Response } from 'express';
import { libraryService } from '../services/libraryService.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export const libraryRouter = Router();

// All library routes require user authentication
libraryRouter.use(requireAuth);

// GET /api/library/purchases
libraryRouter.get('/purchases', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const purchases = await libraryService.getPurchases(req.user!.id);
    res.json({ count: purchases.length, purchases });
  } catch (err) {
    next(err);
  }
});

// GET /api/library/my-list
libraryRouter.get('/my-list', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const items = await libraryService.getMyList(req.user!.id);
    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
});

// POST /api/library/my-list/:contentId
libraryRouter.post('/my-list/:contentId', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = await libraryService.toggleMyList(req.user!.id, req.params.contentId as string);
    res.json({
      contentId: result.contentId,
      inMyList: result.inList,
      message: result.inList ? 'Added to My List.' : 'Removed from My List.',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/library/progress
libraryRouter.get('/progress', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const progressList = await libraryService.getAllProgress(req.user!.id);
    res.json({ count: progressList.length, progress: progressList });
  } catch (err) {
    next(err);
  }
});

// GET /api/library/progress/:contentId
libraryRouter.get('/progress/:contentId', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const episodeId = req.query.episodeId as string | undefined;
    const progress = await libraryService.getProgress(req.user!.id, req.params.contentId as string, episodeId);
    res.json({ progress });
  } catch (err) {
    next(err);
  }
});

// POST /api/library/progress
libraryRouter.post('/progress', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { contentId, episodeId, progressPercent, currentTimeSeconds, durationSeconds } = req.body;

    if (!contentId || progressPercent === undefined) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'contentId and progressPercent are required.' },
      });
      return;
    }

    await libraryService.saveProgress(req.user!.id, {
      contentId,
      episodeId,
      progressPercent: Number(progressPercent),
      currentTimeSeconds: Number(currentTimeSeconds || 0),
      durationSeconds: Number(durationSeconds || 0),
    });

    res.json({ success: true, message: 'Progress saved successfully.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/library/history
libraryRouter.get('/history', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
    const history = await libraryService.getHistory(req.user!.id, limit);
    res.json({ count: history.length, history });
  } catch (err) {
    next(err);
  }
});

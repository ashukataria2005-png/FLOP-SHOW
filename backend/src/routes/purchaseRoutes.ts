import { Router, Response } from 'express';
import { purchaseService } from '../services/purchaseService.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export const purchaseRouter = Router();

// All purchase operations require authentication
purchaseRouter.use(requireAuth);

// POST /api/purchases
// NOTE: We NEVER read or trust price from the request body.
// Real content price is always fetched from the database atomically.
purchaseRouter.post('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { contentId } = req.body;
    if (!contentId) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'contentId is required.'
        }
      });
      return;
    }

    const result = purchaseService.purchaseContent(req.user!.id, contentId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/purchases/check/:contentId
purchaseRouter.get('/check/:contentId', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const owned = purchaseService.checkOwnership(req.user!.id, req.params.contentId);
    res.json({ contentId: req.params.contentId, isOwned: owned });
  } catch (err) {
    next(err);
  }
});

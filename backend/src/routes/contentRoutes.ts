import { Router } from 'express';
import { contentService } from '../services/contentService.js';
import { adminService } from '../services/adminService.js';

export const contentRouter = Router();

// GET /api/content/featured
contentRouter.get('/featured', (_req, res, next) => {
  try {
    const items = contentService.getFeatured();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/genres
contentRouter.get('/genres', (_req, res, next) => {
  try {
    const genres = contentService.getGenres();
    res.json({ genres });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/search
contentRouter.get('/search', (req, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const type = req.query.type as 'MOVIE' | 'SERIES' | undefined;
    const genre = req.query.genre as string | undefined;

    const items = contentService.search(q, { type, genreSlug: genre });
    res.json({ query: q, count: items.length, items });
  } catch (err) {
    next(err);
  }
});

// GET /api/content
contentRouter.get('/', (req, res, next) => {
  try {
    const type = req.query.type as 'MOVIE' | 'SERIES' | undefined;
    const genre = req.query.genre as string | undefined;
    const featured = req.query.featured !== undefined ? req.query.featured === 'true' : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const items = contentService.listPublished({
      type,
      genreSlug: genre,
      featured,
      limit,
      offset
    });

    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/hero (Dedicated Home Hero)
contentRouter.get('/hero', (_req, res, next) => {
  try {
    const hero = contentService.getHero();
    res.json({ hero });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/ads (Public Pre-roll Advertisement Configuration)
contentRouter.get('/ads', (_req, res, next) => {
  try {
    const ads = adminService.getAdsConfig();
    res.json({ ads });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/:idOrSlug
contentRouter.get('/:idOrSlug', (req, res, next) => {
  try {
    const item = contentService.getDetails(req.params.idOrSlug);
    if (!item) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Content "${req.params.idOrSlug}" not found.`
        }
      });
      return;
    }
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

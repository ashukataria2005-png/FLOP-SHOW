import { Router, Request, Response } from 'express';
import { adminService } from '../services/adminService.js';
import { mediaService } from '../services/mediaService.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';
import { uploadMediaMiddleware } from '../middlewares/uploadMiddleware.js';
import { metadataImportService } from '../services/metadataImportService.js';

export const adminRouter = Router();

// Protect ALL admin routes with Auth + Admin Role Check
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// ----------------------------------------------------------------------------
// 1. DASHBOARD & STATS
// ----------------------------------------------------------------------------
adminRouter.get('/dashboard', (_req, res, next) => {
  try {
    const stats = adminService.getDashboardStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users', (_req, res, next) => {
  try {
    const users = adminService.getAllUsers();
    res.json({ count: users.length, users });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/transactions', (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const transactions = adminService.getAllTransactions(limit);
    res.json({ count: transactions.length, transactions });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/purchases', (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const purchases = adminService.getAllPurchases(limit, offset);
    res.json({ count: purchases.length, purchases });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/users/:id/status', (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Status must be ACTIVE or SUSPENDED.' } });
      return;
    }
    adminService.updateUserStatus(req.params.id, status);
    res.json({ success: true, message: `User status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id/purchases', (req, res, next) => {
  try {
    const purchases = adminService.getUserPurchases(req.params.id);
    res.json({ count: purchases.length, purchases });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id/transactions', (req, res, next) => {
  try {
    const transactions = adminService.getUserTransactions(req.params.id);
    res.json({ count: transactions.length, transactions });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 2. FILE UPLOADS (Videos & Images)
// ----------------------------------------------------------------------------
adminRouter.post('/upload', uploadMediaMiddleware.single('file'), (req: Request, res: Response, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'NO_FILE', message: 'No file was uploaded.' } });
      return;
    }

    const subfolder = req.file.mimetype.startsWith('video/') ? 'videos' : 'images';
    const relativeUrl = `/uploads/${subfolder}/${req.file.filename}`;

    res.status(201).json({
      success: true,
      url: relativeUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 3. CONTENT MANAGEMENT & TRENDING #1
// ----------------------------------------------------------------------------
adminRouter.get('/content', (req, res, next) => {
  try {
    const { status, type, genre, featured, trending, search, sortBy, limit, offset } = req.query;
    const items = adminService.listAllContent({
      status: status as any,
      type: type as any,
      genreSlug: genre as string,
      featured: featured !== undefined && featured !== '' ? featured === 'true' : undefined,
      trendingOnly: trending === 'true',
      search: search as string,
      sortBy: sortBy as any,
      limit: limit ? parseInt(limit as string, 10) : 100,
      offset: offset ? parseInt(offset as string, 10) : 0
    });
    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/content', (req, res, next) => {
  try {
    const contentId = adminService.createContent(req.body);
    res.status(201).json({
      success: true,
      message: 'Content created successfully.',
      contentId
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/content/:id', (req, res, next) => {
  try {
    adminService.updateContent(req.params.id, req.body);
    res.json({
      success: true,
      message: `Content ${req.params.id} updated successfully.`
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/content/:id', (req, res, next) => {
  try {
    adminService.deleteContent(req.params.id);
    res.json({
      success: true,
      message: `Content ${req.params.id} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/content/:id/status', (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Status must be one of: DRAFT, PUBLISHED, ARCHIVED.'
        }
      });
      return;
    }

    adminService.updateStatus(req.params.id, status);
    res.json({
      success: true,
      message: `Status of ${req.params.id} set to ${status}.`
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/content/:id/price', (req, res, next) => {
  try {
    const { priceRupees } = req.body;
    if (priceRupees === undefined || isNaN(Number(priceRupees))) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Valid priceRupees number is required.'
        }
      });
      return;
    }

    adminService.updatePrice(req.params.id, Number(priceRupees));
    res.json({
      success: true,
      message: `Price of ${req.params.id} updated to ₹${priceRupees}.`
    });
  } catch (err) {
    next(err);
  }
});

// TRENDING #1 CONTROL
adminRouter.patch('/content/:id/trending', (req, res, next) => {
  try {
    const { position } = req.body;
    const parsedPosition = position === null || position === '' ? null : Number(position);

    adminService.setTrendingPosition(req.params.id, parsedPosition);
    res.json({
      success: true,
      message: parsedPosition === 1
        ? `"${req.params.id}" is now set as TRENDING #1.`
        : `Trending position updated to ${parsedPosition ?? 'none'}.`
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 3B. QUICK ADD & AUTO IMPORT (Online Metadata Providers)
// ----------------------------------------------------------------------------
adminRouter.get('/auto-import/search', async (req, res, next) => {
  try {
    const { query, year, type } = req.query;
    if (!query || typeof query !== 'string' || query.trim() === '') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Search query is required.' } });
      return;
    }
    const parsedYear = year ? parseInt(year as string, 10) : undefined;
    const parsedType = type === 'SERIES' ? 'SERIES' : 'MOVIE';
    const results = await metadataImportService.search(query, parsedYear, parsedType);
    res.json({ success: true, count: results.length, results });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/auto-import/details', async (req, res, next) => {
  try {
    const { providerId, type } = req.query;
    if (!providerId || typeof providerId !== 'string') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'providerId is required.' } });
      return;
    }
    const parsedType = type === 'SERIES' ? 'SERIES' : 'MOVIE';
    const details = await metadataImportService.getDetails(providerId, parsedType);
    res.json({ success: true, details });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/auto-import/import', (req, res, next) => {
  try {
    const result = metadataImportService.importContent(req.body);
    res.status(201).json({
      success: true,
      message: `"${result.title}" imported successfully to FLOPSHOW catalog.`,
      result
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 4. MEDIA MANAGEMENT (Attached to Movie or Episode)
// ----------------------------------------------------------------------------
adminRouter.post('/media', (req, res, next) => {
  try {
    const { contentId, episodeId, mediaType, sourceType, url, mimeType, duration, durationSeconds, thumbnail } = req.body;

    if (!mediaType || (!contentId && !episodeId) || !url) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'mediaType, url, and either contentId or episodeId are required.'
        }
      });
      return;
    }

    let media;
    if (contentId) {
      media = mediaService.attachContentMedia(contentId, {
        mediaType,
        sourceType,
        url,
        mimeType,
        duration,
        durationSeconds,
        thumbnail
      });
    } else {
      media = mediaService.attachEpisodeMedia(episodeId, {
        mediaType,
        sourceType,
        url,
        mimeType,
        duration,
        durationSeconds,
        thumbnail
      });
    }

    res.status(201).json({
      success: true,
      message: 'Media attached successfully.',
      media
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/content/:id/media', (req, res, next) => {
  try {
    const media = mediaService.getAllMediaForContent(req.params.id);
    res.json({ count: media.length, media });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/episodes/:episodeId/media', (req, res, next) => {
  try {
    const media = mediaService.getAllMediaForEpisode(req.params.episodeId);
    res.json({ count: media.length, media });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/media/:id', (req, res, next) => {
  try {
    mediaService.deleteMedia(req.params.id);
    res.json({ success: true, message: 'Media record deleted.' });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 5. GENRES, SEASONS & EPISODES
// ----------------------------------------------------------------------------
adminRouter.get('/genres', (_req, res, next) => {
  try {
    const genres = adminService.getAllGenresWithCounts();
    res.json({ count: genres.length, genres });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/genres', (req, res, next) => {
  try {
    const { name, slug } = req.body;
    if (!name) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Genre name is required.' } });
      return;
    }
    const genreId = adminService.createGenre(name, slug);
    res.status(201).json({ success: true, message: 'Genre created.', genreId });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/genres/:id', (req, res, next) => {
  try {
    const { name, slug } = req.body;
    if (!name) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Genre name is required.' } });
      return;
    }
    adminService.updateGenre(req.params.id, name, slug);
    res.json({ success: true, message: 'Genre updated.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/genres/:id', (req, res, next) => {
  try {
    adminService.deleteGenre(req.params.id);
    res.json({ success: true, message: 'Genre safely deleted.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/content/:id/seasons', (req, res, next) => {
  try {
    const { seasonNumber, title } = req.body;
    if (!seasonNumber || !title) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'seasonNumber and title are required.' } });
      return;
    }
    const seasonId = adminService.createSeason(req.params.id, Number(seasonNumber), title);
    res.status(201).json({ success: true, message: 'Season created.', seasonId });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/seasons/:id', (req, res, next) => {
  try {
    const { title, seasonNumber } = req.body;
    adminService.updateSeason(req.params.id, title, seasonNumber);
    res.json({ success: true, message: 'Season updated.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/seasons/:id', (req, res, next) => {
  try {
    adminService.deleteSeason(req.params.id);
    res.json({ success: true, message: 'Season deleted.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/seasons/:seasonId/episodes', (req, res, next) => {
  try {
    const { episodeNumber, title, videoUrl, description, thumbnail, duration, durationSeconds } = req.body;
    if (!episodeNumber || !title) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'episodeNumber and title are required.' } });
      return;
    }

    const episodeId = adminService.createEpisode(req.params.seasonId, {
      episodeNumber: Number(episodeNumber),
      title,
      videoUrl: videoUrl || '',
      description,
      thumbnail,
      duration,
      durationSeconds: durationSeconds ? Number(durationSeconds) : 0
    });

    res.status(201).json({ success: true, message: 'Episode created.', episodeId });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/episodes/:id', (req, res, next) => {
  try {
    adminService.updateEpisode(req.params.id, req.body);
    res.json({ success: true, message: 'Episode updated.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/episodes/:id', (req, res, next) => {
  try {
    adminService.deleteEpisode(req.params.id);
    res.json({ success: true, message: 'Episode deleted.' });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 6. APPLICATION SETTINGS
// ----------------------------------------------------------------------------
adminRouter.get('/settings', (_req, res, next) => {
  try {
    const settings = adminService.getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/settings', (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Settings object is required.' } });
      return;
    }
    adminService.updateSettings(settings);
    res.json({ success: true, message: 'Settings saved successfully.', settings: adminService.getSettings() });
  } catch (err) {
    next(err);
  }
});

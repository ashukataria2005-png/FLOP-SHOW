import { Router, Request, Response } from 'express';
import { adminService } from '../services/adminService.js';
import { mediaService } from '../services/mediaService.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';
import { uploadMediaMiddleware, isVideoFile } from '../middlewares/uploadMiddleware.js';
import { metadataImportService } from '../services/metadataImportService.js';

export const adminRouter = Router();

// Protect ALL admin routes with Auth + Admin Role Check
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// ----------------------------------------------------------------------------
// 1. DASHBOARD & STATS
// ----------------------------------------------------------------------------
adminRouter.get('/dashboard', async (_req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await adminService.getAllUsers();
    res.json({ count: users.length, users });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/transactions', async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const transactions = await adminService.getAllTransactions(limit);
    res.json({ count: transactions.length, transactions });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/purchases', async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const purchases = await adminService.getAllPurchases(limit, offset);
    res.json({ count: purchases.length, purchases });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Status must be ACTIVE or SUSPENDED.' } });
      return;
    }
    await adminService.updateUserStatus(req.params.id, status);
    res.json({ success: true, message: `User status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id/purchases', async (req, res, next) => {
  try {
    const purchases = await adminService.getUserPurchases(req.params.id);
    res.json({ count: purchases.length, purchases });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id/transactions', async (req, res, next) => {
  try {
    const transactions = await adminService.getUserTransactions(req.params.id);
    res.json({ count: transactions.length, transactions });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 2. FILE UPLOADS (Videos & Images)
// ----------------------------------------------------------------------------
adminRouter.post('/upload', (req: Request, res: Response, next) => {
  uploadMediaMiddleware.single('file')(req, res, (err: any) => {
    if (err) {
      if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'Video file size exceeds the allowed limit (1GB). Please select a compressed file or stream URL.'
            }
          });
        }
        return res.status(400).json({
          error: {
            code: err.code || 'UPLOAD_ERROR',
            message: err.message || 'File upload failed.'
          }
        });
      }
      return res.status(400).json({
        error: {
          code: 'INVALID_FILE',
          message: err.message || 'The selected file is not supported.'
        }
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: { code: 'NO_FILE', message: 'No file was uploaded.' } });
      }

      const isVid = isVideoFile(req.file);
      const subfolder = isVid ? 'videos' : 'images';
      const relativeUrl = `/uploads/${subfolder}/${req.file.filename}`;

      res.status(201).json({
        success: true,
        url: relativeUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype || (isVid ? 'video/mp4' : 'image/jpeg'),
        size: req.file.size,
      });
    } catch (innerErr) {
      next(innerErr);
    }
  });
});

// ----------------------------------------------------------------------------
// 3. CONTENT MANAGEMENT & TRENDING #1
// ----------------------------------------------------------------------------
adminRouter.get('/content', async (req, res, next) => {
  try {
    const { status, type, genre, featured, trending, search, sortBy, limit, offset } = req.query;
    const items = await adminService.listAllContent({
      status: status as any,
      type: type as any,
      genreSlug: genre as string,
      featured: featured !== undefined && featured !== '' ? featured === 'true' : undefined,
      trendingOnly: trending === 'true',
      search: search as string,
      sortBy: sortBy as any,
      limit: limit ? parseInt(limit as string, 10) : 100,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/content', async (req, res, next) => {
  try {
    const contentId = await adminService.createContent(req.body);
    res.status(201).json({
      success: true,
      message: 'Content created successfully.',
      contentId,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/content/:id', async (req, res, next) => {
  try {
    await adminService.updateContent(req.params.id, req.body);
    res.json({ success: true, message: `Content ${req.params.id} updated successfully.` });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/content/:id', async (req, res, next) => {
  try {
    await adminService.deleteContent(req.params.id);
    res.json({ success: true, message: `Content ${req.params.id} deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/content/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Status must be one of: DRAFT, PUBLISHED, ARCHIVED.' },
      });
      return;
    }
    await adminService.updateStatus(req.params.id, status);
    res.json({ success: true, message: `Status of ${req.params.id} set to ${status}.` });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/content/:id/price', async (req, res, next) => {
  try {
    const { priceRupees } = req.body;
    if (priceRupees === undefined || isNaN(Number(priceRupees))) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Valid priceRupees number is required.' },
      });
      return;
    }
    await adminService.updatePrice(req.params.id, Number(priceRupees));
    res.json({ success: true, message: `Price of ${req.params.id} updated to ₹${priceRupees}.` });
  } catch (err) {
    next(err);
  }
});

// TRENDING #1 CONTROL
adminRouter.patch('/content/:id/trending', async (req, res, next) => {
  try {
    const { position } = req.body;
    const parsedPosition = position === null || position === '' ? null : Number(position);
    await adminService.setTrendingPosition(req.params.id, parsedPosition);
    res.json({
      success: true,
      message:
        parsedPosition === 1
          ? `"${req.params.id}" is now set as TRENDING #1.`
          : `Trending position updated to ${parsedPosition ?? 'none'}.`,
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

adminRouter.post('/auto-import/import', async (req, res, next) => {
  try {
    const result = await metadataImportService.importContent(req.body);
    res.status(201).json({
      success: true,
      message: `"${result.title}" imported successfully to FLOPSHOW catalog.`,
      result,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 4. MEDIA MANAGEMENT (Attached to Movie or Episode)
// ----------------------------------------------------------------------------
adminRouter.post('/media', async (req, res, next) => {
  try {
    const { contentId, episodeId, mediaType, sourceType, url, mimeType, duration, durationSeconds, thumbnail } =
      req.body;

    if (!mediaType || (!contentId && !episodeId) || !url) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'mediaType, url, and either contentId or episodeId are required.' },
      });
      return;
    }

    let media;
    if (contentId) {
      media = await mediaService.attachContentMedia(contentId, {
        mediaType,
        sourceType,
        url,
        mimeType,
        duration,
        durationSeconds,
        thumbnail,
      });
    } else {
      media = await mediaService.attachEpisodeMedia(episodeId, {
        mediaType,
        sourceType,
        url,
        mimeType,
        duration,
        durationSeconds,
        thumbnail,
      });
    }

    res.status(201).json({ success: true, message: 'Media attached successfully.', media });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/content/:id/media', async (req, res, next) => {
  try {
    const media = await mediaService.getAllMediaForContent(req.params.id);
    res.json({ count: media.length, media });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/episodes/:episodeId/media', async (req, res, next) => {
  try {
    const media = await mediaService.getAllMediaForEpisode(req.params.episodeId);
    res.json({ count: media.length, media });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/media/:id', async (req, res, next) => {
  try {
    await mediaService.deleteMedia(req.params.id);
    res.json({ success: true, message: 'Media record deleted.' });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 5. GENRES, SEASONS & EPISODES
// ----------------------------------------------------------------------------
adminRouter.get('/genres', async (_req, res, next) => {
  try {
    const genres = await adminService.getAllGenresWithCounts();
    res.json({ count: genres.length, genres });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/genres', async (req, res, next) => {
  try {
    const { name, slug } = req.body;
    if (!name) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Genre name is required.' } });
      return;
    }
    const genreId = await adminService.createGenre(name, slug);
    res.status(201).json({ success: true, message: 'Genre created.', genreId });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/genres/:id', async (req, res, next) => {
  try {
    const { name, slug } = req.body;
    if (!name) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Genre name is required.' } });
      return;
    }
    await adminService.updateGenre(req.params.id, name, slug);
    res.json({ success: true, message: 'Genre updated.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/genres/:id', async (req, res, next) => {
  try {
    await adminService.deleteGenre(req.params.id);
    res.json({ success: true, message: 'Genre safely deleted.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/content/:id/seasons', async (req, res, next) => {
  try {
    const { seasonNumber, title } = req.body;
    if (!seasonNumber || !title) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'seasonNumber and title are required.' },
      });
      return;
    }
    const seasonId = await adminService.createSeason(req.params.id, Number(seasonNumber), title);
    res.status(201).json({ success: true, message: 'Season created.', seasonId });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/seasons/:id', async (req, res, next) => {
  try {
    const { title, seasonNumber } = req.body;
    await adminService.updateSeason(req.params.id, title, seasonNumber);
    res.json({ success: true, message: 'Season updated.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/seasons/:id', async (req, res, next) => {
  try {
    await adminService.deleteSeason(req.params.id);
    res.json({ success: true, message: 'Season deleted.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/seasons/:seasonId/episodes', async (req, res, next) => {
  try {
    const { episodeNumber, title, videoUrl, description, thumbnail, duration, durationSeconds } = req.body;
    if (!episodeNumber || !title) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'episodeNumber and title are required.' },
      });
      return;
    }

    const episodeId = await adminService.createEpisode(req.params.seasonId, {
      episodeNumber: Number(episodeNumber),
      title,
      videoUrl: videoUrl || '',
      description,
      thumbnail,
      duration,
      durationSeconds: durationSeconds ? Number(durationSeconds) : 0,
    });

    res.status(201).json({ success: true, message: 'Episode created.', episodeId });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/episodes/:id', async (req, res, next) => {
  try {
    await adminService.updateEpisode(req.params.id, req.body);
    res.json({ success: true, message: 'Episode updated.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/episodes/:id', async (req, res, next) => {
  try {
    await adminService.deleteEpisode(req.params.id);
    res.json({ success: true, message: 'Episode deleted.' });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 6. APPLICATION SETTINGS
// ----------------------------------------------------------------------------
adminRouter.get('/settings', async (_req, res, next) => {
  try {
    const settings = await adminService.getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/settings', async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Settings object is required.' } });
      return;
    }
    await adminService.updateSettings(settings);
    const updated = await adminService.getSettings();
    res.json({ success: true, message: 'Settings saved successfully.', settings: updated });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 7. DEDICATED HOME HERO CONTROL
// ----------------------------------------------------------------------------
adminRouter.get('/hero', async (_req, res, next) => {
  try {
    const hero = await adminService.getHero();
    res.json({ success: true, hero });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/hero', async (req, res, next) => {
  try {
    const { contentId } = req.body;
    await adminService.setHero(contentId ?? null);
    const hero = await adminService.getHero();
    res.json({
      success: true,
      message: contentId ? 'Main Hero updated successfully.' : 'Main Hero cleared successfully.',
      hero,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 7B. DEDICATED CINEMATIC SPOTLIGHT CONTROL
// ----------------------------------------------------------------------------
adminRouter.get('/spotlight', async (_req, res, next) => {
  try {
    const spotlight = await adminService.getSpotlight();
    res.json({ success: true, spotlight });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/spotlight', async (req, res, next) => {
  try {
    const { contentId } = req.body;
    await adminService.setSpotlight(contentId ?? null);
    const spotlight = await adminService.getSpotlight();
    res.json({
      success: true,
      message: contentId ? 'Cinematic Spotlight updated successfully.' : 'Cinematic Spotlight cleared successfully.',
      spotlight,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 8. ADVERTISEMENT CONFIGURATION
// ----------------------------------------------------------------------------
adminRouter.get('/ads', async (_req, res, next) => {
  try {
    const ads = await adminService.getAdsConfig();
    res.json({ success: true, ads });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/ads', async (req, res, next) => {
  try {
    const ads = await adminService.updateAdsConfig(req.body);
    res.json({ success: true, message: 'Advertisement configuration saved successfully.', ads });
  } catch (err) {
    next(err);
  }
});

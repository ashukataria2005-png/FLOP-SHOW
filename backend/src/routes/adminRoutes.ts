import { Router, Request, Response } from 'express';
import { adminService } from '../services/adminService.js';
import { mediaService } from '../services/mediaService.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';
import { uploadMediaMiddleware, isVideoFile, isImageFile } from '../middlewares/uploadMiddleware.js';
import { metadataImportService } from '../services/metadataImportService.js';
import { cloudinaryService, isCloudinaryConfigured, cleanupLocalFile } from '../services/cloudinaryService.js';
import { vcdnService } from '../services/vcdnService.js';
import { isVcdnConfigured } from '../config/env.js';
import { contentRepository } from '../repositories/contentRepository.js';
import { mediaRepository } from '../repositories/mediaRepository.js';
import { getAdapter } from '../db/adapter.js';

export const adminRouter = Router();

// Protect ALL admin routes with Auth + Admin Role Check
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// ----------------------------------------------------------------------------
// 1. DASHBOARD & STATS
// ----------------------------------------------------------------------------
adminRouter.get('/dashboard', async (req, res, next) => {
  try {
    const tzOffset = req.query.tzOffset ? parseInt(req.query.tzOffset as string, 10) : undefined;
    const stats = await adminService.getDashboardStats(tzOffset);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/today-details', async (req, res, next) => {
  try {
    const type = String(req.query.type || 'revenue');
    const tzOffset = req.query.tzOffset ? parseInt(req.query.tzOffset as string, 10) : undefined;
    const details = await adminService.getTodayDetails(type, tzOffset);
    res.json({ success: true, ...details });
  } catch (err) {
    next(err);
  }
});


// Unified analytics: all-time breakdown across all hybrid categories
adminRouter.get('/analytics', async (req, res, next) => {
  try {
    const filter = ((req.query.filter as string) || 'ALL').toUpperCase() as any;
    const data = await adminService.getUnifiedAnalytics(filter);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

// Daily analytics: today figures for each hybrid category
adminRouter.get('/daily-analytics', async (req, res, next) => {
  try {
    const filter = ((req.query.filter as string) || 'ALL').toUpperCase() as any;
    const tzOffset = req.query.tzOffset ? parseInt(req.query.tzOffset as string, 10) : undefined;
    const data = await adminService.getDailyAnalytics(filter, tzOffset);
    res.json({ success: true, ...data });
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

adminRouter.delete('/users', async (req, res, next) => {
  try {
    const { userIds } = req.body;
    const currentAdminId = (req as any).user?.id;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'No users selected for deletion.' } });
      return;
    }
    const result = await adminService.deleteUsers(currentAdminId, userIds);
    res.json({ success: true, ...result });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ error: { code: 'FORBIDDEN', message: err.message } });
      return;
    }
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

adminRouter.get('/users/:id', async (req, res, next) => {
  try {
    const user = await adminService.getUserDetails(req.params.id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'New password is required.' } });
      return;
    }
    await adminService.resetUserPassword(req.params.id, newPassword);
    res.json({ success: true, message: 'User password reset successfully.' });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 2. FILE UPLOADS (Videos & Images)
// ----------------------------------------------------------------------------
adminRouter.post('/upload', (req: Request, res: Response, next) => {
  uploadMediaMiddleware.single('file')(req, res, async (err: any) => {
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

    if (!req.file) {
      return res.status(400).json({ error: { code: 'NO_FILE', message: 'No file was uploaded.' } });
    }

    const isVid = isVideoFile(req.file);
    const localFilePath = req.file.path;

    try {
      const result = await uploadSingleMediaFile(req.file);
      return res.status(201).json({
        success: true,
        ...result
      });
    } catch (innerErr: any) {
      await cleanupLocalFile(localFilePath);
      return res.status(500).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: innerErr.message || 'Failed to upload media file.',
        },
      });
    }
  });
});

// ----------------------------------------------------------------------------
// 2B. VCDN STATUS CHECK & REAL-TIME SYNC
// ----------------------------------------------------------------------------
adminRouter.get('/media/vcdn/status/:id', async (req, res, next) => {
  try {
    const videoId = req.params.id;
    if (!isVcdnConfigured()) {
      return res.status(400).json({
        error: { code: 'VCDN_NOT_CONFIGURED', message: 'VCDN_API_KEY is not configured.' },
      });
    }
    const status = await vcdnService.getVideoStatus(videoId);

    // If ready, sync database records in background
    if (status.status === 'ready') {
      const hlsUrl = status.playback?.hls || status.playbackUrl;
      const embedUrl = status.playback?.embed || status.embedUrl;
      const thumbUrl = status.thumbnails?.[0];
      await mediaRepository.updateVcdnStatus(videoId, 'READY', hlsUrl, embedUrl, thumbUrl);
      await contentRepository.updateContentVcdnStatus(videoId, 'READY', hlsUrl, embedUrl, thumbUrl);
    } else if (status.status === 'failed') {
      await mediaRepository.updateVcdnStatus(videoId, 'FAILED');
      await contentRepository.updateContentVcdnStatus(videoId, 'FAILED');
    }

    res.json({ success: true, ...status });
  } catch (err) {
    next(err);
  }
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
    const content = await contentRepository.findByIdOrSlug(req.params.id);
    if (content?.vcdn_video_id) {
      const referencedElsewhere = await contentRepository.isVcdnVideoReferencedElsewhere(content.vcdn_video_id, content.id);
      if (!referencedElsewhere) {
        await vcdnService.deleteVideo(content.vcdn_video_id).catch(err => {
          console.warn('[VCDN] Warning deleting content video:', err.message);
        });
      }
    }
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
    const {
      contentId, episodeId, mediaType, sourceType, url, mimeType,
      duration, durationSeconds, thumbnail,
      vcdnVideoId, vcdnStatus, vcdnPlaybackUrl, vcdnEmbedUrl, vcdnThumbnailUrl, mediaProvider
    } = req.body;

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
        vcdnVideoId,
        vcdnStatus,
        vcdnPlaybackUrl,
        vcdnEmbedUrl,
        vcdnThumbnailUrl,
        mediaProvider,
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
        vcdnVideoId,
        vcdnStatus,
        vcdnPlaybackUrl,
        vcdnEmbedUrl,
        vcdnThumbnailUrl,
        mediaProvider,
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
    const media = await mediaRepository.findById(req.params.id);
    if (media?.vcdn_video_id) {
      const referencedElsewhere = await mediaRepository.isVcdnVideoReferencedElsewhere(media.vcdn_video_id, media.id);
      if (!referencedElsewhere) {
        await vcdnService.deleteVideo(media.vcdn_video_id).catch(err => {
          console.warn('[VCDN] Warning deleting media record video:', err.message);
        });
      }
    }
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
    const db = getAdapter();
    const { rows } = await db.query('SELECT * FROM episodes WHERE id = ?', [req.params.id]);
    const ep = rows[0] as any;
    if (ep?.vcdn_video_id) {
      const referencedElsewhere = await contentRepository.isVcdnVideoReferencedElsewhere(ep.vcdn_video_id, undefined, ep.id);
      if (!referencedElsewhere) {
        await vcdnService.deleteVideo(ep.vcdn_video_id).catch(err => {
          console.warn('[VCDN] Warning deleting episode video:', err.message);
        });
      }
    }
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
    const spotlights = await adminService.getSpotlights();
    res.json({ success: true, spotlight, spotlights });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/spotlights', async (_req, res, next) => {
  try {
    const spotlights = await adminService.getSpotlights();
    res.json({ success: true, spotlights });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/spotlight', async (req, res, next) => {
  try {
    const { contentId, contentIds } = req.body;
    if (Array.isArray(contentIds)) {
      await adminService.setSpotlights(contentIds);
    } else {
      await adminService.setSpotlight(contentId ?? null);
    }
    const spotlight = await adminService.getSpotlight();
    const spotlights = await adminService.getSpotlights();
    res.json({
      success: true,
      message: contentId || (contentIds && contentIds.length > 0)
        ? 'Cinematic Spotlight updated successfully.'
        : 'Cinematic Spotlight cleared successfully.',
      spotlight,
      spotlights,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/spotlights', async (req, res, next) => {
  try {
    const { contentIds } = req.body;
    const ids = Array.isArray(contentIds) ? contentIds : [];
    await adminService.setSpotlights(ids);
    const spotlights = await adminService.getSpotlights();
    res.json({
      success: true,
      message: 'Cinematic Spotlight selections updated successfully.',
      spotlights,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/spotlights/add', async (req, res, next) => {
  try {
    const { contentId } = req.body;
    if (!contentId) {
      return res.status(400).json({ success: false, message: 'contentId is required.' });
    }
    await adminService.addSpotlight(contentId);
    const spotlights = await adminService.getSpotlights();
    res.json({
      success: true,
      message: 'Added to Cinematic Spotlight successfully.',
      spotlights,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/spotlights/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await adminService.removeSpotlight(id);
    const spotlights = await adminService.getSpotlights();
    res.json({
      success: true,
      message: 'Removed from Cinematic Spotlight successfully.',
      spotlights,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 8. ADVERTISEMENT CONFIGURATION & MEDIA LIBRARY
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

adminRouter.get('/ads/library', async (req, res, next) => {
  try {
    const type = req.query.type as ('IMAGE' | 'VIDEO') | undefined;
    const items = await adminService.getAdMediaLibrary(type);
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/ads/library', async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Items array is required.' } });
    }
    const updated = await adminService.addAdMediaItems(items);
    res.json({ success: true, library: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/ads/library/upload', (req: Request, res: Response, next) => {
  uploadMediaMiddleware.array('files', 15)(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: err.message || 'File upload error.' } });
    }
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: { code: 'NO_FILES', message: 'No media files were selected.' } });
    }

    const targetType = ((req.query.type || req.body.type || 'IMAGE') as string).toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE';

    // Strict validation: Photo Ads only accept images; Video Ads only accept videos
    if (targetType === 'IMAGE') {
      for (const file of files) {
        if (!isImageFile(file)) {
          for (const f of files) await cleanupLocalFile(f.path);
          return res.status(400).json({
            error: {
              code: 'INVALID_FILE_TYPE',
              message: `File "${file.originalname}" is not an image file. Photo Ads media library accepts photo/image files only (JPG, PNG, WebP, GIF, AVIF).`
            }
          });
        }
      }
    } else {
      for (const file of files) {
        if (!isVideoFile(file)) {
          for (const f of files) await cleanupLocalFile(f.path);
          return res.status(400).json({
            error: {
              code: 'INVALID_FILE_TYPE',
              message: `File "${file.originalname}" is not a video file. Video Ads media library accepts video files only (MP4, WebM, MOV, M4V).`
            }
          });
        }
      }
    }

    try {
      const addedItems: Array<{ type: 'IMAGE' | 'VIDEO'; url: string; name: string; size: number; mimeType: string }> = [];
      for (const file of files) {
        const uploadResult = await uploadSingleMediaFile(file);
        addedItems.push({
          type: targetType,
          url: uploadResult.url,
          name: file.originalname,
          size: file.size,
          mimeType: uploadResult.mimeType
        });
      }

      const updatedLibrary = await adminService.addAdMediaItems(addedItems);
      res.status(201).json({
        success: true,
        message: `${addedItems.length} media file(s) added to Advertisement Media Library.`,
        added: addedItems,
        library: updatedLibrary
      });
    } catch (uploadErr: any) {
      for (const f of files) await cleanupLocalFile(f.path);
      res.status(500).json({
        error: { code: 'UPLOAD_FAILED', message: uploadErr.message || 'Failed to upload ad media files.' }
      });
    }
  });
});

adminRouter.delete('/ads/library/:id', async (req, res, next) => {
  try {
    await adminService.deleteAdMediaItem(req.params.id);
    const library = await adminService.getAdMediaLibrary();
    res.json({ success: true, message: 'Media item deleted from library.', library });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 9. FINANCIAL ANALYTICS RESET (RESET PLATFORM REVENUE & TRANSACTION COUNTERS ONLY)
// ----------------------------------------------------------------------------
adminRouter.post('/reset-financial-analytics', async (_req, res, next) => {
  try {
    const result = await adminService.resetFinancialAnalytics();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

async function uploadSingleMediaFile(file: Express.Multer.File): Promise<{
  url: string;
  playbackUrl?: string;
  embedUrl?: string;
  vcdnVideoId?: string;
  vcdnStatus?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  provider?: string;
  note?: string;
}> {
  const isVid = isVideoFile(file);
  const localFilePath = file.path;

  if (isVid && isVcdnConfigured()) {
    try {
      const vcdnResult = await vcdnService.uploadVideo(localFilePath, file.originalname);
      await cleanupLocalFile(localFilePath);
      return {
        url: vcdnResult.playbackUrl,
        playbackUrl: vcdnResult.playbackUrl,
        embedUrl: vcdnResult.embedUrl,
        vcdnVideoId: vcdnResult.vcdnVideoId,
        vcdnStatus: vcdnResult.vcdnStatus,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: 'application/x-mpegURL',
        size: file.size,
        provider: 'VCDN',
      };
    } catch (vcdnErr: any) {
      console.error('[VCDN] Upload error:', vcdnErr.message);
      if (!isCloudinaryConfigured()) {
        await cleanupLocalFile(localFilePath);
        throw new Error(`Failed to upload video to VCDN: ${vcdnErr.message || 'Unknown error'}`);
      }
    }
  }

  if (isCloudinaryConfigured()) {
    const uploadResult = isVid
      ? await cloudinaryService.uploadVideo(localFilePath, file.originalname)
      : await cloudinaryService.uploadImage(localFilePath, file.originalname);
    await cleanupLocalFile(localFilePath);
    return {
      url: uploadResult.url,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype || (isVid ? 'video/mp4' : 'image/jpeg'),
      size: uploadResult.bytes || file.size,
      provider: 'CLOUDINARY',
    };
  }

  // Safe fallback to local storage
  const subfolder = isVid ? 'videos' : 'images';
  const relativeUrl = `/uploads/${subfolder}/${file.filename}`;
  return {
    url: relativeUrl,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype || (isVid ? 'video/mp4' : 'image/jpeg'),
    size: file.size,
    provider: 'LOCAL',
    note: isVid ? 'VCDN is not configured. Saved to local storage.' : undefined,
  };
}

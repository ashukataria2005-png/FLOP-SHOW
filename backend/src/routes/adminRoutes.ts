import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { adminService } from '../services/adminService.js';
import { mediaService } from '../services/mediaService.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { requireAdmin, requireSuperAdmin, requirePermission, requireAnyPermission } from '../middlewares/adminMiddleware.js';
import { uploadMediaMiddleware, isVideoFile, isImageFile } from '../middlewares/uploadMiddleware.js';
import { metadataImportService } from '../services/metadataImportService.js';
import { cloudinaryService, isCloudinaryConfigured, cleanupLocalFile } from '../services/cloudinaryService.js';
import { vcdnService } from '../services/vcdnService.js';
import { isVcdnConfigured, config } from '../config/env.js';
import { contentRepository } from '../repositories/contentRepository.js';
import { mediaRepository } from '../repositories/mediaRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { promoService } from '../services/promoService.js';
import { ALL_ADMIN_PERMISSIONS, isSuperAdminUser } from '../services/authService.js';
import { getAdapter } from '../db/adapter.js';

export const adminRouter = Router();

const param = (p: string | string[] | undefined): string => (Array.isArray(p) ? p[0] : p || '');

// Protect ALL admin routes with Auth + Admin Role Check
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// ----------------------------------------------------------------------------
// 0. ADMIN SESSION VERIFICATION
// ----------------------------------------------------------------------------
adminRouter.get('/session', async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user;
  if (!admin) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }
  res.json({
    success: true,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name || 'Admin',
      role: admin.role,
      is_super_admin: isSuperAdminUser(admin) ? 1 : (Number(admin.is_super_admin) === 1 ? 1 : 0),
      permissions: admin.permissions || [],
      status: admin.status || 'ACTIVE'
    }
  });
});

// ----------------------------------------------------------------------------
// 1. DASHBOARD & STATS
// ----------------------------------------------------------------------------
adminRouter.get('/dashboard', requirePermission('analytics'), async (req, res, next) => {
  try {
    const tzOffset = req.query.tzOffset ? parseInt(req.query.tzOffset as string, 10) : undefined;
    const stats = await adminService.getDashboardStats(tzOffset);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/today-details', requirePermission('analytics'), async (req, res, next) => {
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
adminRouter.get('/analytics', requirePermission('analytics'), async (req, res, next) => {
  try {
    const filter = ((req.query.filter as string) || 'ALL').toUpperCase() as any;
    const data = await adminService.getUnifiedAnalytics(filter);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

// Daily analytics: today figures for each hybrid category
adminRouter.get('/daily-analytics', requirePermission('analytics'), async (req, res, next) => {
  try {
    const filter = ((req.query.filter as string) || 'ALL').toUpperCase() as any;
    const tzOffset = req.query.tzOffset ? parseInt(req.query.tzOffset as string, 10) : undefined;
    const data = await adminService.getDailyAnalytics(filter, tzOffset);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});
adminRouter.get('/users', requirePermission('users'), async (_req, res, next) => {
  try {
    const users = await adminService.getAllUsers();
    res.json({ count: users.length, users });
  } catch (err) {
    next(err);
  }
});

adminRouter.get(['/promos/redemptions', '/promo-redemptions'], requirePermission('promos'), async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const redemptions = await promoService.getAllRedemptionsAdmin(limit);
    res.json({ success: true, redemptions });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/users', requirePermission('users'), async (req, res, next) => {
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


adminRouter.get('/transactions', requirePermission('analytics'), async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const transactions = await adminService.getAllTransactions(limit);
    res.json({ count: transactions.length, transactions });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/purchases', requirePermission('analytics'), async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const purchases = await adminService.getAllPurchases(limit, offset);
    res.json({ count: purchases.length, purchases });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/users/:id/status', requirePermission('users'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Status must be ACTIVE or SUSPENDED.' } });
      return;
    }
    await adminService.updateUserStatus(param(req.params.id), status);
    res.json({ success: true, message: `User status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id/purchases', requirePermission('users'), async (req, res, next) => {
  try {
    const purchases = await adminService.getUserPurchases(param(req.params.id));
    res.json({ count: purchases.length, purchases });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id/transactions', requirePermission('users'), async (req, res, next) => {
  try {
    const transactions = await adminService.getUserTransactions(param(req.params.id));
    res.json({ count: transactions.length, transactions });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id', requirePermission('users'), async (req, res, next) => {
  try {
    const user = await adminService.getUserDetails(param(req.params.id));
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/reset-password', requirePermission('users'), async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'New password is required.' } });
      return;
    }
    await adminService.resetUserPassword(param(req.params.id), newPassword);
    res.json({ success: true, message: 'User password reset successfully.' });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 2. FILE UPLOADS (Videos & Images)
// ----------------------------------------------------------------------------
adminRouter.post('/upload', requirePermission('catalog'), (req: Request, res: Response, next) => {
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
adminRouter.get('/media/vcdn/status/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    const videoId = param(req.params.id);
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
adminRouter.get('/content', requirePermission('catalog'), async (req, res, next) => {
  try {
    const { status, type, genre, featured, trending, search, sortBy, limit, offset, all } = req.query;
    const isAll = all === 'true' || all === '1';
    const parsedLimit = isAll ? 2000 : (limit ? parseInt(limit as string, 10) : 1000);

    const items = await adminService.listAllContent({
      status: status as any,
      type: type as any,
      genreSlug: genre as string,
      featured: featured !== undefined && featured !== '' ? featured === 'true' : undefined,
      trendingOnly: trending === 'true',
      search: search as string,
      sortBy: sortBy as any,
      limit: parsedLimit,
      offset: offset ? parseInt(offset as string, 10) : 0,
      all: isAll,
    });
    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/content', requirePermission('catalog'), async (req, res, next) => {
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

adminRouter.put('/content/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    await adminService.updateContent(param(req.params.id), req.body);
    res.json({ success: true, message: `Content ${req.params.id} updated successfully.` });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/content/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    const content = await contentRepository.findByIdOrSlug(param(req.params.id));
    if (content?.vcdn_video_id) {
      const referencedElsewhere = await contentRepository.isVcdnVideoReferencedElsewhere(content.vcdn_video_id, content.id);
      if (!referencedElsewhere) {
        await vcdnService.deleteVideo(content.vcdn_video_id).catch(err => {
          console.warn('[VCDN] Warning deleting content video:', err.message);
        });
      }
    }
    await adminService.deleteContent(param(req.params.id));
    res.json({ success: true, message: `Content ${req.params.id} deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/content/:id/status', requirePermission('catalog'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Status must be one of: DRAFT, PUBLISHED, ARCHIVED.' },
      });
      return;
    }
    await adminService.updateStatus(param(req.params.id), status);
    res.json({ success: true, message: `Status of ${req.params.id} set to ${status}.` });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/content/:id/price', requireAnyPermission('monetization', 'catalog'), async (req, res, next) => {
  try {
    const { priceRupees, customPriceRupees } = req.body;
    if (priceRupees === undefined || isNaN(Number(priceRupees))) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Valid priceRupees number is required.' },
      });
      return;
    }
    const resolvedCustom = customPriceRupees !== undefined
      ? (customPriceRupees === null || customPriceRupees === '' ? null : Number(customPriceRupees))
      : undefined;
    await adminService.updatePrice(param(req.params.id), Number(priceRupees), resolvedCustom);
    res.json({ success: true, message: `Price of ${req.params.id} updated to ₹${priceRupees}.` });
  } catch (err) {
    next(err);
  }
});

// TRENDING #1 CONTROL
adminRouter.patch('/content/:id/trending', requirePermission('catalog'), async (req, res, next) => {
  try {
    const { position } = req.body;
    const parsedPosition = position === null || position === '' ? null : Number(position);
    await adminService.setTrendingPosition(param(req.params.id), parsedPosition);
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
adminRouter.get('/auto-import/search', requirePermission('catalog'), async (req, res, next) => {
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

adminRouter.get('/auto-import/details', requirePermission('catalog'), async (req, res, next) => {
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

adminRouter.post('/auto-import/import', requirePermission('catalog'), async (req, res, next) => {
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
adminRouter.post('/media', requirePermission('catalog'), async (req, res, next) => {
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

adminRouter.get('/content/:id/media', requirePermission('catalog'), async (req, res, next) => {
  try {
    const media = await mediaService.getAllMediaForContent(param(req.params.id));
    res.json({ count: media.length, media });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/episodes/:episodeId/media', requirePermission('catalog'), async (req, res, next) => {
  try {
    const media = await mediaService.getAllMediaForEpisode(param(req.params.episodeId));
    res.json({ count: media.length, media });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/media/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    const id = param(req.params.id);
    const media = await mediaRepository.findById(id);
    if (media?.vcdn_video_id) {
      const referencedElsewhere = await mediaRepository.isVcdnVideoReferencedElsewhere(media.vcdn_video_id, media.id);
      if (!referencedElsewhere) {
        await vcdnService.deleteVideo(media.vcdn_video_id).catch(err => {
          console.warn('[VCDN] Warning deleting media record video:', err.message);
        });
      }
    }
    await mediaService.deleteMedia(id);
    res.json({ success: true, message: 'Media record deleted.' });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 5. GENRES, SEASONS & EPISODES
// ----------------------------------------------------------------------------
adminRouter.get('/genres', requirePermission('catalog'), async (_req, res, next) => {
  try {
    const genres = await adminService.getAllGenresWithCounts();
    res.json({ count: genres.length, genres });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/genres', requirePermission('catalog'), async (req, res, next) => {
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

adminRouter.put('/genres/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    const { name, slug } = req.body;
    if (!name) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Genre name is required.' } });
      return;
    }
    await adminService.updateGenre(param(req.params.id), name, slug);
    res.json({ success: true, message: 'Genre updated.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/genres/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    await adminService.deleteGenre(param(req.params.id));
    res.json({ success: true, message: 'Genre safely deleted.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/content/:id/seasons', requirePermission('catalog'), async (req, res, next) => {
  try {
    const { seasonNumber, title } = req.body;
    if (!seasonNumber || !title) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'seasonNumber and title are required.' },
      });
      return;
    }
    const seasonId = await adminService.createSeason(param(req.params.id), Number(seasonNumber), title);
    res.status(201).json({ success: true, message: 'Season created.', seasonId });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/seasons/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    const { title, seasonNumber } = req.body;
    await adminService.updateSeason(param(req.params.id), title, seasonNumber);
    res.json({ success: true, message: 'Season updated.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/seasons/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    await adminService.deleteSeason(param(req.params.id));
    res.json({ success: true, message: 'Season deleted.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/seasons/:seasonId/episodes', requirePermission('catalog'), async (req, res, next) => {
  try {
    const { episodeNumber, title, videoUrl, description, thumbnail, duration, durationSeconds } = req.body;
    if (!episodeNumber || !title) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'episodeNumber and title are required.' },
      });
      return;
    }

    const episodeId = await adminService.createEpisode(param(req.params.seasonId), {
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

adminRouter.put('/episodes/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    await adminService.updateEpisode(param(req.params.id), req.body);
    res.json({ success: true, message: 'Episode updated.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/episodes/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    const epId = param(req.params.id);
    const db = getAdapter();
    const { rows } = await db.query('SELECT * FROM episodes WHERE id = ?', [epId]);
    const ep = rows[0] as any;
    if (ep?.vcdn_video_id) {
      const referencedElsewhere = await contentRepository.isVcdnVideoReferencedElsewhere(ep.vcdn_video_id, undefined, ep.id);
      if (!referencedElsewhere) {
        await vcdnService.deleteVideo(ep.vcdn_video_id).catch(err => {
          console.warn('[VCDN] Warning deleting episode video:', err.message);
        });
      }
    }
    await adminService.deleteEpisode(epId);
    res.json({ success: true, message: 'Episode deleted.' });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 6. APPLICATION SETTINGS
// ----------------------------------------------------------------------------
adminRouter.get('/settings', requireAnyPermission(['settings', 'payments', 'monetization']), async (_req, res, next) => {
  try {
    const settings = await adminService.getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/settings', requireAnyPermission(['settings', 'payments', 'monetization']), async (req, res, next) => {
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
adminRouter.get('/hero', requirePermission('catalog'), async (_req, res, next) => {
  try {
    const hero = await adminService.getHero();
    res.json({ success: true, hero });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/hero', requirePermission('catalog'), async (req, res, next) => {
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
adminRouter.get('/spotlight', requirePermission('catalog'), async (_req, res, next) => {
  try {
    const spotlight = await adminService.getSpotlight();
    const spotlights = await adminService.getSpotlights();
    res.json({ success: true, spotlight, spotlights });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/spotlights', requirePermission('catalog'), async (_req, res, next) => {
  try {
    const spotlights = await adminService.getSpotlights();
    res.json({ success: true, spotlights });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/spotlight', requirePermission('catalog'), async (req, res, next) => {
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

adminRouter.put('/spotlights', requirePermission('catalog'), async (req, res, next) => {
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

adminRouter.post('/spotlights/add', requirePermission('catalog'), async (req, res, next) => {
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

adminRouter.delete('/spotlights/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    const id = param(req.params.id);
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
adminRouter.get('/ads', requirePermission('catalog'), async (_req, res, next) => {
  try {
    const ads = await adminService.getAdsConfig();
    res.json({ success: true, ads });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/ads', requirePermission('catalog'), async (req, res, next) => {
  try {
    const ads = await adminService.updateAdsConfig(req.body);
    res.json({ success: true, message: 'Advertisement configuration saved successfully.', ads });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/ads/library', requirePermission('catalog'), async (req, res, next) => {
  try {
    const type = req.query.type as ('IMAGE' | 'VIDEO') | undefined;
    const items = await adminService.getAdMediaLibrary(type);
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/ads/library', requirePermission('catalog'), async (req, res, next) => {
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

adminRouter.post('/ads/library/upload', requirePermission('catalog'), (req: Request, res: Response, next) => {
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

adminRouter.delete('/ads/library/:id', requirePermission('catalog'), async (req, res, next) => {
  try {
    await adminService.deleteAdMediaItem(param(req.params.id));
    const library = await adminService.getAdMediaLibrary();
    res.json({ success: true, message: 'Media item deleted from library.', library });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 9. FINANCIAL ANALYTICS RESET (RESET PLATFORM REVENUE & TRANSACTION COUNTERS ONLY)
// ----------------------------------------------------------------------------
adminRouter.post('/reset-financial-analytics', requirePermission('settings'), async (_req, res, next) => {
  try {
    const result = await adminService.resetFinancialAnalytics();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 9B. COMPLETE SYSTEM FINANCIAL/TRANSACTION PURGE & RESET
// ----------------------------------------------------------------------------
adminRouter.post('/reset-financials', requirePermission('settings'), async (req, res, next) => {
  try {
    const confirmation = req.body?.confirmation;
    if (confirmation !== 'CONFIRM') {
      return res.status(400).json({
        error: 'Safety verification failed. You must provide confirmation: "CONFIRM" to purge all financial records.'
      });
    }
    const result = await adminService.purgeAllFinancialRecords();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 9C. ADMIN PROMO CODES MANAGEMENT
// ----------------------------------------------------------------------------
adminRouter.get('/promos', requirePermission('promos'), async (_req, res, next) => {
  try {
    const promos = await promoService.getAllPromoCodesAdmin();
    res.json({ success: true, promos });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/promos', requirePermission('promos'), async (req, res, next) => {
  try {
    const promo = await promoService.createPromoCodeAdmin(req.body);
    res.status(201).json({ success: true, message: 'Promo code created successfully.', promo });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/promos/:id', requirePermission('promos'), async (req, res, next) => {
  try {
    const promoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const promo = await promoService.updatePromoCodeAdmin(promoId, req.body);
    res.json({ success: true, message: `Promo code "${promo.code}" updated successfully.`, promo });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/promos/:id/status', requirePermission('promos'), async (req, res, next) => {
  try {
    const promoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;
    const promo = await promoService.setPromoStatusAdmin(promoId, status);
    res.json({ success: true, message: `Promo code set to ${status}.`, promo });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/promos/:id', requirePermission('promos'), async (req, res, next) => {
  try {
    const promoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await promoService.deletePromoCodeAdmin(promoId);
    res.json({ success: true, message: 'Promo code deleted successfully.' });
  } catch (err) {
    next(err);
  }
});
// ----------------------------------------------------------------------------
// 10. SUB-ADMIN / ROLE-BASED ACCESS CONTROL (SUPER ADMIN ONLY)
// ----------------------------------------------------------------------------
adminRouter.get('/sub-admins', requireSuperAdmin, async (_req: AuthenticatedRequest, res: Response, next) => {
  try {
    const rawAdmins = await userRepository.listAdmins();
    const admins = rawAdmins.map(admin => {
      const isSuper = isSuperAdminUser(admin);
      let perms: string[] = [];
      if (isSuper) {
        perms = ['*'];
      } else if (admin.permissions) {
        try {
          perms = typeof admin.permissions === 'string' ? JSON.parse(admin.permissions) : (admin.permissions as any);
          if (!Array.isArray(perms)) perms = [];
        } catch {
          perms = [];
        }
      }
      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status,
        is_super_admin: isSuper,
        permissions: perms,
        last_login_at: admin.last_login_at || null,
        created_at: admin.created_at,
        updated_at: admin.updated_at,
      };
    });

    res.json({ success: true, admins });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/sub-admins', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { name, email, password, permissions, status } = req.body;
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = password || '';

    if (!cleanName) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Name is required.' } });
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'A valid email address is required.' } });
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Password must be at least 6 characters long.' }
      });
    }

    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        error: { code: 'USER_EXISTS', message: 'An account with this email address already exists.' }
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(cleanPassword, salt);
    const id = `admin-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const perms = Array.isArray(permissions)
      ? permissions.filter(p => ALL_ADMIN_PERMISSIONS.includes(p))
      : [];

    await userRepository.createAdmin({
      id,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      isSuperAdmin: false,
      permissions: perms,
      status: status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
      now,
    });

    res.status(201).json({
      success: true,
      message: `Sub-Admin "${cleanName}" created successfully.`,
      admin: {
        id,
        name: cleanName,
        email: cleanEmail,
        role: 'ADMIN',
        status: status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
        is_super_admin: false,
        permissions: perms,
        last_login_at: null,
        created_at: now,
        updated_at: now,
      }
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/sub-admins/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const id = param(req.params.id);
    const { name, permissions, password, status } = req.body;

    const existing = await userRepository.findById(id);
    if (!existing || existing.role !== 'ADMIN') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Administrator not found.' } });
    }

    const isSuper = isSuperAdminUser(existing);

    let passwordHash: string | undefined;
    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return res.status(400).json({
          error: { code: 'INVALID_INPUT', message: 'Password must be at least 6 characters long.' }
        });
      }
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    let perms = isSuper ? [...ALL_ADMIN_PERMISSIONS] : undefined;
    if (!isSuper && Array.isArray(permissions)) {
      perms = permissions.filter(p => ALL_ADMIN_PERMISSIONS.includes(p));
    }

    const now = new Date().toISOString();
    await userRepository.updateAdmin(id, {
      name: name ? name.trim() : undefined,
      permissions: perms,
      passwordHash,
      status: isSuper ? 'ACTIVE' : (status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'),
      now,
    });

    const updated = await userRepository.findById(id);
    res.json({
      success: true,
      message: 'Administrator updated successfully.',
      admin: updated ? {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        is_super_admin: isSuper,
        permissions: perms || [],
        last_login_at: updated.last_login_at || null,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      } : null
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/sub-admins/:id/status', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const id = param(req.params.id);
    const { status } = req.body;

    const existing = await userRepository.findById(id);
    if (!existing || existing.role !== 'ADMIN') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Administrator not found.' } });
    }

    const isSuper = isSuperAdminUser(existing);

    if (isSuper) {
      return res.status(400).json({
        error: { code: 'FORBIDDEN', message: 'Super Administrator accounts cannot be suspended.' }
      });
    }

    const newStatus = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
    const now = new Date().toISOString();
    await userRepository.setAdminStatus(id, newStatus, now);

    res.json({
      success: true,
      message: `Administrator status set to ${newStatus}.`,
      status: newStatus,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete(['/sub-admins/bulk', '/sub-admins'], requireSuperAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Array of administrator IDs is required.' }
      });
    }

    const currentUserId = req.user?.id;
    let deletedCount = 0;

    for (const id of ids) {
      if (!id || typeof id !== 'string') continue;
      const targetUser = await userRepository.findById(id);
      if (!targetUser || targetUser.role !== 'ADMIN') continue;

      if (isSuperAdminUser(targetUser) || targetUser.id === currentUserId) {
        return res.status(400).json({
          error: { code: 'FORBIDDEN', message: 'Cannot delete the Super Admin account or your active session account.' }
        });
      }

      await userRepository.deleteAdmin(id);
      deletedCount++;
    }

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} administrator${deletedCount === 1 ? '' : 's'}.`,
      deletedCount,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/sub-admins/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const id = param(req.params.id);

    if (req.user?.id === id) {
      return res.status(400).json({
        error: { code: 'FORBIDDEN', message: 'You cannot delete your own administrator account.' }
      });
    }

    const existing = await userRepository.findById(id);
    if (!existing || existing.role !== 'ADMIN') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Administrator not found.' } });
    }

    if (isSuperAdminUser(existing)) {
      return res.status(400).json({
        error: { code: 'FORBIDDEN', message: 'Super Administrator accounts cannot be deleted.' }
      });
    }

    await userRepository.deleteAdmin(id);
    res.json({ success: true, message: `Administrator "${existing.name}" deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 11. ADMIN SECURITY & MASTER CREDENTIALS (SUPER ADMIN ONLY)
// ----------------------------------------------------------------------------
adminRouter.put('/security/credentials', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { currentPassword, newPassword, email } = req.body;
    const currentAdmin = req.user;
    if (!currentAdmin) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    }

    // Verify current password if changing password
    if (newPassword && typeof newPassword === 'string' && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return res.status(400).json({
          error: { code: 'INVALID_INPUT', message: 'New password must be at least 6 characters long.' }
        });
      }
      if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
        return res.status(400).json({
          error: { code: 'INVALID_INPUT', message: 'Current password is required to update admin password.' }
        });
      }

      const adminRecord = await userRepository.findById(currentAdmin.id);
      if (!adminRecord) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Administrator account not found.' } });
      }

      let match = false;
      if (config.adminPassword && currentPassword.trim() === config.adminPassword) {
        match = true;
      } else if (adminRecord.password_hash) {
        match = await bcrypt.compare(currentPassword.trim(), adminRecord.password_hash);
      }

      if (!match) {
        return res.status(401).json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Current master password is incorrect.' }
        });
      }

      const salt = await bcrypt.genSalt(12);
      const newHash = await bcrypt.hash(newPassword.trim(), salt);
      const now = new Date().toISOString();
      await userRepository.updatePassword(currentAdmin.id, newHash, now);
      console.log(`[Admin Security] Master password updated for Super Admin (${currentAdmin.email})`);
    }

    // Update email if provided and different
    let updatedEmail = currentAdmin.email;
    if (email && typeof email === 'string' && email.trim() && email.trim().toLowerCase() !== currentAdmin.email.toLowerCase()) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return res.status(400).json({
          error: { code: 'INVALID_INPUT', message: 'Please enter a valid email address.' }
        });
      }

      const existing = await userRepository.findByEmail(cleanEmail);
      if (existing && existing.id !== currentAdmin.id) {
        return res.status(409).json({
          error: { code: 'CONFLICT', message: 'An account with this email address already exists.' }
        });
      }

      const now = new Date().toISOString();
      await userRepository.updateProfileAndEmail(currentAdmin.id, currentAdmin.name || 'Ashu Kataria', cleanEmail, now);
      updatedEmail = cleanEmail;
      console.log(`[Admin Security] Master contact email updated to ${updatedEmail}`);
    }

    res.json({
      success: true,
      message: 'Master Super Admin credentials updated successfully.',
      admin: {
        id: currentAdmin.id,
        email: updatedEmail,
      }
    });
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

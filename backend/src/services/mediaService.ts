import crypto from 'crypto';
import { mediaRepository, MediaRecord } from '../repositories/mediaRepository.js';
import { contentRepository } from '../repositories/contentRepository.js';
import { purchaseRepository } from '../repositories/purchaseRepository.js';
import { monetizationService } from './monetizationService.js';
import { subscriptionService } from './subscriptionService.js';
import { watchPassService } from './watchPassService.js';
import { getAdapter } from '../db/adapter.js';
import { parseYouTubeUrl, isValidMediaUrl } from '../utils/mediaUrl.js';
import { cineproService } from './cineproService.js';
import { isCineproConfigured } from '../config/env.js';


export interface MediaPlayableResponse {
  mediaId?: string;
  mediaType: 'MAIN' | 'TRAILER';
  sourceType: 'UPLOAD' | 'DIRECT_URL' | 'YOUTUBE';
  url: string;
  embedUrl?: string;
  isYouTube: boolean;
  mimeType?: string | null;
  duration?: string | null;
  title: string;
  poster?: string;
  authorized: boolean;
  vcdnVideoId?: string | null;
  vcdnStatus?: string | null;
  vcdnPlaybackUrl?: string | null;
  mediaProvider?: string | null;
  maxResolution?: '720p' | '1080p';
  downloadAllowed?: boolean;
  quality?: string;
  subtitles?: Array<{
    id?: string;
    label: string;
    language: string;
    url: string;
    format?: string;
  }>;
}

export const mediaService = {
  /**
   * Attach media to a movie/series content item
   */
  async attachContentMedia(
    contentId: string,
    params: {
      mediaType: 'MAIN' | 'TRAILER';
      sourceType?: 'UPLOAD' | 'DIRECT_URL' | 'YOUTUBE';
      url: string;
      mimeType?: string;
      duration?: string;
      durationSeconds?: number;
      thumbnail?: string;
      isActive?: boolean;
      vcdnVideoId?: string | null;
      vcdnStatus?: string | null;
      vcdnPlaybackUrl?: string | null;
      vcdnEmbedUrl?: string | null;
      vcdnThumbnailUrl?: string | null;
      mediaProvider?: string | null;
    }
  ): Promise<MediaRecord> {
    const content = await contentRepository.findByIdOrSlug(contentId);
    if (!content) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const cleanUrl = params.url.trim();
    if (!cleanUrl) {
      const err = new Error('Media URL or upload path is required.');
      (err as any).statusCode = 400;
      throw err;
    }

    let detectedSource = params.sourceType || 'DIRECT_URL';
    const yt = parseYouTubeUrl(cleanUrl);

    if (yt.isYouTube) {
      detectedSource = 'YOUTUBE';
    } else if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('uploads/')) {
      // Relative upload paths from the file upload endpoint — treat as UPLOAD
      detectedSource = 'UPLOAD';
    } else if (cleanUrl.includes('cloudinary.com') || params.sourceType === 'UPLOAD') {
      // Cloudinary hosted uploaded media — keep existing UPLOAD sourceType model
      detectedSource = 'UPLOAD';
    } else if (cleanUrl.includes('vcdn.me') || params.vcdnVideoId) {
      detectedSource = 'DIRECT_URL';
    } else if (detectedSource !== 'UPLOAD' && !isValidMediaUrl(cleanUrl)) {
      const err = new Error('Invalid URL. Please provide a valid http or https URL, or upload a file.');
      (err as any).statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    const mediaId = `med-${crypto.randomUUID()}`;
    const mediaProvider = params.mediaProvider || (params.vcdnVideoId || cleanUrl.includes('vcdn.me') ? 'VCDN' : (detectedSource === 'YOUTUBE' ? 'YOUTUBE' : 'LOCAL'));

    await mediaRepository.create({
      id: mediaId,
      contentId: content.id,
      mediaType: params.mediaType,
      sourceType: detectedSource,
      url: cleanUrl,
      mimeType: params.mimeType || (cleanUrl.includes('.m3u8') ? 'application/x-mpegURL' : (detectedSource === 'YOUTUBE' ? 'video/youtube' : 'video/mp4')),
      duration: params.duration || null,
      durationSeconds: params.durationSeconds || 0,
      thumbnail: params.thumbnail || content.poster,
      isActive: params.isActive !== false ? 1 : 0,
      vcdnVideoId: params.vcdnVideoId || null,
      vcdnStatus: params.vcdnStatus || (params.vcdnVideoId ? 'PROCESSING' : null),
      vcdnPlaybackUrl: params.vcdnPlaybackUrl || (cleanUrl.includes('vcdn.me') ? cleanUrl : null),
      vcdnEmbedUrl: params.vcdnEmbedUrl || null,
      vcdnThumbnailUrl: params.vcdnThumbnailUrl || null,
      mediaProvider,
      now,
    });

    // Synchronize to content table for backwards-compatibility
    if (params.mediaType === 'TRAILER') {
      await contentRepository.updateContent(content.id, { trailer_url: cleanUrl });
    } else if (params.mediaType === 'MAIN') {
      await contentRepository.updateContent(content.id, {
        video_url: cleanUrl,
        vcdn_video_id: params.vcdnVideoId || content.vcdn_video_id || null,
        vcdn_status: params.vcdnStatus || (params.vcdnVideoId ? 'PROCESSING' : content.vcdn_status) || null,
        vcdn_playback_url: params.vcdnPlaybackUrl || (cleanUrl.includes('vcdn.me') ? cleanUrl : content.vcdn_playback_url) || null,
        vcdn_embed_url: params.vcdnEmbedUrl || content.vcdn_embed_url || null,
        media_provider: mediaProvider
      });
    }

    return (await mediaRepository.findById(mediaId))!;
  },

  /**
   * Attach media to a series episode
   */
  async attachEpisodeMedia(
    episodeId: string,
    params: {
      mediaType: 'MAIN' | 'TRAILER';
      sourceType?: 'UPLOAD' | 'DIRECT_URL' | 'YOUTUBE';
      url: string;
      mimeType?: string;
      duration?: string;
      durationSeconds?: number;
      thumbnail?: string;
      isActive?: boolean;
      vcdnVideoId?: string | null;
      vcdnStatus?: string | null;
      vcdnPlaybackUrl?: string | null;
      vcdnEmbedUrl?: string | null;
      vcdnThumbnailUrl?: string | null;
      mediaProvider?: string | null;
    }
  ): Promise<MediaRecord> {
    const db = getAdapter();
    const { rows } = await db.query('SELECT * FROM episodes WHERE id = ?', [episodeId]);
    const episode = rows[0] as any;
    if (!episode) {
      const err = new Error('Episode not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const cleanUrl = params.url.trim();
    if (!cleanUrl) {
      const err = new Error('Media URL or upload path is required.');
      (err as any).statusCode = 400;
      throw err;
    }

    let detectedSource = params.sourceType || 'DIRECT_URL';
    const yt = parseYouTubeUrl(cleanUrl);

    if (yt.isYouTube) {
      detectedSource = 'YOUTUBE';
    } else if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('uploads/')) {
      // Relative upload paths from the file upload endpoint — treat as UPLOAD
      detectedSource = 'UPLOAD';
    } else if (cleanUrl.includes('cloudinary.com') || params.sourceType === 'UPLOAD') {
      // Cloudinary hosted uploaded media — keep existing UPLOAD sourceType model
      detectedSource = 'UPLOAD';
    } else if (cleanUrl.includes('vcdn.me') || params.vcdnVideoId) {
      detectedSource = 'DIRECT_URL';
    } else if (detectedSource !== 'UPLOAD' && !isValidMediaUrl(cleanUrl)) {
      const err = new Error('Invalid URL. Please provide a valid http or https URL, or upload a file.');
      (err as any).statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    const mediaId = `med-${crypto.randomUUID()}`;
    const mediaProvider = params.mediaProvider || (params.vcdnVideoId || cleanUrl.includes('vcdn.me') ? 'VCDN' : (detectedSource === 'YOUTUBE' ? 'YOUTUBE' : 'LOCAL'));

    await mediaRepository.create({
      id: mediaId,
      episodeId: episode.id,
      mediaType: params.mediaType,
      sourceType: detectedSource,
      url: cleanUrl,
      mimeType: params.mimeType || (cleanUrl.includes('.m3u8') ? 'application/x-mpegURL' : (detectedSource === 'YOUTUBE' ? 'video/youtube' : 'video/mp4')),
      duration: params.duration || episode.duration,
      durationSeconds: params.durationSeconds || episode.duration_seconds,
      thumbnail: params.thumbnail || episode.thumbnail,
      isActive: params.isActive !== false ? 1 : 0,
      vcdnVideoId: params.vcdnVideoId || null,
      vcdnStatus: params.vcdnStatus || (params.vcdnVideoId ? 'PROCESSING' : null),
      vcdnPlaybackUrl: params.vcdnPlaybackUrl || (cleanUrl.includes('vcdn.me') ? cleanUrl : null),
      vcdnEmbedUrl: params.vcdnEmbedUrl || null,
      vcdnThumbnailUrl: params.vcdnThumbnailUrl || null,
      mediaProvider,
      now,
    });

    // Synchronize to episode table
    if (params.mediaType === 'MAIN') {
      await contentRepository.updateEpisode(episode.id, {
        video_url: cleanUrl,
        vcdn_video_id: params.vcdnVideoId || episode.vcdn_video_id || null,
        vcdn_status: params.vcdnStatus || (params.vcdnVideoId ? 'PROCESSING' : episode.vcdn_status) || null,
        vcdn_playback_url: params.vcdnPlaybackUrl || (cleanUrl.includes('vcdn.me') ? cleanUrl : episode.vcdn_playback_url) || null,
        vcdn_embed_url: params.vcdnEmbedUrl || episode.vcdn_embed_url || null,
        media_provider: mediaProvider
      });
    }

    return (await mediaRepository.findById(mediaId))!;
  },

  /**
   * Get playable media for a movie with access control
   */
  async getPlayableContentMedia(
    contentId: string,
    mediaType: 'MAIN' | 'TRAILER',
    userId?: string,
    userRole?: string
  ): Promise<MediaPlayableResponse> {
    const content = await contentRepository.findByIdOrSlug(contentId);
    if (!content) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    // 1. Trailers are always publicly authorized
    if (mediaType === 'TRAILER') {
      const trailerMedia = await mediaRepository.getActiveMediaForContent(content.id, 'TRAILER');
      const trailerUrl = trailerMedia ? trailerMedia.url : content.trailer_url;

      if (!trailerUrl) {
        const err = new Error('No trailer has been configured for this title yet.');
        (err as any).statusCode = 404;
        throw err;
      }

      const yt = parseYouTubeUrl(trailerUrl);
      return {
        mediaId: trailerMedia?.id,
        mediaType: 'TRAILER',
        sourceType: yt.isYouTube ? 'YOUTUBE' : (trailerMedia?.source_type || 'DIRECT_URL'),
        url: trailerUrl,
        embedUrl: yt.embedUrl,
        isYouTube: yt.isYouTube,
        mimeType: trailerMedia?.mime_type,
        title: `${content.title} — Official Trailer`,
        poster: content.backdrop || content.poster,
        authorized: true,
      };
    }

    // 2. Main video access control
    // ACCESS PRIORITY / ENTITLEMENT RULES:
    // 1. Admin user -> access allowed
    // 2. Free content -> access allowed
    // 3. Existing permanent/valid individual purchase -> access allowed
    // 4. Active Watch Pass across catalog -> access allowed
    // 5. Active full subscription -> access allowed according to existing subscription rules
    // 6. Otherwise -> access denied
    const isFree = content.price === 0;
    const isAdmin = userRole === 'ADMIN';
    const isOwned = isAdmin || (userId ? await purchaseRepository.isOwned(userId, content.id) : false);
    const hasActivePass = userId ? await watchPassService.hasActivePass(userId) : false;
    const hasActiveSub = userId ? await subscriptionService.hasActiveSubscription(userId) : false;

    if (!isAdmin && !isFree && !isOwned && !hasActivePass && !hasActiveSub) {
      const monetizationMode = await monetizationService.getMonetizationMode();
      const err = new Error(
        monetizationMode === 'SUBSCRIPTION'
          ? 'Active subscription or Watch Pass required to watch this movie.'
          : 'Purchase or Watch Pass required to watch this movie.'
      );
      (err as any).statusCode = 403;
      (err as any).code = monetizationMode === 'SUBSCRIPTION' ? 'SUBSCRIPTION_REQUIRED' : 'PURCHASE_REQUIRED';
      throw err;
    }

    // Determine quality and download capabilities
    let maxResolution: '720p' | '1080p' = '1080p';
    let downloadAllowed = true;

    if (!isAdmin && !isFree && !isOwned && !hasActiveSub) {
      if (hasActivePass && userId) {
        const passCaps = await watchPassService.getActivePassCapabilities(userId);
        maxResolution = passCaps.maxResolution;
        downloadAllowed = passCaps.downloadAllowed;
      }
    }

    const mainMedia = await mediaRepository.getActiveMediaForContent(content.id, 'MAIN');
    let mainVideoUrl = mainMedia ? mainMedia.url : content.video_url;

    // Trailer video must remain completely separate from MAIN movie video
    if (!mainMedia && content.trailer_url && mainVideoUrl === content.trailer_url) {
      mainVideoUrl = null;
    }

    // Filter out temporary demo streams immediately
    if (mainVideoUrl && (mainVideoUrl.includes('commondatastorage.googleapis.com') || mainVideoUrl.includes('test-streams.mux.dev') || mainVideoUrl.includes('vjs.zencdn.net'))) {
      mainVideoUrl = null;
    }

    let resolvedSubtitles: Array<{ id?: string; label: string; language: string; url: string; format?: string }> | undefined = undefined;
    let resolvedQuality: string | undefined = undefined;
    let mediaProvider = mainMedia?.media_provider || content.media_provider || 'LOCAL';

    // CinePro Resolution:
    // If title is marked CINEPRO, or CinePro is configured & title needs provider resolution:
    if (mediaProvider === 'CINEPRO' || (!mainVideoUrl && isCineproConfigured())) {
      try {
        const streamSource = await cineproService.getMovieStream(content.id, content.title);
        if (streamSource?.streamUrl) {
          mainVideoUrl = streamSource.streamUrl;
          resolvedSubtitles = streamSource.subtitles;
          resolvedQuality = streamSource.quality;
          mediaProvider = 'CINEPRO';
        }
      } catch (err: any) {
        if (mediaProvider === 'CINEPRO') {
          const streamErr = new Error(err.message || 'Streaming source is currently unavailable from provider.');
          (streamErr as any).statusCode = err.statusCode || 404;
          (streamErr as any).code = err.code || 'STREAM_UNAVAILABLE';
          throw streamErr;
        }
        console.warn('[MediaService] CinePro stream resolution attempt:', err?.message || err);
      }
    }

    if (!mainVideoUrl) {
      const err = new Error('Main video is not available yet. The administrator has not configured media for this title.');
      (err as any).statusCode = 404;
      (err as any).code = 'MEDIA_NOT_CONFIGURED';
      throw err;
    }

    const vcdnVideoId = mainMedia?.vcdn_video_id || content.vcdn_video_id || null;
    const vcdnStatus = mainMedia?.vcdn_status || content.vcdn_status || null;
    const vcdnPlaybackUrl = mainMedia?.vcdn_playback_url || content.vcdn_playback_url || null;
    if (mediaProvider !== 'CINEPRO') {
      mediaProvider = (vcdnVideoId ? 'VCDN' : 'LOCAL');
    }

    // Prefer HLS playback URL if available from VCDN
    if (vcdnPlaybackUrl && (!mainVideoUrl || vcdnStatus === 'READY' || mainVideoUrl.includes('vcdn.me'))) {
      mainVideoUrl = vcdnPlaybackUrl;
    }

    const yt = parseYouTubeUrl(mainVideoUrl);
    return {
      mediaId: mainMedia?.id || (mediaProvider === 'CINEPRO' ? `cinepro-${content.id}` : undefined),
      mediaType: 'MAIN',
      sourceType: yt.isYouTube ? 'YOUTUBE' : (mainMedia?.source_type || 'DIRECT_URL'),
      url: mainVideoUrl,
      embedUrl: yt.embedUrl,
      isYouTube: yt.isYouTube,
      mimeType: mainMedia?.mime_type || (mainVideoUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'),
      duration: mainMedia?.duration || content.duration,
      title: content.title,
      poster: content.backdrop || content.poster,
      authorized: true,
      vcdnVideoId,
      vcdnStatus,
      vcdnPlaybackUrl,
      mediaProvider,
      maxResolution,
      downloadAllowed,
      quality: resolvedQuality,
      subtitles: resolvedSubtitles
    };
  },

  /**
   * Get playable media for an episode with access control
   */
  async getPlayableEpisodeMedia(
    episodeId: string,
    mediaType: 'MAIN' | 'TRAILER',
    userId?: string,
    userRole?: string
  ): Promise<MediaPlayableResponse> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT e.*, s.content_id, s.content_id as series_id, s.season_number, c.title as series_title, c.price,
              c.poster as series_poster, c.backdrop as series_backdrop,
              c.trailer_url as series_trailer_url
       FROM episodes e
       JOIN seasons s ON e.season_id = s.id
       JOIN content c ON s.content_id = c.id
       WHERE e.id = ?`,
      [episodeId]
    );
    const episode = rows[0] as any;

    if (!episode) {
      const err = new Error('Episode not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    // Trailers are publicly authorized
    if (mediaType === 'TRAILER') {
      const trailerMedia = await mediaRepository.getActiveMediaForEpisode(episode.id, 'TRAILER');
      if (!trailerMedia || !trailerMedia.url) {
        const err = new Error('No trailer configured for this episode.');
        (err as any).statusCode = 404;
        throw err;
      }

      const yt = parseYouTubeUrl(trailerMedia.url);
      return {
        mediaId: trailerMedia.id,
        mediaType: 'TRAILER',
        sourceType: yt.isYouTube ? 'YOUTUBE' : trailerMedia.source_type,
        url: trailerMedia.url,
        embedUrl: yt.embedUrl,
        isYouTube: yt.isYouTube,
        title: `${episode.series_title} — ${episode.title} (Trailer)`,
        poster: episode.thumbnail || episode.series_backdrop,
        authorized: true,
      };
    }

    // Main episode access control
    // ACCESS PRIORITY / ENTITLEMENT RULES:
    // 1. Admin user -> access allowed
    // 2. Free content -> access allowed
    // 3. Existing permanent/valid individual purchase -> access allowed
    // 4. Active Watch Pass across catalog -> access allowed
    // 5. Active full subscription -> access allowed according to existing subscription rules
    // 6. Otherwise -> access denied
    const isFree = episode.price === 0;
    const isAdmin = userRole === 'ADMIN';
    const isOwned = isAdmin || (userId ? await purchaseRepository.isOwned(userId, episode.content_id) : false);
    const hasActivePass = userId ? await watchPassService.hasActivePass(userId) : false;
    const hasActiveSub = userId ? await subscriptionService.hasActiveSubscription(userId) : false;

    if (!isAdmin && !isFree && !isOwned && !hasActivePass && !hasActiveSub) {
      const monetizationMode = await monetizationService.getMonetizationMode();
      const err = new Error(
        monetizationMode === 'SUBSCRIPTION'
          ? 'Active subscription or Watch Pass required to watch this series episode.'
          : 'Purchase or Watch Pass required to watch this series episode.'
      );
      (err as any).statusCode = 403;
      (err as any).code = monetizationMode === 'SUBSCRIPTION' ? 'SUBSCRIPTION_REQUIRED' : 'PURCHASE_REQUIRED';
      throw err;
    }

    // Determine quality and download capabilities
    let maxResolution: '720p' | '1080p' = '1080p';
    let downloadAllowed = true;

    if (!isAdmin && !isFree && !isOwned && !hasActiveSub) {
      if (hasActivePass && userId) {
        const passCaps = await watchPassService.getActivePassCapabilities(userId);
        maxResolution = passCaps.maxResolution;
        downloadAllowed = passCaps.downloadAllowed;
      }
    }

    const mainMedia = await mediaRepository.getActiveMediaForEpisode(episode.id, 'MAIN');
    let videoUrl = mainMedia ? mainMedia.url : episode.video_url;
    let resolvedSubtitles: Array<{ id?: string; label: string; language: string; url: string; format?: string }> | undefined = undefined;
    let resolvedQuality: string | undefined = undefined;
    let mediaProvider = mainMedia?.media_provider || episode.media_provider || 'LOCAL';

    // Ensure episode never accidentally uses the series trailer
    if (!mainMedia && episode.series_trailer_url && videoUrl === episode.series_trailer_url) {
      videoUrl = null;
    }

    // Filter out temporary demo streams immediately
    if (videoUrl && (videoUrl.includes('commondatastorage.googleapis.com') || videoUrl.includes('test-streams.mux.dev') || videoUrl.includes('vjs.zencdn.net'))) {
      videoUrl = null;
    }

    // CinePro Resolution for Episodes:
    if (mediaProvider === 'CINEPRO' || (!videoUrl && isCineproConfigured())) {
      try {
        const seriesContentId = episode.series_id || episode.content_id;
        const seasonNum = episode.season_number ?? 1;
        const episodeNum = episode.episode_number ?? 1;

        const streamSource = await cineproService.getEpisodeStream(seriesContentId, episode.id, {
          seriesTitle: episode.series_title,
          seasonNumber: seasonNum,
          episodeNumber: episodeNum
        });
        if (streamSource?.streamUrl) {
          videoUrl = streamSource.streamUrl;
          resolvedSubtitles = streamSource.subtitles;
          resolvedQuality = streamSource.quality;
          mediaProvider = 'CINEPRO';
        }
      } catch (err: any) {
        if (mediaProvider === 'CINEPRO') {
          const streamErr = new Error(err.message || 'Episode streaming source is currently unavailable from provider.');
          (streamErr as any).statusCode = err.statusCode || 404;
          (streamErr as any).code = err.code || 'STREAM_UNAVAILABLE';
          throw streamErr;
        }
        console.warn('[MediaService] CinePro episode stream resolution attempt:', err?.message || err);
      }
    }

    if (!videoUrl) {
      const err = new Error('Episode video is not available yet.');
      (err as any).statusCode = 404;
      (err as any).code = 'MEDIA_NOT_CONFIGURED';
      throw err;
    }

    const vcdnVideoId = mainMedia?.vcdn_video_id || episode.vcdn_video_id || null;
    const vcdnStatus = mainMedia?.vcdn_status || episode.vcdn_status || null;
    const vcdnPlaybackUrl = mainMedia?.vcdn_playback_url || episode.vcdn_playback_url || null;
    if (mediaProvider !== 'CINEPRO') {
      mediaProvider = (vcdnVideoId ? 'VCDN' : 'LOCAL');
    }

    if (vcdnPlaybackUrl && (!videoUrl || vcdnStatus === 'READY' || videoUrl.includes('vcdn.me'))) {
      videoUrl = vcdnPlaybackUrl;
    }

    const yt = parseYouTubeUrl(videoUrl);
    return {
      mediaId: mainMedia?.id || (mediaProvider === 'CINEPRO' ? `cinepro-ep-${episode.id}` : undefined),
      mediaType: 'MAIN',
      sourceType: yt.isYouTube ? 'YOUTUBE' : (mainMedia?.source_type || 'DIRECT_URL'),
      url: videoUrl,
      embedUrl: yt.embedUrl,
      isYouTube: yt.isYouTube,
      mimeType: mainMedia?.mime_type || (videoUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'),
      duration: episode.duration,
      title: `${episode.series_title}: ${(episode.title || '').replace(/^Episode\s*\d+\s*[:\-]\s*/i, '').trim() || episode.title}`,
      poster: episode.thumbnail || episode.series_backdrop,
      authorized: true,
      vcdnVideoId,
      vcdnStatus,
      vcdnPlaybackUrl,
      mediaProvider,
      maxResolution,
      downloadAllowed,
      quality: resolvedQuality,
      subtitles: resolvedSubtitles
    };
  },

  async getAllMediaForContent(contentId: string): Promise<MediaRecord[]> {
    return mediaRepository.getMediaForContent(contentId);
  },

  async getAllMediaForEpisode(episodeId: string): Promise<MediaRecord[]> {
    return mediaRepository.getMediaForEpisode(episodeId);
  },

  async deleteMedia(mediaId: string): Promise<void> {
    await mediaRepository.delete(mediaId);
  },
};

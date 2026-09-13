import crypto from 'crypto';
import { mediaRepository, MediaRecord } from '../repositories/mediaRepository.js';
import { contentRepository } from '../repositories/contentRepository.js';
import { purchaseRepository } from '../repositories/purchaseRepository.js';
import { getAdapter } from '../db/adapter.js';
import { parseYouTubeUrl, isValidMediaUrl } from '../utils/mediaUrl.js';

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
    } else if (detectedSource !== 'UPLOAD' && !isValidMediaUrl(cleanUrl)) {
      const err = new Error('Invalid URL. Please provide a valid http or https URL.');
      (err as any).statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    const mediaId = `med-${crypto.randomUUID()}`;

    await mediaRepository.create({
      id: mediaId,
      contentId: content.id,
      mediaType: params.mediaType,
      sourceType: detectedSource,
      url: cleanUrl,
      mimeType: params.mimeType || (detectedSource === 'YOUTUBE' ? 'video/youtube' : 'video/mp4'),
      duration: params.duration || null,
      durationSeconds: params.durationSeconds || 0,
      thumbnail: params.thumbnail || content.poster,
      isActive: params.isActive !== false ? 1 : 0,
      now,
    });

    // Synchronize to content table for backwards-compatibility
    if (params.mediaType === 'TRAILER') {
      await contentRepository.updateContent(content.id, { trailer_url: cleanUrl });
    } else if (params.mediaType === 'MAIN') {
      await contentRepository.updateContent(content.id, { video_url: cleanUrl });
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
    } else if (detectedSource !== 'UPLOAD' && !isValidMediaUrl(cleanUrl)) {
      const err = new Error('Invalid URL. Please provide a valid http or https URL.');
      (err as any).statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    const mediaId = `med-${crypto.randomUUID()}`;

    await mediaRepository.create({
      id: mediaId,
      episodeId: episode.id,
      mediaType: params.mediaType,
      sourceType: detectedSource,
      url: cleanUrl,
      mimeType: params.mimeType || (detectedSource === 'YOUTUBE' ? 'video/youtube' : 'video/mp4'),
      duration: params.duration || episode.duration,
      durationSeconds: params.durationSeconds || episode.duration_seconds,
      thumbnail: params.thumbnail || episode.thumbnail,
      isActive: params.isActive !== false ? 1 : 0,
      now,
    });

    // Synchronize to episode table
    if (params.mediaType === 'MAIN') {
      await db.run('UPDATE episodes SET video_url = ?, updated_at = ? WHERE id = ?', [
        cleanUrl,
        now,
        episode.id,
      ]);
    }

    return (await mediaRepository.findById(mediaId))!;
  },

  /**
   * Get playable media for a movie with access control
   */
  async getPlayableContentMedia(
    contentId: string,
    mediaType: 'MAIN' | 'TRAILER',
    userId?: string
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
    const isFree = content.price === 0;
    const isOwned = userId ? await purchaseRepository.isOwned(userId, content.id) : false;

    if (!isFree && !isOwned) {
      const err = new Error('Purchase required to watch this movie.');
      (err as any).statusCode = 403;
      (err as any).code = 'PURCHASE_REQUIRED';
      throw err;
    }

    const mainMedia = await mediaRepository.getActiveMediaForContent(content.id, 'MAIN');
    let mainVideoUrl = mainMedia ? mainMedia.url : content.video_url;

    // Trailer video must remain completely separate from MAIN movie video
    if (!mainMedia && content.trailer_url && mainVideoUrl === content.trailer_url) {
      mainVideoUrl = null;
    }

    if (!mainVideoUrl) {
      const err = new Error('Main video is not available yet. The administrator has not configured media for this title.');
      (err as any).statusCode = 404;
      (err as any).code = 'MEDIA_NOT_CONFIGURED';
      throw err;
    }

    const yt = parseYouTubeUrl(mainVideoUrl);
    return {
      mediaId: mainMedia?.id,
      mediaType: 'MAIN',
      sourceType: yt.isYouTube ? 'YOUTUBE' : (mainMedia?.source_type || 'DIRECT_URL'),
      url: mainVideoUrl,
      embedUrl: yt.embedUrl,
      isYouTube: yt.isYouTube,
      mimeType: mainMedia?.mime_type,
      duration: mainMedia?.duration || content.duration,
      title: content.title,
      poster: content.backdrop || content.poster,
      authorized: true,
    };
  },

  /**
   * Get playable media for an episode with access control
   */
  async getPlayableEpisodeMedia(
    episodeId: string,
    mediaType: 'MAIN' | 'TRAILER',
    userId?: string
  ): Promise<MediaPlayableResponse> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT e.*, s.content_id, c.title as series_title, c.price,
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
    const isFree = episode.price === 0;
    const isOwned = userId ? await purchaseRepository.isOwned(userId, episode.content_id) : false;

    if (!isFree && !isOwned) {
      const err = new Error('Purchase required to watch this series episode.');
      (err as any).statusCode = 403;
      (err as any).code = 'PURCHASE_REQUIRED';
      throw err;
    }

    const mainMedia = await mediaRepository.getActiveMediaForEpisode(episode.id, 'MAIN');
    let videoUrl = mainMedia ? mainMedia.url : episode.video_url;

    // Ensure episode never accidentally uses the series trailer
    if (!mainMedia && episode.series_trailer_url && videoUrl === episode.series_trailer_url) {
      videoUrl = null;
    }

    if (!videoUrl) {
      const err = new Error('Episode video is not available yet.');
      (err as any).statusCode = 404;
      (err as any).code = 'MEDIA_NOT_CONFIGURED';
      throw err;
    }

    const yt = parseYouTubeUrl(videoUrl);
    return {
      mediaId: mainMedia?.id,
      mediaType: 'MAIN',
      sourceType: yt.isYouTube ? 'YOUTUBE' : (mainMedia?.source_type || 'DIRECT_URL'),
      url: videoUrl,
      embedUrl: yt.embedUrl,
      isYouTube: yt.isYouTube,
      mimeType: mainMedia?.mime_type,
      duration: episode.duration,
      title: `${episode.series_title}: ${episode.title}`,
      poster: episode.thumbnail || episode.series_backdrop,
      authorized: true,
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

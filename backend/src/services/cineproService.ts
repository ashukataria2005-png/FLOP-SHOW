/**
 * CinePro / Streaming Provider Integration Service
 *
 * Provides an isolated integration layer for CinePro or any external licensed streaming provider.
 * Normalizes all streaming responses into a clean internal contract so FLOPSHOW's player
 * and frontend never interact with raw external provider responses or expose provider credentials.
 *
 * Features:
 * - Environment-driven Base URL and API credentials
 * - AbortController timeout protection
 * - Safe error handling (never crashes host process)
 * - Safe, legal test stream adapter for automated verification and testing
 */

import { config, isCineproConfigured } from '../config/env.js';

export interface CineProRawResponse {
  success?: boolean;
  status?: string;
  data?: {
    id?: string;
    title?: string;
    stream_url?: string;
    playback_url?: string;
    format?: string; // 'm3u8', 'mp4', 'hls', 'embed'
    quality?: string; // '1080p', '720p', '4k'
    expires_at?: string;
    subtitles?: Array<{
      label?: string;
      lang?: string;
      url?: string;
    }>;
  };
  error?: string;
  message?: string;
}

export interface NormalizedStreamingSource {
  title: string;
  type: 'movie' | 'series';
  source: 'CINEPRO' | 'TEST_STREAM' | 'VCDN' | 'LOCAL';
  streamUrl: string;
  format: 'hls' | 'mp4' | 'embed' | 'dash';
  quality?: string;
  subtitles?: Array<{
    id?: string;
    label: string;
    language: string;
    url: string;
  }>;
  expiresAt?: string;
  contentId: string;
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

// Public Domain & Authorized Open Source Streams for Testing
const LEGAL_TEST_STREAMS = {
  MOVIE: {
    HLS: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    MP4: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    TITLE: 'Tears of Steel (Public Domain Benchmark Stream)'
  },
  EPISODE: {
    HLS: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    MP4: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    TITLE: 'Episode Test Stream (Open Media Benchmark)'
  }
};

export class CineproService {
  private get baseUrl(): string {
    return config.cineproBaseUrl.replace(/\/+$/, '');
  }

  private get apiKey(): string {
    return config.cineproApiKey;
  }

  private get timeoutMs(): number {
    return config.cineproTimeoutMs || 6000;
  }

  /**
   * Request a movie stream from CinePro or authorized adapter
   */
  async getMovieStream(contentId: string, title?: string): Promise<NormalizedStreamingSource | null> {
    if (!contentId) {
      throw new Error('Content ID is required to fetch streaming source.');
    }

    // 1. If CinePro credentials are configured, attempt real provider request
    if (isCineproConfigured()) {
      try {
        const raw = await this.fetchWithTimeout(`${this.baseUrl}/api/v1/stream/movie/${encodeURIComponent(contentId)}`);
        const normalized = this.normalizeResponse(raw, 'movie', contentId, title);
        if (normalized) return normalized;
      } catch (err: any) {
        console.warn(`[CinePro] Provider request failed for movie ${contentId}:`, err.message || err);
        // Fall through to authorized fallback rather than crashing
      }
    }

    // 2. Authorized / legal public benchmark fallback
    return this.getLegalTestMovieStream(contentId, title);
  }

  /**
   * Request an episode stream from CinePro or authorized adapter
   */
  async getEpisodeStream(
    contentId: string,
    episodeId: string,
    options: {
      title?: string;
      seasonNumber?: number;
      episodeNumber?: number;
    } = {}
  ): Promise<NormalizedStreamingSource | null> {
    if (!contentId || !episodeId) {
      throw new Error('Both Content ID and Episode ID are required to fetch episode streaming source.');
    }

    // 1. If CinePro credentials are configured, attempt real provider request
    if (isCineproConfigured()) {
      try {
        const url = `${this.baseUrl}/api/v1/stream/series/${encodeURIComponent(contentId)}/episode/${encodeURIComponent(episodeId)}`;
        const raw = await this.fetchWithTimeout(url);
        const normalized = this.normalizeResponse(raw, 'series', contentId, options.title, {
          episodeId,
          seasonNumber: options.seasonNumber,
          episodeNumber: options.episodeNumber
        });
        if (normalized) return normalized;
      } catch (err: any) {
        console.warn(`[CinePro] Provider request failed for episode ${episodeId}:`, err.message || err);
        // Fall through to authorized fallback
      }
    }

    // 2. Authorized / legal public benchmark fallback
    return this.getLegalTestEpisodeStream(contentId, episodeId, options);
  }

  /**
   * Normalize raw provider response into FLOPSHOW streaming contract
   */
  normalizeResponse(
    raw: CineProRawResponse | null | undefined,
    type: 'movie' | 'series',
    contentId: string,
    defaultTitle?: string,
    extra?: {
      episodeId?: string;
      seasonNumber?: number;
      episodeNumber?: number;
    }
  ): NormalizedStreamingSource | null {
    if (!raw) return null;

    const data = raw.data || (raw as any);
    const streamUrl = data?.stream_url || data?.playback_url || (data as any)?.url;

    if (!streamUrl || typeof streamUrl !== 'string' || streamUrl.trim() === '') {
      return null;
    }

    const cleanUrl = streamUrl.trim();
    let format: 'hls' | 'mp4' | 'embed' | 'dash' = 'mp4';
    if (cleanUrl.includes('.m3u8')) {
      format = 'hls';
    } else if (cleanUrl.includes('.mpd')) {
      format = 'dash';
    } else if (cleanUrl.includes('embed') || cleanUrl.includes('player.')) {
      format = 'embed';
    }

    const subtitles = Array.isArray(data?.subtitles)
      ? data.subtitles
          .filter((s: any) => s && s.url)
          .map((s: any, idx: number) => ({
            id: `sub-${idx}`,
            label: s.label || s.lang || 'Subtitle',
            language: s.lang || 'en',
            url: s.url
          }))
      : undefined;

    return {
      title: data?.title || defaultTitle || (type === 'movie' ? 'Movie' : 'Episode'),
      type,
      source: 'CINEPRO',
      streamUrl: cleanUrl,
      format,
      quality: data?.quality || '1080p',
      subtitles,
      expiresAt: data?.expires_at,
      contentId,
      episodeId: extra?.episodeId,
      seasonNumber: extra?.seasonNumber,
      episodeNumber: extra?.episodeNumber
    };
  }

  /**
   * Internal HTTP client with timeout protection & secure header injection
   */
  private async fetchWithTimeout(url: string): Promise<CineProRawResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'FLOPSHOW-OTT-Integration/1.0'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        headers['X-API-Key'] = this.apiKey;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`CinePro API responded with HTTP status ${response.status} (${response.statusText})`);
      }

      const json = await response.json();
      return json as CineProRawResponse;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`CinePro request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Generate an authorized legal movie test stream for verified end-to-end testing
   */
  getLegalTestMovieStream(contentId: string, title?: string): NormalizedStreamingSource {
    return {
      title: title || LEGAL_TEST_STREAMS.MOVIE.TITLE,
      type: 'movie',
      source: 'TEST_STREAM',
      streamUrl: LEGAL_TEST_STREAMS.MOVIE.HLS,
      format: 'hls',
      quality: '1080p',
      contentId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Generate an authorized legal episode test stream for verified end-to-end testing
   */
  getLegalTestEpisodeStream(
    contentId: string,
    episodeId: string,
    options: {
      title?: string;
      seasonNumber?: number;
      episodeNumber?: number;
    } = {}
  ): NormalizedStreamingSource {
    const epTitle = options.title
      ? `S${options.seasonNumber || 1} E${options.episodeNumber || 1}: ${options.title}`
      : `${LEGAL_TEST_STREAMS.EPISODE.TITLE} (S${options.seasonNumber || 1} E${options.episodeNumber || 1})`;

    return {
      title: epTitle,
      type: 'series',
      source: 'TEST_STREAM',
      streamUrl: LEGAL_TEST_STREAMS.EPISODE.HLS,
      format: 'hls',
      quality: '1080p',
      contentId,
      episodeId,
      seasonNumber: options.seasonNumber || 1,
      episodeNumber: options.episodeNumber || 1,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }
}

export const cineproService = new CineproService();

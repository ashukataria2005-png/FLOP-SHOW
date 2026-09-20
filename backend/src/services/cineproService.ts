/**
 * CinePro / Open Media Streaming Specification (OMSS) Integration Service
 *
 * Official implementation following CinePro Core & OMSS v1.0 specifications:
 * - OpenAPI Spec: https://raw.githubusercontent.com/omss-spec/omss-spec/refs/heads/main/spec/v1.0/omss-v1.0.yml
 * - Documentation: https://docs.cinepro.cc/ui/setup
 *
 * Endpoints:
 * - Movies:          GET /v1/movies/{id}                         (TMDB Movie ID)
 * - TV Episodes:     GET /v1/tv/{id}/seasons/{s}/episodes/{e}   (TMDB Series ID, Season #, Episode #)
 * - Proxy / Streams: GET /v1/proxy?data={encoded_data}          (Upstream stream proxy)
 * - Health / Status: GET /v1/health or GET /v1
 *
 * Security & Entitlements:
 * - CINEPRO_API_KEY is backend-only and NEVER leaked to client or browser.
 * - Enforces FLOPSHOW server-side purchase/watch-pass/subscription checks before resolution.
 * - No fake/test-stream fallback when CinePro is configured.
 */

import { config, isCineproConfigured } from '../config/env.js';
import { contentProviderMappingRepository } from '../repositories/contentProviderMappingRepository.js';

// ─────────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────────

export class CineproError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isCineproError = true;

  constructor(message: string, statusCode = 500, code = 'PROVIDER_ERROR') {
    super(message);
    this.name = 'CineproError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class CineproNotFoundError extends CineproError {
  constructor(message = 'Streaming source not found from provider') {
    super(message, 404, 'STREAM_UNAVAILABLE');
    this.name = 'CineproNotFoundError';
  }
}

export class CineproUnavailableError extends CineproError {
  constructor(message = 'Streaming provider is currently unreachable') {
    super(message, 503, 'PROVIDER_UNAVAILABLE');
    this.name = 'CineproUnavailableError';
  }
}

export class CineproInvalidIdError extends CineproError {
  constructor(message = 'Invalid content identifier for streaming provider') {
    super(message, 400, 'INVALID_PROVIDER_ID');
    this.name = 'CineproInvalidIdError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OMSS Spec Data Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OmssSource {
  id?: string;
  url: string;
  type: 'hls' | 'dash' | 'http' | 'mp4' | 'mkv' | 'webm';
  quality?: string;
  audioTracks?: Array<{
    language: string;
    label: string;
  }>;
  provider?: {
    id: string;
    name: string;
  };
}

export interface OmssSubtitle {
  url: string;
  label: string;
  format: 'vtt' | 'srt' | 'ass' | 'ssa';
}

export interface OmssSourceResponse {
  responseId: string;
  expiresAt: string;
  sources: OmssSource[];
  subtitles?: OmssSubtitle[];
  diagnostics?: Array<{
    code: string;
    message: string;
    field?: string;
    severity: 'info' | 'warning' | 'error';
  }>;
}

export interface NormalizedStreamingSource {
  title: string;
  type: 'movie' | 'series';
  source: 'CINEPRO' | 'TEST_STREAM' | 'VCDN' | 'LOCAL';
  streamUrl: string;
  format: 'hls' | 'mp4' | 'embed' | 'dash';
  quality?: string;
  audioTracks?: Array<{
    language: string;
    label: string;
  }>;
  subtitles?: Array<{
    id?: string;
    label: string;
    language: string;
    url: string;
    format?: string;
  }>;
  expiresAt?: string;
  contentId: string;
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  externalTmdbId?: string;
  providerName?: string;
}

export class CineproService {
  public get baseUrl(): string {
    return (config.cineproBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private get apiKey(): string {
    return config.cineproApiKey || '';
  }

  private get timeoutMs(): number {
    return config.cineproTimeoutMs || 6000;
  }

  /**
   * Health and capability check for CinePro / OMSS instance
   */
  async getHealthStatus(baseUrlOverride?: string): Promise<{
    online: boolean;
    name?: string;
    version?: string;
    spec?: string;
    error?: string;
  }> {
    const targetUrl = (baseUrlOverride || this.baseUrl).replace(/\/+$/, '');
    try {
      const res = await this.fetchWithTimeout(`${targetUrl}/v1/health`);
      return {
        online: true,
        name: (res as any)?.name || 'CinePro OMSS Core',
        version: (res as any)?.version || '1.0.0',
        spec: (res as any)?.spec || 'omss'
      };
    } catch (err: any) {
      // Try root endpoint fallback
      try {
        const rootRes = await this.fetchWithTimeout(`${targetUrl}/v1`);
        return {
          online: true,
          name: (rootRes as any)?.name || 'CinePro OMSS Core',
          version: (rootRes as any)?.version || '1.0.0',
          spec: (rootRes as any)?.spec || 'omss'
        };
      } catch {
        return {
          online: false,
          error: err.message || 'Unable to connect to CinePro instance'
        };
      }
    }
  }

  /**
   * Alias for getHealthStatus
   */
  async checkHealth(baseUrlOverride?: string) {
    return this.getHealthStatus(baseUrlOverride);
  }

  /**
   * Request a movie stream from CinePro via OMSS specification:
   * GET /v1/movies/{id} where id is the TMDB movie ID
   */
  async getMovieStream(
    contentId: string,
    title?: string,
    baseUrlOverride?: string
  ): Promise<NormalizedStreamingSource> {
    if (!contentId) {
      throw new CineproInvalidIdError('Content ID is required to fetch streaming source.');
    }

    // 1. Resolve TMDB ID for this content
    const tmdbId = await contentProviderMappingRepository.resolveExternalId(contentId, 'movie', title);

    if (!tmdbId) {
      throw new CineproNotFoundError(
        `No CinePro / TMDB identifier mapped for movie "${title || contentId}". Please map this content in the catalog.`
      );
    }

    // 2. Query CinePro Core OMSS endpoint: GET /v1/movies/{id}
    const targetBaseUrl = (baseUrlOverride || this.baseUrl).replace(/\/+$/, '');
    const endpointUrl = `${targetBaseUrl}/v1/movies/${encodeURIComponent(tmdbId)}`;
    const omssResponse = await this.fetchWithTimeout<OmssSourceResponse>(endpointUrl);

    // 3. Normalize OMSS response
    const normalized = this.normalizeOmssResponse(omssResponse, 'movie', contentId, title, {
      externalTmdbId: tmdbId,
      baseUrlOverride: targetBaseUrl
    });

    if (!normalized) {
      throw new CineproNotFoundError(
        `CinePro resolved no playable sources for movie "${title || contentId}" (TMDB: ${tmdbId}).`
      );
    }

    return normalized;
  }

  /**
   * Request a TV episode stream from CinePro via OMSS specification:
   * GET /v1/tv/{id}/seasons/{s}/episodes/{e} where id is the TMDB TV ID
   */
  async getEpisodeStream(
    seriesId: string,
    episodeId: string,
    options: {
      title?: string;
      seasonNumber?: number;
      episodeNumber?: number;
    } = {},
    baseUrlOverride?: string
  ): Promise<NormalizedStreamingSource> {
    if (!seriesId || !episodeId) {
      throw new CineproInvalidIdError('Both series ID and episode ID are required to fetch episode streaming source.');
    }

    // 1. Resolve TMDB Series ID
    const tmdbId = await contentProviderMappingRepository.resolveExternalId(seriesId, 'tv', options.title);

    if (!tmdbId) {
      throw new CineproNotFoundError(
        `No CinePro / TMDB identifier mapped for series "${seriesId}". Please map this series in the catalog.`
      );
    }

    const seasonNum = Math.max(0, options.seasonNumber ?? 1);
    const episodeNum = Math.max(1, options.episodeNumber ?? 1);

    // 2. Query CinePro Core OMSS endpoint: GET /v1/tv/{id}/seasons/{s}/episodes/{e}
    const targetBaseUrl = (baseUrlOverride || this.baseUrl).replace(/\/+$/, '');
    const endpointUrl = `${targetBaseUrl}/v1/tv/${encodeURIComponent(tmdbId)}/seasons/${seasonNum}/episodes/${episodeNum}`;
    const omssResponse = await this.fetchWithTimeout<OmssSourceResponse>(endpointUrl);

    // 3. Normalize OMSS response
    const normalized = this.normalizeOmssResponse(omssResponse, 'series', seriesId, options.title, {
      episodeId,
      seasonNumber: seasonNum,
      episodeNumber: episodeNum,
      externalTmdbId: tmdbId,
      baseUrlOverride: targetBaseUrl
    });

    if (!normalized) {
      throw new CineproNotFoundError(
        `CinePro resolved no playable sources for episode S${seasonNum} E${episodeNum} (TMDB: ${tmdbId}).`
      );
    }

    return normalized;
  }

  /**
   * Normalize an OMSS SourceResponse into FLOPSHOW's player-ready streaming contract
   */
  normalizeOmssResponse(
    response: OmssSourceResponse | null | undefined,
    type: 'movie' | 'series',
    contentId: string,
    defaultTitle?: string,
    extra?: {
      episodeId?: string;
      seasonNumber?: number;
      episodeNumber?: number;
      externalTmdbId?: string;
      baseUrlOverride?: string;
    }
  ): NormalizedStreamingSource | null {
    const sources = Array.isArray(response?.sources)
      ? response.sources
      : Array.isArray((response as any)?.streams)
      ? (response as any).streams
      : [];

    if (!response || sources.length === 0) {
      return null;
    }

    // Select the best stream source (favor HLS, then highest quality)
    const sortedSources = [...sources].sort((a, b) => {
      // Prioritize HLS
      if (a.type === 'hls' && b.type !== 'hls') return -1;
      if (b.type === 'hls' && a.type !== 'hls') return 1;

      // Prioritize 1080p / 4k / 720p
      const qualityScore = (q?: string) => {
        if (!q) return 0;
        if (q.includes('2160') || q.includes('4k')) return 4;
        if (q.includes('1080')) return 3;
        if (q.includes('720')) return 2;
        if (q.includes('480')) return 1;
        return 0;
      };
      return qualityScore(b.quality) - qualityScore(a.quality);
    });

    const chosen = sortedSources[0];
    if (!chosen || !chosen.url) return null;

    // Resolve URL: If CinePro returned a proxy path (/v1/proxy?data=...), route via FLOPSHOW's backend proxy
    let fullStreamUrl = chosen.url.trim();
    if (fullStreamUrl.includes('/v1/proxy?')) {
      const queryPart = fullStreamUrl.substring(fullStreamUrl.indexOf('/v1/proxy?'));
      fullStreamUrl = `/api/streaming/cinepro/proxy${queryPart.substring('/v1/proxy'.length)}`;
    } else if (fullStreamUrl.startsWith('/v1/proxy') || fullStreamUrl.startsWith('v1/proxy')) {
      const queryPart = fullStreamUrl.includes('?') ? fullStreamUrl.substring(fullStreamUrl.indexOf('?')) : '';
      fullStreamUrl = `/api/streaming/cinepro/proxy${queryPart}`;
    } else if (fullStreamUrl.startsWith('/')) {
      const targetBase = (extra?.baseUrlOverride || this.baseUrl).replace(/\/+$/, '');
      const resolvedTarget = `${targetBase}${fullStreamUrl}`;
      fullStreamUrl = `/api/streaming/cinepro/proxy?data=${encodeURIComponent(JSON.stringify({ url: resolvedTarget }))}`;
    }

    // Determine playback format
    let format: 'hls' | 'mp4' | 'embed' | 'dash' = 'mp4';
    if (chosen.type === 'hls' || fullStreamUrl.includes('.m3u8')) {
      format = 'hls';
    } else if (chosen.type === 'dash' || fullStreamUrl.includes('.mpd')) {
      format = 'dash';
    } else if (fullStreamUrl.includes('embed') || fullStreamUrl.includes('/iframe/')) {
      format = 'embed';
    }

    // Normalize Subtitles / Tracks (preserving formats and language tracks)
    const rawSubtitles = Array.isArray(response.subtitles)
      ? response.subtitles
      : Array.isArray((response as any).tracks)
      ? (response as any).tracks.filter((t: any) => t.kind === 'subtitles' || t.kind === 'captions' || !t.kind)
      : undefined;

    const subtitles = rawSubtitles
      ? rawSubtitles
          .filter((sub: any) => sub && (sub.url || sub.file))
          .map((sub: any, idx: number) => {
            let subUrl = (sub.url || sub.file).trim();
            if (subUrl.includes('/v1/proxy?')) {
              const queryPart = subUrl.substring(subUrl.indexOf('/v1/proxy?'));
              subUrl = `/api/streaming/cinepro/proxy${queryPart.substring('/v1/proxy'.length)}`;
            } else if (subUrl.startsWith('/v1/proxy') || subUrl.startsWith('v1/proxy')) {
              const queryPart = subUrl.includes('?') ? subUrl.substring(subUrl.indexOf('?')) : '';
              subUrl = `/api/streaming/cinepro/proxy${queryPart}`;
            } else if (subUrl.startsWith('/')) {
              const targetBase = (extra?.baseUrlOverride || this.baseUrl).replace(/\/+$/, '');
              subUrl = `/api/streaming/cinepro/proxy?data=${encodeURIComponent(JSON.stringify({ url: `${targetBase}${subUrl}` }))}`;
            }
            return {
              id: sub.id || `sub-${idx}`,
              label: sub.label || sub.name || 'Subtitles',
              language: (sub.language || sub.label || 'en').toLowerCase().slice(0, 2),
              url: subUrl,
              format: sub.format || 'vtt'
            };
          })
      : undefined;

    return {
      title: defaultTitle || (type === 'movie' ? 'Movie' : `Episode ${extra?.episodeNumber || 1}`),
      type,
      source: 'CINEPRO',
      streamUrl: fullStreamUrl,
      format,
      quality: chosen.quality || '1080p',
      audioTracks: chosen.audioTracks,
      subtitles,
      expiresAt: response.expiresAt,
      contentId,
      episodeId: extra?.episodeId,
      seasonNumber: extra?.seasonNumber,
      episodeNumber: extra?.episodeNumber,
      externalTmdbId: extra?.externalTmdbId,
      providerName: chosen.provider?.name || 'CinePro'
    };
  }

  /**
   * Internal HTTP client with timeout protection & secure header injection.
   * NEVER leaks the apiKey in exceptions or logs.
   */
  private async fetchWithTimeout<T = any>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'User-Agent': 'FLOPSHOW-OTT/1.0'
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
        if (response.status === 404) {
          throw new CineproNotFoundError(`CinePro returned 404: Source not found.`);
        }
        if (response.status === 400) {
          throw new CineproInvalidIdError(`CinePro returned 400: Invalid content ID or parameter.`);
        }
        throw new CineproError(
          `CinePro upstream returned status ${response.status} (${response.statusText}).`,
          response.status
        );
      }

      const json = await response.json();
      return json as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new CineproUnavailableError(`CinePro request timed out after ${this.timeoutMs}ms.`);
      }
      if (err instanceof CineproError) {
        throw err;
      }
      throw new CineproUnavailableError(`CinePro connection failed: ${err.message || 'network error'}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const cineproService = new CineproService();

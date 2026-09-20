import { Router, Response } from 'express';
import { Readable } from 'node:stream';
import { cineproService, CineproError } from '../services/cineproService.js';
import { contentRepository } from '../repositories/contentRepository.js';
import { purchaseRepository } from '../repositories/purchaseRepository.js';
import { watchPassService } from '../services/watchPassService.js';
import { subscriptionService } from '../services/subscriptionService.js';
import { monetizationService } from '../services/monetizationService.js';
import { optionalAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { getAdapter } from '../db/adapter.js';
import { config } from '../config/env.js';

export const streamingRouter = Router();

/**
 * Helper to enforce FLOPSHOW's standard entitlement hierarchy:
 * 1. Admin -> allowed
 * 2. Free content (price === 0) -> allowed
 * 3. User purchased this content -> allowed
 * 4. User has active Watch Pass -> allowed
 * 5. User has active subscription -> allowed
 * Otherwise -> throws 403
 */
async function verifyContentEntitlement(content: any, userId?: string, userRole?: string): Promise<void> {
  const isAdmin = userRole === 'ADMIN';
  const isFree = content.price === 0;
  const isOwned = isAdmin || (userId ? await purchaseRepository.isOwned(userId, content.id) : false);
  const hasActivePass = userId ? await watchPassService.hasActivePass(userId) : false;
  const hasActiveSub = userId ? await subscriptionService.hasActiveSubscription(userId) : false;

  if (!isAdmin && !isFree && !isOwned && !hasActivePass && !hasActiveSub) {
    const monetizationMode = await monetizationService.getMonetizationMode();
    const err = new Error(
      monetizationMode === 'SUBSCRIPTION'
        ? 'Active subscription or Watch Pass required to watch this title.'
        : 'Purchase or Watch Pass required to watch this title.'
    );
    (err as any).statusCode = 403;
    (err as any).code = monetizationMode === 'SUBSCRIPTION' ? 'SUBSCRIPTION_REQUIRED' : 'PURCHASE_REQUIRED';
    throw err;
  }
}

/**
 * GET /api/streaming/status
 * Health telemetry for the CinePro streaming adapter
 */
streamingRouter.get('/status', async (_req, res) => {
  const health = await cineproService.getHealthStatus();
  res.json({
    status: 'online',
    provider: 'CinePro OMSS Streaming Adapter',
    upstream: health
  });
});

/**
 * GET /api/streaming/cinepro/movie/:contentId
 * Resolves normalized streaming playback source for a movie with entitlement enforcement
 */
streamingRouter.get('/cinepro/movie/:contentId', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const rawId = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
    const contentId = rawId ? rawId.trim() : '';

    if (!contentId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Content ID is required' } });
      return;
    }

    const content = await contentRepository.findByIdOrSlug(contentId);
    if (!content) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Movie content not found' } });
      return;
    }

    // Enforce FLOPSHOW server-side purchase / subscription / pass entitlement
    await verifyContentEntitlement(content, req.user?.id, req.user?.role);

    try {
      const streamSource = await cineproService.getMovieStream(content.id, content.title);
      res.json({
        success: true,
        source: streamSource
      });
    } catch (err: any) {
      const status = err.statusCode || (err instanceof CineproError ? err.statusCode : 503);
      res.status(status).json({
        error: {
          code: err.code || 'STREAM_UNAVAILABLE',
          message: err.message || 'Streaming source is currently unavailable from provider.'
        }
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/streaming/cinepro/series/:contentId/episode/:episodeId
 * Resolves normalized streaming playback source for a series episode with entitlement enforcement
 */
streamingRouter.get('/cinepro/series/:contentId/episode/:episodeId', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const rawContentId = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
    const rawEpisodeId = Array.isArray(req.params.episodeId) ? req.params.episodeId[0] : req.params.episodeId;
    const contentId = rawContentId ? rawContentId.trim() : '';
    const episodeId = rawEpisodeId ? rawEpisodeId.trim() : '';

    if (!contentId || !episodeId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Both Content ID and Episode ID are required' } });
      return;
    }

    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT e.id, e.title, e.episode_number, s.season_number, s.content_id, c.title as series_title, c.price
       FROM episodes e
       JOIN seasons s ON e.season_id = s.id
       JOIN content c ON s.content_id = c.id
       WHERE e.id = ?`,
      [episodeId]
    );

    const episode = rows && rows.length > 0 ? rows[0] : null;
    if (!episode) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Episode not found' } });
      return;
    }

    // Enforce FLOPSHOW server-side purchase / subscription / pass entitlement
    await verifyContentEntitlement({ id: episode.content_id, price: episode.price }, req.user?.id, req.user?.role);

    try {
      const streamSource = await cineproService.getEpisodeStream(episode.content_id, episode.id, {
        title: episode.title,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number
      });

      res.json({
        success: true,
        source: streamSource
      });
    } catch (err: any) {
      const status = err.statusCode || (err instanceof CineproError ? err.statusCode : 503);
      res.status(status).json({
        error: {
          code: err.code || 'STREAM_UNAVAILABLE',
          message: err.message || 'Episode streaming source is currently unavailable from provider.'
        }
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * OPTIONS /api/streaming/cinepro/proxy
 * CORS preflight for media proxy
 */
streamingRouter.options('/cinepro/proxy', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

/**
 * GET /api/streaming/cinepro/proxy
 * OMSS v1.0 compliant proxy for upstream provider requests.
 * Handles:
 * 1. Resolving encoded data parameter: { url, headers }
 * 2. Forwarding requests to upstream streaming providers with required headers (Referer, User-Agent, Origin)
 * 3. Permissive CORS headers for browser player & HLS.js
 * 4. Byte-range requests (Range header -> 206 Partial Content, Accept-Ranges, Content-Range)
 * 5. Rewriting child playlists and segments in HLS manifests (.m3u8) so subsequent browser requests pass through the proxy
 * 6. Streaming binary responses directly with pipeline backpressure
 */
streamingRouter.get('/cinepro/proxy', async (req, res, next) => {
  try {
    const rawData = req.query.data as string;
    if (!rawData) {
      res.status(400).json({
        error: {
          code: 'MISSING_PARAMETER',
          message: 'The data query parameter is required for CinePro proxy requests.'
        }
      });
      return;
    }

    let parsed: { url: string; headers?: Record<string, string> } | null = null;
    try {
      parsed = JSON.parse(decodeURIComponent(rawData));
    } catch {
      try {
        parsed = JSON.parse(rawData);
      } catch {
        res.status(400).json({
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Invalid CinePro proxy data parameter format.'
          }
        });
        return;
      }
    }

    if (!parsed || !parsed.url || typeof parsed.url !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_PARAMETER',
          message: 'Target URL is required in CinePro proxy data.'
        }
      });
      return;
    }

    // Set permissive CORS headers for HTML5 video and HLS.js
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');

    // Build headers to send upstream
    const outgoingHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: '*/*',
      ...(parsed.headers || {})
    };

    if (req.headers.range) {
      outgoingHeaders['Range'] = String(req.headers.range);
    }

    let upstreamRes: globalThis.Response | null = null;
    const cineproBase = (config.cineproBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');

    // Attempt 1: Fetch via CinePro Core if configured and reachable
    const isCoreAttemptable = Boolean(config.cineproBaseUrl && !config.cineproBaseUrl.includes('localhost:3000'));
    if (isCoreAttemptable) {
      try {
        const coreHeaders: Record<string, string> = { ...outgoingHeaders };
        if (config.cineproApiKey) {
          coreHeaders['Authorization'] = `Bearer ${config.cineproApiKey}`;
          coreHeaders['X-API-Key'] = config.cineproApiKey;
        }
        const coreProxyUrl = `${cineproBase}/v1/proxy?data=${encodeURIComponent(rawData)}`;
        const coreController = new AbortController();
        const coreTimeout = setTimeout(() => coreController.abort(), 4000);
        const coreRes = await fetch(coreProxyUrl, {
          headers: coreHeaders,
          signal: coreController.signal
        });
        clearTimeout(coreTimeout);
        if (coreRes.ok || coreRes.status === 206) {
          upstreamRes = coreRes;
        }
      } catch {
        // Fall back to direct upstream fetch
      }
    }

    // Attempt 2: Direct upstream fetch using parsed.url and parsed.headers
    if (!upstreamRes) {
      try {
        const fetchController = new AbortController();
        const fetchTimeout = setTimeout(() => fetchController.abort(), 15000);
        upstreamRes = await fetch(parsed.url, {
          method: 'GET',
          headers: outgoingHeaders,
          signal: fetchController.signal
        });
        clearTimeout(fetchTimeout);
      } catch (err: any) {
        res.status(502).json({
          error: {
            code: 'PROXY_UPSTREAM_ERROR',
            message: `Failed to fetch upstream media source: ${err.message || 'connection error'}`
          }
        });
        return;
      }
    }

    const status = upstreamRes.status;
    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const contentRange = upstreamRes.headers.get('content-range');
    const contentLength = upstreamRes.headers.get('content-length');
    const acceptRanges = upstreamRes.headers.get('accept-ranges') || 'bytes';

    res.status(status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    // Pass through cache-control
    const cacheControl = upstreamRes.headers.get('cache-control');
    if (cacheControl) {
      res.setHeader('Cache-Control', cacheControl);
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }

    // If this is an HLS playlist (.m3u8 or application/vnd.apple.mpegurl)
    const isM3u8 = contentType.includes('mpegurl') || parsed.url.includes('.m3u8');
    if (isM3u8) {
      const playlistText = await upstreamRes.text();
      // Rewrite URLs in playlist so relative segments or /v1/proxy calls route via FLOPSHOW proxy
      const parsedBaseUrl = new URL(parsed.url);
      const lines = playlistText.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          return line;
        }
        // If line is an existing /v1/proxy path
        if (trimmedLine.startsWith('/v1/proxy')) {
          return `/api/streaming/cinepro/proxy${trimmedLine.substring('/v1/proxy'.length)}`;
        }
        // Resolve URL against base
        let resolvedSegmentUrl: string;
        try {
          resolvedSegmentUrl = new URL(trimmedLine, parsedBaseUrl.href).href;
        } catch {
          resolvedSegmentUrl = trimmedLine;
        }
        const segmentData = encodeURIComponent(JSON.stringify({
          url: resolvedSegmentUrl,
          headers: parsed?.headers || {}
        }));
        return `/api/streaming/cinepro/proxy?data=${segmentData}`;
      });

      const modifiedManifest = rewrittenLines.join('\n');
      res.setHeader('Content-Length', Buffer.byteLength(modifiedManifest, 'utf8'));
      res.send(modifiedManifest);
      return;
    }

    // For progressive MP4, TS segments, or other binary streams
    if (contentLength && !contentRange) {
      res.setHeader('Content-Length', contentLength);
    }

    if (upstreamRes.body) {
      Readable.fromWeb(upstreamRes.body as any).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    next(err);
  }
});

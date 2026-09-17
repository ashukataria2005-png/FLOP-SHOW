import { Router, Request, Response } from 'express';
import { config } from '../config/env.js';
import { mediaRepository } from '../repositories/mediaRepository.js';
import { contentRepository } from '../repositories/contentRepository.js';

export const webhookRouter = Router();

/**
 * POST /api/webhooks/vcdn
 *
 * Official webhook receiver for VCDN asynchronous video transcoding events:
 * - video.uploaded: Video received
 * - video.processing: HLS transcoding started
 * - video.ready: HLS master playlist & embed URLs ready
 * - video.failed: Transcoding failure
 */
webhookRouter.post('/vcdn', async (req: Request, res: Response) => {
  try {
    // 1. Security Check: verify webhook secret if configured in environment
    if (config.vcdnWebhookSecret) {
      const headerSecret = req.headers['x-webhook-secret'] || req.headers['x-vcdn-secret'];
      const querySecret = req.query.secret;
      if (headerSecret !== config.vcdnWebhookSecret && querySecret !== config.vcdnWebhookSecret) {
        console.warn('[VCDN Webhook] Unauthorized attempt with invalid or missing secret.');
        return res.status(401).json({ error: 'Unauthorized webhook request.' });
      }
    }

    const payload = req.body;
    if (!payload || !payload.event || !payload.data) {
      console.warn('[VCDN Webhook] Received malformed webhook payload:', payload);
      return res.status(400).json({ error: 'Invalid webhook payload structure.' });
    }

    const event = String(payload.event);
    const data = payload.data;
    const videoId = data.id || data.video_id;

    if (!videoId) {
      console.warn('[VCDN Webhook] Missing video ID in event data:', data);
      return res.status(400).json({ error: 'Missing video ID.' });
    }

    console.log(`[VCDN Webhook] Received event "${event}" for video: ${videoId}`);

    let status = 'PROCESSING';
    if (event === 'video.ready' || data.status === 'ready') {
      status = 'READY';
    } else if (event === 'video.failed' || data.status === 'failed') {
      status = 'FAILED';
    } else if (event === 'video.uploaded' || data.status === 'uploaded') {
      status = 'PROCESSING';
    } else if (event === 'video.processing' || data.status === 'processing') {
      status = 'PROCESSING';
    }

    const hlsUrl = data.playback?.hls || data.playback_url || (status === 'READY' ? `https://stream.vcdn.me/${videoId}/master.m3u8` : undefined);
    const embedUrl = data.playback?.embed || data.embed_url || (status === 'READY' ? `https://embed.vcdn.me/${videoId}` : undefined);
    const thumbnailUrl = Array.isArray(data.thumbnails) && data.thumbnails.length > 0 ? data.thumbnails[0] : undefined;

    // Update matching media records
    await mediaRepository.updateVcdnStatus(
      videoId,
      status,
      hlsUrl,
      embedUrl,
      thumbnailUrl
    );

    // Update matching content and episodes records
    await contentRepository.updateContentVcdnStatus(
      videoId,
      status,
      hlsUrl,
      embedUrl,
      thumbnailUrl
    );

    console.log(`[VCDN Webhook] Successfully updated video ${videoId} status to "${status}"`);

    return res.status(200).json({
      success: true,
      received: true,
      videoId,
      status
    });
  } catch (err: any) {
    console.error('[VCDN Webhook] Error processing webhook:', err);
    return res.status(500).json({
      error: 'Internal server error processing webhook.'
    });
  }
});

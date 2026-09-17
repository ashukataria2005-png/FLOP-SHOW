/**
 * VCDN Media Storage & Video Streaming Service
 *
 * Dedicated, isolated service interface for VCDN (https://www.vcdn.me/docs).
 * Handles video initialization, chunked upload, completion, processing status tracking,
 * playback metadata retrieval, and deletion.
 *
 * Architecture Note:
 * This service is kept strictly isolated behind standard provider interfaces so that
 * the streaming provider can later be swapped with Gozunga or any alternative provider
 * without modifying the core media and catalog management system.
 */

import fs from 'fs';
import { config, isVcdnConfigured } from '../config/env.js';

export interface VcdnInitResponse {
  uploadId: string;
  status: string;
}

export interface VcdnCompleteResponse {
  id: string;
  status: 'processing' | 'ready' | 'failed' | string;
  playbackUrl: string;
  embedUrl: string;
}

export interface VcdnVideoStatus {
  id: string;
  status: 'uploaded' | 'processing' | 'ready' | 'failed' | string;
  duration?: number;
  thumbnails?: string[];
  playback?: {
    hls?: string;
    embed?: string;
  };
  playbackUrl?: string;
  embedUrl?: string;
}

export interface VcdnUploadResult {
  vcdnVideoId: string;
  vcdnStatus: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
  playbackUrl: string;
  embedUrl: string;
  provider: 'VCDN';
}

const VCDN_BASE_URL = 'https://cdn.vcdn.me';
// Default upload chunk size: 5MB for stable streaming
const CHUNK_SIZE = 5 * 1024 * 1024;

export class VcdnService {
  private getHeaders(isBinary = false): Record<string, string> {
    if (!isVcdnConfigured()) {
      throw new Error('VCDN API key is not configured. Please set VCDN_API_KEY in your environment (.env).');
    }
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${config.vcdnApiKey}`,
      'X-API-Key': config.vcdnApiKey,
    };
    if (!isBinary) {
      headers['Content-Type'] = 'application/json';
    } else {
      headers['Content-Type'] = 'application/octet-stream';
    }
    return headers;
  }

  /**
   * Step 1: Initialize an upload session on VCDN
   * POST https://cdn.vcdn.me/api/v1/upload/init
   */
  async initUpload(params: { filename: string; title: string; size: number }): Promise<VcdnInitResponse> {
    const url = `${VCDN_BASE_URL}/api/v1/upload/init`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        filename: params.filename,
        title: params.title || params.filename,
        size: params.size
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`VCDN upload initialization failed (${res.status}): ${errorText}`);
    }

    const data = await res.json() as any;
    const uploadId = data.upload_id || data.uploadId || data.id;
    if (!uploadId) {
      throw new Error('VCDN did not return a valid upload_id.');
    }

    return {
      uploadId,
      status: data.status || 'initialized'
    };
  }

  /**
   * Step 2: Upload a binary chunk for an active upload session
   * POST https://cdn.vcdn.me/api/v1/upload/{upload_id}/chunk
   */
  async uploadChunk(uploadId: string, chunk: Buffer | Uint8Array): Promise<void> {
    const url = `${VCDN_BASE_URL}/api/v1/upload/${encodeURIComponent(uploadId)}/chunk`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: chunk
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`VCDN chunk upload failed (${res.status}): ${errorText}`);
    }
  }

  /**
   * Step 3: Complete upload and trigger VCDN transcoding pipeline
   * POST https://cdn.vcdn.me/api/v1/upload/complete
   */
  async completeUpload(uploadId: string): Promise<VcdnCompleteResponse> {
    const url = `${VCDN_BASE_URL}/api/v1/upload/complete`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        uploadId: uploadId,
        upload_id: uploadId
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`VCDN upload completion failed (${res.status}): ${errorText}`);
    }

    const data = await res.json() as any;
    const videoId = data.id || data.video_id || data.videoId;
    const playbackUrl = data.playback_url || data.playback?.hls || `https://stream.vcdn.me/${videoId}/master.m3u8`;
    const embedUrl = data.embed_url || data.playback?.embed || `https://embed.vcdn.me/${videoId}`;

    return {
      id: videoId,
      status: data.status || 'processing',
      playbackUrl,
      embedUrl
    };
  }

  /**
   * Retrieve live video processing and playback details
   * GET https://cdn.vcdn.me/api/v1/videos/{id}
   */
  async getVideoStatus(videoId: string): Promise<VcdnVideoStatus> {
    const url = `${VCDN_BASE_URL}/api/v1/videos/${encodeURIComponent(videoId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`VCDN get video status failed (${res.status}): ${errorText}`);
    }

    const data = await res.json() as any;
    const normalizedStatus = (data.status || 'processing').toLowerCase();
    const playbackUrl = data.playback?.hls || data.playback_url || `https://stream.vcdn.me/${videoId}/master.m3u8`;
    const embedUrl = data.playback?.embed || data.embed_url || `https://embed.vcdn.me/${videoId}`;

    return {
      id: data.id || videoId,
      status: normalizedStatus,
      duration: data.duration,
      thumbnails: data.thumbnails || [],
      playback: {
        hls: playbackUrl,
        embed: embedUrl
      },
      playbackUrl,
      embedUrl
    };
  }

  /**
   * Delete a video asset from VCDN servers
   * DELETE https://cdn.vcdn.me/api/v1/videos/{id}
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    if (!isVcdnConfigured()) {
      console.warn('[VCDN] Skipping remote delete: VCDN_API_KEY is not configured.');
      return false;
    }
    const url = `${VCDN_BASE_URL}/api/v1/videos/${encodeURIComponent(videoId)}`;
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (res.status === 404) {
        console.warn(`[VCDN] Video ${videoId} already deleted or not found on VCDN.`);
        return true;
      }
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[VCDN] Failed to delete video ${videoId} (${res.status}): ${errorText}`);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error(`[VCDN] Error during remote delete of video ${videoId}:`, err.message);
      return false;
    }
  }

  /**
   * High-Level Pipeline: Upload a local video file in chunks to VCDN
   * Returns immediately with VCDN video ID and HLS playback URL upon completion
   */
  async uploadVideo(
    filePath: string,
    originalName: string,
    title?: string,
    onProgress?: (percent: number) => void
  ): Promise<VcdnUploadResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file not found at path: ${filePath}`);
    }

    const fileStat = fs.statSync(filePath);
    const fileSize = fileStat.size;
    const cleanTitle = title || originalName.replace(/\.[^/.]+$/, '');

    // 1. Initialize upload session
    const init = await this.initUpload({
      filename: originalName,
      title: cleanTitle,
      size: fileSize
    });

    const uploadId = init.uploadId;

    // 2. Stream and upload in chunks
    const fd = fs.openSync(filePath, 'r');
    let bytesReadTotal = 0;
    const buffer = Buffer.alloc(CHUNK_SIZE);

    try {
      while (bytesReadTotal < fileSize) {
        const bytesToRead = Math.min(CHUNK_SIZE, fileSize - bytesReadTotal);
        const bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, bytesReadTotal);
        if (bytesRead === 0) break;

        const chunk = buffer.subarray(0, bytesRead);
        await this.uploadChunk(uploadId, chunk);
        bytesReadTotal += bytesRead;

        if (onProgress && fileSize > 0) {
          const percent = Math.min(100, Math.round((bytesReadTotal / fileSize) * 100));
          onProgress(percent);
        }
      }
    } finally {
      fs.closeSync(fd);
    }

    // 3. Complete upload
    const complete = await this.completeUpload(uploadId);

    return {
      vcdnVideoId: complete.id,
      vcdnStatus: complete.status === 'ready' ? 'READY' : 'PROCESSING',
      playbackUrl: complete.playbackUrl,
      embedUrl: complete.embedUrl,
      provider: 'VCDN'
    };
  }
}

export const vcdnService = new VcdnService();

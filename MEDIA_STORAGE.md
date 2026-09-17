# FLOPSHOW — Media Storage & Video Streaming Architecture

This document describes FLOPSHOW's video streaming and media storage architecture, detailing the VCDN integration, environment configurations, asynchronous transcoding lifecycle, database schema, and migration guidelines for future providers (e.g., Gozunga).

---

## 1. Overview

FLOPSHOW utilizes **VCDN** (`https://vcdn.me`) as its primary media storage and adaptive bitrate video streaming provider.

- **Storage & Transcoding**: Videos uploaded via the Admin Panel are staged locally, uploaded to VCDN via its chunked REST API, and automatically transcoded into multi-bitrate HTTP Live Streaming (HLS) streams.
- **Adaptive Playback**: Client browsers stream adaptive HLS playlists (`.m3u8`) powered by `hls.js` on modern browsers and native HLS engines on Apple Safari/iOS.
- **Asynchronous Webhook Sync**: VCDN transcoding events (`video.uploaded`, `video.processing`, `video.ready`, `video.failed`) notify FLOPSHOW asynchronously to update catalog status without blocking administration.
- **Provider Fallback & Isolation**: All VCDN interactions are fully isolated inside `backend/src/services/vcdnService.ts`. If VCDN credentials are not configured, the system gracefully falls back to Cloudinary or local media serving.

---

## 2. Environment Variables

Configure the following variables in your server environment (or `.env` file):

```bash
# VCDN Primary Media Storage & Streaming
VCDN_API_KEY=your_vcdn_api_key_here
VCDN_WEBHOOK_SECRET=your_optional_webhook_secret_here

# Database (PostgreSQL / SQLite)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
DATABASE_TYPE=postgres

# Cloudinary Secondary Fallback (Optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

> [!CAUTION]
> Never hardcode API keys or secrets directly into the source code repository. Always read from environment variables via `backend/src/config/env.ts`.

---

## 3. Database Schema (Migration 007)

Migration `007_vcdn_media_streaming.sql` added the following columns across `media`, `content`, and `episodes` tables:

| Column | Type | Description |
|---|---|---|
| `vcdn_video_id` | `VARCHAR(128)` | Unique asset identifier assigned by VCDN |
| `vcdn_status` | `VARCHAR(32)` | Transcoding lifecycle state: `PROCESSING`, `READY`, `FAILED` |
| `vcdn_playback_url` | `TEXT` | HLS Master playlist URL (`https://stream.vcdn.me/{id}/master.m3u8`) |
| `vcdn_embed_url` | `TEXT` | VCDN hosted player embed URL (`https://embed.vcdn.me/{id}`) |
| `vcdn_thumbnail_url` | `TEXT` | Primary auto-generated thumbnail URL |
| `media_provider` | `VARCHAR(32)` | Storage provider identifier (`VCDN`, `CLOUDINARY`, `LOCAL`) |

---

## 4. Upload & Webhook Lifecycle Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant Front as Admin Panel (Frontend)
    participant Server as FLOPSHOW Backend
    participant VCDN as VCDN API / CDN
    participant Player as FLOPSHOW MediaPlayer (hls.js)

    Admin->>Front: Select video file & click Upload
    Front->>Server: POST /api/admin/upload (Multipart FormData)
    Server->>VCDN: POST /api/v1/upload/init & /chunk (Chunked upload)
    VCDN-->>Server: Upload complete (video_id generated)
    Server-->>Front: Return video_id, status: PROCESSING, HLS placeholder URL
    Server->>Server: Clean up temporary local staging file

    Note over VCDN: VCDN encodes multi-bitrate HLS (1080p, 720p, 480p, 360p)

    alt Webhook Notification
        VCDN->>Server: POST /api/webhooks/vcdn (video.ready)
        Server->>Server: Validate secret & update DB (status: READY, master.m3u8)
    else Frontend Polling Fallback
        Front->>Server: GET /api/admin/media/vcdn/status/:id
        Server->>VCDN: GET /api/v1/videos/:id
        Server-->>Front: status: READY, master.m3u8
    end

    Admin->>Front: Save Title / Content
    Front->>Server: POST /api/admin/media (Attach VCDN metadata)

    Note over Player: Consumer Video Playback
    Player->>Server: GET /api/media/content/:id?type=MAIN
    Server-->>Player: Return HLS URL (https://stream.vcdn.me/{id}/master.m3u8)
    Player->>Player: Attach hls.js & stream adaptive bitrate video
```

---

## 5. Webhook Configuration

1. In your **VCDN Dashboard** (`https://vcdn.me/dashboard`), navigate to **Webhooks**.
2. Set the Webhook URL to:
   ```
   https://<your-domain>/api/webhooks/vcdn
   ```
3. Set your Webhook Secret to match `VCDN_WEBHOOK_SECRET` in your `.env`.
4. Enable events:
   - `video.uploaded`
   - `video.processing`
   - `video.ready`
   - `video.failed`

---

## 6. Safe Deletion & Reference Checking

When content or media records are removed:
- FLOPSHOW executes `isVcdnVideoReferencedElsewhere(vcdnVideoId, mediaId)` prior to invoking VCDN asset deletion.
- If the VCDN video asset is shared across other content or trailers, the remote asset is **preserved** to prevent broken links elsewhere.
- If no other references exist, `vcdnService.deleteVideo(vcdnVideoId)` securely purges the asset from VCDN storage.

---

## 7. How to Switch or Extend to Gozunga (Future Proofing)

The architecture is deliberately designed with provider decoupling:

1. **Provider Abstraction**: All media rows store `media_provider` (`VCDN`, `GOZUNGA`, `CLOUDINARY`, `LOCAL`).
2. **Dedicated Service Pattern**: To switch or add Gozunga:
   - Create `backend/src/services/gozungaService.ts` implementing the upload, status, and delete methods mirroring `vcdnService.ts`.
   - Update `backend/src/routes/adminRoutes.ts` to route video uploads to `gozungaService` if `isGozungaConfigured()`.
   - Keep `media_provider = 'GOZUNGA'`.
   - The frontend player (`MediaPlayer.tsx`) already supports standard HLS (`.m3u8`) and MP4 without requiring any client-side code changes.

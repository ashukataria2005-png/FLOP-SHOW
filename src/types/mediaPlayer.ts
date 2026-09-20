/**
 * Media Player System - Data Contract & Type Definitions
 * Designed for production OTT web applications with dynamic stream switching.
 */

export type StreamType = 'hls' | 'direct' | 'embed';

/**
 * Core Media Item representation
 * Maps directly to backend API and database schemas
 */
export interface MediaItem {
  id: string;
  title: string;
  description: string;
  poster_url: string;
  backdrop_url?: string;
  stream_type: StreamType;
  source_url: string;
  duration_seconds?: number;
  badge?: string;
  category?: string;
  subtitles?: MediaSubtitle[];
  headers?: Record<string, string>;
  drm?: {
    type: 'widevine' | 'fairplay' | 'playready';
    licenseUrl: string;
  };
}

export interface MediaSubtitle {
  id: string;
  label: string;
  srclang: string;
  src: string;
  default?: boolean;
}

export interface QualityLevel {
  id: number; // -1 for auto
  label: string; // e.g., 'Auto', '1080p', '720p', '480p', '360p'
  bitrate?: number;
  width?: number;
  height?: number;
}

export interface PlayerPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedTime: number;
  volume: number; // 0 to 1
  isMuted: boolean;
  isFullscreen: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  playbackRate: number;
  selectedQuality: number; // -1 = auto
  availableQualities: QualityLevel[];
  errorMessage: string | null;
}

export interface PlayerSettingsState {
  volume: number;
  isMuted: boolean;
  resumeTimes: Record<string, number>;
}

/**
 * SQL Database Schema Contract
 * For PostgreSQL & SQLite production deployment
 */
export const MEDIA_TABLE_SQL_SCHEMA = `
-- PostgreSQL / SQLite Compatible Schema
CREATE TABLE IF NOT EXISTS media_items (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    poster_url TEXT NOT NULL,
    backdrop_url TEXT,
    stream_type VARCHAR(16) NOT NULL CHECK (stream_type IN ('hls', 'direct', 'embed')),
    source_url TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    badge VARCHAR(64),
    category VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_stream_type ON media_items(stream_type);
`;

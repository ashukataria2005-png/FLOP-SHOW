/**
 * Modular OTT Media Player System - Public Exports
 */

// Core Components
export { MediaPlayerContainer } from './core/MediaPlayerContainer';
export { CustomPlayer } from './core/CustomPlayer';
export { EmbedPlayer } from './core/EmbedPlayer';
export { PlayerControls } from './core/PlayerControls';
export { PlayerOverlay } from './core/PlayerOverlay';
export { QualitySelector } from './core/QualitySelector';

// Showcase / Demo View
export { PlayerShowcase } from './PlayerShowcase';

// Custom Hooks
export { useMediaPlayerState } from './hooks/useMediaPlayerState';
export { useHlsPlayer } from './hooks/useHlsPlayer';
export { useMediaSource } from './hooks/useMediaSource';

// Data & Service
export { mediaPlayerService } from '../../services/mediaPlayerService';
export { MOCK_MEDIA_CATALOG } from '../../data/mockMediaCatalog';

// Type Contracts
export type {
  StreamType,
  MediaItem,
  MediaSubtitle,
  QualityLevel,
  PlayerPlaybackState,
  PlayerSettingsState
} from '../../types/mediaPlayer';
export { MEDIA_TABLE_SQL_SCHEMA } from '../../types/mediaPlayer';

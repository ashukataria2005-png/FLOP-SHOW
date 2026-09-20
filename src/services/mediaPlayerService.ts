import { MediaItem } from '../types/mediaPlayer';
import { MOCK_MEDIA_CATALOG } from '../data/mockMediaCatalog';

const STORAGE_KEYS = {
  VOLUME: 'ott_player_volume',
  MUTED: 'ott_player_muted',
  RESUME_PREFIX: 'ott_player_resume_'
};

/**
 * Service providing media data resolution and client-side playback persistence.
 */
export const mediaPlayerService = {
  /**
   * Resolve a MediaItem by its identifier.
   * Checks the mock catalog, and can easily be connected to an API/database endpoint.
   */
  async getMediaById(id: string): Promise<MediaItem | null> {
    // In production, this can call `await fetch(/api/media/${id})`
    const found = MOCK_MEDIA_CATALOG.find(item => item.id === id);
    if (found) return found;

    // Fallback: check if id matches a standard index or return default
    return MOCK_MEDIA_CATALOG[0] || null;
  },

  /**
   * Return the entire media catalog for selector/browsing
   */
  getAllMedia(): MediaItem[] {
    return MOCK_MEDIA_CATALOG;
  },

  /**
   * Extract target media ID from the current browser URL query parameters
   * Supports ?id=... or ?mediaId=...
   */
  getMediaIdFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('mediaId') || null;
  },

  /**
   * Update browser URL with new media id without full page reload
   */
  updateUrlParam(id: string): void {
    if (typeof window === 'undefined' || !window.history) return;
    const url = new URL(window.location.href);
    url.searchParams.set('id', id);
    window.history.replaceState({}, '', url.toString());
  },

  // ---------------------------------------------------------------------------
  // LocalStorage Playback State Persistence
  // ---------------------------------------------------------------------------

  getSavedVolume(): number {
    if (typeof window === 'undefined') return 1;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VOLUME);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage access issues
    }
    return 1;
  },

  saveVolume(volume: number): void {
    if (typeof window === 'undefined') return;
    try {
      const clamped = Math.max(0, Math.min(1, volume));
      localStorage.setItem(STORAGE_KEYS.VOLUME, clamped.toString());
    } catch {
      // Storage quota or privacy mode error handling
    }
  },

  getSavedMuted(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEYS.MUTED) === 'true';
    } catch {
      return false;
    }
  },

  saveMuted(muted: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.MUTED, muted ? 'true' : 'false');
    } catch {
      // Ignore
    }
  },

  getResumeTimestamp(mediaId: string): number {
    if (typeof window === 'undefined' || !mediaId) return 0;
    try {
      const saved = localStorage.getItem(`${STORAGE_KEYS.RESUME_PREFIX}${mediaId}`);
      if (saved) {
        const seconds = parseFloat(saved);
        if (!isNaN(seconds) && seconds > 3) {
          return seconds;
        }
      }
    } catch {
      // Ignore
    }
    return 0;
  },

  saveResumeTimestamp(mediaId: string, timestampSeconds: number, durationSeconds?: number): void {
    if (typeof window === 'undefined' || !mediaId) return;
    try {
      // If completed (more than 92% watched), clear resume point
      if (durationSeconds && durationSeconds > 0 && (timestampSeconds / durationSeconds) >= 0.92) {
        localStorage.removeItem(`${STORAGE_KEYS.RESUME_PREFIX}${mediaId}`);
        return;
      }

      // Only persist if watched past initial cold start
      if (timestampSeconds > 3) {
        localStorage.setItem(`${STORAGE_KEYS.RESUME_PREFIX}${mediaId}`, Math.round(timestampSeconds).toString());
      }
    } catch {
      // Ignore
    }
  },

  clearResumeTimestamp(mediaId: string): void {
    if (typeof window === 'undefined' || !mediaId) return;
    try {
      localStorage.removeItem(`${STORAGE_KEYS.RESUME_PREFIX}${mediaId}`);
    } catch {
      // Ignore
    }
  }
};

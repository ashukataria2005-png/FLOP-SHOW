/**
 * Utility functions for parsing, validating, and converting media URLs (YouTube, direct video, etc.)
 */

export interface ParsedYouTube {
  isYouTube: boolean;
  videoId?: string;
  embedUrl?: string;
}

/**
 * Parses a YouTube URL and extracts video ID + generates standard embed URL
 */
export function parseYouTubeUrl(rawUrl: string): ParsedYouTube {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isYouTube: false };
  }

  const trimmed = rawUrl.trim();

  const patterns = [
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      return {
        isYouTube: true,
        videoId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
      };
    }
  }

  return { isYouTube: false };
}

/**
 * Validates whether an input URL is safe and valid (http or https)
 */
export function isValidMediaUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detects the source type from URL
 */
export function detectSourceType(urlString: string): 'YOUTUBE' | 'DIRECT_URL' {
  const yt = parseYouTubeUrl(urlString);
  if (yt.isYouTube) {
    return 'YOUTUBE';
  }
  return 'DIRECT_URL';
}

/**
 * Resolves a media URL to an absolute URL if it is a relative upload path (/uploads/...).
 * Handles three cases:
 *  1. Already an absolute http/https URL — returned as-is.
 *  2. Relative /uploads/... path with an absolute apiBaseUrl — prefixed with origin of apiBaseUrl.
 *  3. Relative /uploads/... path with a relative apiBaseUrl (e.g. '/api', local dev) —
 *     prefixed with window.location.origin so Vite proxy or same-server routing handles it.
 */
export function resolveMediaUrl(rawUrl?: string | null, apiBaseUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();

  // Already an absolute URL — return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Relative upload or backend proxy path: resolve to absolute
  if (
    trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/') ||
    trimmed.startsWith('/api/') || trimmed.startsWith('api/') ||
    trimmed.startsWith('/streaming/') || trimmed.startsWith('streaming/') ||
    trimmed.startsWith('/v1/') || trimmed.startsWith('v1/')
  ) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

    // If apiBaseUrl is absolute (production Render backend URL), use its origin
    if (apiBaseUrl && (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://'))) {
      try {
        const origin = new URL(apiBaseUrl).origin;
        return `${origin}${cleanPath}`;
      } catch {
        // fall through
      }
    }

    // In production or when hosted on Netlify, use Render backend origin by default
    const isRemote = typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    if (isRemote) {
      return `https://flop-show.onrender.com${cleanPath}`;
    }

    // For relative apiBaseUrl (local dev with Vite proxy), use current page origin
    // so browser requests /uploads/... or /api/... through the Vite proxy → backend
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${cleanPath}`;
    }

    return cleanPath;
  }

  return trimmed;
}


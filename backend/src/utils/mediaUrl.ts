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

  // Regular expressions covering:
  // - youtube.com/watch?v=VIDEO_ID
  // - youtu.be/VIDEO_ID
  // - youtube.com/embed/VIDEO_ID
  // - youtube.com/shorts/VIDEO_ID
  const patterns = [
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/ // Or raw 11-char ID directly
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

export function resolveMediaUrl(rawUrl?: string | null, apiBaseUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (apiBaseUrl && apiBaseUrl.startsWith('http')) {
      try {
        const origin = new URL(apiBaseUrl).origin;
        return `${origin}${cleanPath}`;
      } catch {
        return cleanPath;
      }
    }
    return cleanPath;
  }
  return trimmed;
}

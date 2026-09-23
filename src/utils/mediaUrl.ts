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
 * Extracts src URL from an iframe string if present
 */
export function extractIframeSrc(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.includes('<iframe')) {
    // Match src="..." or src='...'
    const match = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    // Match unquoted src=...
    const matchUnquoted = trimmed.match(/<iframe[^>]*\ssrc=([^ >]+)/i);
    if (matchUnquoted && matchUnquoted[1]) {
      return matchUnquoted[1].trim();
    }
  }
  return null;
}

export interface ParsedEmbedUrl {
  isEmbed: boolean;
  embedUrl: string;
}

/**
 * Checks if a URL or string is an embed URL (Streamtape, iframe string, or external embed provider)
 */
export function parseEmbedUrl(rawUrl: string): ParsedEmbedUrl {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isEmbed: false, embedUrl: '' };
  }

  const trimmed = rawUrl.trim();

  // 1. If it's a full iframe string, extract src cleanly
  const iframeSrc = extractIframeSrc(trimmed);
  if (iframeSrc) {
    return { isEmbed: true, embedUrl: iframeSrc };
  }

  // 2. Streamtape detection (streamtape links serve web player/HTML, even if ending in filename.mp4)
  // Supports streamtape.com, streamta.pe, streamtape.net, streamtape.to
  if (
    trimmed.includes('streamtape.com') ||
    trimmed.includes('streamta.pe') ||
    trimmed.includes('streamtape.net') ||
    trimmed.includes('streamtape.to')
  ) {
    // Convert streamtape /v/ link to /e/ embed player link if needed
    let cleanUrl = trimmed;
    if (cleanUrl.includes('/v/')) {
      cleanUrl = cleanUrl.replace('/v/', '/e/');
    }
    return { isEmbed: true, embedUrl: cleanUrl };
  }

  // Check if it's a direct media file (e.g. .mp4, .m3u8, .webm)
  // Direct media files should NOT be treated as embeds even if path contains '/e/'
  const isDirectMedia = /\.(mp4|m3u8|webm|mpd|mov|ogg)(\?.*)?$/i.test(trimmed);
  if (isDirectMedia) {
    return { isEmbed: false, embedUrl: trimmed };
  }

  // 3. Check for '/e/' path or starts with iframe or known embed domains
  const lower = trimmed.toLowerCase();

  const embedDomains = [
    'streamtape',
    'doodstream', 'dood.to', 'dood.so', 'dood.watch', 'dood.ws', 'dood.cx', 'ds2play',
    'mixdrop',
    'vidsrc',
    'superembed', '2embed',
    'filelions', 'streamwish',
    'embedrise', 'autoembed', 'multiembed',
    'upstream.to', 'videobin', 'vidcloud',
    'streamlare', 'voe.sx', 'mp4upload'
  ];

  const matchesDomain = embedDomains.some(d => lower.includes(d));
  const hasEmbedPath = lower.includes('/e/') || lower.includes('/embed/') || lower.includes('/iframe/');

  if (matchesDomain || hasEmbedPath) {
    return { isEmbed: true, embedUrl: trimmed };
  }

  return { isEmbed: false, embedUrl: trimmed };
}

/**
 * Validates whether an input URL is safe and valid (http, https, or iframe string)
 */
export function isValidMediaUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  if (trimmed.includes('<iframe')) {
    const src = extractIframeSrc(trimmed);
    return !!src && (src.startsWith('http://') || src.startsWith('https://'));
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detects the source type from URL
 */
export function detectSourceType(urlString: string): 'YOUTUBE' | 'EMBED' | 'DIRECT_URL' {
  const yt = parseYouTubeUrl(urlString);
  if (yt.isYouTube) {
    return 'YOUTUBE';
  }
  const embed = parseEmbedUrl(urlString);
  if (embed.isEmbed) {
    return 'EMBED';
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

  // If input contains full iframe tag, extract src cleanly
  if (trimmed.includes('<iframe')) {
    const extracted = extractIframeSrc(trimmed);
    if (extracted) {
      return extracted;
    }
  }

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
      return `https://flop-show-4a14.onrender.com${cleanPath}`;
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


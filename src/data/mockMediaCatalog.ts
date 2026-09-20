import { MediaItem } from '../types/mediaPlayer';

/**
 * Curated Mock Media Catalog for OTT Web Application
 * Contains real, public high-definition test streams across all 3 playback engines:
 * 1. HLS Adaptive Stream (.m3u8 with multiple resolutions)
 * 2. Direct MP4 Progressive Stream (.mp4 video container)
 * 3. Third-party Embed Stream (Sandboxed 16:9 iframe)
 */
export const MOCK_MEDIA_CATALOG: MediaItem[] = [
  {
    id: 'hls-tears-of-steel',
    title: 'Tears of Steel (Adaptive 4K HLS)',
    description: 'Explore multi-bitrate HLS adaptive bitrate streaming with dynamic resolution switching from 360p up to 1080p and 4K.',
    poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    stream_type: 'hls',
    source_url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    duration_seconds: 734,
    badge: 'HLS 1080P/4K',
    category: 'Sci-Fi • Cyberpunk',
    subtitles: [
      {
        id: 'sub-en',
        label: 'English',
        srclang: 'en',
        src: '',
        default: true
      }
    ]
  },
  {
    id: 'hls-big-buck-bunny',
    title: 'Big Buck Bunny (HLS Multi-Bitrate)',
    description: 'High-definition open movie showcasing adaptive bitrate switching, bandwidth auto-detection, and fast keyframe seeking.',
    poster_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1200&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1920&q=80',
    stream_type: 'hls',
    source_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    duration_seconds: 596,
    badge: 'HLS ADAPTIVE',
    category: 'Animation • Family'
  },
  {
    id: 'direct-sintel-mp4',
    title: 'Sintel (Direct 1080p MP4 Stream)',
    description: 'Pure HTML5 progressive video playback with standard hardware acceleration, timeline scrubbing, and volume control.',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80',
    stream_type: 'direct',
    source_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    duration_seconds: 888,
    badge: 'DIRECT MP4',
    category: 'Fantasy • Drama'
  },
  {
    id: 'direct-elephants-dream',
    title: "Elephant's Dream (Direct MP4 Stream)",
    description: 'Direct progressive MP4 file streaming with native audio sync, subtitle track support, and fullscreen playback.',
    poster_url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1200&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1920&q=80',
    stream_type: 'direct',
    source_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration_seconds: 653,
    badge: 'DIRECT MP4',
    category: 'Sci-Fi • Short'
  },
  {
    id: 'embed-interstellar-trailer',
    title: 'Interstellar - Official 4K IMAX Trailer',
    description: 'Sandboxed 16:9 third-party embed player with full iframe isolation, autoplay permissions, and picture-in-picture capability.',
    poster_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    stream_type: 'embed',
    source_url: 'https://www.youtube-nocookie.com/embed/zSWdZVtXT7E?autoplay=1&modestbranding=1&rel=0',
    duration_seconds: 152,
    badge: 'EMBED / IFRAME',
    category: 'Trailer • Sci-Fi'
  },
  {
    id: 'embed-vimeo-showcase',
    title: 'Cinematic Visual Reel (Vimeo Player Embed)',
    description: 'Embedded third-party video stream demonstrating cross-domain sandboxing without disrupting the OTT app chrome.',
    poster_url: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=1200&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80',
    stream_type: 'embed',
    source_url: 'https://player.vimeo.com/video/76979871?autoplay=1&color=f5c518&title=0&byline=0&portrait=0',
    duration_seconds: 210,
    badge: 'VIMEO EMBED',
    category: 'Documentary • Art'
  },
  {
    id: 'error-fallback-demo',
    title: 'Invalid Source (Error Fallback Showcase)',
    description: 'Simulates an unavailable or network-blocked stream to verify the player gracefully catches errors and displays the retry interface.',
    poster_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    stream_type: 'direct',
    source_url: 'https://invalid-media-url-demo.flopshow.tv/corrupt-stream.mp4',
    duration_seconds: 120,
    badge: 'ERROR TEST',
    category: 'Diagnostics'
  }
];

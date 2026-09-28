import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { formatSeconds } from '../../utils/formatters';
import { parseYouTubeUrl, parseEmbedUrl } from '../../utils/mediaUrl';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { AdPreroll, AdConfig } from './AdPreroll';
import {
  Play,
  Pause,
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  AlertCircle,
  Loader2,
  X,
  Settings,
  MessageSquare,
  PictureInPicture,
  Check
} from 'lucide-react';

export interface MediaPlayerSource {
  title: string;
  subtitle?: string;
  mediaType: 'MAIN' | 'TRAILER';
  url: string;
  poster?: string;
  contentId?: string;
  episodeId?: string;
  durationSeconds?: number;
  initialTimeSeconds?: number;
  vcdnStatus?: string;
  maxResolution?: '720p' | '1080p';
  downloadAllowed?: boolean;
  mimeType?: string;
  format?: 'hls' | 'mp4' | 'embed' | 'dash';
  subtitles?: Array<{
    id?: string;
    label: string;
    language: string;
    url: string;
    format?: string;
  }>;
}

export interface MediaPlayerProps {
  source: MediaPlayerSource | null;
  onClose: () => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  hasNextEpisode?: boolean;
  hasPrevEpisode?: boolean;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  source,
  onClose,
  onNextEpisode,
  hasNextEpisode,
}) => {
  const { saveWatchProgress } = useApp();

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoFit, setVideoFit] = useState<'contain' | 'cover'>('cover');
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAudioSubs, setShowAudioSubs] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived loading state for backwards compatibility
  const isLoading = isInitialLoading || isBuffering;

  // Episode metadata parser: [S2 • E4] Title
  const episodeMeta = React.useMemo(() => {
    const sub = source?.subtitle || '';
    const match = sub.match(/S(\d+)\s*E(\d+)[:\s]*(.*)/i) || sub.match(/Season\s*(\d+)\s*Episode\s*(\d+)[:\s]*(.*)/i);
    if (match) {
      const s = match[1];
      const e = match[2];
      const name = match[3]?.trim();
      return {
        pill: `[S${s} • E${e}]`,
        title: name ? `${source?.title} – ${name}` : `${source?.title} – S${s} E${e}`
      };
    }
    if (source?.episodeId) {
      return {
        pill: '[Episode]',
        title: sub ? `${source?.title} – ${sub}` : (source?.title || '')
      };
    }
    return {
      pill: null,
      title: source?.title || ''
    };
  }, [source?.subtitle, source?.title, source?.episodeId]);

  // Advertisement Pre-roll State
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  // adFinished: true for trailers (no ad needed), initially checked for MAIN
  const [adFinished, setAdFinished] = useState<boolean>(
    !source || source.mediaType !== 'MAIN'
  );
  // adChecking: true while we are waiting for getAdsConfig() to resolve.
  // The video element is NOT mounted until adChecking becomes false.
  // This prevents the 1-second video flash before AdPreroll appears.
  const [adChecking, setAdChecking] = useState<boolean>(
    !!(source && source.mediaType === 'MAIN')
  );

  // Determine if source is YouTube or External Embed (e.g. Streamtape, Third-Party Iframe)
  const youtubeInfo = parseYouTubeUrl(source?.url || '');
  const isYouTube = youtubeInfo.isYouTube;
  const embedInfo = parseEmbedUrl(source?.url || '');
  const isEmbed = embedInfo.isEmbed;

  // Track mobile viewport (< 768px)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-Landscape Launch Physics on Mount:
  // Component mount hote hi container fullscreen trigger ho.
  // Mobile screen orientation turant landscape me auto-lock ho jaye:
  // window.screen.orientation.lock('landscape').catch(() => {})
  // Notch-to-notch horizontal video full-width chalega.
  // Close hote hi ya '✕' dabane par portrait me restore ho jaye.
  useEffect(() => {
    let unmounted = false;
    const launchAutoLandscape = async () => {
      try {
        const elem = containerRef.current || document.documentElement;
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          if (elem.requestFullscreen) {
            await elem.requestFullscreen({ navigationUI: 'hide' } as any).catch(() => {});
          } else if ((elem as any).webkitRequestFullscreen) {
            await (elem as any).webkitRequestFullscreen();
          }
        }
        if (!unmounted) setIsFullscreen(true);
      } catch (_) {}

      try {
        if (window.screen?.orientation && 'lock' in window.screen.orientation) {
          await (window.screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch (_) {}
    };

    launchAutoLandscape();

    return () => {
      unmounted = true;
      try {
        if (window.screen?.orientation && 'unlock' in window.screen.orientation) {
          window.screen.orientation.unlock();
        }
      } catch (_) {}
      try {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          }
        }
      } catch (_) {}
    };
  }, []);

  // Sync fullscreen state & auto-rotation unlock
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
      if (!isFs && window.screen?.orientation && 'unlock' in window.screen.orientation) {
        try {
          window.screen.orientation.unlock();
        } catch {
          // Gracefully ignore
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    const video = videoRef.current;
    const handleWebkitBeginFs = () => setIsFullscreen(true);
    const handleWebkitEndFs = () => {
      setIsFullscreen(false);
      if (window.screen?.orientation && 'unlock' in window.screen.orientation) {
        try {
          window.screen.orientation.unlock();
        } catch {}
      }
    };
    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleWebkitBeginFs);
      video.addEventListener('webkitendfullscreen', handleWebkitEndFs);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleWebkitBeginFs);
        video.removeEventListener('webkitendfullscreen', handleWebkitEndFs);
      }
    };
  }, []);

  // Lock document body scroll while player is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // ─── ALL HOOKS UNCONDITIONAL — Rules of Hooks requires this ─────────────────

  // Fetch ad config once per content/episode for MAIN type
  useEffect(() => {
    let active = true;
    if (source?.mediaType === 'MAIN') {
      setAdChecking(true);
      api.content.getAdsConfig()
        .then(cfg => {
          if (active) {
            if (cfg && cfg.enabled && cfg.mediaUrl && cfg.mediaUrl.trim() !== '') {
              setAdConfig(cfg);
              setAdFinished(false);
            } else {
              setAdFinished(true);
            }
          }
        })
        .catch(() => {
          // Ad check failed — skip ads and proceed to main content immediately
          if (active) setAdFinished(true);
        })
        .finally(() => {
          if (active) setAdChecking(false);
        });
    } else {
      setAdFinished(true);
      setAdChecking(false);
    }
    return () => { active = false; };
  }, [source?.contentId, source?.episodeId, source?.mediaType]);

  const hasSeekedRef = useRef(false);
  const sourceRef = useRef(source);
  useEffect(() => {
    sourceRef.current = source;
    hasSeekedRef.current = false;
  }, [source?.url, source?.contentId, source?.episodeId]);

  // Reset player state whenever the source URL changes
  useEffect(() => {
    if (!source?.url) return;
    setErrorMessage(null);
    setIsInitialLoading(!isYouTube && !isEmbed);
    setIsBuffering(false);
    setCurrentTime(source.initialTimeSeconds || 0);
    setDuration(0);
    setIsPlaying(false);
  }, [source?.url, isYouTube, isEmbed]);

  // YouTube & External Embed safety: clear loading state as soon as iframe is mounted
  useEffect(() => {
    if (isYouTube || isEmbed) {
      setIsInitialLoading(false);
      setIsBuffering(false);
    }
  }, [isYouTube, isEmbed, source?.url]);

  const seekToInitialTime = useCallback((vid: HTMLVideoElement) => {
    const target = sourceRef.current?.initialTimeSeconds;
    if (typeof target === 'number' && target > 1 && !hasSeekedRef.current) {
      hasSeekedRef.current = true;
      try {
        vid.currentTime = target;
        setCurrentTime(target);
      } catch (err) {
        console.warn('[Player] Initial seek failed:', err);
      }
    }
  }, []);

  // Sync watch progress to backend & local context
  const recordProgress = useCallback((curTime: number, durTime: number) => {
    const curSource = sourceRef.current;
    if (!curSource || !curSource.contentId || curSource.mediaType === 'TRAILER' || durTime <= 0) return;

    // Guard against overwriting an existing saved position on initial unbuffered mount
    if (curTime < 1 && curSource.initialTimeSeconds && curSource.initialTimeSeconds > 2) {
      return;
    }

    const percent = Math.min(100, Math.round((curTime / durTime) * 100));
    const isCompleted = percent >= 90;

    // Save to local context & storage
    saveWatchProgress({
      contentId: curSource.contentId,
      contentType: curSource.episodeId ? 'series' : 'movie',
      title: curSource.title,
      posterUrl: curSource.poster || '',
      percent,
      currentTime: Math.round(curTime),
      duration: Math.round(durTime),
      episodeId: curSource.episodeId,
      completed: isCompleted
    });

    // Save to backend database API
    api.library.saveProgress({
      contentId: curSource.contentId,
      episodeId: curSource.episodeId,
      progressPercent: percent,
      currentTimeSeconds: Math.round(curTime),
      durationSeconds: Math.round(durTime)
    }).catch(() => {
      // Background sync, suppress transient offline errors
    });
  }, [saveWatchProgress]);

  // Periodic watch progress interval (every 5 seconds)
  useEffect(() => {
    const isYT = source ? parseYouTubeUrl(source.url).isYouTube : false;
    if (!isYT && isPlaying) {
      progressIntervalRef.current = window.setInterval(() => {
        if (videoRef.current && videoRef.current.duration > 0) {
          recordProgress(videoRef.current.currentTime, videoRef.current.duration);
        }
      }, 5000);
    }
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isPlaying, source, recordProgress]);

  // Save progress on unmount / close and tab unload
  useEffect(() => {
    const handleSaveOnExit = () => {
      const vid = videoRef.current;
      const curSource = sourceRef.current;
      if (vid && curSource && curSource.mediaType !== 'TRAILER' && vid.duration > 0 && vid.currentTime > 1) {
        recordProgress(vid.currentTime, vid.duration);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSaveOnExit();
      }
    };

    window.addEventListener('beforeunload', handleSaveOnExit);
    window.addEventListener('pagehide', handleSaveOnExit);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      handleSaveOnExit();
      window.removeEventListener('beforeunload', handleSaveOnExit);
      window.removeEventListener('pagehide', handleSaveOnExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [recordProgress]);

  // Poll VCDN transcoding status if video is PROCESSING
  useEffect(() => {
    if (!source || source.vcdnStatus !== 'PROCESSING' || !source.contentId) return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const mediaRes = source.episodeId
          ? await api.media.getEpisodeMedia(source.episodeId, 'MAIN')
          : await api.media.getContentMedia(source.contentId!, 'MAIN');

        if (!active) return;
        const newStatus = (mediaRes as any)?.vcdnStatus;
        if (newStatus === 'READY' && mediaRes?.url) {
          if (videoRef.current) {
            if (hlsRef.current) {
              hlsRef.current.loadSource(mediaRes.url);
              hlsRef.current.startLoad();
            } else {
              videoRef.current.src = mediaRes.url;
              videoRef.current.load();
            }
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
          setIsInitialLoading(false);
          setIsBuffering(false);
          clearInterval(interval);
        }
      } catch {
        // Continue polling
      }
    }, 6000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [source?.contentId, source?.episodeId, source?.vcdnStatus]);

  // Initialize video stream: Adaptive HLS via hls.js or native HTML5 video
  useEffect(() => {
    if (!source?.url || isYouTube || isEmbed || adChecking || (!adFinished && adConfig?.enabled)) return;

    const video = videoRef.current;
    if (!video) return;

    const isHls = source.url.includes('.m3u8') ||
                  source.url.includes('m3u8') ||
                  source.url.includes('stream.vcdn.me') ||
                  source.url.includes('/master.m3u8') ||
                  Boolean(source.mimeType && (source.mimeType.includes('mpegurl') || source.mimeType.includes('m3u8'))) ||
                  source.format === 'hls';

    // Clean up any existing Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hlsRef.current = hls;
      hls.loadSource(source.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        // Enforce 720p resolution cap for 24H & 3D Watch Passes
        if (source.maxResolution === '720p' && data.levels && data.levels.length > 0) {
          let maxCapIndex = -1;
          data.levels.forEach((lvl, idx) => {
            if (lvl.height && lvl.height <= 720) {
              if (maxCapIndex === -1 || (lvl.height > (data.levels[maxCapIndex].height || 0))) {
                maxCapIndex = idx;
              }
            }
          });
          if (maxCapIndex !== -1) {
            hls.autoLevelCapping = maxCapIndex;
          }
        }
        setIsInitialLoading(false);
        setIsBuffering(false);
        setErrorMessage(null);
        seekToInitialTime(video);
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
        if (data.details.totalduration) {
          setDuration(data.details.totalduration);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS] Network error encountered, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS] Media error encountered, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS] Fatal unrecoverable error:', data);
              hls.destroy();
              hlsRef.current = null;
              setIsInitialLoading(false);
              setIsBuffering(false);
              setIsPlaying(false);
              setErrorMessage('Adaptive HLS stream failed to load. The video may still be transcoding or unavailable.');
              break;
          }
        }
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = source.url;
    } else {
      // Standard MP4 / WebM / direct URL video file
      video.src = source.url;
    }
  }, [source?.url, isYouTube, adChecking, adFinished, adConfig?.enabled, source?.initialTimeSeconds]);

  // Cleanup HLS instance on component unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // Stable callback when preroll ad completes or is skipped
  const handleAdComplete = useCallback(() => {
    setAdFinished(true);
  }, []);

  // ─── END UNCONDITIONAL HOOKS ─────────────────────────────────────────────────

  if (!source) return null;

  // While ad check is still in-flight, show a neutral loading overlay.
  // This prevents the video from mounting and playing for ~1s before AdPreroll appears.
  if (adChecking) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2500,
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', pointerEvents: 'none' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(245, 197, 24, 0.2)',
              borderTopColor: 'var(--brand-gold, #F5C518)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Preparing playback...</span>
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: '24px',
            padding: '10px 22px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Render Pre-roll Advertisement if active and not yet finished
  if (!adFinished && adConfig && adConfig.enabled && adConfig.mediaUrl) {
    return (
      <AdPreroll
        adConfig={adConfig}
        onComplete={handleAdComplete}
        onClose={onClose}
      />
    );
  }

  const handleRetry = () => {
    setErrorMessage(null);
    setIsInitialLoading(true);
    setIsBuffering(false);
    if (hlsRef.current && source?.url) {
      hlsRef.current.loadSource(source.url);
      hlsRef.current.startLoad();
      if (videoRef.current) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    } else if (videoRef.current) {
      if (source?.url) videoRef.current.src = source.url;
      videoRef.current.load();
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  // Handle controls hide on idle (3 seconds inactivity)
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Re-display or toggle controls on single tap without triggering interactive elements
  const handleContainerTap = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;

    if (!showControls) {
      setShowControls(true);
      if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = window.setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    } else if (isPlaying) {
      setShowControls(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      recordProgress(videoRef.current.currentTime, videoRef.current.duration);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = window.setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }).catch((err) => {
        if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
          setIsPlaying(false);
        } else {
          setErrorMessage('Unable to play video: ' + (err?.message || 'playback error'));
        }
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || source.durationSeconds || 1;
    setCurrentTime(cur);
    setDuration(dur);
    if (isBuffering) {
      setIsBuffering(false);
    }
    if (isInitialLoading && cur > 0) {
      setIsInitialLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTo = (parseFloat(e.target.value) / 100) * duration;
    videoRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
    recordProgress(seekTo, duration);
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    recordProgress(target, duration);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const val = parseFloat(e.target.value);
    videoRef.current.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleZoom = () => {
    setVideoFit(prev => prev === 'contain' ? 'cover' : 'contain');
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const isCurrentlyFullscreen = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement ||
      isFullscreen
    );

    try {
      if (!isCurrentlyFullscreen) {
        if (container.requestFullscreen) {
          await container.requestFullscreen({ navigationUI: 'hide' } as any);
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        } else if (video && (video as any).webkitEnterFullscreen) {
          (video as any).webkitEnterFullscreen();
        }
        setIsFullscreen(true);

        if (window.screen?.orientation && 'lock' in window.screen.orientation) {
          try {
            await (window.screen.orientation as any).lock('landscape');
          } catch {
            // Gracefully ignore if device permissions disallow orientation lock
          }
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        setIsFullscreen(false);

        if (window.screen?.orientation && 'unlock' in window.screen.orientation) {
          try {
            window.screen.orientation.unlock();
          } catch {
            // Gracefully ignore
          }
        }
      }
    } catch (err) {
      console.warn('[MediaPlayer] Fullscreen toggle notice:', err);
      if (!isCurrentlyFullscreen && video && (video as any).webkitEnterFullscreen) {
        try {
          (video as any).webkitEnterFullscreen();
          setIsFullscreen(true);
        } catch {}
      }
    }
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('[MediaPlayer] PiP notice:', err);
    }
  };

  const toggleSubtitles = () => {
    const nextState = !subtitlesEnabled;
    setSubtitlesEnabled(nextState);
    if (videoRef.current?.textTracks) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = nextState ? 'showing' : 'hidden';
      }
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSettings(false);
  };

  const handleClose = async () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      } catch {}
    }
    if (window.screen?.orientation && 'unlock' in window.screen.orientation) {
      try {
        window.screen.orientation.unlock();
      } catch {}
    }
    if (videoRef.current && !isYouTube) {
      recordProgress(videoRef.current.currentTime, videoRef.current.duration);
    }
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className={`media-player-container ${isFullscreen ? 'is-fullscreen' : ''}`}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onClick={handleContainerTap}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '100vw',
        height: '100%',
        maxHeight: '100vh',
      }}
    >
      {/* -------------------------------------------------------------------- */}
      {/* 1. YOUTUBE EMBEDDED PLAYER */}
      {/* -------------------------------------------------------------------- */}
      {isYouTube && youtubeInfo.embedUrl ? (
        <div
          className="aspect-video w-full max-w-full"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '100vw',
            height: isFullscreen ? '100%' : 'auto',
            maxHeight: isFullscreen ? '100vh' : (isMobile ? '50vh' : '100vh'),
            aspectRatio: isFullscreen ? undefined : '16 / 9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          <iframe
            src={youtubeInfo.embedUrl}
            title={source.title}
            onLoad={() => {
              setIsInitialLoading(false);
              setIsBuffering(false);
            }}
            style={{
              width: '100%',
              height: '100%',
              maxWidth: isFullscreen ? '100vw' : '1200px',
              border: 'none',
              borderRadius: isFullscreen ? '0px' : '8px'
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : isEmbed ? (
        /* ------------------------------------------------------------------ */
        /* 2. STREAMTAPE & THIRD-PARTY IFRAME EMBED PLAYER */
        /* ------------------------------------------------------------------ */
        <div
          className="aspect-video w-full max-w-full"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '100vw',
            height: isFullscreen ? '100%' : 'auto',
            maxHeight: isFullscreen ? '100vh' : (isMobile ? '50vh' : '100vh'),
            aspectRatio: isFullscreen ? undefined : '16 / 9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          <iframe
            src={embedInfo.embedUrl}
            title={source.title}
            className="w-full h-full border-0 rounded-lg"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              borderRadius: isFullscreen ? '0px' : '8px'
            }}
          />
        </div>
      ) : (
        /* ------------------------------------------------------------------ */
        /* 3. HTML5 VIDEO (MP4, WebM, Local Uploaded, Direct URL) */
        /* ------------------------------------------------------------------ */
        <>
          {source.vcdnStatus === 'PROCESSING' && (
            <div
              style={{
                position: 'absolute',
                top: '72px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 35,
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid rgba(245, 197, 24, 0.5)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                maxWidth: '90%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(245, 197, 24, 0.3)',
                  borderTopColor: 'var(--brand-gold, #F5C518)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  flexShrink: 0
                }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)' }}>
                  ⚡ VCDN Adaptive Streaming: Transcoding in Progress
                </div>
                <div style={{ fontSize: '12px', color: '#D1D5DB' }}>
                  This video is currently being transcoded to multi-bitrate HLS. Playback will start automatically when ready.
                </div>
              </div>
            </div>
          )}
          {source.vcdnStatus === 'FAILED' && (
            <div
              style={{
                position: 'absolute',
                top: '72px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 35,
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                maxWidth: '90%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
              }}
            >
              <AlertCircle size={20} color="#EF4444" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>
                  VCDN Transcoding Notice
                </div>
                <div style={{ fontSize: '12px', color: '#D1D5DB' }}>
                  Adaptive stream processing encountered an issue. Playback will fall back to direct media stream if available.
                </div>
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            poster={source.poster}
            preload="auto"
            playsInline
            // @ts-ignore
            webkit-playsinline="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              maxWidth: '100vw',
              maxHeight: '100vh',
              objectFit: videoFit,
              zIndex: 1
            }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (!videoRef.current) return;
              const vid = videoRef.current;
              setDuration(vid.duration);
              seekToInitialTime(vid);
              setIsInitialLoading(false);
              setIsBuffering(false);
              setErrorMessage(null);
              vid.play()
                .then(() => setIsPlaying(true))
                .catch((err) => {
                  if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') {
                    setErrorMessage('Unable to start playback: ' + (err?.message || 'unknown error'));
                  }
                  setIsPlaying(false);
                });
            }}
            onCanPlay={() => {
              if (videoRef.current) seekToInitialTime(videoRef.current);
              setIsInitialLoading(false);
              setIsBuffering(false);
            }}
            onWaiting={() => {
              if (!isInitialLoading) {
                setIsBuffering(true);
              }
            }}
            onStalled={() => {
              if (!isInitialLoading) {
                setIsBuffering(true);
              }
            }}
            onPlaying={() => {
              setIsInitialLoading(false);
              setIsBuffering(false);
              setIsPlaying(true);
              setErrorMessage(null);
            }}
            onPause={() => {
              setIsPlaying(false);
              setIsBuffering(false);
              if (videoRef.current && videoRef.current.duration > 0) {
                recordProgress(videoRef.current.currentTime, videoRef.current.duration);
              }
            }}
            onSeeked={() => {
              setIsBuffering(false);
              if (videoRef.current && videoRef.current.duration > 0) {
                recordProgress(videoRef.current.currentTime, videoRef.current.duration);
              }
            }}
            onError={() => {
              setIsInitialLoading(false);
              setIsBuffering(false);
              setIsPlaying(false);
              const mediaErr = videoRef.current?.error;
              let detailMsg = 'The video stream or media file could not be loaded. Please verify the URL or try again later.';
              if (mediaErr) {
                switch (mediaErr.code) {
                  case 1:
                    detailMsg = 'Playback was aborted by the browser. Click Retry to reload the video.';
                    break;
                  case 2:
                    detailMsg = 'A network error occurred while downloading the video stream. Please check your internet connection and retry.';
                    break;
                  case 3:
                    detailMsg = 'The video file could not be decoded. The stream may be corrupt or encoded with an unsupported codec.';
                    break;
                  case 4:
                    detailMsg = 'The video format is not natively supported by your browser or the media source was not found. Standard MP4 (H.264/AAC) or WebM is required.';
                    break;
                }
              }
              setErrorMessage(detailMsg);
            }}
            onClick={togglePlay}
            onEnded={() => {
              setIsPlaying(false);
              if (duration > 0) recordProgress(duration, duration);
              if (hasNextEpisode && onNextEpisode) {
                onNextEpisode();
              }
            }}
          >
            {source.subtitles && source.subtitles.map((sub, idx) => (
              <track
                key={sub.id || idx}
                kind="subtitles"
                src={sub.url}
                srcLang={sub.language || 'en'}
                label={sub.label || 'Subtitles'}
                default={idx === 0}
              />
            ))}
          </video>

          {/* Exact Center Controls (Left: Rewind -10s, Center: Prominent Large Solid White Play/Pause, Right: Forward +10s) */}
          {!errorMessage && !isLoading && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? '28px' : '44px',
                opacity: (showControls || !isPlaying) ? 1 : 0,
                pointerEvents: (showControls || !isPlaying) ? 'auto' : 'none',
                transition: 'opacity 0.25s ease'
              }}
            >
              {/* Left: Circular 10-second Rewind button ('-10s') */}
              <button
                onClick={(e) => { e.stopPropagation(); skipTime(-10); }}
                style={{
                  width: isMobile ? '50px' : '56px',
                  height: isMobile ? '50px' : '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(20, 20, 26, 0.72)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.55)',
                  transition: 'transform 0.15s ease'
                }}
                title="Rewind 10s"
                aria-label="Rewind 10 seconds"
              >
                <RotateCcw size={isMobile ? 20 : 22} strokeWidth={2.2} />
                <span style={{ fontSize: '10px', fontWeight: 800, marginTop: '-2px', letterSpacing: '-0.02em' }}>-10s</span>
              </button>

              {/* Center: Prominent large solid white Play / Pause icon */}
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                style={{
                  width: isMobile ? '72px' : '88px',
                  height: isMobile ? '72px' : '88px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  color: '#0A0A0E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 40px rgba(255, 255, 255, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={isMobile ? 36 : 44} fill="#0A0A0E" stroke="#0A0A0E" />
                ) : (
                  <Play size={isMobile ? 36 : 44} fill="#0A0A0E" stroke="#0A0A0E" style={{ marginLeft: '4px' }} />
                )}
              </button>

              {/* Right: Circular 10-second Forward button ('+10s') */}
              <button
                onClick={(e) => { e.stopPropagation(); skipTime(10); }}
                style={{
                  width: isMobile ? '50px' : '56px',
                  height: isMobile ? '50px' : '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(20, 20, 26, 0.72)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.55)',
                  transition: 'transform 0.15s ease'
                }}
                title="Forward 10s"
                aria-label="Forward 10 seconds"
              >
                <RotateCw size={isMobile ? 20 : 22} strokeWidth={2.2} />
                <span style={{ fontSize: '10px', fontWeight: 800, marginTop: '-2px', letterSpacing: '-0.02em' }}>+10s</span>
              </button>
            </div>
          )}

          {/* Mid-Right Floating Pill: ▶ Next EP */}
          {source.episodeId && hasNextEpisode && onNextEpisode && (
            <button
              onClick={(e) => { e.stopPropagation(); onNextEpisode(); }}
              style={{
                position: 'absolute',
                right: isMobile ? '16px' : '32px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 35,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: isMobile ? '8px 16px' : '10px 20px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(20, 20, 28, 0.88)',
                backdropFilter: 'blur(12px)',
                border: '1.5px solid rgba(255, 255, 255, 0.35)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.03em',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'auto' : 'none',
                transition: 'all 0.2s ease'
              }}
              aria-label="Play Next Episode"
            >
              <Play size={13} fill="#FFFFFF" />
              <span>Next EP</span>
            </button>
          )}
        </>
      )}

      {/* 1. Initial Cold-Start Loading Spinner & Overlay — only before media is ready and not YouTube or Embed */}
      {isInitialLoading && !isYouTube && !isEmbed && !errorMessage && (
        <div
          style={{
            position: 'absolute',
            zIndex: 15,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            color: '#FFFFFF',
            pointerEvents: 'none'
          }}
        >
          <Loader2 size={44} className="spin" color="var(--brand-gold, #F5C518)" />
          <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.02em', color: '#E5E7EB' }}>
            Loading media...
          </span>
        </div>
      )}

      {/* 2. Mid-stream Buffering Spinner — sleek spinner without blocking text */}
      {isBuffering && !isInitialLoading && isPlaying && !errorMessage && (
        <div
          style={{
            position: 'absolute',
            zIndex: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              padding: '14px',
              borderRadius: '50%',
              backgroundColor: 'rgba(10, 10, 16, 0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
            }}
          >
            <Loader2 size={36} className="spin" color="var(--brand-gold, #F5C518)" />
          </div>
        </div>
      )}

      {/* Error State Overlay */}
      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            zIndex: 20,
            maxWidth: '500px',
            padding: '28px',
            backgroundColor: 'rgba(18, 18, 28, 0.96)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '16px',
            textAlign: 'center',
            color: '#FFFFFF',
            boxShadow: '0 16px 40px rgba(0,0,0,0.85)'
          }}
        >
          <AlertCircle size={44} color="#EF4444" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Playback Notice</h4>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #9CA3AF)', marginBottom: '20px', lineHeight: 1.5 }}>
            {errorMessage}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleRetry}
              style={{
                padding: '10px 22px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                borderRadius: '8px',
                color: '#0E0E12',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Retry Playback
            </button>
            <button
              onClick={handleClose}
              style={{
                padding: '10px 22px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Back to Browse
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TOP HEADER BAR */}
      {/* -------------------------------------------------------------------- */}
      <div
        className="player-controls-top"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '20px 24px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
          opacity: (showControls || isEmbed) ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: (showControls || isEmbed) ? 'auto' : 'none'
        }}
      >
        <button
          onClick={handleClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 600,
            padding: '8px 16px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(8px)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div style={{ textAlign: 'center', flex: 1, padding: '0 16px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            {source.mediaType === 'TRAILER' ? (
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Official Trailer
              </span>
            ) : source.episodeId ? (
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase' }}>
                Series Episode
              </span>
            ) : (
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase' }}>
                Movie Premiere
              </span>
            )}
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
            {source.title}
          </h3>
          {source.subtitle && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #9CA3AF)', margin: '2px 0 0' }}>
              {source.subtitle}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '44px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            aria-label="Close Player"
            title="Close"
          >
            <X size={22} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* BOTTOM CONTROLS BAR (For HTML5 playback) */}
      {/* -------------------------------------------------------------------- */}
      {!isYouTube && !isEmbed && (
        <div
          className="player-controls-bottom"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '24px 28px 30px',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.94) 0%, transparent 100%)',
            zIndex: 30,
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: showControls ? 'auto' : 'none'
          }}
        >
          {/* Full-width sleek red seekbar */}
          <div style={{ position: 'relative', width: '100%', marginBottom: '14px', cursor: 'pointer' }}>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={duration > 0 ? (currentTime / duration) * 100 : 0}
              onChange={handleSeek}
              aria-label="Seek Video Timeline"
              className="player-red-seekbar"
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                accentColor: '#E50914',
                cursor: 'pointer',
                display: 'block',
                background: `linear-gradient(to right, #E50914 ${(duration > 0 ? (currentTime / duration) * 100 : 0)}%, rgba(255, 255, 255, 0.28) ${(duration > 0 ? (currentTime / duration) * 100 : 0)}%)`
              }}
            />
          </div>

          {/* Controls Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
            {/* Bottom Left: Mini Play/Pause, Volume icon, Time counter: 04:43 / 54:18 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '14px', flexShrink: 0 }}>
              <button
                onClick={togglePlay}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '36px',
                  minHeight: '36px',
                  padding: '4px'
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} fill="#FFFFFF" /> : <Play size={20} fill="#FFFFFF" />}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={toggleMute}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '36px',
                    minHeight: '36px',
                    padding: '4px'
                  }}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                {!isMobile && (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    style={{ width: '64px', height: '3px', accentColor: '#E50914', cursor: 'pointer' }}
                    aria-label="Volume"
                  />
                )}
              </div>

              <span
                style={{
                  fontSize: isMobile ? '12px' : '13px',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontFamily: 'monospace, sans-serif',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap'
                }}
              >
                {formatSeconds(currentTime)} / {formatSeconds(duration)}
              </span>
            </div>

            {/* Bottom Center: Season/Episode pill: [S2 • E4] followed by episode title: The Gentlemen – The Bigger... */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                overflow: 'hidden',
                padding: '0 8px',
                textAlign: 'center'
              }}
            >
              {episodeMeta.pill && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '5px',
                    backgroundColor: 'rgba(255, 255, 255, 0.16)',
                    color: '#FFFFFF',
                    letterSpacing: '0.04em',
                    flexShrink: 0
                  }}
                >
                  {episodeMeta.pill}
                </span>
              )}
              <span
                style={{
                  fontSize: isMobile ? '12px' : '13.5px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: isMobile ? '160px' : '400px'
                }}
                title={episodeMeta.title}
              >
                {episodeMeta.title}
              </span>
            </div>

            {/* Bottom Right Action Icons: Audio/Subtitles dialog icon, Picture-in-Picture (PiP), Closed Captions (CC pill), Settings gear icon */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '10px' : '16px',
                position: 'relative',
                flexShrink: 0
              }}
            >
              {/* Audio & Subtitles Dialog Icon */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowAudioSubs(prev => !prev); setShowSettings(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: showAudioSubs ? '#E50914' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  transition: 'color 0.15s ease'
                }}
                title="Audio & Subtitles"
                aria-label="Audio and Subtitles"
              >
                <MessageSquare size={20} />
              </button>

              {/* Picture-in-Picture (PiP) */}
              <button
                onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px'
                }}
                title="Picture-in-Picture"
                aria-label="Picture-in-Picture"
              >
                <PictureInPicture size={20} />
              </button>

              {/* Closed Captions (CC pill) */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleSubtitles(); }}
                style={{
                  background: subtitlesEnabled ? 'rgba(229, 9, 20, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                  border: subtitlesEnabled ? '1.5px solid #E50914' : '1px solid rgba(255, 255, 255, 0.25)',
                  color: subtitlesEnabled ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                  borderRadius: '5px',
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                title={subtitlesEnabled ? 'Captions Enabled' : 'Captions Disabled'}
                aria-label="Toggle Closed Captions"
              >
                CC
              </button>

              {/* Aspect Ratio Fill/Fit */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleZoom(); }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '5px',
                  color: videoFit === 'cover' ? '#E50914' : '#FFFFFF',
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={videoFit === 'contain' ? 'Zoom to Fill (Cover)' : 'Original Ratio (Fit)'}
                aria-label="Toggle Video Aspect Ratio"
              >
                {videoFit === 'contain' ? 'FIT' : 'FILL'}
              </button>

              {/* Settings Gear Icon */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowSettings(prev => !prev); setShowAudioSubs(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: showSettings ? '#E50914' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  transition: 'color 0.15s ease'
                }}
                title="Settings"
                aria-label="Player Settings"
              >
                <Settings size={20} />
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px'
                }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>

              {/* Audio & Subtitles Popup Card */}
              {showAudioSubs && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    bottom: '50px',
                    right: '50px',
                    width: '260px',
                    backgroundColor: 'rgba(18, 18, 24, 0.96)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
                    zIndex: 60,
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: '8px', color: '#E50914', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.06em' }}>
                    Audio & Subtitles
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>Audio Track</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                      <span>Original (English 5.1)</span>
                      <Check size={14} color="#E50914" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>Subtitles</div>
                    <div
                      onClick={toggleSubtitles}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.08)', cursor: 'pointer' }}
                    >
                      <span>{subtitlesEnabled ? 'English [CC]' : 'Off'}</span>
                      {subtitlesEnabled && <Check size={14} color="#E50914" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Popup Card */}
              {showSettings && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    bottom: '50px',
                    right: '0px',
                    width: '240px',
                    backgroundColor: 'rgba(18, 18, 24, 0.96)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
                    zIndex: 60,
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: '10px', color: '#E50914', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.06em' }}>
                    Playback Settings
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>Playback Speed</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                      {[0.75, 1, 1.25, 1.5].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handleSpeedChange(rate)}
                          style={{
                            padding: '5px 0',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: playbackRate === rate ? '#E50914' : 'rgba(255,255,255,0.08)',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>Screen Aspect Ratio</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        onClick={() => { setVideoFit('cover'); setShowSettings(false); }}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: videoFit === 'cover' ? '#E50914' : 'rgba(255,255,255,0.08)',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Fill (Cover)
                      </button>
                      <button
                        onClick={() => { setVideoFit('contain'); setShowSettings(false); }}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: videoFit === 'contain' ? '#E50914' : 'rgba(255,255,255,0.08)',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Fit Ratio
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

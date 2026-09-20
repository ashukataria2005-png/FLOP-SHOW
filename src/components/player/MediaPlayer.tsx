import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { formatSeconds } from '../../utils/formatters';
import { parseYouTubeUrl } from '../../utils/mediaUrl';
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
  SkipBack,
  SkipForward
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
  onPrevEpisode,
  hasNextEpisode,
  hasPrevEpisode
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
  const [showControls, setShowControls] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived loading state for backwards compatibility
  const isLoading = isInitialLoading || isBuffering;

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

  // Determine if source is YouTube
  const youtubeInfo = parseYouTubeUrl(source?.url || '');
  const isYouTube = youtubeInfo.isYouTube;

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
    setIsInitialLoading(!isYouTube);
    setIsBuffering(false);
    setCurrentTime(source.initialTimeSeconds || 0);
    setDuration(0);
    setIsPlaying(false);
  }, [source?.url, isYouTube]);

  // YouTube trailer safety: clear loading state as soon as iframe is mounted
  useEffect(() => {
    if (isYouTube) {
      setIsInitialLoading(false);
      setIsBuffering(false);
    }
  }, [isYouTube, source?.url]);

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
    if (!source?.url || isYouTube || adChecking || (!adFinished && adConfig?.enabled)) return;

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

  // Handle controls hide on idle
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      recordProgress(videoRef.current.currentTime, videoRef.current.duration);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
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

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const handleClose = () => {
    if (videoRef.current && !isYouTube) {
      recordProgress(videoRef.current.currentTime, videoRef.current.duration);
    }
    onClose();
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* -------------------------------------------------------------------- */}
      {/* 1. YOUTUBE EMBEDDED PLAYER */}
      {/* -------------------------------------------------------------------- */}
      {isYouTube && youtubeInfo.embedUrl ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              maxWidth: '1200px',
              aspectRatio: '16/9',
              border: 'none',
              borderRadius: '8px'
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        /* ------------------------------------------------------------------ */
        /* 2. HTML5 VIDEO (MP4, WebM, Local Uploaded, Direct URL) */
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
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
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

          {/* Large Center Play Trigger — only when NOT playing, NOT loading, NO error */}
          {!isPlaying && !isLoading && !errorMessage && (
            <div
              onClick={togglePlay}
              style={{
                position: 'absolute',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                color: '#0E0E12',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 35px rgba(245, 197, 24, 0.55)',
                cursor: 'pointer',
                zIndex: 10,
                transition: 'transform 0.15s ease'
              }}
            >
              <Play size={36} fill="#0E0E12" style={{ marginLeft: '4px' }} />
            </div>
          )}
        </>
      )}

      {/* 1. Initial Cold-Start Loading Spinner & Overlay — only before media is ready and not YouTube */}
      {isInitialLoading && !isYouTube && !errorMessage && (
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
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none'
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '80px', justifyContent: 'flex-end' }}>
          {source.episodeId && (
            <>
              {onPrevEpisode && (
                <button
                  onClick={onPrevEpisode}
                  disabled={!hasPrevEpisode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    backgroundColor: hasPrevEpisode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    color: hasPrevEpisode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: hasPrevEpisode ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s'
                  }}
                  title={hasPrevEpisode ? 'Previous Episode' : 'First episode in season'}
                  aria-label="Previous Episode"
                >
                  <SkipBack size={14} />
                  <span>Prev</span>
                </button>
              )}
              {onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  disabled={!hasNextEpisode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    backgroundColor: hasNextEpisode ? 'rgba(245, 166, 35, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: hasNextEpisode ? '1px solid var(--brand-gold, #F5C518)' : 'none',
                    color: hasNextEpisode ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.3)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: hasNextEpisode ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                  title={hasNextEpisode ? 'Next Episode' : 'Last episode in season'}
                  aria-label="Next Episode"
                >
                  <span>Next</span>
                  <SkipForward size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* BOTTOM CONTROLS BAR (For HTML5 playback) */}
      {/* -------------------------------------------------------------------- */}
      {!isYouTube && (
        <div
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
          {/* Seekbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 600, minWidth: '46px' }}>
              {formatSeconds(currentTime)}
            </span>

            <input
              type="range"
              min="0"
              max="100"
              value={duration > 0 ? (currentTime / duration) * 100 : 0}
              onChange={handleSeek}
              style={{
                flex: 1,
                height: '5px',
                borderRadius: '9999px',
                accentColor: 'var(--brand-gold, #F5C518)',
                cursor: 'pointer'
              }}
            />

            <span style={{ fontSize: '13px', color: 'var(--text-secondary, #9CA3AF)', minWidth: '46px', textAlign: 'right' }}>
              {formatSeconds(duration)}
            </span>
          </div>

          {/* Controls Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Previous Episode button */}
              {source.episodeId && onPrevEpisode && (
                <button
                  onClick={onPrevEpisode}
                  disabled={!hasPrevEpisode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: hasPrevEpisode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)',
                    cursor: hasPrevEpisode ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  title={hasPrevEpisode ? 'Previous Episode' : 'First episode in season'}
                  aria-label="Previous Episode"
                >
                  <SkipBack size={20} />
                </button>
              )}

              <button
                onClick={togglePlay}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} fill="#FFFFFF" />}
              </button>

              {/* Next Episode button */}
              {source.episodeId && onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  disabled={!hasNextEpisode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: hasNextEpisode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)',
                    cursor: hasNextEpisode ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  title={hasNextEpisode ? 'Next Episode' : 'Last episode in season'}
                  aria-label="Next Episode"
                >
                  <SkipForward size={20} />
                </button>
              )}

              <button
                onClick={() => skipTime(-10)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #9CA3AF)', cursor: 'pointer' }}
                title="Rewind 10s"
              >
                <RotateCcw size={20} />
              </button>

              <button
                onClick={() => skipTime(10)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #9CA3AF)', cursor: 'pointer' }}
                title="Forward 10s"
              >
                <RotateCw size={20} />
              </button>

              {/* Volume */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
                <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}>
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  style={{ width: '70px', height: '4px', accentColor: 'var(--brand-gold, #F5C518)', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {source.episodeId && hasNextEpisode && onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'rgba(245, 166, 35, 0.15)',
                    border: '1px solid var(--brand-gold, #F5C518)',
                    color: 'var(--brand-gold, #F5C518)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  aria-label="Next Episode"
                >
                  <span>Next Episode</span>
                  <SkipForward size={14} />
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

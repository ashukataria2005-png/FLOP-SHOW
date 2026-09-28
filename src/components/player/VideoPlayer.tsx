import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Episode } from '../../types/content';
import { formatSeconds } from '../../utils/formatters';
import { parseEmbedUrl } from '../../utils/mediaUrl';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ListVideo,
  X,
  AlertTriangle,
  Settings,
  MessageSquare,
  PictureInPicture,
  Check
} from 'lucide-react';
import { AdPreroll, AdConfig } from './AdPreroll';
import { api } from '../../services/api';

export const VideoPlayer: React.FC = () => {
  const {
    activePlayerContent,
    activeEpisode,
    startPlaying,
    closePlayer,
    getProgress,
    saveWatchProgress,
  } = useApp();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Default videoFit to 'cover' for notch-to-notch horizontal full-width display
  const [videoFit, setVideoFit] = useState<'contain' | 'cover'>('cover');
  const toggleZoom = () => setVideoFit(prev => prev === 'contain' ? 'cover' : 'contain');
  const [showControls, setShowControls] = useState(true);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAudioSubs, setShowAudioSubs] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

  // Advertisement Pre-roll State
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [adFinished, setAdFinished] = useState(false);
  const [adChecking, setAdChecking] = useState(true);
  /** Set when the video element fires an error or produces no decoded frames */
  const [codecError, setCodecError] = useState(false);

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

  // ── Auto-Landscape Launch Physics on Mount ──────────────────────────────
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

  // Listen to fullscreen changes across all browsers and unlock orientation on exit
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
      if (!isFs && window.screen?.orientation?.unlock) {
        try {
          window.screen.orientation.unlock();
        } catch {}
      }
    };

    const handleVideoEndFullscreen = () => {
      setIsFullscreen(false);
      if (window.screen?.orientation?.unlock) {
        try {
          window.screen.orientation.unlock();
        } catch {}
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.addEventListener('webkitendfullscreen', handleVideoEndFullscreen);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
      if (videoEl) {
        videoEl.removeEventListener('webkitendfullscreen', handleVideoEndFullscreen);
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

  // Fetch native advertisement config for active content
  useEffect(() => {
    let active = true;
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
        if (active) setAdFinished(true);
      })
      .finally(() => {
        if (active) setAdChecking(false);
      });
    return () => { active = false; };
  }, [activePlayerContent?.id, activeEpisode?.id]);

  // ── Restore watch-progress on mount / content change ─────────────────────
  useEffect(() => {
    if (!activePlayerContent) return;
    setCodecError(false);
    const existing = getProgress(activePlayerContent.id);
    if (existing && existing.currentTime > 5 && videoRef.current) {
      videoRef.current.currentTime = existing.currentTime;
    }
  }, [activePlayerContent?.id, activeEpisode?.id, getProgress]);

  if (!activePlayerContent) return null;

  const isSeries = activePlayerContent.type === 'series';
  const currentVideoSrc = isSeries
    ? (activeEpisode?.videoUrl || activePlayerContent.seasons?.[0]?.episodes[0]?.videoUrl)
    : activePlayerContent.videoUrl;

  const embedInfo = parseEmbedUrl(currentVideoSrc || '');
  const isEmbed = embedInfo.isEmbed;

  // Episode metadata parser
  const episodeMeta = {
    pill: isSeries && activeEpisode ? `[S${activeEpisode.seasonNumber} • E${activeEpisode.episodeNumber}]` : null,
    title: isSeries && activeEpisode
      ? `${activePlayerContent.title} – ${activeEpisode.title || `Episode ${activeEpisode.episodeNumber}`}`
      : activePlayerContent.title,
  };

  // ── Controls idle-hide (3 seconds of inactivity) ─────────────────────────
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
        setShowAudioSubs(false);
      }
    }, 3500);
  };

  const handleContainerTap = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;

    if (!showControls) {
      setShowControls(true);
      if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = window.setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3500);
    } else if (isPlaying) {
      setShowControls(false);
      setShowSettings(false);
      setShowAudioSubs(false);
    }
  };

  // ── Play / Pause ──────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  // ── Time update → save progress ───────────────────────────────────────────
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(cur);
    setDuration(dur);
    saveWatchProgress({
      contentId: activePlayerContent.id,
      contentType: activePlayerContent.type,
      title: activePlayerContent.title,
      posterUrl: activePlayerContent.posterUrl,
      percent: Math.round((cur / dur) * 100),
      currentTime: cur,
      duration: dur,
      episodeId: activeEpisode?.id,
      seasonNumber: activeEpisode?.seasonNumber,
      episodeNumber: activeEpisode?.episodeNumber,
    });
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    if (videoRef.current.videoWidth === 0) {
      setCodecError(true);
      return;
    }
    videoRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const handleVideoError = () => setCodecError(true);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTo = (parseFloat(e.target.value) / 100) * duration;
    videoRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(duration, videoRef.current.currentTime + seconds),
    );
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
    videoRef.current.muted = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettings(false);
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  // Fullscreen with auto-rotation handling
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      const isCurrentlyFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isCurrentlyFs) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen({ navigationUI: 'hide' } as any);
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen();
        }
        setIsFullscreen(true);
        if (window.screen?.orientation && 'lock' in window.screen.orientation) {
          (window.screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
        if (window.screen?.orientation?.unlock) {
          try {
            window.screen.orientation.unlock();
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle error:', err);
    }
  };

  const handleClose = async () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
      } catch {}
    }
    if (window.screen?.orientation?.unlock) {
      try {
        window.screen.orientation.unlock();
      } catch {}
    }
    closePlayer();
  };

  // Series: find next episode
  const findNextEpisode = (): Episode | null => {
    if (!isSeries || !activePlayerContent.seasons || !activeEpisode) return null;
    const season = activePlayerContent.seasons.find(
      s => s.seasonNumber === activeEpisode.seasonNumber,
    );
    if (!season) return null;
    const idx = season.episodes.findIndex(e => e.id === activeEpisode.id);
    if (idx < season.episodes.length - 1) return season.episodes[idx + 1];
    const next = activePlayerContent.seasons.find(
      s => s.seasonNumber === activeEpisode.seasonNumber + 1,
    );
    return next?.episodes.length ? next.episodes[0] : null;
  };

  const nextEp = findNextEpisode();

  const handleSwitchEpisode = (ep: Episode) => {
    startPlaying(activePlayerContent, ep);
    setShowEpisodeDrawer(false);
    setCodecError(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  // Render native advertisement pre-roll before main playback
  if (!adFinished && adConfig && adConfig.enabled && adConfig.mediaUrl && !adChecking) {
    return (
      <AdPreroll
        adConfig={adConfig}
        onComplete={() => setAdFinished(true)}
        onClose={closePlayer}
      />
    );
  }

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
        zIndex: 2000,
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        overflow: 'hidden',
        width: '100vw',
        maxWidth: '100vw',
        height: '100vh',
        maxHeight: '100vh',
      }}
    >
      {/* ── Video wrapper ──────────────────────────── */}
      {isEmbed ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '100vw',
            height: '100%',
            maxHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <iframe
            src={embedInfo.embedUrl}
            title={activePlayerContent.title}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
            style={{
              width: '100%',
              height: '100%',
              border: 0,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '100vw',
            height: '100%',
            maxHeight: '100vh',
            backgroundColor: '#000',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Poster — visible until playback starts */}
          {activePlayerContent.posterUrl && !isPlaying && !codecError && (
            <img
              src={activePlayerContent.posterUrl}
              alt="poster"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Codec-unsupported overlay */}
          {codecError && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.88)',
                padding: '28px',
                gap: '16px',
                textAlign: 'center',
              }}
            >
              <AlertTriangle size={48} color="#F5A623" strokeWidth={1.5} />
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                Codec not supported
              </p>
              <p
                style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.65)',
                  margin: 0,
                  lineHeight: 1.6,
                  maxWidth: '360px',
                }}
              >
                This browser requires <strong style={{ color: '#fff' }}>H.264 (MP4)</strong> video.
                HEVC / x265 files cannot be decoded directly.
              </p>
            </div>
          )}

          {/* Native HTML5 video with cover notch-to-notch fit */}
          <video
            ref={videoRef}
            src={currentVideoSrc}
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100vw',
              maxHeight: '100vh',
              objectFit: videoFit,
              display: 'block',
              position: 'relative',
              zIndex: 2,
            }}
            preload="metadata"
            playsInline
            // @ts-ignore
            webkit-playsinline="true"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleVideoError}
            onClick={togglePlay}
            onEnded={() => {
              setIsPlaying(false);
              if (nextEp) handleSwitchEpisode(nextEp);
            }}
          />
        </div>
      )}

      {/* ── TOP-RIGHT CLEAN MINIMALIST '✕' CLOSE ICON ──────────────────── */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: isMobile ? '16px' : '28px',
          right: isMobile ? '16px' : '28px',
          zIndex: 35,
          color: '#FFFFFF',
          background: 'rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '50%',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        title="Close Player"
        aria-label="Close Player"
      >
        <X size={22} strokeWidth={2.2} />
      </button>

      {/* Top Episode drawer toggle button if series */}
      {isSeries && (
        <button
          onClick={() => setShowEpisodeDrawer(true)}
          style={{
            position: 'absolute',
            top: isMobile ? '16px' : '28px',
            right: isMobile ? '68px' : '82px',
            zIndex: 35,
            color: '#FFFFFF',
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '9999px',
            padding: '8px 14px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          aria-label="Episodes list"
        >
          <ListVideo size={18} />
          <span>Episodes</span>
        </button>
      )}

      {/* ── CENTER CONTROLS: -10s, PROMINENT SOLID PLAY/PAUSE, +10s ───────── */}
      {!isEmbed && !codecError && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '28px' : '48px',
            zIndex: 30,
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* -10s Rewind */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              skipTime(-10);
            }}
            style={{
              position: 'relative',
              width: isMobile ? '52px' : '64px',
              height: isMobile ? '52px' : '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 15, 20, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'transform 0.15s ease, background-color 0.2s',
            }}
            title="Rewind 10 seconds"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw size={isMobile ? 22 : 26} strokeWidth={2.2} />
            <span style={{ fontSize: '9px', fontWeight: 800, marginTop: '-2px', letterSpacing: '-0.02em' }}>10</span>
          </button>

          {/* Large Solid White Play / Pause */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            style={{
              width: isMobile ? '72px' : '92px',
              height: isMobile ? '72px' : '92px',
              borderRadius: '50%',
              backgroundColor: 'rgba(25, 25, 30, 0.65)',
              border: '2px solid rgba(255, 255, 255, 0.22)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
              transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s',
            }}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={isMobile ? 36 : 46} fill="#FFFFFF" color="#FFFFFF" strokeWidth={1} />
            ) : (
              <Play size={isMobile ? 36 : 46} fill="#FFFFFF" color="#FFFFFF" strokeWidth={1} style={{ marginLeft: '4px' }} />
            )}
          </button>

          {/* +10s Forward */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              skipTime(10);
            }}
            style={{
              position: 'relative',
              width: isMobile ? '52px' : '64px',
              height: isMobile ? '52px' : '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 15, 20, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'transform 0.15s ease, background-color 0.2s',
            }}
            title="Forward 10 seconds"
            aria-label="Forward 10 seconds"
          >
            <RotateCw size={isMobile ? 22 : 26} strokeWidth={2.2} />
            <span style={{ fontSize: '9px', fontWeight: 800, marginTop: '-2px', letterSpacing: '-0.02em' }}>10</span>
          </button>
        </div>
      )}

      {/* ── MID-RIGHT FLOATING PILL: ▶ Next EP ───────────────────────────── */}
      {isSeries && nextEp && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSwitchEpisode(nextEp);
          }}
          style={{
            position: 'absolute',
            right: isMobile ? '16px' : '32px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 32,
            backgroundColor: 'rgba(20, 20, 26, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            color: '#FFFFFF',
            borderRadius: '9999px',
            padding: isMobile ? '8px 14px' : '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: isMobile ? '12px' : '13px',
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 0.25s ease, transform 0.2s ease, background-color 0.2s',
          }}
          title={`Next: ${nextEp.title}`}
          aria-label="Next Episode"
        >
          <Play size={14} fill="#FFFFFF" color="#FFFFFF" />
          <span>Next EP</span>
        </button>
      )}

      {/* ── BOTTOM CONTROLS BAR: FULL-WIDTH SLEEK RED SEEKBAR & EXACT NETFLIX-STYLE BAR ── */}
      {!isEmbed && (
        <div
          className="player-controls-bottom"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: isMobile ? '10px 16px 20px' : '16px 32px 28px',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 65%, transparent 100%)',
            zIndex: 25,
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Full-width sleek red seekbar */}
          <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={duration > 0 ? (currentTime / duration) * 100 : 0}
              onChange={handleSeek}
              style={{
                width: '100%',
                height: '4px',
                accentColor: '#E50914',
                cursor: 'pointer',
                borderRadius: '9999px',
                outline: 'none',
              }}
              aria-label="Seek timeline"
            />
          </div>

          {/* Action Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            {/* Bottom Left: Mini Play/Pause, Volume, Time counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px' }}>
              <button
                onClick={togglePlay}
                style={{
                  color: '#FFFFFF',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} fill="#FFF" /> : <Play size={20} fill="#FFF" />}
              </button>

              {/* Volume */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={toggleMute}
                  style={{
                    color: '#FFFFFF',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
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
                    style={{ width: '64px', height: '4px', accentColor: '#E50914', cursor: 'pointer' }}
                    aria-label="Volume slider"
                  />
                )}
              </div>

              {/* Time counter: 04:43 / 54:18 */}
              <span style={{ fontSize: isMobile ? '12px' : '13px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 600, letterSpacing: '0.02em' }}>
                {formatSeconds(currentTime)} / {formatSeconds(duration)}
              </span>
            </div>

            {/* Bottom Center: Season/Episode pill: [S2 • E4] The Gentlemen – The Bigger... */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0 12px',
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              {episodeMeta.pill && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {episodeMeta.pill}
                </span>
              )}
              <span
                style={{
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  opacity: 0.9,
                }}
              >
                {episodeMeta.title}
              </span>
            </div>

            {/* Bottom Right: Audio/Subtitles, PiP, CC, Settings, Fullscreen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '18px', flexShrink: 0 }}>
              {/* Audio/Subtitles Dialog Icon */}
              <button
                onClick={() => {
                  setShowAudioSubs(prev => !prev);
                  setShowSettings(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: showAudioSubs ? '#E50914' : '#FFFFFF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Audio & Subtitles"
                aria-label="Audio & Subtitles"
              >
                <MessageSquare size={19} />
              </button>

              {/* PiP */}
              <button
                onClick={togglePiP}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Picture-in-Picture"
                aria-label="Picture-in-Picture"
              >
                <PictureInPicture size={19} />
              </button>

              {/* CC Pill */}
              <button
                onClick={() => setSubtitlesEnabled(prev => !prev)}
                style={{
                  background: subtitlesEnabled ? 'rgba(229, 9, 20, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${subtitlesEnabled ? '#E50914' : 'rgba(255, 255, 255, 0.3)'}`,
                  color: subtitlesEnabled ? '#E50914' : '#FFFFFF',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  letterSpacing: '0.05em',
                }}
                title="Toggle Subtitles"
                aria-label="Closed Captions"
              >
                CC
              </button>

              {/* Aspect Ratio Fill/Fit */}
              <button
                onClick={toggleZoom}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '4px',
                  color: videoFit === 'cover' ? '#E50914' : '#FFFFFF',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
                title={videoFit === 'contain' ? 'Zoom to Fill (Cover)' : 'Original Ratio (Fit)'}
                aria-label="Toggle Video Aspect Ratio"
              >
                {videoFit === 'contain' ? 'FIT' : 'FILL'}
              </button>

              {/* Settings Gear */}
              <button
                onClick={() => {
                  setShowSettings(prev => !prev);
                  setShowAudioSubs(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: showSettings ? '#E50914' : '#FFFFFF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Playback Settings"
                aria-label="Playback Settings"
              >
                <Settings size={19} />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Dropdown Popup ────────────────────────────────────────── */}
      {showSettings && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '24px',
            width: '210px',
            backgroundColor: 'rgba(20, 20, 26, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '12px',
            zIndex: 40,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Playback Speed
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: playbackRate === speed ? 'rgba(229, 9, 20, 0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: playbackRate === speed ? '#E50914' : '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: playbackRate === speed ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{speed === 1 ? 'Normal (1x)' : `${speed}x`}</span>
                {playbackRate === speed && <Check size={14} color="#E50914" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Audio & Subtitles Dropdown Popup ─────────────────────────────────── */}
      {showAudioSubs && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '60px',
            width: '260px',
            backgroundColor: 'rgba(20, 20, 26, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '14px',
            zIndex: 40,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Audio & Subtitles
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <span style={{ fontSize: '13px', color: '#FFF' }}>Original Audio</span>
              <Check size={14} color="#E50914" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <span style={{ fontSize: '13px', color: '#FFF' }}>English Subtitles</span>
              <button
                onClick={() => setSubtitlesEnabled(prev => !prev)}
                style={{
                  background: subtitlesEnabled ? '#E50914' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '12px',
                  width: '36px',
                  height: '20px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: subtitlesEnabled ? '18px' : '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Series Episode Drawer ────────────────────────────────────────── */}
      {isSeries && showEpisodeDrawer && activePlayerContent.seasons && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 'clamp(300px, 85vw, 420px)',
            backgroundColor: 'rgba(14,14,20,0.96)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', margin: 0 }}>Select Episode</h3>
            <button
              onClick={() => setShowEpisodeDrawer(false)}
              style={{
                color: 'var(--text-secondary)',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Close episode drawer"
            >
              <X size={22} />
            </button>
          </div>

          {/* Season pills */}
          {activePlayerContent.seasons.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', overflowX: 'auto', paddingBottom: '4px' }}>
              {activePlayerContent.seasons.map((season, idx) => (
                <button
                  key={season.seasonNumber}
                  onClick={() => setSelectedSeasonIndex(idx)}
                  style={{
                    flex: '1 0 auto',
                    minHeight: '40px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    backgroundColor: selectedSeasonIndex === idx ? '#E50914' : 'rgba(255,255,255,0.08)',
                    color: '#FFF',
                    cursor: 'pointer',
                  }}
                >
                  Season {season.seasonNumber}
                </button>
              ))}
            </div>
          )}

          {/* Episode list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activePlayerContent.seasons[selectedSeasonIndex]?.episodes.map(ep => {
              const isSelected = activeEpisode?.id === ep.id;
              const epProgress = getProgress(activePlayerContent.id, ep.id);
              const percent = epProgress?.percent ?? (
                epProgress?.duration && epProgress.duration > 0
                  ? Math.round((epProgress.currentTime / epProgress.duration) * 100)
                  : 0
              );
              const clampedPercent = Math.min(Math.max(percent, 0), 100);
              const isWatched = Boolean(epProgress && (epProgress.completed || clampedPercent >= 90));
              const hasProgress = clampedPercent > 0;
              const barFillPercent = isWatched ? 100 : clampedPercent;

              return (
                <div
                  key={ep.id}
                  onClick={() => handleSwitchEpisode(ep)}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '10px',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? 'rgba(229, 9, 20, 0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isSelected ? '#E50914' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer',
                    alignItems: 'center',
                  }}
                >
                  {/* Thumbnail with progress bar */}
                  <div style={{ position: 'relative', width: '80px', height: '48px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#181824' }}>
                    <img
                      src={ep.thumbnailUrl}
                      alt={ep.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {hasProgress && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '3px',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          overflow: 'hidden',
                          zIndex: 3,
                        }}
                      >
                        <div
                          style={{
                            width: `${barFillPercent}%`,
                            height: '100%',
                            backgroundColor: '#E50914',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#E50914' }}>
                      EPISODE {ep.episodeNumber}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ep.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ep.duration}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

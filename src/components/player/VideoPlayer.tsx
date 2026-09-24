import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Episode } from '../../types/content';
import { formatSeconds } from '../../utils/formatters';
import { parseEmbedUrl } from '../../utils/mediaUrl';
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
  SkipForward,
  ListVideo,
  X
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// HEVC / H.265 support detection helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the browser can natively decode HEVC (H.265). */
function browserSupportsHEVC(): boolean {
  try {
    const video = document.createElement('video');
    // hvc1 = HEVC Main profile, hev1 = alt container tag
    const types = [
      'video/mp4; codecs="hvc1.1.6.L93.B0"',
      'video/mp4; codecs="hev1.1.6.L93.B0"',
      'video/mp4; codecs="hvc1"',
    ];
    for (const t of types) {
      if (video.canPlayType(t) === 'probably' || video.canPlayType(t) === 'maybe') {
        return true;
      }
    }
    // Also check MSE path used by adaptive players
    if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported) {
      if (MediaSource.isTypeSupported('video/mp4; codecs="hvc1.1.6.L93.B0"')) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Returns true if the URL is likely an HEVC/H.265 stream (MKV, HEVC-tagged MP4). */
function urlIsLikelyHEVC(src: string): boolean {
  if (!src) return false;
  const lower = src.toLowerCase();
  // MKV containers almost always carry HEVC on streaming platforms
  if (lower.endsWith('.mkv') || lower.includes('.mkv?')) return true;
  // Explicit codec hints in URL
  if (lower.includes('hevc') || lower.includes('h265') || lower.includes('h.265')) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny H265WebJS loader
// Dynamically injects the CDN script and returns the player constructor.
// h265webjs docs: https://github.com/nickdesaulniers/h265webjs (MIT)
// CDN mirror also available via jsDelivr / unpkg.
// ─────────────────────────────────────────────────────────────────────────────

const H265_CDN = 'https://cdn.jsdelivr.net/npm/h265webjs@latest/dist/h265webjs.min.js';

let _h265LoadPromise: Promise<boolean> | null = null;

function loadH265Script(): Promise<boolean> {
  if (_h265LoadPromise) return _h265LoadPromise;
  _h265LoadPromise = new Promise((resolve) => {
    // Already on window from a previous load
    if ((window as any).H265webjs) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = H265_CDN;
    script.async = true;
    script.onload = () => resolve(!!(window as any).H265webjs);
    script.onerror = () => { console.warn('[HEVC] h265webjs CDN failed to load'); resolve(false); };
    document.head.appendChild(script);
  });
  return _h265LoadPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// useHEVCFallback hook
// Manages the h265webjs player lifecycle bound to a <canvas> element.
// ─────────────────────────────────────────────────────────────────────────────

interface HEVCControls {
  /** Whether the WASM pipeline is active */
  active: boolean;
  /** Whether the library is still loading */
  loading: boolean;
  /** Any error message */
  error: string | null;
  /** Pause WASM playback */
  pause: () => void;
  /** Resume WASM playback */
  resume: () => void;
  /** Seek to a second offset (best-effort for WASM) */
  seek: (seconds: number) => void;
  /** Set volume 0–1 */
  setVolume: (v: number) => void;
  /** WASM player duration (seconds), 0 until known */
  duration: number;
  /** WASM player current time (seconds) */
  currentTime: number;
}

function useHEVCFallback(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  src: string,
  enabled: boolean,
  onEnded: () => void,
  onTimeUpdate: (cur: number, dur: number) => void,
): HEVCControls {
  const playerRef = useRef<any>(null);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Boot the WASM player when enabled + src changes
  useEffect(() => {
    if (!enabled || !src || !canvasRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadH265Script().then((ok) => {
      if (cancelled || !canvasRef.current) return;
      if (!ok) {
        setError('HEVC WASM library could not be loaded.');
        setLoading(false);
        return;
      }

      try {
        const H265 = (window as any).H265webjs;
        // Destroy any previous instance
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
        }

        const player = new H265(src, {
          canvas: canvasRef.current,
          // h265webjs config options
          readyCallback() {
            if (cancelled) return;
            setActive(true);
            setLoading(false);
            const dur = player.getDuration?.() ?? 0;
            setDuration(dur);
          },
          errorCallback(e: any) {
            if (cancelled) return;
            console.error('[HEVC] playback error', e);
            setError(String(e));
            setLoading(false);
          },
          onEndCallback() {
            if (cancelled) return;
            onEnded();
          },
          // Fired every ~250 ms by the library
          statsCallback(stats: any) {
            if (cancelled) return;
            const cur = stats?.currentTime ?? 0;
            const dur = stats?.duration ?? duration;
            setCurrentTime(cur);
            if (dur > 0) setDuration(dur);
            onTimeUpdate(cur, dur);
          },
        });

        playerRef.current = player;
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      setActive(false);
      setLoading(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, src]);

  const pause  = useCallback(() => playerRef.current?.pause?.(),  []);
  const resume = useCallback(() => playerRef.current?.play?.(),   []);
  const seek   = useCallback((s: number) => playerRef.current?.seek?.(s), []);
  const setVol = useCallback((v: number) => { if (playerRef.current?.setVolume) playerRef.current.setVolume(v); }, []);

  return { active, loading, error, pause, resume, seek, setVolume: setVol, duration, currentTime };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main VideoPlayer component
// ─────────────────────────────────────────────────────────────────────────────

export const VideoPlayer: React.FC = () => {
  const {
    activePlayerContent,
    activeEpisode,
    startPlaying,
    closePlayer,
    getProgress,
    saveWatchProgress
  } = useApp();

  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const [isPlaying,          setIsPlaying]          = useState(false);
  const [currentTime,        setCurrentTime]        = useState(0);
  const [duration,           setDuration]           = useState(0);
  const [volume,             setVolume]             = useState(1);
  const [isMuted,            setIsMuted]            = useState(false);
  const [isFullscreen,       setIsFullscreen]       = useState(false);
  const [showControls,       setShowControls]       = useState(true);
  const [showEpisodeDrawer,  setShowEpisodeDrawer]  = useState(false);
  const [selectedSeasonIndex,setSelectedSeasonIndex]= useState(0);
  // HEVC: whether the native <video> stalled with 0 video dimensions
  const [nativeVideoStalled, setNativeVideoStalled] = useState(false);

  if (!activePlayerContent) return null;

  const isSeries = activePlayerContent.type === 'series';
  const currentVideoSrc = isSeries
    ? (activeEpisode?.videoUrl || activePlayerContent.seasons?.[0]?.episodes[0]?.videoUrl)
    : activePlayerContent.videoUrl;

  const embedInfo = parseEmbedUrl(currentVideoSrc || '');
  const isEmbed   = embedInfo.isEmbed;

  // ── HEVC detection ────────────────────────────────────────────────────────
  const needsHEVCFallback = !isEmbed && (
    urlIsLikelyHEVC(currentVideoSrc || '') && !browserSupportsHEVC()
  );

  // Stall-detection: if native video produces 0×0 frames after metadata loads,
  // treat that as an implicit HEVC decode failure and activate the WASM path.
  const [useWASM, setUseWASM] = useState(needsHEVCFallback);
  useEffect(() => {
    setUseWASM(needsHEVCFallback || nativeVideoStalled);
  }, [needsHEVCFallback, nativeVideoStalled, currentVideoSrc]);

  // ── WASM player hook ──────────────────────────────────────────────────────
  const handleWASMEnded  = useCallback(() => {
    setIsPlaying(false);
    if (nextEp) handleSwitchEpisode(nextEp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWASMTimeUpdate = useCallback((cur: number, dur: number) => {
    setCurrentTime(cur);
    if (dur > 0) setDuration(dur);
    const percent = dur > 0 ? Math.round((cur / dur) * 100) : 0;
    saveWatchProgress({
      contentId:     activePlayerContent.id,
      contentType:   activePlayerContent.type,
      title:         activePlayerContent.title,
      posterUrl:     activePlayerContent.posterUrl,
      percent,
      currentTime:   cur,
      duration:      dur,
      episodeId:     activeEpisode?.id,
      seasonNumber:  activeEpisode?.seasonNumber,
      episodeNumber: activeEpisode?.episodeNumber,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayerContent.id, activeEpisode?.id]);

  const hevc = useHEVCFallback(
    canvasRef,
    currentVideoSrc || '',
    useWASM,
    handleWASMEnded,
    handleWASMTimeUpdate,
  );

  // Sync WASM duration/time into unified state when WASM is active
  useEffect(() => {
    if (useWASM && hevc.active) {
      setDuration(hevc.duration);
      setCurrentTime(hevc.currentTime);
    }
  }, [useWASM, hevc.active, hevc.duration, hevc.currentTime]);

  // ── Resume progress on mount / content change ─────────────────────────────
  useEffect(() => {
    const existing = getProgress(activePlayerContent.id);
    if (existing && existing.currentTime > 5) {
      if (!useWASM && videoRef.current) {
        videoRef.current.currentTime = existing.currentTime;
      } else if (useWASM && hevc.active) {
        hevc.seek(existing.currentTime);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayerContent.id, activeEpisode?.id, hevc.active]);

  // ── Controls idle-hide ────────────────────────────────────────────────────
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  // ── Unified play/pause (native OR WASM) ───────────────────────────────────
  const togglePlay = () => {
    if (useWASM) {
      if (isPlaying) { hevc.pause();  setIsPlaying(false); }
      else           { hevc.resume(); setIsPlaying(true);  }
      return;
    }
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  // ── Native video event handlers ───────────────────────────────────────────
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(cur);
    setDuration(dur);
    const percent = Math.round((cur / dur) * 100);
    saveWatchProgress({
      contentId:     activePlayerContent.id,
      contentType:   activePlayerContent.type,
      title:         activePlayerContent.title,
      posterUrl:     activePlayerContent.posterUrl,
      percent, currentTime: cur, duration: dur,
      episodeId:     activeEpisode?.id,
      seasonNumber:  activeEpisode?.seasonNumber,
      episodeNumber: activeEpisode?.episodeNumber,
    });
  };

  /** Detect silent HEVC decode failure: video metadata loaded but videoWidth = 0 */
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);

    const vw = videoRef.current.videoWidth;
    if (vw === 0 && !browserSupportsHEVC()) {
      // Audio-only or undecoded HEVC — activate WASM fallback
      console.warn('[HEVC] Native video has no decoded frames (width=0). Activating WASM fallback.');
      setNativeVideoStalled(true);
      return;
    }
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  // ── Unified seek ──────────────────────────────────────────────────────────
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = (parseFloat(e.target.value) / 100) * duration;
    if (useWASM) {
      hevc.seek(seekTo);
      setCurrentTime(seekTo);
    } else if (videoRef.current) {
      videoRef.current.currentTime = seekTo;
      setCurrentTime(seekTo);
    }
  };

  // ── Unified skip ──────────────────────────────────────────────────────────
  const skipTime = (seconds: number) => {
    const target = Math.max(0, Math.min(duration, currentTime + seconds));
    if (useWASM) {
      hevc.seek(target);
      setCurrentTime(target);
    } else if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  // ── Volume (native) / WASM ────────────────────────────────────────────────
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (useWASM) {
      hevc.setVolume(newMuted ? 0 : volume);
    } else if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (useWASM) {
      hevc.setVolume(val);
    } else if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted  = val === 0;
    }
  };

  // ── Fullscreen ────────────────────────────────────────────────────────────
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

  // ── Series helpers ────────────────────────────────────────────────────────
  const findNextEpisode = (): Episode | null => {
    if (!isSeries || !activePlayerContent.seasons || !activeEpisode) return null;
    const currentSeason = activePlayerContent.seasons.find(s => s.seasonNumber === activeEpisode.seasonNumber);
    if (!currentSeason) return null;
    const idx = currentSeason.episodes.findIndex(e => e.id === activeEpisode.id);
    if (idx < currentSeason.episodes.length - 1) return currentSeason.episodes[idx + 1];
    const nextSeason = activePlayerContent.seasons.find(s => s.seasonNumber === activeEpisode.seasonNumber + 1);
    if (nextSeason && nextSeason.episodes.length > 0) return nextSeason.episodes[0];
    return null;
  };

  const nextEp = findNextEpisode();

  const handleSwitchEpisode = (ep: Episode) => {
    startPlaying(activePlayerContent, ep);
    setShowEpisodeDrawer(false);
    setNativeVideoStalled(false); // reset stall flag for new source
    if (!useWASM && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  // ── Shared 16:9 wrapper style ─────────────────────────────────────────────
  const videoWrapperStyle: React.CSSProperties = {
    position:        'relative',
    width:           '100%',
    maxWidth:        '100%',
    aspectRatio:     '16 / 9',
    backgroundColor: '#000',
    overflow:        'hidden',
  };

  const mediaFillStyle: React.CSSProperties = {
    width:    '100%',
    height:   '100%',
    objectFit:'contain',
    display:  'block',
    position: 'relative',
    zIndex:   2,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          2000,
        backgroundColor: '#000000',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        userSelect:      'none',
      }}
    >
      {/* ── Conditional Player ──────────────────────────────────────────── */}
      {isEmbed ? (
        <iframe
          src={embedInfo.embedUrl}
          title={activePlayerContent.title}
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ width: '100%', height: '100%', border: 0, borderRadius: '8px' }}
        />
      ) : (
        <div style={videoWrapperStyle}>
          {/* Poster overlay — unmounts once playback starts */}
          {activePlayerContent.posterUrl && !isPlaying && (
            <img
              src={activePlayerContent.posterUrl}
              alt="poster"
              style={{
                position:      'absolute',
                inset:         0,
                width:         '100%',
                height:        '100%',
                objectFit:     'cover',
                zIndex:        1,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* ── WASM HEVC canvas (active when native decoding fails) ── */}
          {useWASM ? (
            <>
              <canvas
                ref={canvasRef}
                onClick={togglePlay}
                style={mediaFillStyle}
              />
              {/* WASM loading / error overlay */}
              {(hevc.loading || hevc.error) && (
                <div style={{
                  position:       'absolute',
                  inset:          0,
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  background:     'rgba(0,0,0,0.7)',
                  zIndex:         3,
                  color:          '#fff',
                  gap:            '12px',
                  fontSize:       '14px',
                  textAlign:      'center',
                  padding:        '20px',
                }}>
                  {hevc.loading && !hevc.error && (
                    <>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.2)',
                        borderTopColor: 'var(--brand-gold)',
                        animation: 'spin 0.9s linear infinite',
                      }} />
                      <span>Loading HEVC decoder…</span>
                    </>
                  )}
                  {hevc.error && (
                    <span style={{ color: '#ff6b6b' }}>
                      ⚠️ HEVC decode error: {hevc.error}
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            /* ── Native HTML5 video (H.264 / standard formats) ── */
            <video
              ref={videoRef}
              src={currentVideoSrc}
              style={mediaFillStyle}
              preload="metadata"
              playsInline
              // @ts-ignore — webkit non-standard attr for iOS Safari inline playback
              webkit-playsinline="true"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
              onEnded={() => {
                setIsPlaying(false);
                if (nextEp) handleSwitchEpisode(nextEp);
              }}
            />
          )}
        </div>
      )}

      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <div
        style={{
          position:      'absolute',
          top: 0, left: 0, right: 0,
          padding:       '20px 24px',
          background:    'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          zIndex:        20,
          opacity:       (showControls || isEmbed) ? 1 : 0,
          transition:    'opacity 0.3s ease',
          pointerEvents: (showControls || isEmbed) ? 'auto' : 'none',
        }}
      >
        <button
          onClick={closePlayer}
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            '8px',
            color:          '#FFFFFF',
            fontSize:       '15px',
            fontWeight:     600,
            padding:        '8px 14px',
            borderRadius:   '9999px',
            backgroundColor:'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            transition:     'background-color 0.2s',
          }}
        >
          <ArrowLeft size={18} />
          <span>Back to browse</span>
        </button>

        <div style={{ textAlign: 'center', flex: 1, padding: '0 16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>
            {activePlayerContent.title}
          </h3>
          {isSeries && activeEpisode && (
            <span style={{ fontSize: '13px', color: 'var(--brand-gold)', fontWeight: 600 }}>
              S{activeEpisode.seasonNumber}:E{activeEpisode.episodeNumber} • {activeEpisode.title}
            </span>
          )}
          {/* HEVC badge */}
          {useWASM && hevc.active && (
            <span style={{
              display:       'inline-block',
              marginLeft:    '8px',
              fontSize:      '10px',
              fontWeight:    800,
              letterSpacing: '0.5px',
              color:         'var(--brand-gold)',
              border:        '1px solid var(--brand-gold)',
              borderRadius:  '4px',
              padding:       '1px 5px',
              verticalAlign: 'middle',
            }}>
              HEVC/WASM
            </span>
          )}
        </div>

        {isSeries && (
          <button
            onClick={() => setShowEpisodeDrawer(true)}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '8px',
              color:          'var(--brand-gold)',
              fontSize:       '14px',
              fontWeight:     700,
              padding:        '8px 16px',
              borderRadius:   '9999px',
              backgroundColor:'rgba(245, 166, 35, 0.15)',
              border:         '1px solid rgba(245, 166, 35, 0.4)',
            }}
          >
            <ListVideo size={18} />
            <span>Episodes</span>
          </button>
        )}
      </div>

      {/* ── Center Big Play Button ─────────────────────────────────────── */}
      {!isEmbed && !isPlaying && (
        <div
          onClick={togglePlay}
          style={{
            position:        'absolute',
            width:           '80px',
            height:          '80px',
            borderRadius:    '50%',
            backgroundColor: 'var(--brand-gold)',
            color:           '#0E0E12',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            boxShadow:       '0 0 30px rgba(245, 166, 35, 0.5)',
            cursor:          'pointer',
            zIndex:          5,
            transition:      'transform 0.15s ease',
          }}
        >
          <Play size={36} fill="#0E0E12" style={{ marginLeft: '4px' }} />
        </div>
      )}

      {/* ── Bottom Controls Bar ────────────────────────────────────────── */}
      {!isEmbed && (
        <div
          style={{
            position:      'absolute',
            bottom: 0, left: 0, right: 0,
            padding:       '24px 28px 30px',
            background:    'linear-gradient(0deg, rgba(0,0,0,0.92) 0%, transparent 100%)',
            zIndex:        10,
            opacity:       showControls ? 1 : 0,
            transition:    'opacity 0.3s ease',
            pointerEvents: showControls ? 'auto' : 'none',
          }}
        >
          {/* Seekbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
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
                flex:         1,
                height:       '5px',
                borderRadius: '9999px',
                accentColor:  'var(--brand-gold)',
                cursor:       'pointer',
              }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '46px', textAlign: 'right' }}>
              {formatSeconds(duration)}
            </span>
          </div>

          {/* Action Controls Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <button onClick={togglePlay} style={{ color: '#FFFFFF' }} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={24} /> : <Play size={24} fill="#FFFFFF" />}
              </button>
              <button onClick={() => skipTime(-10)} style={{ color: 'var(--text-secondary)' }} title="Rewind 10s">
                <RotateCcw size={20} />
              </button>
              <button onClick={() => skipTime(10)} style={{ color: 'var(--text-secondary)' }} title="Forward 10s">
                <RotateCw size={20} />
              </button>
              {nextEp && (
                <button
                  onClick={() => handleSwitchEpisode(nextEp)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-gold)', fontSize: '13px', fontWeight: 700 }}
                >
                  <SkipForward size={18} />
                  <span>Next Episode</span>
                </button>
              )}
              {/* Volume */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
                <button onClick={toggleMute} style={{ color: '#FFFFFF' }}>
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  style={{ width: '70px', height: '4px', accentColor: 'var(--brand-gold)', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={toggleFullscreen} style={{ color: '#FFFFFF' }} aria-label="Toggle Fullscreen">
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Series Episode Drawer ──────────────────────────────────────── */}
      {isSeries && showEpisodeDrawer && activePlayerContent.seasons && (
        <div
          style={{
            position:        'absolute',
            top: 0, bottom: 0, right: 0,
            width:           'clamp(300px, 85vw, 420px)',
            backgroundColor: 'rgba(14, 14, 20, 0.96)',
            backdropFilter:  'blur(20px)',
            borderLeft:      '1px solid rgba(255, 255, 255, 0.1)',
            zIndex:          100,
            display:         'flex',
            flexDirection:   'column',
            padding:         '24px 20px',
            animation:       'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>Select Episode</h3>
            <button onClick={() => setShowEpisodeDrawer(false)} style={{ color: 'var(--text-secondary)' }}>
              <X size={22} />
            </button>
          </div>

          {/* Season pills */}
          {activePlayerContent.seasons.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              {activePlayerContent.seasons.map((season, idx) => (
                <button
                  key={season.seasonNumber}
                  onClick={() => setSelectedSeasonIndex(idx)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 700, border: 'none',
                    backgroundColor: selectedSeasonIndex === idx ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.08)',
                    color:           selectedSeasonIndex === idx ? '#0E0E12' : '#FFFFFF',
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
              return (
                <div
                  key={ep.id}
                  onClick={() => handleSwitchEpisode(ep)}
                  style={{
                    display:         'flex',
                    gap:             '12px',
                    padding:         '10px',
                    borderRadius:    '12px',
                    backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border:          `1px solid ${isSelected ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.06)'}`,
                    cursor:          'pointer',
                    alignItems:      'center',
                  }}
                >
                  <img
                    src={ep.thumbnailUrl}
                    alt={ep.title}
                    style={{ width: '80px', height: '48px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold)' }}>
                      EPISODE {ep.episodeNumber}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

      {/* Spinner keyframe (injected once) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

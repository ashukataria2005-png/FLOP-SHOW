import React, { useRef, useState, useEffect, useCallback } from 'react';
import { formatSeconds } from '../../utils/formatters';
import { parseYouTubeUrl } from '../../utils/mediaUrl';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
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
  Loader2
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
}

interface MediaPlayerProps {
  source: MediaPlayerSource | null;
  onClose: () => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  source,
  onClose,
  onNextEpisode,
  hasNextEpisode
}) => {
  const { saveWatchProgress } = useApp();

  const videoRef = useRef<HTMLVideoElement>(null);
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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!source) return null;

  // Determine if source is YouTube
  const youtubeInfo = parseYouTubeUrl(source.url);
  const isYouTube = youtubeInfo.isYouTube;

  // Sync watch progress to backend & local context
  const recordProgress = useCallback((curTime: number, durTime: number) => {
    if (!source.contentId || source.mediaType === 'TRAILER' || durTime <= 0) return;

    const percent = Math.min(100, Math.round((curTime / durTime) * 100));

    // Save to local context & storage
    saveWatchProgress({
      contentId: source.contentId,
      contentType: source.episodeId ? 'series' : 'movie',
      title: source.title,
      posterUrl: source.poster || '',
      percent,
      currentTime: Math.round(curTime),
      duration: Math.round(durTime),
      episodeId: source.episodeId
    });

    // Save to backend database API
    api.library.saveProgress({
      contentId: source.contentId,
      episodeId: source.episodeId,
      progressPercent: percent,
      currentTimeSeconds: Math.round(curTime),
      durationSeconds: Math.round(durTime)
    }).catch(() => {
      // Background sync, suppress transient offline errors
    });
  }, [source, saveWatchProgress]);

  // Initial setup & progress restore
  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentTime(source.initialTimeSeconds || 0);

    if (isYouTube) {
      setIsLoading(false);
      return;
    }

    // Set initial video seek if resuming
    if (videoRef.current && source.initialTimeSeconds && source.initialTimeSeconds > 5) {
      videoRef.current.currentTime = source.initialTimeSeconds;
    }
  }, [source.url, source.initialTimeSeconds, isYouTube]);

  // Periodic watch progress interval (every 5 seconds)
  useEffect(() => {
    if (!isYouTube && isPlaying) {
      progressIntervalRef.current = window.setInterval(() => {
        if (videoRef.current) {
          recordProgress(videoRef.current.currentTime, videoRef.current.duration);
        }
      }, 5000);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, isYouTube, recordProgress]);

  // Save progress on unmount / close
  useEffect(() => {
    return () => {
      if (videoRef.current && !isYouTube) {
        recordProgress(videoRef.current.currentTime, videoRef.current.duration);
      }
    };
  }, [isYouTube, recordProgress]);

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
        setErrorMessage('Unable to play video: ' + (err.message || 'playback error'));
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || source.durationSeconds || 1;
    setCurrentTime(cur);
    setDuration(dur);
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
          <video
            ref={videoRef}
            src={source.url}
            poster={source.poster}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              setIsLoading(false);
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
                if (source.initialTimeSeconds && source.initialTimeSeconds > 5) {
                  videoRef.current.currentTime = source.initialTimeSeconds;
                }
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
              }
            }}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setErrorMessage('Failed to load video file. The URL may be unreachable or invalid.');
            }}
            onClick={togglePlay}
            onEnded={() => {
              setIsPlaying(false);
              if (duration > 0) recordProgress(duration, duration);
              if (hasNextEpisode && onNextEpisode) {
                onNextEpisode();
              }
            }}
            playsInline
          />

          {/* Large Center Play Trigger */}
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
                zIndex: 5,
                transition: 'transform 0.15s ease'
              }}
            >
              <Play size={36} fill="#0E0E12" style={{ marginLeft: '4px' }} />
            </div>
          )}
        </>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            zIndex: 15,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            color: '#FFFFFF'
          }}
        >
          <Loader2 size={44} className="spin" color="var(--brand-gold, #F5C518)" />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading media...</span>
        </div>
      )}

      {/* Error State Overlay */}
      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            zIndex: 20,
            maxWidth: '480px',
            padding: '24px',
            backgroundColor: 'rgba(22, 22, 34, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            textAlign: 'center',
            color: '#FFFFFF',
            boxShadow: '0 12px 36px rgba(0,0,0,0.8)'
          }}
        >
          <AlertCircle size={40} color="#EF4444" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Playback Notice</h4>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #9CA3AF)', marginBottom: '18px', lineHeight: 1.5 }}>
            {errorMessage}
          </p>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 24px',
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

        <div style={{ width: '80px' }} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <button
                onClick={togglePlay}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} fill="#FFFFFF" />}
              </button>

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

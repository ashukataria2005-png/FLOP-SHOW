import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Episode } from '../../types/content';
import { formatSeconds } from '../../utils/formatters';
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

export const VideoPlayer: React.FC = () => {
  const {
    activePlayerContent,
    activeEpisode,
    startPlaying,
    closePlayer,
    getProgress,
    saveWatchProgress
  } = useApp();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);

  if (!activePlayerContent) return null;

  const isSeries = activePlayerContent.type === 'series';
  const currentVideoSrc = isSeries
    ? (activeEpisode?.videoUrl || activePlayerContent.seasons?.[0]?.episodes[0]?.videoUrl)
    : activePlayerContent.videoUrl;

  // On mount / item change, check if there was previous progress to resume
  useEffect(() => {
    const existing = getProgress(activePlayerContent.id);
    if (existing && existing.currentTime > 5 && videoRef.current) {
      videoRef.current.currentTime = existing.currentTime;
    }
  }, [activePlayerContent.id, activeEpisode?.id]);

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
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(cur);
    setDuration(dur);

    const percent = Math.round((cur / dur) * 100);

    // Save progress to global state & localStorage
    saveWatchProgress({
      contentId: activePlayerContent.id,
      contentType: activePlayerContent.type,
      title: activePlayerContent.title,
      posterUrl: activePlayerContent.posterUrl,
      percent,
      currentTime: cur,
      duration: dur,
      episodeId: activeEpisode?.id,
      seasonNumber: activeEpisode?.seasonNumber,
      episodeNumber: activeEpisode?.episodeNumber
    });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTo = (parseFloat(e.target.value) / 100) * duration;
    videoRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
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

  // Find next episode if in a series
  const findNextEpisode = (): Episode | null => {
    if (!isSeries || !activePlayerContent.seasons || !activeEpisode) return null;
    const currentSeason = activePlayerContent.seasons.find(s => s.seasonNumber === activeEpisode.seasonNumber);
    if (!currentSeason) return null;

    const currentIndex = currentSeason.episodes.findIndex(e => e.id === activeEpisode.id);
    if (currentIndex < currentSeason.episodes.length - 1) {
      return currentSeason.episodes[currentIndex + 1];
    }

    // Try next season
    const nextSeason = activePlayerContent.seasons.find(s => s.seasonNumber === activeEpisode.seasonNumber + 1);
    if (nextSeason && nextSeason.episodes.length > 0) {
      return nextSeason.episodes[0];
    }

    return null;
  };

  const nextEp = findNextEpisode();

  const handleSwitchEpisode = (ep: Episode) => {
    startPlaying(activePlayerContent, ep);
    setShowEpisodeDrawer(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={currentVideoSrc}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          }
        }}
        onClick={togglePlay}
        onEnded={() => {
          setIsPlaying(false);
          if (nextEp) handleSwitchEpisode(nextEp);
        }}
        playsInline
      />

      {/* Top Header Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '20px 24px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none'
        }}
      >
        <button
          onClick={closePlayer}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            transition: 'background-color 0.2s'
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
        </div>

        {isSeries && (
          <button
            onClick={() => setShowEpisodeDrawer(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--brand-gold)',
              fontSize: '14px',
              fontWeight: 700,
              padding: '8px 16px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(245, 166, 35, 0.15)',
              border: '1px solid rgba(245, 166, 35, 0.4)'
            }}
          >
            <ListVideo size={18} />
            <span>Episodes</span>
          </button>
        )}
      </div>

      {/* Center Play/Pause Large Trigger on Click */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand-gold)',
            color: '#0E0E12',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(245, 166, 35, 0.5)',
            cursor: 'pointer',
            zIndex: 5,
            transition: 'transform 0.15s ease'
          }}
        >
          <Play size={36} fill="#0E0E12" style={{ marginLeft: '4px' }} />
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 28px 30px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.92) 0%, transparent 100%)',
          zIndex: 10,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none'
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
              flex: 1,
              height: '5px',
              borderRadius: '9999px',
              accentColor: 'var(--brand-gold)',
              cursor: 'pointer'
            }}
          />

          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '46px', textAlign: 'right' }}>
            {formatSeconds(duration)}
          </span>
        </div>

        {/* Action Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left Controls */}
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--brand-gold)',
                  fontSize: '13px',
                  fontWeight: 700
                }}
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
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{ width: '70px', height: '4px', accentColor: 'var(--brand-gold)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={toggleFullscreen} style={{ color: '#FFFFFF' }} aria-label="Toggle Fullscreen">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Series Episode Drawer */}
      {isSeries && showEpisodeDrawer && activePlayerContent.seasons && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 'clamp(300px, 85vw, 420px)',
            backgroundColor: 'rgba(14, 14, 20, 0.96)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>Select Episode</h3>
            <button onClick={() => setShowEpisodeDrawer(false)} style={{ color: 'var(--text-secondary)' }}>
              <X size={22} />
            </button>
          </div>

          {/* Season Switcher Pills */}
          {activePlayerContent.seasons.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              {activePlayerContent.seasons.map((season, idx) => (
                <button
                  key={season.seasonNumber}
                  onClick={() => setSelectedSeasonIndex(idx)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: selectedSeasonIndex === idx ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.08)',
                    color: selectedSeasonIndex === idx ? '#0E0E12' : '#FFFFFF',
                    border: 'none'
                  }}
                >
                  Season {season.seasonNumber}
                </button>
              ))}
            </div>
          )}

          {/* Episodes List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activePlayerContent.seasons[selectedSeasonIndex]?.episodes.map(ep => {
              const isSelected = activeEpisode?.id === ep.id;
              return (
                <div
                  key={ep.id}
                  onClick={() => handleSwitchEpisode(ep)}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '10px',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${isSelected ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.06)'}`,
                    cursor: 'pointer',
                    alignItems: 'center'
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
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#FFFFFF',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
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

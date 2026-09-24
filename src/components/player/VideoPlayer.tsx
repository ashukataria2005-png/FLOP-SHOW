import React, { useRef, useState, useEffect } from 'react';
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
  X,
  AlertTriangle,
} from 'lucide-react';

export const VideoPlayer: React.FC = () => {
  const {
    activePlayerContent,
    activeEpisode,
    startPlaying,
    closePlayer,
    getProgress,
    saveWatchProgress,
  } = useApp();

  const videoRef          = useRef<HTMLVideoElement>(null);
  const containerRef      = useRef<HTMLDivElement>(null);
  const controlsTimerRef  = useRef<number | null>(null);

  const [isPlaying,           setIsPlaying]           = useState(false);
  const [currentTime,         setCurrentTime]         = useState(0);
  const [duration,            setDuration]            = useState(0);
  const [volume,              setVolume]              = useState(1);
  const [isMuted,             setIsMuted]             = useState(false);
  const [isFullscreen,        setIsFullscreen]        = useState(false);
  const [showControls,        setShowControls]        = useState(true);
  const [showEpisodeDrawer,   setShowEpisodeDrawer]   = useState(false);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  /** Set when the video element fires an error or produces no decoded frames */
  const [codecError,          setCodecError]          = useState(false);

  if (!activePlayerContent) return null;

  const isSeries = activePlayerContent.type === 'series';
  const currentVideoSrc = isSeries
    ? (activeEpisode?.videoUrl || activePlayerContent.seasons?.[0]?.episodes[0]?.videoUrl)
    : activePlayerContent.videoUrl;

  const embedInfo = parseEmbedUrl(currentVideoSrc || '');
  const isEmbed   = embedInfo.isEmbed;

  // ── Restore watch-progress on mount / content change ─────────────────────
  useEffect(() => {
    setCodecError(false);           // reset error when source changes
    const existing = getProgress(activePlayerContent.id);
    if (existing && existing.currentTime > 5 && videoRef.current) {
      videoRef.current.currentTime = existing.currentTime;
    }
  }, [activePlayerContent.id, activeEpisode?.id]);

  // ── Controls idle-hide ────────────────────────────────────────────────────
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
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
      contentId:     activePlayerContent.id,
      contentType:   activePlayerContent.type,
      title:         activePlayerContent.title,
      posterUrl:     activePlayerContent.posterUrl,
      percent:       Math.round((cur / dur) * 100),
      currentTime:   cur,
      duration:      dur,
      episodeId:     activeEpisode?.id,
      seasonNumber:  activeEpisode?.seasonNumber,
      episodeNumber: activeEpisode?.episodeNumber,
    });
  };

  // ── Metadata loaded ───────────────────────────────────────────────────────
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);

    // videoWidth === 0 means the browser received an audio track only —
    // the video codec (typically HEVC/x265) could not be decoded natively.
    if (videoRef.current.videoWidth === 0) {
      setCodecError(true);
      return;
    }

    videoRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  // ── Video element error ───────────────────────────────────────────────────
  const handleVideoError = () => setCodecError(true);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTo = (parseFloat(e.target.value) / 100) * duration;
    videoRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  // ── Skip ──────────────────────────────────────────────────────────────────
  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(duration, videoRef.current.currentTime + seconds),
    );
  };

  // ── Mute / Volume ─────────────────────────────────────────────────────────
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
    videoRef.current.muted  = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
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

  // ── Series: find next episode ─────────────────────────────────────────────
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
        backgroundColor: '#000',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        userSelect:      'none',
      }}
    >
      {/* ── Iframe for embed / Streamtape sources ─────────────────────── */}
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
        /* ── 16:9 responsive video wrapper ──────────────────────────── */
        <div
          style={{
            position:        'relative',
            width:           '100%',
            maxWidth:        '100%',
            aspectRatio:     '16 / 9',
            backgroundColor: '#000',
            overflow:        'hidden',
          }}
        >
          {/* Poster — visible until playback starts */}
          {activePlayerContent.posterUrl && !isPlaying && !codecError && (
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

          {/* Codec-unsupported overlay */}
          {codecError && (
            <div
              style={{
                position:        'absolute',
                inset:           0,
                zIndex:          10,
                display:         'flex',
                flexDirection:   'column',
                alignItems:      'center',
                justifyContent:  'center',
                backgroundColor: 'rgba(0, 0, 0, 0.88)',
                padding:         '28px',
                gap:             '16px',
                textAlign:       'center',
              }}
            >
              <AlertTriangle
                size={48}
                color="#F5A623"
                strokeWidth={1.5}
              />
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                Codec not supported
              </p>
              <p
                style={{
                  fontSize:   '14px',
                  color:      'rgba(255,255,255,0.65)',
                  margin:     0,
                  lineHeight: 1.6,
                  maxWidth:   '360px',
                }}
              >
                This browser requires <strong style={{ color: '#fff' }}>H.264 (MP4)</strong> video.
                HEVC / x265 files cannot be decoded directly. Please use Chrome, Edge, or Safari
                on a supported device.
              </p>
            </div>
          )}

          {/* Native HTML5 video */}
          <video
            ref={videoRef}
            src={currentVideoSrc}
            style={{
              width:     '100%',
              height:    '100%',
              objectFit: 'contain',
              display:   'block',
              position:  'relative',
              zIndex:    2,
            }}
            preload="metadata"
            playsInline
            // @ts-ignore — non-standard webkit attr for iOS Safari inline playback
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

      {/* ── Top Header Bar ──────────────────────────────────────────────── */}
      <div
        style={{
          position:       'absolute',
          top: 0, left: 0, right: 0,
          padding:        '20px 24px',
          background:     'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          zIndex:         20,
          opacity:        (showControls || isEmbed) ? 1 : 0,
          transition:     'opacity 0.3s ease',
          pointerEvents:  (showControls || isEmbed) ? 'auto' : 'none',
        }}
      >
        <button
          onClick={closePlayer}
          style={{
            display:         'flex',
            alignItems:      'center',
            gap:             '8px',
            color:           '#FFF',
            fontSize:        '15px',
            fontWeight:      600,
            padding:         '8px 14px',
            borderRadius:    '9999px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter:  'blur(8px)',
            transition:      'background-color 0.2s',
          }}
        >
          <ArrowLeft size={18} />
          <span>Back to browse</span>
        </button>

        <div style={{ textAlign: 'center', flex: 1, padding: '0 16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFF' }}>
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
              display:         'flex',
              alignItems:      'center',
              gap:             '8px',
              color:           'var(--brand-gold)',
              fontSize:        '14px',
              fontWeight:      700,
              padding:         '8px 16px',
              borderRadius:    '9999px',
              backgroundColor: 'rgba(245,166,35,0.15)',
              border:          '1px solid rgba(245,166,35,0.4)',
            }}
          >
            <ListVideo size={18} />
            <span>Episodes</span>
          </button>
        )}
      </div>

      {/* ── Centre big play button ───────────────────────────────────────── */}
      {!isEmbed && !isPlaying && !codecError && (
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
            boxShadow:       '0 0 30px rgba(245,166,35,0.5)',
            cursor:          'pointer',
            zIndex:          5,
            transition:      'transform 0.15s ease',
          }}
        >
          <Play size={36} fill="#0E0E12" style={{ marginLeft: '4px' }} />
        </div>
      )}

      {/* ── Bottom Controls Bar ──────────────────────────────────────────── */}
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
            <span style={{ fontSize: '13px', color: '#FFF', fontWeight: 600, minWidth: '46px' }}>
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

          {/* Action row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <button onClick={togglePlay} style={{ color: '#FFF' }} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={24} /> : <Play size={24} fill="#FFF" />}
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
                <button onClick={toggleMute} style={{ color: '#FFF' }}>
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

            {/* Right controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={toggleFullscreen} style={{ color: '#FFF' }} aria-label="Toggle Fullscreen">
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Series Episode Drawer ────────────────────────────────────────── */}
      {isSeries && showEpisodeDrawer && activePlayerContent.seasons && (
        <div
          style={{
            position:        'absolute',
            top: 0, bottom: 0, right: 0,
            width:           'clamp(300px, 85vw, 420px)',
            backgroundColor: 'rgba(14,14,20,0.96)',
            backdropFilter:  'blur(20px)',
            borderLeft:      '1px solid rgba(255,255,255,0.1)',
            zIndex:          100,
            display:         'flex',
            flexDirection:   'column',
            padding:         '24px 20px',
            animation:       'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF' }}>Select Episode</h3>
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
                    flex:            1,
                    padding:         '8px 12px',
                    borderRadius:    '8px',
                    fontSize:        '13px',
                    fontWeight:      700,
                    border:          'none',
                    backgroundColor: selectedSeasonIndex === idx ? 'var(--brand-gold)' : 'rgba(255,255,255,0.08)',
                    color:           selectedSeasonIndex === idx ? '#0E0E12' : '#FFF',
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
                    backgroundColor: isSelected ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.04)',
                    border:          `1px solid ${isSelected ? 'var(--brand-gold)' : 'rgba(255,255,255,0.06)'}`,
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

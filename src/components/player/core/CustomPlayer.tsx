import React, { useRef, useEffect, useCallback } from 'react';
import { MediaItem } from '../../../types/mediaPlayer';
import { useHlsPlayer } from '../hooks/useHlsPlayer';
import { mediaPlayerService } from '../../../services/mediaPlayerService';
import { PlayerControls } from './PlayerControls';
import { PlayerOverlay } from './PlayerOverlay';
import { useMediaPlayerState } from '../hooks/useMediaPlayerState';

interface CustomPlayerProps {
  media: MediaItem;
  onClose?: () => void;
  onEnded?: () => void;
}

export const CustomPlayer: React.FC<CustomPlayerProps> = ({
  media,
  onClose,
  onEnded
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const initialResumeRef = useRef<boolean>(false);

  const initialResumeTime = mediaPlayerService.getResumeTimestamp(media.id);

  const {
    containerRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    bufferedTime,
    setBufferedTime,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    showControls,
    showControlsTemporarily,
    isFullscreen,
    toggleFullscreen,
    isLoading,
    setIsLoading,
    isBuffering,
    setIsBuffering,
    errorMessage,
    setErrorMessage,
    handleProgressTime
  } = useMediaPlayerState({
    mediaId: media.id,
    duration: media.duration_seconds,
    initialTimeSeconds: initialResumeTime
  });

  const isHls = media.stream_type === 'hls' || media.source_url.includes('.m3u8');

  // Handle errors from HLS engine or HTML5 video
  const handlePlayerError = useCallback((msg: string) => {
    setIsLoading(false);
    setIsBuffering(false);
    setIsPlaying(false);
    setErrorMessage(msg);
  }, [setIsLoading, setIsBuffering, setIsPlaying, setErrorMessage]);

  // Hook up Hls.js
  const {
    qualities,
    currentQuality,
    setQuality
  } = useHlsPlayer({
    sourceUrl: media.source_url,
    isHls,
    videoRef,
    onError: handlePlayerError,
    onLoadedMetadata: () => {
      if (videoRef.current) {
        setDuration(videoRef.current.duration || media.duration_seconds || 0);
      }
    }
  });

  // Direct MP4 setup (when not HLS)
  useEffect(() => {
    if (!isHls && videoRef.current) {
      videoRef.current.src = media.source_url;
      videoRef.current.load();
    }
  }, [media.source_url, isHls]);

  // Apply volume & mute on video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Seek to saved resume timestamp once metadata is loaded
  const applyResumeTime = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || initialResumeRef.current) return;

    if (initialResumeTime > 3 && initialResumeTime < (vid.duration - 10)) {
      try {
        vid.currentTime = initialResumeTime;
        setCurrentTime(initialResumeTime);
        initialResumeRef.current = true;
      } catch (e) {
        console.warn('[CustomPlayer] Resume seek failed:', e);
      }
    } else {
      initialResumeRef.current = true;
    }
  }, [initialResumeTime, setCurrentTime]);

  // Toggle Play/Pause
  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      vid.play()
        .then(() => {
          setIsPlaying(true);
          setErrorMessage(null);
        })
        .catch((err) => {
          if (err?.name === 'NotAllowedError') {
            setIsPlaying(false);
          } else {
            handlePlayerError('Unable to start playback: ' + (err?.message || 'autoplay blocked'));
          }
        });
    }
  }, [isPlaying, handlePlayerError, setIsPlaying, setErrorMessage]);

  // Direct seek
  const handleSeek = useCallback((targetSeconds: number) => {
    const vid = videoRef.current;
    if (!vid) return;

    const clamped = Math.max(0, Math.min(duration, targetSeconds));
    vid.currentTime = clamped;
    setCurrentTime(clamped);
    handleProgressTime(clamped, duration);
  }, [duration, handleProgressTime, setCurrentTime]);

  // Skip time (+/- seconds)
  const handleSkipTime = useCallback((delta: number) => {
    const vid = videoRef.current;
    if (!vid) return;

    const target = Math.max(0, Math.min(duration, vid.currentTime + delta));
    vid.currentTime = target;
    setCurrentTime(target);
    handleProgressTime(target, duration);
  }, [duration, handleProgressTime, setCurrentTime]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setIsLoading(true);
    setIsBuffering(false);

    const vid = videoRef.current;
    if (!vid) return;

    if (!isHls) {
      vid.src = media.source_url;
      vid.load();
    }
    vid.play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        if (err?.name !== 'NotAllowedError') {
          handlePlayerError('Retry failed: ' + err.message);
        }
      });
  }, [isHls, media.source_url, handlePlayerError, setIsLoading, setIsBuffering, setIsPlaying, setErrorMessage]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        overflow: 'hidden',
        cursor: showControls ? 'default' : 'none'
      }}
      onMouseMove={showControlsTemporarily}
      onClick={showControlsTemporarily}
    >
      {/* Native HTML5 Video Element */}
      <video
        ref={videoRef}
        poster={media.backdrop_url || media.poster_url}
        playsInline
        preload="auto"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          zIndex: 1
        }}
        onClick={togglePlay}
        onTimeUpdate={() => {
          if (!videoRef.current) return;
          const cur = videoRef.current.currentTime;
          const dur = videoRef.current.duration || duration || 0;
          handleProgressTime(cur, dur);

          // Calculate buffer level
          if (videoRef.current.buffered.length > 0) {
            for (let i = 0; i < videoRef.current.buffered.length; i++) {
              if (
                videoRef.current.buffered.start(i) <= cur &&
                cur <= videoRef.current.buffered.end(i)
              ) {
                setBufferedTime(videoRef.current.buffered.end(i));
                break;
              }
            }
          }
        }}
        onLoadedMetadata={() => {
          if (!videoRef.current) return;
          setDuration(videoRef.current.duration || media.duration_seconds || 0);
          applyResumeTime();
          setIsLoading(false);
          setIsBuffering(false);
        }}
        onCanPlay={() => {
          applyResumeTime();
          setIsLoading(false);
          setIsBuffering(false);
        }}
        onWaiting={() => {
          if (!isLoading) setIsBuffering(true);
        }}
        onPlaying={() => {
          setIsLoading(false);
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => {
          setIsPlaying(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          mediaPlayerService.clearResumeTimestamp(media.id);
          if (onEnded) onEnded();
        }}
        onError={() => {
          const err = videoRef.current?.error;
          let message = 'Video stream failed to load.';
          if (err) {
            if (err.code === 2) message = 'Network error while loading video. Please check connection.';
            else if (err.code === 3) message = 'Video decode error or corrupt stream.';
            else if (err.code === 4) message = 'The video format is unsupported or source not found.';
          }
          handlePlayerError(message);
        }}
      />

      {/* Unified Overlay (Header bar, Loading state, Play trigger, Error notices) */}
      <PlayerOverlay
        title={media.title}
        category={media.category}
        badge={media.badge}
        streamType={media.stream_type}
        showControls={showControls}
        isPlaying={isPlaying}
        isLoading={isLoading}
        isBuffering={isBuffering}
        errorMessage={errorMessage}
        onClose={onClose}
        onTogglePlay={togglePlay}
        onRetry={handleRetry}
      />

      {/* Unified Player Controls Bar */}
      <PlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        bufferedTime={bufferedTime}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        visible={showControls}
        qualities={isHls ? qualities : []}
        currentQuality={currentQuality}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        onSkipTime={handleSkipTime}
        onVolumeChange={setVolume}
        onToggleMute={toggleMute}
        onToggleFullscreen={toggleFullscreen}
        onSelectQuality={isHls ? setQuality : undefined}
      />
    </div>
  );
};

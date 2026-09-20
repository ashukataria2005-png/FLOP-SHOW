import { useState, useEffect, useRef, useCallback } from 'react';
import { mediaPlayerService } from '../../../services/mediaPlayerService';

interface UseMediaPlayerStateOptions {
  mediaId: string;
  duration?: number;
  initialTimeSeconds?: number;
  onTimeUpdateCallback?: (currentTime: number, duration: number) => void;
}

export function useMediaPlayerState({
  mediaId,
  duration: explicitDuration,
  initialTimeSeconds = 0,
  onTimeUpdateCallback
}: UseMediaPlayerStateOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const lastSavedTimeRef = useRef<number>(0);

  // Playback States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(initialTimeSeconds);
  const [duration, setDuration] = useState<number>(explicitDuration || 0);
  const [bufferedTime, setBufferedTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  // Audio States (hydrated from localStorage)
  const [volume, setVolumeState] = useState<number>(() => mediaPlayerService.getSavedVolume());
  const [isMuted, setIsMutedState] = useState<boolean>(() => mediaPlayerService.getSavedMuted());

  // UI States
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update volume and persist
  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
    mediaPlayerService.saveVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMutedState(false);
      mediaPlayerService.saveMuted(false);
    }
  }, [isMuted]);

  // Toggle mute and persist
  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => {
      const next = !prev;
      mediaPlayerService.saveMuted(next);
      return next;
    });
  }, []);

  // Controls visibility auto-hide on idle
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  }, [isPlaying]);

  // Fullscreen management
  const toggleFullscreen = useCallback(async () => {
    const elem = containerRef.current;
    if (!elem) return;

    try {
      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('[MediaPlayer] Fullscreen toggle error:', err);
    }
  }, []);

  // Track fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Sync resume playback state (throttled save to localStorage every 4s)
  const handleProgressTime = useCallback((curTime: number, dur: number) => {
    setCurrentTime(curTime);
    if (dur > 0) setDuration(dur);

    if (onTimeUpdateCallback) {
      onTimeUpdateCallback(curTime, dur);
    }

    if (Math.abs(curTime - lastSavedTimeRef.current) >= 4) {
      lastSavedTimeRef.current = curTime;
      mediaPlayerService.saveResumeTimestamp(mediaId, curTime, dur);
    }
  }, [mediaId, onTimeUpdateCallback]);

  // Save on component unmount or page hide
  useEffect(() => {
    const handleExit = () => {
      if (lastSavedTimeRef.current > 3) {
        mediaPlayerService.saveResumeTimestamp(mediaId, lastSavedTimeRef.current, duration);
      }
    };
    window.addEventListener('beforeunload', handleExit);
    window.addEventListener('pagehide', handleExit);
    return () => {
      handleExit();
      window.removeEventListener('beforeunload', handleExit);
      window.removeEventListener('pagehide', handleExit);
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [mediaId, duration]);

  return {
    containerRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    bufferedTime,
    setBufferedTime,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    showControls,
    setShowControls,
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
  };
}

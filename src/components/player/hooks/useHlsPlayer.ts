import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { QualityLevel } from '../../../types/mediaPlayer';

interface UseHlsPlayerOptions {
  sourceUrl: string;
  isHls: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onError: (errorMessage: string) => void;
  onLoadedMetadata?: () => void;
}

export function useHlsPlayer({
  sourceUrl,
  isHls,
  videoRef,
  onError,
  onLoadedMetadata
}: UseHlsPlayerOptions) {
  const hlsRef = useRef<Hls | null>(null);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto

  // Quality switcher function
  const setQuality = useCallback((qualityIndex: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = qualityIndex;
    setCurrentQuality(qualityIndex);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sourceUrl || !isHls) return;

    // Destroy any existing HLS instance before initializing a new one
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        autoStartLoad: true
      });

      hlsRef.current = hls;

      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(sourceUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const parsedQualities: QualityLevel[] = [
          { id: -1, label: 'Auto' }
        ];

        if (data.levels && data.levels.length > 0) {
          data.levels.forEach((lvl, idx) => {
            const height = lvl.height || 0;
            let label = height ? `${height}p` : `Stream ${idx + 1}`;
            if (lvl.bitrate) {
              const kbps = Math.round(lvl.bitrate / 1000);
              label += ` (${kbps}k)`;
            }
            parsedQualities.push({
              id: idx,
              label,
              height: lvl.height,
              width: lvl.width,
              bitrate: lvl.bitrate
            });
          });
        }

        setQualities(parsedQualities);
        setCurrentQuality(-1); // Default to Auto
        if (onLoadedMetadata) {
          onLoadedMetadata();
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        // Active level switched
        if (hls.autoLevelEnabled) {
          setCurrentQuality(-1);
        } else {
          setCurrentQuality(data.level);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS Engine] Fatal network error, attempting recovery...', data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS Engine] Fatal media error, attempting buffer recovery...', data);
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS Engine] Unrecoverable fatal error:', data);
              hls.destroy();
              hlsRef.current = null;
              onError('The adaptive HLS stream could not be loaded. Please check your network or try again.');
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
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS Native HLS support
      video.src = sourceUrl;
      setQualities([{ id: -1, label: 'Auto (Native)' }]);
      setCurrentQuality(-1);
    } else {
      onError('Your browser does not support HLS video streaming.');
    }
  }, [sourceUrl, isHls, videoRef, onError, onLoadedMetadata]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  return {
    qualities,
    currentQuality,
    setQuality,
    hlsInstance: hlsRef.current
  };
}

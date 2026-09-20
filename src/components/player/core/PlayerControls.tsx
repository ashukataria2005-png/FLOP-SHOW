import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize
} from 'lucide-react';
import { QualityLevel } from '../../../types/mediaPlayer';
import { QualitySelector } from './QualitySelector';
import { formatSeconds } from '../../../utils/formatters';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedTime?: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  visible: boolean;
  qualities?: QualityLevel[];
  currentQuality?: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSkipTime: (seconds: number) => void;
  onVolumeChange: (newVolume: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onSelectQuality?: (qualityId: number) => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  bufferedTime = 0,
  volume,
  isMuted,
  isFullscreen,
  visible,
  qualities = [],
  currentQuality = -1,
  onTogglePlay,
  onSeek,
  onSkipTime,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onSelectQuality
}) => {
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverPositionRatio, setHoverPositionRatio] = useState<number>(0);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (bufferedTime / duration) * 100) : 0;

  const handleSeekRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetSeconds = (parseFloat(e.target.value) / 100) * duration;
    onSeek(targetSeconds);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPositionRatio(ratio);
    setHoverSeekTime(ratio * duration);
  };

  const handleSeekMouseLeave = () => {
    setHoverSeekTime(null);
  };

  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX size={20} />;
    }
    if (volume < 0.5) {
      return <Volume1 size={20} />;
    }
    return <Volume2 size={20} />;
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '24px 24px 28px',
        background: 'linear-gradient(0deg, rgba(7, 9, 15, 0.96) 0%, rgba(7, 9, 15, 0.7) 60%, transparent 100%)',
        zIndex: 35,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: visible ? 'auto' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Interactive Scrub Bar with Buffered Line and Hover Preview */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          width: '100%'
        }}
        onMouseMove={handleSeekMouseMove}
        onMouseLeave={handleSeekMouseLeave}
      >
        <span
          style={{
            fontSize: '13px',
            color: '#FFFFFF',
            fontWeight: 700,
            minWidth: '44px',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {formatSeconds(currentTime)}
        </span>

        {/* Custom Progress Bar Container */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            height: '6px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          {/* Buffered track */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${bufferedPercent}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '9999px',
              transition: 'width 0.2s ease',
              pointerEvents: 'none'
            }}
          />

          {/* Played track */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${progressPercent}%`,
              backgroundColor: 'var(--brand-gold, #F5C518)',
              borderRadius: '9999px',
              pointerEvents: 'none'
            }}
          />

          {/* Native range input for accessible dragging */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progressPercent}
            onChange={handleSeekRangeChange}
            aria-label="Seek video position"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              opacity: 0,
              margin: 0,
              cursor: 'pointer',
              zIndex: 5
            }}
          />

          {/* Hover Time Tooltip */}
          {hoverSeekTime !== null && (
            <div
              style={{
                position: 'absolute',
                left: `${hoverPositionRatio * 100}%`,
                bottom: '16px',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap'
              }}
            >
              {formatSeconds(hoverSeekTime)}
            </div>
          )}
        </div>

        <span
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary, #9CA3AF)',
            fontWeight: 600,
            minWidth: '44px',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {formatSeconds(duration)}
        </span>
      </div>

      {/* Control Buttons Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Left Side: Playback & Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-gold, #F5C518)',
              border: 'none',
              color: '#0E0E12',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, background-color 0.2s',
              boxShadow: '0 2px 10px rgba(245, 197, 24, 0.4)'
            }}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={20} fill="#0E0E12" />
            ) : (
              <Play size={20} fill="#0E0E12" style={{ marginLeft: '2px' }} />
            )}
          </button>

          {/* Skip -10s */}
          <button
            onClick={() => onSkipTime(-10)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#FFFFFF',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            title="Rewind 10 seconds (←)"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw size={18} />
          </button>

          {/* Skip +10s */}
          <button
            onClick={() => onSkipTime(10)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#FFFFFF',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            title="Fast forward 10 seconds (→)"
            aria-label="Fast forward 10 seconds"
          >
            <RotateCw size={18} />
          </button>

          {/* Volume Container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              padding: '6px 12px',
              borderRadius: '9999px'
            }}
          >
            <button
              onClick={onToggleMute}
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0
              }}
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              aria-label="Volume Mute Toggle"
            >
              {renderVolumeIcon()}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              aria-label="Volume Slider"
              style={{
                width: '68px',
                height: '4px',
                accentColor: 'var(--brand-gold, #F5C518)',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* Right Side: Quality Selector & Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onSelectQuality && qualities.length > 0 && (
            <QualitySelector
              qualities={qualities}
              currentQuality={currentQuality}
              onSelectQuality={onSelectQuality}
            />
          )}

          {/* Fullscreen Button */}
          <button
            onClick={onToggleFullscreen}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#FFFFFF',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

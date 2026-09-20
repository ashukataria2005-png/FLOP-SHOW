import React from 'react';
import { ArrowLeft, Play, Loader2, AlertCircle } from 'lucide-react';
import { StreamType } from '../../../types/mediaPlayer';

interface PlayerOverlayProps {
  title: string;
  category?: string;
  badge?: string;
  streamType: StreamType;
  showControls: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  errorMessage: string | null;
  onClose?: () => void;
  onTogglePlay: () => void;
  onRetry: () => void;
}

export const PlayerOverlay: React.FC<PlayerOverlayProps> = ({
  title,
  category,
  badge,
  streamType,
  showControls,
  isPlaying,
  isLoading,
  isBuffering,
  errorMessage,
  onClose,
  onTogglePlay,
  onRetry
}) => {
  const streamBadgeColor = {
    hls: 'var(--brand-gold, #F5C518)',
    direct: '#10B981',
    embed: '#3B82F6'
  }[streamType];

  return (
    <>
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
          background: 'linear-gradient(180deg, rgba(7, 9, 15, 0.94) 0%, rgba(7, 9, 15, 0.5) 60%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: showControls ? 'auto' : 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onClose && (
            <button
              onClick={onClose}
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
                transition: 'background-color 0.2s ease'
              }}
              title="Close Player"
              aria-label="Back to browse"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: streamBadgeColor,
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: `1px solid ${streamBadgeColor}40`
                }}
              >
                {badge || streamType.toUpperCase()}
              </span>
              {category && (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary, #9CA3AF)' }}>
                  {category}
                </span>
              )}
            </div>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: '2px 0 0',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)'
              }}
            >
              {title}
            </h2>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* CENTER BIG PLAY BUTTON */}
      {/* -------------------------------------------------------------------- */}
      {!isPlaying && !isLoading && !isBuffering && !errorMessage && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand-gold, #F5C518)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(245, 197, 24, 0.6)',
            cursor: 'pointer',
            zIndex: 30,
            transition: 'transform 0.15s ease, background-color 0.2s',
            opacity: showControls ? 1 : 0.8
          }}
          title="Play"
          aria-label="Play video"
        >
          <Play size={40} fill="#0E0E12" color="#0E0E12" style={{ marginLeft: '4px' }} />
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* INITIAL COLD START LOADER */}
      {/* -------------------------------------------------------------------- */}
      {isLoading && !errorMessage && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 35,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            pointerEvents: 'none'
          }}
        >
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
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.04em' }}>
            Preparing stream...
          </span>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MID-STREAM BUFFERING SPINNER */}
      {/* -------------------------------------------------------------------- */}
      {isBuffering && !isLoading && !errorMessage && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 35,
            padding: '16px',
            borderRadius: '50%',
            backgroundColor: 'rgba(10, 12, 18, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            pointerEvents: 'none'
          }}
        >
          <Loader2 size={38} className="spin" color="var(--brand-gold, #F5C518)" />
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* ERROR FALLBACK OVERLAY */}
      {/* -------------------------------------------------------------------- */}
      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 50,
            maxWidth: '460px',
            width: '90%',
            padding: '30px 24px',
            backgroundColor: 'rgba(17, 19, 28, 0.97)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            textAlign: 'center',
            color: '#FFFFFF',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(16px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <AlertCircle size={44} color="#EF4444" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
            Playback Encountered an Issue
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary, #9CA3AF)',
              lineHeight: 1.5,
              margin: '0 0 22px'
            }}
          >
            {errorMessage}
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onRetry}
              style={{
                padding: '10px 22px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                borderRadius: '8px',
                color: '#0E0E12',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Retry Playback
            </button>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close Player
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

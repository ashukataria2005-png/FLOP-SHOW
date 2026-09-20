import React, { useEffect, useCallback } from 'react';
import { MediaItem } from '../../../types/mediaPlayer';
import { useMediaSource } from '../hooks/useMediaSource';
import { CustomPlayer } from './CustomPlayer';
import { EmbedPlayer } from './EmbedPlayer';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export interface MediaPlayerContainerProps {
  media?: MediaItem | null;
  mediaId?: string;
  onClose?: () => void;
  variant?: 'fullscreen-overlay' | 'inline-frame';
  enableUrlSync?: boolean;
}

export const MediaPlayerContainer: React.FC<MediaPlayerContainerProps> = ({
  media: explicitMedia,
  mediaId,
  onClose,
  variant = 'fullscreen-overlay',
  enableUrlSync = true
}) => {
  const {
    activeMedia,
    isLoadingMedia,
    mediaResolutionError,
    selectMediaById
  } = useMediaSource({
    initialMedia: explicitMedia,
    initialMediaId: mediaId,
    enableUrlSync
  });

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore keystrokes when typing inside inputs/textareas
    const activeEl = document.activeElement;
    if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) {
      return;
    }

    if (e.key === 'Escape' && onClose) {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const containerStyles: React.CSSProperties =
    variant === 'fullscreen-overlay'
      ? {
          position: 'fixed',
          inset: 0,
          zIndex: 2500,
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }
      : {
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#05070A',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        };

  // State 1: Resolving / loading media
  if (isLoadingMedia) {
    return (
      <div style={containerStyles}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: '#FFFFFF' }}>
          <Loader2 size={44} className="spin" color="var(--brand-gold, #F5C518)" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#D1D5DB' }}>
            Resolving media stream...
          </span>
        </div>
      </div>
    );
  }

  // State 2: Media Resolution Error
  if (mediaResolutionError || !activeMedia) {
    return (
      <div style={containerStyles}>
        <div
          style={{
            maxWidth: '440px',
            padding: '32px',
            backgroundColor: 'rgba(18, 20, 29, 0.96)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            textAlign: 'center',
            color: '#FFFFFF'
          }}
        >
          <AlertCircle size={44} color="#EF4444" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
            Media Unavailable
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #9CA3AF)', margin: '0 0 20px' }}>
            {mediaResolutionError || 'No valid media stream was specified.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => selectMediaById('hls-tears-of-steel')}
              style={{
                padding: '8px 18px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                color: '#0E0E12',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Load Default Stream
            </button>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  padding: '8px 18px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // State 3: Render either Embed mode or Custom player mode
  return (
    <div style={containerStyles}>
      {activeMedia.stream_type === 'embed' ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Top header bar for embed mode to allow close / details */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '16px 20px',
              background: 'linear-gradient(180deg, rgba(7, 9, 15, 0.9) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 30,
              pointerEvents: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {onClose && (
                <button
                  onClick={onClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
              )}
              <div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {activeMedia.badge || 'EMBED'}
                </span>
                <span style={{ marginLeft: '10px', color: '#FFFFFF', fontSize: '14px', fontWeight: 700 }}>
                  {activeMedia.title}
                </span>
              </div>
            </div>
          </div>

          <EmbedPlayer media={activeMedia} onClose={onClose} />
        </div>
      ) : (
        <CustomPlayer media={activeMedia} onClose={onClose} />
      )}
    </div>
  );
};

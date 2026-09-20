import React, { useState, useEffect } from 'react';
import { MediaItem } from '../../../types/mediaPlayer';
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

interface EmbedPlayerProps {
  media: MediaItem;
  onClose?: () => void;
}

export const EmbedPlayer: React.FC<EmbedPlayerProps> = ({ media, onClose }) => {
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);
  const [hasIframeError, setHasIframeError] = useState<boolean>(false);

  // Reset loading status whenever source URL changes
  useEffect(() => {
    setIsIframeLoading(true);
    setHasIframeError(false);
  }, [media.source_url]);

  const handleIframeLoad = () => {
    setIsIframeLoading(false);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        overflow: 'hidden'
      }}
    >
      {/* 16:9 Responsive Aspect Ratio Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1280px',
          aspectRatio: '16/9',
          maxHeight: '100%',
          margin: 'auto',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85)',
          backgroundColor: '#080A10'
        }}
      >
        {/* Loading Spinner for Embed */}
        {isIframeLoading && !hasIframeError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0B0D14',
              zIndex: 10,
              gap: '12px'
            }}
          >
            <Loader2 size={40} className="spin" color="var(--brand-gold, #F5C518)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#D1D5DB' }}>
              Loading external player...
            </span>
          </div>
        )}

        {/* Sandboxed Secure Iframe */}
        <iframe
          key={media.source_url}
          src={media.source_url}
          title={media.title}
          onLoad={handleIframeLoad}
          onError={() => setHasIframeError(true)}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />

        {/* Iframe Error Fallback */}
        {hasIframeError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              padding: '24px',
              textAlign: 'center'
            }}
          >
            <AlertTriangle size={40} color="#F59E0B" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>
              External Embed Could Not Be Embedded Directly
            </h4>
            <p style={{ fontSize: '13px', color: '#9CA3AF', maxWidth: '400px', margin: '0 0 16px' }}>
              Some providers restrict embedding in iframe sandboxes. You can open the stream directly in a new window.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href={media.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--brand-gold, #F5C518)',
                  color: '#0E0E12',
                  fontWeight: 700,
                  fontSize: '13px',
                  borderRadius: '6px',
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={14} />
                <span>Open in New Tab</span>
              </a>
              {onClose && (
                <button
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

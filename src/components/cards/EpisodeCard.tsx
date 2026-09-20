import React, { useState } from 'react';
import { Episode } from '../../types/content';
import { WatchProgress } from '../../types/user';
import { Play, Check } from 'lucide-react';

interface EpisodeCardProps {
  episode: Episode;
  seriesPosterUrl?: string;
  isCurrent?: boolean;
  progress?: WatchProgress;
  onPlay: (episode: Episode) => void;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  seriesPosterUrl,
  isCurrent,
  progress,
  onPlay
}) => {
  const [imgSrc, setImgSrc] = useState<string>(episode.thumbnailUrl || seriesPosterUrl || '');
  const [imgError, setImgError] = useState<boolean>(false);

  const isWatched = Boolean(progress && progress.percent >= 90);
  const hasProgress = Boolean(progress && progress.percent > 0 && progress.percent < 90);

  // Clean title: Strip redundant prefix like "Episode 1: " so UI does not duplicate numbering
  const cleanTitle = episode.title
    ? episode.title.replace(/^Episode\s*\d+\s*[:\-]\s*/i, '').trim()
    : '';
  const displayTitle = cleanTitle || episode.title;

  return (
    <div
      onClick={() => onPlay(episode)}
      style={{
        display: 'flex',
        gap: '16px',
        padding: '16px',
        borderRadius: '16px',
        backgroundColor: isCurrent ? 'rgba(245, 166, 35, 0.08)' : 'rgba(22, 22, 34, 0.5)',
        border: `1px solid ${isCurrent ? 'rgba(245, 166, 35, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        alignItems: 'center',
        position: 'relative'
      }}
      className="episode-card-row"
    >
      {/* Episode Thumbnail */}
      <div
        style={{
          position: 'relative',
          width: 'clamp(120px, 24vw, 160px)',
          aspectRatio: '16 / 9',
          borderRadius: '10px',
          overflow: 'hidden',
          backgroundColor: '#121218',
          flexShrink: 0
        }}
      >
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={displayTitle}
            onError={() => {
              if (seriesPosterUrl && imgSrc !== seriesPosterUrl) {
                setImgSrc(seriesPosterUrl);
              } else {
                setImgError(true);
              }
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#181824',
              color: 'var(--text-muted)'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
              EP {episode.episodeNumber}
            </span>
          </div>
        )}

        {/* Dark overlay with Play icon */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: isCurrent ? 'rgba(245, 166, 35, 0.15)' : 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: isCurrent ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0E0E12',
              boxShadow: isCurrent ? '0 0 16px rgba(245, 166, 35, 0.5)' : 'none'
            }}
          >
            <Play size={15} fill="#0E0E12" style={{ marginLeft: '1px' }} />
          </div>
        </div>

        {/* Watched Badge at top-left of thumbnail */}
        {isWatched && (
          <div
            style={{
              position: 'absolute',
              top: '6px',
              left: '6px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(16, 185, 129, 0.9)',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <Check size={10} strokeWidth={3} />
            <span>WATCHED</span>
          </div>
        )}

        {/* Duration pill at bottom right */}
        {episode.duration && (
          <span
            style={{
              position: 'absolute',
              bottom: '6px',
              right: '6px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              fontSize: '11px',
              fontWeight: 600,
              color: '#FFFFFF'
            }}
          >
            {episode.duration}
          </span>
        )}

        {/* Episode Watch Progress Bar */}
        {hasProgress && progress && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.25)'
            }}
          >
            <div
              style={{
                width: `${progress.percent}%`,
                height: '100%',
                backgroundColor: 'var(--brand-gold)'
              }}
            />
          </div>
        )}
      </div>

      {/* Episode Metadata */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--brand-gold)' }}>
            EPISODE {episode.episodeNumber}
          </span>
          {isCurrent && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--badge-owned-bg, #10B981)',
                fontWeight: 700,
                letterSpacing: '0.04em'
              }}
            >
              • NOW PLAYING
            </span>
          )}
          {hasProgress && progress && !isCurrent && (
            <span style={{ fontSize: '11px', color: 'var(--brand-gold)', fontWeight: 600 }}>
              • {progress.percent}% watched
            </span>
          )}
        </div>

        <h4
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.3,
            marginBottom: '6px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {displayTitle}
        </h4>

        {episode.synopsis && (
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              margin: 0
            }}
          >
            {episode.synopsis}
          </p>
        )}
      </div>

      <style>{`
        .episode-card-row:hover {
          background-color: rgba(245, 166, 35, 0.08);
          border-color: rgba(245, 166, 35, 0.3);
          transform: translateX(3px);
        }
      `}</style>
    </div>
  );
};

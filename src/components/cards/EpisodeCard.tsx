import React from 'react';
import { Episode } from '../../types/content';
import { Play } from 'lucide-react';

interface EpisodeCardProps {
  episode: Episode;
  isCurrent?: boolean;
  onPlay: (episode: Episode) => void;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({ episode, isCurrent, onPlay }) => {
  return (
    <div
      onClick={() => onPlay(episode)}
      style={{
        display: 'flex',
        gap: '16px',
        padding: '16px',
        borderRadius: '16px',
        backgroundColor: isCurrent ? 'rgba(245, 166, 35, 0.08)' : 'rgba(22, 22, 34, 0.4)',
        border: `1px solid ${isCurrent ? 'rgba(245, 166, 35, 0.35)' : 'rgba(255, 255, 255, 0.06)'}`,
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        alignItems: 'center'
      }}
      className="episode-card-row"
    >
      {/* Episode Thumbnail */}
      <div
        style={{
          position: 'relative',
          width: 'clamp(110px, 25vw, 150px)',
          aspectRatio: '16 / 9',
          borderRadius: '10px',
          overflow: 'hidden',
          backgroundColor: '#121218',
          flexShrink: 0
        }}
      >
        <img
          src={episode.thumbnailUrl}
          alt={episode.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Dark overlay with Play icon */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: isCurrent ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0E0E12'
            }}
          >
            <Play size={15} fill="#0E0E12" style={{ marginLeft: '1px' }} />
          </div>
        </div>

        {/* Duration pill at bottom right */}
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
      </div>

      {/* Episode Metadata */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--brand-gold)' }}>
            EPISODE {episode.episodeNumber}
          </span>
          {isCurrent && (
            <span style={{ fontSize: '11px', color: 'var(--badge-owned-bg)', fontWeight: 700 }}>
              • NOW PLAYING
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
          {episode.title}
        </h4>

        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {episode.synopsis}
        </p>
      </div>

      <style>{`
        .episode-card-row:hover {
          background-color: rgba(245, 166, 35, 0.06);
          border-color: rgba(245, 166, 35, 0.25);
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
};

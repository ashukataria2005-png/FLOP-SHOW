import React from 'react';
import { ContentItem } from '../../types/content';
import { Badge } from '../common/Badge';
import { useApp } from '../../context/AppContext';
import { Play } from 'lucide-react';

interface ContentCardProps {
  item: ContentItem;
  onSelect: (item: ContentItem) => void;
  width?: string | number;
  compact?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({ item, onSelect, width, compact }) => {
  const { isOwned, getProgress, monetizationMode } = useApp();
  const owned = isOwned(item.id);
  const progress = getProgress(item.id);

  return (
    <div
      onClick={() => onSelect(item)}
      className="content-card-wrapper"
      style={{
        width: width || '100%',
        flexShrink: 0,
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform var(--transition-normal)'
      }}
    >
      {/* Poster Image Container */}
      <div
        className="card-poster"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '2 / 3',
          borderRadius: compact ? '10px' : '16px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: compact ? '0 4px 12px rgba(0, 0, 0, 0.35)' : '0 8px 24px rgba(0, 0, 0, 0.45)',
          transition: 'all var(--transition-normal)'
        }}
      >
        <img
          src={item.posterUrl}
          alt={item.title}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.4s ease'
          }}
        />

        {/* Subtle dark gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(9, 9, 14, 0.8) 0%, transparent 40%, rgba(9, 9, 14, 0.3) 100%)',
            pointerEvents: 'none'
          }}
        />

        {/* Badges container in top-left */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            zIndex: 2
          }}
        >
          {item.trendingPosition === 1 && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                padding: '3px 7px',
                borderRadius: '4px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                color: '#0E0E12',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
              }}
            >
              #1 TRENDING
            </span>
          )}
          {owned && <Badge type="OWNED" />}
          {!owned && (item.isFree || item.price === 0) && <Badge type="FREE" />}
          {!owned && !item.isFree && item.price > 0 && monetizationMode === 'PER_CONTENT' && <Badge type="PRICE" price={item.price} />}
          {item.isNow && <Badge type="NOW" />}
        </div>

        {/* Hover Play Icon overlay on desktop */}
        <div className="card-hover-play">
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-gold)',
              color: '#0E0E12',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)'
            }}
          >
            <Play size={20} fill="#0E0E12" style={{ marginLeft: '2px' }} />
          </div>
        </div>

        {/* Watch progress indicator bar at the bottom of the poster */}
        {progress && progress.percent > 0 && !progress.completed && progress.percent < 90 && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              zIndex: 3
            }}
          >
            <div
              style={{
                width: `${Math.min(100, progress.percent)}%`,
                height: '100%',
                backgroundColor: 'var(--brand-gold)',
                boxShadow: '0 0 8px var(--brand-gold)'
              }}
            />
          </div>
        )}
      </div>

      {/* Metadata below poster */}
      <div style={{ marginTop: compact ? '5px' : '9px', padding: '0 2px' }}>
        <h4
          style={{
            fontSize: compact ? '12px' : '15px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.25,
            margin: 0
          }}
          title={item.title}
        >
          {item.title}
        </h4>

        <div
          style={{
            fontSize: compact ? '11px' : '13px',
            color: 'var(--text-secondary)',
            marginTop: compact ? '2px' : '3px',
            display: 'flex',
            alignItems: 'center',
            gap: compact ? '4px' : '6px'
          }}
        >
          <span>{item.releaseYear}</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.genres[0]}</span>
        </div>
      </div>

      <style>{`
        .content-card-wrapper:hover {
          transform: translateY(-4px);
        }
        .content-card-wrapper:hover .card-poster {
          border-color: rgba(245, 166, 35, 0.4);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(245, 166, 35, 0.15);
        }
        .content-card-wrapper:hover img {
          transform: scale(1.04);
        }
        .card-hover-play {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          opacity: 0;
          transition: opacity var(--transition-fast);
          z-index: 2;
        }
        .content-card-wrapper:hover .card-hover-play {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

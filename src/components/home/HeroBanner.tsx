import React from 'react';
import { ContentItem } from '../../types/content';
import { useApp } from '../../context/AppContext';
import { Play, Star, ChevronRight, Video } from 'lucide-react';

interface HeroBannerProps {
  item: ContentItem;
  onViewDetails: (item: ContentItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ item, onViewDetails }) => {
  if (!item) return null;
  const { isOwned, playTrailer } = useApp();
  const owned = isOwned(item.id);

  const handlePrimaryClick = () => {
    onViewDetails(item);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '480px',
        maxHeight: '620px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '24px 20px 32px',
        boxSizing: 'border-box'
      }}
      className="hero-banner-container"
    >
      {/* Cinematic Backdrop Image */}
      <img
        src={item.backdropUrl}
        alt={item.title}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 25%',
          zIndex: 0
        }}
      />

      {/* Cinematic Vignette Gradients */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(7, 7, 10, 0.3) 0%, rgba(7, 7, 10, 0.6) 45%, rgba(7, 7, 10, 0.92) 85%, #07070A 100%)',
          zIndex: 1
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 30% 30%, transparent 40%, rgba(7, 7, 10, 0.7) 100%)',
          zIndex: 1
        }}
      />

      {/* Hero Content Information */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {/* Category Label with Dash */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.15em',
            color: 'var(--brand-gold)',
            textTransform: 'uppercase'
          }}
        >
          <span style={{ width: '24px', height: '2px', backgroundColor: 'var(--brand-gold)', display: 'inline-block' }} />
          <span>{item.trendingPosition === 1 ? 'TRENDING #1 • ' : ''}{item.categoryLabel || 'FEATURED PREMIERE'}</span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(34px, 5.5vw, 56px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
            lineHeight: 1.05,
            margin: '2px 0 6px'
          }}
        >
          {item.title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: 'clamp(14px, 2vw, 16px)',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.55,
            maxWidth: '560px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {item.description}
        </p>

        {/* Metadata Row: Star Rating, Year, Duration, Language */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: '4px 0 12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#FFFFFF', fontWeight: 700 }}>
            <Star size={16} fill="var(--brand-gold)" color="var(--brand-gold)" />
            <span>{item.rating.toFixed(1)}</span>
          </div>

          <span>{item.releaseYear}</span>

          <span>{item.runtime || (item.seasonsCount ? `${item.seasonsCount} Seasons` : '2h 00m')}</span>

          <span
            style={{
              padding: '2px 9px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            {item.language}
          </span>
        </div>

        {/* Action Buttons: Watch Now / Buy, Watch Trailer, and Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={handlePrimaryClick}
            className="btn btn-primary btn-lg"
            style={{ minWidth: '150px' }}
          >
            <Play size={18} fill="currentColor" />
            <span>{owned || item.isFree ? 'Watch now' : `Buy for ₹${item.price}`}</span>
          </button>

          <button
            onClick={() => playTrailer(item)}
            className="btn btn-secondary btn-lg"
            style={{ minWidth: '130px' }}
          >
            <Video size={18} color="var(--brand-gold)" />
            <span>Trailer</span>
          </button>

          <button
            onClick={() => onViewDetails(item)}
            className="btn btn-secondary btn-lg"
            style={{ minWidth: '120px' }}
          >
            <span>Details</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .hero-banner-container {
            padding: 40px 48px 52px;
            min-height: 540px;
          }
        }
      `}</style>
    </div>
  );
};

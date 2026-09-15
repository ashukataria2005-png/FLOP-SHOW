import React from 'react';
import { ContentItem } from '../../types/content';

interface CinematicSpotlightProps {
  item: ContentItem | null | undefined;
  onViewDetails?: (item: ContentItem) => void;
}

export const CinematicSpotlight: React.FC<CinematicSpotlightProps> = ({ item }) => {
  if (!item) return null;

  const backdropSrc = item.backdropUrl || item.posterUrl;

  // Determine ONE short slogan/tagline line:
  // 1. Stored tagline if present
  // 2. Clean fallback derived from existing content metadata (first clean sentence or genre summary)
  let slogan = (item.tagline || '').trim();
  if (!slogan && item.description) {
    const firstSentence = item.description.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length <= 100) {
      slogan = firstSentence;
    }
  }
  if (!slogan && item.genres && item.genres.length > 0) {
    slogan = `A premier ${item.type === 'series' ? 'series' : 'film'} in ${item.genres.slice(0, 2).join(' & ')}`;
  }

  return (
    <section
      aria-label={`Cinematic Spotlight: ${item.title}`}
      className="cinematic-spotlight-container"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '340px',
        maxHeight: '440px',
        borderRadius: '24px',
        overflow: 'hidden',
        margin: '40px 0 32px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 'clamp(28px, 5vw, 52px)',
        boxSizing: 'border-box',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), inset 0 0 100px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Title-specific Artwork Backdrop */}
      <img
        src={backdropSrc}
        alt={item.title}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 30%',
          zIndex: 0
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src =
            'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=80';
        }}
      />

      {/* Cinematic Vignette & Gradient Overlays */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(7, 7, 10, 0.92) 0%, rgba(7, 7, 10, 0.72) 45%, rgba(7, 7, 10, 0.2) 80%, rgba(7, 7, 10, 0.1) 100%)',
          zIndex: 1
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(7, 7, 10, 0.1) 0%, rgba(7, 7, 10, 0.4) 50%, rgba(7, 7, 10, 0.95) 100%)',
          zIndex: 1
        }}
      />

      {/* Clean Promotional Content: Movie/Series Name + ONE short slogan line ONLY */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '820px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(28px, 4.5vw, 44px)',
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: 0,
            textShadow: '0 4px 24px rgba(0, 0, 0, 0.95)'
          }}
        >
          {item.title}
        </h2>

        {slogan && (
          <p
            style={{
              fontSize: 'clamp(14px, 1.8vw, 18px)',
              fontStyle: 'italic',
              fontWeight: 500,
              color: 'var(--brand-gold, #F5C518)',
              lineHeight: 1.4,
              margin: 0,
              textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)'
            }}
          >
            {slogan}
          </p>
        )}
      </div>
    </section>
  );
};

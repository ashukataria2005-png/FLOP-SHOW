import React from 'react';
import { ContentItem } from '../../types/content';

interface CinematicSpotlightProps {
  item: ContentItem | null | undefined;
  onViewDetails?: (item: ContentItem) => void;
}

export const CinematicSpotlight: React.FC<CinematicSpotlightProps> = ({ item, onViewDetails }) => {
  if (!item) return null;

  const backdropSrc = item.backdropUrl || item.posterUrl;

  // Retrieve admin configured overlay darkness opacity (0-100%, default 45%) and brightness (50-150%, default 100%)
  let overlayDarkness = 45;
  let artworkBrightness = 100;
  try {
    const savedOpacity = localStorage.getItem('flopshow_spotlight_overlay_opacity');
    if (savedOpacity !== null) {
      const parsed = parseFloat(savedOpacity);
      if (!isNaN(parsed)) overlayDarkness = Math.max(0, Math.min(100, parsed));
    }
    const savedBrightness = localStorage.getItem('flopshow_spotlight_brightness');
    if (savedBrightness !== null) {
      const parsedB = parseFloat(savedBrightness);
      if (!isNaN(parsedB)) artworkBrightness = Math.max(50, Math.min(150, parsedB));
    }
  } catch (_) {}

  const overlayMultiplier = overlayDarkness / 100;

  // Determine ONE short slogan/tagline line:
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

  const handleClick = () => {
    if (onViewDetails) {
      onViewDetails(item);
    }
  };

  return (
    <section
      aria-label={`Cinematic Spotlight: ${item.title}`}
      className="cinematic-spotlight-container"
      onClick={handleClick}
      role={onViewDetails ? 'button' : undefined}
      tabIndex={onViewDetails ? 0 : undefined}
      onKeyDown={onViewDetails ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } } : undefined}
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        boxSizing: 'border-box',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), inset 0 0 100px rgba(0, 0, 0, 0.4)',
        cursor: onViewDetails ? 'pointer' : 'default',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
      }}
      onMouseEnter={(e) => {
        if (onViewDetails) {
          e.currentTarget.style.transform = 'scale(1.008)';
          e.currentTarget.style.boxShadow = '0 24px 72px rgba(0, 0, 0, 0.9), inset 0 0 100px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(245, 197, 24, 0.25)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.8), inset 0 0 100px rgba(0, 0, 0, 0.4)';
      }}
    >
      {/* Title-specific Artwork Backdrop with dynamic brightness */}
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
          zIndex: 0,
          filter: `brightness(${artworkBrightness}%)`,
          transition: 'filter 0.3s ease'
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src =
            'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=80';
        }}
      />

      {/* Cinematic Vignette & Dynamic Gradient Overlays bound to admin opacity slider */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, rgba(7, 7, 10, ${0.9 * overlayMultiplier}) 0%, rgba(7, 7, 10, ${0.7 * overlayMultiplier}) 45%, rgba(7, 7, 10, ${0.2 * overlayMultiplier}) 80%, rgba(7, 7, 10, ${0.05 * overlayMultiplier}) 100%)`,
          zIndex: 1,
          transition: 'background 0.3s ease'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, rgba(7, 7, 10, ${0.05 * overlayMultiplier}) 0%, rgba(7, 7, 10, ${0.35 * overlayMultiplier}) 50%, rgba(7, 7, 10, ${0.92 * overlayMultiplier}) 100%)`,
          zIndex: 1,
          transition: 'background 0.3s ease'
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

import React from 'react';
import { ContentItem } from '../../types/content';
import { useApp } from '../../context/AppContext';
import { Play, Star, Sparkles, Video, Bookmark, Check, Film, Tv } from 'lucide-react';

interface CinematicSpotlightProps {
  item: ContentItem | null | undefined;
  onViewDetails: (item: ContentItem) => void;
}

export const CinematicSpotlight: React.FC<CinematicSpotlightProps> = ({ item, onViewDetails }) => {
  // If no Cinematic Spotlight has been selected, handle empty state gracefully by rendering nothing
  if (!item) return null;

  const { isOwned, playTrailer, inMyList, toggleMyList } = useApp();
  const owned = isOwned(item.id);
  const isInList = inMyList(item.id);

  const backdropSrc = item.backdropUrl || item.posterUrl;

  return (
    <section
      aria-label="Cinematic Spotlight"
      className="cinematic-spotlight-container"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '440px',
        maxHeight: '540px',
        borderRadius: '24px',
        overflow: 'hidden',
        margin: '40px 0 28px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 'clamp(24px, 4vw, 44px)',
        boxSizing: 'border-box',
        border: '1px solid rgba(245, 197, 24, 0.28)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(245, 197, 24, 0.08)'
      }}
    >
      {/* High-definition Backdrop Artwork */}
      <img
        src={backdropSrc}
        alt={item.title}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 28%',
          zIndex: 0
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=80';
        }}
      />

      {/* Multi-Stop Cinematic Gradients for Pristine Text Readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(7, 7, 10, 0.95) 0%, rgba(7, 7, 10, 0.82) 42%, rgba(7, 7, 10, 0.35) 75%, rgba(7, 7, 10, 0.15) 100%)',
          zIndex: 1
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(7, 7, 10, 0.25) 0%, rgba(7, 7, 10, 0.55) 50%, rgba(7, 7, 10, 0.96) 100%)',
          zIndex: 1
        }}
      />

      {/* Spotlight Content Overlay */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '720px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Category / System Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(245, 197, 24, 0.18)',
              border: '1.5px solid var(--brand-gold, #F5C518)',
              color: 'var(--brand-gold, #F5C518)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              boxShadow: '0 2px 10px rgba(245, 197, 24, 0.2)'
            }}
          >
            <Sparkles size={13} />
            <span>CINEMATIC SPOTLIGHT</span>
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#D1D5DB',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              padding: '4px 10px',
              borderRadius: '6px'
            }}
          >
            {item.type === 'series' ? <Tv size={13} color="#60A5FA" /> : <Film size={13} color="#F59E0B" />}
            <span style={{ textTransform: 'uppercase' }}>{item.type}</span>
          </span>

          <span style={{ fontSize: '13px', color: '#9CA3AF' }}>•</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB' }}>{item.releaseYear}</span>

          {item.rating > 0 && (
            <>
              <span style={{ fontSize: '13px', color: '#9CA3AF' }}>•</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--brand-gold, #F5C518)'
                }}
              >
                <Star size={13} fill="currentColor" />
                <span>{item.rating.toFixed(1)}</span>
              </span>
            </>
          )}


        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 'clamp(28px, 4.5vw, 42px)',
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: 0,
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.9)'
          }}
        >
          {item.title}
        </h2>

        {/* Tagline */}
        {item.tagline && (
          <p
            style={{
              fontSize: '15px',
              fontStyle: 'italic',
              color: 'var(--brand-gold, #F5C518)',
              margin: 0,
              fontWeight: 500
            }}
          >
            "{item.tagline}"
          </p>
        )}

        {/* Description overview */}
        <p
          style={{
            fontSize: '14px',
            color: '#D1D5DB',
            lineHeight: 1.55,
            margin: 0,
            maxWidth: '650px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {item.description}
        </p>

        {/* Genre Tags */}
        {item.genres && item.genres.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
            {item.genres.slice(0, 4).map(genre => (
              <span
                key={genre}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#9CA3AF',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Interactive Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '8px',
            flexWrap: 'wrap'
          }}
        >
          {/* Primary View / Watch Button */}
          <button
            onClick={() => onViewDetails(item)}
            className="btn btn-primary"
            style={{
              padding: '12px 26px',
              fontSize: '14px',
              fontWeight: 800,
              gap: '8px',
              boxShadow: '0 4px 20px rgba(245, 197, 24, 0.35)'
            }}
          >
            <Play size={18} fill="currentColor" />
            <span>{owned ? 'Watch Now' : 'View Details'}</span>
          </button>

          {/* Trailer Button (if available) */}
          {item.trailerUrl && (
            <button
              onClick={() => playTrailer(item)}
              className="btn btn-secondary"
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 700,
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                color: '#FFFFFF'
              }}
            >
              <Video size={16} />
              <span>Trailer</span>
            </button>
          )}

          {/* Add / Remove from My List Button */}
          <button
            onClick={() => toggleMyList(item.id)}
            className="btn btn-secondary"
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: 600,
              gap: '8px',
              backgroundColor: isInList ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255, 255, 255, 0.08)',
              borderColor: isInList ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.15)',
              color: isInList ? 'var(--brand-gold, #F5C518)' : '#FFFFFF'
            }}
            title={isInList ? 'Remove from My List' : 'Save to My List'}
          >
            {isInList ? <Check size={16} /> : <Bookmark size={16} />}
            <span>{isInList ? 'In My List' : 'Save'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

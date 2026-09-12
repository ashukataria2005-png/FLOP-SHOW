import React, { useState } from 'react';
import { ContentItem, Episode } from '../types/content';
import { DEMO_CATALOG } from '../data/catalog';
import { useApp } from '../context/AppContext';
import { EpisodeCard } from '../components/cards/EpisodeCard';
import { ContentCard } from '../components/cards/ContentCard';
import {
  ArrowLeft,
  Play,
  Plus,
  Check,
  Star,
  Video
} from 'lucide-react';

interface DetailsPageProps {
  item: ContentItem;
  onBack: () => void;
  onSelectItem: (item: ContentItem) => void;
}

export const DetailsPage: React.FC<DetailsPageProps> = ({ item, onBack, onSelectItem }) => {
  const {
    isOwned,
    openPurchaseModal,
    startPlaying,
    playTrailer,
    inMyList,
    toggleMyList,
    activeEpisode,
    catalog
  } = useApp();

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);

  const owned = isOwned(item.id);
  const isInList = inMyList(item.id);
  const isSeries = item.type === 'series';

  // Current season episodes if series
  const activeSeason = item.seasons?.find(s => s.seasonNumber === selectedSeasonNumber) || item.seasons?.[0];

  // Recommendations (same genre or other titles) from central catalog
  const recommendations = (catalog || DEMO_CATALOG).filter(
    c => c.id !== item.id && c.genres.some(g => item.genres.includes(g))
  ).slice(0, 4);

  const handlePrimaryAction = () => {
    if (owned || item.isFree) {
      startPlaying(item);
    } else {
      openPurchaseModal(item);
    }
  };

  const handlePlayEpisode = (episode: Episode) => {
    if (owned || item.isFree) {
      startPlaying(item, episode);
    } else {
      openPurchaseModal(item);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: 'var(--bg-black)' }}>
      {/* Back Navigation Button matching screenshot 3 */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          zIndex: 20
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'rgba(10, 10, 15, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245, 166, 35, 0.2)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(10, 10, 15, 0.7)')}
        >
          <ArrowLeft size={16} />
          <span>Back to browse</span>
        </button>
      </div>

      {/* Hero Backdrop Banner matching Screenshot 3 */}
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
          padding: '24px 20px 40px',
          boxSizing: 'border-box'
        }}
        className="details-hero-container"
      >
        {/* Backdrop Image */}
        <img
          src={item.backdropUrl}
          alt={item.title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
            zIndex: 0
          }}
        />

        {/* Heavy dark vignette overlay to ensure text contrast */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(7, 7, 10, 0.4) 0%, rgba(7, 7, 10, 0.75) 50%, rgba(7, 7, 10, 0.98) 92%, #07070A 100%)',
            zIndex: 1
          }}
        />

        {/* Hero Details Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '720px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Tag: SERIES • MYSTERY in gold uppercase */}
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: 'var(--brand-gold)',
              textTransform: 'uppercase'
            }}
          >
            {item.categoryLabel || `${item.type.toUpperCase()} • ${item.genres.join(' • ')}`}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: 'clamp(32px, 5.5vw, 54px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
              lineHeight: 1.05
            }}
          >
            {item.title}
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: 'clamp(14px, 2vw, 16px)',
              color: 'rgba(255, 255, 255, 0.88)',
              lineHeight: 1.6,
              maxWidth: '580px'
            }}
          >
            {item.description}
          </p>

          {/* Metadata Row matching Screenshot 3: ★ 9.1  2024  2 Seasons  Hindi  Directed by S. Banerjee */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: '4px 0 16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#FFFFFF', fontWeight: 700 }}>
              <Star size={16} fill="var(--brand-gold)" color="var(--brand-gold)" />
              <span>{item.rating.toFixed(1)}</span>
            </div>

            <span>{item.releaseYear}</span>

            <span>{isSeries ? `${item.seasonsCount} Seasons` : item.runtime}</span>

            <span
              style={{
                padding: '2px 8px',
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

            {item.director && (
              <span style={{ color: 'var(--text-secondary)' }}>
                Directed by <strong>{item.director}</strong>
              </span>
            )}
          </div>

          {/* Action CTAs: Watch now / Buy, Watch Trailer, and + My list */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrimaryAction}
              className="btn btn-primary btn-lg"
              style={{ minWidth: '160px' }}
            >
              <Play size={18} fill="#0E0E12" />
              <span>
                {owned || item.isFree
                  ? 'Watch now'
                  : `Buy for ₹${item.price}`}
              </span>
            </button>

            {/* Watch Trailer CTA */}
            <button
              onClick={() => playTrailer(item)}
              className="btn btn-secondary btn-lg"
              style={{ minWidth: '150px' }}
            >
              <Video size={18} color="var(--brand-gold)" />
              <span>Watch Trailer</span>
            </button>

            <button
              onClick={() => toggleMyList(item.id)}
              className="btn btn-secondary btn-lg"
              style={{ minWidth: '130px' }}
            >
              {isInList ? (
                <>
                  <Check size={18} color="var(--badge-owned-bg)" />
                  <span>In My list</span>
                </>
              ) : (
                <>
                  <Plus size={18} />
                  <span>My list</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Body Content */}
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '0 20px 40px' }}>
        {/* About Section matching Screenshot 3 */}
        <div style={{ margin: '24px 0 36px' }}>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#FFFFFF',
              marginBottom: '12px'
            }}
          >
            About the {isSeries ? 'series' : 'film'}
          </h2>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              maxWidth: '820px'
            }}
          >
            {item.about}
          </p>

          {/* Cast Chips */}
          {item.cast && item.cast.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Cast & Credits
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {item.cast.map(actor => (
                  <span
                    key={actor}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '13px',
                      color: '#FFFFFF'
                    }}
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* If Series: Seasons & Episodes Listing */}
        {isSeries && item.seasons && (
          <div style={{ margin: '36px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF' }}>
                Episodes
              </h2>

              {/* Season Selector Tabs */}
              {item.seasons.length > 1 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {item.seasons.map(s => (
                    <button
                      key={s.seasonNumber}
                      onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '13px',
                        fontWeight: 700,
                        backgroundColor: selectedSeasonNumber === s.seasonNumber ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.08)',
                        color: selectedSeasonNumber === s.seasonNumber ? '#0E0E12' : '#FFFFFF',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      Season {s.seasonNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Episode Cards Grid/List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activeSeason?.episodes.map(ep => (
                <EpisodeCard
                  key={ep.id}
                  episode={ep}
                  isCurrent={activeEpisode?.id === ep.id}
                  onPlay={handlePlayEpisode}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recommended Titles */}
        {recommendations.length > 0 && (
          <div style={{ margin: '48px 0 20px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginBottom: '18px' }}>
              You may also like
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '16px'
              }}
            >
              {recommendations.map(rec => (
                <ContentCard key={rec.id} item={rec} onSelect={onSelectItem} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .details-hero-container {
            padding: 50px 48px 60px;
            min-height: 520px;
          }
        }
      `}</style>
    </div>
  );
};

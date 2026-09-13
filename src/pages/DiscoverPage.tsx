import React, { useState, useEffect } from 'react';
import { HeroBanner } from '../components/home/HeroBanner';
import { ContentSection } from '../components/home/ContentSection';
import { BrandPromoCard } from '../components/home/BrandPromoCard';
import { ContentItem } from '../types/content';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

interface DiscoverPageProps {
  onSelectItem: (item: ContentItem) => void;
  onNavigate: (tab: string, param?: string) => void;
}

/**
 * Returns items from catalog that include ANY of the given genre strings (case-insensitive).
 * Skips items that don't have matching genres.
 */
function byGenre(catalog: ContentItem[], ...genres: string[]): ContentItem[] {
  const lower = genres.map(g => g.toLowerCase());
  return catalog.filter(item =>
    Array.isArray(item.genres) &&
    item.genres.some(g => lower.includes(g.toLowerCase()))
  );
}

export const DiscoverPage: React.FC<DiscoverPageProps> = ({ onSelectItem, onNavigate }) => {
  const { watchProgress, catalog } = useApp();
  const activeCatalog = catalog || [];
  const [dedicatedHero, setDedicatedHero] = useState<ContentItem | null>(null);

  useEffect(() => {
    let mounted = true;
    api.content.getHero().then(h => {
      if (mounted) setDedicatedHero(h);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [catalog]);

  // Home Hero: dedicated hero item set by admin, or first featured item
  const heroItem = activeCatalog.find(item => item.isHero) || dedicatedHero || undefined;

  // ── In-progress: items currently being watched ──────────────────────────────
  const inProgressItems = watchProgress
    .map(wp => activeCatalog.find(item => item.id === wp.contentId))
    .filter((item): item is ContentItem => item !== undefined);

  // ── Trending: Trending #1 first, then others ────────────────────────────────
  const trending1 = activeCatalog.find(c => c.trendingPosition === 1);
  const trendingItems = [
    ...(trending1 ? [trending1] : []),
    ...activeCatalog.filter(c => c.id !== trending1?.id).slice(0, 7)
  ];

  // ── Top Rated: real rating field ≥ 8.5, sorted descending ───────────────────
  const topRated = [...activeCatalog]
    .filter(c => typeof c.rating === 'number' && c.rating >= 8.0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // ── Genre rows — using ACTUAL genre metadata stored in DB ────────────────────
  const dramaItems    = byGenre(activeCatalog, 'Drama');
  const thrillerItems = byGenre(activeCatalog, 'Thriller');
  const crimeItems    = byGenre(activeCatalog, 'Crime');
  const actionItems   = byGenre(activeCatalog, 'Action');
  const sciFiItems    = byGenre(activeCatalog, 'Sci-Fi', 'Science Fiction', 'Sci Fi');
  const comedyItems   = byGenre(activeCatalog, 'Comedy');
  const mysteryItems  = byGenre(activeCatalog, 'Mystery');

  // ── By content type ─────────────────────────────────────────────────────────
  const movieItems  = activeCatalog.filter(c => c.type === 'movie');
  const seriesItems = activeCatalog.filter(c => c.type === 'series');

  // ── New Releases: 2024 onwards, sorted newest first ─────────────────────────
  const newReleases = [...activeCatalog]
    .filter(c => (c.releaseYear || 0) >= 2024)
    .sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));

  // ── Language rows — using ACTUAL language field ──────────────────────────────
  // Indian content: Hindi + Telugu + Tamil + Malayalam + Marathi etc.
  const indianLanguages = ['hindi', 'telugu', 'tamil', 'malayalam', 'marathi', 'punjabi', 'kannada', 'bengali'];
  const indianItems = activeCatalog.filter(c =>
    indianLanguages.includes((c.language || '').toLowerCase())
  );
  // International (non-Indian, non-English for a "World Cinema" feel)
  const intlItems = activeCatalog.filter(c => {
    const lang = (c.language || '').toLowerCase();
    return !indianLanguages.includes(lang) && lang !== 'english' && lang !== '';
  });

  return (
    <div className="discover-page-container">
      {/* Featured Hero Banner */}
      {heroItem && <HeroBanner item={heroItem} onViewDetails={onSelectItem} />}

      {/* Row: Continue Watching (only if user has progress) */}
      {inProgressItems.length > 0 && (
        <ContentSection
          categoryLabel="IN PROGRESS"
          title="Continue Watching"
          items={inProgressItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('library')}
        />
      )}

      {/* Row: Trending */}
      {trendingItems.length > 0 && (
        <ContentSection
          categoryLabel="WHAT EVERYONE IS WATCHING"
          title="Trending Right Now"
          items={trendingItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: Top Rated — sorted by real rating field */}
      {topRated.length > 0 && (
        <ContentSection
          categoryLabel="HIGHEST RATED"
          title="Top Rated Titles"
          items={topRated}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: New Releases — 2024+ titles sorted by year */}
      {newReleases.length > 0 && (
        <ContentSection
          categoryLabel="FRESH OFF THE LENS"
          title="New & Recently Added"
          items={newReleases}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: Popular Movies */}
      {movieItems.length > 0 && (
        <ContentSection
          categoryLabel="BLOCKBUSTER FILMS"
          title="Popular Movies"
          items={movieItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: Popular Series */}
      {seriesItems.length > 0 && (
        <ContentSection
          categoryLabel="BINGE-WORTHY"
          title="Popular Series"
          items={seriesItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: Drama — genre-based, real metadata only */}
      {dramaItems.length > 0 && (
        <ContentSection
          categoryLabel="GENRE"
          title="Drama"
          items={dramaItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: Thriller */}
      {thrillerItems.length > 0 && (
        <ContentSection
          categoryLabel="GENRE"
          title="Thriller"
          items={thrillerItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: Crime */}
      {crimeItems.length > 0 && (
        <ContentSection
          categoryLabel="GENRE"
          title="Crime"
          items={crimeItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: Action */}
      {actionItems.length > 0 && (
        <ContentSection
          categoryLabel="GENRE"
          title="Action"
          items={actionItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: Sci-Fi */}
      {sciFiItems.length > 0 && (
        <ContentSection
          categoryLabel="GENRE"
          title="Sci-Fi"
          items={sciFiItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: Mystery */}
      {mysteryItems.length > 0 && (
        <ContentSection
          categoryLabel="GENRE"
          title="Mystery"
          items={mysteryItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: Comedy */}
      {comedyItems.length > 0 && (
        <ContentSection
          categoryLabel="GENRE"
          title="Comedy"
          items={comedyItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: Indian Cinema — Hindi, Telugu, Tamil etc. */}
      {indianItems.length > 0 && (
        <ContentSection
          categoryLabel="DESI STORIES"
          title="Indian Cinema"
          items={indianItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* Row: International / World Cinema — non-Indian, non-English languages */}
      {intlItems.length > 0 && (
        <ContentSection
          categoryLabel="WORLD CINEMA"
          title="International Movies & Series"
          items={intlItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('search')}
        />
      )}

      {/* FLOPSHOW Brand Promo Card */}
      <BrandPromoCard />
    </div>
  );
};

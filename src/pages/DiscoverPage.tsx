import React, { useState, useEffect } from 'react';
import { HeroBanner } from '../components/home/HeroBanner';
import { CinematicSpotlight } from '../components/home/CinematicSpotlight';
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
  const [spotlights, setSpotlights] = useState<ContentItem[]>([]);

  useEffect(() => {
    let mounted = true;
    api.content.getHero().then(h => {
      if (mounted) setDedicatedHero(h);
    }).catch(() => {});
    api.content.getSpotlights().then(items => {
      if (mounted) {
        if (items && items.length > 0) {
          setSpotlights(items);
        } else {
          api.content.getSpotlight().then(s => {
            if (mounted && s) setSpotlights([s]);
          }).catch(() => {});
        }
      }
    }).catch(() => {
      api.content.getSpotlight().then(s => {
        if (mounted && s) setSpotlights([s]);
      }).catch(() => {});
    });
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
  const actionItems   = byGenre(activeCatalog, 'Action');
  const comedyItems   = byGenre(activeCatalog, 'Comedy');
  const thrillerItems = byGenre(activeCatalog, 'Thriller');
  const crimeItems    = byGenre(activeCatalog, 'Crime');
  const dramaItems    = byGenre(activeCatalog, 'Drama');
  const sciFiItems    = byGenre(activeCatalog, 'Sci-Fi', 'Science Fiction', 'Sci Fi');
  const romanceItems  = byGenre(activeCatalog, 'Romance');
  const horrorItems   = byGenre(activeCatalog, 'Horror');
  const fantasyItems  = byGenre(activeCatalog, 'Fantasy', 'Adventure');
  const mysteryItems  = byGenre(activeCatalog, 'Mystery');

  // ── By content type ─────────────────────────────────────────────────────────
  const movieItems  = activeCatalog.filter(c => c.type === 'movie');
  const seriesItems = activeCatalog.filter(c => c.type === 'series');

  // ── Famous Hollywood & Studio Collections ──────────────────────────────────
  const marvelItems = byGenre(activeCatalog, 'Marvel');
  const dcItems     = byGenre(activeCatalog, 'DC');
  const hboItems    = byGenre(activeCatalog, 'HBO');

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

  // ── Free Content: items that are 100% free (price === 0 or isFree) ───────────
  const freeItems = activeCatalog.filter(c => c.isFree || c.price === 0);

  // Collect all active catalog content rows in order
  const contentRows: React.ReactNode[] = [];

  if (inProgressItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="continue-watching"
        categoryLabel="IN PROGRESS"
        title="Continue Watching"
        items={inProgressItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('library')}
      />
    );
  }

  if (freeItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="free-content"
        categoryLabel="100% FREE • WATCH WITHOUT SUBSCRIPTION"
        title="Free Movies & Series"
        items={freeItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'free')}
      />
    );
  }

  if (trendingItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="trending"
        categoryLabel="WHAT EVERYONE IS WATCHING"
        title="Trending Right Now"
        items={trendingItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search')}
      />
    );
  }

  if (topRated.length > 0) {
    contentRows.push(
      <ContentSection
        key="top-rated"
        categoryLabel="HIGHEST RATED"
        title="Top Rated Titles"
        items={topRated}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search')}
      />
    );
  }

  if (newReleases.length > 0) {
    contentRows.push(
      <ContentSection
        key="new-releases"
        categoryLabel="FRESH OFF THE LENS"
        title="New & Recently Added"
        items={newReleases}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search')}
      />
    );
  }

  if (movieItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="popular-movies"
        categoryLabel="BLOCKBUSTER FILMS"
        title="Popular Movies"
        items={movieItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search')}
      />
    );
  }

  if (seriesItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="popular-series"
        categoryLabel="BINGE-WORTHY"
        title="Popular Series"
        items={seriesItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search')}
      />
    );
  }

  if (marvelItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="collection-marvel"
        categoryLabel="MARVEL STUDIOS • MCU & HEROES"
        title="Marvel Universe Collection"
        items={marvelItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'Marvel')}
      />
    );
  }

  if (dcItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="collection-dc"
        categoryLabel="DC STUDIOS • DARK KNIGHT & METAHUMANS"
        title="DC Universe Collection"
        items={dcItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'DC')}
      />
    );
  }

  if (hboItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="collection-hbo"
        categoryLabel="HBO ORIGINALS • PRESTIGE TELEVISION & CINEMA"
        title="HBO Collection"
        items={hboItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'HBO')}
      />
    );
  }

  if (actionItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="genre-action"
        categoryLabel="GENRE"
        title="Action & Adrenaline"
        items={actionItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'Action')}
      />
    );
  }

  if (thrillerItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="genre-thriller"
        categoryLabel="GENRE"
        title="Gripping Thrillers"
        items={thrillerItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'Thriller')}
      />
    );
  }

  if (crimeItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="genre-crime"
        categoryLabel="GENRE"
        title="Crime & Underworld"
        items={crimeItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'Crime')}
      />
    );
  }

  if (comedyItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="genre-comedy"
        categoryLabel="GENRE"
        title="Comedy & Laughs"
        items={comedyItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'Comedy')}
      />
    );
  }

  if (dramaItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="genre-drama"
        categoryLabel="GENRE"
        title="Drama"
        items={dramaItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'Drama')}
      />
    );
  }

  if (romanceItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="genre-romance"
        categoryLabel="GENRE"
        title="Romance & Heartfelt"
        items={romanceItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'Romance')}
      />
    );
  }

  if (sciFiItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="genre-scifi"
        categoryLabel="GENRE"
        title="Sci-Fi & Future Worlds"
        items={sciFiItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'Sci-Fi')}
      />
    );
  }

  if (mysteryItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="genre-mystery"
        categoryLabel="GENRE"
        title="Mystery & Suspense"
        items={mysteryItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'Mystery')}
      />
    );
  }

  if (horrorItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="genre-horror"
        categoryLabel="GENRE"
        title="Horror & Supernatual"
        items={horrorItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'Horror')}
      />
    );
  }

  if (fantasyItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="genre-fantasy"
        categoryLabel="GENRE"
        title="Fantasy & Adventure"
        items={fantasyItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search', 'Fantasy')}
      />
    );
  }

  if (indianItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="desi-indian"
        categoryLabel="DESI STORIES"
        title="Indian Cinema"
        items={indianItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search')}
      />
    );
  }

  if (intlItems.length > 0) {
    contentRows.push(
      <ContentSection
        key="world-cinema"
        categoryLabel="WORLD CINEMA"
        title="International Movies & Series"
        items={intlItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search')}
      />
    );
  }

  // Interleave Spotlights with exact rule:
  // - Spotlight #1 appears after the 3rd normal row (rowIndex === 2)
  // - Every subsequent spotlight appears with two normal rows between consecutive spotlights
  // (Spotlight #1 -> 2 rows -> Spotlight #2 -> 2 rows -> Spotlight #3 -> ...)
  // - Any remaining spotlights placed naturally after available rows without losing them.
  const interleavedSections: React.ReactNode[] = [];
  let spotlightIndex = 0;

  for (let rowIndex = 0; rowIndex < contentRows.length; rowIndex++) {
    interleavedSections.push(contentRows[rowIndex]);

    // Check if a spotlight should be inserted after this row
    if (
      spotlightIndex < spotlights.length &&
      rowIndex === 2 + spotlightIndex * 2
    ) {
      const spot = spotlights[spotlightIndex];
      interleavedSections.push(
        <CinematicSpotlight
          key={`cinematic-spotlight-${spot.id}-${spotlightIndex}`}
          item={spot}
          onViewDetails={onSelectItem}
        />
      );
      spotlightIndex++;
    }
  }

  // If there are more Spotlights than available row insertion points,
  // place remaining Spotlights naturally after the available rows without losing them.
  while (spotlightIndex < spotlights.length) {
    const spot = spotlights[spotlightIndex];
    interleavedSections.push(
      <CinematicSpotlight
        key={`cinematic-spotlight-overflow-${spot.id}-${spotlightIndex}`}
        item={spot}
        onViewDetails={onSelectItem}
      />
    );
    spotlightIndex++;
  }

  return (
    <div className="discover-page-container">
      {/* Featured Hero Banner */}
      {heroItem && <HeroBanner item={heroItem} onViewDetails={onSelectItem} />}

      {/* Dynamic Interleaved Rows and Unlimited Spotlights */}
      {interleavedSections}

      {/* FLOPSHOW Brand Promo Card */}
      <BrandPromoCard />
    </div>
  );
};

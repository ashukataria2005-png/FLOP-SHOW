import React from 'react';
import { HeroBanner } from '../components/home/HeroBanner';
import { ContentSection } from '../components/home/ContentSection';
import { BrandPromoCard } from '../components/home/BrandPromoCard';
import { ContentItem } from '../types/content';
import { DEMO_CATALOG } from '../data/catalog';
import { useApp } from '../context/AppContext';

interface DiscoverPageProps {
  onSelectItem: (item: ContentItem) => void;
  onNavigate: (tab: string, param?: string) => void;
}

export const DiscoverPage: React.FC<DiscoverPageProps> = ({ onSelectItem, onNavigate }) => {
  const { watchProgress, catalog } = useApp();
  const activeCatalog = catalog && catalog.length > 0 ? catalog : DEMO_CATALOG;

  // Find featured hero item (isFeatured or Trending #1 or default)
  const heroItem = activeCatalog.find(item => item.isFeatured) ||
                   activeCatalog.find(item => item.trendingPosition === 1) ||
                   activeCatalog[0];

  // In-progress items from active user watch progress
  const inProgressItems = watchProgress
    .map(wp => activeCatalog.find(item => item.id === wp.contentId))
    .filter((item): item is ContentItem => item !== undefined);

  // Trending items: dynamically place Trending #1 title first!
  const trending1 = activeCatalog.find(c => c.trendingPosition === 1);
  const otherTrending = activeCatalog.filter(c => c.id !== trending1?.id && (
    c.id === 'afterglow-2025' ||
    c.id === 'monsoon-files-2024' ||
    c.id === 'city-of-dreams-2023' ||
    c.id === 'midnight-express-2024' ||
    c.id === 'dhurandhar-2025' ||
    c.rating >= 8.5
  )).slice(0, 4);

  const trendingItems = trending1 ? [trending1, ...otherTrending] : otherTrending;

  // Curated for you / Made for your night items
  const curatedItems = activeCatalog.filter(c =>
    c.id === 'winter-signal-2024' ||
    c.id === 'red-earth-2025' ||
    c.id === 'chronicles-kashi-2025' ||
    c.id === 'the-last-ghazal-2025' ||
    c.id === 'inception-2010'
  ).slice(0, 4);

  // Popular Series
  const seriesItems = activeCatalog.filter(c => c.type === 'series');

  // New Releases
  const newReleases = activeCatalog.filter(c => c.releaseYear >= 2024);

  return (
    <div className="discover-page-container">
      {/* Featured Premiere Hero Banner (Screenshot 1) */}
      <HeroBanner item={heroItem} onViewDetails={onSelectItem} />

      {/* Row 1: Pick up where you left off (Screenshot 2) */}
      {inProgressItems.length > 0 && (
        <ContentSection
          categoryLabel="IN PROGRESS"
          title="Pick up where you left off"
          items={inProgressItems}
          onSelect={onSelectItem}
          onSeeAll={() => onNavigate('library')}
        />
      )}

      {/* Row 2: Trending after dark (Screenshot 2 & 4) */}
      <ContentSection
        categoryLabel="WHAT EVERYONE IS WATCHING"
        title="Trending after dark"
        items={trendingItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search')}
      />

      {/* Row 3: Made for your night (Screenshot 4) */}
      <ContentSection
        categoryLabel="CURATED FOR YOU"
        title="Made for your night"
        items={curatedItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search')}
      />

      {/* Row 4: Popular Series */}
      <ContentSection
        categoryLabel="BINGE-WORTHY"
        title="Popular Series"
        items={seriesItems}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search')}
      />

      {/* Row 5: New Releases */}
      <ContentSection
        categoryLabel="FRESH OFF THE LENS"
        title="New Releases"
        items={newReleases}
        onSelect={onSelectItem}
        onSeeAll={() => onNavigate('search')}
      />

      {/* The FLOPSHOW Edit Promo Card (Screenshot 5) */}
      <BrandPromoCard />
    </div>
  );
};

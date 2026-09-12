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

  // Home Hero must strictly and solely be the title selected through the dedicated Hero control
  const heroItem = activeCatalog.find(item => item.isHero) || dedicatedHero || undefined;

  // In-progress items from active user watch progress
  const inProgressItems = watchProgress
    .map(wp => activeCatalog.find(item => item.id === wp.contentId))
    .filter((item): item is ContentItem => item !== undefined);

  // Trending items: dynamically place Trending #1 title first!
  const trending1 = activeCatalog.find(c => c.trendingPosition === 1);
  const otherTrending = activeCatalog
    .filter(c => c.id !== trending1?.id)
    .slice(0, 4);

  const trendingItems = trending1 ? [trending1, ...otherTrending] : otherTrending;

  // Curated for you / Made for your night items (independent of hero)
  const curatedItems = activeCatalog
    .filter(c => c.id !== trending1?.id)
    .slice(0, 4);

  // Popular Series
  const seriesItems = activeCatalog.filter(c => c.type === 'series');

  // New Releases
  const newReleases = activeCatalog.filter(c => c.releaseYear >= 2024);

  return (
    <div className="discover-page-container">
      {/* Featured Premiere Hero Banner */}
      {heroItem && <HeroBanner item={heroItem} onViewDetails={onSelectItem} />}

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

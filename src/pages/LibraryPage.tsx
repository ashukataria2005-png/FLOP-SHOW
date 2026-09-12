import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ContentItem } from '../types/content';
import { ContentCard } from '../components/cards/ContentCard';
import { Bookmark, Film, PlayCircle, History, Compass } from 'lucide-react';

interface LibraryPageProps {
  onSelectItem: (item: ContentItem) => void;
  onNavigate: (tab: string) => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ onSelectItem, onNavigate }) => {
  const { purchases, myList, watchProgress, catalog } = useApp();
  const activeCatalog = catalog || [];
  const [activeTab, setActiveTab] = useState<'owned' | 'saved' | 'progress' | 'history'>('owned');

  // Purchased / Owned items
  const ownedItems = purchases
    .map(p => activeCatalog.find(c => c.id === p.contentId))
    .filter((c): c is ContentItem => c !== undefined);

  // My List saved items
  const savedItems = myList
    .map(id => activeCatalog.find(c => c.id === id))
    .filter((c): c is ContentItem => c !== undefined);

  // Continue Watching items
  const inProgressItems = watchProgress
    .filter(wp => wp.percent > 0 && wp.percent < 95)
    .map(wp => activeCatalog.find(c => c.id === wp.contentId))
    .filter((c): c is ContentItem => c !== undefined);

  // Watch History (all watched items)
  const historyItems = watchProgress
    .map(wp => activeCatalog.find(c => c.id === wp.contentId))
    .filter((c): c is ContentItem => c !== undefined);

  const tabs = [
    { id: 'owned', label: 'Purchased', count: ownedItems.length, icon: Film },
    { id: 'saved', label: 'My List', count: savedItems.length, icon: Bookmark },
    { id: 'progress', label: 'In Progress', count: inProgressItems.length, icon: PlayCircle },
    { id: 'history', label: 'History', count: historyItems.length, icon: History }
  ];

  const getActiveList = () => {
    switch (activeTab) {
      case 'owned': return ownedItems;
      case 'saved': return savedItems;
      case 'progress': return inProgressItems;
      case 'history': return historyItems;
      default: return [];
    }
  };

  const currentItems = getActiveList();

  return (
    <div style={{ padding: '24px 20px', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
      {/* Title */}
      <h1
        style={{
          fontSize: 'clamp(26px, 4vw, 36px)',
          fontWeight: 800,
          color: '#FFFFFF',
          letterSpacing: '-0.02em',
          marginBottom: '20px'
        }}
      >
        My Library
      </h1>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '14px',
                fontWeight: isSelected ? 700 : 500,
                backgroundColor: isSelected ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.05)',
                color: isSelected ? '#0E0E12' : 'var(--text-secondary)',
                border: 'none',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  color: isSelected ? '#0E0E12' : '#FFFFFF'
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Grid or Professional Empty State */}
      {currentItems.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '20px'
          }}
        >
          {currentItems.map(item => (
            <ContentCard key={item.id} item={item} onSelect={onSelectItem} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            textAlign: 'center',
            padding: '70px 20px',
            backgroundColor: 'rgba(22, 22, 34, 0.35)',
            borderRadius: '20px',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            maxWidth: '520px',
            margin: '40px auto'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 166, 35, 0.1)',
              border: '1px solid rgba(245, 166, 35, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--brand-gold)'
            }}
          >
            {activeTab === 'owned' && <Film size={30} />}
            {activeTab === 'saved' && <Bookmark size={30} />}
            {activeTab === 'progress' && <PlayCircle size={30} />}
            {activeTab === 'history' && <History size={30} />}
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
            {activeTab === 'owned' && 'No Purchased Titles Yet'}
            {activeTab === 'saved' && 'Your List is Empty'}
            {activeTab === 'progress' && 'Nothing in Progress'}
            {activeTab === 'history' && 'No Watch History'}
          </h3>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            {activeTab === 'owned' && 'Individual films and webseries you buy will appear here permanently with unrestricted playback.'}
            {activeTab === 'saved' && 'Tap the "+ My list" button on any movie or series to keep track of what you want to watch next.'}
            {activeTab === 'progress' && 'Start streaming any title and your progress will automatically save right here.'}
            {activeTab === 'history' && 'Stories you have watched will appear in your viewing log.'}
          </p>

          <button onClick={() => onNavigate('discover')} className="btn btn-primary btn-lg">
            <Compass size={18} />
            <span>Explore Discover</span>
          </button>
        </div>
      )}
    </div>
  );
};

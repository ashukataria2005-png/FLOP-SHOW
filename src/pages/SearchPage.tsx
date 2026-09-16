import React, { useState, useMemo, useEffect } from 'react';
import { GENRE_LIST } from '../data/catalog';
import { ContentItem } from '../types/content';
import { ContentCard } from '../components/cards/ContentCard';
import { useApp } from '../context/AppContext';
import { Search as SearchIcon, X, Film, Tv, Gift } from 'lucide-react';

interface SearchPageProps {
  onSelectItem: (item: ContentItem) => void;
  initialFilter?: string;
}

export const SearchPage: React.FC<SearchPageProps> = ({ onSelectItem, initialFilter }) => {
  const { catalog } = useApp();
  const activeCatalog = catalog || [];
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>(() => {
    return initialFilter === 'free' ? 'free' : 'all';
  });

  useEffect(() => {
    if (!initialFilter) return;
    if (initialFilter === 'free') {
      setPriceFilter('free');
    } else if (initialFilter.startsWith('genre:')) {
      const g = initialFilter.replace('genre:', '');
      const matched = GENRE_LIST.find(item => item.toLowerCase() === g.toLowerCase());
      setSelectedGenre(matched || g);
    } else {
      const matched = GENRE_LIST.find(item => item.toLowerCase() === initialFilter.toLowerCase());
      setSelectedGenre(matched || initialFilter);
    }
  }, [initialFilter]);

  // Filter logic
  const filteredItems = useMemo(() => {
    return activeCatalog.filter(item => {
      // Query match (title, cast, director, description)
      const matchesQuery =
        query.trim() === '' ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.cast && item.cast.some(c => c.toLowerCase().includes(query.toLowerCase()))) ||
        (item.director && item.director.toLowerCase().includes(query.toLowerCase()));

      // Type match
      const matchesType = typeFilter === 'all' || item.type === typeFilter;

      // Genre match (case-insensitive)
      const matchesGenre =
        selectedGenre === 'All' ||
        (Array.isArray(item.genres) && item.genres.some(g => g.toLowerCase() === selectedGenre.toLowerCase()));

      // Price / Free match
      const isItemFree = Boolean(item.isFree || item.price === 0);
      const matchesPrice =
        priceFilter === 'all' ||
        (priceFilter === 'free' && isItemFree) ||
        (priceFilter === 'paid' && !isItemFree);

      return matchesQuery && matchesType && matchesGenre && matchesPrice;
    });
  }, [query, typeFilter, selectedGenre, priceFilter, activeCatalog]);

  const freeItems = useMemo(() => {
    return activeCatalog.filter(item => item.isFree || item.price === 0);
  }, [activeCatalog]);

  return (
    <div style={{ padding: '24px 20px', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
      {/* Title */}
      <h1
        style={{
          fontSize: 'clamp(26px, 4vw, 36px)',
          fontWeight: 800,
          color: '#FFFFFF',
          marginBottom: '20px',
          letterSpacing: '-0.02em'
        }}
      >
        Search FLOPSHOW
      </h1>

      {/* Search Input Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-surface)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '0 18px',
          height: '56px',
          marginBottom: '20px',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
          transition: 'border-color var(--transition-fast)'
        }}
        className="search-input-wrapper"
      >
        <SearchIcon size={22} color="var(--brand-gold)" style={{ marginRight: '14px', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search by movie, series, actor, or genre..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: 1,
            fontSize: '16px',
            color: '#FFFFFF',
            outline: 'none',
            border: 'none',
            background: 'transparent'
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ color: 'var(--text-muted)', padding: '4px', cursor: 'pointer' }}
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Type Filter Pills: All / Free / Movies / Series */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          onClick={() => { setTypeFilter('all'); setPriceFilter('all'); }}
          className={`btn btn-sm ${typeFilter === 'all' && priceFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          All Content
        </button>

        <button
          onClick={() => setPriceFilter(prev => prev === 'free' ? 'all' : 'free')}
          className={`btn btn-sm ${priceFilter === 'free' ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            borderColor: priceFilter === 'free' ? 'var(--brand-gold)' : 'rgba(16, 185, 129, 0.4)',
            backgroundColor: priceFilter === 'free' ? 'rgba(245, 166, 35, 0.25)' : 'rgba(16, 185, 129, 0.12)',
            color: priceFilter === 'free' ? 'var(--brand-gold)' : '#10B981',
            fontWeight: 700
          }}
        >
          <Gift size={15} />
          <span>100% Free ({freeItems.length})</span>
        </button>

        <button
          onClick={() => setTypeFilter('movie')}
          className={`btn btn-sm ${typeFilter === 'movie' && priceFilter !== 'free' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Film size={15} />
          <span>Movies</span>
        </button>

        <button
          onClick={() => setTypeFilter('series')}
          className={`btn btn-sm ${typeFilter === 'series' && priceFilter !== 'free' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Tv size={15} />
          <span>Webseries</span>
        </button>
      </div>

      {/* Free Content Highlight Banner (when browsing all content) */}
      {query === '' && priceFilter === 'all' && freeItems.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderRadius: '14px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gift size={22} color="#10B981" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                Dedicated 100% Free Section
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {freeItems.length} titles are currently completely free to stream without payments.
              </div>
            </div>
          </div>
          <button
            onClick={() => setPriceFilter('free')}
            className="btn btn-sm"
            style={{
              backgroundColor: '#10B981',
              color: '#07070A',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Show Free Only
          </button>
        </div>
      )}

      {/* Genre Filter Pills */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '24px',
          scrollbarWidth: 'none'
        }}
      >
        {GENRE_LIST.map(genre => {
          const isSelected = selectedGenre === genre;
          return (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '13px',
                fontWeight: isSelected ? 700 : 500,
                backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: isSelected ? 'var(--brand-gold)' : 'var(--text-secondary)',
                border: `1px solid ${isSelected ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.08)'}`,
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)'
              }}
            >
              {genre}
            </button>
          );
        })}
      </div>

      {/* Result Count Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {priceFilter === 'free' && (
            <span style={{ color: '#10B981', fontWeight: 700, marginRight: '6px' }}>[100% FREE]</span>
          )}
          Found <strong style={{ color: '#FFFFFF' }}>{filteredItems.length}</strong> title
          {filteredItems.length === 1 ? '' : 's'}
        </span>

        {(query || typeFilter !== 'all' || selectedGenre !== 'All' || priceFilter !== 'all') && (
          <button
            onClick={() => {
              setQuery('');
              setTypeFilter('all');
              setSelectedGenre('All');
              setPriceFilter('all');
            }}
            style={{ fontSize: '13px', color: 'var(--brand-gold)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Results Grid */}
      {filteredItems.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 'clamp(12px, 2.5vw, 20px)'
          }}
        >
          {filteredItems.map(item => (
            <ContentCard key={item.id} item={item} onSelect={onSelectItem} />
          ))}
        </div>
      ) : (
        /* No-results empty state */
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'rgba(22, 22, 34, 0.3)',
            borderRadius: '20px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            marginTop: '20px'
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--text-muted)'
            }}
          >
            <SearchIcon size={28} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
            No stories found matching your search
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 20px' }}>
            Try searching for another keyword, adjusting your genre filter, or explore our curated collections on the Discover page.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setTypeFilter('all');
              setSelectedGenre('All');
            }}
            className="btn btn-secondary"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
};

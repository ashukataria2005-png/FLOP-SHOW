import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { ContentItem } from '../../types/content';
import { useApp } from '../../context/AppContext';
import {
  Crown,
  Search,
  Check,
  XCircle,
  Film,
  Tv,
  Loader2,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Layers,
  Trash2
} from 'lucide-react';

interface AdminHeroPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminHeroPage: React.FC<AdminHeroPageProps> = ({ onNavigateTab }) => {
  const { showToast, refreshCatalog } = useApp();
  const [currentHero, setCurrentHero] = useState<ContentItem | null>(null);
  const [catalog, setCatalog] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // Hero Carousel multi-selection IDs persisted in localStorage
  const [carouselIds, setCarouselIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('flopshow_hero_carousel_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const handleToggleCarousel = (item: ContentItem) => {
    setCarouselIds(prev => {
      let next: string[];
      if (prev.includes(item.id)) {
        next = prev.filter(id => id !== item.id);
        showToast(`Removed "${item.title}" from Hero Carousel`, 'info');
      } else {
        next = [...prev, item.id];
        showToast(`Added "${item.title}" to Hero Carousel`, 'success');
      }
      try {
        localStorage.setItem('flopshow_hero_carousel_ids', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const handleClearCarousel = () => {
    setCarouselIds([]);
    try {
      localStorage.removeItem('flopshow_hero_carousel_ids');
    } catch (_) {}
    showToast('Cleared all titles from Hero Carousel', 'info');
  };

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MOVIE' | 'SERIES'>('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const [heroData, contentData] = await Promise.all([
        api.admin.getHero(),
        api.admin.listContent({ status: 'PUBLISHED', limit: 1000, all: true })
      ]);
      setCurrentHero(heroData);
      setCatalog(contentData || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load Hero or catalog data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter catalog titles
  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => {
      const matchesType =
        typeFilter === 'ALL' ||
        (typeFilter === 'MOVIE' && item.type === 'movie') ||
        (typeFilter === 'SERIES' && item.type === 'series');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.director && item.director.toLowerCase().includes(q)) ||
        (item.genres && item.genres.some(g => g.toLowerCase().includes(q))) ||
        (item.categoryLabel && item.categoryLabel.toLowerCase().includes(q));

      return matchesType && matchesSearch;
    });
  }, [catalog, typeFilter, searchQuery]);

  // Handle setting a new Main Hero
  const handleSetHero = async (item: ContentItem) => {
    try {
      setUpdatingId(item.id);
      const res = await api.admin.setHero(item.id);
      if (res.success) {
        setCurrentHero(res.hero || item);
        showToast(`"${item.title}" is now designated as Main Hero!`, 'success');
        refreshCatalog();
        // Update catalog local state so isHero flags match
        setCatalog(prev =>
          prev.map(c => ({
            ...c,
            isHero: c.id === item.id
          }))
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update Main Hero.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle clearing current Main Hero
  const handleClearHero = async () => {
    try {
      setIsClearing(true);
      const res = await api.admin.setHero(null);
      if (res.success) {
        setCurrentHero(null);
        showToast('Main Hero removed. No title is currently active as Main Hero.', 'info');
        refreshCatalog();
        setCatalog(prev =>
          prev.map(c => ({
            ...c,
            isHero: false
          }))
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to clear Main Hero.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#9CA3AF' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--brand-gold, #F5C518)' }} />
        <span>Loading Main Hero configuration...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <button
            onClick={() => onNavigateTab('admin-content')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Content Catalog</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)'
              }}
            >
              <Crown size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
                Main Hero Control
              </h1>
              <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '4px 0 0' }}>
                Designate the single premier title showcased on the Discover page Hero banner. Selecting a title replaces the previous Main Hero.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Active Hero Showcase Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '18px',
          border: currentHero ? '1px solid rgba(245, 197, 24, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          marginBottom: '36px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: currentHero ? '0 12px 36px rgba(0, 0, 0, 0.5)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--brand-gold, #F5C518)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
              Current Active Main Hero
            </h2>
          </div>
          {currentHero && (
            <button
              onClick={handleClearHero}
              disabled={isClearing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#F87171',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isClearing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isClearing ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
              <span>Clear / Remove Main Hero</span>
            </button>
          )}
        </div>

        {currentHero ? (
          <div
            style={{
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '14px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            {/* Poster Thumbnail */}
            <div
              style={{
                width: '110px',
                height: '160px',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#1E1E2A',
                flexShrink: 0,
                boxShadow: '0 8px 20px rgba(0,0,0,0.6)'
              }}
            >
              <img
                src={currentHero.posterUrl || currentHero.backdropUrl}
                alt={currentHero.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=300&q=80';
                }}
              />
            </div>

            {/* Title & Metadata */}
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(245, 197, 24, 0.2)',
                    color: 'var(--brand-gold, #F5C518)',
                    border: '1px solid var(--brand-gold, #F5C518)'
                  }}
                >
                  <Crown size={12} />
                  <span>★ ACTIVE MAIN HERO</span>
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#E5E7EB',
                    textTransform: 'uppercase'
                  }}
                >
                  {currentHero.type === 'series' ? 'TV SERIES' : 'FEATURE FILM'}
                </span>
                <span style={{ fontSize: '13px', color: '#9CA3AF' }}>• {currentHero.releaseYear}</span>
                {currentHero.rating > 0 && (
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)' }}>
                    ★ {currentHero.rating}
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                {currentHero.title}
              </h3>

              {currentHero.tagline && (
                <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#D1D5DB', margin: '0 0 8px' }}>
                  "{currentHero.tagline}"
                </p>
              )}

              <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 12px', lineHeight: 1.5, maxWidth: '750px' }}>
                {currentHero.description}
              </p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {currentHero.genres?.map(genre => (
                  <span
                    key={genre}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#9CA3AF',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px dashed rgba(255, 255, 255, 0.12)'
            }}
          >
            <AlertCircle size={32} style={{ color: '#6B7280', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px' }}>
              No Active Main Hero
            </h3>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0, maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
              The Discover page premiere Hero banner is currently hidden. Select any published movie or series below to designate it as the Main Hero.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 1B: Multi-Slide Hero Carousel Configuration */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '18px',
          border: carouselIds.length > 0 ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          marginBottom: '36px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#818CF8" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
              Hero Carousel Rotation ({carouselIds.length} titles selected)
            </h2>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#A5B4FC', fontWeight: 600 }}>
              5s Auto-Rotation
            </span>
          </div>
          {carouselIds.length > 0 && (
            <button
              onClick={handleClearCarousel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#F87171',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} />
              <span>Clear Carousel</span>
            </button>
          )}
        </div>

        {carouselIds.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
            {carouselIds.map((id, idx) => {
              const item = catalog.find(c => c.id === id);
              if (!item) return null;
              return (
                <div
                  key={id}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '10px',
                    padding: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', height: '110px', borderRadius: '6px', overflow: 'hidden' }}>
                    <img
                      src={item.backdropUrl || item.posterUrl}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=300&q=80';
                      }}
                    />
                    <span style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#FFF', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                      Slide #{idx + 1}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      {item.releaseYear} • {item.type}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCarousel(item)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#F87171',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
            No specific titles selected for the carousel yet. Use "+ Carousel" on any title in the catalog table below to add it to the multi-slide Hero banner. Discover page will automatically rotate between them every 5s.
          </p>
        )}
      </div>

      {/* SECTION 2: Select Title from Published Catalog */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
              Select Title from Published Catalog
            </h2>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Showing {filteredCatalog.length} of {catalog.length >= 300 ? '300+' : `${catalog.length}`} titles
              {catalog.length > 0 && (
                <span style={{ marginLeft: '6px', color: '#6B7280', fontSize: '12px' }}>
                  ({catalog.length} total catalog titles loaded)
                </span>
              )}
            </p>
          </div>

          {/* Search & Type Filters */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Type selector */}
            <div style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: typeFilter === 'ALL' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                  color: typeFilter === 'ALL' ? '#000000' : '#9CA3AF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('MOVIE')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: typeFilter === 'MOVIE' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                  color: typeFilter === 'MOVIE' ? '#000000' : '#9CA3AF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Movies
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('SERIES')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: typeFilter === 'SERIES' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                  color: typeFilter === 'SERIES' ? '#000000' : '#9CA3AF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Series
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search titles or genres..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Catalog Table */}
        {filteredCatalog.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#9CA3AF'
            }}
          >
            <p style={{ margin: 0, fontSize: '15px' }}>
              {catalog.length === 0
                ? 'No published movies or series found in database. Add titles via Quick Add / Content Editor first.'
                : 'No published titles match your search criteria.'}
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Title & Media
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Type & Year
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Genres
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'right' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map(item => {
                  const isHeroActive = currentHero?.id === item.id;
                  const isBeingUpdated = updatingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        backgroundColor: isHeroActive ? 'rgba(245, 197, 24, 0.05)' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Title & Thumbnail */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <img
                            src={item.posterUrl || item.backdropUrl}
                            alt={item.title}
                            style={{
                              width: '42px',
                              height: '60px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              backgroundColor: '#1E1E2A',
                              flexShrink: 0
                            }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=150&q=80';
                            }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>
                                {item.title}
                              </span>
                              {isHeroActive && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(245, 197, 24, 0.2)',
                                    color: 'var(--brand-gold, #F5C518)',
                                    border: '1px solid var(--brand-gold, #F5C518)'
                                  }}
                                >
                                  ★ ACTIVE MAIN HERO
                                </span>
                              )}
                            </div>
                            {item.tagline && (
                              <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', marginTop: '2px' }}>
                                {item.tagline}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type & Year */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#D1D5DB' }}>
                          {item.type === 'series' ? <Tv size={14} color="#60A5FA" /> : <Film size={14} color="#F59E0B" />}
                          <span style={{ textTransform: 'capitalize' }}>{item.type}</span>
                          <span style={{ color: '#6B7280' }}>•</span>
                          <span>{item.releaseYear}</span>
                        </div>
                      </td>

                      {/* Genres */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(item.genres || []).slice(0, 3).map(g => (
                            <span
                              key={g}
                              style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: '#9CA3AF'
                              }}
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          {/* Carousel Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleCarousel(item)}
                            title={carouselIds.includes(item.id) ? "Remove from Hero Carousel" : "Add to Hero Carousel"}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              backgroundColor: carouselIds.includes(item.id) ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                              border: carouselIds.includes(item.id) ? '1px solid #818CF8' : '1px solid rgba(255, 255, 255, 0.1)',
                              color: carouselIds.includes(item.id) ? '#A5B4FC' : '#D1D5DB',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Layers size={14} />
                            <span>{carouselIds.includes(item.id) ? 'In Carousel' : '+ Carousel'}</span>
                          </button>

                          {/* Main Hero Toggle */}
                          {isHeroActive ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                                border: '1px solid var(--brand-gold, #F5C518)',
                                color: 'var(--brand-gold, #F5C518)',
                                fontSize: '13px',
                                fontWeight: 700
                              }}
                            >
                              <Check size={16} />
                              <span>Main Hero</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetHero(item)}
                              disabled={isBeingUpdated}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: isBeingUpdated ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => {
                                if (!isBeingUpdated) {
                                  e.currentTarget.style.backgroundColor = 'var(--brand-gold, #F5C518)';
                                  e.currentTarget.style.color = '#000000';
                                  e.currentTarget.style.borderColor = 'var(--brand-gold, #F5C518)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isBeingUpdated) {
                                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                  e.currentTarget.style.color = '#FFFFFF';
                                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                }
                              }}
                            >
                              {isBeingUpdated ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Crown size={16} />
                              )}
                              <span>Set Main</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

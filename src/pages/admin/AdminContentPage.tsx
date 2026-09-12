import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ContentItem } from '../../types/content';
import { useApp } from '../../context/AppContext';
import { MediaPlayer, MediaPlayerSource } from '../../components/player/MediaPlayer';
import {
  Film,
  Tv,
  Plus,
  Search,
  Edit3,
  Trash2,
  TrendingUp,
  Loader2,
  Eye,
  EyeOff,
  Star,
  Play,
  ArrowUpDown,
  X,
  AlertTriangle,
  Sparkles,
  MoreVertical,
  Crown
} from 'lucide-react';

interface AdminContentPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminContentPage: React.FC<AdminContentPageProps> = ({ onNavigateTab }) => {
  const { showToast, refreshCatalog } = useApp();
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [genresList, setGenresList] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MOVIE' | 'SERIES'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [featuredFilter, setFeaturedFilter] = useState<'ALL' | 'FEATURED'>('ALL');
  const [trendingFilter, setTrendingFilter] = useState<'ALL' | 'TRENDING'>('ALL');
  const [selectedGenre, setSelectedGenre] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'price_desc' | 'price_asc'>('newest');

  // Modal states
  const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);
  const [deleteItemTitle, setDeleteItemTitle] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview Modal state
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
  const [activePreviewPlayer, setActivePreviewPlayer] = useState<MediaPlayerSource | null>(null);

  // 3-Dot Action Menu State
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Close 3-dot dropdown on window click or Escape key
  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenuId(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenActionMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fetch all content from backend (admin endpoint includes drafts and unpublished)
  const fetchContent = async () => {
    try {
      setLoading(true);
      const items = await api.admin.listContent({
        status: statusFilter === 'ALL' ? 'ALL' : statusFilter,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        genre: selectedGenre === 'ALL' ? undefined : selectedGenre,
        featured: featuredFilter === 'FEATURED' ? true : undefined,
        trending: trendingFilter === 'TRENDING' ? true : undefined,
        search: searchQuery.trim() || undefined,
        sortBy
      });
      setContentList(items);
    } catch (err: any) {
      showToast(err.message || 'Failed to load catalog items.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGenres = async () => {
    try {
      const res = await api.admin.getGenres();
      setGenresList(res.genres || []);
    } catch {
      // Keep empty if failed
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  useEffect(() => {
    fetchContent();
  }, [typeFilter, statusFilter, featuredFilter, trendingFilter, selectedGenre, sortBy]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContent();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Quick Trending #1 Assignment
  const handleToggleTrending = async (item: ContentItem) => {
    const isCurrentlyTrending1 = item.trendingPosition === 1;
    const newPosition = isCurrentlyTrending1 ? null : 1;

    try {
      await api.admin.setTrending(item.id, newPosition);
      showToast(
        newPosition === 1
          ? `"${item.title}" is now set as TRENDING #1!`
          : `Removed Trending #1 status from "${item.title}".`,
        'success'
      );
      fetchContent();
      refreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to update Trending position.', 'error');
    }
  };

  // Handle Quick Publish / Unpublish Toggle
  const handleTogglePublishStatus = async (item: ContentItem) => {
    // Look up current status or toggle between PUBLISHED and DRAFT
    const currentIsPublished = (item as any).status === 'PUBLISHED' || !(item as any).status || (item as any).status === undefined;
    const newStatus = currentIsPublished ? 'DRAFT' : 'PUBLISHED';

    try {
      await api.admin.updateStatus(item.id, newStatus);
      showToast(
        newStatus === 'PUBLISHED'
          ? `Published "${item.title}". Visible to audiences.`
          : `Unpublished "${item.title}". Hidden in Draft mode.`,
        'success'
      );
      fetchContent();
      refreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  // Handle Quick Featured ON/OFF Toggle
  const handleToggleFeatured = async (item: ContentItem) => {
    const newFeatured = !item.isFeatured;
    try {
      await api.admin.updateContent(item.id, { isFeatured: newFeatured });
      showToast(
        newFeatured
          ? `"${item.title}" is now set as FEATURED on homepage!`
          : `Removed "${item.title}" from Featured.`,
        'success'
      );
      fetchContent();
      refreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to update Featured status.', 'error');
    }
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!selectedDeleteId) return;
    try {
      setIsDeleting(true);
      await api.admin.deleteContent(selectedDeleteId);
      showToast('Content successfully deleted from catalog.', 'success');
      setSelectedDeleteId(null);
      fetchContent();
      refreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete content.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Preview player for Trailer
  const handlePreviewTrailer = (item: ContentItem) => {
    if (!item.trailerUrl) {
      showToast('No trailer configured for this title.', 'error');
      return;
    }
    setActivePreviewPlayer({
      url: item.trailerUrl,
      title: `${item.title} — Official Trailer Preview`,
      poster: item.backdropUrl || item.posterUrl,
      mediaType: 'TRAILER'
    });
  };

  // Open Preview player for Main Video
  const handlePreviewMainVideo = (item: ContentItem) => {
    if (!item.videoUrl) {
      showToast('No main movie video configured for this title yet.', 'error');
      return;
    }
    setActivePreviewPlayer({
      url: item.videoUrl,
      title: `${item.title} — Main Video Preview (Admin Direct Access)`,
      poster: item.backdropUrl || item.posterUrl,
      mediaType: 'MAIN'
    });
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Content & Media Catalog Control
          </h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
            Search, filter, publish/unpublish, configure pricing, assign Trending #1, and inspect media sources.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigateTab('admin-hero')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              fontWeight: 700,
              fontSize: '14px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Crown size={18} color="var(--brand-gold, #F5C518)" />
            <span>Home Hero</span>
          </button>

          <button
            onClick={() => onNavigateTab('admin-quick-add')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: 'rgba(245, 197, 24, 0.15)',
              color: 'var(--brand-gold, #F5C518)',
              border: '1px solid rgba(245, 197, 24, 0.35)',
              fontWeight: 800,
              fontSize: '14px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={18} />
            <span>Quick Add / Import</span>
          </button>

          <button
            onClick={() => onNavigateTab('admin-editor', 'new')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 22px',
              backgroundColor: 'var(--brand-gold, #F5C518)',
              color: '#0E0E12',
              fontWeight: 800,
              fontSize: '14px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(245, 197, 24, 0.25)'
            }}
          >
            <Plus size={18} />
            <span>Add New Title</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '24px',
          backgroundColor: 'var(--bg-surface, #12121A)',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Top row: Search input + Sorting */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
            <input
              type="text"
              placeholder="Search by title, director, or slug..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowUpDown size={16} style={{ color: '#9CA3AF' }} />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{
                padding: '11px 14px',
                borderRadius: '8px',
                backgroundColor: '#1C1C28',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <option value="newest">Sort: Newest Added</option>
              <option value="oldest">Sort: Oldest Added</option>
              <option value="title">Sort: Title (A-Z)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
              <option value="price_asc">Sort: Price (Low to High)</option>
            </select>
          </div>
        </div>

        {/* Bottom row: Multi-filters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Content Type Filter */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '8px' }}>
            {(['ALL', 'MOVIE', 'SERIES'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: typeFilter === t ? 'var(--brand-gold, #F5C518)' : 'transparent',
                  color: typeFilter === t ? '#0E0E12' : '#9CA3AF'
                }}
              >
                {t === 'ALL' ? 'All Types' : t === 'MOVIE' ? 'Movies' : 'Series'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '8px' }}>
            {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: statusFilter === s ? (s === 'PUBLISHED' ? '#10B981' : s === 'DRAFT' ? '#EF4444' : '#FFFFFF') : 'transparent',
                  color: statusFilter === s ? '#0E0E12' : '#9CA3AF'
                }}
              >
                {s === 'ALL' ? 'All Statuses' : s === 'PUBLISHED' ? 'Published' : 'Unpublished (Draft)'}
              </button>
            ))}
          </div>

          {/* Featured Filter */}
          <button
            onClick={() => setFeaturedFilter(featuredFilter === 'ALL' ? 'FEATURED' : 'ALL')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: featuredFilter === 'FEATURED' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: featuredFilter === 'FEATURED' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF'
            }}
          >
            <Star size={14} />
            <span>Featured</span>
          </button>

          {/* Trending Filter */}
          <button
            onClick={() => setTrendingFilter(trendingFilter === 'ALL' ? 'TRENDING' : 'ALL')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: trendingFilter === 'TRENDING' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: trendingFilter === 'TRENDING' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF'
            }}
          >
            <TrendingUp size={14} />
            <span>Trending #1</span>
          </button>

          {/* Genre selector */}
          {genresList.length > 0 && (
            <select
              value={selectedGenre}
              onChange={e => setSelectedGenre(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: '#1C1C28',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <option value="ALL">All Genres</option>
              {genresList.map(g => (
                <option key={g.id} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          {/* Reset Filters */}
          {(typeFilter !== 'ALL' || statusFilter !== 'ALL' || featuredFilter !== 'ALL' || trendingFilter !== 'ALL' || selectedGenre !== 'ALL' || searchQuery !== '') && (
            <button
              onClick={() => {
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setFeaturedFilter('ALL');
                setTrendingFilter('ALL');
                setSelectedGenre('ALL');
                setSearchQuery('');
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#9CA3AF',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '12px', color: '#9CA3AF' }}>
          <Loader2 className="animate-spin" size={26} style={{ color: 'var(--brand-gold, #F5C518)' }} />
          <span>Retrieving catalog items from database...</span>
        </div>
      ) : contentList.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <Film size={52} style={{ color: '#4B5563', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>No Content Found</h3>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '20px' }}>No items match your active filters or query.</p>
          <button
            onClick={() => onNavigateTab('admin-editor', 'new')}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--brand-gold, #F5C518)',
              color: '#0E0E12',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Create First Title
          </button>
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
          <div style={{ overflowX: 'auto', minHeight: '340px', paddingBottom: openActionMenuId ? '120px' : '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Title & Artwork</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Price</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Spotlight</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contentList.map((item, index) => {
                  const isTrending1 = item.trendingPosition === 1;
                  const isPublished = (item as any).status === 'PUBLISHED' || !(item as any).status || (item as any).status === undefined;
                  const isLastRows = index >= contentList.length - 2 && contentList.length > 2;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Title & Artwork */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            style={{
                              width: '46px',
                              height: '66px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              backgroundColor: '#1E1E2A'
                            }}
                          />
                          <div>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '4px' }}>
                              {item.title}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9CA3AF' }}>
                              <span>{item.releaseYear}</span>
                              <span>•</span>
                              <span>{item.language}</span>
                              <span>•</span>
                              <span>{item.genres.slice(0, 2).join(', ')}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: item.type === 'movie' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                            color: item.type === 'movie' ? '#F59E0B' : '#A78BFA'
                          }}
                        >
                          {item.type === 'movie' ? <Film size={12} /> : <Tv size={12} />}
                          <span>{item.type.toUpperCase()}</span>
                        </span>
                      </td>

                      {/* Price */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: item.price === 0 ? '#10B981' : '#FFFFFF' }}>
                          {item.price === 0 ? 'FREE' : `₹${item.price}`}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            border: isPublished ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                            backgroundColor: isPublished ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isPublished ? '#10B981' : '#F59E0B'
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isPublished ? '#10B981' : '#F59E0B'
                            }}
                          />
                          <span>{isPublished ? 'PUBLISHED' : 'DRAFT'}</span>
                        </span>
                      </td>

                      {/* Spotlight Badges */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {isTrending1 && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 800,
                                backgroundColor: 'var(--brand-gold, #F5C518)',
                                color: '#0E0E12'
                              }}
                            >
                              <TrendingUp size={12} />
                              <span>#1 TRENDING</span>
                            </span>
                          )}
                          {item.isFeatured && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 800,
                                backgroundColor: 'rgba(245, 197, 24, 0.18)',
                                color: 'var(--brand-gold, #F5C518)',
                                border: '1px solid rgba(245, 197, 24, 0.35)'
                              }}
                            >
                              <Star size={11} fill="currentColor" />
                              <span>FEATURED</span>
                            </span>
                          )}
                          {!isTrending1 && !item.isFeatured && (
                            <span style={{ fontSize: '13px', color: '#6B7280' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* 3-DOT ACTION MENU */}
                      <td style={{ padding: '16px 20px', textAlign: 'right', position: 'relative' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenuId(prev => prev === item.id ? null : item.id);
                          }}
                          title={`Action menu for "${item.title}"`}
                          aria-label={`Action menu for ${item.title}`}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: openActionMenuId === item.id ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                            border: openActionMenuId === item.id ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.12)',
                            color: openActionMenuId === item.id ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <MoreVertical size={18} />
                        </button>

                        {/* 3-Dot Action Dropdown Menu */}
                        {openActionMenuId === item.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              right: '20px',
                              ...(isLastRows ? { bottom: 'calc(100% - 4px)' } : { top: 'calc(100% - 4px)' }),
                              minWidth: '220px',
                              backgroundColor: '#161622',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: '12px',
                              padding: '6px',
                              boxShadow: '0 14px 40px rgba(0, 0, 0, 0.85)',
                              zIndex: 100,
                              textAlign: 'left',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}
                          >
                            {/* Action: Edit */}
                            <button
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onNavigateTab('admin-editor', item.id);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'transparent',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Edit3 size={15} color="var(--brand-gold, #F5C518)" />
                              <span>Edit Content</span>
                            </button>

                            {/* Action: Preview / View */}
                            <button
                              onClick={() => {
                                setOpenActionMenuId(null);
                                setPreviewItem(item);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'transparent',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Play size={15} color="#60A5FA" />
                              <span>Preview / Play</span>
                            </button>

                            {/* Action: Publish / Unpublish */}
                            <button
                              onClick={() => {
                                setOpenActionMenuId(null);
                                handleTogglePublishStatus(item);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'transparent',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              {isPublished ? <EyeOff size={15} color="#F87171" /> : <Eye size={15} color="#10B981" />}
                              <span>{isPublished ? 'Unpublish (Draft)' : 'Publish (Make Live)'}</span>
                            </button>

                            {/* Action: Featured ON / OFF */}
                            <button
                              onClick={() => {
                                setOpenActionMenuId(null);
                                handleToggleFeatured(item);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'transparent',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Star size={15} color={item.isFeatured ? '#9CA3AF' : 'var(--brand-gold, #F5C518)'} fill={item.isFeatured ? 'none' : 'currentColor'} />
                              <span>{item.isFeatured ? 'Remove from Featured' : 'Feature on Hero'}</span>
                            </button>

                            {/* Action: Trending #1 ON / OFF */}
                            <button
                              onClick={() => {
                                setOpenActionMenuId(null);
                                handleToggleTrending(item);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'transparent',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <TrendingUp size={15} color={isTrending1 ? '#9CA3AF' : '#F59E0B'} />
                              <span>{isTrending1 ? 'Remove Trending #1' : 'Set as Trending #1'}</span>
                            </button>

                            <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

                            {/* Action: Delete */}
                            <button
                              onClick={() => {
                                setOpenActionMenuId(null);
                                setSelectedDeleteId(item.id);
                                setDeleteItemTitle(item.title);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'transparent',
                                color: '#F87171',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Trash2 size={15} color="#EF4444" />
                              <span>Delete Title</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content Preview Modal */}
      {previewItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              maxWidth: '640px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
            }}
          >
            {/* Modal Backdrop Banner */}
            <div
              style={{
                height: '180px',
                backgroundImage: `url(${previewItem.backdropUrl || previewItem.posterUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #12121A 0%, rgba(18, 18, 26, 0.3) 100%)' }} />
              <button
                onClick={() => setPreviewItem(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <img
                  src={previewItem.posterUrl}
                  alt={previewItem.title}
                  style={{ width: '80px', height: '115px', objectFit: 'cover', borderRadius: '10px', marginTop: '-50px', border: '2px solid rgba(255, 255, 255, 0.2)' }}
                />
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
                    {previewItem.title}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
                    {previewItem.type.toUpperCase()} • {previewItem.releaseYear} • {previewItem.price === 0 ? 'FREE' : `₹${previewItem.price}`}
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: 1.5, marginBottom: '20px' }}>
                {previewItem.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#9CA3AF' }}>Trailer Source:</span>
                  <span style={{ color: '#FFFFFF', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {previewItem.trailerUrl || 'Not configured'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#9CA3AF' }}>Main Movie Video Source:</span>
                  <span style={{ color: '#FFFFFF', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {previewItem.videoUrl || 'Not configured'}
                  </span>
                </div>
              </div>

              {/* Playback Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handlePreviewTrailer(previewItem)}
                  disabled={!previewItem.trailerUrl}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: previewItem.trailerUrl ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: previewItem.trailerUrl ? '#FFFFFF' : '#6B7280',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: previewItem.trailerUrl ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Play size={16} />
                  <span>Preview Trailer</span>
                </button>

                <button
                  onClick={() => handlePreviewMainVideo(previewItem)}
                  disabled={!previewItem.videoUrl}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: previewItem.videoUrl ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.05)',
                    color: previewItem.videoUrl ? '#0E0E12' : '#6B7280',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: previewItem.videoUrl ? 'pointer' : 'not-allowed',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Play size={16} />
                  <span>Preview Main Video</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedDeleteId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Delete Title?
                </h3>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                  Permanent database removal
                </p>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to delete <strong>"{deleteItemTitle}"</strong>? All associated seasons, episodes, and media links will be permanently removed.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setSelectedDeleteId(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded In-Admin Media Player */}
      {activePreviewPlayer && (
        <MediaPlayer
          source={activePreviewPlayer}
          onClose={() => setActivePreviewPlayer(null)}
        />
      )}
    </div>
  );
};

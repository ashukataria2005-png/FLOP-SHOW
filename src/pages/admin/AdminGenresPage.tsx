import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { ContentItem } from '../../types/content';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  Film,
  AlertTriangle,
  ArrowLeft,
  Tv,
  Star,
  ArrowUpRight,
  Check,
  Flame
} from 'lucide-react';
import { AdminTop10Page } from './AdminTop10Page';

interface GenreWithCount {
  id: string;
  name: string;
  slug: string;
  contentCount: number;
}

interface AdminGenresPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminGenresPage: React.FC<AdminGenresPageProps> = ({ onNavigateTab }) => {
  const { showToast, refreshCatalog } = useApp();
  const [genres, setGenres] = useState<GenreWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'taxonomy' | 'top10'>('taxonomy');

  // Genre Explorer state
  const [selectedGenre, setSelectedGenre] = useState<GenreWithCount | null>(null);
  const [genreContent, setGenreContent] = useState<ContentItem[]>([]);
  const [genreContentLoading, setGenreContentLoading] = useState(false);
  const [genreTypeFilter, setGenreTypeFilter] = useState<'ALL' | 'movie' | 'series'>('ALL');
  const [genreItemSearch, setGenreItemSearch] = useState('');

  // Add Genre Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGenreName, setNewGenreName] = useState('');
  const [newGenreSlug, setNewGenreSlug] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Rename Genre Modal state
  const [editingGenre, setEditingGenre] = useState<GenreWithCount | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Confirmation state
  const [deletingGenre, setDeletingGenre] = useState<GenreWithCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenGenreExplorer = async (genre: GenreWithCount) => {
    setSelectedGenre(genre);
    setGenreContentLoading(true);
    setGenreTypeFilter('ALL');
    setGenreItemSearch('');
    try {
      const items = await api.admin.listContent({
        genre: genre.slug || genre.name,
        limit: 1000
      });
      setGenreContent(items);
    } catch (err: any) {
      showToast(err.message || 'Failed to load content for this genre.', 'error');
    } finally {
      setGenreContentLoading(false);
    }
  };

  const handleCloseGenreExplorer = () => {
    setSelectedGenre(null);
    setGenreContent([]);
  };

  const displayedGenreContent = genreContent.filter(item => {
    if (genreTypeFilter !== 'ALL' && item.type !== genreTypeFilter) {
      return false;
    }
    if (genreItemSearch.trim()) {
      const q = genreItemSearch.toLowerCase().trim();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.director && item.director.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const fetchGenres = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getGenres();
      setGenres(res.genres || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load genres.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  const handleCreateGenre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGenreName.trim()) {
      showToast('Genre name is required.', 'error');
      return;
    }
    try {
      setIsSubmittingAdd(true);
      await api.admin.createGenre(newGenreName.trim(), newGenreSlug.trim() || undefined);
      showToast(`Genre "${newGenreName.trim()}" created successfully!`, 'success');
      setShowAddModal(false);
      setNewGenreName('');
      setNewGenreSlug('');
      fetchGenres();
      refreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to create genre.', 'error');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleUpdateGenre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGenre || !editName.trim()) return;
    try {
      setIsSubmittingEdit(true);
      await api.admin.updateGenre(editingGenre.id, editName.trim(), editSlug.trim() || undefined);
      showToast(`Genre updated to "${editName.trim()}".`, 'success');
      setEditingGenre(null);
      fetchGenres();
      refreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to update genre.', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteGenre = async () => {
    if (!deletingGenre) return;
    try {
      setIsDeleting(true);
      await api.admin.deleteGenre(deletingGenre.id);
      showToast(`Genre "${deletingGenre.name}" safely deleted.`, 'success');
      setDeletingGenre(null);
      fetchGenres();
      refreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete genre.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredGenres = genres.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    g.slug.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {selectedGenre ? (
        /* ========================================================================= */
        /* B & C: DEDICATED ADMIN GENRE EXPLORER                                    */
        /* ========================================================================= */
        <div>
          {/* Back Navigation Bar */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={handleCloseGenreExplorer}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
            >
              <ArrowLeft size={16} />
              <span>← Back to All Genres</span>
            </button>
          </div>

          {/* Genre Explorer Header Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '20px',
              border: '1.5px solid rgba(245, 166, 35, 0.25)',
              padding: '28px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(245, 166, 35, 0.15)',
                  border: '2px solid var(--brand-gold, #F5C518)',
                  color: 'var(--brand-gold, #F5C518)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(245, 166, 35, 0.25)'
                }}
              >
                <Tag size={28} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                    {selectedGenre.name}
                  </h1>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--brand-gold, #F5C518)',
                      fontSize: '12px',
                      fontWeight: 700,
                      fontFamily: 'monospace'
                    }}
                  >
                    slug: {selectedGenre.slug}
                  </span>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60A5FA',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    {genreContent.length} database entries
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '6px', margin: 0 }}>
                  Showing all movies and series dynamically tagged with this genre. Multiple genres are correctly cross-referenced.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => onNavigateTab('admin-content')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 18px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 166, 35, 0.12)',
                  border: '1px solid rgba(245, 166, 35, 0.3)',
                  color: 'var(--brand-gold, #F5C518)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Film size={15} />
                <span>Open in Catalog</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>

          {/* Filtering and Search Controls */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
              <input
                type="text"
                placeholder={`Search inside ${selectedGenre.name}...`}
                value={genreItemSearch}
                onChange={e => setGenreItemSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Type Filter Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setGenreTypeFilter('ALL')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: genreTypeFilter === 'ALL' ? '1px solid var(--brand-gold, #F5C518)' : '1px solid transparent',
                  backgroundColor: genreTypeFilter === 'ALL' ? 'rgba(245, 166, 35, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                  color: genreTypeFilter === 'ALL' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                All ({genreContent.length})
              </button>
              <button
                onClick={() => setGenreTypeFilter('movie')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: genreTypeFilter === 'movie' ? '1px solid var(--brand-gold, #F5C518)' : '1px solid transparent',
                  backgroundColor: genreTypeFilter === 'movie' ? 'rgba(245, 166, 35, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                  color: genreTypeFilter === 'movie' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Movies ({genreContent.filter(c => c.type === 'movie').length})
              </button>
              <button
                onClick={() => setGenreTypeFilter('series')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: genreTypeFilter === 'series' ? '1px solid var(--brand-gold, #F5C518)' : '1px solid transparent',
                  backgroundColor: genreTypeFilter === 'series' ? 'rgba(245, 166, 35, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                  color: genreTypeFilter === 'series' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Series ({genreContent.filter(c => c.type === 'series').length})
              </button>
            </div>
          </div>

          {/* Genre Titles List */}
          {genreContentLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '12px', color: '#9CA3AF' }}>
              <Loader2 className="animate-spin" size={28} style={{ color: 'var(--brand-gold, #F5C518)' }} />
              <span style={{ fontSize: '15px' }}>Loading titles for {selectedGenre.name}...</span>
            </div>
          ) : displayedGenreContent.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '70px 20px',
                backgroundColor: 'var(--bg-surface, #12121A)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <Film size={48} style={{ color: '#4B5563', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                No Titles Found in {selectedGenre.name}
              </h3>
              <p style={{ color: '#9CA3AF', fontSize: '14px' }}>
                {genreItemSearch ? 'No titles match your search criteria.' : 'No titles currently mapped to this genre.'}
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
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                        Title & Artwork
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                        Type
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                        Year
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                        Access / Pricing
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                        Genres & Metadata
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'right' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedGenreContent.map(item => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* Poster Thumbnail & Title */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <img
                              src={item.posterUrl}
                              alt={item.title}
                              style={{
                                width: '46px',
                                height: '65px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                backgroundColor: '#1C1917',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                flexShrink: 0
                              }}
                              onError={e => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300';
                              }}
                            />
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>
                                {item.title}
                              </div>
                              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                                {item.director ? `Directed by ${item.director}` : item.language}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              backgroundColor:
                                item.type === 'movie'
                                  ? 'rgba(245, 166, 35, 0.15)'
                                  : 'rgba(168, 85, 247, 0.15)',
                              color:
                                item.type === 'movie'
                                  ? 'var(--brand-gold, #F5C518)'
                                  : '#C084FC',
                              border:
                                item.type === 'movie'
                                  ? '1px solid rgba(245, 166, 35, 0.3)'
                                  : '1px solid rgba(168, 85, 247, 0.3)'
                            }}
                          >
                            {item.type === 'movie' ? <Film size={12} /> : <Tv size={12} />}
                            {item.type}
                          </span>
                        </td>

                        {/* Year */}
                        <td style={{ padding: '14px 20px', fontSize: '14px', color: '#E5E7EB', fontWeight: 600 }}>
                          {item.releaseYear}
                        </td>

                        {/* Price / Free Status */}
                        <td style={{ padding: '14px 20px' }}>
                          {item.price === 0 || item.isFree ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                color: '#4ADE80',
                                fontSize: '11px',
                                fontWeight: 800,
                                border: '1px solid rgba(34, 197, 94, 0.3)'
                              }}
                            >
                              <Check size={11} />
                              FREE
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(245, 166, 35, 0.15)',
                                color: 'var(--brand-gold, #F5C518)',
                                fontSize: '12px',
                                fontWeight: 800,
                                border: '1px solid rgba(245, 166, 35, 0.3)'
                              }}
                            >
                              ₹{item.price}
                            </span>
                          )}
                        </td>

                        {/* Basic Metadata & Multiple Genres */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9CA3AF' }}>
                              {item.rating && (
                                <span style={{ color: 'var(--brand-gold, #F5C518)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Star size={11} fill="var(--brand-gold, #F5C518)" /> {item.rating}
                                </span>
                              )}
                              {item.runtime && <span>• {item.runtime}</span>}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {item.genres?.slice(0, 4).map((g: any, idx: number) => {
                                const gName = typeof g === 'string' ? g : g.name;
                                const isCurrent = gName.toLowerCase() === selectedGenre.name.toLowerCase();
                                return (
                                  <span
                                    key={idx}
                                    style={{
                                      fontSize: '10px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: isCurrent ? 'rgba(245, 166, 35, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                                      color: isCurrent ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                                      fontWeight: isCurrent ? 800 : 500
                                    }}
                                  >
                                    {gName}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </td>

                        {/* C: Smooth Catalog Integration */}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => onNavigateTab('admin-editor', item.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(245, 166, 35, 0.12)',
                                border: '1px solid rgba(245, 166, 35, 0.3)',
                                color: 'var(--brand-gold, #F5C518)',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <Edit2 size={12} />
                              <span>Edit Details</span>
                            </button>
                            <button
                              onClick={() => onNavigateTab('admin-content')}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#D1D5DB',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>Catalog</span>
                              <ArrowUpRight size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* TAXONOMY LIST VIEW                                                       */
        /* ========================================================================= */
        <div>
          {/* Sub-navigation tabs: Taxonomy vs Top 10 Curation */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '14px' }}>
            <button
              type="button"
              onClick={() => setActiveSection('taxonomy')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: activeSection === 'taxonomy' ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.06)',
                color: activeSection === 'taxonomy' ? '#0E0E12' : '#FFFFFF',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Tag size={16} />
              <span>Genres & Categories</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('top10')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: activeSection === 'top10' ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.06)',
                color: activeSection === 'top10' ? '#0E0E12' : '#FFFFFF',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Flame size={16} />
              <span>Top 10 Row Curation</span>
            </button>
          </div>

          {activeSection === 'top10' ? (
            <AdminTop10Page onNavigateTab={onNavigateTab} />
          ) : (
            <div>
              {/* Page Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                    Genre & Category Taxonomy
                  </h1>
                  <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
                    Manage genres, studio categories, and explore titles grouped by genre dynamically from the database.
                  </p>
                </div>

            <button
              onClick={() => setShowAddModal(true)}
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
              <span>Add New Genre</span>
            </button>
          </div>

          {/* Search Bar */}
          <div
            style={{
              marginBottom: '24px',
              backgroundColor: 'var(--bg-surface, #12121A)',
              padding: '16px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ position: 'relative', maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
              <input
                type="text"
                placeholder="Search genres by name or slug..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 42px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Genres Table */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px', color: '#9CA3AF' }}>
              <Loader2 className="animate-spin" size={24} style={{ color: 'var(--brand-gold, #F5C518)' }} />
              <span>Loading catalog genres...</span>
            </div>
          ) : filteredGenres.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: 'var(--bg-surface, #12121A)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <Tag size={48} style={{ color: '#4B5563', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>No Genres Found</h3>
              <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No genres match your search.</p>
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
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Genre Name</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>System Slug</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Linked Titles</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGenres.map(genre => (
                      <tr
                        key={genre.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <div
                            onClick={() => handleOpenGenreExplorer(genre)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                          >
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(245, 197, 24, 0.12)',
                                color: 'var(--brand-gold, #F5C518)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Tag size={16} />
                            </div>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>
                              {genre.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                          {genre.slug}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            onClick={() => handleOpenGenreExplorer(genre)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: genre.contentCount > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                              color: genre.contentCount > 0 ? '#60A5FA' : '#9CA3AF',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Film size={13} />
                            <span>{genre.contentCount} titles</span>
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => handleOpenGenreExplorer(genre)}
                              style={{
                                padding: '8px 14px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(245, 166, 35, 0.12)',
                                border: '1px solid rgba(245, 166, 35, 0.35)',
                                color: 'var(--brand-gold, #F5C518)',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Film size={14} />
                              <span>Explore Titles ({genre.contentCount})</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingGenre(genre);
                                setEditName(genre.name);
                                setEditSlug(genre.slug);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Edit2 size={14} />
                              <span>Rename</span>
                            </button>
                            <button
                              onClick={() => setDeletingGenre(genre)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#F87171',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
            </div>
          )}
        </div>
      )}

      {/* Add Genre Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              Create New Genre
            </h2>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '20px' }}>
              This genre will be immediately available in the content editor and consumer discovery filters.
            </p>

            <form onSubmit={handleCreateGenre} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Genre Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Psychological Thriller"
                  value={newGenreName}
                  onChange={e => {
                    setNewGenreName(e.target.value);
                    if (!newGenreSlug) {
                      setNewGenreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }
                  }}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Slug (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. psychological-thriller"
                  value={newGenreSlug}
                  onChange={e => setNewGenreSlug(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  type="submit"
                  disabled={isSubmittingAdd}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--brand-gold, #F5C518)',
                    color: '#0E0E12',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isSubmittingAdd ? 'Saving...' : 'Create Genre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Genre Modal */}
      {editingGenre && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              Rename Genre: {editingGenre.name}
            </h2>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '20px' }}>
              Changes will update across all {editingGenre.contentCount} titles tagged with this genre.
            </p>

            <form onSubmit={handleUpdateGenre} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Genre Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Slug
                </label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={e => setEditSlug(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingGenre(null)}
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
                  type="submit"
                  disabled={isSubmittingEdit}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--brand-gold, #F5C518)',
                    color: '#0E0E12',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingGenre && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
                  Delete Genre: {deletingGenre.name}?
                </h3>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                  Safe relational unlinking
                </p>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: 1.5, marginBottom: '20px' }}>
              Deleting this genre will safely unlink it from <strong>{deletingGenre.contentCount} titles</strong>.
              The underlying movies and series will <strong>NOT</strong> be deleted.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeletingGenre(null)}
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
                onClick={handleDeleteGenre}
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
    </div>
  );
};

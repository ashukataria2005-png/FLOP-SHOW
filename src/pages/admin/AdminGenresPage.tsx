import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  Film,
  AlertTriangle
} from 'lucide-react';

interface GenreWithCount {
  id: string;
  name: string;
  slug: string;
  contentCount: number;
}

interface AdminGenresPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminGenresPage: React.FC<AdminGenresPageProps> = () => {
  const { showToast, refreshCatalog } = useApp();
  const [genres, setGenres] = useState<GenreWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Genre & Category Taxonomy
          </h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
            Manage central genres used for catalog classification, navigation tabs, and content discovery.
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: genre.contentCount > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                          color: genre.contentCount > 0 ? '#60A5FA' : '#9CA3AF',
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                      >
                        <Film size={13} />
                        <span>{genre.contentCount} titles</span>
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
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

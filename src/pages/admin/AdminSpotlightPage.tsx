import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { ContentItem } from '../../types/content';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Search,
  Check,
  Loader2,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit3,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';

interface AdminSpotlightPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminSpotlightPage: React.FC<AdminSpotlightPageProps> = ({ onNavigateTab }) => {
  const { showToast, refreshCatalog } = useApp();
  const [spotlights, setSpotlights] = useState<ContentItem[]>([]);
  const [catalog, setCatalog] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Editor modal state
  // editingIndex: number (0..N-1 for changing existing, or spotlights.length for new)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [stagedItem, setStagedItem] = useState<ContentItem | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalTypeFilter, setModalTypeFilter] = useState<'ALL' | 'MOVIE' | 'SERIES'>('ALL');
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [spotlightsData, contentData] = await Promise.all([
        api.admin.getSpotlights(),
        api.admin.listContent({ status: 'PUBLISHED', limit: 1000, all: true })
      ]);
      setSpotlights(spotlightsData || []);
      setCatalog(contentData || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load Cinematic Spotlight or catalog data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter catalog items for the editor search
  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => {
      // Must be published
      if (item.status && item.status !== 'PUBLISHED') return false;

      const matchesType =
        modalTypeFilter === 'ALL' ||
        (modalTypeFilter === 'MOVIE' && item.type === 'movie') ||
        (modalTypeFilter === 'SERIES' && item.type === 'series');

      const q = modalSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.type && item.type.toLowerCase().includes(q)) ||
        (item.director && item.director.toLowerCase().includes(q)) ||
        (item.genres && item.genres.some(g => g.toLowerCase().includes(q)));

      return matchesType && matchesSearch;
    });
  }, [catalog, modalTypeFilter, modalSearchQuery]);

  // Open modal to add a brand new spotlight
  const handleOpenAddModal = () => {
    setEditingIndex(spotlights.length);
    setIsAddingNew(true);
    setStagedItem(null);
    setModalSearchQuery('');
    setModalTypeFilter('ALL');
  };

  // Open modal to change an existing spotlight
  const handleOpenChangeModal = (index: number) => {
    setEditingIndex(index);
    setIsAddingNew(false);
    setStagedItem(spotlights[index] || null);
    setModalSearchQuery('');
    setModalTypeFilter('ALL');
  };

  // Close editor modal
  const handleCloseModal = () => {
    setEditingIndex(null);
    setIsAddingNew(false);
    setStagedItem(null);
    setModalSearchQuery('');
  };

  // Explicit SAVE action: writes changes to database
  const handleSaveStagedSpotlight = async () => {
    if (!stagedItem || editingIndex === null) {
      showToast('Please select a movie or series title first.', 'error');
      return;
    }

    try {
      setSaving(true);
      let newSpotlights: ContentItem[] = [];

      if (isAddingNew || editingIndex >= spotlights.length) {
        newSpotlights = [...spotlights, stagedItem];
      } else {
        newSpotlights = spotlights.map((s, idx) => (idx === editingIndex ? stagedItem : s));
      }

      // Deduplicate keeping first occurrence
      const deduplicated: ContentItem[] = [];
      const seenIds = new Set<string>();
      for (const item of newSpotlights) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          deduplicated.push(item);
        }
      }

      const res = await api.admin.setSpotlights(deduplicated.map(s => s.id));
      if (res.success) {
        setSpotlights(res.spotlights || deduplicated);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeStr);
        showToast(
          isAddingNew
            ? `Spotlight #${editingIndex + 1} ("${stagedItem.title}") created and saved!`
            : `Spotlight #${editingIndex + 1} updated to "${stagedItem.title}" and saved!`,
          'success'
        );
        handleCloseModal();
        refreshCatalog();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save Cinematic Spotlight.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete an individual spotlight entry and close the gap
  const handleDeleteSpotlight = async (index: number) => {
    const targetTitle = spotlights[index]?.title || `Spotlight #${index + 1}`;
    try {
      setSaving(true);
      setDeletingIndex(index);
      const newSpotlights = spotlights.filter((_, idx) => idx !== index);
      const res = await api.admin.setSpotlights(newSpotlights.map(s => s.id));
      if (res.success) {
        setSpotlights(res.spotlights || newSpotlights);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeStr);
        showToast(`Spotlight #${index + 1} ("${targetTitle}") deleted. Remaining spotlights reordered.`, 'info');
        refreshCatalog();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete Cinematic Spotlight.', 'error');
    } finally {
      setSaving(false);
      setDeletingIndex(null);
    }
  };

  // Reorder spotlights up or down
  const handleMoveSpotlight = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= spotlights.length) return;
    const newOrder = [...spotlights];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    try {
      setSaving(true);
      const res = await api.admin.setSpotlights(newOrder.map(s => s.id));
      if (res.success) {
        setSpotlights(res.spotlights || newOrder);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeStr);
        showToast('Spotlight sequence updated and saved.', 'success');
        refreshCatalog();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reorder spotlights.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#9CA3AF' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--brand-gold, #F5C518)' }} />
        <span>Loading Cinematic Spotlight configuration...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Navigation & Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <button
            onClick={() => onNavigateTab('admin-dashboard')}
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
            <span>Back to Dashboard</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)'
              }}
            >
              <Sparkles size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
                Cinematic Spotlight Management
              </h1>
              <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '4px 0 0' }}>
                Unlimited ordered cinematic banners. Each spotlight is rendered as an interstitial full-width section between Discover page catalog rows.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Saved Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {saving ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                border: '1px solid rgba(245, 197, 24, 0.3)',
                color: 'var(--brand-gold, #F5C518)',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              <Loader2 className="animate-spin" size={14} />
              <span>Saving to database...</span>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34D399',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              <Check size={14} />
              <span>Database Synced {lastSavedTime ? `(${lastSavedTime})` : '✓'}</span>
            </div>
          )}

          <button
            onClick={handleOpenAddModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: 'var(--brand-gold, #F5C518)',
              border: 'none',
              color: '#0E0E12',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(245, 197, 24, 0.25)'
            }}
          >
            <Plus size={16} />
            <span>+ Add More Spotlight</span>
          </button>
        </div>
      </div>

      {/* Main List Section */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--brand-gold, #F5C518)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
              Configured Spotlight Order ({spotlights.length} Total)
            </h2>
          </div>
          <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
            Render sequence: Spotlight #1 → 2 catalog rows → Spotlight #2 → 2 catalog rows → ...
          </span>
        </div>

        {spotlights.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-surface, #12121A)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              textAlign: 'center'
            }}
          >
            <AlertCircle size={36} style={{ color: '#6B7280', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px' }}>
              No Cinematic Spotlights Configured
            </h3>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '0 0 20px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
              There are currently no promotional banners configured. Click below to search the central catalog and create your first Spotlight.
            </p>
            <button
              onClick={handleOpenAddModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '8px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                border: 'none',
                color: '#0E0E12',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              <span>+ Add First Spotlight</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {spotlights.map((spot, idx) => (
              <div
                key={spot.id}
                style={{
                  backgroundColor: 'var(--bg-surface, #12121A)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  flexWrap: 'wrap',
                  position: 'relative'
                }}
              >
                {/* Left: Badge, Artwork & Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', minWidth: '280px', flex: 1 }}>
                  {/* Slot Number Badge */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '64px',
                      padding: '8px 4px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(245, 197, 24, 0.12)',
                      border: '1px solid var(--brand-gold, #F5C518)',
                      color: 'var(--brand-gold, #F5C518)',
                      flexShrink: 0
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em' }}>SLOT</span>
                    <span style={{ fontSize: '18px', fontWeight: 900, lineHeight: 1.1 }}>#{idx + 1}</span>
                  </div>

                  {/* Artwork Preview (Backdrop or Poster) */}
                  <div
                    style={{
                      width: '120px',
                      height: '70px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#1E1E2A',
                      flexShrink: 0,
                      position: 'relative',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}
                  >
                    <img
                      src={spot.backdropUrl || spot.posterUrl}
                      alt={spot.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=300&q=80';
                      }}
                    />
                  </div>

                  {/* Title & Metadata */}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        {spot.title}
                      </h3>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: spot.type === 'series' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(245, 197, 24, 0.2)',
                          color: spot.type === 'series' ? '#60A5FA' : '#F5C518',
                          border: spot.type === 'series' ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid rgba(245, 197, 24, 0.3)'
                        }}
                      >
                        {spot.type.toUpperCase()}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: '#34D399',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        Active ✓
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
                      {spot.releaseYear} • {spot.genres?.slice(0, 3).join(', ')}
                    </p>

                    {spot.tagline && (
                      <p style={{ fontSize: '12px', color: '#F5C518', fontStyle: 'italic', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Slogan: &quot;{spot.tagline}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Individual Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Sequence Reordering */}
                  <button
                    onClick={() => handleMoveSpotlight(idx, 'up')}
                    disabled={idx === 0 || saving}
                    title="Move Up"
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: idx === 0 ? '#4B5563' : '#E5E7EB',
                      cursor: idx === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    onClick={() => handleMoveSpotlight(idx, 'down')}
                    disabled={idx === spotlights.length - 1 || saving}
                    title="Move Down"
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: idx === spotlights.length - 1 ? '#4B5563' : '#E5E7EB',
                      cursor: idx === spotlights.length - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronDown size={15} />
                  </button>

                  {/* Change Title */}
                  <button
                    onClick={() => handleOpenChangeModal(idx)}
                    disabled={saving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(245, 197, 24, 0.15)',
                      border: '1px solid var(--brand-gold, #F5C518)',
                      color: 'var(--brand-gold, #F5C518)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={14} />
                    <span>Change Movie/Series</span>
                  </button>

                  {/* Delete Spotlight */}
                  <button
                    onClick={() => handleDeleteSpotlight(idx)}
                    disabled={saving}
                    title="Delete this Spotlight"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#F87171',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {deletingIndex === idx ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    <span>Delete Spotlight</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Bottom Add More Button */}
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <button
                onClick={handleOpenAddModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 28px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 197, 24, 0.12)',
                  border: '1.5px dashed var(--brand-gold, #F5C518)',
                  color: 'var(--brand-gold, #F5C518)',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Plus size={16} />
                <span>+ Add More Spotlight (Spotlight #{spotlights.length + 1})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Add New Spotlight / Change Movie/Series */}
      {editingIndex !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '88vh',
              backgroundColor: '#12121A',
              border: '1px solid rgba(245, 197, 24, 0.35)',
              borderRadius: '18px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(245, 197, 24, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} color="var(--brand-gold, #F5C518)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                    {isAddingNew
                      ? `Add New Spotlight (Spotlight #${editingIndex + 1})`
                      : `Change Movie/Series for Spotlight #${editingIndex + 1}`}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                    Select a published movie or series from the central database, then click Save below.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Search & Filters Bar */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {/* Type selector */}
              <div style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  type="button"
                  onClick={() => setModalTypeFilter('ALL')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: modalTypeFilter === 'ALL' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                    color: modalTypeFilter === 'ALL' ? '#000000' : '#9CA3AF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setModalTypeFilter('MOVIE')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: modalTypeFilter === 'MOVIE' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                    color: modalTypeFilter === 'MOVIE' ? '#000000' : '#9CA3AF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Movies
                </button>
                <button
                  type="button"
                  onClick={() => setModalTypeFilter('SERIES')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: modalTypeFilter === 'SERIES' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                    color: modalTypeFilter === 'SERIES' ? '#000000' : '#9CA3AF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Series
                </button>
              </div>

              {/* Search input */}
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6B7280' }} />
                <input
                  type="text"
                  placeholder="Search central catalog by title, genre, director or series..."
                  value={modalSearchQuery}
                  onChange={e => setModalSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Results Content List */}
            <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                Showing {filteredCatalog.length} of {catalog.length >= 300 ? '300+' : `${catalog.length}`} titles
              </div>
              {filteredCatalog.length === 0 ? (
                <div style={{ padding: '36px 0', textAlign: 'center', color: '#9CA3AF' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    No published titles match &quot;{modalSearchQuery}&quot;.
                  </p>
                </div>
              ) : (
                filteredCatalog.map(item => {
                  const isCurrentlyStaged = stagedItem?.id === item.id;
                  // Check if already assigned to a DIFFERENT spotlight
                  const existingSpotIdx = spotlights.findIndex(s => s.id === item.id);
                  const isAssignedElsewhere = existingSpotIdx !== -1 && existingSpotIdx !== editingIndex;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!isAssignedElsewhere) {
                          setStagedItem(item);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: isCurrentlyStaged
                          ? 'rgba(245, 197, 24, 0.12)'
                          : isAssignedElsewhere
                          ? 'rgba(255, 255, 255, 0.01)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: isCurrentlyStaged
                          ? '1.5px solid var(--brand-gold, #F5C518)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        gap: '12px',
                        cursor: isAssignedElsewhere ? 'not-allowed' : 'pointer',
                        opacity: isAssignedElsewhere ? 0.6 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <img
                          src={item.posterUrl || item.backdropUrl}
                          alt={item.title}
                          style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                          onError={e => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=150&q=80';
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                              {item.title}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: item.type === 'series' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(245, 197, 24, 0.2)',
                                color: item.type === 'series' ? '#60A5FA' : '#F5C518'
                              }}
                            >
                              {item.type.toUpperCase()}
                            </span>
                            {isAssignedElsewhere && (
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#9CA3AF', backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                                Already in Spotlight #{existingSpotIdx + 1}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                            {item.releaseYear} • {item.genres?.slice(0, 3).join(', ')}
                            {item.tagline ? ` • "${item.tagline}"` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Select indicator */}
                      <div>
                        {isCurrentlyStaged ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--brand-gold, #F5C518)',
                              color: '#0E0E12',
                              fontSize: '12px',
                              fontWeight: 800
                            }}
                          >
                            <Check size={14} />
                            <span>Selected</span>
                          </div>
                        ) : isAssignedElsewhere ? (
                          <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>Unavailable</span>
                        ) : (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setStagedItem(item);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#E5E7EB',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Bottom: Staged Item Preview & Explicit SAVE Button */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}
            >
              {stagedItem ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={stagedItem.posterUrl || stagedItem.backdropUrl}
                    alt={stagedItem.title}
                    style={{ width: '36px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <div>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Selected for Spotlight #{editingIndex + 1}:
                    </span>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: '2px 0 0' }}>
                      {stagedItem.title} ({stagedItem.type.toUpperCase()}, {stagedItem.releaseYear})
                    </h4>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#9CA3AF', fontSize: '13px' }}>
                  Please click on a movie or series title above to select it.
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#D1D5DB',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveStagedSpotlight}
                  disabled={!stagedItem || saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    backgroundColor: stagedItem ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: stagedItem ? '#0E0E12' : '#6B7280',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: stagedItem && !saving ? 'pointer' : 'not-allowed',
                    boxShadow: stagedItem ? '0 4px 16px rgba(245, 197, 24, 0.3)' : 'none'
                  }}
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>{isAddingNew ? 'SAVE SPOTLIGHT' : 'SAVE CHANGES'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

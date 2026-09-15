import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { ContentItem } from '../../types/content';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Search,
  Check,
  Film,
  Tv,
  Loader2,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit3,
  Plus
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

  // Active target slot for assignment (0 = Slot 1, 1 = Slot 2, 2 = Slot 3)
  const [targetSlotIndex, setTargetSlotIndex] = useState<number>(0);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MOVIE' | 'SERIES'>('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const [spotlightsData, contentData] = await Promise.all([
        api.admin.getSpotlights(),
        api.admin.listContent({ status: 'PUBLISHED', limit: 100 })
      ]);
      setSpotlights(spotlightsData || []);
      setCatalog(contentData || []);

      // If slot 0 is already occupied, pick the first empty slot as default target
      const firstEmptySlot = [0, 1, 2].find(idx => !(spotlightsData || [])[idx]);
      if (firstEmptySlot !== undefined) {
        setTargetSlotIndex(firstEmptySlot);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load Cinematic Spotlight or catalog data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter published catalog items
  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => {
      // Must be published
      if (item.status && item.status !== 'PUBLISHED') return false;

      const matchesType =
        typeFilter === 'ALL' ||
        (typeFilter === 'MOVIE' && item.type === 'movie') ||
        (typeFilter === 'SERIES' && item.type === 'series');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.type && item.type.toLowerCase().includes(q)) ||
        (item.director && item.director.toLowerCase().includes(q)) ||
        (item.genres && item.genres.some(g => g.toLowerCase().includes(q)));

      return matchesType && matchesSearch;
    });
  }, [catalog, typeFilter, searchQuery]);

  // Set title to target slot and persist to central database
  const handleSetSlot = async (slotIdx: number, item: ContentItem) => {
    try {
      setSaving(true);
      const newItems = [...spotlights];
      if (slotIdx < newItems.length) {
        newItems[slotIdx] = item;
      } else {
        newItems.push(item);
      }

      // Deduplicate keeping first occurrence, maximum 3 slots
      const deduplicated: ContentItem[] = [];
      const seenIds = new Set<string>();
      for (const spot of newItems) {
        if (!seenIds.has(spot.id) && deduplicated.length < 3) {
          seenIds.add(spot.id);
          deduplicated.push(spot);
        }
      }

      const res = await api.admin.setSpotlights(deduplicated.map(s => s.id));
      if (res.success) {
        setSpotlights(res.spotlights || deduplicated);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeStr);
        showToast(`Cinematic Spotlight #${slotIdx + 1} set to "${item.title}" and saved!`, 'success');
        refreshCatalog();

        // Advance to next empty slot if one remains
        const nextEmpty = [0, 1, 2].find(idx => !(res.spotlights || deduplicated)[idx]);
        if (nextEmpty !== undefined) {
          setTargetSlotIndex(nextEmpty);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update Cinematic Spotlight.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Clear a spotlight slot and persist to central database
  const handleClearSlot = async (slotIdx: number) => {
    try {
      setSaving(true);
      const newItems = spotlights.filter((_, idx) => idx !== slotIdx);
      const res = await api.admin.setSpotlights(newItems.map(s => s.id));
      if (res.success) {
        setSpotlights(res.spotlights || newItems);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeStr);
        showToast(`Cinematic Spotlight #${slotIdx + 1} removed and saved.`, 'info');
        refreshCatalog();
        setTargetSlotIndex(slotIdx);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to clear spotlight slot.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reorder spotlights and persist
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
        showToast('Spotlight order updated and saved.', 'success');
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
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
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
              <Sparkles size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
                Cinematic Spotlight Control
              </h1>
              <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '4px 0 0' }}>
                Manage the 3 promotional cinematic spotlight banners displayed across the Discover page. All selections persist immediately to the central database.
              </p>
            </div>
          </div>
        </div>

        {/* Unmistakable Saved State Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {saving ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                border: '1px solid rgba(245, 197, 24, 0.3)',
                color: 'var(--brand-gold, #F5C518)',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              <Loader2 className="animate-spin" size={16} />
              <span>Saving changes to database...</span>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34D399',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              <Check size={16} />
              <span>Database Synced {lastSavedTime ? `(${lastSavedTime})` : '✓'}</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: The 3 Dedicated Spotlight Slots */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '18px',
          border: '1px solid rgba(245, 197, 24, 0.35)',
          padding: '24px',
          marginBottom: '36px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} color="var(--brand-gold, #F5C518)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
              Cinematic Spotlight Slots (3 Available)
            </h2>
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: spotlights.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
              color: spotlights.length > 0 ? '#34D399' : '#9CA3AF',
              border: spotlights.length > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {spotlights.length} of 3 Slots Assigned
          </span>
        </div>

        {/* 3 Slot Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {[0, 1, 2].map(slotIdx => {
            const spot = spotlights[slotIdx] || null;
            const isTargeted = targetSlotIndex === slotIdx;

            return (
              <div
                key={slotIdx}
                style={{
                  borderRadius: '14px',
                  border: isTargeted
                    ? '2px solid var(--brand-gold, #F5C518)'
                    : spot
                    ? '1px solid rgba(245, 197, 24, 0.3)'
                    : '1px dashed rgba(255, 255, 255, 0.15)',
                  backgroundColor: isTargeted
                    ? 'rgba(245, 197, 24, 0.05)'
                    : spot
                    ? 'rgba(255, 255, 255, 0.03)'
                    : 'rgba(255, 255, 255, 0.01)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  position: 'relative'
                }}
              >
                {/* Slot Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(245, 197, 24, 0.15)',
                        border: '1px solid var(--brand-gold, #F5C518)',
                        color: 'var(--brand-gold, #F5C518)',
                        fontWeight: 900,
                        fontSize: '11px',
                        letterSpacing: '0.04em'
                      }}
                    >
                      SLOT #{slotIdx + 1}
                    </span>
                    {isTargeted && (
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#F5C518', textTransform: 'uppercase' }}>
                        ● Assigning Here
                      </span>
                    )}
                  </div>

                  {spot && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => handleMoveSpotlight(slotIdx, 'up')}
                        disabled={slotIdx === 0}
                        title="Move Up"
                        style={{
                          padding: '4px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: slotIdx === 0 ? '#4B5563' : '#E5E7EB',
                          cursor: slotIdx === 0 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        onClick={() => handleMoveSpotlight(slotIdx, 'down')}
                        disabled={slotIdx >= spotlights.length - 1}
                        title="Move Down"
                        style={{
                          padding: '4px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: slotIdx >= spotlights.length - 1 ? '#4B5563' : '#E5E7EB',
                          cursor: slotIdx >= spotlights.length - 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Slot Body */}
                {spot ? (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <img
                      src={spot.posterUrl || spot.backdropUrl}
                      alt={spot.title}
                      style={{ width: '56px', height: '80px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {spot.title}
                        </h4>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: spot.type === 'series' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(245, 197, 24, 0.2)',
                            color: spot.type === 'series' ? '#60A5FA' : '#F5C518'
                          }}
                        >
                          {spot.type.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0' }}>
                        {spot.releaseYear} • {spot.genres?.slice(0, 2).join(', ')}
                      </p>
                      {spot.tagline && (
                        <p style={{ fontSize: '11px', color: '#F5C518', fontStyle: 'italic', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          &quot;{spot.tagline}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '20px 10px', textAlign: 'center', color: '#6B7280' }}>
                    <p style={{ fontSize: '13px', margin: '0 0 6px', color: '#9CA3AF', fontWeight: 600 }}>
                      Empty Slot #{slotIdx + 1}
                    </p>
                    <p style={{ fontSize: '11px', margin: 0 }}>
                      Select a movie or series from below to assign.
                    </p>
                  </div>
                )}

                {/* Slot Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => setTargetSlotIndex(slotIdx)}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '6px',
                      backgroundColor: isTargeted ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.08)',
                      color: isTargeted ? '#000000' : '#FFFFFF',
                      border: isTargeted ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.12)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {spot ? <Edit3 size={13} /> : <Plus size={13} />}
                    <span>{isTargeted ? 'Assigning Here' : spot ? 'Change Title' : 'Assign to Slot'}</span>
                  </button>

                  {spot && (
                    <button
                      type="button"
                      onClick={() => handleClearSlot(slotIdx)}
                      title="Remove Spotlight"
                      style={{
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#F87171',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Select Title from Central Database Catalog */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
                Select Title to Assign to Spotlight #{targetSlotIndex + 1}
              </h2>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(245, 197, 24, 0.15)',
                  border: '1px solid var(--brand-gold, #F5C518)',
                  color: 'var(--brand-gold, #F5C518)',
                  fontWeight: 800,
                  fontSize: '11px'
                }}
              >
                TARGET: SLOT #{targetSlotIndex + 1}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Showing {filteredCatalog.length} published titles from the central database catalog.
            </p>
          </div>

          {/* Quick Slot Target Switcher */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', marginRight: '4px' }}>Assign to:</span>
            {[0, 1, 2].map(sIdx => (
              <button
                key={sIdx}
                type="button"
                onClick={() => setTargetSlotIndex(sIdx)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: targetSlotIndex === sIdx ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: targetSlotIndex === sIdx ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: targetSlotIndex === sIdx ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Slot #{sIdx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Type Filters Bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap' }}>
          {/* Type Filter Buttons */}
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
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search published central catalog by title, genre, director or series..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
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
                ? 'No published movies or series found in database.'
                : `No published titles match "${searchQuery}".`}
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
                  const existingSlot = spotlights.findIndex(s => s.id === item.id);
                  const isAssigned = existingSlot !== -1;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        backgroundColor: isAssigned ? 'rgba(245, 197, 24, 0.04)' : 'transparent',
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
                              {isAssigned && (
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
                                  SPOTLIGHT #{existingSlot + 1}
                                </span>
                              )}
                            </div>
                            {item.tagline && (
                              <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', marginTop: '2px' }}>
                                &quot;{item.tagline}&quot;
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
                        {isAssigned ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(245, 197, 24, 0.12)',
                              border: '1px solid rgba(245, 197, 24, 0.3)',
                              color: 'var(--brand-gold, #F5C518)',
                              fontSize: '12px',
                              fontWeight: 700
                            }}
                          >
                            <Check size={14} />
                            <span>In Slot #{existingSlot + 1}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetSlot(targetSlotIndex, item)}
                            disabled={saving}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(245, 197, 24, 0.15)',
                              border: '1px solid var(--brand-gold, #F5C518)',
                              color: 'var(--brand-gold, #F5C518)',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: saving ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Plus size={14} />
                            <span>Set as Spotlight #{targetSlotIndex + 1}</span>
                          </button>
                        )}
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

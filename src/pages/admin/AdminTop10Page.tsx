import React, { useState, useEffect, useMemo } from 'react';
import { ContentItem } from '../../types/content';
import { useApp } from '../../context/AppContext';
import {
  Flame,
  Search,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  RotateCcw,
  X,
  Sliders
} from 'lucide-react';

interface AdminTop10PageProps {
  onNavigateTab?: (tab: string, param?: string) => void;
}

export const AdminTop10Page: React.FC<AdminTop10PageProps> = () => {
  const { showToast, catalog, refreshCatalog } = useApp();
  const [selectedItems, setSelectedItems] = useState<ContentItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalTypeFilter, setModalTypeFilter] = useState<'ALL' | 'MOVIE' | 'SERIES'>('ALL');

  // Top 10 homepage vertical position index (0 = very top below Hero, 1 = after 1st row, 2 = after 2nd row, etc.)
  const [positionIndex, setPositionIndex] = useState<number>(() => {
    try {
      const val = localStorage.getItem('flopshow_top10_position_index');
      return val !== null ? parseInt(val, 10) : 1;
    } catch {
      return 1;
    }
  });

  const handleUpdatePosition = (newIdx: number) => {
    setPositionIndex(newIdx);
    try {
      localStorage.setItem('flopshow_top10_position_index', String(newIdx));
      window.dispatchEvent(new CustomEvent('flopshow_top10_position_updated', { detail: newIdx }));
      window.dispatchEvent(new Event('storage'));
      showToast(`Top 10 row position updated to Slot #${newIdx + 1} on Homepage`, 'success');
    } catch (_) {}
  };

  // Load initial Top 10 from localStorage or populate from highest rated
  useEffect(() => {
    let savedIds: string[] = [];
    try {
      const raw = localStorage.getItem('flopshow_top10_ids');
      if (raw) savedIds = JSON.parse(raw);
    } catch (_) {}

    const list: ContentItem[] = [];
    const seen = new Set<string>();

    if (Array.isArray(savedIds) && savedIds.length > 0) {
      for (const id of savedIds) {
        const found = catalog.find(c => c.id === id);
        if (found && !seen.has(found.id)) {
          seen.add(found.id);
          list.push(found);
        }
      }
    }

    if (list.length < 10) {
      const candidates = [...catalog]
        .filter(c => !seen.has(c.id))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));

      for (const cand of candidates) {
        if (list.length >= 10) break;
        seen.add(cand.id);
        list.push(cand);
      }
    }

    setSelectedItems(list.slice(0, 10));
  }, [catalog]);

  // Save current order
  const handleSaveOrder = (newList?: ContentItem[]) => {
    const toSave = newList || selectedItems;
    try {
      const ids = toSave.map(item => item.id);
      localStorage.setItem('flopshow_top10_ids', JSON.stringify(ids));
      showToast('Top 10 daily ranking configuration saved successfully!', 'success');
      refreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to save Top 10 configuration', 'error');
    }
  };

  // Move item up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...selectedItems];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    setSelectedItems(next);
    handleSaveOrder(next);
  };

  // Move item down
  const handleMoveDown = (index: number) => {
    if (index >= selectedItems.length - 1) return;
    const next = [...selectedItems];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    setSelectedItems(next);
    handleSaveOrder(next);
  };

  // Remove item
  const handleRemove = (index: number) => {
    const next = selectedItems.filter((_, idx) => idx !== index);
    setSelectedItems(next);
    handleSaveOrder(next);
    showToast('Removed title from Top 10 list', 'info');
  };

  // Reset to default top rated
  const handleReset = () => {
    const sorted = [...catalog]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);
    setSelectedItems(sorted);
    handleSaveOrder(sorted);
    showToast('Reset Top 10 to platform top rated titles', 'info');
  };

  // Add item from modal
  const handleSelectItem = (item: ContentItem) => {
    if (selectedItems.some(s => s.id === item.id)) {
      showToast(`"${item.title}" is already in the Top 10 list.`, 'error');
      return;
    }
    if (selectedItems.length >= 10) {
      showToast('Top 10 list is full. Remove an item first before adding a new one.', 'error');
      return;
    }
    const next = [...selectedItems, item];
    setSelectedItems(next);
    handleSaveOrder(next);
    setIsModalOpen(false);
    showToast(`Added "${item.title}" at Rank #${next.length}`, 'success');
  };

  // Filter catalog for modal picker
  const filteredCatalog = useMemo(() => {
    return catalog.filter(c => {
      const matchType =
        modalTypeFilter === 'ALL' ||
        (modalTypeFilter === 'MOVIE' && c.type === 'movie') ||
        (modalTypeFilter === 'SERIES' && c.type === 'series');

      const q = modalSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.genres && c.genres.some(g => g.toLowerCase().includes(q)));

      return matchType && matchSearch;
    });
  }, [catalog, modalTypeFilter, modalSearch]);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(245, 197, 24, 0.25))',
              border: '1px solid rgba(245, 197, 24, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold, #F5C518)'
            }}
          >
            <Flame size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
              Top 10 Row Management
            </h1>
            <p style={{ fontSize: '13.5px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Curate and order positions 1 through 10 for the homepage "Top 10 in FlopShow Today" row.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} />
            <span>Reset to Top Rated</span>
          </button>

          {selectedItems.length < 10 && (
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                border: 'none',
                color: '#0E0E12',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(245, 197, 24, 0.25)'
              }}
            >
              <Plus size={16} />
              <span>Add Title to Top 10</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION: Homepage Placement & Slot Selection */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '16px',
          border: '1px solid rgba(245, 197, 24, 0.3)',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Sliders size={18} color="var(--brand-gold, #F5C518)" />
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Homepage Row Placement & Vertical Ordering
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
              Control where the "Top 10 in FlopShow Today" row appears on the Discover page relative to other category rows.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#D1D5DB', fontWeight: 600 }}>Active Slot:</span>
            <select
              value={positionIndex}
              onChange={e => handleUpdatePosition(parseInt(e.target.value, 10))}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--brand-gold, #F5C518)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={0} style={{ backgroundColor: '#12121A', color: '#FFFFFF' }}>Slot 1: Very Top (Directly under Hero Banner)</option>
              <option value={1} style={{ backgroundColor: '#12121A', color: '#FFFFFF' }}>Slot 2: After 1st Content Row (Standard Default)</option>
              <option value={2} style={{ backgroundColor: '#12121A', color: '#FFFFFF' }}>Slot 3: After 2nd Content Row</option>
              <option value={3} style={{ backgroundColor: '#12121A', color: '#FFFFFF' }}>Slot 4: After 3rd Content Row</option>
              <option value={4} style={{ backgroundColor: '#12121A', color: '#FFFFFF' }}>Slot 5: After 4th Content Row</option>
              <option value={5} style={{ backgroundColor: '#12121A', color: '#FFFFFF' }}>Slot 6: Mid-Page (After 5th Content Row)</option>
              <option value={7} style={{ backgroundColor: '#12121A', color: '#FFFFFF' }}>Slot 8: Lower Page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ordered List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {selectedItems.map((item, idx) => {
          const rank = idx + 1;
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderRadius: '12px',
                backgroundColor: 'rgba(22, 22, 34, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              {/* Left: Rank Badge + Poster + Title Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '260px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: rank <= 3 ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.1)',
                    color: rank <= 3 ? '#0E0E12' : '#FFFFFF',
                    fontWeight: 900,
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  #{rank}
                </div>

                <div
                  style={{
                    width: '44px',
                    height: '62px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    backgroundColor: '#1E1E2D',
                    flexShrink: 0
                  }}
                >
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    {item.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9CA3AF', marginTop: '3px' }}>
                    <span style={{ textTransform: 'capitalize' }}>{item.type}</span>
                    <span>•</span>
                    <span>{item.releaseYear}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--brand-gold, #F5C518)', fontWeight: 700 }}>★ {item.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Reorder Up / Down + Delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    backgroundColor: idx === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: idx === 0 ? '#4B5563' : '#FFFFFF',
                    cursor: idx === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Up"
                >
                  <ChevronUp size={16} />
                </button>

                <button
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === selectedItems.length - 1}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    backgroundColor: idx === selectedItems.length - 1 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: idx === selectedItems.length - 1 ? '#4B5563' : '#FFFFFF',
                    cursor: idx === selectedItems.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Down"
                >
                  <ChevronDown size={16} />
                </button>

                <button
                  onClick={() => handleRemove(idx)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                    cursor: 'pointer'
                  }}
                  title="Remove from Top 10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Title Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              backgroundColor: '#12121A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Select a Title for Top 10
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search input & Filter */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '0 12px'
                }}
              >
                <Search size={16} color="#9CA3AF" />
                <input
                  type="text"
                  placeholder="Search catalog titles..."
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    padding: '10px 0',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {(['ALL', 'MOVIE', 'SERIES'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setModalTypeFilter(type)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: modalTypeFilter === type ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.06)',
                      color: modalTypeFilter === type ? '#0E0E12' : '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      cursor: 'pointer'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '6px'
              }}
            >
              {filteredCatalog.map(item => {
                const isAlreadySelected = selectedItems.some(s => s.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => !isAlreadySelected && handleSelectItem(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: isAlreadySelected ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: isAlreadySelected ? 'default' : 'pointer',
                      opacity: isAlreadySelected ? 0.5 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '52px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: '#1E1E2D'
                        }}
                      >
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          {item.type} • {item.releaseYear} • ★ {item.rating.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {isAlreadySelected ? (
                      <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>
                        In Top 10
                      </span>
                    ) : (
                      <button
                        type="button"
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--brand-gold, #F5C518)',
                          color: '#0E0E12',
                          fontWeight: 700,
                          fontSize: '12px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Select
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

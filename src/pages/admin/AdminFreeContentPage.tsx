import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { ContentItem } from '../../types/content';
import {
  Gift,
  Search,
  Film,
  Tv,
  Check,
  Edit3,
  Loader2,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface AdminFreeContentPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminFreeContentPage: React.FC<AdminFreeContentPageProps> = ({ onNavigateTab }) => {
  const { catalog, refreshCatalog, showToast } = useApp();
  const activeCatalog = catalog || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [pricingFilter, setPricingFilter] = useState<'ALL' | 'FREE' | 'PAID'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MOVIE' | 'SERIES'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Statistics
  const totalCount = activeCatalog.length;
  const freeCount = activeCatalog.filter(c => c.isFree || c.price === 0).length;
  const paidCount = totalCount - freeCount;

  // Filtered titles
  const filteredItems = useMemo(() => {
    return activeCatalog.filter(item => {
      const isFree = Boolean(item.isFree || item.price === 0);

      // Search match
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.director && item.director.toLowerCase().includes(q)) ||
        (item.cast && item.cast.some(c => c.toLowerCase().includes(q)));

      // Pricing match
      const matchesPricing =
        pricingFilter === 'ALL' ||
        (pricingFilter === 'FREE' && isFree) ||
        (pricingFilter === 'PAID' && !isFree);

      // Type match
      const matchesType =
        typeFilter === 'ALL' ||
        (typeFilter === 'MOVIE' && item.type === 'movie') ||
        (typeFilter === 'SERIES' && item.type === 'series');

      return matchesSearch && matchesPricing && matchesType;
    });
  }, [activeCatalog, searchQuery, pricingFilter, typeFilter]);

  // Direct toggle between Free (₹0) and Paid
  const handleToggleFree = async (item: ContentItem) => {
    const isCurrentlyFree = Boolean(item.isFree || item.price === 0);
    const newPriceRupees = isCurrentlyFree
      ? (item.type === 'series' ? 20 : 10) // default paid price when switching from Free to Paid
      : 0; // ₹0 for 100% Free

    try {
      setUpdatingId(item.id);
      await api.admin.updatePrice(item.id, newPriceRupees);
      await refreshCatalog();

      if (newPriceRupees === 0) {
        showToast(`"${item.title}" is now 100% FREE! Added to Free sections.`, 'success');
      } else {
        showToast(`"${item.title}" is now PAID (₹${newPriceRupees}). Removed from Free sections.`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update pricing.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Custom price update
  const handleSetExactPrice = async (item: ContentItem, priceInput: string) => {
    const parsed = parseInt(priceInput, 10);
    if (isNaN(parsed) || parsed < 0) {
      showToast('Please enter a valid price (0 or more).', 'error');
      return;
    }

    try {
      setUpdatingId(item.id);
      await api.admin.updatePrice(item.id, parsed);
      await refreshCatalog();

      if (parsed === 0) {
        showToast(`"${item.title}" set to 100% FREE!`, 'success');
      } else {
        showToast(`"${item.title}" price set to ₹${parsed}.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update price.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981'
              }}
            >
              <Gift size={20} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Free Content Manager
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary, #9CA3AF)', fontSize: '13px', marginTop: '4px' }}>
            Control which movies and series are 100% Free vs Paid with 1-click toggles. Changes sync immediately to Home and Search.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => refreshCatalog()}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} />
            <span>Refresh Catalog</span>
          </button>
          <button
            onClick={() => onNavigateTab('admin-content')}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Film size={14} />
            <span>All Catalog & Media</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        <div
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-surface, #12121A)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
            Total Titles in Catalog
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', marginTop: '6px' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Movies & Webseries in FLOPSHOW
          </div>
        </div>

        <div
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
              100% Free Titles
            </span>
            <Sparkles size={16} color="#10B981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>
            {freeCount}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(16, 185, 129, 0.8)', marginTop: '4px' }}>
            Visible in Home & Search Free Sections
          </div>
        </div>

        <div
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: 'rgba(245, 166, 35, 0.08)',
            border: '1px solid rgba(245, 166, 35, 0.3)'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase' }}>
            Paid / Premium Titles
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', marginTop: '6px' }}>
            {paidCount}
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            Requires Wallet Balance (₹10 / ₹20)
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 260px', position: 'relative' }}>
          <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter by title, director, or cast..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Pricing Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPricingFilter('ALL')}
            className={`btn btn-sm ${pricingFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Pricing ({totalCount})
          </button>
          <button
            onClick={() => setPricingFilter('FREE')}
            className={`btn btn-sm ${pricingFilter === 'FREE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              backgroundColor: pricingFilter === 'FREE' ? '#10B981' : 'rgba(16, 185, 129, 0.12)',
              color: pricingFilter === 'FREE' ? '#07070A' : '#10B981',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              fontWeight: 700
            }}
          >
            100% Free ({freeCount})
          </button>
          <button
            onClick={() => setPricingFilter('PAID')}
            className={`btn btn-sm ${pricingFilter === 'PAID' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Paid Only ({paidCount})
          </button>
        </div>

        {/* Type Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setTypeFilter('ALL')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: typeFilter === 'ALL' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            All Types
          </button>
          <button
            onClick={() => setTypeFilter('MOVIE')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: typeFilter === 'MOVIE' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#F59E0B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Film size={13} />
            <span>Movies</span>
          </button>
          <button
            onClick={() => setTypeFilter('SERIES')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: typeFilter === 'SERIES' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: '#A78BFA',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Tv size={13} />
            <span>Series</span>
          </button>
        </div>
      </div>

      {/* Content Table */}
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
                  Title & Details
                </th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Type & Genres
                </th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Current Status
                </th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Direct Free / Paid Toggle
                </th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                    No content matches your active filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isFree = Boolean(item.isFree || item.price === 0);
                  const isUpdating = updatingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        backgroundColor: isFree ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Title & Artwork */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <img
                            src={item.posterUrl || item.backdropUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200'}
                            alt={item.title}
                            style={{
                              width: '46px',
                              height: '64px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              backgroundColor: '#1E1E28',
                              flexShrink: 0
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                              {item.releaseYear} • {item.runtime || (item.seasonsCount ? `${item.seasonsCount} Seasons` : 'HD')} • {item.language}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type & Genres */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              width: 'fit-content',
                              backgroundColor: item.type === 'movie' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                              color: item.type === 'movie' ? '#F59E0B' : '#A78BFA'
                            }}
                          >
                            {item.type === 'movie' ? <Film size={11} /> : <Tv size={11} />}
                            <span>{item.type.toUpperCase()}</span>
                          </span>
                          <span style={{ fontSize: '11px', color: '#6B7280' }}>
                            {item.genres?.slice(0, 2).join(', ') || 'General'}
                          </span>
                        </div>
                      </td>

                      {/* Current Status */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 800,
                              backgroundColor: isFree ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 166, 35, 0.15)',
                              border: isFree ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 166, 35, 0.35)',
                              color: isFree ? '#10B981' : 'var(--brand-gold, #F5C518)'
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: isFree ? '#10B981' : 'var(--brand-gold, #F5C518)'
                              }}
                            />
                            <span>{isFree ? '100% FREE' : `PAID (₹${item.price})`}</span>
                          </span>
                        </div>
                      </td>

                      {/* 1-Click Direct Toggle */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleFree(item)}
                            title={isFree ? 'Switch to Paid content' : 'Make 100% Free for everyone'}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              border: isFree ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.2)',
                              backgroundColor: isFree ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                              color: isFree ? '#10B981' : '#D1D5DB',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: isUpdating ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isUpdating ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : isFree ? (
                              <Check size={14} />
                            ) : (
                              <Gift size={14} />
                            )}
                            <span>{isFree ? 'FREE Active (Click to Make Paid)' : 'Make 100% FREE'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Quick Price Setter (if paid) */}
                          {!isFree && (
                            <select
                              value={item.price}
                              disabled={isUpdating}
                              onChange={e => handleSetExactPrice(item, e.target.value)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                color: '#FFFFFF',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                fontSize: '12px',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="10">₹10</option>
                              <option value="20">₹20</option>
                              <option value="30">₹30</option>
                              <option value="50">₹50</option>
                              <option value="100">₹100</option>
                            </select>
                          )}

                          <button
                            type="button"
                            onClick={() => onNavigateTab('admin-editor', item.id)}
                            title="Open full title editor"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#D1D5DB',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Edit3 size={13} />
                            <span>Edit Title</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

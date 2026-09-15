import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { ContentItem } from '../../types/content';
import {
  Users,
  Film,
  Tv,
  DollarSign,
  Plus,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  Eye,
  EyeOff,
  Wallet,
  Tag,
  Sliders,
  CreditCard,
  Edit3,
  Crown,
  Trash2,
  X,
  Search,
  ChevronUp,
  ChevronDown,
  Check
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalMovies: number;
  totalSeries: number;
  totalPublished: number;
  totalUnpublished: number;
  totalPurchases: number;
  totalRevenueRupees: number;
  walletActivity: {
    totalRechargeRupees: number;
    totalTransactions: number;
  };
  currentTrending1: {
    id: string;
    title: string;
    type: string;
    poster: string;
    backdrop: string;
    priceRupees: number;
    releaseYear: number;
  } | null;
  recentlyAddedContent: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    poster: string;
    priceRupees: number;
    releaseYear: number;
    createdAt: string;
  }>;
  recentPurchases: Array<{
    id: string;
    userName: string;
    userEmail: string;
    contentTitle: string;
    amountRupees: number;
    purchasedAt: string;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  }>;
}

interface AdminDashboardPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigateTab }) => {
  const { catalog, refreshCatalog, showToast } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentHero, setCurrentHero] = useState<ContentItem | null>(null);
  const [currentSpotlights, setCurrentSpotlights] = useState<ContentItem[]>([]);
  const [heroModalOpen, setHeroModalOpen] = useState(false);
  const [spotlightModalOpen, setSpotlightModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ContentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [modalCatalog, setModalCatalog] = useState<ContentItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [spotlightSaving, setSpotlightSaving] = useState(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);

  const fetchHeroAndSpotlights = async () => {
    try {
      const [hero, spots] = await Promise.all([
        api.admin.getHero(),
        api.admin.getSpotlights()
      ]);
      setCurrentHero(hero);
      setCurrentSpotlights(spots || []);
    } catch {
      // ignore
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.admin.getDashboard();
      setStats(data as DashboardStats);
      await fetchHeroAndSpotlights();
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSelectHero = async (item: ContentItem) => {
    try {
      const res = await api.admin.setHero(item.id);
      if (res.success) {
        setCurrentHero(res.hero || item);
        showToast(`"${item.title}" is now designated as Home Hero!`, 'success');
        refreshCatalog();
        setHeroModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update Home Hero.', 'error');
    }
  };

  const handleClearHero = async () => {
    try {
      const res = await api.admin.setHero(null);
      if (res.success) {
        setCurrentHero(null);
        showToast('Home Hero removed. No title is currently active as Home Hero.', 'info');
        refreshCatalog();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to clear Home Hero.', 'error');
    }
  };

  const openSpotlightModalForSlot = async (slotIdx: number | null) => {
    setTargetSlotIndex(slotIdx);
    setSelectedCandidate(null);
    setSearchQuery('');
    setSpotlightModalOpen(true);
    try {
      setModalLoading(true);
      const items = await api.admin.listContent({ status: 'PUBLISHED', limit: 100 });
      setModalCatalog(items || []);
    } catch {
      setModalCatalog(catalog.filter(c => !c.status || c.status === 'PUBLISHED'));
    } finally {
      setModalLoading(false);
    }
  };

  const handleSetSlotSpotlight = async (slotIdx: number, item: ContentItem) => {
    try {
      setSpotlightSaving(true);
      const newItems = [...currentSpotlights];
      if (slotIdx < newItems.length) {
        newItems[slotIdx] = item;
      } else {
        newItems.push(item);
      }
      // Deduplicate keeping first occurrence, UNLIMITED dynamic spotlights
      const deduplicated: ContentItem[] = [];
      const seenIds = new Set<string>();
      for (const spot of newItems) {
        if (!seenIds.has(spot.id)) {
          seenIds.add(spot.id);
          deduplicated.push(spot);
        }
      }
      const res = await api.admin.setSpotlights(deduplicated.map(s => s.id));
      if (res.success) {
        setCurrentSpotlights(res.spotlights || deduplicated);
        setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast(`Cinematic Spotlight #${slotIdx + 1} saved successfully as "${item.title}"!`, 'success');
        setSpotlightModalOpen(false);
        setSelectedCandidate(null);
        refreshCatalog();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update Cinematic Spotlight.', 'error');
    } finally {
      setSpotlightSaving(false);
    }
  };

  const handleClearSlotSpotlight = async (slotIdx: number) => {
    try {
      setSpotlightSaving(true);
      const newItems = currentSpotlights.filter((_, idx) => idx !== slotIdx);
      const res = await api.admin.setSpotlights(newItems.map(s => s.id));
      if (res.success) {
        setCurrentSpotlights(res.spotlights || newItems);
        setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast(`Spotlight #${slotIdx + 1} deleted and remaining slots reordered.`, 'info');
        refreshCatalog();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to clear spotlight slot.', 'error');
    } finally {
      setSpotlightSaving(false);
    }
  };

  const handleMoveSpotlight = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSpotlights.length) return;
    const newOrder = [...currentSpotlights];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    try {
      setSpotlightSaving(true);
      const res = await api.admin.setSpotlights(newOrder.map(s => s.id));
      if (res.success) {
        setCurrentSpotlights(res.spotlights || newOrder);
        setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast('Spotlight order updated and saved.', 'success');
        refreshCatalog();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reorder spotlights.', 'error');
    } finally {
      setSpotlightSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#9CA3AF' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--brand-gold, #F5C518)' }} />
        <span style={{ fontSize: '15px' }}>Loading administrator analytics...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <AlertCircle size={40} style={{ color: '#EF4444', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>Failed to Load Dashboard</h3>
        <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
        <button
          onClick={fetchStats}
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
          Retry Connection
        </button>
      </div>
    );
  }

  const metricCards = [
    {
      label: 'Gross Platform Revenue',
      value: `₹${stats.totalRevenueRupees.toLocaleString('en-IN')}`,
      subtext: `${stats.totalPurchases} completed unlocks`,
      icon: DollarSign,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)'
    },
    {
      label: 'Registered Audience',
      value: stats.totalUsers.toString(),
      subtext: 'Active user accounts',
      icon: Users,
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.12)'
    },
    {
      label: 'Catalog Movies',
      value: stats.totalMovies.toString(),
      subtext: 'Feature films in database',
      icon: Film,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)'
    },
    {
      label: 'Episodic Series',
      value: stats.totalSeries.toString(),
      subtext: 'Multi-season shows',
      icon: Tv,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.12)'
    },
    {
      label: 'Published Content',
      value: stats.totalPublished.toString(),
      subtext: 'Live on public app',
      icon: Eye,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)'
    },
    {
      label: 'Unpublished / Drafts',
      value: stats.totalUnpublished.toString(),
      subtext: 'Hidden from public app',
      icon: EyeOff,
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.12)'
    },
    {
      label: 'Wallet Recharges',
      value: `₹${(stats.walletActivity?.totalRechargeRupees || 0).toLocaleString('en-IN')}`,
      subtext: `${stats.walletActivity?.totalTransactions || 0} wallet ledger entries`,
      icon: Wallet,
      color: '#EC4899',
      bg: 'rgba(236, 72, 153, 0.12)'
    }
  ];

  const quickActions = [
    {
      label: 'Add Movie',
      desc: 'Create new feature film with poster, backdrop, trailer & main video',
      action: () => onNavigateTab('admin-editor', 'new_movie'),
      icon: Film,
      color: '#F59E0B'
    },
    {
      label: 'Add Series',
      desc: 'Create episodic series with seasons, episodes & video sources',
      action: () => onNavigateTab('admin-editor', 'new_series'),
      icon: Tv,
      color: '#8B5CF6'
    },
    {
      label: 'Manage Content',
      desc: 'Browse catalog, toggle publish status, manage pricing & Trending #1',
      action: () => onNavigateTab('admin-content'),
      icon: Eye,
      color: '#3B82F6'
    },
    {
      label: 'Manage Users',
      desc: 'Inspect user directory, activate/suspend accounts & audit purchases',
      action: () => onNavigateTab('admin-users'),
      icon: Users,
      color: '#10B981'
    },
    {
      label: 'Manage Transactions',
      desc: 'Inspect content purchase audit trail and wallet recharge ledger',
      action: () => onNavigateTab('admin-transactions'),
      icon: CreditCard,
      color: '#EC4899'
    },
    {
      label: 'Manage Genres',
      desc: 'Create, rename, inspect usage, and safely unlink taxonomy genres',
      action: () => onNavigateTab('admin-genres'),
      icon: Tag,
      color: '#F5C518'
    },
    {
      label: 'Settings',
      desc: 'Configure platform name, currency symbol, resolution & system mode',
      action: () => onNavigateTab('admin-settings'),
      icon: Sliders,
      color: '#6366F1'
    }
  ];

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Mission Control Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
            Real-time catalog distribution, revenue telemetry, user accounts, and media control.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onNavigateTab('admin-editor', 'new_movie')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
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
            <span>Add Movie</span>
          </button>
          <button
            onClick={() => onNavigateTab('admin-editor', 'new_series')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '14px',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            <Plus size={18} />
            <span>Add Series</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '36px'
        }}
      >
        {metricCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              style={{
                backgroundColor: 'var(--bg-surface, #12121A)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', marginBottom: '6px', textTransform: 'uppercase' }}>
                  {card.label}
                </p>
                <p style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '6px' }}>
                  {card.value}
                </p>
                <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>
                  {card.subtext}
                </p>
              </div>

              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: card.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color
                }}
              >
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Trending #1 Showcase Banner */}
      <div
        style={{
          marginBottom: '36px',
          padding: '24px',
          borderRadius: '18px',
          background: stats.currentTrending1
            ? `linear-gradient(90deg, rgba(245, 197, 24, 0.12) 0%, rgba(18, 18, 26, 0.95) 100%), url(${stats.currentTrending1.backdrop || stats.currentTrending1.poster}) center/cover no-repeat`
            : 'var(--bg-surface, #12121A)',
          border: '1px solid rgba(245, 197, 24, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: 'var(--brand-gold, #F5C518)',
              color: '#0E0E12',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 900,
              fontSize: '14px',
              letterSpacing: '0.04em'
            }}
          >
            <TrendingUp size={20} />
            <span>TRENDING #1</span>
          </div>

          <div>
            {stats.currentTrending1 ? (
              <>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
                  {stats.currentTrending1.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#D1D5DB', margin: 0 }}>
                  {stats.currentTrending1.type} • {stats.currentTrending1.releaseYear} • {stats.currentTrending1.priceRupees === 0 ? 'FREE' : `₹${stats.currentTrending1.priceRupees}`}
                </p>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px' }}>
                  No Trending #1 Assigned
                </h3>
                <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
                  Select a title in Content Management to highlight it as the #1 spotlight on FLOPSHOW.
                </p>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            if (stats.currentTrending1) {
              onNavigateTab('admin-editor', stats.currentTrending1.id);
            } else {
              onNavigateTab('admin-content');
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Edit3 size={15} />
          <span>{stats.currentTrending1 ? 'Edit Trending #1' : 'Select Trending #1'}</span>
        </button>
      </div>

      {/* Dedicated HOME HERO Control Block */}
      <div
        style={{
          marginBottom: '28px',
          padding: '24px',
          borderRadius: '18px',
          background: currentHero
            ? `linear-gradient(90deg, rgba(168, 85, 247, 0.15) 0%, rgba(18, 18, 26, 0.96) 100%), url(${currentHero.backdropUrl || currentHero.posterUrl}) center/cover no-repeat`
            : 'var(--bg-surface, #12121A)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#A855F7',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 900,
              fontSize: '14px',
              letterSpacing: '0.04em'
            }}
          >
            <Crown size={20} />
            <span>HOME HERO</span>
          </div>

          <div>
            {currentHero ? (
              <>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
                  {currentHero.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#D1D5DB', margin: 0 }}>
                  {currentHero.type.toUpperCase()} • {currentHero.releaseYear} • {currentHero.price === 0 ? 'FREE' : `₹${currentHero.price}`}
                  {currentHero.tagline ? ` • "${currentHero.tagline}"` : ''}
                </p>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px' }}>
                  No Home Hero Assigned
                </h3>
                <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
                  Designate the premier banner displayed at the very top of the Discover page.
                </p>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              setSearchQuery('');
              setHeroModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              backgroundColor: 'rgba(168, 85, 247, 0.2)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#E9D5FF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Edit3 size={15} />
            <span>{currentHero ? 'Change Hero' : 'Select Hero'}</span>
          </button>

          {currentHero && (
            <button
              onClick={handleClearHero}
              title="Remove Home Hero"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#F87171',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Trash2 size={15} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Dedicated CINEMATIC SPOTLIGHT Control Block */}
      <div
        style={{
          marginBottom: '36px',
          padding: '24px',
          borderRadius: '18px',
          backgroundColor: 'var(--bg-surface, #12121A)',
          border: '1px solid rgba(245, 197, 24, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {/* Spotlight Block Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                border: '1.5px solid var(--brand-gold, #F5C518)',
                color: 'var(--brand-gold, #F5C518)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 900,
                fontSize: '14px',
                letterSpacing: '0.04em'
              }}
            >
              <Sparkles size={20} />
              <span>CINEMATIC SPOTLIGHT</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: currentSpotlights.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  color: currentSpotlights.length > 0 ? '#34D399' : '#9CA3AF',
                  border: currentSpotlights.length > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {currentSpotlights.length} Spotlight{currentSpotlights.length !== 1 ? 's' : ''} Configured
              </span>
              <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
                Promotional banners interleaved naturally across Discover catalog (2 normal rows between consecutive spotlights)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Unmistakable Saved State Indicator */}
            {spotlightSaving ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(245, 197, 24, 0.15)',
                  border: '1px solid rgba(245, 197, 24, 0.3)',
                  color: 'var(--brand-gold, #F5C518)',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <Loader2 className="animate-spin" size={14} />
                <span>Saving to Database...</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: '#34D399',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <Check size={14} />
                <span>Database Synced {lastSavedTimestamp ? `(${lastSavedTimestamp})` : '✓'}</span>
              </div>
            )}

            <button
              onClick={() => openSpotlightModalForSlot(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                color: '#0E0E12',
                border: 'none',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Plus size={15} />
              <span>Add More Spotlight</span>
            </button>

            <button
              onClick={() => onNavigateTab('admin-spotlight')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#E5E7EB',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>Full Spotlight Manager</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {/* Dynamic Unlimited Spotlight List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {currentSpotlights.length === 0 ? (
            <div
              style={{
                borderRadius: '14px',
                border: '1px dashed rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                padding: '32px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <Sparkles size={32} style={{ color: 'var(--brand-gold, #F5C518)', opacity: 0.6 }} />
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                No Cinematic Spotlights Configured Yet
              </h4>
              <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0, maxWidth: '440px' }}>
                Add unlimited promotional spotlight banners to interleave between content rows on the Discover home page.
              </p>
              <button
                onClick={() => openSpotlightModalForSlot(null)}
                style={{
                  marginTop: '6px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--brand-gold, #F5C518)',
                  color: '#0E0E12',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Plus size={16} />
                <span>Add First Spotlight</span>
              </button>
            </div>
          ) : (
            currentSpotlights.map((spot, slotIdx) => (
              <div
                key={spot.id}
                style={{
                  borderRadius: '14px',
                  border: '1px solid rgba(245, 197, 24, 0.3)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
              >
                {/* Spotlight Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px', flex: 1 }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(245, 197, 24, 0.15)',
                      border: '1px solid var(--brand-gold, #F5C518)',
                      color: 'var(--brand-gold, #F5C518)',
                      fontWeight: 900,
                      fontSize: '12px',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    SPOTLIGHT #{slotIdx + 1}
                  </span>

                  <img
                    src={spot.posterUrl || spot.backdropUrl}
                    alt={spot.title}
                    style={{ width: '44px', height: '62px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                  />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                        {spot.title}
                      </h4>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 6px',
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
                        Saved & Active ✓
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '3px 0 0' }}>
                      {spot.releaseYear} • {spot.genres?.slice(0, 2).join(', ')}
                      {spot.tagline ? ` • Slogan: "${spot.tagline}"` : ''}
                    </p>
                  </div>
                </div>

                {/* Slot Action Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleMoveSpotlight(slotIdx, 'up')}
                    disabled={slotIdx === 0}
                    title="Move Up"
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: slotIdx === 0 ? '#4B5563' : '#E5E7EB',
                      cursor: slotIdx === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMoveSpotlight(slotIdx, 'down')}
                    disabled={slotIdx >= currentSpotlights.length - 1}
                    title="Move Down"
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: slotIdx >= currentSpotlights.length - 1 ? '#4B5563' : '#E5E7EB',
                      cursor: slotIdx >= currentSpotlights.length - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => openSpotlightModalForSlot(slotIdx)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(245, 197, 24, 0.15)',
                      border: '1px solid var(--brand-gold, #F5C518)',
                      color: 'var(--brand-gold, #F5C518)',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Change Movie/Series</span>
                  </button>
                  <button
                    onClick={() => handleClearSlotSpotlight(slotIdx)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#F87171',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete Spotlight</span>
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Bottom Add Button */}
          {currentSpotlights.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
              <button
                onClick={() => openSpotlightModalForSlot(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 197, 24, 0.12)',
                  border: '1.5px dashed var(--brand-gold, #F5C518)',
                  color: 'var(--brand-gold, #F5C518)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} />
                <span>+ Add More Spotlight (Spotlight #{currentSpotlights.length + 1})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Hub */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--brand-gold, #F5C518)' }} />
          <span>Quick Actions & Shortcuts</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {quickActions.map(qa => {
            const Icon = qa.icon;
            return (
              <div
                key={qa.label}
                onClick={qa.action}
                style={{
                  padding: '18px',
                  backgroundColor: 'var(--bg-surface, #12121A)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: `${qa.color}20`,
                          color: qa.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>{qa.label}</span>
                    </div>
                    <ArrowUpRight size={16} style={{ color: '#9CA3AF' }} />
                  </div>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, lineHeight: 1.4 }}>
                    {qa.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Recently Added Content & Recent Purchases */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Recently Added Content */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Recently Added Content</h3>
            <span
              onClick={() => onNavigateTab('admin-content')}
              style={{ fontSize: '13px', color: 'var(--brand-gold, #F5C518)', cursor: 'pointer', fontWeight: 600 }}
            >
              View catalog
            </span>
          </div>

          {stats.recentlyAddedContent?.length === 0 ? (
            <p style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>
              No content added yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.recentlyAddedContent?.map(item => (
                <div
                  key={item.id}
                  onClick={() => onNavigateTab('admin-editor', item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={item.poster}
                      alt={item.title}
                      style={{ width: '38px', height: '54px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 2px' }}>
                        {item.title}
                      </p>
                      <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                        {item.type} • {item.releaseYear} • {item.priceRupees === 0 ? 'FREE' : `₹${item.priceRupees}`}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: item.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: item.status === 'PUBLISHED' ? '#10B981' : '#F87171'
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchases */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Recent Completed Purchases</h3>
            <span
              onClick={() => onNavigateTab('admin-transactions')}
              style={{ fontSize: '13px', color: 'var(--brand-gold, #F5C518)', cursor: 'pointer', fontWeight: 600 }}
            >
              View ledger
            </span>
          </div>

          {stats.recentPurchases.length === 0 ? (
            <p style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>
              No purchases recorded yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.recentPurchases.slice(0, 6).map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 2px' }}>
                      {item.contentTitle || 'Content Unlock'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                      {item.userEmail} • {item.purchasedAt ? new Date(item.purchasedAt).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: '#10B981',
                        display: 'block'
                      }}
                    >
                      ₹{item.amountRupees || 0}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>CONFIRMED</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Title Selection Modal for Hero / Spotlight */}
      {(heroModalOpen || spotlightModalOpen) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => {
            setHeroModalOpen(false);
            setSpotlightModalOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '82vh',
              backgroundColor: '#12121A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {heroModalOpen ? <Crown size={20} color="#A855F7" /> : <Sparkles size={20} color="#F5C518" />}
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
                  {heroModalOpen
                    ? 'Select Home Hero Title'
                    : `Select Movie / Series for Spotlight Slot #${(targetSlotIndex !== null ? targetSlotIndex : currentSpotlights.length) + 1}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setHeroModalOpen(false);
                  setSpotlightModalOpen(false);
                }}
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

            {/* Modal Search Input */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6B7280' }} />
                <input
                  type="text"
                  placeholder="Search central catalog by title, genre, director or movie/series..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Content List / Candidate Preview */}
            <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* If candidate selected for Spotlight, show clear preview & explicit SAVE button */}
              {selectedCandidate && !heroModalOpen && (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(245, 197, 24, 0.08)',
                    border: '1.5px solid var(--brand-gold, #F5C518)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(245, 197, 24, 0.2)',
                        color: 'var(--brand-gold, #F5C518)',
                        fontWeight: 900,
                        fontSize: '12px',
                        letterSpacing: '0.04em'
                      }}
                    >
                      SELECTED FOR SPOTLIGHT #{(targetSlotIndex !== null ? targetSlotIndex : currentSpotlights.length) + 1}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      Pending explicit confirmation — click Save below
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <img
                      src={selectedCandidate.posterUrl || selectedCandidate.backdropUrl}
                      alt={selectedCandidate.title}
                      style={{ width: '60px', height: '88px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                          {selectedCandidate.title}
                        </h4>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: selectedCandidate.type === 'series' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(245, 197, 24, 0.2)',
                            color: selectedCandidate.type === 'series' ? '#60A5FA' : '#F5C518',
                            border: selectedCandidate.type === 'series' ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid rgba(245, 197, 24, 0.3)'
                          }}
                        >
                          {selectedCandidate.type.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
                        {selectedCandidate.releaseYear} • {selectedCandidate.genres?.join(', ')}
                      </p>
                      {selectedCandidate.tagline && (
                        <p style={{ fontSize: '12px', color: 'var(--brand-gold, #F5C518)', margin: '4px 0 0', fontStyle: 'italic' }}>
                          &ldquo;{selectedCandidate.tagline}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '6px' }}>
                    <button
                      onClick={() => handleSetSlotSpotlight(targetSlotIndex !== null ? targetSlotIndex : currentSpotlights.length, selectedCandidate)}
                      disabled={spotlightSaving}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--brand-gold, #F5C518)',
                        color: '#0E0E12',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 900,
                        letterSpacing: '0.04em',
                        cursor: spotlightSaving ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {spotlightSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                      <span>
                        {targetSlotIndex !== null && targetSlotIndex < currentSpotlights.length ? 'SAVE CHANGES' : 'SAVE SPOTLIGHT'}
                      </span>
                    </button>
                    <button
                      onClick={() => setSelectedCandidate(null)}
                      style={{
                        padding: '12px 18px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: '#E5E7EB',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Choose Different Title
                    </button>
                  </div>
                </div>
              )}

              {modalLoading ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <Loader2 className="animate-spin" size={20} style={{ color: 'var(--brand-gold, #F5C518)' }} />
                  <span>Loading catalog items from central database...</span>
                </div>
              ) : null}

              {(() => {
                const baseList = modalCatalog.length > 0 ? modalCatalog : catalog;
                const publishedList = baseList.filter(item => !item.status || item.status === 'PUBLISHED');
                const q = searchQuery.toLowerCase().trim();
                const filtered = publishedList.filter(item => {
                  if (!q) return true;
                  return (
                    item.title.toLowerCase().includes(q) ||
                    (item.type && item.type.toLowerCase().includes(q)) ||
                    (item.director && item.director.toLowerCase().includes(q)) ||
                    (item.genres && item.genres.some(g => g.toLowerCase().includes(q)))
                  );
                });

                if (filtered.length === 0 && !modalLoading) {
                  return (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF' }}>
                      <p style={{ margin: 0, fontSize: '14px' }}>
                        No published titles found matching &quot;{searchQuery}&quot;.
                      </p>
                    </div>
                  );
                }

                return filtered.map(item => {
                  const isCurrentHero = currentHero?.id === item.id;
                  const existingSpotlightSlot = currentSpotlights.findIndex(s => s.id === item.id);
                  const isAlreadySpotlight = existingSpotlightSlot !== -1;
                  const isTrending1 = stats?.currentTrending1?.id === item.id;
                  const isCandidate = selectedCandidate?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: isCandidate ? 'rgba(245, 197, 24, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: isCandidate ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.06)',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={item.posterUrl || item.backdropUrl}
                          alt={item.title}
                          style={{ width: '38px', height: '52px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                              {item.title}
                            </span>
                            {isTrending1 && (
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#F5C518', backgroundColor: 'rgba(245, 197, 24, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                #1 TRENDING
                              </span>
                            )}
                            {isCurrentHero && (
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#C084FC', backgroundColor: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                HERO
                              </span>
                            )}
                            {isAlreadySpotlight && (
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#60A5FA', backgroundColor: 'rgba(96, 165, 250, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                SPOTLIGHT #{existingSpotlightSlot + 1}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                            {item.type.toUpperCase()} • {item.releaseYear} • {item.genres?.slice(0, 2).join(', ')}
                          </p>
                        </div>
                      </div>

                      {heroModalOpen ? (
                        <button
                          onClick={() => handleSelectHero(item)}
                          disabled={isCurrentHero}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            backgroundColor: isCurrentHero ? 'rgba(255, 255, 255, 0.05)' : 'rgba(168, 85, 247, 0.25)',
                            border: isCurrentHero ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #A855F7',
                            color: isCurrentHero ? '#6B7280' : '#E9D5FF',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isCurrentHero ? 'default' : 'pointer'
                          }}
                        >
                          {isCurrentHero ? 'Active Hero' : 'Select as Hero'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedCandidate(item)}
                          disabled={isAlreadySpotlight && targetSlotIndex !== existingSpotlightSlot}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            backgroundColor: isAlreadySpotlight && targetSlotIndex !== existingSpotlightSlot
                              ? 'rgba(255, 255, 255, 0.05)'
                              : isCandidate
                              ? 'var(--brand-gold, #F5C518)'
                              : 'rgba(245, 197, 24, 0.2)',
                            border: isAlreadySpotlight && targetSlotIndex !== existingSpotlightSlot
                              ? '1px solid rgba(255, 255, 255, 0.1)'
                              : '1px solid var(--brand-gold, #F5C518)',
                            color: isAlreadySpotlight && targetSlotIndex !== existingSpotlightSlot
                              ? '#6B7280'
                              : isCandidate
                              ? '#0E0E12'
                              : 'var(--brand-gold, #F5C518)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isAlreadySpotlight && targetSlotIndex !== existingSpotlightSlot ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isAlreadySpotlight && targetSlotIndex !== existingSpotlightSlot
                            ? `In Spotlight #${existingSpotlightSlot + 1}`
                            : isCandidate
                            ? '✓ Candidate Selected'
                            : 'Select Title'}
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

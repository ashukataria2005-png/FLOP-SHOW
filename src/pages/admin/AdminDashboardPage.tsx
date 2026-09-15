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
  ChevronDown
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleAddSpotlight = async (item: ContentItem) => {
    try {
      const res = await api.admin.addSpotlight(item.id);
      if (res.success) {
        setCurrentSpotlights(res.spotlights || []);
        showToast(`"${item.title}" added to Cinematic Spotlight!`, 'success');
        setSpotlightModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to add Cinematic Spotlight.', 'error');
    }
  };

  const handleRemoveSpotlight = async (contentId: string) => {
    try {
      const res = await api.admin.removeSpotlight(contentId);
      if (res.success) {
        setCurrentSpotlights(res.spotlights || []);
        showToast('Spotlight item removed.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove Cinematic Spotlight.', 'error');
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
      const res = await api.admin.setSpotlights(newOrder.map(s => s.id));
      if (res.success) {
        setCurrentSpotlights(res.spotlights || newOrder);
        showToast('Spotlight order updated.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reorder spotlights.', 'error');
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
          gap: '18px'
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
                {currentSpotlights.length} of 3 Selected
              </span>
              <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
                Promotional banners interleaved naturally between catalog rows on Discover
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setSearchQuery('');
              setSpotlightModalOpen(true);
            }}
            disabled={currentSpotlights.length >= 3}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              backgroundColor: currentSpotlights.length >= 3 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(245, 197, 24, 0.15)',
              border: currentSpotlights.length >= 3 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid var(--brand-gold, #F5C518)',
              color: currentSpotlights.length >= 3 ? '#6B7280' : 'var(--brand-gold, #F5C518)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: currentSpotlights.length >= 3 ? 'not-allowed' : 'pointer'
            }}
          >
            <Plus size={15} />
            <span>Add Spotlight Title</span>
          </button>
        </div>

        {/* Spotlights List */}
        {currentSpotlights.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentSpotlights.map((spot, idx) => (
              <div
                key={spot.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: `linear-gradient(90deg, rgba(245, 197, 24, 0.08) 0%, rgba(20, 20, 30, 0.95) 100%), url(${spot.backdropUrl || spot.posterUrl}) center/cover no-repeat`,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  gap: '14px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(245, 197, 24, 0.2)',
                      border: '1px solid var(--brand-gold, #F5C518)',
                      color: 'var(--brand-gold, #F5C518)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px'
                    }}
                  >
                    #{idx + 1}
                  </span>

                  <img
                    src={spot.posterUrl || spot.backdropUrl}
                    alt={spot.title}
                    style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '6px' }}
                  />

                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 2px' }}>
                      {spot.title}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#D1D5DB', margin: 0 }}>
                      {spot.type.toUpperCase()} • {spot.releaseYear}
                      {spot.tagline ? ` • "${spot.tagline}"` : ''}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleMoveSpotlight(idx, 'up')}
                    disabled={idx === 0}
                    title="Move Up"
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: idx === 0 ? '#4B5563' : '#E5E7EB',
                      cursor: idx === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMoveSpotlight(idx, 'down')}
                    disabled={idx === currentSpotlights.length - 1}
                    title="Move Down"
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: idx === currentSpotlights.length - 1 ? '#4B5563' : '#E5E7EB',
                      cursor: idx === currentSpotlights.length - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => handleRemoveSpotlight(spot.id)}
                    title="Remove Spotlight"
                    style={{
                      padding: '6px 12px',
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
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              textAlign: 'center'
            }}
          >
            <p style={{ color: '#9CA3AF', fontSize: '13px', margin: '0 0 10px' }}>
              No Cinematic Spotlights configured. Add 2–3 titles to create promotional banners on the Discover page.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSpotlightModalOpen(true);
              }}
              style={{
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
              + Add First Spotlight
            </button>
          </div>
        )}
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
                  {heroModalOpen ? 'Select Home Hero Title' : 'Add to Cinematic Spotlight'}
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
                  placeholder="Search titles by name or genre..."
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

            {/* Content List */}
            <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {catalog
                .filter(item => item.status === 'PUBLISHED')
                .filter(item =>
                  searchQuery.trim() === ''
                    ? true
                    : item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.genres && item.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())))
                )
                .map(item => {
                  const isCurrentHero = currentHero?.id === item.id;
                  const isAlreadySpotlight = currentSpotlights.some(s => s.id === item.id);
                  const isTrending1 = stats.currentTrending1?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
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
                                SPOTLIGHT
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
                          onClick={() => handleAddSpotlight(item)}
                          disabled={isAlreadySpotlight}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            backgroundColor: isAlreadySpotlight ? 'rgba(255, 255, 255, 0.05)' : 'rgba(245, 197, 24, 0.2)',
                            border: isAlreadySpotlight ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid var(--brand-gold, #F5C518)',
                            color: isAlreadySpotlight ? '#6B7280' : 'var(--brand-gold, #F5C518)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isAlreadySpotlight ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isAlreadySpotlight ? 'Already in Spotlight' : '+ Add to Spotlight'}
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

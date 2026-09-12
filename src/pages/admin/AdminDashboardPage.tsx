import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
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
  Edit3
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.admin.getDashboard();
      setStats(data as DashboardStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

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
    </div>
  );
};

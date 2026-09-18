import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Film,
  Tv,
  DollarSign,
  ArrowUpRight,
  Loader2,
  Sparkles,
  TrendingUp,
  Wallet,
  CreditCard,
  Crown,
  X,
  Search,
  Clock,
  ShieldCheck,
  AlertCircle,
  Calendar,
  ChevronRight,
  Copy,
  Check,
  Zap,
  Tag
} from 'lucide-react';

interface TodayStats {
  todayRevenueRupees: number;
  todayPurchasesRevenueRupees: number;
  todayUpiRevenueRupees: number;
  todayNewMembersCount: number;
  todayPurchasesCount: number;
  todayUpiApprovedCount: number;
  pendingPaymentRequestsCount: number;
  pendingPaymentAmountRupees: number;
  todayProfitRupees: number;
  profitNote: string;
  calendarDate: string;
  windowStart: string;
  windowEnd: string;
}

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
  todayStats: TodayStats;
  currentTrending1: {
    id: string;
    title: string;
    type: string;
    poster: string;
    backdrop: string;
    priceRupees: number;
    releaseYear: number;
  } | null;
}

interface AdminDashboardPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigateTab }) => {
  const { monetizationMode, refreshMonetizationConfig, showToast } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Monetization Mode & Subscription Admin Config
  const [currentMode, setCurrentMode] = useState<'PER_CONTENT' | 'SUBSCRIPTION'>(monetizationMode || 'PER_CONTENT');
  const [switchingMode, setSwitchingMode] = useState(false);
  const [subConfig, setSubConfig] = useState<{
    mode: 'PER_CONTENT' | 'SUBSCRIPTION';
    weeklyPrice: number;
    monthlyPrice: number;
    yearlyPrice: number;
    currencySymbol: string;
    metrics: {
      totalSubscriptions: number;
      activeCount: number;
      pendingCount: number;
      totalRevenueRupees: number;
    };
  } | null>(null);

  // Clickable Today Analytics Modal State
  const [activeModal, setActiveModal] = useState<'revenue' | 'members' | 'purchases' | 'upi' | 'profit' | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.admin.getDashboard(new Date().getTimezoneOffset());
      setStats(data as DashboardStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonetizationSettings = async () => {
    try {
      const res = await api.monetization.getAdminConfig();
      if (res?.config) {
        setSubConfig(res.config);
        setCurrentMode(res.config.mode);
      }
    } catch (err) {
      console.error('Failed to load monetization configuration in dashboard:', err);
    }
  };

  const handleSwitchMode = async (targetMode: 'PER_CONTENT' | 'SUBSCRIPTION') => {
    if (targetMode === currentMode || switchingMode) return;
    try {
      setSwitchingMode(true);
      const res = await api.monetization.updateAdminConfig({ mode: targetMode });
      setCurrentMode(targetMode);
      if (res?.config) {
        setSubConfig(res.config);
      }
      await refreshMonetizationConfig();
      await fetchStats();
      showToast(
        `Monetization mode switched to ${targetMode === 'PER_CONTENT' ? 'Per Movie/Series (PER_CONTENT)' : 'Subscription Plans (SUBSCRIPTION)'}.`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update monetization mode.', 'error');
    } finally {
      setSwitchingMode(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchMonetizationSettings();
  }, []);

  // CRITICAL DAILY TIMER / DATA RULE:
  // Automatically check for calendar midnight rollover every 15 seconds.
  // At 12:00:00 AM, previous day's metrics stop showing and new day's metrics calculate automatically.
  useEffect(() => {
    let lastDate = new Date().toLocaleDateString();

    const interval = setInterval(() => {
      const currentDate = new Date().toLocaleDateString();
      if (currentDate !== lastDate) {
        lastDate = currentDate;
        fetchStats();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Open Today Detail Modal & Fetch authoritatively
  const openMetricModal = async (metricType: 'revenue' | 'members' | 'purchases' | 'upi' | 'profit') => {
    setActiveModal(metricType);
    setModalSearch('');
    setModalLoading(true);
    try {
      const data = await api.admin.getTodayDetails(metricType, new Date().getTimezoneOffset());
      setModalData(data);
    } catch (err) {
      // Fallback
      setModalData(null);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#9CA3AF' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--brand-gold, #F5C518)' }} />
        <span>Loading Mission Control Dashboard...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div
        style={{
          padding: '24px',
          borderRadius: '14px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#F87171',
          maxWidth: '600px',
          margin: '40px auto',
          textAlign: 'center'
        }}
      >
        <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>Dashboard Offline</h3>
        <p style={{ fontSize: '14px', margin: '0 0 16px' }}>{error || 'Unable to retrieve real-time analytics.'}</p>
        <button
          onClick={fetchStats}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const today = stats.todayStats;
  const formattedTodayDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Quick Action navigation cards in exact requested sequence:
  // 1. Add Movie, 2. Add Series, 3. Quick Add, 4. Trending #1, 5. Hero Banner, 6. Cinematic Spotlight, 7. UPI Settings, 8. Verify Payments, 9. All Transactions
  const quickNavItems = [
    {
      label: 'Add Movie',
      desc: 'Publish a single cinematic film',
      action: () => onNavigateTab('admin-editor', 'new_movie'),
      icon: Film,
      color: '#F59E0B'
    },
    {
      label: 'Add Series',
      desc: 'Create multi-season episodic content',
      action: () => onNavigateTab('admin-editor', 'new_series'),
      icon: Tv,
      color: '#8B5CF6'
    },
    {
      label: 'Quick Add',
      desc: 'One-click auto-fill movie or series via ID',
      action: () => onNavigateTab('admin-quick-add'),
      icon: Zap,
      color: '#EAB308'
    },
    {
      label: 'Trending #1',
      desc: stats.currentTrending1
        ? `#1: ${stats.currentTrending1.title} (${stats.currentTrending1.type}) • Manage in Catalog`
        : 'Catalog Trending #1 showcase title',
      action: () => onNavigateTab('admin-trending'),
      icon: TrendingUp,
      color: '#F5C518'
    },
    {
      label: 'Hero Banner',
      desc: 'Configure Discover page top hero',
      action: () => onNavigateTab('admin-hero'),
      icon: Crown,
      color: '#EC4899'
    },
    {
      label: 'Cinematic Spotlight',
      desc: 'Manage promotional catalog banners',
      action: () => onNavigateTab('admin-spotlight'),
      icon: Sparkles,
      color: '#3B82F6'
    },
    {
      label: 'UPI Settings',
      desc: 'Configure receiver UPI ID & preview QR',
      action: () => onNavigateTab('admin-upi-settings'),
      icon: Wallet,
      color: '#F5C518'
    },
    {
      label: 'Verify Payments',
      desc: 'Inspect pending UTR submissions & approve',
      action: () => onNavigateTab('admin-payments'),
      icon: ShieldCheck,
      color: '#10B981'
    },
    {
      label: 'All Transactions',
      desc: 'Complete credit and debit ledger',
      action: () => onNavigateTab('admin-transactions'),
      icon: CreditCard,
      color: '#14B8A6'
    }
  ];

  return (
    <div style={{ padding: '8px 0 40px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--brand-gold, #F5C518)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(245, 197, 24, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(245, 197, 24, 0.25)'
              }}
            >
              ADMINISTRATION
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            Mission Control Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Real-time telemetry, today's revenue breakdown, user registrations, and platform operations.
          </p>
        </div>

        {/* Monetization Mode Switch Buttons (Replacing Add Movie & Add Series at this exact dashboard top) */}
        <div className="admin-dashboard-mode-switch" style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleSwitchMode('PER_CONTENT')}
            disabled={switchingMode}
            className="admin-dashboard-mode-btn"
            title="Switch monetization system to Per Movie/Series pay-per-view"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: currentMode === 'PER_CONTENT' ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.08)',
              color: currentMode === 'PER_CONTENT' ? '#0E0E12' : '#FFFFFF',
              fontWeight: currentMode === 'PER_CONTENT' ? 800 : 700,
              fontSize: '13px',
              borderRadius: '10px',
              border: currentMode === 'PER_CONTENT' ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
              cursor: switchingMode ? 'wait' : 'pointer',
              boxShadow: currentMode === 'PER_CONTENT' ? '0 4px 14px rgba(245, 197, 24, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {switchingMode && currentMode !== 'PER_CONTENT' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Film size={16} />
            )}
            <span>Per Movie/Series</span>
          </button>
          <button
            onClick={() => handleSwitchMode('SUBSCRIPTION')}
            disabled={switchingMode}
            className="admin-dashboard-mode-btn"
            title="Switch monetization system to Weekly/Monthly/Yearly subscriptions"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: currentMode === 'SUBSCRIPTION' ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.08)',
              color: currentMode === 'SUBSCRIPTION' ? '#0E0E12' : '#FFFFFF',
              fontWeight: currentMode === 'SUBSCRIPTION' ? 800 : 700,
              fontSize: '13px',
              borderRadius: '10px',
              border: currentMode === 'SUBSCRIPTION' ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
              cursor: switchingMode ? 'wait' : 'pointer',
              boxShadow: currentMode === 'SUBSCRIPTION' ? '0 4px 14px rgba(245, 197, 24, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {switchingMode && currentMode !== 'SUBSCRIPTION' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Crown size={16} />
            )}
            <span>Subscription Plans</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MONETIZATION ADMIN ANALYTICS PANEL (Dedicated Mode View)                  */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: '32px' }}>
        {currentMode === 'PER_CONTENT' ? (
          /* MODE A: PER MOVIE / SERIES ANALYTICS VIEW (Only per-content metrics) */
          <div
            style={{
              padding: '20px 22px',
              borderRadius: '16px',
              backgroundColor: 'rgba(245, 197, 24, 0.05)',
              border: '1px solid rgba(245, 197, 24, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(245, 197, 24, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold, #F5C518)' }}>
                  <Film size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      Per Movie/Series Monetization Overview
                    </h3>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--brand-gold, #F5C518)', color: '#0E0E12', letterSpacing: '0.04em' }}>
                      MODE ACTIVE
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px', display: 'block' }}>
                    Users purchase individual movies &amp; series with wallet/UPI. Titles remain permanently owned.
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onNavigateTab('admin-content')}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <Tag size={13} />
                  <span>Manage Catalog Pricing</span>
                </button>
              </div>
            </div>

            <div className="admin-monetization-grid">
              <div className="admin-stat-card" style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px' }}>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Content Purchases
                  </span>
                  <Film size={16} color="var(--brand-gold, #F5C518)" />
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', margin: '4px 0' }}>
                  {stats.totalPurchases}
                </div>
                <div className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Individual title purchases all-time
                </div>
              </div>

              <div className="admin-stat-card" style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px' }}>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Today's Content Revenue
                  </span>
                  <DollarSign size={16} color="#34D399" />
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: '#34D399', margin: '4px 0' }}>
                  ₹{today.todayPurchasesRevenueRupees}
                </div>
                <div className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Direct content purchase intake
                </div>
              </div>

              <div className="admin-stat-card" style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px' }}>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Today's Content Sales
                  </span>
                  <Check size={16} color="#60A5FA" />
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', margin: '4px 0' }}>
                  {today.todayPurchasesCount}
                </div>
                <div className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Movies &amp; series purchased today
                </div>
              </div>

              <div className="admin-stat-card" style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px' }}>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Wallet Recharges
                  </span>
                  <Wallet size={16} color="#C084FC" />
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: '#C084FC', margin: '4px 0' }}>
                  ₹{stats.walletActivity.totalRechargeRupees}
                </div>
                <div className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {stats.walletActivity.totalTransactions} wallet transactions ledgered
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MODE B: SUBSCRIPTION PLANS ANALYTICS VIEW (Only subscription metrics) */
          <div
            style={{
              padding: '20px 22px',
              borderRadius: '16px',
              backgroundColor: 'rgba(245, 197, 24, 0.05)',
              border: '1px solid rgba(245, 197, 24, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(245, 197, 24, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold, #F5C518)' }}>
                  <Crown size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      Subscription Plans Monetization Overview
                    </h3>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--brand-gold, #F5C518)', color: '#0E0E12', letterSpacing: '0.04em' }}>
                      MODE ACTIVE
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px', display: 'block' }}>
                    All-Access Pass active. Users pay via manual UPI QR &amp; UTR. Admin verifies before activation.
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onNavigateTab('admin-monetization')}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <Crown size={13} />
                  <span>Configure Passes &amp; Pricing</span>
                </button>
              </div>
            </div>

            <div className="admin-monetization-grid">
              {/* Weekly Plan */}
              <div className="admin-stat-card" style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px' }}>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Weekly Pass
                  </span>
                  <Clock size={16} color="var(--brand-gold, #F5C518)" />
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', margin: '4px 0' }}>
                  ₹{subConfig?.weeklyPrice || 49}
                </div>
                <div className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  7 Days uninterrupted access
                </div>
              </div>

              {/* Monthly Plan */}
              <div className="admin-stat-card" style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '14px', border: '1px solid rgba(245, 197, 24, 0.3)', padding: '16px' }}>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase' }}>
                    Monthly Pass (Popular)
                  </span>
                  <Crown size={16} color="var(--brand-gold, #F5C518)" />
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)', margin: '4px 0' }}>
                  ₹{subConfig?.monthlyPrice || 149}
                </div>
                <div className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  30 Days full catalog HD/4K
                </div>
              </div>

              {/* Yearly Plan */}
              <div className="admin-stat-card" style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px' }}>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Yearly Pass (Best Value)
                  </span>
                  <Sparkles size={16} color="#EC4899" />
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', margin: '4px 0' }}>
                  ₹{subConfig?.yearlyPrice || 999}
                </div>
                <div className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  365 Days all-access pass
                </div>
              </div>

              {/* Active Subscriptions */}
              <div className="admin-stat-card" style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px' }}>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Active Subscriptions
                  </span>
                  <ShieldCheck size={16} color="#10B981" />
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: '#10B981', margin: '4px 0' }}>
                  {subConfig?.metrics?.activeCount || 0}
                </div>
                <div className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Subscribers currently active
                </div>
              </div>

              {/* Pending Verification */}
              <div
                onClick={() => onNavigateTab('admin-monetization')}
                className="admin-stat-card"
                style={{
                  backgroundColor: (subConfig?.metrics?.pendingCount || 0) > 0 ? 'rgba(245, 197, 24, 0.1)' : 'var(--bg-surface, #12121A)',
                  borderRadius: '14px',
                  border: (subConfig?.metrics?.pendingCount || 0) > 0 ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '16px',
                  cursor: 'pointer'
                }}
              >
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 700, color: (subConfig?.metrics?.pendingCount || 0) > 0 ? 'var(--brand-gold, #F5C518)' : '#9CA3AF', textTransform: 'uppercase' }}>
                    Pending UTR Approvals
                  </span>
                  <Clock size={16} color="var(--brand-gold, #F5C518)" />
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: (subConfig?.metrics?.pendingCount || 0) > 0 ? 'var(--brand-gold, #F5C518)' : '#FFFFFF', margin: '4px 0' }}>
                  {subConfig?.metrics?.pendingCount || 0}
                </div>
                <div className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Awaiting administrator verification
                </div>
              </div>

              {/* Total Subscription Revenue */}
              <div className="admin-stat-card" style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px' }}>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Subscription Revenue
                  </span>
                  <DollarSign size={16} color="#34D399" />
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: '#34D399', margin: '4px 0' }}>
                  ₹{subConfig?.metrics?.totalRevenueRupees || 0}
                </div>
                <div className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Gross subscription earnings
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MILESTONE 3: TODAY ANALYTICS (00:00:00 -> 23:59:59 Automatic Rollover)   */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: '36px' }}>
        {/* Today Section Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)'
              }}
            >
              <Calendar size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Today's Performance
              </h2>
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                Active window: <strong>12:00:00 AM → 11:59:59 PM</strong> ({formattedTodayDate}) • Auto-rolls over at midnight
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#34D399',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <Clock size={13} />
            <span>Live Calendar Sync Active</span>
          </div>
        </div>

        {/* Clickable Today Cards: Responsive 2-Column on Mobile */}
        <div className="admin-today-cards-grid">
          {/* Card 1 (DESKTOP COMBINED): Financial Overview (Combined Gross Intake + Net Margin or Subscriptions) */}
          <div
            className="today-card-combined admin-stat-card"
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1.5px solid rgba(245, 197, 24, 0.35)',
              padding: '20px 22px',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(245, 197, 24, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold, #F5C518)' }}>
                  {currentMode === 'PER_CONTENT' ? <DollarSign size={18} /> : <Crown size={18} />}
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                    {currentMode === 'PER_CONTENT' ? "Today's Financial Overview" : "Subscription Financial Overview"}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    {currentMode === 'PER_CONTENT' ? 'Gross Intake & Net Margin' : 'SVOD Revenue & Active Subscribers'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentMode === 'PER_CONTENT' ? (
                  <>
                    <button
                      onClick={() => openMetricModal('revenue')}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(245, 197, 24, 0.12)',
                        border: '1px solid rgba(245, 197, 24, 0.3)',
                        color: 'var(--brand-gold, #F5C518)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Revenue Details</span>
                      <ChevronRight size={12} />
                    </button>
                    <button
                      onClick={() => openMetricModal('profit')}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34D399',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Profit Audit</span>
                      <ChevronRight size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onNavigateTab('admin-monetization')}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(245, 197, 24, 0.12)',
                        border: '1px solid rgba(245, 197, 24, 0.3)',
                        color: 'var(--brand-gold, #F5C518)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Manage Plans</span>
                      <ChevronRight size={12} />
                    </button>
                    <button
                      onClick={() => onNavigateTab('admin-payments')}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34D399',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Verify UTRs</span>
                      <ChevronRight size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {currentMode === 'PER_CONTENT' ? (
                <>
                  {/* Gross Intake / Revenue */}
                  <div
                    onClick={() => openMetricModal('revenue')}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Today's Revenue / Gross Intake
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '4px' }}>
                      ₹{today.todayRevenueRupees}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      ₹{today.todayPurchasesRevenueRupees} content sales + ₹{today.todayUpiRevenueRupees} UPI recharges
                    </div>
                  </div>

                  {/* Net Margin / Profit */}
                  <div
                    onClick={() => openMetricModal('profit')}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Today's Profit / Net Margin
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#34D399', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '4px' }}>
                      ₹{today.todayProfitRupees}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      Gross 100% margin (Zero server hosting deduction)
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Subscription Total Revenue */}
                  <div
                    onClick={() => onNavigateTab('admin-monetization')}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Total Subscription Revenue
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#34D399', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '4px' }}>
                      ₹{subConfig?.metrics?.totalRevenueRupees || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      Approved subscription gross intake
                    </div>
                  </div>

                  {/* Active Subscriptions Count */}
                  <div
                    onClick={() => onNavigateTab('admin-monetization')}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Active Paid Subscribers
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '4px' }}>
                      {subConfig?.metrics?.activeCount || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      Subscribers with unexpired access
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 1A (MOBILE SPLIT): Revenue */}
          <div
            onClick={() => (currentMode === 'PER_CONTENT' ? openMetricModal('revenue') : onNavigateTab('admin-monetization'))}
            className="today-card-split admin-stat-card"
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1.5px solid rgba(245, 197, 24, 0.35)',
              padding: '20px',
              cursor: 'pointer'
            }}
          >
            <div>
              <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="stat-title" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {currentMode === 'PER_CONTENT' ? "Today's Revenue" : "Sub Revenue"}
                </span>
                <div className="stat-icon" style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: 'rgba(245, 197, 24, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold, #F5C518)' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '4px' }}>
                ₹{currentMode === 'PER_CONTENT' ? today.todayRevenueRupees : (subConfig?.metrics?.totalRevenueRupees || 0)}
              </div>
              <p className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 8px' }}>
                {currentMode === 'PER_CONTENT' ? `₹${today.todayPurchasesRevenueRupees} sales` : 'Approved passes'}
              </p>
            </div>
            <div className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)' }}>
              <span>{currentMode === 'PER_CONTENT' ? 'Details' : 'Ledger'}</span>
              <ChevronRight size={13} />
            </div>
          </div>

          {/* Card 1B (MOBILE SPLIT): Profit / Active Subs */}
          <div
            onClick={() => (currentMode === 'PER_CONTENT' ? openMetricModal('profit') : onNavigateTab('admin-monetization'))}
            className="today-card-split admin-stat-card"
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1.5px solid rgba(16, 185, 129, 0.35)',
              padding: '20px',
              cursor: 'pointer'
            }}
          >
            <div>
              <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="stat-title" style={{ fontSize: '11px', fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {currentMode === 'PER_CONTENT' ? "Today's Profit" : "Active Subs"}
                </span>
                <div className="stat-icon" style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399' }}>
                  {currentMode === 'PER_CONTENT' ? <TrendingUp size={16} /> : <ShieldCheck size={16} />}
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '26px', fontWeight: 900, color: '#34D399', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '4px' }}>
                {currentMode === 'PER_CONTENT' ? `₹${today.todayProfitRupees}` : (subConfig?.metrics?.activeCount || 0)}
              </div>
              <p className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 8px' }}>
                {currentMode === 'PER_CONTENT' ? '100% net margin' : 'Active users'}
              </p>
            </div>
            <div className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#34D399' }}>
              <span>{currentMode === 'PER_CONTENT' ? 'Profit audit' : 'Subscribers'}</span>
              <ChevronRight size={13} />
            </div>
          </div>

          {/* Card 2: Today's New Members */}
          <div
            onClick={() => openMetricModal('members')}
            className="admin-stat-card"
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '22px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            <div>
              <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="stat-title" style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Today's Members
                </span>
                <div className="stat-icon" style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA' }}>
                  <Users size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '30px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
                {today.todayNewMembersCount}
              </div>
              <p className="stat-desc" style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px' }}>
                New registrations today
              </p>
            </div>
            <div className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#60A5FA' }}>
              <span>View accounts</span>
              <ChevronRight size={13} />
            </div>
          </div>

          {/* Card 3: Today's Purchases (in PER_CONTENT) OR Pending Subscriptions (in SUBSCRIPTION) */}
          {currentMode === 'PER_CONTENT' ? (
            <div
              onClick={() => openMetricModal('purchases')}
              className="admin-stat-card"
              style={{
                backgroundColor: 'var(--bg-surface, #12121A)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '22px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Today's Purchases
                  </span>
                  <div className="stat-icon" style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399' }}>
                    <Film size={18} />
                  </div>
                </div>
                <div className="stat-value" style={{ fontSize: '30px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
                  {today.todayPurchasesCount}
                </div>
                <p className="stat-desc" style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px' }}>
                  ₹{today.todayPurchasesRevenueRupees} content revenue
                </p>
              </div>
              <div className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#34D399' }}>
                <span>View purchase log</span>
                <ChevronRight size={13} />
              </div>
            </div>
          ) : (
            <div
              onClick={() => onNavigateTab('admin-monetization')}
              className="admin-stat-card"
              style={{
                backgroundColor: (subConfig?.metrics?.pendingCount || 0) > 0 ? 'rgba(245, 197, 24, 0.1)' : 'var(--bg-surface, #12121A)',
                borderRadius: '16px',
                border: (subConfig?.metrics?.pendingCount || 0) > 0 ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '22px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 800, color: (subConfig?.metrics?.pendingCount || 0) > 0 ? 'var(--brand-gold, #F5C518)' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Pending Passes
                  </span>
                  <div className="stat-icon" style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(245, 197, 24, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold, #F5C518)' }}>
                    <Clock size={18} />
                  </div>
                </div>
                <div className="stat-value" style={{ fontSize: '30px', fontWeight: 900, color: (subConfig?.metrics?.pendingCount || 0) > 0 ? 'var(--brand-gold, #F5C518)' : '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
                  {subConfig?.metrics?.pendingCount || 0}
                </div>
                <p className="stat-desc" style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px' }}>
                  UTR verification requests
                </p>
              </div>
              <div className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)' }}>
                <span>Verify Subscriptions</span>
                <ChevronRight size={13} />
              </div>
            </div>
          )}

          {/* Card 4: Today's UPI Payments (in PER_CONTENT) OR Total Subscriptions (in SUBSCRIPTION) */}
          {currentMode === 'PER_CONTENT' ? (
            <div
              onClick={() => openMetricModal('upi')}
              className="admin-stat-card"
              style={{
                backgroundColor: 'var(--bg-surface, #12121A)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '22px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Today's UPI Payments
                  </span>
                  <div className="stat-icon" style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C084FC' }}>
                    <Wallet size={18} />
                  </div>
                </div>
                <div className="stat-value" style={{ fontSize: '30px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
                  ₹{today.todayUpiRevenueRupees}
                </div>
                <p className="stat-desc" style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px' }}>
                  {today.todayUpiApprovedCount} approved UPI recharges
                </p>
              </div>
              <div className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#C084FC' }}>
                <span>View UPI requests</span>
                <ChevronRight size={13} />
              </div>
            </div>
          ) : (
            <div
              onClick={() => onNavigateTab('admin-monetization')}
              className="admin-stat-card"
              style={{
                backgroundColor: 'var(--bg-surface, #12121A)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '22px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Total Subscriptions
                  </span>
                  <div className="stat-icon" style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C084FC' }}>
                    <Crown size={18} />
                  </div>
                </div>
                <div className="stat-value" style={{ fontSize: '30px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
                  {subConfig?.metrics?.totalSubscriptions || 0}
                </div>
                <p className="stat-desc" style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px' }}>
                  All-time subscriber requests
                </p>
              </div>
              <div className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#C084FC' }}>
                <span>View subscription ledger</span>
                <ChevronRight size={13} />
              </div>
            </div>
          )}

          {/* Card 5: Pending Payments (in PER_CONTENT) OR SVOD Pricing (in SUBSCRIPTION) */}
          {currentMode === 'PER_CONTENT' ? (
            <div
              onClick={() => onNavigateTab('admin-payments')}
              className="admin-stat-card"
              style={{
                backgroundColor: today.pendingPaymentRequestsCount > 0 ? 'rgba(245, 197, 24, 0.1)' : 'var(--bg-surface, #12121A)',
                borderRadius: '16px',
                border: today.pendingPaymentRequestsCount > 0 ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '22px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 800, color: today.pendingPaymentRequestsCount > 0 ? 'var(--brand-gold, #F5C518)' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Pending Payments
                  </span>
                  <div className="stat-icon" style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(245, 197, 24, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold, #F5C518)' }}>
                    <Clock size={18} />
                  </div>
                </div>
                <div className="stat-value" style={{ fontSize: '30px', fontWeight: 900, color: today.pendingPaymentRequestsCount > 0 ? 'var(--brand-gold, #F5C518)' : '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
                  {today.pendingPaymentRequestsCount}
                </div>
                <p className="stat-desc" style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px' }}>
                  ₹{today.pendingPaymentAmountRupees} awaiting approval
                </p>
              </div>
              <div className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)' }}>
                <span>Go to Verify Panel</span>
                <ChevronRight size={13} />
              </div>
            </div>
          ) : (
            <div
              onClick={() => onNavigateTab('admin-monetization')}
              className="admin-stat-card"
              style={{
                backgroundColor: 'var(--bg-surface, #12121A)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '22px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div>
                <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="stat-title" style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    SVOD Pricing Tiers
                  </span>
                  <div className="stat-icon" style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(245, 197, 24, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold, #F5C518)' }}>
                    <Tag size={18} />
                  </div>
                </div>
                <div className="stat-value" style={{ fontSize: '20px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)', letterSpacing: '-0.01em', lineHeight: 1.2, margin: '6px 0' }}>
                  ₹{subConfig?.weeklyPrice || 49} / ₹{subConfig?.monthlyPrice || 149} / ₹{subConfig?.yearlyPrice || 999}
                </div>
                <p className="stat-desc" style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 10px' }}>
                  Weekly / Monthly / Yearly passes
                </p>
              </div>
              <div className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)' }}>
                <span>Edit Plan Pricing</span>
                <ChevronRight size={13} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Navigation Shortcuts / Administrative Navigation Hub */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--brand-gold, #F5C518)' }} />
            <span>Administrative Navigation Hub</span>
          </h2>
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>All systems accessible directly or via 3-line Menu</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {quickNavItems.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                onClick={item.action}
                style={{
                  padding: '16px 18px',
                  backgroundColor: 'var(--bg-surface, #12121A)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: `${item.color}20`,
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>{item.label}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{item.desc}</div>
                  </div>
                </div>

                <ArrowUpRight size={16} color="#6B7280" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ALL-TIME PLATFORM METRICS (Positioned at the end of the Dashboard)        */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginBottom: '16px' }}>
          All-Time Platform Summary
        </h2>

        <div className="admin-summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Total Registered Users (Clickable -> Admin Users) */}
          <div
            onClick={() => onNavigateTab('admin-users')}
            className="admin-stat-card"
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '18px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245, 166, 35, 0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Total Registered Users
              </span>
              <ArrowUpRight size={14} color="var(--brand-gold, #F5C518)" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', marginTop: '6px' }}>
              {stats.totalUsers}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--brand-gold, #F5C518)', marginTop: '4px' }}>
              Manage users →
            </span>
          </div>

          {/* Total Revenue */}
          <div
            className="admin-stat-card"
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
              Total Revenue
            </span>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', marginTop: '6px' }}>
              ₹{stats.totalRevenueRupees}
            </div>
            <span style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
              All-time platform gross
            </span>
          </div>

          {/* Published Movies (Clickable -> Catalog movie filter) */}
          <div
            onClick={() => onNavigateTab('admin-content', 'movie')}
            className="admin-stat-card"
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '18px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245, 166, 35, 0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Published Movies
              </span>
              <ArrowUpRight size={14} color="var(--brand-gold, #F5C518)" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', marginTop: '6px' }}>
              {stats.totalMovies}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--brand-gold, #F5C518)', marginTop: '4px' }}>
              View Movies catalog →
            </span>
          </div>

          {/* Published Series (Clickable -> Catalog series filter) */}
          <div
            onClick={() => onNavigateTab('admin-content', 'series')}
            className="admin-stat-card"
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '18px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245, 166, 35, 0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Published Series
              </span>
              <ArrowUpRight size={14} color="var(--brand-gold, #F5C518)" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', marginTop: '6px' }}>
              {stats.totalSeries}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--brand-gold, #F5C518)', marginTop: '4px' }}>
              View Series catalog →
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MILESTONE 4: TODAY ANALYTICS INTERACTIVE MODALS                           */}
      {/* ========================================================================= */}
      {activeModal && (
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
          onClick={() => setActiveModal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '820px',
              maxHeight: '85vh',
              backgroundColor: '#12121A',
              border: '1px solid rgba(245, 197, 24, 0.3)',
              borderRadius: '18px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
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
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    {activeModal === 'revenue' && "Today's Revenue Breakdown"}
                    {activeModal === 'members' && "Today's New Members"}
                    {activeModal === 'purchases' && "Today's Content Purchases"}
                    {activeModal === 'upi' && "Today's UPI Payment Requests"}
                    {activeModal === 'profit' && "Today's Profit & Margin Analysis"}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(245, 197, 24, 0.15)',
                      color: 'var(--brand-gold, #F5C518)'
                    }}
                  >
                    {today.calendarDate}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px', display: 'block' }}>
                  Records strictly within <strong>00:00:00 AM → 11:59:59 PM</strong> calendar day
                </span>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {modalLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '10px', color: '#9CA3AF' }}>
                  <Loader2 size={20} className="animate-spin" color="var(--brand-gold, #F5C518)" />
                  <span>Loading today's itemized records...</span>
                </div>
              ) : activeModal === 'profit' ? (
                /* Profit Breakdown Content */
                <div>
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(245, 197, 24, 0.06)',
                      border: '1px solid rgba(245, 197, 24, 0.25)',
                      marginBottom: '20px'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Operating Profit Mathematical Derivation
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#D1D5DB' }}>
                        <span>Content Purchases Revenue (Paise to INR):</span>
                        <strong style={{ color: '#10B981' }}>+₹{today.todayPurchasesRevenueRupees}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#D1D5DB' }}>
                        <span>Approved UPI Wallet Recharge Deposits:</span>
                        <strong style={{ color: '#10B981' }}>+₹{today.todayUpiRevenueRupees}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#D1D5DB' }}>
                        <span>External Bandwidth / Hosting / CDN Expenses:</span>
                        <strong style={{ color: '#9CA3AF' }}>₹0.00 (Unconfigured in platform)</strong>
                      </div>
                      <div
                        style={{
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                          paddingTop: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '18px',
                          fontWeight: 900,
                          color: '#FFFFFF'
                        }}
                      >
                        <span>Net Calculated Operating Profit:</span>
                        <span style={{ color: 'var(--brand-gold, #F5C518)' }}>₹{today.todayProfitRupees}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '13px',
                      color: '#9CA3AF',
                      lineHeight: 1.5
                    }}
                  >
                    <strong style={{ color: '#FFFFFF' }}>Transparency Notice: </strong>
                    {today.profitNote}
                  </div>
                </div>
              ) : (
                /* Itemized Lists for Members, Revenue, Purchases, UPI */
                <div>
                  {/* Search filter in modal */}
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <Search size={16} color="#9CA3AF" />
                      <input
                        type="text"
                        placeholder="Search records by name, email, title, or UTR..."
                        value={modalSearch}
                        onChange={e => setModalSearch(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#FFFFFF',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Empty state */}
                  {(!modalData?.records || modalData.records.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>
                      <AlertCircle size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                      <p style={{ fontSize: '14px', margin: 0 }}>No records recorded yet for today ({today.calendarDate}).</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {modalData.records
                        .filter((r: any) => {
                          if (!modalSearch.trim()) return true;
                          const q = modalSearch.toLowerCase();
                          return (
                            (r.name && r.name.toLowerCase().includes(q)) ||
                            (r.email && r.email.toLowerCase().includes(q)) ||
                            (r.userName && r.userName.toLowerCase().includes(q)) ||
                            (r.userEmail && r.userEmail.toLowerCase().includes(q)) ||
                            (r.title && r.title.toLowerCase().includes(q)) ||
                            (r.contentTitle && r.contentTitle.toLowerCase().includes(q)) ||
                            (r.utr && r.utr.toLowerCase().includes(q))
                          );
                        })
                        .map((record: any, idx: number) => (
                          <div
                            key={record.id || idx}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '10px',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '10px'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                                {record.name || record.userName || record.title || record.contentTitle || 'Member'}
                              </div>
                              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                                {record.email || record.userEmail || ''}
                                {record.contentType ? ` • ${record.contentType}` : ''}
                                {record.utr && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyUtr(record.utr)}
                                    title="Click to copy UTR"
                                    style={{
                                      marginLeft: '8px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(245, 197, 24, 0.12)',
                                      border: '1px solid rgba(245, 197, 24, 0.25)',
                                      color: 'var(--brand-gold, #F5C518)',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      fontFamily: 'monospace'
                                    }}
                                  >
                                    {copiedUtr === record.utr ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                                    <span>UTR: {record.utr}</span>
                                    {copiedUtr === record.utr && <span style={{ color: '#10B981', fontSize: '10px' }}>(Copied!)</span>}
                                  </button>
                                )}
                              </div>
                              {record.adminNote && (
                                <div style={{ fontSize: '11px', color: '#F87171', marginTop: '2px' }}>
                                  Admin Note: {record.adminNote}
                                </div>
                              )}
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              {record.amountRupees !== undefined && (
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981' }}>
                                  ₹{record.amountRupees}
                                </div>
                              )}
                              {record.status && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor:
                                      record.status === 'APPROVED' || record.status === 'ACTIVE'
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : record.status === 'PENDING'
                                        ? 'rgba(245, 197, 24, 0.15)'
                                        : 'rgba(239, 68, 68, 0.15)',
                                    color:
                                      record.status === 'APPROVED' || record.status === 'ACTIVE'
                                        ? '#10B981'
                                        : record.status === 'PENDING'
                                        ? 'var(--brand-gold, #F5C518)'
                                        : '#EF4444'
                                  }}
                                >
                                  {record.status}
                                </span>
                              )}
                              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                {record.createdAt || record.submittedAt || record.purchasedAt || record.timestamp
                                  ? new Date(record.createdAt || record.submittedAt || record.purchasedAt || record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Today'}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                Window: 00:00:00 AM → 11:59:59 PM ({today.calendarDate})
              </span>

              <div style={{ display: 'flex', gap: '10px' }}>
                {activeModal === 'upi' && (
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      onNavigateTab('admin-payments');
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--brand-gold, #F5C518)',
                      color: '#000000',
                      fontSize: '12px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Open Payment Verifier
                  </button>
                )}
                <button
                  onClick={() => setActiveModal(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

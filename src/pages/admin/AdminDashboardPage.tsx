import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
  Users,
  Film,
  Tv,
  DollarSign,
  Plus,
  ArrowUpRight,
  Loader2,
  Sparkles,
  TrendingUp,
  Wallet,
  Sliders,
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
  Check
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchStats();
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

  // Quick Action navigation cards
  const quickNavItems = [
    {
      label: 'Trending #1 Showcase',
      desc: stats.currentTrending1
        ? `#1: ${stats.currentTrending1.title} (${stats.currentTrending1.type}) • Manage in Catalog`
        : 'Catalog Trending #1 showcase title',
      action: () => onNavigateTab('admin-content'),
      icon: TrendingUp,
      color: '#F5C518'
    },
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
      label: 'Verify Payments',
      desc: 'Inspect pending UTR submissions & approve',
      action: () => onNavigateTab('admin-payments'),
      icon: ShieldCheck,
      color: '#10B981'
    },
    {
      label: 'UPI Settings',
      desc: 'Configure receiver UPI ID & preview QR',
      action: () => onNavigateTab('admin-upi-settings'),
      icon: Wallet,
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
      label: 'All Transactions',
      desc: 'Complete credit and debit ledger',
      action: () => onNavigateTab('admin-transactions'),
      icon: CreditCard,
      color: '#14B8A6'
    },
    {
      label: 'General Settings',
      desc: 'Platform identity and system controls',
      action: () => onNavigateTab('admin-settings'),
      icon: Sliders,
      color: '#6366F1'
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

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onNavigateTab('admin-editor', 'new_movie')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: 'var(--brand-gold, #F5C518)',
              color: '#0E0E12',
              fontWeight: 800,
              fontSize: '13px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(245, 197, 24, 0.25)'
            }}
          >
            <Plus size={16} />
            <span>Add Movie</span>
          </button>
          <button
            onClick={() => onNavigateTab('admin-editor', 'new_series')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            <span>Add Series</span>
          </button>
        </div>
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

        {/* Clickable Today Cards: Combined Financials + Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px'
          }}
        >
          {/* Card 1: Today's Financials (Combined Gross Intake / Revenue + Net Margin / Profit) */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1.5px solid rgba(245, 197, 24, 0.35)',
              padding: '20px 22px',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              gridColumn: 'span 2'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(245, 197, 24, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold, #F5C518)' }}>
                  <DollarSign size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                    Today's Financial Overview
                  </span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Gross Intake &amp; Net Margin</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
            </div>
          </div>

          {/* Card 2: Today's New Members */}
          <div
            onClick={() => openMetricModal('members')}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Today's New Members
              </span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA' }}>
                <Users size={18} />
              </div>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
              {today.todayNewMembersCount}
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px' }}>
              New registrations today
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#60A5FA' }}>
              <span>View new accounts</span>
              <ChevronRight size={13} />
            </div>
          </div>

          {/* Card 3: Today's Purchases */}
          <div
            onClick={() => openMetricModal('purchases')}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Today's Purchases
              </span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399' }}>
                <Film size={18} />
              </div>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
              {today.todayPurchasesCount}
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px' }}>
              ₹{today.todayPurchasesRevenueRupees} content revenue
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#34D399' }}>
              <span>View purchase log</span>
              <ChevronRight size={13} />
            </div>
          </div>

          {/* Card 4: Today's UPI Recharge Revenue */}
          <div
            onClick={() => openMetricModal('upi')}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Today's UPI Payments
              </span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C084FC' }}>
                <Wallet size={18} />
              </div>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
              ₹{today.todayUpiRevenueRupees}
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px' }}>
              {today.todayUpiApprovedCount} approved UPI recharges
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#C084FC' }}>
              <span>View UPI requests</span>
              <ChevronRight size={13} />
            </div>
          </div>

          {/* Card 5: Pending Payment Requests */}
          <div
            onClick={() => onNavigateTab('admin-payments')}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: today.pendingPaymentRequestsCount > 0 ? 'var(--brand-gold, #F5C518)' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Pending Payments
              </span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(245, 197, 24, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold, #F5C518)' }}>
                <Clock size={18} />
              </div>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: today.pendingPaymentRequestsCount > 0 ? 'var(--brand-gold, #F5C518)' : '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
              {today.pendingPaymentRequestsCount}
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px' }}>
              ₹{today.pendingPaymentAmountRupees} awaiting approval
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)' }}>
              <span>Go to Verify Panel</span>
              <ChevronRight size={13} />
            </div>
          </div>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Total Registered Users (Clickable -> Admin Users) */}
          <div
            onClick={() => onNavigateTab('admin-users')}
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

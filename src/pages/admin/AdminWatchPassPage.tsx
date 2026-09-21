import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Zap,
  Clock,
  ShieldCheck,
  IndianRupee,
  RefreshCw,
  Save,
  Loader2,
  Film,
  TrendingUp,
  ArrowRight,
  XCircle
} from 'lucide-react';

interface AdminWatchPassPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminWatchPassPage: React.FC<AdminWatchPassPageProps> = ({ onNavigateTab }) => {
  const { showToast } = useApp();

  // Dynamic Hybrid Watch Pass pricing state (24H, 3D, 7D, 15D only — 30D removed)
  const [price24h, setPrice24h] = useState<number>(19);
  const [price3d, setPrice3d] = useState<number>(29);
  const [price7d, setPrice7d] = useState<number>(44);
  const [price15d, setPrice15d] = useState<number>(69);
  const [savingPrices, setSavingPrices] = useState(false);

  // Separated Watch Pass Analytics
  const [analytics, setAnalytics] = useState<{
    totalPasses: number;
    activePasses: number;
    expiredPasses: number;
    pendingPasses: number;
    rejectedPasses: number;
    totalRevenueRupees: number;
    durationBreakdown: Record<string, number>;
    revenueByPlan?: Record<string, number>;
    activeByPlan?: Record<string, number>;
    planMetrics?: {
      PASS_24H?: { sales: number; revenueRupees: number; active: number };
      PASS_3D?: { sales: number; revenueRupees: number; active: number };
      PASS_7D?: { sales: number; revenueRupees: number; active: number };
      PASS_15D?: { sales: number; revenueRupees: number; active: number };
    };
    averageRevenueRupees?: number;
    topDuration?: string;
  }>({
    totalPasses: 0,
    activePasses: 0,
    expiredPasses: 0,
    pendingPasses: 0,
    rejectedPasses: 0,
    totalRevenueRupees: 0,
    durationBreakdown: {},
    planMetrics: {
      PASS_24H: { sales: 0, revenueRupees: 0, active: 0 },
      PASS_3D: { sales: 0, revenueRupees: 0, active: 0 },
      PASS_7D: { sales: 0, revenueRupees: 0, active: 0 },
      PASS_15D: { sales: 0, revenueRupees: 0, active: 0 }
    }
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const fetchPlans = async () => {
    try {
      const res = await api.watchPasses.getPlans();
      if (res?.plans) {
        for (const p of res.plans) {
          if (p.plan === 'PASS_24H') setPrice24h(p.priceRupees);
          if (p.plan === 'PASS_3D') setPrice3d(p.priceRupees);
          if (p.plan === 'PASS_7D') setPrice7d(p.priceRupees);
          if (p.plan === 'PASS_15D') setPrice15d(p.priceRupees);
        }
      }
    } catch {
      // Fallback
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await api.watchPasses.adminGetAnalytics();
      if (res) {
        setAnalytics(res);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchAnalytics();
  }, []);

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrices(true);
    try {
      const res = await api.watchPasses.adminUpdatePlans({
        price24h,
        price3d,
        price7d,
        price15d
      });
      if (res?.success) {
        showToast('Watch Pass pricing updated successfully!', 'success');
        fetchPlans();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update prices.', 'error');
    } finally {
      setSavingPrices(false);
    }
  };

  const planStats = [
    {
      id: 'PASS_24H' as const,
      label: '24 Hours',
      duration: '1 Day',
      quality: '720p HD',
      configuredPrice: price24h,
      stats: analytics.planMetrics?.PASS_24H || {
        sales: analytics.durationBreakdown?.['PASS_24H'] ?? 0,
        revenueRupees: analytics.revenueByPlan?.['PASS_24H'] ?? 0,
        active: analytics.activeByPlan?.['PASS_24H'] ?? 0,
      }
    },
    {
      id: 'PASS_3D' as const,
      label: '3 Days',
      duration: '3 Days',
      quality: '720p HD',
      configuredPrice: price3d,
      stats: analytics.planMetrics?.PASS_3D || {
        sales: analytics.durationBreakdown?.['PASS_3D'] ?? 0,
        revenueRupees: analytics.revenueByPlan?.['PASS_3D'] ?? 0,
        active: analytics.activeByPlan?.['PASS_3D'] ?? 0,
      }
    },
    {
      id: 'PASS_7D' as const,
      label: '7 Days',
      duration: '7 Days',
      quality: '1080p FHD',
      configuredPrice: price7d,
      isRecommended: true,
      stats: analytics.planMetrics?.PASS_7D || {
        sales: analytics.durationBreakdown?.['PASS_7D'] ?? 0,
        revenueRupees: analytics.revenueByPlan?.['PASS_7D'] ?? 0,
        active: analytics.activeByPlan?.['PASS_7D'] ?? 0,
      }
    },
    {
      id: 'PASS_15D' as const,
      label: '15 Days',
      duration: '15 Days',
      quality: '1080p FHD',
      configuredPrice: price15d,
      isBestValue: true,
      stats: analytics.planMetrics?.PASS_15D || {
        sales: analytics.durationBreakdown?.['PASS_15D'] ?? 0,
        revenueRupees: analytics.revenueByPlan?.['PASS_15D'] ?? 0,
        active: analytics.activeByPlan?.['PASS_15D'] ?? 0,
      }
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(245, 197, 24, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold, #F5C518)' }}>
              <Zap size={18} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
              Watch Pass Management & Analytics
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
            Configure dynamic pricing, review UTR submissions, and track isolated Watch Pass performance metrics (completely separated from subscription & per-movie purchases).
          </p>
        </div>

        <button
          onClick={() => { fetchAnalytics(); fetchPlans(); }}
          disabled={loadingAnalytics}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 700,
            cursor: loadingAnalytics ? 'not-allowed' : 'pointer',
            opacity: loadingAnalytics ? 0.7 : 1
          }}
        >
          <RefreshCw size={14} className={loadingAnalytics ? 'animate-spin' : ''} />
          <span>{loadingAnalytics ? 'Refreshing...' : 'Refresh Analytics'}</span>
        </button>
      </div>

      {/* OVERALL WATCH PASS ANALYTICS METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {/* Total Revenue */}
        <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', border: '1px solid rgba(245, 197, 24, 0.3)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase' }}>
              Watch Pass Revenue
            </span>
            <IndianRupee size={16} color="var(--brand-gold, #F5C518)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF' }}>
            ₹{analytics.totalRevenueRupees}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Isolated pass revenue
          </p>
        </div>

        {/* Active Passes */}
        <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#34D399', textTransform: 'uppercase' }}>
              Active Passes
            </span>
            <ShieldCheck size={16} color="#34D399" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#34D399' }}>
            {analytics.activePasses}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Currently streaming
          </p>
        </div>

        {/* Total Purchases */}
        <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>
              Total Purchases
            </span>
            <Film size={16} color="#9CA3AF" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF' }}>
            {analytics.totalPasses}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Completed orders
          </p>
        </div>

        {/* Pending Verification */}
        <div style={{ backgroundColor: analytics.pendingPasses > 0 ? 'rgba(245, 197, 24, 0.1)' : 'var(--bg-surface, #12121A)', borderRadius: '16px', border: analytics.pendingPasses > 0 ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: analytics.pendingPasses > 0 ? 'var(--brand-gold, #F5C518)' : '#9CA3AF', textTransform: 'uppercase' }}>
              Pending Verification
            </span>
            <Clock size={16} color={analytics.pendingPasses > 0 ? 'var(--brand-gold, #F5C518)' : '#9CA3AF'} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: analytics.pendingPasses > 0 ? 'var(--brand-gold, #F5C518)' : '#FFFFFF' }}>
            {analytics.pendingPasses}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Awaiting admin UTR review
          </p>
        </div>

        {/* Expired Passes */}
        <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>
              Expired Passes
            </span>
            <Clock size={16} color="#9CA3AF" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF' }}>
            {analytics.expiredPasses}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Preserved historical passes
          </p>
        </div>

        {/* Rejected Passes */}
        <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#F87171', textTransform: 'uppercase' }}>
              Rejected Passes
            </span>
            <XCircle size={16} color="#F87171" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#F87171' }}>
            {analytics.rejectedPasses}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Invalid UTR / unpaid
          </p>
        </div>

        {/* Average Revenue Per Pass */}
        <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', border: '1px solid rgba(192, 132, 252, 0.3)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#C084FC', textTransform: 'uppercase' }}>
              Avg Rev / Pass
            </span>
            <TrendingUp size={16} color="#C084FC" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#C084FC' }}>
            ₹{analytics.averageRevenueRupees ?? (analytics.totalRevenueRupees > 0 && (analytics.activePasses + analytics.expiredPasses) > 0 ? Math.round(analytics.totalRevenueRupees / (analytics.activePasses + analytics.expiredPasses)) : 0)}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Real average spend per pass
          </p>
        </div>

        {/* Top Purchased Duration */}
        <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', border: '1px solid rgba(96, 165, 250, 0.3)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase' }}>
              Top Duration
            </span>
            <Zap size={16} color="#60A5FA" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#60A5FA' }}>
            {(analytics.topDuration || 'PASS_7D').replace('PASS_', '')}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Most popular duration tier
          </p>
        </div>
      </div>

      {/* PLAN-WISE PERFORMANCE BREAKDOWN (24H, 3D, 7D, 15D) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <TrendingUp size={18} color="var(--brand-gold, #F5C518)" />
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Plan-Wise Performance & Revenue
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {planStats.map(p => (
            <div
              key={p.id}
              style={{
                backgroundColor: 'var(--bg-surface, #12121A)',
                borderRadius: '16px',
                border: p.isBestValue
                  ? '1.5px solid var(--brand-gold, #F5C518)'
                  : p.isRecommended
                  ? '1.5px solid rgba(245, 197, 24, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase' }}>
                    {p.id.replace('PASS_', '')}
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF', margin: '2px 0 0' }}>
                    {p.label}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)' }}>
                    ₹{p.configuredPrice}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{p.quality}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Sales</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                    {p.stats.sales}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Revenue</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', marginTop: '2px' }}>
                    ₹{p.stats.revenueRupees}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Active</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#34D399', marginTop: '2px' }}>
                    {p.stats.active}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DYNAMIC WATCH PASS PRICING CONFIGURATION (24H, 3D, 7D, 15D ONLY) */}
      <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Zap size={18} color="var(--brand-gold, #F5C518)" />
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Configure Dynamic Watch Pass Pricing
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '-8px 0 20px', lineHeight: 1.5 }}>
          Update the catalog-wide pass rates. Saved prices immediately reflect across all user plans, checkout modals, and dynamic UPI QR generation.
        </p>

        <form onSubmit={handleSavePrices} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>
              24 Hours Pass (₹)
            </label>
            <input
              type="number"
              min="1"
              value={price24h}
              onChange={e => setPrice24h(parseInt(e.target.value, 10) || 1)}
              style={{ width: '100%', marginTop: '6px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '16px', fontWeight: 800, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>
              3 Days Pass (₹)
            </label>
            <input
              type="number"
              min="1"
              value={price3d}
              onChange={e => setPrice3d(parseInt(e.target.value, 10) || 1)}
              style={{ width: '100%', marginTop: '6px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '16px', fontWeight: 800, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>
              7 Days Pass (₹)
            </label>
            <input
              type="number"
              min="1"
              value={price7d}
              onChange={e => setPrice7d(parseInt(e.target.value, 10) || 1)}
              style={{ width: '100%', marginTop: '6px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '16px', fontWeight: 800, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>
              15 Days Pass (₹)
            </label>
            <input
              type="number"
              min="1"
              value={price15d}
              onChange={e => setPrice15d(parseInt(e.target.value, 10) || 1)}
              style={{ width: '100%', marginTop: '6px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontSize: '16px', fontWeight: 800, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={savingPrices}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                color: '#0E0E12',
                fontWeight: 800,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {savingPrices ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save Pass Prices</span>
            </button>
          </div>
        </form>
      </div>

      {/* CENTRALIZED PAYMENT VERIFICATION NOTICE */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '720px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 197, 24, 0.12)',
              border: '1px solid rgba(245, 197, 24, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold, #F5C518)',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
              Centralized Payment Verification
            </h3>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
              All user payment requests — including Watch Passes, Movie purchases, Series purchases, and VIP Subscriptions — are verified exclusively in <strong>Verify Payments</strong>. Check submitted UTRs and activate access from the unified ledger.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('admin-payments')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            backgroundColor: 'var(--brand-gold, #F5C518)',
            color: '#0E0E12',
            fontSize: '13px',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(245, 197, 24, 0.25)'
          }}
        >
          <span>Go to Verify Payments</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

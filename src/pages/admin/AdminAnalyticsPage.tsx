import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
  Film,
  Zap,
  Crown,
  RefreshCw,
  Loader2,
} from 'lucide-react';

type AnalyticsFilter = 'ALL' | 'MOVIE_SERIES' | 'WATCH_PASS' | 'VIP_PLANS';

const WATCH_PASS_PLANS = [
  { id: 'PASS_24H', label: '24 Hours', priceRupees: 19, duration: '1 Day' },
  { id: 'PASS_3D', label: '3 Days', priceRupees: 29, duration: '3 Days' },
  { id: 'PASS_7D', label: '7 Days', priceRupees: 44, duration: '7 Days' },
  { id: 'PASS_15D', label: '15 Days', priceRupees: 69, duration: '15 Days' },
];

const VIP_PLANS = [
  { id: 'MONTHLY', label: 'Monthly', priceRupees: 89, duration: '30 Days' },
  { id: '3_MONTHS', label: '3 Months', priceRupees: 189, duration: '90 Days' },
  { id: 'YEARLY', label: '12 Months', priceRupees: 449, duration: '365 Days' },
];

const MOVIE_SERIES_PLANS = [
  { id: 'MOVIE', label: 'Movie Purchase', priceRupees: 30, validity: '30 Days Validity' },
  { id: 'SERIES', label: 'Series Purchase', priceRupees: 35, validity: '30 Days Validity' },
];

function StatCard({
  title,
  value,
  sub,
  color = '#F5C518',
}: {
  title: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: '18px 20px',
        borderRadius: '14px',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '6px',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: '26px',
          fontWeight: 900,
          color,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          marginBottom: '4px',
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: '#6B7280' }}>{sub}</div>}
    </div>
  );
}

interface AdminAnalyticsPageProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminAnalyticsPage: React.FC<AdminAnalyticsPageProps> = () => {
  const [filter, setFilter] = useState<AnalyticsFilter>('ALL');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (f: AnalyticsFilter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.getUnifiedAnalytics(f);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
  }, []);

  const FILTERS = [
    { id: 'ALL' as AnalyticsFilter, label: 'ALL', color: '#F5C518' },
    { id: 'MOVIE_SERIES' as AnalyticsFilter, label: 'MOVIE / SERIES', color: '#60A5FA' },
    { id: 'WATCH_PASS' as AnalyticsFilter, label: 'WATCH PASS', color: '#C084FC' },
    { id: 'VIP_PLANS' as AnalyticsFilter, label: 'VIP PLANS', color: '#34D399' },
  ];

  const activeFilter = FILTERS.find((f) => f.id === filter)!;

  return (
    <div
      style={{
        padding: '32px 24px',
        maxWidth: '1280px',
        margin: '0 auto',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#F5C518',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(245, 197, 24, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(245, 197, 24, 0.25)',
              }}
            >
              HYBRID MONETIZATION ANALYTICS
            </span>
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Unified Analytics
          </h1>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Real-time database-backed performance across Movie/Series, Watch Pass, and VIP Subscriptions.
          </p>
        </div>

        <button
          onClick={() => load(filter)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            color: '#FFFFFF',
          }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Exactly 4 Category Tabs */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                load(f.id);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                border: isActive ? `1.5px solid ${f.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: isActive ? `${f.color}18` : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? f.color : '#9CA3AF',
                transition: 'all 0.2s ease',
                letterSpacing: '0.04em',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '260px',
            gap: '12px',
            color: '#9CA3AF',
          }}
        >
          <Loader2 size={28} className="animate-spin" style={{ color: '#F5C518' }} />
          <span>Loading database metrics...</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#FCA5A5',
            marginBottom: '24px',
          }}
        >
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Main Revenue & Sales Hero Banner */}
          <div
            style={{
              padding: '24px 28px',
              borderRadius: '16px',
              marginBottom: '24px',
              background: `linear-gradient(135deg, ${activeFilter.color}15 0%, rgba(18, 18, 26, 0.8) 100%)`,
              border: `1.5px solid ${activeFilter.color}40`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: activeFilter.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '6px',
                }}
              >
                {activeFilter.label} — Total Revenue
              </div>
              <div
                style={{
                  fontSize: '44px',
                  fontWeight: 900,
                  color: activeFilter.color,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                ₹{(data.totalRevenueRupees || 0).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total Sales
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF' }}>
                  {(data.totalSales || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Entitlements
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#10B981' }}>
                  {(data.active || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700 }}>
                  Pending Verification
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#F59E0B' }}>
                  {(data.pending || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Database-Backed Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: '14px',
              marginBottom: '32px',
            }}
          >
            <StatCard
              title="Total Sales"
              value={data.totalSales || 0}
              sub="Completed purchases"
              color={activeFilter.color}
            />
            <StatCard
              title="Total Revenue"
              value={`₹${(data.totalRevenueRupees || 0).toLocaleString()}`}
              sub="Platform gross"
              color="#10B981"
            />
            <StatCard
              title="Successful"
              value={data.successful || 0}
              sub="Approved transactions"
              color="#34D399"
            />
            <StatCard
              title="Pending"
              value={data.pending || 0}
              sub="Awaiting admin review"
              color="#F59E0B"
            />
            <StatCard
              title="Rejected"
              value={data.rejected || 0}
              sub="Declined UTRs"
              color="#EF4444"
            />
            <StatCard
              title="Active Entitlements"
              value={data.active || 0}
              sub="Currently valid access"
              color="#60A5FA"
            />
            <StatCard
              title="Expired Entitlements"
              value={data.expired || 0}
              sub="Past validity period"
              color="#9CA3AF"
            />
          </div>

          {/* Category-Specific Plan-Wise Breakdown */}

          {/* 1. MOVIE / SERIES BREAKDOWN */}
          {(filter === 'ALL' || filter === 'MOVIE_SERIES') && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Film size={18} style={{ color: '#60A5FA' }} />
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#60A5FA', margin: 0 }}>
                  Movie / Series Ownership Breakdown (30 Days Validity)
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                {MOVIE_SERIES_PLANS.map((plan) => {
                  const rev = data.movieSeries?.byPlan?.[plan.id] ?? 0;
                  return (
                    <div
                      key={plan.id}
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        backgroundColor: 'rgba(96, 165, 250, 0.05)',
                        border: '1px solid rgba(96, 165, 250, 0.18)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#E5E7EB' }}>{plan.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#60A5FA', backgroundColor: 'rgba(96, 165, 250, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                          ₹{plan.priceRupees}
                        </span>
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#60A5FA', margin: '4px 0' }}>
                        ₹{rev.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{plan.validity}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. WATCH PASS BREAKDOWN */}
          {(filter === 'ALL' || filter === 'WATCH_PASS') && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Zap size={18} style={{ color: '#C084FC' }} />
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#C084FC', margin: 0 }}>
                  Watch Pass Plan-Wise Breakdown
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                {WATCH_PASS_PLANS.map((plan) => {
                  const rev = data.watchPass?.byPlan?.[plan.id] ?? 0;
                  return (
                    <div
                      key={plan.id}
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        backgroundColor: 'rgba(192, 132, 252, 0.05)',
                        border: '1px solid rgba(192, 132, 252, 0.18)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#E5E7EB' }}>{plan.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#C084FC', backgroundColor: 'rgba(192, 132, 252, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                          ₹{plan.priceRupees}
                        </span>
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#C084FC', margin: '4px 0' }}>
                        ₹{rev.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Valid for {plan.duration}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. VIP PLANS BREAKDOWN */}
          {(filter === 'ALL' || filter === 'VIP_PLANS') && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Crown size={18} style={{ color: '#34D399' }} />
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#34D399', margin: 0 }}>
                  VIP Subscription Plan-Wise Breakdown
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {VIP_PLANS.map((plan) => {
                  const rev = data.vipPlans?.byPlan?.[plan.id] ?? 0;
                  return (
                    <div
                      key={plan.id}
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        backgroundColor: 'rgba(52, 211, 153, 0.05)',
                        border: '1px solid rgba(52, 211, 153, 0.18)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#E5E7EB' }}>{plan.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#34D399', backgroundColor: 'rgba(52, 211, 153, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                          ₹{plan.priceRupees}
                        </span>
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#34D399', margin: '4px 0' }}>
                        ₹{rev.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Valid for {plan.duration}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Transactions Table */}
          {data.recentTransactions && data.recentTransactions.length > 0 && (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginBottom: '16px' }}>
                Recent Transactions ({activeFilter.label})
              </h2>
              <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                      {['User', 'Category', 'Item / Plan', 'Amount', 'Date'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 16px',
                            textAlign: h === 'Amount' || h === 'Date' ? 'right' : 'left',
                            fontWeight: 700,
                            color: '#9CA3AF',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.map((tx: any, i: number) => {
                      const catColors: Record<string, string> = {
                        MOVIE_SERIES: '#60A5FA',
                        WATCH_PASS: '#C084FC',
                        VIP_PLANS: '#34D399',
                      };
                      const color = catColors[tx.category] || '#F5C518';
                      const catLabel =
                        tx.category === 'MOVIE_SERIES'
                          ? 'Movie/Series'
                          : tx.category === 'WATCH_PASS'
                          ? 'Watch Pass'
                          : 'VIP Plan';
                      return (
                        <tr
                          key={tx.id || i}
                          style={{
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                          }}
                        >
                          <td style={{ padding: '12px 16px', color: '#E5E7EB', fontWeight: 600 }}>
                            {tx.userName || 'Anonymous User'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color,
                                backgroundColor: `${color}18`,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {catLabel}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#D1D5DB' }}>{tx.title}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color, fontWeight: 800 }}>
                            ₹{tx.amountRupees}
                          </td>
                          <td
                            style={{
                              padding: '12px 16px',
                              textAlign: 'right',
                              color: '#6B7280',
                              fontSize: '12px',
                            }}
                          >
                            {tx.timestamp
                              ? new Date(tx.timestamp).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Loader2,
  X
} from 'lucide-react';

interface AdminResetPageProps {
  onNavigateTab?: (tab: string, param?: string) => void;
}

export const AdminResetPage: React.FC<AdminResetPageProps> = ({ onNavigateTab: _onNavigateTab }) => {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [understoodChecked, setUnderstoodChecked] = useState(false);

  const fetchCurrentStats = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getDashboard(new Date().getTimezoneOffset());
      setStats(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch platform metrics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentStats();
  }, []);

  const handlePerformReset = async () => {
    if (!understoodChecked) {
      showToast('Please check the confirmation box to proceed.', 'error');
      return;
    }

    try {
      setResetting(true);
      const res = await api.admin.resetFinancialAnalytics();
      showToast(res.message || 'Platform statistics reset successfully. Fresh accounting period started.', 'success');
      setShowConfirmModal(false);
      setUnderstoodChecked(false);
      await fetchCurrentStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset platform statistics.', 'error');
    } finally {
      setResetting(false);
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#9CA3AF' }}>
        <Loader2 size={28} className="spin" color="var(--brand-gold, #F5C518)" />
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading Reset & Accounting Console...</span>
      </div>
    );
  }

  const accountingResetAt = stats?.accountingResetAt;
  const cycleStartDate = accountingResetAt ? new Date(accountingResetAt).toLocaleString() : 'Platform Inception (All-Time)';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 0 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444'
            }}
          >
            <RotateCcw size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
              Reset Analytics &amp; Financial Records
            </h1>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Initiate a fresh accounting cycle by resetting cumulative revenue and transaction statistics. Catalog, media, ads, trailers, and users are never deleted.
            </p>
          </div>
        </div>
      </div>

      {/* Active Accounting Period Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--brand-gold, #F5C518)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Active Accounting Period Status
            </h2>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              padding: '4px 10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            LIVE ACCOUNTING
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
              Cycle Start Timestamp
            </span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px' }}>
              {cycleStartDate}
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
              Cumulative Revenue In Cycle
            </span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)', marginTop: '4px' }}>
              ₹{stats?.totalRevenueRupees ?? 0}
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
              Cumulative Purchases In Cycle
            </span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#34D399', marginTop: '4px' }}>
              {stats?.totalPurchases ?? 0}
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
              Wallet Recharges In Cycle
            </span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#C084FC', marginTop: '4px' }}>
              ₹{stats?.walletActivity?.totalRechargeRupees ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Strict Data Boundaries Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Box 1: What Resets to 0 */}
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '22px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <RotateCcw size={18} color="#EF4444" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F87171', margin: 0 }}>
              DATA THAT WILL RESET TO 0
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#E5E7EB', lineHeight: 1.8 }}>
            <li><strong>Net Profit</strong> (restarts accumulation from 0)</li>
            <li><strong>Total Revenue</strong> (all-time &amp; today platform gross)</li>
            <li><strong>Total Purchases</strong> (cumulative content sales count)</li>
            <li><strong>Total UPI Payments</strong> (cumulative approved wallet recharges)</li>
            <li><strong>All-Time Platform Summary Total Revenue</strong></li>
            <li><strong>Financial &amp; Transactional Summary Counters</strong></li>
          </ul>
          <div style={{ marginTop: '14px', fontSize: '12px', color: '#FCA5A5', fontStyle: 'italic' }}>
            ✓ New purchases and payments after reset will immediately begin accumulating from 0 onward.
          </div>
        </div>

        {/* Box 2: What is Strictly Protected */}
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            padding: '22px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <ShieldCheck size={18} color="#10B981" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#34D399', margin: 0 }}>
              STRICTLY PRESERVED &amp; NEVER DELETED
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#E5E7EB', lineHeight: 1.8 }}>
            <li><strong>Movies &amp; Web Series</strong> (all 300+ catalog titles intact)</li>
            <li><strong>Episodes, Seasons &amp; Media</strong> (all video streams intact)</li>
            <li><strong>Posters &amp; Backdrops</strong> (all visual assets preserved)</li>
            <li><strong>Advertisement Media Library</strong> (all photos &amp; videos intact)</li>
            <li><strong>Active Advertisements &amp; Trailers</strong> (untouched)</li>
            <li><strong>User Accounts &amp; Authentication</strong> (all accounts safe)</li>
          </ul>
          <div style={{ marginTop: '14px', fontSize: '12px', color: '#6EE7B7', fontStyle: 'italic' }}>
            ✓ Platform content, streaming infrastructure, and media files remain 100% untouched.
          </div>
        </div>
      </div>

      {/* Trigger Button Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '16px',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
            Initiate Financial Records Reset
          </h3>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
            Clicking reset starts a new accounting window. A mandatory confirmation step is required.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setUnderstoodChecked(false);
            setShowConfirmModal(true);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#DC2626',
            border: 'none',
            borderRadius: '10px',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(220, 38, 38, 0.35)',
            transition: 'all 0.15s ease'
          }}
        >
          <RotateCcw size={18} />
          <span>Reset Platform Statistics</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#12121A',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              maxWidth: '540px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#EF4444'
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Confirm Statistics Reset
                </h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderRadius: '10px',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '14px 16px',
                fontSize: '13px',
                color: '#F87171',
                lineHeight: 1.6,
                marginBottom: '20px'
              }}
            >
              <strong>Reset platform statistics?</strong> This will reset revenue/purchase/payment summary counters. Your catalog, media, ads and trailers will <strong>NOT</strong> be deleted.
            </div>

            <div style={{ fontSize: '13px', color: '#D1D5DB', marginBottom: '20px', lineHeight: 1.6 }}>
              All cumulative metrics (Net Profit, Total Revenue, Total Purchases, Total UPI Payments) will start fresh from <strong>₹0</strong>. Any new purchases made after this moment will accumulate cleanly in your new accounting window.
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: 'pointer',
                marginBottom: '24px',
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <input
                type="checkbox"
                checked={understoodChecked}
                onChange={e => setUnderstoodChecked(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#EF4444',
                  cursor: 'pointer',
                  marginTop: '2px'
                }}
              />
              <span style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 600, lineHeight: 1.5 }}>
                I confirm that I want to reset cumulative platform revenue and transaction counters. I understand catalog, videos, trailers, and media will remain intact.
              </span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={resetting}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePerformReset}
                disabled={!understoodChecked || resetting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  backgroundColor: understoodChecked && !resetting ? '#DC2626' : 'rgba(220, 38, 38, 0.4)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: understoodChecked && !resetting ? 'pointer' : 'not-allowed',
                  boxShadow: understoodChecked ? '0 4px 14px rgba(220, 38, 38, 0.4)' : 'none'
                }}
              >
                {resetting ? <Loader2 size={16} className="spin" /> : <RotateCcw size={16} />}
                <span>{resetting ? 'Resetting...' : 'Confirm Reset Statistics'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

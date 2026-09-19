import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Crown,
  Film,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  IndianRupee,
  RefreshCw,
  Calendar,
  Gift,
  X
} from 'lucide-react';

interface AdminMonetizationPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminMonetizationPage: React.FC<AdminMonetizationPageProps> = () => {
  const { showToast, refreshMonetizationConfig } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Monetization Mode
  const [mode, setMode] = useState<'PER_CONTENT' | 'SUBSCRIPTION'>('PER_CONTENT');

  // Plan Prices (in Rupees)
  const [monthlyPrice, setMonthlyPrice] = useState<number>(89);
  const [threeMonthsPrice, setThreeMonthsPrice] = useState<number>(189);
  const [yearlyPrice, setYearlyPrice] = useState<number>(449);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalSubscriptions: 0,
    activeCount: 0,
    pendingCount: 0,
    totalRevenueRupees: 0,
  });

  // Subscription Requests tab
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'all'>('pending');
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Grant Subscription Modal State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantPlan, setGrantPlan] = useState<'MONTHLY' | '3_MONTHS' | 'YEARLY'>('MONTHLY');
  const [grantNote, setGrantNote] = useState('');
  const [granting, setGranting] = useState(false);

  // Load initial settings
  const fetchMonetizationSettings = async () => {
    try {
      setLoading(true);
      const res = await api.monetization.getAdminConfig();
      if (res?.config) {
        setMode(res.config.mode);
        setMonthlyPrice(res.config.monthlyPrice || 89);
        setThreeMonthsPrice(res.config.threeMonthsPrice || 189);
        setYearlyPrice(res.config.yearlyPrice || 449);
        if (res.config.metrics) {
          setMetrics(res.config.metrics);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load monetization configuration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load subscription requests
  const fetchSubscriptionRequests = async () => {
    try {
      setLoadingRequests(true);
      const statusFilter = activeTab === 'pending' ? 'PENDING' : activeTab === 'active' ? 'ACTIVE' : undefined;
      const res = await api.subscriptions.adminGetRequests(statusFilter, 100);
      if (res && res.requests) {
        setRequests(res.requests);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load subscription requests.', 'error');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchMonetizationSettings();
  }, []);

  useEffect(() => {
    fetchSubscriptionRequests();
  }, [activeTab]);

  // Save Mode and Plan Prices
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.monetization.updateAdminConfig({
        mode,
        monthlyPrice: Number(monthlyPrice),
        threeMonthsPrice: Number(threeMonthsPrice),
        yearlyPrice: Number(yearlyPrice),
      });

      if (res?.config) {
        setMode(res.config.mode);
        setMonthlyPrice(res.config.monthlyPrice);
        setThreeMonthsPrice(res.config.threeMonthsPrice);
        setYearlyPrice(res.config.yearlyPrice);
        if (res.config.metrics) setMetrics(res.config.metrics);
      }

      await refreshMonetizationConfig();
      showToast(res.message || 'Monetization settings saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save monetization settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Approve subscription payment
  const handleApprove = async (subscriptionId: string) => {
    try {
      setProcessingId(subscriptionId);
      const res = await api.subscriptions.adminApprove(subscriptionId);
      showToast(res.message || 'Subscription approved successfully!', 'success');
      await fetchSubscriptionRequests();
      await fetchMonetizationSettings();
      await refreshMonetizationConfig();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve subscription.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject subscription payment
  const handleReject = async (subscriptionId: string) => {
    const reason = prompt('Enter a reason for rejecting this payment (optional):', 'Payment UTR could not be verified in bank account');
    if (reason === null) return; // User cancelled prompt

    try {
      setProcessingId(subscriptionId);
      const res = await api.subscriptions.adminReject(subscriptionId, reason);
      showToast(res.message || 'Subscription rejected.', 'info');
      await fetchSubscriptionRequests();
      await fetchMonetizationSettings();
      await refreshMonetizationConfig();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject subscription.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Manual Grant Subscription
  const handleGrantSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUserId.trim()) {
      showToast('User ID is required.', 'error');
      return;
    }

    try {
      setGranting(true);
      const res = await api.subscriptions.adminGrant(grantUserId.trim(), grantPlan, grantNote.trim());
      showToast(res.message || 'Subscription granted successfully!', 'success');
      setShowGrantModal(false);
      setGrantUserId('');
      setGrantNote('');
      await fetchSubscriptionRequests();
      await fetchMonetizationSettings();
    } catch (err: any) {
      showToast(err.message || 'Failed to grant subscription.', 'error');
    } finally {
      setGranting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#9CA3AF' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--brand-gold, #F5C518)' }} />
        <span>Loading monetization systems...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 166, 35, 0.15)',
                border: '1px solid rgba(245, 166, 35, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold)'
              }}
            >
              <Crown size={20} />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
              Subscription & Monetization Controls
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '6px 0 0' }}>
            Switch between Per-Movie purchase and OTT Subscription mode, adjust plan prices, and verify user subscription payments.
          </p>
        </div>

        <button
          onClick={() => setShowGrantModal(true)}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Gift size={16} color="var(--brand-gold)" />
          <span>Grant VIP Access</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}
      >
        <div
          style={{
            backgroundColor: '#161622',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '13px', fontWeight: 600 }}>
            <Crown size={16} color="var(--brand-gold)" />
            <span>Active Mode</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginTop: '8px' }}>
            {mode === 'SUBSCRIPTION' ? 'Subscription Based' : 'Per Movie/Series'}
          </div>
          <div style={{ fontSize: '12px', color: mode === 'SUBSCRIPTION' ? 'var(--brand-gold)' : '#10B981', marginTop: '4px', fontWeight: 600 }}>
            {mode === 'SUBSCRIPTION' ? 'OTT Plans Active' : 'Wallet & Purchases Active'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#161622',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '13px', fontWeight: 600 }}>
            <Clock size={16} color="var(--brand-gold)" />
            <span>Pending Verifications</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: metrics.pendingCount > 0 ? 'var(--brand-gold)' : '#FFFFFF', marginTop: '8px' }}>
            {metrics.pendingCount}
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            Awaiting Admin UPI review
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#161622',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '13px', fontWeight: 600 }}>
            <ShieldCheck size={16} color="#10B981" />
            <span>Active Subscribers</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '8px' }}>
            {metrics.activeCount}
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            Currently valid subscriptions
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#161622',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '13px', fontWeight: 600 }}>
            <IndianRupee size={16} color="var(--brand-gold)" />
            <span>Subscription Revenue</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '8px' }}>
            ₹{metrics.totalRevenueRupees}
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            From verified plans
          </div>
        </div>
      </div>

      {/* SECTION 1: MONETIZATION MODE & PRICING FORM */}
      <form onSubmit={handleSaveSettings} style={{ marginBottom: '40px' }}>
        <div
          style={{
            backgroundColor: '#161622',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            marginBottom: '24px'
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 16px' }}>
            1. Select Active Monetization Mode
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            There must be exactly one active monetization mode at a time. Switching modes preserves all existing user wallets, purchases, and subscriptions.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginBottom: '32px'
            }}
          >
            {/* Mode A Card */}
            <div
              onClick={() => setMode('PER_CONTENT')}
              style={{
                padding: '20px',
                borderRadius: '16px',
                border: mode === 'PER_CONTENT' ? '2px solid var(--brand-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: mode === 'PER_CONTENT' ? 'rgba(245, 166, 35, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Film size={22} color={mode === 'PER_CONTENT' ? 'var(--brand-gold)' : '#9CA3AF'} />
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                    Mode A — Per Movie/Series
                  </span>
                </div>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: mode === 'PER_CONTENT' ? '6px solid var(--brand-gold)' : '2px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: mode === 'PER_CONTENT' ? '#FFFFFF' : 'transparent',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                • Existing wallet & UPI recharge system remains fully active.<br />
                • Movies and series display individual prices (₹10 / ₹20).<br />
                • Users purchase content for permanent library ownership.
              </div>
            </div>

            {/* Mode B Card */}
            <div
              onClick={() => setMode('SUBSCRIPTION')}
              style={{
                padding: '20px',
                borderRadius: '16px',
                border: mode === 'SUBSCRIPTION' ? '2px solid var(--brand-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: mode === 'SUBSCRIPTION' ? 'rgba(245, 166, 35, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Crown size={22} color={mode === 'SUBSCRIPTION' ? 'var(--brand-gold)' : '#9CA3AF'} />
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                    Mode B — Subscription Based
                  </span>
                </div>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: mode === 'SUBSCRIPTION' ? '6px solid var(--brand-gold)' : '2px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: mode === 'SUBSCRIPTION' ? '#FFFFFF' : 'transparent',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                • OTT platform behavior with Monthly, 3-Month, and 12-Month plans.<br />
                • Completely hides wallet, recharge, and individual price tags from user UI.<br />
                • Active subscription grants full catalog playback access.
              </div>
            </div>
          </div>

          {/* Subscription Plans Pricing */}
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 16px' }}>
            2. Configure Subscription Plan Prices
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Set the dynamic pricing for all 3 VIP subscription plans (Monthly ₹89, 3 Months ₹189, 12 Months ₹449). Prices are persistently saved in the database and loaded by clients in real time.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
              marginBottom: '28px'
            }}
          >
            {/* Monthly Plan */}
            <div
              style={{
                backgroundColor: '#1B1B28',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Calendar size={16} color="var(--brand-gold)" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>Monthly Plan</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                30 Days Full Access
              </div>

              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#9CA3AF', marginBottom: '6px' }}>
                Price in INR (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--brand-gold)', fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  min="0"
                  value={monthlyPrice}
                  onChange={e => setMonthlyPrice(Number(e.target.value))}
                  required
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 28px',
                    borderRadius: '10px',
                    backgroundColor: '#12121A',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontWeight: 700
                  }}
                />
              </div>
            </div>

            {/* 3 Months Plan */}
            <div
              style={{
                backgroundColor: '#1B1B28',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Calendar size={16} color="var(--brand-gold)" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>3 Months Plan</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                90 Days Full Access (Quarterly Value)
              </div>

              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#9CA3AF', marginBottom: '6px' }}>
                Price in INR (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--brand-gold)', fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  min="0"
                  value={threeMonthsPrice}
                  onChange={e => setThreeMonthsPrice(Number(e.target.value))}
                  required
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 28px',
                    borderRadius: '10px',
                    backgroundColor: '#12121A',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontWeight: 700
                  }}
                />
              </div>
            </div>

            {/* Yearly Plan */}
            <div
              style={{
                backgroundColor: '#1B1B28',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Crown size={16} color="var(--brand-gold)" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>12 Months / Full Year</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                365 Days Unlimited Access (Best Value)
              </div>

              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#9CA3AF', marginBottom: '6px' }}>
                Price in INR (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--brand-gold)', fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  min="0"
                  value={yearlyPrice}
                  onChange={e => setYearlyPrice(Number(e.target.value))}
                  required
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 28px',
                    borderRadius: '10px',
                    backgroundColor: '#12121A',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontWeight: 700
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-lg"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Monetization Mode & Prices</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* SECTION 2: SUBSCRIPTION PAYMENT REQUESTS & VERIFICATIONS */}
      <div
        style={{
          backgroundColor: '#161622',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Subscription Requests & User Verification
            </h2>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Review manual UPI payments with UTR reference numbers. Approving activates the subscription; rejecting denies access.
            </p>
          </div>

          <button
            onClick={fetchSubscriptionRequests}
            disabled={loadingRequests}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loadingRequests ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '12px',
            marginBottom: '20px'
          }}
        >
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'pending' ? 'rgba(245, 166, 35, 0.15)' : 'transparent',
              color: activeTab === 'pending' ? 'var(--brand-gold)' : '#9CA3AF',
              border: activeTab === 'pending' ? '1px solid rgba(245, 166, 35, 0.3)' : '1px solid transparent',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Pending Review ({metrics.pendingCount})
          </button>

          <button
            onClick={() => setActiveTab('active')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeTab === 'active' ? '#10B981' : '#9CA3AF',
              border: activeTab === 'active' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Active Subscribers ({metrics.activeCount})
          </button>

          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'all' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: activeTab === 'all' ? '#FFFFFF' : '#9CA3AF',
              border: activeTab === 'all' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            All Records
          </button>
        </div>

        {/* Requests Table / List */}
        {loadingRequests ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '10px', color: '#9CA3AF' }}>
            <Loader2 className="animate-spin" size={20} />
            <span>Loading subscription records...</span>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
            <p style={{ margin: 0, fontSize: '14px' }}>No subscription records found for this filter.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map(req => {
              const isPending = req.status === 'PENDING';
              const isActive = req.status === 'ACTIVE';
              const isRejected = req.status === 'REJECTED';

              return (
                <div
                  key={req.id}
                  style={{
                    padding: '18px 20px',
                    borderRadius: '14px',
                    backgroundColor: '#1A1A28',
                    border: isPending ? '1px solid rgba(245, 166, 35, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div style={{ minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                        {req.user_name || 'User'}
                      </span>
                      <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
                        ({req.user_email || req.user_id})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '6px', fontSize: '13px', color: '#9CA3AF' }}>
                      <span style={{ color: 'var(--brand-gold)', fontWeight: 700 }}>
                        {req.plan} PLAN • ₹{req.amount_paid}
                      </span>
                      <span>•</span>
                      <span>
                        UTR: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{req.payment_reference || 'N/A'}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Submitted: {new Date(req.submitted_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {req.start_date && req.end_date && (
                      <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>
                        Active: {new Date(req.start_date).toLocaleDateString('en-IN')} → {new Date(req.end_date).toLocaleDateString('en-IN')}
                      </div>
                    )}

                    {req.admin_note && (
                      <div style={{ fontSize: '12px', color: isRejected ? '#F87171' : '#9CA3AF', marginTop: '4px' }}>
                        Note: {req.admin_note}
                      </div>
                    )}
                  </div>

                  {/* Actions & Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={processingId === req.id}
                          className="btn btn-secondary btn-sm"
                          style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#EF4444' }}
                        >
                          <XCircle size={14} />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={processingId === req.id}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {processingId === req.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          <span>Approve & Activate</span>
                        </button>
                      </>
                    ) : (
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: isActive
                            ? 'rgba(16, 185, 129, 0.15)'
                            : isRejected
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(255, 255, 255, 0.1)',
                          color: isActive ? '#10B981' : isRejected ? '#EF4444' : '#9CA3AF'
                        }}
                      >
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GRANT VIP SUBSCRIPTION MODAL */}
      {showGrantModal && (
        <div className="modal-backdrop" onClick={() => setShowGrantModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={20} color="var(--brand-gold)" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Grant VIP Subscription
                </h3>
              </div>
              <button onClick={() => setShowGrantModal(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGrantSubscription} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                  Target User ID or Email <span style={{ color: '#F87171' }}>*</span>
                </label>
                <input
                  type="text"
                  value={grantUserId}
                  onChange={e => setGrantUserId(e.target.value)}
                  placeholder="e.g. usr-123456 or user email"
                  required
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#161622',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#FFFFFF'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                  Subscription Plan <span style={{ color: '#F87171' }}>*</span>
                </label>
                <select
                  value={grantPlan}
                  onChange={e => setGrantPlan(e.target.value as any)}
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#161622',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#FFFFFF'
                  }}
                >
                  <option value="MONTHLY">Monthly Plan (30 Days — ₹89)</option>
                  <option value="3_MONTHS">3 Months Plan (90 Days — ₹189)</option>
                  <option value="YEARLY">12 Months / Full Year (365 Days — ₹449)</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                  Admin Note
                </label>
                <input
                  type="text"
                  value={grantNote}
                  onChange={e => setGrantNote(e.target.value)}
                  placeholder="e.g. Granted promotional access"
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#161622',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#FFFFFF'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {granting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>Grant Access</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

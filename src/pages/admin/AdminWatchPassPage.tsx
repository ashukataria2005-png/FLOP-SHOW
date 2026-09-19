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
  Search
} from 'lucide-react';

interface AdminWatchPassPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminWatchPassPage: React.FC<AdminWatchPassPageProps> = () => {
  const { showToast } = useApp();

  // Plans pricing state
  const [price24h, setPrice24h] = useState<number>(29);
  const [price3d, setPrice3d] = useState<number>(49);
  const [price7d, setPrice7d] = useState<number>(79);
  const [price30d, setPrice30d] = useState<number>(149);
  const [savingPrices, setSavingPrices] = useState(false);

  // Separated Analytics
  const [analytics, setAnalytics] = useState({
    totalPasses: 0,
    activePasses: 0,
    expiredPasses: 0,
    pendingPasses: 0,
    totalRevenueRupees: 0,
    durationBreakdown: {} as Record<string, number>
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Requests Table
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'expired' | 'all'>('pending');
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPlans = async () => {
    try {
      const res = await api.watchPasses.getPlans();
      if (res?.plans) {
        for (const p of res.plans) {
          if (p.plan === 'PASS_24H') setPrice24h(p.priceRupees);
          if (p.plan === 'PASS_3D') setPrice3d(p.priceRupees);
          if (p.plan === 'PASS_7D') setPrice7d(p.priceRupees);
          if (p.plan === 'PASS_30D') setPrice30d(p.priceRupees);
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

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const statusFilter = activeTab === 'all' ? undefined : activeTab.toUpperCase();
      const res = await api.watchPasses.adminGetRequests(statusFilter, 100);
      if (res && res.requests) {
        setRequests(res.requests);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrices(true);
    try {
      const res = await api.watchPasses.adminUpdatePlans({
        price24h,
        price3d,
        price7d,
        price30d
      });
      if (res?.success) {
        showToast('Watch Pass pricing updated successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update prices.', 'error');
    } finally {
      setSavingPrices(false);
    }
  };

  const handleApprove = async (passId: string) => {
    setProcessingId(passId);
    try {
      const res = await api.watchPasses.adminApprove(passId);
      if (res?.success) {
        showToast('Watch Pass approved and activated!', 'success');
        fetchRequests();
        fetchAnalytics();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to approve pass.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (passId: string) => {
    const reason = window.prompt('Enter rejection reason (optional):', 'UTR invalid or payment not received');
    if (reason === null) return;

    setProcessingId(passId);
    try {
      const res = await api.watchPasses.adminReject(passId, reason);
      if (res?.success) {
        showToast('Watch Pass request rejected.', 'info');
        fetchRequests();
        fetchAnalytics();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reject pass.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.content_title || '').toLowerCase().includes(q) ||
      (r.user_name || '').toLowerCase().includes(q) ||
      (r.user_email || '').toLowerCase().includes(q) ||
      (r.payment_reference || '').toLowerCase().includes(q)
    );
  });

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
            Configure pricing, review UTR payments, and monitor dedicated Watch Pass metrics (completely separated from subscription & movie purchases).
          </p>
        </div>

        <button
          onClick={() => { fetchAnalytics(); fetchRequests(); }}
          disabled={loadingAnalytics || loadingRequests}
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
            cursor: loadingAnalytics || loadingRequests ? 'not-allowed' : 'pointer',
            opacity: loadingAnalytics || loadingRequests ? 0.7 : 1
          }}
        >
          <RefreshCw size={14} className={loadingAnalytics || loadingRequests ? 'animate-spin' : ''} />
          <span>{loadingAnalytics ? 'Refreshing...' : 'Refresh Ledger'}</span>
        </button>
      </div>

      {/* SEPARATED WATCH PASS ANALYTICS METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Card 1: Revenue */}
        <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', border: '1px solid rgba(245, 197, 24, 0.3)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase' }}>
              Watch Pass Revenue
            </span>
            <IndianRupee size={16} color="var(--brand-gold, #F5C518)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF' }}>
            ₹{analytics.totalRevenueRupees}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Direct passes revenue
          </p>
        </div>

        {/* Card 2: Active Passes */}
        <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#34D399', textTransform: 'uppercase' }}>
              Active Passes
            </span>
            <ShieldCheck size={16} color="#34D399" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#34D399' }}>
            {analytics.activePasses}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Currently valid passes
          </p>
        </div>

        {/* Card 3: Pending Passes */}
        <div style={{ backgroundColor: analytics.pendingPasses > 0 ? 'rgba(245, 197, 24, 0.1)' : 'var(--bg-surface, #12121A)', borderRadius: '16px', border: analytics.pendingPasses > 0 ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: analytics.pendingPasses > 0 ? 'var(--brand-gold, #F5C518)' : '#9CA3AF', textTransform: 'uppercase' }}>
              Pending Verification
            </span>
            <Clock size={16} color={analytics.pendingPasses > 0 ? 'var(--brand-gold, #F5C518)' : '#9CA3AF'} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: analytics.pendingPasses > 0 ? 'var(--brand-gold, #F5C518)' : '#FFFFFF' }}>
            {analytics.pendingPasses}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            UTR approval requests
          </p>
        </div>

        {/* Card 4: Total Passes */}
        <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>
              Total Passes Purchased
            </span>
            <Film size={16} color="#9CA3AF" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF' }}>
            {analytics.totalPasses}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>
            {analytics.expiredPasses} expired historically
          </p>
        </div>
      </div>

      {/* WATCH PASS PLAN PRICING EDITOR */}
      <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Zap size={18} color="var(--brand-gold, #F5C518)" />
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Configure Watch Pass Pricing Tiers
          </h2>
        </div>

        <form onSubmit={handleSavePrices} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>
              24 Hours Pass Price (₹)
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
              3 Days Pass Price (₹)
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
              7 Days Pass Price (₹)
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
              30 Days Pass Price (₹)
            </label>
            <input
              type="number"
              min="1"
              value={price30d}
              onChange={e => setPrice30d(parseInt(e.target.value, 10) || 1)}
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

      {/* WATCH PASS REQUESTS & VERIFICATION LEDGER */}
      <div style={{ backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['pending', 'active', 'expired', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: activeTab === tab ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.04)',
                  color: activeTab === tab ? '#0E0E12' : '#9CA3AF',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#6B7280' }} />
            <input
              type="text"
              placeholder="Search user, title, UTR..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Requests Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9CA3AF' }}>
                <th style={{ padding: '12px 14px' }}>TITLE</th>
                <th style={{ padding: '12px 14px' }}>USER</th>
                <th style={{ padding: '12px 14px' }}>PLAN</th>
                <th style={{ padding: '12px 14px' }}>AMOUNT</th>
                <th style={{ padding: '12px 14px' }}>UTR</th>
                <th style={{ padding: '12px 14px' }}>STATUS</th>
                <th style={{ padding: '12px 14px' }}>TIMESTAMPS</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loadingRequests ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#9CA3AF' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Loading Watch Pass requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#9CA3AF' }}>
                    No Watch Pass records found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#FFFFFF' }}>
                      {r.content_title || r.content_id}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{r.user_name || 'User'}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{r.user_email || r.user_id}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(245, 197, 24, 0.15)', color: 'var(--brand-gold, #F5C518)', fontSize: '11px', fontWeight: 800 }}>
                        {r.plan.replace('PASS_', '')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#FFFFFF' }}>
                      ₹{r.amount_paid}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#D1D5DB' }}>
                      {r.payment_reference || 'N/A'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor:
                            r.status === 'ACTIVE'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : r.status === 'PENDING'
                              ? 'rgba(245, 197, 24, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                          color:
                            r.status === 'ACTIVE'
                              ? '#34D399'
                              : r.status === 'PENDING'
                              ? 'var(--brand-gold, #F5C518)'
                              : '#F87171'
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '11.5px', color: '#9CA3AF' }}>
                      <div>Sub: {new Date(r.submitted_at).toLocaleDateString('en-IN')}</div>
                      {r.expires_at && (
                        <div style={{ color: '#34D399' }}>Exp: {new Date(r.expires_at).toLocaleDateString('en-IN')}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {r.status === 'PENDING' ? (
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={processingId === r.id}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#10B981',
                              color: '#0E0E12',
                              fontWeight: 800,
                              fontSize: '12px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            disabled={processingId === r.id}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#F87171',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#6B7280', fontSize: '12px' }}>Verified</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

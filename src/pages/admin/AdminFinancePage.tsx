import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  QrCode,
  ShieldCheck,
  Clock,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface AdminFinancePageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminFinancePage: React.FC<AdminFinancePageProps> = ({ onNavigateTab }) => {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [paymentMetrics, setPaymentMetrics] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [dash, metricsRes, txRes] = await Promise.all([
        api.admin.getDashboard(new Date().getTimezoneOffset()),
        api.payments.getAdminMetrics(),
        api.admin.getTransactions(100)
      ]);

      setDashboardData(dash);
      if (metricsRes) {
        setPaymentMetrics(metricsRes);
      }
      if (txRes && txRes.transactions) {
        setTransactions(txRes.transactions);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load finance data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const todayStats = dashboardData?.todayStats;
  const todayRevenue = todayStats?.todayRevenueRupees ?? 0;
  const totalRevenue = dashboardData?.totalRevenueRupees ?? 0;
  const upiApprovedAmount = paymentMetrics ? Math.round(paymentMetrics.approvedAmountPaise / 100) : 0;
  const upiPendingAmount = paymentMetrics ? Math.round(paymentMetrics.pendingAmountPaise / 100) : 0;
  const upiRejectedCount = paymentMetrics?.rejectedCount ?? 0;
  const upiPendingCount = paymentMetrics?.pendingCount ?? 0;
  const upiApprovedCount = paymentMetrics?.approvedCount ?? 0;

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch =
      !searchQuery ||
      (tx.user_name && tx.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.user_email && tx.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.reference_id && tx.reference_id.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType =
      filterType === 'ALL' ||
      (filterType === 'credit' && (tx.type === 'credit' || tx.type === 'RECHARGE')) ||
      (filterType === 'debit' && (tx.type === 'debit' || tx.type === 'PURCHASE'));

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#9CA3AF' }}>
        <Loader2 size={24} className="animate-spin" color="var(--brand-gold, #F5C518)" />
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading Finance & Ledger Data...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
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
              FINANCE & AUDIT
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
            Financial Overview & Ledger
          </h1>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Track platform revenue, today's collections, UPI wallet recharge volume, and wallet transaction history.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onNavigateTab('admin-payments')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: 'var(--brand-gold, #F5C518)',
              border: 'none',
              color: '#000000',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <ShieldCheck size={16} />
            <span>Verify Payments ({upiPendingCount})</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}
      >
        {/* Today's Revenue */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            border: '1px solid rgba(245, 197, 24, 0.3)',
            borderRadius: '14px',
            padding: '20px',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase' }}>
              Today's Revenue
            </span>
            <DollarSign size={18} color="var(--brand-gold, #F5C518)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            ₹{todayRevenue}
          </div>
          <span style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
            ₹{todayStats?.todayPurchasesRevenueRupees ?? 0} content + ₹{todayStats?.todayUpiRevenueRupees ?? 0} UPI
          </span>
        </div>

        {/* Total Lifetime Revenue */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
              Total Content Sales
            </span>
            <TrendingUp size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            ₹{totalRevenue}
          </div>
          <span style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
            {dashboardData?.totalPurchases ?? 0} total purchase unlocks
          </span>
        </div>

        {/* UPI Approved Recharge Revenue */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
              UPI Recharge Volume
            </span>
            <QrCode size={18} color="#60A5FA" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            ₹{upiApprovedAmount}
          </div>
          <span style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
            {upiApprovedCount} approved UPI payments
          </span>
        </div>

        {/* Pending UPI Verifications */}
        <div
          style={{
            backgroundColor: upiPendingCount > 0 ? 'rgba(245, 197, 24, 0.08)' : 'var(--bg-surface, #12121A)',
            border: upiPendingCount > 0 ? '1px solid rgba(245, 197, 24, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: upiPendingCount > 0 ? 'var(--brand-gold, #F5C518)' : '#9CA3AF', textTransform: 'uppercase' }}>
              Pending Verification
            </span>
            <Clock size={18} color={upiPendingCount > 0 ? 'var(--brand-gold, #F5C518)' : '#9CA3AF'} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: upiPendingCount > 0 ? 'var(--brand-gold, #F5C518)' : '#FFFFFF', letterSpacing: '-0.02em' }}>
            {upiPendingCount}
          </div>
          <span style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
            ₹{upiPendingAmount} awaiting review
          </span>
        </div>

        {/* Decisions & Rejections */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
              Payment Decisions
            </span>
            <ShieldCheck size={18} color="var(--brand-gold, #F5C518)" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#FFFFFF', marginTop: '4px' }}>
            <span style={{ color: '#10B981' }}>{upiApprovedCount} Approved</span> • <span style={{ color: '#EF4444' }}>{upiRejectedCount} Declined</span>
          </div>
          <span style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px', display: 'block' }}>
            Strict single-approval UTR integrity
          </span>
        </div>
      </div>

      {/* Profit & Margin Notice */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}
      >
        <AlertCircle size={20} color="var(--brand-gold, #F5C518)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.5 }}>
          <strong style={{ color: '#FFFFFF' }}>Platform Operating Margins: </strong>
          FLOPSHOW currently records gross sales and UPI deposits directly. Server, video encoding, and streaming delivery infrastructure expenses are not tracked in platform records, representing 100% gross operating revenue.
        </div>
      </div>

      {/* Transactions Ledger Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden'
        }}
      >
        {/* Ledger Header & Search/Filter */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Wallet Transactions Ledger
            </h2>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              Showing recent credits, debits, and balance updates across all accounts.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '3px' }}>
              {(['ALL', 'credit', 'debit'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: filterType === type ? 'var(--brand-gold, #F5C518)' : 'transparent',
                    color: filterType === type ? '#000000' : '#9CA3AF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {type === 'ALL' ? 'All Transactions' : type === 'credit' ? 'Credits' : 'Debits'}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <Search size={14} color="#9CA3AF" />
              <input
                type="text"
                placeholder="Search user, email, UTR..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  width: '180px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        {filteredTransactions.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#6B7280' }}>
            <CreditCard size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px', margin: 0 }}>No transactions matching your filter criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>User</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Reference / UTR</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Balance After</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, idx) => {
                  const isCredit = tx.type === 'credit' || tx.type === 'RECHARGE';
                  return (
                    <tr
                      key={tx.id || idx}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)'
                      }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isCredit ? '#10B981' : '#F87171',
                            fontSize: '11px',
                            fontWeight: 800
                          }}
                        >
                          {isCredit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          {isCredit ? 'CREDIT' : 'DEBIT'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{tx.user_name || 'Member'}</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{tx.user_email || '—'}</div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#E0E0E0' }}>
                        {tx.description}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--brand-gold, #F5C518)' }}>
                        {tx.reference_id || '—'}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, color: isCredit ? '#10B981' : '#F87171' }}>
                        {isCredit ? '+' : '-'}₹{tx.amountRupees ?? Math.round(tx.amount / 100)}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#9CA3AF' }}>
                        ₹{tx.balanceAfterRupees ?? Math.round((tx.balance_after || 0) / 100)}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '12px', color: '#9CA3AF' }}>
                        {new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

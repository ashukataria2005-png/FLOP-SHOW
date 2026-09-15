import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  X,
  RefreshCw
} from 'lucide-react';

interface PaymentRequest {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  amount: number;
  upi_id_snapshot: string;
  utr: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_id: string | null;
  admin_note: string | null;
  submitted_at: string;
  processed_at: string | null;
}

interface Metrics {
  pendingCount: number;
  pendingAmountPaise: number;
  approvedCount: number;
  approvedAmountPaise: number;
  rejectedCount: number;
  rejectedAmountPaise: number;
}

export const AdminPaymentsPage: React.FC<{ onNavigateTab: (tab: string) => void }> = () => {
  const { showToast } = useApp();
  const [loading, setLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    pendingCount: 0,
    pendingAmountPaise: 0,
    approvedCount: 0,
    approvedAmountPaise: 0,
    rejectedCount: 0,
    rejectedAmountPaise: 0,
  });

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [adminNote, setAdminNote] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqsRes, metricsRes] = await Promise.all([
        api.payments.getAdminRequests(activeFilter, 100),
        api.payments.getAdminMetrics()
      ]);

      if (reqsRes && reqsRes.requests) {
        setRequests(reqsRes.requests);
      }
      if (metricsRes) {
        setMetrics(metricsRes);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load payment requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeFilter]);

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedUtr(id);
      showToast('Copied to clipboard!', 'info');
      setTimeout(() => setCopiedUtr(null), 2000);
    }
  };

  const handleOpenReview = (p: PaymentRequest) => {
    setSelectedPayment(p);
    setAdminNote(p.admin_note || '');
  };

  const handleApprove = async () => {
    if (!selectedPayment) return;
    try {
      setActionLoading(true);
      const res = await api.payments.approvePayment(selectedPayment.id, adminNote);
      showToast(res.message || 'Payment approved and wallet credited!', 'success');
      setSelectedPayment(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve payment.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    try {
      setActionLoading(true);
      const res = await api.payments.rejectPayment(selectedPayment.id, adminNote);
      showToast(res.message || 'Payment rejected.', 'info');
      setSelectedPayment(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject payment.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter list by search query
  const filteredRequests = requests.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.utr.toLowerCase().includes(q) ||
      (r.user_name && r.user_name.toLowerCase().includes(q)) ||
      (r.user_email && r.user_email.toLowerCase().includes(q)) ||
      r.id.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', color: '#FFFFFF' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <QrCode size={28} color="var(--brand-gold, #F5C518)" />
            <span>UPI Payments & Verification</span>
          </h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
            Review manual user recharge requests, verify submitted UTRs against your UPI receipts, and approve wallet credits.
          </p>
        </div>

        <button
          onClick={loadData}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Dashboard Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Pending Card */}
        <div
          style={{
            backgroundColor: 'rgba(245, 197, 24, 0.08)',
            border: '1.5px solid rgba(245, 197, 24, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 197, 24, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Clock size={24} color="var(--brand-gold, #F5C518)" />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--brand-gold, #F5C518)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending Verification
            </span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, marginTop: '2px' }}>
              {metrics.pendingCount}
            </div>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              Total: ₹{(metrics.pendingAmountPaise / 100).toFixed(0)}
            </span>
          </div>
        </div>

        {/* Approved Card */}
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1.5px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={24} color="#10B981" />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Approved Recharges
            </span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, marginTop: '2px' }}>
              {metrics.approvedCount}
            </div>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              Credited: ₹{(metrics.approvedAmountPaise / 100).toFixed(0)}
            </span>
          </div>
        </div>

        {/* Rejected Card */}
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1.5px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <XCircle size={24} color="#EF4444" />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Declined Requests
            </span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, marginTop: '2px' }}>
              {metrics.rejectedCount}
            </div>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              Unverified: ₹{(metrics.rejectedAmountPaise / 100).toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: activeFilter === tab ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.04)',
                color: activeFilter === tab ? '#0E0E12' : '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab === 'ALL' && 'All Requests'}
              {tab === 'PENDING' && `Pending (${metrics.pendingCount})`}
              {tab === 'APPROVED' && `Approved (${metrics.approvedCount})`}
              {tab === 'REJECTED' && `Rejected (${metrics.rejectedCount})`}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '0 12px',
            width: '280px'
          }}
        >
          <Search size={16} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Search by UTR, User, or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '8px 10px',
              fontSize: '13px',
              color: '#FFFFFF',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Payment Requests Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--brand-gold, #F5C518)' }} />
            <span>Loading payment records...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>
            <Clock size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <h4 style={{ fontSize: '16px', color: '#FFFFFF', marginBottom: '4px' }}>No Payment Requests Found</h4>
            <p style={{ fontSize: '13px', margin: 0 }}>
              {activeFilter === 'PENDING'
                ? 'All pending requests have been verified.'
                : 'No records matching the selected filter.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: '#9CA3AF' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Request ID / Date</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>User Details</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Amount</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Submitted UTR</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(p => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Request ID & Date */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: 'var(--brand-gold, #F5C518)' }}>
                        {p.id}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                        {new Date(p.submitted_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </td>

                    {/* User */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{p.user_name || 'Anonymous User'}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{p.user_email || p.user_id}</div>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                        ₹{(p.amount / 100).toFixed(0)}
                      </span>
                    </td>

                    {/* UTR */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            color: '#FFFFFF'
                          }}
                        >
                          {p.utr}
                        </span>
                        <button
                          onClick={() => handleCopy(p.utr, p.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedUtr === p.id ? '#10B981' : '#9CA3AF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Copy UTR"
                        >
                          {copiedUtr === p.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px' }}>
                      {p.status === 'PENDING' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(245, 197, 24, 0.15)',
                            color: 'var(--brand-gold, #F5C518)',
                            fontSize: '11px',
                            fontWeight: 800
                          }}
                        >
                          ● PENDING
                        </span>
                      )}
                      {p.status === 'APPROVED' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#10B981',
                            fontSize: '11px',
                            fontWeight: 800
                          }}
                        >
                          <CheckCircle2 size={12} />
                          APPROVED
                        </span>
                      )}
                      {p.status === 'REJECTED' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#EF4444',
                            fontSize: '11px',
                            fontWeight: 800
                          }}
                        >
                          <XCircle size={12} />
                          REJECTED
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenReview(p)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          backgroundColor: p.status === 'PENDING' ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.08)',
                          color: p.status === 'PENDING' ? '#0E0E12' : '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '12px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {p.status === 'PENDING' ? 'Review & Verify' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verification Review Modal */}
      {selectedPayment && (
        <div className="modal-backdrop" onClick={() => setSelectedPayment(null)}>
          <div
            className="modal-dialog"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '540px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="var(--brand-gold, #F5C518)" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Payment Verification Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Payment Details Card */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '18px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>User Name</span>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                      {selectedPayment.user_name || 'Anonymous User'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>User Email</span>
                    <div style={{ fontSize: '13px', color: '#E0E0E0', marginTop: '2px' }}>
                      {selectedPayment.user_email || 'Not provided'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Recharge Amount</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', marginTop: '2px' }}>
                      ₹{(selectedPayment.amount / 100).toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>Current Status</span>
                    <div style={{ marginTop: '4px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 800,
                          backgroundColor:
                            selectedPayment.status === 'PENDING'
                              ? 'rgba(245, 197, 24, 0.15)'
                              : selectedPayment.status === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color:
                            selectedPayment.status === 'PENDING'
                              ? 'var(--brand-gold, #F5C518)'
                              : selectedPayment.status === 'APPROVED'
                              ? '#10B981'
                              : '#EF4444'
                        }}
                      >
                        {selectedPayment.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* UTR Highlight Box */}
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block' }}>Submitted UTR / Ref Number</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                      {selectedPayment.utr}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(selectedPayment.utr, 'modal-utr')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: copiedUtr === 'modal-utr' ? '#10B981' : '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {copiedUtr === 'modal-utr' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedUtr === 'modal-utr' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  Receiver UPI ID: <strong style={{ color: '#FFFFFF' }}>{selectedPayment.upi_id_snapshot}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                  Submitted: {new Date(selectedPayment.submitted_at).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Verification Guidance */}
              <div
                style={{
                  backgroundColor: 'rgba(245, 197, 24, 0.08)',
                  border: '1px solid rgba(245, 197, 24, 0.25)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '12px',
                  color: '#D1D5DB',
                  lineHeight: 1.5,
                  marginBottom: '20px'
                }}
              >
                <strong style={{ color: 'var(--brand-gold, #F5C518)' }}>Verification Checklist:</strong> Verify this UTR in your UPI app or bank statement. Approving will atomically credit <strong>₹{(selectedPayment.amount / 100).toFixed(0)}</strong> to the user's wallet.
              </div>

              {/* Admin Note Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#E0E0E0', display: 'block', marginBottom: '6px' }}>
                  Admin Note / Reason (Optional for approval, recommended for rejection)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified in HDFC Bank app or UTR could not be verified"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  disabled={selectedPayment.status !== 'PENDING'}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Action Buttons */}
              {selectedPayment.status === 'PENDING' ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#EF4444',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <XCircle size={16} />
                    <span>Reject Payment</span>
                  </button>

                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: '#10B981',
                      border: 'none',
                      color: '#0E0E12',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    {actionLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    <span>Approve & Credit ₹{(selectedPayment.amount / 100).toFixed(0)}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

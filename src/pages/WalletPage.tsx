import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  Gift
} from 'lucide-react';

interface UserPaymentRequest {
  id: string;
  amount: number;
  upi_id_snapshot: string;
  utr: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_note: string | null;
  submitted_at: string;
  processed_at: string | null;
}

export const WalletPage: React.FC = () => {
  const { walletBalance, transactions, openRechargeModal, isAuthenticated } = useApp();
  const [rechargeRequests, setRechargeRequests] = useState<UserPaymentRequest[]>([]);

  const fetchUserRequests = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.payments.getMyRequests();
      if (res && res.requests) {
        setRechargeRequests(res.requests);
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchUserRequests();
  }, [isAuthenticated, walletBalance]);

  return (
    <div style={{ padding: '24px 20px', maxWidth: '840px', margin: '0 auto' }}>
      {/* Page Title */}
      <h1
        style={{
          fontSize: 'clamp(26px, 4vw, 36px)',
          fontWeight: 800,
          color: '#FFFFFF',
          letterSpacing: '-0.02em',
          marginBottom: '20px'
        }}
      >
        FLOPSHOW Wallet
      </h1>

      {/* Main Balance Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1C1914 0%, #151318 50%, #0E0E14 100%)',
          border: '1.5px solid rgba(245, 166, 35, 0.35)',
          borderRadius: '24px',
          padding: 'clamp(24px, 4vw, 36px)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(245, 166, 35, 0.1)',
          marginBottom: '32px'
        }}
      >
        {/* Glow backdrop */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 166, 35, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-gold, #F5C518)' }}>
            <Wallet size={20} />
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Available Balance
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--badge-owned-bg)',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <ShieldCheck size={14} />
            <span>Pay-Per-Content Ready</span>
          </div>
        </div>

        {/* Big Balance Display */}
        <div style={{ fontSize: 'clamp(40px, 7vw, 56px)', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
          ₹{walletBalance.toFixed(2)}
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '440px' }}>
          Use your wallet balance for instant one-click checkout across the FLOPSHOW catalog.
        </p>

        {/* Action Button */}
        <div style={{ marginTop: '24px' }}>
          <button onClick={openRechargeModal} className="btn btn-primary btn-lg">
            <Plus size={18} />
            <span>Add Funds / Recharge via UPI</span>
          </button>
        </div>
      </div>

      {/* Welcome Bonus & Promo Rewards Hub Banner */}
      <div
        onClick={() => {
          window.history.pushState(null, '', '/bonus');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
        style={{
          background: 'rgba(245, 197, 24, 0.08)',
          border: '1px solid rgba(245, 197, 24, 0.25)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 197, 24, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold, #F5C518)',
              flexShrink: 0
            }}
          >
            <Gift size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF' }}>
              Have a Promo Code or Welcome Bonus?
            </div>
            <div style={{ fontSize: '12.5px', color: '#9CA3AF', marginTop: '2px' }}>
              Redeem 1-time free access pass to ANY single Movie or Web Series of your choice.
            </div>
          </div>
        </div>
        <button
          style={{
            padding: '9px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--brand-gold, #F5C518)',
            color: '#0A0A0F',
            fontSize: '13px',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Open Bonus Hub
        </button>
      </div>

      {/* UPI Recharge Requests Section (if user has any) */}
      {rechargeRequests.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={18} color="var(--brand-gold, #F5C518)" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                UPI Recharge Requests
              </h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {rechargeRequests.length} request{rechargeRequests.length === 1 ? '' : 's'}
            </span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden'
            }}
          >
            {rechargeRequests.map((req, idx) => (
              <div
                key={req.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: idx < rechargeRequests.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                      ₹{(req.amount / 100).toFixed(0)}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      UTR: {req.utr}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} />
                    <span>
                      Submitted: {new Date(req.submitted_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                    {req.processed_at && (
                      <span>
                        • {req.status === 'APPROVED' ? 'Approved' : 'Reviewed'}: {new Date(req.processed_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    )}
                  </div>

                  {req.admin_note && (
                    <div style={{ fontSize: '11px', color: req.status === 'REJECTED' ? '#F87171' : '#10B981', marginTop: '4px' }}>
                      Admin Note: {req.admin_note}
                    </div>
                  )}
                </div>

                <div>
                  {req.status === 'PENDING' && (
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
                      <Clock size={12} />
                      PENDING VERIFICATION
                    </span>
                  )}
                  {req.status === 'APPROVED' && (
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
                      APPROVED & CREDITED
                    </span>
                  )}
                  {req.status === 'REJECTED' && (
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
                      DECLINED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>Transaction History</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {transactions.length} record{transactions.length === 1 ? '' : 's'}
          </span>
        </div>

        {transactions.length > 0 ? (
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden'
            }}
          >
            {transactions.map((tx, idx) => {
              const isCredit = tx.type === 'credit';
              return (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: idx < transactions.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: isCredit ? 'var(--badge-owned-bg)' : '#F87171',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>

                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>
                        {tx.title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '2px'
                        }}
                      >
                        <Clock size={12} />
                        <span>{tx.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: isCredit ? 'var(--badge-owned-bg)' : '#FFFFFF'
                      }}
                    >
                      {isCredit ? `+₹${tx.amount}` : `-₹${tx.amount}`}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Transaction State */
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '16px',
              border: '1px dashed rgba(255, 255, 255, 0.08)'
            }}
          >
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No transactions yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

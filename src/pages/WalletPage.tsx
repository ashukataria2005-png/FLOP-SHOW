import React from 'react';
import { useApp } from '../context/AppContext';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck, Clock } from 'lucide-react';

export const WalletPage: React.FC = () => {
  const { walletBalance, transactions, openRechargeModal } = useApp();

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-gold)' }}>
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
          Use your wallet balance to unlock movies (₹10) and full webseries (₹20) with instant one-click checkout.
        </p>

        {/* Action Button */}
        <div style={{ marginTop: '24px' }}>
          <button onClick={openRechargeModal} className="btn btn-primary btn-lg">
            <Plus size={18} />
            <span>Add Funds / Recharge</span>
          </button>
        </div>
      </div>

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

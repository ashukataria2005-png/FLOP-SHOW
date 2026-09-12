import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  CreditCard,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2
} from 'lucide-react';

interface AdminTransactionsPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminTransactionsPage: React.FC<AdminTransactionsPageProps> = () => {
  const { showToast } = useApp();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECHARGE' | 'PURCHASE'>('ALL');

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getTransactions(100);
      setTransactions(data.transactions || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch transaction logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filtered = transactions.filter(tx => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      (tx.user_email && tx.user_email.toLowerCase().includes(q)) ||
      (tx.title && tx.title.toLowerCase().includes(q)) ||
      (tx.id && tx.id.toLowerCase().includes(q));

    const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Financial Audit Ledger
          </h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
            Complete audit trail of pay-per-view content unlocks and wallet recharges across FLOPSHOW.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          backgroundColor: 'var(--bg-surface, #12121A)',
          padding: '16px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
          <input
            type="text"
            placeholder="Search by user email, title, or transaction ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'PURCHASE', 'RECHARGE'] as const).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: typeFilter === type ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.06)',
                color: typeFilter === type ? '#0E0E12' : '#9CA3AF'
              }}
            >
              {type === 'ALL' ? 'All Transactions' : type === 'PURCHASE' ? 'Purchases' : 'Recharges'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px', color: '#9CA3AF' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--brand-gold, #F5C518)' }} />
          <span>Auditing ledger...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <CreditCard size={48} style={{ color: '#4B5563', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>No Transactions</h3>
          <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No records match your search.</p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '780px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Transaction ID</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>User Email</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Title / Item</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => {
                  const isRecharge = tx.type === 'RECHARGE';
                  return (
                    <tr
                      key={tx.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '16px 20px', fontSize: '13px', fontFamily: 'monospace', color: '#9CA3AF' }}>
                        {tx.id ? tx.id.slice(0, 16) : 'N/A'}...
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#FFFFFF', fontWeight: 600 }}>
                        {tx.user_email || 'user@flopshow.tv'}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: isRecharge ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: isRecharge ? '#34D399' : '#60A5FA'
                          }}
                        >
                          {isRecharge ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          <span>{tx.type}</span>
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#FFFFFF' }}>
                        {tx.title || (isRecharge ? 'Wallet Credit' : 'Content Purchase')}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: isRecharge ? '#10B981' : 'var(--brand-gold, #F5C518)'
                          }}
                        >
                          {isRecharge ? `+₹${tx.amount_rupees}` : `-₹${tx.amount_rupees}`}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: '13px', color: '#9CA3AF' }}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleString() : 'Recent'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

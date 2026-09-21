import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Gift,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  RotateCcw,
  Sparkles,
  Loader2,
  Film,
  Users,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';

interface PromoCodeItem {
  id: string;
  code: string;
  description: string;
  validity_hours: number;
  status: 'ACTIVE' | 'DISABLED';
  perk_type: string;
  times_used: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  is_expired?: boolean;
  time_remaining_hours?: number;
}

interface AdminPromoCodesPageProps {
  onNavigateTab?: (tab: string, param?: string) => void;
}

export const AdminPromoCodesPage: React.FC<AdminPromoCodesPageProps> = () => {
  const { showToast } = useApp();
  const [promos, setPromos] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [validityUnit, setValidityUnit] = useState<'days' | 'hours'>('days');
  const [validityValue, setValidityValue] = useState('30');
  const [customExpiry, setCustomExpiry] = useState('');

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const res = await api.promos.adminGetAll();
      if (res.promos) {
        setPromos(res.promos);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load promo codes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Please provide a promo code.', 'error');
      return;
    }

    try {
      setCreating(true);
      const valNum = Math.max(1, parseInt(validityValue) || 1);
      const payload: any = {
        code: cleanCode,
        description: description.trim() || '1-Time Free Access to ANY Movie or Series of your choice.'
      };

      if (customExpiry) {
        payload.expires_at = new Date(customExpiry).toISOString();
      } else if (validityUnit === 'days') {
        payload.validity_days = valNum;
      } else {
        payload.validity_hours = valNum;
      }

      const res = await api.promos.adminCreate(payload);
      showToast(res.message || `Promo code "${cleanCode}" created!`, 'success');
      setCode('');
      setDescription('');
      setCustomExpiry('');
      setValidityValue('30');
      await fetchPromos();
    } catch (err: any) {
      showToast(err.message || 'Failed to create promo code.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (item: PromoCodeItem) => {
    const nextStatus = item.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await api.promos.adminSetStatus(item.id, nextStatus);
      showToast(`Promo code "${item.code}" is now ${nextStatus}.`, 'success');
      setPromos(prev =>
        prev.map(p => (p.id === item.id ? { ...p, status: nextStatus } : p))
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update promo status.', 'error');
    }
  };

  const handleDeletePromo = async (id: string, promoCode: string) => {
    if (!window.confirm(`Are you sure you want to delete promo code "${promoCode}"?`)) {
      return;
    }

    try {
      await api.promos.adminDelete(id);
      showToast(`Promo code "${promoCode}" deleted.`, 'success');
      setPromos(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete promo code.', 'error');
    }
  };

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied "${text}" to clipboard!`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 0 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 197, 24, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold, #F5C518)',
              border: '1px solid rgba(245, 197, 24, 0.3)'
            }}
          >
            <Gift size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
              Bonus &amp; Promo Codes
            </h1>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Create and manage promotional coupons. Each code grants a 1-time free access pass to any single movie or series of the user's choice.
            </p>
          </div>
        </div>
      </div>

      {/* Perk & Restriction Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(245, 197, 24, 0.08)',
            border: '1px solid rgba(245, 197, 24, 0.25)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <Film size={22} color="var(--brand-gold, #F5C518)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px' }}>
              Universal Perk: Free 1-Title Access Pass
            </h3>
            <p style={{ fontSize: '12.5px', color: '#D1D5DB', margin: 0, lineHeight: 1.5 }}>
              Redeeming any active promo unlocks full streaming access to <strong>any 1 Movie or Web Series</strong> in your catalog for 30 days without payment.
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <Users size={22} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px' }}>
              Strict 1-Time User Restriction
            </h3>
            <p style={{ fontSize: '12.5px', color: '#D1D5DB', margin: 0, lineHeight: 1.5 }}>
              The system automatically enforces <strong>strictly 1-time use per user account</strong> on their first redemption to protect platform monetization.
            </p>
          </div>
        </div>
      </div>

      {/* Form: Create Promo Code */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          marginBottom: '32px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Sparkles size={18} color="var(--brand-gold, #F5C518)" />
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Create New Promo Code
          </h2>
        </div>

        <form onSubmit={handleCreatePromo}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                Promo Code String *
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMERPASS, FLOPFREE"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                Validity Duration
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  min="1"
                  value={validityValue}
                  onChange={e => setValidityValue(e.target.value)}
                  style={{
                    width: '90px',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
                <select
                  value={validityUnit}
                  onChange={e => setValidityUnit(e.target.value as any)}
                  style={{
                    flex: 1,
                    padding: '11px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#1E1E2A',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <option value="days">Days</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                Exact Expiry Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={customExpiry}
                onChange={e => setCustomExpiry(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
              Description / Campaign Note
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Welcome promo: Unlock any 1 movie or series completely free for 30 days!"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={creating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '8px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                color: '#0A0A0F',
                fontSize: '14px',
                fontWeight: 800,
                border: 'none',
                cursor: creating ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(245, 197, 24, 0.3)'
              }}
            >
              {creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              <span>{creating ? 'Creating Promo...' : 'Create Promo Code'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Promo Codes Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Created Promo Codes ({promos.length})
            </h2>
            <p style={{ fontSize: '12.5px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Active promo codes are displayed to users in the rewards hub and can be redeemed for 1 title.
            </p>
          </div>

          <button
            onClick={fetchPromos}
            disabled={loading}
            title="Refresh list"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#D1D5DB',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {loading && promos.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '10px', color: '#9CA3AF' }}>
            <Loader2 size={24} className="spin" color="var(--brand-gold, #F5C518)" />
            <span>Loading promo codes...</span>
          </div>
        ) : promos.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>No promo codes created yet</div>
            <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
              Use the form above to generate your first welcome bonus promo code.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Promo Code</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Perk / Description</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Usage Count</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Validity / Expiry</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map(item => {
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Code */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 800,
                              letterSpacing: '0.06em',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(245, 197, 24, 0.15)',
                              color: 'var(--brand-gold, #F5C518)',
                              border: '1px solid rgba(245, 197, 24, 0.3)'
                            }}
                          >
                            {item.code}
                          </span>
                          <button
                            onClick={() => copyCode(item.code, item.id)}
                            title="Copy promo code"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: copiedId === item.id ? '#10B981' : '#9CA3AF',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>

                      {/* Perk / Description */}
                      <td style={{ padding: '16px 20px', maxWidth: '280px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>
                          1 Free Title (Movie/Series)
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#9CA3AF', marginTop: '2px', lineHeight: 1.4 }}>
                          {item.description || 'Access pass to any title of user choice.'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        {item.is_expired ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#F87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)'
                            }}
                          >
                            <XCircle size={12} />
                            EXPIRED
                          </span>
                        ) : item.status === 'ACTIVE' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#34D399',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <CheckCircle2 size={12} />
                            ACTIVE
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              color: '#9CA3AF',
                              border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}
                          >
                            DISABLED
                          </span>
                        )}
                      </td>

                      {/* Usage Count */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                          {item.times_used} <span style={{ fontSize: '11px', fontWeight: 500, color: '#9CA3AF' }}>redemptions</span>
                        </div>
                      </td>

                      {/* Expiry */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#D1D5DB' }}>
                          <Clock size={13} color="#9CA3AF" />
                          <span>
                            {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : `${Math.round(item.validity_hours / 24)} Days`}
                          </span>
                        </div>
                        {item.time_remaining_hours !== undefined && !item.is_expired && (
                          <div style={{ fontSize: '11px', color: '#F5C518', marginTop: '2px' }}>
                            {item.time_remaining_hours}h remaining
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleToggleStatus(item)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: item.status === 'ACTIVE' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.15)',
                              border: item.status === 'ACTIVE' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                              color: item.status === 'ACTIVE' ? '#F87171' : '#34D399',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {item.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                          </button>

                          <button
                            onClick={() => handleDeletePromo(item.id, item.code)}
                            title="Delete promo code"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#9CA3AF',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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

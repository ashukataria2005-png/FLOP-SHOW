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
  Check,
  Edit2,
  Percent,
  Infinity as InfinityIcon,
  Globe,
  Lock,
  X,
  Save
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
  visibility?: 'PUBLIC' | 'PRIVATE';
  discount_enabled?: boolean | number;
  discount_percent?: number;
  max_uses?: number | null;
  is_lifetime?: boolean | number;
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

  // Creation Form State
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('20');
  const [maxUses, setMaxUses] = useState('');
  const [validityMode, setValidityMode] = useState<'preset' | 'lifetime' | 'custom_days' | 'exact_date'>('preset');
  const [presetDuration, setPresetDuration] = useState('30'); // 30, 90, 180
  const [customDays, setCustomDays] = useState('14');
  const [customExpiry, setCustomExpiry] = useState('');

  // Edit Modal State
  const [editingPromo, setEditingPromo] = useState<PromoCodeItem | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [editDiscountEnabled, setEditDiscountEnabled] = useState(false);
  const [editDiscountPercent, setEditDiscountPercent] = useState('20');
  const [editMaxUses, setEditMaxUses] = useState('');
  const [editValidityMode, setEditValidityMode] = useState<'preset' | 'lifetime' | 'custom_days' | 'exact_date'>('preset');
  const [editPresetDuration, setEditPresetDuration] = useState('30');
  const [editCustomDays, setEditCustomDays] = useState('30');
  const [editCustomExpiry, setEditCustomExpiry] = useState('');
  const [updating, setUpdating] = useState(false);

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

  // Open Edit Modal with prefilled values
  const handleOpenEdit = (promo: PromoCodeItem) => {
    setEditingPromo(promo);
    setEditCode(promo.code);
    setEditDescription(promo.description || '');
    setEditVisibility((promo.visibility as 'PUBLIC' | 'PRIVATE') || 'PUBLIC');
    setEditDiscountEnabled(Boolean(promo.discount_enabled));
    setEditDiscountPercent(String(promo.discount_percent || 20));
    setEditMaxUses(promo.max_uses ? String(promo.max_uses) : '');

    if (promo.is_lifetime) {
      setEditValidityMode('lifetime');
    } else if (promo.expires_at) {
      setEditValidityMode('exact_date');
      // Format as YYYY-MM-DDTHH:mm
      try {
        const d = new Date(promo.expires_at);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setEditCustomExpiry(iso);
      } catch {
        setEditCustomExpiry('');
      }
    } else {
      const days = Math.round((promo.validity_hours || 720) / 24);
      if ([30, 90, 180].includes(days)) {
        setEditValidityMode('preset');
        setEditPresetDuration(String(days));
      } else {
        setEditValidityMode('custom_days');
        setEditCustomDays(String(days));
      }
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Please provide a promo code.', 'error');
      return;
    }

    try {
      setCreating(true);
      const payload: any = {
        code: cleanCode,
        description: description.trim() || (discountEnabled ? `${discountPercent}% Discount Promo Coupon` : '1-Time Free Access to ANY Movie or Series.'),
        visibility,
        discount_enabled: discountEnabled,
        discount_percent: discountEnabled ? Math.min(100, Math.max(1, parseInt(discountPercent) || 20)) : 0,
        max_uses: maxUses.trim() ? Math.max(1, parseInt(maxUses) || 1) : null
      };

      if (validityMode === 'lifetime') {
        payload.is_lifetime = true;
      } else if (validityMode === 'exact_date' && customExpiry) {
        payload.expires_at = new Date(customExpiry).toISOString();
        payload.is_lifetime = false;
      } else if (validityMode === 'custom_days') {
        payload.validity_days = Math.max(1, parseInt(customDays) || 1);
        payload.is_lifetime = false;
      } else {
        payload.validity_days = Math.max(1, parseInt(presetDuration) || 30);
        payload.is_lifetime = false;
      }

      const res = await api.promos.adminCreate(payload);
      showToast(res.message || `Promo code "${cleanCode}" created!`, 'success');
      setCode('');
      setDescription('');
      setVisibility('PUBLIC');
      setDiscountEnabled(false);
      setDiscountPercent('20');
      setMaxUses('');
      setValidityMode('preset');
      setPresetDuration('30');
      setCustomExpiry('');
      await fetchPromos();
    } catch (err: any) {
      showToast(err.message || 'Failed to create promo code.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;

    const cleanCode = editCode.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Promo code string cannot be empty.', 'error');
      return;
    }

    try {
      setUpdating(true);
      const payload: any = {
        code: cleanCode,
        description: editDescription.trim(),
        visibility: editVisibility,
        discount_enabled: editDiscountEnabled,
        discount_percent: editDiscountEnabled ? Math.min(100, Math.max(1, parseInt(editDiscountPercent) || 20)) : 0,
        max_uses: editMaxUses.trim() ? Math.max(1, parseInt(editMaxUses) || 1) : null
      };

      if (editValidityMode === 'lifetime') {
        payload.is_lifetime = true;
      } else if (editValidityMode === 'exact_date' && editCustomExpiry) {
        payload.expires_at = new Date(editCustomExpiry).toISOString();
        payload.is_lifetime = false;
      } else if (editValidityMode === 'custom_days') {
        payload.validity_days = Math.max(1, parseInt(editCustomDays) || 1);
        payload.is_lifetime = false;
      } else {
        payload.validity_days = Math.max(1, parseInt(editPresetDuration) || 30);
        payload.is_lifetime = false;
      }

      const res = await api.promos.adminUpdate(editingPromo.id, payload);
      showToast(res.message || `Promo code "${cleanCode}" updated successfully!`, 'success');
      setEditingPromo(null);
      await fetchPromos();
    } catch (err: any) {
      showToast(err.message || 'Failed to update promo code.', 'error');
    } finally {
      setUpdating(false);
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
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '16px 0 48px' }}>
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
              Bonus &amp; Promo Codes v2
            </h1>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Create, edit live, and manage coupons with Public/Private visibility, percentage discounts, claim limits, and flexible validity.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px',
          marginBottom: '28px'
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(245, 197, 24, 0.08)',
            border: '1px solid rgba(245, 197, 24, 0.25)',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <Edit2 size={20} color="var(--brand-gold, #F5C518)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px' }}>
              Live Editable Codes
            </h3>
            <p style={{ fontSize: '12px', color: '#D1D5DB', margin: 0, lineHeight: 1.45 }}>
              Update promo string, discount %, usage limits, or validity anytime without disabling the promo.
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <Lock size={20} color="#A78BFA" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px' }}>
              Public vs Private Visibility
            </h3>
            <p style={{ fontSize: '12px', color: '#D1D5DB', margin: 0, lineHeight: 1.45 }}>
              Public promos appear in user Bonus Hub; Private promos stay hidden for VIPs / direct outreach.
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <Percent size={20} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px' }}>
              Discount (%) or Free Pass
            </h3>
            <p style={{ fontSize: '12px', color: '#D1D5DB', margin: 0, lineHeight: 1.45 }}>
              Toggle between flat 1-title free pass or percentage discount (10%-100%) applied during checkout.
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <Users size={20} color="#60A5FA" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px' }}>
              Max Claims &amp; Lifetime Validity
            </h3>
            <p style={{ fontSize: '12px', color: '#D1D5DB', margin: 0, lineHeight: 1.45 }}>
              Cap redemptions (e.g. first 50 users) and choose Lifetime or 1/3/6-month expiration.
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            {/* Code */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                Promo Code String *
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                placeholder="e.g. VIP50, WELCOMEFREE"
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

            {/* Visibility Toggle (Requirement 2) */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                Visibility (Hub vs Direct Only)
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setVisibility('PUBLIC')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: visibility === 'PUBLIC' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: visibility === 'PUBLIC' ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: visibility === 'PUBLIC' ? '#34D399' : '#9CA3AF',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Globe size={14} />
                  <span>PUBLIC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('PRIVATE')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: visibility === 'PRIVATE' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: visibility === 'PRIVATE' ? '1.5px solid #A78BFA' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: visibility === 'PRIVATE' ? '#C4B5FD' : '#9CA3AF',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Lock size={14} />
                  <span>PRIVATE</span>
                </button>
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                {visibility === 'PUBLIC' ? 'Visible in User Bonus Hub list' : 'Hidden from Hub list (manual code entry only)'}
              </div>
            </div>

            {/* Benefit Mode: Discount (%) Toggle (Requirement 3) */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                Perk Mode / Benefit
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '42px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={discountEnabled}
                    onChange={e => setDiscountEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--brand-gold, #F5C518)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: discountEnabled ? 'var(--brand-gold, #F5C518)' : '#D1D5DB' }}>
                    Enable Discount (%)
                  </span>
                </label>

                {discountEnabled ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={discountPercent}
                      onChange={e => setDiscountPercent(e.target.value)}
                      style={{
                        width: '70px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--brand-gold, #F5C518)',
                        color: '#FFFFFF',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)' }}>%</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 600 }}>
                    (100% Free Title Pass)
                  </span>
                )}
              </div>
            </div>

            {/* Claim Limit (Requirement 4) */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                Usage / Claim Limit (Max Claims)
              </label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder="Unlimited (e.g. 50, 100)"
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
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                Leave empty or blank for unlimited claims
              </div>
            </div>
          </div>

          {/* Validity Duration Modes (Requirement 5) */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '8px' }}>
              Validity Duration (Flexible Options)
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setValidityMode('lifetime')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: validityMode === 'lifetime' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: validityMode === 'lifetime' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: validityMode === 'lifetime' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <InfinityIcon size={14} />
                <span>Lifetime (Never Expires)</span>
              </button>

              <button
                type="button"
                onClick={() => { setValidityMode('preset'); setPresetDuration('30'); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: validityMode === 'preset' && presetDuration === '30' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: validityMode === 'preset' && presetDuration === '30' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: validityMode === 'preset' && presetDuration === '30' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                1 Month (30 Days)
              </button>

              <button
                type="button"
                onClick={() => { setValidityMode('preset'); setPresetDuration('90'); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: validityMode === 'preset' && presetDuration === '90' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: validityMode === 'preset' && presetDuration === '90' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: validityMode === 'preset' && presetDuration === '90' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                3 Months (90 Days)
              </button>

              <button
                type="button"
                onClick={() => { setValidityMode('preset'); setPresetDuration('180'); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: validityMode === 'preset' && presetDuration === '180' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: validityMode === 'preset' && presetDuration === '180' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: validityMode === 'preset' && presetDuration === '180' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                6 Months (180 Days)
              </button>

              <button
                type="button"
                onClick={() => setValidityMode('custom_days')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: validityMode === 'custom_days' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: validityMode === 'custom_days' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: validityMode === 'custom_days' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Custom Days
              </button>

              <button
                type="button"
                onClick={() => setValidityMode('exact_date')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: validityMode === 'exact_date' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: validityMode === 'exact_date' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: validityMode === 'exact_date' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Exact Date / Time
              </button>
            </div>

            {validityMode === 'custom_days' && (
              <div style={{ maxWidth: '240px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>
                  Number of Days
                </label>
                <input
                  type="number"
                  min="1"
                  value={customDays}
                  onChange={e => setCustomDays(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>
            )}

            {validityMode === 'exact_date' && (
              <div style={{ maxWidth: '300px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>
                  Select Expiry Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={customExpiry}
                  onChange={e => setCustomExpiry(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>
            )}
          </div>

          {/* Description */}
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
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Created Promo Codes ({promos.length})
            </h2>
            <p style={{ fontSize: '12.5px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Manage active and live coupons. Click "Edit" to modify any code or rules directly in real-time.
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
              Use the form above to generate your first promo code.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Promo Code</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Perk / Benefit</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Visibility</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Usage / Cap</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Validity</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map(item => {
                  const isCapReached = item.max_uses !== null && item.max_uses !== undefined && item.times_used >= item.max_uses;

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
                      <td style={{ padding: '16px 20px', maxWidth: '240px' }}>
                        {item.discount_enabled ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                            <Percent size={12} />
                            <span>{item.discount_percent}% DISCOUNT</span>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(245, 197, 24, 0.15)', color: 'var(--brand-gold, #F5C518)', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                            <Film size={12} />
                            <span>100% FREE PASS</span>
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: '#D1D5DB', lineHeight: 1.4 }}>
                          {item.description || (item.discount_enabled ? `${item.discount_percent}% off checkout` : 'Free title access')}
                        </div>
                      </td>

                      {/* Visibility (Requirement 2) */}
                      <td style={{ padding: '16px 20px' }}>
                        {item.visibility === 'PRIVATE' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(167, 139, 250, 0.15)',
                              color: '#C4B5FD',
                              border: '1px solid rgba(167, 139, 250, 0.3)'
                            }}
                            title="Hidden from Bonus Hub public list. Users must enter direct code."
                          >
                            <Lock size={12} />
                            PRIVATE
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
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#34D399',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}
                            title="Visible in User Bonus Hub list"
                          >
                            <Globe size={12} />
                            PUBLIC
                          </span>
                        )}
                      </td>

                      {/* Usage / Cap (Requirement 4) */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                          {item.times_used}
                          <span style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF' }}>
                            {item.max_uses ? ` / ${item.max_uses} limit` : ' (Unlimited)'}
                          </span>
                        </div>
                        {isCapReached && (
                          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#F87171', marginTop: '2px' }}>
                            CAP REACHED
                          </div>
                        )}
                      </td>

                      {/* Validity (Requirement 5) */}
                      <td style={{ padding: '16px 20px' }}>
                        {item.is_lifetime ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)' }}>
                            <InfinityIcon size={14} />
                            <span>Lifetime (Never Expires)</span>
                          </div>
                        ) : (
                          <>
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
                          </>
                        )}
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

                      {/* Actions: Edit (Requirement 1), Status, Delete */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* EDIT BUTTON */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit promo properties (even if active)"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(245, 197, 24, 0.12)',
                              border: '1px solid rgba(245, 197, 24, 0.3)',
                              color: 'var(--brand-gold, #F5C518)',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          {/* Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(item)}
                            style={{
                              padding: '6px 10px',
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

                          {/* Delete */}
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

      {/* EDIT PROMO MODAL (Requirement 1) */}
      {editingPromo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setEditingPromo(null)}
        >
          <div
            style={{
              backgroundColor: '#161622',
              border: '1px solid rgba(245, 197, 24, 0.3)',
              borderRadius: '18px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '26px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="var(--brand-gold, #F5C518)" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Edit Promo Code: <span style={{ color: 'var(--brand-gold, #F5C518)' }}>{editingPromo.code}</span>
                </h3>
              </div>
              <button
                onClick={() => setEditingPromo(null)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdatePromo}>
              {/* Code */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Promo Code String *
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={e => setEditCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
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
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Visibility (Requirement 2) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Visibility (Hub vs Direct Code Only)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditVisibility('PUBLIC')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: editVisibility === 'PUBLIC' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: editVisibility === 'PUBLIC' ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: editVisibility === 'PUBLIC' ? '#34D399' : '#9CA3AF',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Globe size={14} />
                    <span>PUBLIC (Shown in Bonus Hub)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditVisibility('PRIVATE')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: editVisibility === 'PRIVATE' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: editVisibility === 'PRIVATE' ? '1.5px solid #A78BFA' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: editVisibility === 'PRIVATE' ? '#C4B5FD' : '#9CA3AF',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Lock size={14} />
                    <span>PRIVATE (Hidden from Hub)</span>
                  </button>
                </div>
              </div>

              {/* Discount Toggle (Requirement 3) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Discount (%) or Free Pass
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editDiscountEnabled}
                      onChange={e => setEditDiscountEnabled(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--brand-gold, #F5C518)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: editDiscountEnabled ? 'var(--brand-gold, #F5C518)' : '#D1D5DB' }}>
                      Enable Discount (%)
                    </span>
                  </label>

                  {editDiscountEnabled && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editDiscountPercent}
                        onChange={e => setEditDiscountPercent(e.target.value)}
                        style={{
                          width: '70px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid var(--brand-gold, #F5C518)',
                          color: '#FFFFFF',
                          fontSize: '13.5px',
                          fontWeight: 800,
                          textAlign: 'center'
                        }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)' }}>%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Claim Limit (Requirement 4) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Max Usage / Claims Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={editMaxUses}
                  onChange={e => setEditMaxUses(e.target.value)}
                  placeholder="Unlimited (e.g. 50, 100)"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Validity Options (Requirement 5) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Validity Duration
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditValidityMode('lifetime')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      backgroundColor: editValidityMode === 'lifetime' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: editValidityMode === 'lifetime' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: editValidityMode === 'lifetime' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <InfinityIcon size={13} />
                    <span>Lifetime</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setEditValidityMode('preset'); setEditPresetDuration('30'); }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '6px',
                      backgroundColor: editValidityMode === 'preset' && editPresetDuration === '30' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: editValidityMode === 'preset' && editPresetDuration === '30' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: editValidityMode === 'preset' && editPresetDuration === '30' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    1 Month (30d)
                  </button>

                  <button
                    type="button"
                    onClick={() => { setEditValidityMode('preset'); setEditPresetDuration('90'); }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '6px',
                      backgroundColor: editValidityMode === 'preset' && editPresetDuration === '90' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: editValidityMode === 'preset' && editPresetDuration === '90' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: editValidityMode === 'preset' && editPresetDuration === '90' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    3 Months (90d)
                  </button>

                  <button
                    type="button"
                    onClick={() => { setEditValidityMode('preset'); setEditPresetDuration('180'); }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '6px',
                      backgroundColor: editValidityMode === 'preset' && editPresetDuration === '180' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: editValidityMode === 'preset' && editPresetDuration === '180' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: editValidityMode === 'preset' && editPresetDuration === '180' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    6 Months (180d)
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditValidityMode('custom_days')}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '6px',
                      backgroundColor: editValidityMode === 'custom_days' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: editValidityMode === 'custom_days' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: editValidityMode === 'custom_days' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Custom Days
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditValidityMode('exact_date')}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '6px',
                      backgroundColor: editValidityMode === 'exact_date' ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: editValidityMode === 'exact_date' ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: editValidityMode === 'exact_date' ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Exact Date
                  </button>
                </div>

                {editValidityMode === 'custom_days' && (
                  <input
                    type="number"
                    min="1"
                    value={editCustomDays}
                    onChange={e => setEditCustomDays(e.target.value)}
                    placeholder="Days (e.g. 45)"
                    style={{
                      maxWidth: '200px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '13px'
                    }}
                  />
                )}

                {editValidityMode === 'exact_date' && (
                  <input
                    type="datetime-local"
                    value={editCustomExpiry}
                    onChange={e => setEditCustomExpiry(e.target.value)}
                    style={{
                      maxWidth: '280px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '13px'
                    }}
                  />
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Description / Campaign Note
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPromo(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#D1D5DB',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--brand-gold, #F5C518)',
                    color: '#0A0A0F',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: updating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {updating ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                  <span>{updating ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

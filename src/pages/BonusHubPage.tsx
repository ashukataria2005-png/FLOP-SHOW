import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { ContentItem } from '../types/content';
import {
  Gift,
  Sparkles,
  Clock,
  CheckCircle2,
  Film,
  Play,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Search,
  X,
  Calendar,
  ShieldCheck,
  History,
  Percent,
  Infinity as InfinityIcon,
  Crown,
  Tag
} from 'lucide-react';
import { generateUpiQrDataUrl } from '../utils/upiQr';

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
  is_claimed?: boolean;
}

interface PromoRedemptionItem {
  id: string;
  promo_code_id: string;
  promo_code: string;
  user_id: string;
  content_id: string | null;
  redeemed_at: string;
  expires_at: string;
  created_at: string;
  item_type?: string;
  item_title?: string;
  original_price?: number;
  discount_percent?: number;
  amount_paid?: number;
  status?: string;
  payment_request_id?: string | null;
  content_title?: string;
  content_poster?: string;
  content_type?: string;
  content_slug?: string;
}

interface BonusHubPageProps {
  onNavigate: (tab: string, param?: string) => void;
  onPlayContent?: (content: ContentItem) => void;
}

const VIP_DISCOUNT_OPTIONS = [
  { id: 'MONTHLY', name: 'VIP Monthly', duration: '30 Days Access', basePrice: 89, badge: 'Popular' },
  { id: '3_MONTHS', name: 'VIP 3 Months', duration: '90 Days Access', basePrice: 189, badge: 'Best Value' },
  { id: 'YEARLY', name: 'VIP 1 Year', duration: '365 Days Access', basePrice: 449, badge: 'Max Savings' },
];

const PASS_DISCOUNT_OPTIONS = [
  { id: 'PASS_24H', name: '24 Hours Pass', duration: '1 Day Full Access', basePrice: 19, badge: 'Daily' },
  { id: 'PASS_3D', name: '3 Days Pass', duration: '3 Days Full Access', basePrice: 29, badge: 'Weekend' },
  { id: 'PASS_7D', name: '7 Days Pass', duration: '7 Days Full Access', basePrice: 49, badge: 'Popular' },
  { id: 'PASS_15D', name: '15 Days Pass', duration: '15 Days Full Access', basePrice: 89, badge: 'Super Pass' },
];

export const BonusHubPage: React.FC<BonusHubPageProps> = ({ onNavigate, onPlayContent }) => {
  const { isAuthenticated, openAuthModal, showToast, user } = useApp();
  const [activeTab, setActiveTab] = useState<'active' | 'expired' | 'history'>('active');

  const [loading, setLoading] = useState(true);
  const [activePromos, setActivePromos] = useState<PromoCodeItem[]>([]);
  const [expiredPromos, setExpiredPromos] = useState<PromoCodeItem[]>([]);
  const [usedPromos, setUsedPromos] = useState<PromoRedemptionItem[]>([]);

  // Input & Modal State
  const [inputCode, setInputCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  // Content Selection Modal (for 100% free movie/series passes)
  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedCodeForRedeem, setSelectedCodeForRedeem] = useState('');
  const [catalogTitles, setCatalogTitles] = useState<ContentItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [contentSearch, setContentSearch] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<ContentItem | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  // Discount Multi-Type Modal (for discount coupons e.g. 10%, 20%, 50%)
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [validatedDiscountPromo, setValidatedDiscountPromo] = useState<{
    code: string;
    discountPercent: number;
    description?: string;
  } | null>(null);
  const [discountTargetType, setDiscountTargetType] = useState<'vip' | 'watch_pass' | 'single'>('vip');
  const [selectedDiscountPlan, setSelectedDiscountPlan] = useState<string>('MONTHLY');
  const [discountUtr, setDiscountUtr] = useState('');
  const [discountSubmitting, setDiscountSubmitting] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountQrUrl, setDiscountQrUrl] = useState<string>('');
  const [discountQrLoading, setDiscountQrLoading] = useState(false);

  // UPI payment config
  const [upiConfig, setUpiConfig] = useState<{ upiId: string; merchantName: string }>({
    upiId: 'flopshow@upi',
    merchantName: 'FLOPSHOW'
  });

  // Success Confirmation Modal
  const [unlockedResult, setUnlockedResult] = useState<{
    title: string;
    expiresAt: string;
    contentItem?: ContentItem;
  } | null>(null);

  const fetchHubData = async () => {
    try {
      setLoading(true);
      const [hubRes, upiCfg] = await Promise.allSettled([
        api.promos.getHub(),
        api.payments.getConfig()
      ]);

      if (hubRes.status === 'fulfilled' && hubRes.value.success) {
        setActivePromos(hubRes.value.activePromos || []);
        setExpiredPromos(hubRes.value.expiredPromos || []);
        setUsedPromos(hubRes.value.usedPromos || []);
      }

      if (upiCfg.status === 'fulfilled' && upiCfg.value?.upiId) {
        setUpiConfig({
          upiId: upiCfg.value.upiId,
          merchantName: upiCfg.value.merchantName || 'FLOPSHOW'
        });
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, [isAuthenticated]);

  const loadCatalog = async () => {
    if (catalogTitles.length > 0) return;
    try {
      setCatalogLoading(true);
      const items = await api.content.list();
      setCatalogTitles(items);
    } catch {
      // Fallback
    } finally {
      setCatalogLoading(false);
    }
  };

  // Pricing calculations for Multi-Type Discount Modal
  const currentBasePrice = discountTargetType === 'vip'
    ? (VIP_DISCOUNT_OPTIONS.find(p => p.id === selectedDiscountPlan)?.basePrice || 89)
    : discountTargetType === 'watch_pass'
      ? (PASS_DISCOUNT_OPTIONS.find(p => p.id === selectedDiscountPlan)?.basePrice || 49)
      : 30;

  const currentDiscountPercent = validatedDiscountPromo?.discountPercent || 0;
  const currentDiscountAmount = Math.round((currentBasePrice * currentDiscountPercent) / 100);
  const currentPayablePrice = Math.max(1, currentBasePrice - currentDiscountAmount);

  // Generate dynamic QR code whenever discount modal opens or plan / payable price changes
  useEffect(() => {
    let isCancelled = false;
    if (showDiscountModal && currentPayablePrice > 0) {
      setDiscountQrLoading(true);
      generateUpiQrDataUrl(upiConfig.upiId, currentPayablePrice, upiConfig.merchantName)
        .then(url => {
          if (!isCancelled) {
            setDiscountQrUrl(url);
            setDiscountQrLoading(false);
          }
        })
        .catch(() => {
          if (!isCancelled) setDiscountQrLoading(false);
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [showDiscountModal, currentPayablePrice, upiConfig.upiId, upiConfig.merchantName]);

  const handleStartRedeem = async (codeToUse?: string) => {
    if (!isAuthenticated) {
      showToast('Please sign in to redeem promo codes!', 'info');
      openAuthModal();
      return;
    }

    const code = (codeToUse || inputCode).trim().toUpperCase();
    if (!code) {
      showToast('Please enter or select a promo code.', 'error');
      return;
    }

    try {
      setValidatingCode(true);
      const res = await api.promos.validate(code, 0);
      if (!res.valid) {
        showToast(res.message || `Promo code "${code}" is invalid or expired.`, 'error');
        return;
      }

      // If promo is a DISCOUNT code (e.g. 10%, 20%, 50%), open Multi-Type Redemption Modal
      if (res.discountEnabled || (res.discountPercent > 0 && res.discountPercent < 100)) {
        setValidatedDiscountPromo({
          code: res.code,
          discountPercent: res.discountPercent,
          description: res.description
        });
        setDiscountTargetType('vip');
        setSelectedDiscountPlan('MONTHLY');
        setDiscountUtr('');
        setDiscountError(null);
        setShowDiscountModal(true);
      } else {
        // 100% Free movie/series access pass
        setSelectedCodeForRedeem(res.code);
        setSelectedTitle(null);
        setShowContentModal(true);
        loadCatalog();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to validate promo code.', 'error');
    } finally {
      setValidatingCode(false);
    }
  };

  const handleConfirmRedeem = async () => {
    if (!selectedTitle) {
      showToast('Please select a movie or web series to unlock.', 'error');
      return;
    }

    try {
      setRedeeming(true);
      const res = await api.promos.redeem(selectedCodeForRedeem, selectedTitle.id);
      showToast(res.message || 'Content unlocked successfully!', 'success');
      setShowContentModal(false);
      setUnlockedResult({
        title: res.unlockedTitle,
        expiresAt: res.expiresAt,
        contentItem: selectedTitle
      });
      setInputCode('');
      await fetchHubData();
    } catch (err: any) {
      showToast(err.message || 'Failed to redeem promo code.', 'error');
    } finally {
      setRedeeming(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setInputCode(code);
    showToast(`Promo code "${code}" copied!`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    const cleanUtr = discountUtr.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanUtr || cleanUtr.length < 6 || cleanUtr.length > 35) {
      setDiscountError('Please enter a valid 6-35 character alphanumeric UPI UTR / Transaction ID.');
      return;
    }

    try {
      setDiscountSubmitting(true);
      setDiscountError(null);

      if (discountTargetType === 'vip') {
        const res = await api.subscriptions.submitRequest(
          selectedDiscountPlan as any,
          cleanUtr,
          user?.name,
          user?.email,
          validatedDiscountPromo?.code
        );
        showToast(res.message || 'VIP Subscription payment submitted!', 'success');
      } else if (discountTargetType === 'watch_pass') {
        const res = await api.watchPasses.submitRequest({
          plan: selectedDiscountPlan as any,
          utr: cleanUtr,
          userName: user?.name,
          userEmail: user?.email,
          promoCode: validatedDiscountPromo?.code
        });
        showToast(res.message || 'Watch Pass payment submitted!', 'success');
      } else {
        const res = await api.payments.submitRequest(
          currentPayablePrice,
          cleanUtr,
          user?.name,
          user?.email,
          undefined,
          validatedDiscountPromo?.code
        );
        showToast(res.message || 'Payment submitted!', 'success');
      }

      setShowDiscountModal(false);
      setInputCode('');
      await fetchHubData();
    } catch (err: any) {
      setDiscountError(err.message || 'Payment submission failed. Please verify your UTR.');
    } finally {
      setDiscountSubmitting(false);
    }
  };

  const filteredCatalog = catalogTitles.filter(item => {
    if (!contentSearch.trim()) return true;
    const q = contentSearch.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.genres?.some(g => g.toLowerCase().includes(q));
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px 64px' }}>
      {/* Hero Header */}
      <div
        style={{
          position: 'relative',
          borderRadius: '20px',
          background: 'radial-gradient(ellipse at top right, rgba(245, 197, 24, 0.15), transparent 70%), var(--bg-surface, #12121A)',
          border: '1px solid rgba(245, 197, 24, 0.25)',
          padding: '36px 28px',
          marginBottom: '32px',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              backgroundColor: 'rgba(245, 197, 24, 0.2)',
              border: '1px solid var(--brand-gold, #F5C518)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold, #F5C518)',
              boxShadow: '0 0 20px rgba(245, 197, 24, 0.25)'
            }}
          >
            <Gift size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
                FLOPSHOW Rewards &amp; Bonus Hub
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(245, 197, 24, 0.2)',
                  color: 'var(--brand-gold, #F5C518)',
                  border: '1px solid rgba(245, 197, 24, 0.4)'
                }}
              >
                100% FREE PASS
              </span>
            </div>
            <p style={{ fontSize: '13.5px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Redeem exclusive welcome promo codes to unlock ANY single Movie or Web Series of your choice completely free for 7 days.
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            <CheckCircle2 size={14} />
            <span>Universal Promo Redemption Active • Apply any code for discounts or free access</span>
          </div>

          <span style={{ fontSize: '12px', color: '#6B7280' }}>•</span>
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>1-TIME PER PROMO CODE PER USER</span>
        </div>
      </div>

      {/* 3 Clean Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '14px',
          marginBottom: '28px'
        }}
      >
        <button
          onClick={() => setActiveTab('active')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'active' ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'active' ? '#0A0A0F' : '#D1D5DB',
            fontSize: '13.5px',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Sparkles size={16} />
          <span>Active Promos ({activePromos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expired')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'expired' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'expired' ? '#FFFFFF' : '#9CA3AF',
            fontSize: '13.5px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Clock size={16} />
          <span>Expired Promos ({expiredPromos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'history' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'history' ? '#FFFFFF' : '#9CA3AF',
            fontSize: '13.5px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <History size={16} />
          <span>Used Promos History ({usedPromos.length})</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE PROMOS */}
      {activeTab === 'active' && (
        <div>
          {/* Quick Enter / Apply Code Box */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '28px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Tag size={18} color="var(--brand-gold, #F5C518)" />
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Have a Promo Code?
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 16px' }}>
              Enter any active coupon or promo code to unlock free access or claim instant discounts on VIP plans.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                placeholder="ENTER PROMO CODE (e.g. WELCOMEBONUS or FLOP10)"
                style={{
                  flex: 1,
                  minWidth: '240px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => handleStartRedeem(inputCode)}
                disabled={validatingCode}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--brand-gold, #F5C518)',
                  color: '#0A0A0F',
                  fontSize: '14px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: validatingCode ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(245, 197, 24, 0.3)',
                  whiteSpace: 'nowrap'
                }}
              >
                {validatingCode ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                <span>{validatingCode ? 'Checking...' : 'Apply / Redeem Code'}</span>
              </button>
            </div>
          </div>

          {/* List of Active / Claimable Promo Cards */}
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 16px' }}>
            Claimable Welcome Offers
          </h2>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px', color: '#9CA3AF' }}>
              <Loader2 size={24} className="spin" color="var(--brand-gold, #F5C518)" />
              <span>Loading rewards...</span>
            </div>
          ) : activePromos.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', color: '#9CA3AF' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>No active promo codes right now</div>
              <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Check back soon for new seasonal promotions!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '18px' }}>
              {activePromos.map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--bg-surface, #12121A)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'transform 0.15s ease, border-color 0.15s ease'
                  }}
                >
                  <div>
                    {/* Top row: Code Pill & Copy & Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '15px',
                            fontWeight: 900,
                            letterSpacing: '0.06em',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(245, 197, 24, 0.15)',
                            color: 'var(--brand-gold, #F5C518)',
                            border: '1px solid rgba(245, 197, 24, 0.35)'
                          }}
                        >
                          {item.code}
                        </span>

                        {Boolean(item.is_lifetime) && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(245, 197, 24, 0.2)',
                              color: 'var(--brand-gold, #F5C518)',
                              border: '1px solid rgba(245, 197, 24, 0.4)'
                            }}
                          >
                            <InfinityIcon size={12} />
                            Lifetime Access
                          </span>
                        )}

                        {Boolean(item.discount_enabled) && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(16, 185, 129, 0.2)',
                              color: '#34D399',
                              border: '1px solid rgba(16, 185, 129, 0.4)'
                            }}
                          >
                            <Percent size={11} />
                            {item.discount_percent}% OFF
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => copyToClipboard(item.code)}
                        title="Copy code"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: copiedCode === item.code ? '#10B981' : '#D1D5DB',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {copiedCode === item.code ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedCode === item.code ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Perk Summary */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      {item.discount_enabled ? (
                        <Percent size={15} color="#10B981" />
                      ) : (
                        <Film size={15} color="var(--brand-gold, #F5C518)" />
                      )}
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        {item.discount_enabled ? `${item.discount_percent}% Discount Coupon` : '1-Time Free Movie or Series Access'}
                      </h3>
                    </div>
                    <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 14px', lineHeight: 1.45 }}>
                      {item.description || (item.discount_enabled ? `Save ${item.discount_percent}% on any catalog checkout.` : 'Redeem to unlock any paid catalog title completely free.')}
                    </p>

                    {item.max_uses && item.max_uses > 0 && (
                      <div style={{ fontSize: '11.5px', color: '#60A5FA', fontWeight: 600, marginBottom: '12px' }}>
                        Limited Offer: {item.times_used} / {item.max_uses} claimed ({Math.max(0, item.max_uses - item.times_used)} remaining)
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer: Time Remaining & Redeem Button */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '12px' }}>
                      {item.is_lifetime ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brand-gold, #F5C518)', fontWeight: 700 }}>
                          <InfinityIcon size={13} />
                          <span>Lifetime Access (Never Expires)</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF' }}>
                          <Clock size={13} />
                          <span>
                            {item.expires_at ? `Expires ${new Date(item.expires_at).toLocaleDateString()}` : `${Math.round(item.validity_hours / 24)} Days Validity`}
                          </span>
                        </div>
                      )}

                      {item.time_remaining_hours !== undefined && !item.is_lifetime && (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)' }}>
                          {item.time_remaining_hours} hours left
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleStartRedeem(item.code)}
                      disabled={Boolean(item.is_claimed) || validatingCode}
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: '8px',
                        backgroundColor: item.is_claimed ? 'rgba(255, 255, 255, 0.05)' : 'rgba(245, 197, 24, 0.15)',
                        border: item.is_claimed ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid var(--brand-gold, #F5C518)',
                        color: item.is_claimed ? '#6B7280' : 'var(--brand-gold, #F5C518)',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: item.is_claimed || validatingCode ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {item.is_claimed
                        ? 'Already Claimed'
                        : item.discount_enabled
                          ? `Apply ${item.code} (${item.discount_percent}% OFF)`
                          : `Redeem Free Pass (${item.code})`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXPIRED PROMOS */}
      {activeTab === 'expired' && (
        <div>
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Expired Promo Codes
            </h2>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
              These codes were not redeemed within their validity window and can no longer be used.
            </p>
          </div>

          {expiredPromos.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', color: '#9CA3AF' }}>
              <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>No expired codes</div>
              <p style={{ fontSize: '13px', margin: '4px 0 0' }}>All available promotions are currently active.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>
              {expiredPromos.map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--bg-surface, #12121A)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '14px',
                    padding: '18px',
                    opacity: 0.75
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: '#9CA3AF',
                        textDecoration: 'line-through'
                      }}
                    >
                      {item.code}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#EF4444' }}>EXPIRED</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#9CA3AF', margin: '0 0 10px' }}>
                    {item.description || 'Promotional access pass'}
                  </p>
                  <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                    Validity window concluded
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: USED PROMOS HISTORY */}
      {activeTab === 'history' && (
        <div>
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Your Redeemed Promos Audit Log
            </h2>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Full audit record of unlocked titles, redemption timestamps, and access validity.
            </p>
          </div>

          {!isAuthenticated ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', color: '#9CA3AF' }}>
              <ShieldCheck size={32} color="var(--brand-gold, #F5C518)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>Sign in to view redemption history</div>
              <button
                onClick={openAuthModal}
                style={{
                  marginTop: '14px',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--brand-gold, #F5C518)',
                  color: '#0A0A0F',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
            </div>
          ) : usedPromos.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface, #12121A)', borderRadius: '16px', color: '#9CA3AF' }}>
              <Gift size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>No promo codes redeemed yet</div>
              <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
                You have not used any promo codes on this account. You are eligible for 1 free movie or series!
              </p>
              <button
                onClick={() => setActiveTab('active')}
                style={{
                  marginTop: '14px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--brand-gold, #F5C518)',
                  color: '#0A0A0F',
                  fontWeight: 800,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                View Claimable Promos
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {usedPromos.map(item => {
                const isVip = item.item_type === 'SUBSCRIPTION';
                const isPass = item.item_type === 'WATCH_PASS';
                const itemTypeLabel = isVip ? 'VIP SUBSCRIPTION' : isPass ? 'WATCH PASS' : 'MOVIE / SERIES';
                const badgeColor = isVip ? '#C084FC' : isPass ? '#38BDF8' : 'var(--brand-gold, #F5C518)';
                const badgeBg = isVip ? 'rgba(192, 132, 252, 0.15)' : isPass ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 197, 24, 0.15)';
                const badgeBorder = isVip ? 'rgba(192, 132, 252, 0.35)' : isPass ? 'rgba(56, 189, 248, 0.35)' : 'rgba(245, 197, 24, 0.35)';
                const displayTitle = item.item_title || item.content_title || (isVip ? 'VIP Subscription' : isPass ? 'Watch Pass' : 'Unlocked Content');

                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: 'var(--bg-surface, #12121A)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '260px' }}>
                      {/* Icon / Thumbnail Box */}
                      {item.content_poster ? (
                        <img
                          src={item.content_poster}
                          alt={displayTitle}
                          style={{
                            width: '64px',
                            height: '92px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '64px',
                            height: '92px',
                            backgroundColor: badgeBg,
                            border: `1px solid ${badgeBorder}`,
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: badgeColor,
                            gap: '4px'
                          }}
                        >
                          {isVip ? <Crown size={26} /> : isPass ? <Tag size={26} /> : <Film size={26} />}
                          <span style={{ fontSize: '9px', fontWeight: 800, textAlign: 'center' }}>
                            {isVip ? 'VIP' : isPass ? 'PASS' : 'TITLE'}
                          </span>
                        </div>
                      )}

                      <div>
                        {/* Header Badges: Promo Code & Item Type */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 900,
                              letterSpacing: '0.04em',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(245, 197, 24, 0.15)',
                              color: 'var(--brand-gold, #F5C518)',
                              border: '1px solid rgba(245, 197, 24, 0.35)'
                            }}
                          >
                            PROMO: {item.promo_code}
                          </span>

                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: badgeBg,
                              color: badgeColor,
                              border: `1px solid ${badgeBorder}`,
                              letterSpacing: '0.03em'
                            }}
                          >
                            {itemTypeLabel}
                          </span>

                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#34D399',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            ● {item.status || 'APPROVED'}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
                          {displayTitle}
                        </h3>

                        {/* Price Breakdown: Original vs Paid */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          {item.original_price && item.original_price > 0 ? (
                            <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#9CA3AF' }}>Original:</span>
                              <span style={{ color: '#9CA3AF', textDecoration: 'line-through' }}>₹{item.original_price}</span>
                              <span style={{ color: '#9CA3AF' }}>→</span>
                              <span style={{ color: 'var(--brand-gold, #F5C518)', fontWeight: 800 }}>
                                Paid: ₹{item.amount_paid ?? 0}
                              </span>
                              {item.discount_percent ? (
                                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#34D399', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                                  ({item.discount_percent}% Discount)
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <div style={{ fontSize: '12.5px', color: '#34D399', fontWeight: 700 }}>
                              100% Free Promotional Unlock (Saved ₹{item.original_price || 30})
                            </div>
                          )}
                        </div>

                        {/* Redemption Date & Expiry */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#9CA3AF', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} />
                            <span>Redeemed: {new Date(item.redeemed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                          {item.expires_at && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={13} />
                              <span>Valid Until: {new Date(item.expires_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      {isVip ? (
                        <button
                          onClick={() => onNavigate('plans')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(192, 132, 252, 0.15)',
                            border: '1px solid rgba(192, 132, 252, 0.4)',
                            color: '#C084FC',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          <Crown size={15} />
                          <span>VIP Active</span>
                        </button>
                      ) : isPass ? (
                        <button
                          onClick={() => onNavigate('plans')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            color: '#38BDF8',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          <Tag size={15} />
                          <span>Pass Active</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate('library')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--brand-gold, #F5C518)',
                            color: '#0A0A0F',
                            fontSize: '13px',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <Play size={14} fill="#0A0A0F" />
                          <span>Watch in Library</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CHOOSE TITLE TO UNLOCK */}
      {showContentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(12px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#0F0F17',
              border: '1px solid rgba(245, 197, 24, 0.4)',
              borderRadius: '20px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '22px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(245, 197, 24, 0.2)',
                      color: 'var(--brand-gold, #F5C518)'
                    }}
                  >
                    PROMO: {selectedCodeForRedeem}
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Select 1 Movie or Web Series to Unlock
                  </h3>
                </div>
                <p style={{ fontSize: '12.5px', color: '#9CA3AF', margin: '4px 0 0' }}>
                  Choose any title in the catalog. You will receive 30 days of full streaming access for free.
                </p>
              </div>

              <button
                onClick={() => setShowContentModal(false)}
                disabled={redeeming}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
              {/* Search filter */}
              <div style={{ position: 'relative', marginBottom: '18px' }}>
                <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type="text"
                  value={contentSearch}
                  onChange={e => setContentSearch(e.target.value)}
                  placeholder="Search catalog titles..."
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {catalogLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '10px', color: '#9CA3AF' }}>
                  <Loader2 size={24} className="spin" color="var(--brand-gold, #F5C518)" />
                  <span>Loading catalog...</span>
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                  No titles match your search.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '12px' }}>
                  {filteredCatalog.map(item => {
                    const isSelected = selectedTitle?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedTitle(item)}
                        style={{
                          borderRadius: '10px',
                          border: isSelected ? '2px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          padding: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#1A1A24', marginBottom: '8px' }}>
                          {item.posterUrl ? (
                            <img
                              src={item.posterUrl}
                              alt={item.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                              <Film size={24} />
                            </div>
                          )}
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--brand-gold, #F5C518)',
                                color: '#000',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Check size={14} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'capitalize' }}>
                          {item.type} • {item.releaseYear || 2025}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '18px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(0, 0, 0, 0.3)'
              }}
            >
              <div style={{ fontSize: '13px', color: '#D1D5DB' }}>
                {selectedTitle ? (
                  <span>
                    Selected: <strong style={{ color: '#FFFFFF' }}>{selectedTitle.title}</strong>
                  </span>
                ) : (
                  <span style={{ color: '#9CA3AF' }}>Click a title above to select</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowContentModal(false)}
                  disabled={redeeming}
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
                  onClick={handleConfirmRedeem}
                  disabled={!selectedTitle || redeeming}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    backgroundColor: selectedTitle && !redeeming ? 'var(--brand-gold, #F5C518)' : 'rgba(245, 197, 24, 0.3)',
                    color: '#0A0A0F',
                    fontSize: '13px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: selectedTitle && !redeeming ? 'pointer' : 'not-allowed',
                    boxShadow: selectedTitle ? '0 4px 14px rgba(245, 197, 24, 0.4)' : 'none'
                  }}
                >
                  {redeeming ? <Loader2 size={16} className="spin" /> : <Gift size={16} />}
                  <span>{redeeming ? 'Unlocking...' : 'Unlock Title Free'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-TYPE PLAN DISCOUNT REDEMPTION MODAL */}
      {showDiscountModal && validatedDiscountPromo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(12px)',
            zIndex: 3100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#0F0F17',
              border: '1.5px solid rgba(245, 197, 24, 0.4)',
              borderRadius: '20px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 40px rgba(245, 197, 24, 0.12)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 900,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(245, 197, 24, 0.15)',
                      color: 'var(--brand-gold, #F5C518)',
                      border: '1px solid rgba(245, 197, 24, 0.35)'
                    }}
                  >
                    PROMO: {validatedDiscountPromo.code}
                  </span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: '#34D399',
                      border: '1px solid rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    {currentDiscountPercent}% DISCOUNT APPLIED
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '6px 0 0' }}>
                  Choose Plan to Apply Discount
                </h3>
              </div>

              <button
                onClick={() => setShowDiscountModal(false)}
                disabled={discountSubmitting}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
              {/* Target Type Selector Tabs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  padding: '4px',
                  borderRadius: '12px',
                  marginBottom: '18px'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setDiscountTargetType('vip');
                    setSelectedDiscountPlan('MONTHLY');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: discountTargetType === 'vip' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                    color: discountTargetType === 'vip' ? '#0A0A0F' : '#9CA3AF',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Crown size={14} />
                  <span>VIP Plans</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDiscountTargetType('watch_pass');
                    setSelectedDiscountPlan('PASS_7D');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: discountTargetType === 'watch_pass' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                    color: discountTargetType === 'watch_pass' ? '#0A0A0F' : '#9CA3AF',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Tag size={14} />
                  <span>Watch Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDiscountTargetType('single');
                    setSelectedDiscountPlan('SINGLE');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: discountTargetType === 'single' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                    color: discountTargetType === 'single' ? '#0A0A0F' : '#9CA3AF',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Film size={14} />
                  <span>Single Movie</span>
                </button>
              </div>

              {/* Plans Grid */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Select Duration / Tier:
                </div>

                {discountTargetType === 'vip' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                    {VIP_DISCOUNT_OPTIONS.map(opt => {
                      const isSelected = selectedDiscountPlan === opt.id;
                      const optSaved = Math.round((opt.basePrice * currentDiscountPercent) / 100);
                      const optFinal = Math.max(1, opt.basePrice - optSaved);

                      return (
                        <div
                          key={opt.id}
                          onClick={() => setSelectedDiscountPlan(opt.id)}
                          style={{
                            padding: '14px',
                            borderRadius: '12px',
                            backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                            border: isSelected ? '2px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            position: 'relative'
                          }}
                        >
                          {opt.badge && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: isSelected ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.1)',
                                color: isSelected ? '#000' : '#D1D5DB'
                              }}
                            >
                              {opt.badge}
                            </span>
                          )}
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginBottom: '2px' }}>
                            {opt.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px' }}>
                            {opt.duration}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)' }}>
                              ₹{optFinal}
                            </span>
                            <span style={{ fontSize: '12px', color: '#6B7280', textDecoration: 'line-through' }}>
                              ₹{opt.basePrice}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {discountTargetType === 'watch_pass' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    {PASS_DISCOUNT_OPTIONS.map(opt => {
                      const isSelected = selectedDiscountPlan === opt.id;
                      const optSaved = Math.round((opt.basePrice * currentDiscountPercent) / 100);
                      const optFinal = Math.max(1, opt.basePrice - optSaved);

                      return (
                        <div
                          key={opt.id}
                          onClick={() => setSelectedDiscountPlan(opt.id)}
                          style={{
                            padding: '12px',
                            borderRadius: '12px',
                            backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                            border: isSelected ? '2px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#FFFFFF', marginBottom: '2px' }}>
                            {opt.name}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#9CA3AF', marginBottom: '6px' }}>
                            {opt.duration}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)' }}>
                              ₹{optFinal}
                            </span>
                            <span style={{ fontSize: '11px', color: '#6B7280', textDecoration: 'line-through' }}>
                              ₹{opt.basePrice}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {discountTargetType === 'single' && (
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(245, 197, 24, 0.08)',
                      border: '1px solid rgba(245, 197, 24, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#FFFFFF' }}>
                        Single Catalog Title / Movie
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#9CA3AF', marginTop: '2px' }}>
                        Applies to any standard ₹30 movie or episode checkout
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)' }}>
                        ₹{currentPayablePrice}
                      </span>
                      <span style={{ fontSize: '13px', color: '#6B7280', textDecoration: 'line-through' }}>
                        ₹30
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Professional Pricing Breakdown Card */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
                  <span>Original Plan Price:</span>
                  <span style={{ textDecoration: 'line-through', color: '#9CA3AF', fontWeight: 700 }}>
                    ₹{currentBasePrice}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#34D399', marginBottom: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Percent size={13} />
                    <span>Coupon Discount ({currentDiscountPercent}% OFF):</span>
                  </span>
                  <span style={{ fontWeight: 800 }}>-₹{currentDiscountAmount}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                    Final Payable Amount:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)' }}>
                      ₹{currentPayablePrice}
                    </span>
                    <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
                      (You save ₹{currentDiscountAmount})
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic UPI Payment & QR Code Section */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(245, 197, 24, 0.25)',
                  borderRadius: '16px',
                  padding: '18px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Dynamic UPI QR Code */}
                  <div
                    style={{
                      width: '140px',
                      height: '140px',
                      borderRadius: '12px',
                      backgroundColor: '#FFFFFF',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    {discountQrLoading ? (
                      <Loader2 size={24} className="spin" color="#0A0A0F" />
                    ) : discountQrUrl ? (
                      <img
                        src={discountQrUrl}
                        alt={`Pay ₹${currentPayablePrice}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ fontSize: '11px', color: '#000', textAlign: 'center' }}>
                        QR Ready: ₹{currentPayablePrice}
                      </div>
                    )}
                  </div>

                  {/* Payment Details & Copy UPI */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                      Scan QR or Pay via any UPI App (GPay, PhonePe, Paytm):
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '10px'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em' }}>
                        {upiConfig.upiId}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(upiConfig.upiId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--brand-gold, #F5C518)',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Copy size={12} />
                        <span>Copy</span>
                      </button>
                    </div>

                    <div style={{ fontSize: '11px', color: '#6B7280', lineHeight: 1.4 }}>
                      Amount automatically encoded: <strong>₹{currentPayablePrice}</strong>. After paying, enter your 12-digit UTR below.
                    </div>
                  </div>
                </div>

                {/* UTR Input Form */}
                <form onSubmit={handleDiscountSubmit} style={{ marginTop: '16px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={discountUtr}
                      onChange={e => setDiscountUtr(e.target.value.toUpperCase())}
                      placeholder="Enter 12-digit UPI UTR / Transaction Ref ID"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {discountError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#F87171', marginBottom: '10px' }}>
                      <AlertCircle size={14} />
                      <span>{discountError}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowDiscountModal(false)}
                      disabled={discountSubmitting}
                      style={{
                        padding: '12px 18px',
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
                      type="submit"
                      disabled={discountSubmitting}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--brand-gold, #F5C518)',
                        color: '#0A0A0F',
                        fontSize: '13.5px',
                        fontWeight: 900,
                        border: 'none',
                        cursor: discountSubmitting ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(245, 197, 24, 0.4)'
                      }}
                    >
                      {discountSubmitting ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
                      <span>{discountSubmitting ? 'Verifying...' : `Submit UTR & Activate for ₹${currentPayablePrice}`}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL: UNLOCKED CONGRATULATIONS */}
      {unlockedResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(12px)',
            zIndex: 3200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#0F0F17',
              border: '1.5px solid var(--brand-gold, #F5C518)',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '32px 28px',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(245, 197, 24, 0.25)'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 197, 24, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)',
                margin: '0 auto 16px'
              }}
            >
              <Sparkles size={32} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px' }}>
              Welcome Bonus Unlocked!
            </h2>
            <p style={{ fontSize: '14px', color: '#D1D5DB', margin: '0 0 20px', lineHeight: 1.5 }}>
              You now have full streaming access to <strong>{unlockedResult.title}</strong> for the next 30 days!
            </p>

            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '12px',
                color: '#9CA3AF',
                marginBottom: '24px'
              }}
            >
              Pass validity active until {new Date(unlockedResult.expiresAt).toLocaleDateString()}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const item = unlockedResult.contentItem;
                  setUnlockedResult(null);
                  if (item && onPlayContent) {
                    onPlayContent(item);
                  } else {
                    onNavigate('library');
                  }
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--brand-gold, #F5C518)',
                  color: '#0A0A0F',
                  fontWeight: 800,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Play size={16} fill="#0A0A0F" />
                <span>Watch Now</span>
              </button>

              <button
                onClick={() => setUnlockedResult(null)}
                style={{
                  padding: '12px 18px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

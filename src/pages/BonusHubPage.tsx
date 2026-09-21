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
  History
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

interface PromoRedemptionItem {
  id: string;
  promo_code_id: string;
  promo_code: string;
  user_id: string;
  content_id: string;
  redeemed_at: string;
  expires_at: string;
  created_at: string;
  content_title?: string;
  content_poster?: string;
  content_type?: string;
  content_slug?: string;
}

interface BonusHubPageProps {
  onNavigate: (tab: string, param?: string) => void;
  onPlayContent?: (content: ContentItem) => void;
}

export const BonusHubPage: React.FC<BonusHubPageProps> = ({ onNavigate, onPlayContent }) => {
  const { isAuthenticated, openAuthModal, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'active' | 'expired' | 'history'>('active');

  const [loading, setLoading] = useState(true);
  const [canRedeem, setCanRedeem] = useState(true);
  const [activePromos, setActivePromos] = useState<PromoCodeItem[]>([]);
  const [expiredPromos, setExpiredPromos] = useState<PromoCodeItem[]>([]);
  const [usedPromos, setUsedPromos] = useState<PromoRedemptionItem[]>([]);

  // Input & Modal State
  const [inputCode, setInputCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Content Selection Modal
  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedCodeForRedeem, setSelectedCodeForRedeem] = useState('');
  const [catalogTitles, setCatalogTitles] = useState<ContentItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [contentSearch, setContentSearch] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<ContentItem | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  // Success Confirmation Modal
  const [unlockedResult, setUnlockedResult] = useState<{
    title: string;
    expiresAt: string;
    contentItem?: ContentItem;
  } | null>(null);

  const fetchHubData = async () => {
    try {
      setLoading(true);
      const res = await api.promos.getHub();
      if (res.success) {
        setCanRedeem(res.canRedeem ?? true);
        setActivePromos(res.activePromos || []);
        setExpiredPromos(res.expiredPromos || []);
        setUsedPromos(res.usedPromos || []);
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

  const handleStartRedeem = (codeToUse?: string) => {
    if (!isAuthenticated) {
      showToast('Please sign in to claim your welcome bonus!', 'info');
      openAuthModal();
      return;
    }

    if (!canRedeem) {
      showToast('You have already redeemed your 1-time welcome bonus pass.', 'info');
      return;
    }

    const code = (codeToUse || inputCode).trim().toUpperCase();
    if (!code) {
      showToast('Please enter or select a promo code.', 'error');
      return;
    }

    setSelectedCodeForRedeem(code);
    setSelectedTitle(null);
    setShowContentModal(true);
    loadCatalog();
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
              Redeem exclusive welcome promo codes to unlock ANY single Movie or Web Series of your choice completely free for 30 days.
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
              backgroundColor: canRedeem ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: canRedeem ? '#34D399' : '#F87171',
              border: canRedeem ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
            }}
          >
            {canRedeem ? <CheckCircle2 size={14} /> : <ShieldCheck size={14} />}
            <span>{canRedeem ? '1 Free Movie/Series Access Pass Available' : 'Welcome Bonus Already Redeemed'}</span>
          </div>

          <span style={{ fontSize: '12px', color: '#6B7280' }}>•</span>
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Strictly 1-time redemption per user account</span>
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
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
              Have a Promo Code?
            </h2>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 16px' }}>
              Type your coupon code below to unlock any movie or series for 30 days without spending money.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                placeholder="ENTER PROMO CODE (e.g. WELCOMEBONUS)"
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
                disabled={!canRedeem}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  backgroundColor: canRedeem ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.1)',
                  color: canRedeem ? '#0A0A0F' : '#6B7280',
                  fontSize: '14px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: canRedeem ? 'pointer' : 'not-allowed',
                  boxShadow: canRedeem ? '0 4px 14px rgba(245, 197, 24, 0.3)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                Redeem for 1 Free Movie/Series
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
                    {/* Top row: Code Pill & Copy */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
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
                      <Film size={15} color="var(--brand-gold, #F5C518)" />
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        1-Time Free Movie or Series Access
                      </h3>
                    </div>
                    <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 14px', lineHeight: 1.45 }}>
                      {item.description || 'Redeem to unlock any paid catalog title for 30 days.'}
                    </p>
                  </div>

                  {/* Bottom Footer: Time Remaining & Redeem Button */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF' }}>
                        <Clock size={13} />
                        <span>
                          {item.expires_at ? `Expires ${new Date(item.expires_at).toLocaleDateString()}` : `${Math.round(item.validity_hours / 24)} Days Validity`}
                        </span>
                      </div>
                      {item.time_remaining_hours !== undefined && (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)' }}>
                          {item.time_remaining_hours} hours left
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleStartRedeem(item.code)}
                      disabled={!canRedeem}
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: '8px',
                        backgroundColor: canRedeem ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: canRedeem ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: canRedeem ? 'var(--brand-gold, #F5C518)' : '#6B7280',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: canRedeem ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {canRedeem ? 'Redeem for 1 Free Movie/Series' : 'Welcome Pass Redeemed'}
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
              {usedPromos.map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--bg-surface, #12121A)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {item.content_poster ? (
                      <img
                        src={item.content_poster}
                        alt={item.content_title || 'Unlocked Title'}
                        style={{
                          width: '64px',
                          height: '92px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '64px',
                          height: '92px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#9CA3AF'
                        }}
                      >
                        <Film size={24} />
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34D399',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          UNLOCKED
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)' }}>
                          Code: {item.promo_code}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
                        {item.content_title || 'Unlocked Title'}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#9CA3AF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} />
                          <span>Redeemed: {new Date(item.redeemed_at).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} />
                          <span>Expires: {new Date(item.expires_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (item.content_id) {
                        onNavigate('library');
                      }
                    }}
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
                </div>
              ))}
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

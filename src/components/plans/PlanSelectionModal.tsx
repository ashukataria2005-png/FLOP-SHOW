import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  Film,
  Tv,
  Check,
  Download,
  ArrowRight,
  Crown,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const PlanSelectionModal: React.FC = () => {
  const {
    activeModal,
    planSelectorTarget,
    closePlanSelector,
    openPurchaseModal,
    openWatchPassModal,
    openSubscriptionModal
  } = useApp();

  const [selectedTier, setSelectedTier] = useState<'single' | 'pass' | 'vip'>('single');
  const [selectedPassPlan, setSelectedPassPlan] = useState<'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D'>('PASS_7D');
  const [selectedVipPlan, setSelectedVipPlan] = useState<'MONTHLY' | '3_MONTHS' | 'YEARLY'>('3_MONTHS');

  // Backend configured live plans
  const [backendPassPlans, setBackendPassPlans] = useState<any[]>([]);
  const [backendVipPlans, setBackendVipPlans] = useState<any[]>([]);

  // Background Movie Screen Scroll Lock when modal is open
  useEffect(() => {
    if (activeModal === 'plan_selector') {
      const origBodyOverflow = document.body.style.overflow;
      const origHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origBodyOverflow || '';
        document.documentElement.style.overflow = origHtmlOverflow || '';
      };
    }
  }, [activeModal]);

  useEffect(() => {
    if (activeModal === 'plan_selector') {
      api.watchPasses.getPlans()
        .then(res => {
          if (res?.plans && Array.isArray(res.plans)) {
            setBackendPassPlans(res.plans);
          }
        })
        .catch(() => {});

      api.subscriptions.getPlans()
        .then(res => {
          if (res?.plans && Array.isArray(res.plans)) {
            setBackendVipPlans(res.plans);
          }
        })
        .catch(() => {});
    }
  }, [activeModal]);

  if (activeModal !== 'plan_selector' || !planSelectorTarget) return null;

  const item = planSelectorTarget;
  const isSeries = item.type === 'series';
  const ownPrice = item.price || (isSeries ? 35 : 30);

  // Watch pass plans metadata with live backend prices
  const getPassPrice = (planId: string, defaultPrice: number) => {
    const found = backendPassPlans.find(p => p.plan === planId || p.id === planId);
    return found?.priceRupees ?? defaultPrice;
  };

  const passConfig = {
    PASS_24H: {
      id: 'PASS_24H' as const,
      name: '24 Hours Pass',
      durationLabel: '24 Hours',
      price: getPassPrice('PASS_24H', 19),
      badge: 'Quick Pass',
      features: [
        '24 Hours Full Catalog Access',
        'HD 720p Streaming',
        '1 Device Supported',
        'Instant Activation'
      ]
    },
    PASS_3D: {
      id: 'PASS_3D' as const,
      name: '3 Days Pass',
      durationLabel: '3 Days',
      price: getPassPrice('PASS_3D', 29),
      badge: 'Weekend Pass',
      features: [
        '3 Days Full Catalog Access',
        'HD 720p Streaming',
        '1 Device + 1 Tablet',
        'Binge Weekend Access'
      ]
    },
    PASS_7D: {
      id: 'PASS_7D' as const,
      name: '7 Days Pass',
      durationLabel: '7 Days',
      price: getPassPrice('PASS_7D', 44),
      badge: 'Recommended',
      features: [
        '7 Days Full Catalog Access',
        'Full HD 1080p Streaming',
        'Download Available',
        '2 Devices + TV Cast'
      ]
    },
    PASS_15D: {
      id: 'PASS_15D' as const,
      name: '15 Days Pass',
      durationLabel: '15 Days',
      price: getPassPrice('PASS_15D', 69),
      badge: 'Best Value',
      features: [
        '15 Days Full Catalog Access',
        'Full HD 1080p Streaming',
        'Download Available',
        '3 Devices Supported'
      ]
    }
  };

  // VIP plans metadata with live backend prices
  const getVipPrice = (planId: string, defaultPrice: number) => {
    const found = backendVipPlans.find(p => p.plan === planId || p.id === planId);
    return found?.priceRupees ?? defaultPrice;
  };

  const vipConfig = {
    MONTHLY: {
      id: 'MONTHLY' as const,
      name: 'VIP Monthly',
      durationLabel: '1 Month (30 Days)',
      price: getVipPrice('MONTHLY', 89),
      badge: 'Standard VIP',
      features: [
        '30 Days Unlimited Catalog Access',
        'Full HD 1080p Ultra Streaming',
        'Download Available on all devices',
        'Zero Per-Content Charges'
      ]
    },
    '3_MONTHS': {
      id: '3_MONTHS' as const,
      name: 'VIP 3 Months',
      durationLabel: '3 Months (90 Days)',
      price: getVipPrice('3_MONTHS', 189),
      badge: 'Most Popular',
      features: [
        '90 Days Unlimited VIP Access',
        'Full HD 1080p Ultra Streaming',
        'Download Available on all devices',
        'Multi-Device Playback (TV, Phone, Tablet)'
      ]
    },
    YEARLY: {
      id: 'YEARLY' as const,
      name: 'VIP 12 Months',
      durationLabel: 'Full Year (365 Days)',
      price: getVipPrice('YEARLY', 449),
      badge: 'Best Value (Save 58%)',
      features: [
        '365 Days Full VIP Catalog Access',
        'Full HD 1080p Ultra Streaming',
        'Download Available on all devices',
        'Priority Customer Support'
      ]
    }
  };

  const handlePayOwn = () => {
    closePlanSelector();
    openPurchaseModal(item);
  };

  const handlePayWatchPass = () => {
    closePlanSelector();
    openWatchPassModal(item, selectedPassPlan, 'pay');
  };

  const handlePayVip = () => {
    closePlanSelector();
    openSubscriptionModal(selectedVipPlan, 'pay');
  };

  const currentPass = passConfig[selectedPassPlan];
  const currentVip = vipConfig[selectedVipPlan];

  const currentAction = selectedTier === 'single'
    ? handlePayOwn
    : selectedTier === 'pass'
      ? handlePayWatchPass
      : handlePayVip;

  const currentLabel = selectedTier === 'single'
    ? `Continue to Pay ₹${ownPrice}`
    : selectedTier === 'pass'
      ? `Pay ₹${currentPass.price} (${currentPass.name})`
      : `Pay ₹${currentVip.price} (${currentVip.name})`;

  const currentAccentColor = selectedTier === 'single'
    ? 'var(--brand-gold, #F5C518)'
    : selectedTier === 'pass'
      ? '#38BDF8'
      : '#C084FC';

  return (
    <div
      className="modal-backdrop"
      onClick={closePlanSelector}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        overflow: 'hidden',
        overscrollBehavior: 'contain',
        touchAction: 'none'
      }}
    >
      <div
        className="modal-dialog"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '100%',
          maxHeight: '90vh',
          height: '90vh',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0E0E14',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)'
        }}
      >
        {/* Fixed Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)',
                flexShrink: 0
              }}
            >
              {isSeries ? <Tv size={20} /> : <Film size={20} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Subscribe to Watch
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--brand-gold, #F5C518)',
                    textTransform: 'uppercase'
                  }}
                >
                  {item.title}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                Single title purchase, flexible watch pass, or all-access VIP subscription.
              </p>
            </div>
          </div>

          <button
            onClick={closePlanSelector}
            style={{
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '8px',
              flexShrink: 0
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Middle Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            padding: '16px',
            paddingBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {/* ============================================================ */}
          {/* SECTION 1: PER-MOVIE / SERIES (30-DAY ACCESS)                */}
          {/* ============================================================ */}
          <div
            style={{
              borderRadius: '16px',
              border: selectedTier === 'single'
                ? '2px solid var(--brand-gold, #F5C518)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: selectedTier === 'single'
                ? 'rgba(245, 197, 24, 0.04)'
                : 'rgba(255, 255, 255, 0.02)',
              overflow: 'hidden',
              boxShadow: selectedTier === 'single'
                ? '0 4px 20px rgba(245, 197, 24, 0.15)'
                : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Header (Clickable to select/expand) */}
            <div
              onClick={() => setSelectedTier('single')}
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: selectedTier === 'single'
                  ? '1px solid rgba(245, 197, 24, 0.15)'
                  : 'none',
                backgroundColor: selectedTier === 'single'
                  ? 'rgba(245, 197, 24, 0.08)'
                  : 'transparent',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: selectedTier === 'single' ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.1)',
                    color: selectedTier === 'single' ? '#000000' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '13px',
                    flexShrink: 0
                  }}
                >
                  1
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      {isSeries ? 'Series 30-Day Access' : 'Movie 30-Day Access'}
                    </h4>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(245, 197, 24, 0.2)',
                        color: 'var(--brand-gold, #F5C518)',
                        textTransform: 'uppercase'
                      }}
                    >
                      Single Title
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: '#9CA3AF', margin: '2px 0 0' }}>
                    Stream this specific {isSeries ? 'series (all episodes)' : 'movie'} with 30-day library validity
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, textAlign: 'right' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)' }}>
                  ₹{ownPrice}
                </span>
                {selectedTier === 'single' ? (
                  <ChevronUp size={18} color="var(--brand-gold, #F5C518)" />
                ) : (
                  <ChevronDown size={18} color="#6B7280" />
                )}
              </div>
            </div>

            {/* Sub-options & Details (Only visible when active) */}
            {selectedTier === 'single' && (
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#E5E7EB' }}>
                    <Check size={15} color="var(--brand-gold, #F5C518)" />
                    <span><strong>30 Days Full Access</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#E5E7EB' }}>
                    <Check size={15} color="var(--brand-gold, #F5C518)" />
                    <span><strong>Full HD 1080p Quality</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#E5E7EB' }}>
                    <Download size={15} color="var(--brand-gold, #F5C518)" />
                    <span><strong>Offline Download Available</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#E5E7EB' }}>
                    <Check size={15} color="var(--brand-gold, #F5C518)" />
                    <span>{isSeries ? 'All seasons & all episodes' : 'Full uncut movie'}</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Total for 30-day access:</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginLeft: '6px' }}>
                      ₹{ownPrice}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handlePayOwn}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--brand-gold, #F5C518)',
                      color: '#000000',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(245, 197, 24, 0.25)'
                    }}
                  >
                    <span>Continue to Pay ₹{ownPrice}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* SECTION 2: WATCH PASS (CATALOG-WIDE ACCESS)                  */}
          {/* ============================================================ */}
          <div
            style={{
              borderRadius: '16px',
              border: selectedTier === 'pass'
                ? '2px solid #38BDF8'
                : '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: selectedTier === 'pass'
                ? 'rgba(56, 189, 248, 0.04)'
                : 'rgba(255, 255, 255, 0.02)',
              overflow: 'hidden',
              boxShadow: selectedTier === 'pass'
                ? '0 4px 20px rgba(56, 189, 248, 0.15)'
                : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Header (Clickable to select/expand) */}
            <div
              onClick={() => setSelectedTier('pass')}
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: selectedTier === 'pass'
                  ? '1px solid rgba(56, 189, 248, 0.15)'
                  : 'none',
                backgroundColor: selectedTier === 'pass'
                  ? 'rgba(56, 189, 248, 0.08)'
                  : 'transparent',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: selectedTier === 'pass' ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)',
                    color: selectedTier === 'pass' ? '#000000' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '13px',
                    flexShrink: 0
                  }}
                >
                  2
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      Watch Pass (Catalog-Wide)
                    </h4>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(56, 189, 248, 0.2)',
                        color: '#38BDF8',
                        textTransform: 'uppercase'
                      }}
                    >
                      All Content
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: '#9CA3AF', margin: '2px 0 0' }}>
                    Temporary catalog access without owning individual titles (24 Hours to 15 Days)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, textAlign: 'right' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>From </span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#38BDF8' }}>
                    ₹{passConfig.PASS_24H.price}
                  </span>
                </div>
                {selectedTier === 'pass' ? (
                  <ChevronUp size={18} color="#38BDF8" />
                ) : (
                  <ChevronDown size={18} color="#6B7280" />
                )}
              </div>
            </div>

            {/* Sub-options & Details (Only visible when active) */}
            {selectedTier === 'pass' && (
              <div style={{ padding: '16px 18px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '10px',
                    marginBottom: '14px'
                  }}
                >
                  {(['PASS_24H', 'PASS_3D', 'PASS_7D', 'PASS_15D'] as const).map(pId => {
                    const plan = passConfig[pId];
                    const isSelected = selectedPassPlan === pId;
                    return (
                      <div
                        key={pId}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPassPlan(pId);
                          setSelectedTier('pass');
                        }}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              backgroundColor: isSelected ? '#38BDF8' : 'rgba(255, 255, 255, 0.08)',
                              color: isSelected ? '#000000' : '#9CA3AF',
                              textTransform: 'uppercase'
                            }}
                          >
                            {plan.badge}
                          </span>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginTop: '6px' }}>
                            {plan.durationLabel}
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '19px', fontWeight: 900, color: isSelected ? '#38BDF8' : '#FFFFFF' }}>
                            ₹{plan.price}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Pass Features & CTA */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                      {currentPass.name} • ₹{currentPass.price}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px', fontSize: '11.5px', color: '#9CA3AF' }}>
                      {currentPass.features.map((feat, idx) => (
                        <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={12} color="#38BDF8" />
                          <span>{feat}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePayWatchPass}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: '#38BDF8',
                      color: '#000000',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(56, 189, 248, 0.25)'
                    }}
                  >
                    <span>Continue to Pay ₹{currentPass.price}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* SECTION 3: VIP SUBSCRIPTION PLANS (ALL-ACCESS MEMBERSHIP)     */}
          {/* ============================================================ */}
          <div
            style={{
              borderRadius: '16px',
              border: selectedTier === 'vip'
                ? '2px solid #C084FC'
                : '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: selectedTier === 'vip'
                ? 'rgba(192, 132, 252, 0.04)'
                : 'rgba(255, 255, 255, 0.02)',
              overflow: 'hidden',
              boxShadow: selectedTier === 'vip'
                ? '0 4px 20px rgba(192, 132, 252, 0.15)'
                : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Header (Clickable to select/expand) */}
            <div
              onClick={() => setSelectedTier('vip')}
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: selectedTier === 'vip'
                  ? '1px solid rgba(192, 132, 252, 0.15)'
                  : 'none',
                backgroundColor: selectedTier === 'vip'
                  ? 'rgba(192, 132, 252, 0.08)'
                  : 'transparent',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: selectedTier === 'vip' ? '#C084FC' : 'rgba(255, 255, 255, 0.1)',
                    color: selectedTier === 'vip' ? '#000000' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '13px',
                    flexShrink: 0
                  }}
                >
                  3
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      VIP Subscription Plans
                    </h4>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(192, 132, 252, 0.2)',
                        color: '#C084FC',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Crown size={10} />
                      <span>All-Access</span>
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: '#9CA3AF', margin: '2px 0 0' }}>
                    Full catalog unlimited streaming & downloads across all devices (Monthly, 3 Months, Yearly)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, textAlign: 'right' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>From </span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#C084FC' }}>
                    ₹{vipConfig.MONTHLY.price}
                  </span>
                </div>
                {selectedTier === 'vip' ? (
                  <ChevronUp size={18} color="#C084FC" />
                ) : (
                  <ChevronDown size={18} color="#6B7280" />
                )}
              </div>
            </div>

            {/* Sub-options & Details (Only visible when active) */}
            {selectedTier === 'vip' && (
              <div style={{ padding: '16px 18px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '12px',
                    marginBottom: '14px'
                  }}
                >
                  {(['MONTHLY', '3_MONTHS', 'YEARLY'] as const).map(vId => {
                    const plan = vipConfig[vId];
                    const isSelected = selectedVipPlan === vId;
                    return (
                      <div
                        key={vId}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVipPlan(vId);
                          setSelectedTier('vip');
                        }}
                        style={{
                          padding: '14px 12px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #C084FC' : '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: isSelected ? 'rgba(192, 132, 252, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '8px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              backgroundColor: isSelected ? '#C084FC' : 'rgba(255, 255, 255, 0.08)',
                              color: isSelected ? '#000000' : '#9CA3AF',
                              textTransform: 'uppercase'
                            }}
                          >
                            {plan.badge}
                          </span>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginTop: '6px' }}>
                            {plan.durationLabel}
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '20px', fontWeight: 900, color: isSelected ? '#C084FC' : '#FFFFFF' }}>
                            ₹{plan.price}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected VIP Details & CTA */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                      {currentVip.name} • ₹{currentVip.price}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px', fontSize: '11.5px', color: '#9CA3AF' }}>
                      {currentVip.features.map((feat, idx) => (
                        <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={12} color="#C084FC" />
                          <span>{feat}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePayVip}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: '#C084FC',
                      color: '#000000',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(192, 132, 252, 0.25)'
                    }}
                  >
                    <span>Continue to Pay ₹{currentVip.price}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div
          style={{
            padding: '12px 16px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(10, 10, 16, 0.98)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#9CA3AF' }}>
            <Sparkles size={14} color="var(--brand-gold, #F5C518)" style={{ flexShrink: 0 }} />
            <span>Instant activation on UPI</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={closePlanSelector}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#D1D5DB',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={currentAction}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: currentAccentColor,
                color: '#000000',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
              }}
            >
              <span>{currentLabel}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

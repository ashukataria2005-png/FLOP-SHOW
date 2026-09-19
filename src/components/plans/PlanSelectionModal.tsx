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
  ChevronDown,
  ChevronUp,
  Crown
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

  // Accordion state: initially null (all 3 collapsed)
  const [expandedCategory, setExpandedCategory] = useState<'OWN' | 'WATCH_PASS' | 'VIP' | null>(null);
  const [selectedPassPlan, setSelectedPassPlan] = useState<'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D'>('PASS_7D');
  const [selectedVipPlan, setSelectedVipPlan] = useState<'MONTHLY' | '3_MONTHS' | 'YEARLY'>('3_MONTHS');

  // Backend configured live plans
  const [backendPassPlans, setBackendPassPlans] = useState<any[]>([]);
  const [backendVipPlans, setBackendVipPlans] = useState<any[]>([]);

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

  const toggleCategory = (cat: 'OWN' | 'WATCH_PASS' | 'VIP') => {
    setExpandedCategory(prev => prev === cat ? null : cat);
  };

  const handleContinue = (catOverride?: 'OWN' | 'WATCH_PASS' | 'VIP') => {
    const cat = catOverride || expandedCategory;
    if (!cat) return;
    closePlanSelector();
    if (cat === 'OWN') {
      openPurchaseModal(item);
    } else if (cat === 'WATCH_PASS') {
      openWatchPassModal(item, selectedPassPlan, 'pay');
    } else if (cat === 'VIP') {
      openSubscriptionModal(selectedVipPlan, 'pay');
    }
  };

  const currentPass = passConfig[selectedPassPlan];
  const currentVip = vipConfig[selectedVipPlan];

  return (
    <div className="modal-backdrop" onClick={closePlanSelector} style={{ zIndex: 1050 }}>
      <div
        className="modal-dialog"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0E0E14',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)'
              }}
            >
              {isSeries ? <Tv size={20} /> : <Film size={20} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Choose Access Plan
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
                Select one of the 3 purchase categories below to expand options.
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
              borderRadius: '8px'
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Accordion Body */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {/* ============================================================ */}
          {/* CATEGORY 1: MOVIE / SERIES (30-DAY ACCESS)                   */}
          {/* ============================================================ */}
          <div
            style={{
              borderRadius: '16px',
              border: expandedCategory === 'OWN'
                ? '2px solid var(--brand-gold, #F5C518)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: expandedCategory === 'OWN'
                ? 'rgba(245, 197, 24, 0.04)'
                : 'rgba(255, 255, 255, 0.02)',
              overflow: 'hidden',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Accordion Header */}
            <div
              onClick={() => toggleCategory('OWN')}
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: expandedCategory === 'OWN' ? 'var(--brand-gold, #F5C518)' : 'rgba(245, 197, 24, 0.15)',
                    color: expandedCategory === 'OWN' ? '#000000' : 'var(--brand-gold, #F5C518)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px'
                  }}
                >
                  1
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      {isSeries ? 'Series 30-Day Access' : 'Movie 30-Day Access'}
                    </h4>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(245, 197, 24, 0.15)',
                        color: 'var(--brand-gold, #F5C518)',
                        textTransform: 'uppercase'
                      }}
                    >
                      Single Title
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                    Stream this specific {isSeries ? 'series (all episodes)' : 'movie'} with 30-day library validity
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)' }}>
                  ₹{ownPrice}
                </span>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9CA3AF'
                  }}
                >
                  {expandedCategory === 'OWN' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </div>

            {/* Accordion Content */}
            {expandedCategory === 'OWN' && (
              <div
                style={{
                  padding: '16px 20px 20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFFFFF' }}>
                      <Check size={16} color="var(--brand-gold, #F5C518)" />
                      <span><strong>30 Days Full Access</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFFFFF' }}>
                      <Check size={16} color="var(--brand-gold, #F5C518)" />
                      <span><strong>Full HD 1080p Quality</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFFFFF' }}>
                      <Download size={16} color="var(--brand-gold, #F5C518)" />
                      <span><strong>Offline Download Available</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFFFFF' }}>
                      <Check size={16} color="var(--brand-gold, #F5C518)" />
                      <span>{isSeries ? 'All seasons & all episodes' : 'Full uncut movie'}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Payable
                      </span>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>
                        ₹{ownPrice}
                      </div>
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                        Direct UPI Payment (Admin Verified)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleContinue('OWN')}
                      style={{
                        marginTop: '14px',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--brand-gold, #F5C518)',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(245, 197, 24, 0.25)'
                      }}
                    >
                      <span>Continue to Pay ₹{ownPrice}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* CATEGORY 2: WATCH PASS (CATALOG-WIDE TEMPORARY ACCESS)       */}
          {/* ============================================================ */}
          <div
            style={{
              borderRadius: '16px',
              border: expandedCategory === 'WATCH_PASS'
                ? '2px solid #38BDF8'
                : '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: expandedCategory === 'WATCH_PASS'
                ? 'rgba(56, 189, 248, 0.04)'
                : 'rgba(255, 255, 255, 0.02)',
              overflow: 'hidden',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Accordion Header */}
            <div
              onClick={() => toggleCategory('WATCH_PASS')}
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: expandedCategory === 'WATCH_PASS' ? '#38BDF8' : 'rgba(56, 189, 248, 0.15)',
                    color: expandedCategory === 'WATCH_PASS' ? '#000000' : '#38BDF8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px'
                  }}
                >
                  2
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      Watch Pass (Catalog-Wide)
                    </h4>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        color: '#38BDF8',
                        textTransform: 'uppercase'
                      }}
                    >
                      All Movies & Series
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                    Temporary catalog access without owning individual titles (24 Hours to 15 Days)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#38BDF8' }}>
                  From ₹{passConfig.PASS_24H.price}
                </span>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9CA3AF'
                  }}
                >
                  {expandedCategory === 'WATCH_PASS' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </div>

            {/* Accordion Content */}
            {expandedCategory === 'WATCH_PASS' && (
              <div
                style={{
                  padding: '16px 20px 20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)'
                }}
              >
                {/* 4 Pass Plans Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '18px' }}>
                  {(['PASS_24H', 'PASS_3D', 'PASS_7D', 'PASS_15D'] as const).map(pId => {
                    const plan = passConfig[pId];
                    const isSelected = selectedPassPlan === pId;
                    return (
                      <div
                        key={pId}
                        onClick={() => setSelectedPassPlan(pId)}
                        style={{
                          padding: '14px 12px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
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
                              fontSize: '9.5px',
                              fontWeight: 800,
                              padding: '2px 6px',
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
                          <span style={{ fontSize: '20px', fontWeight: 900, color: isSelected ? '#38BDF8' : '#FFFFFF' }}>
                            ₹{plan.price}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Pass Details & Pay CTA */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                      {currentPass.name} • ₹{currentPass.price}
                    </div>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                      {currentPass.features.map((feat, idx) => (
                        <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={13} color="#38BDF8" />
                          <span>{feat}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleContinue('WATCH_PASS')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: '#38BDF8',
                      color: '#000000',
                      fontWeight: 900,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)'
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
          {/* CATEGORY 3: VIP PLANS (ALL-ACCESS MEMBERSHIP)                 */}
          {/* ============================================================ */}
          <div
            style={{
              borderRadius: '16px',
              border: expandedCategory === 'VIP'
                ? '2px solid #C084FC'
                : '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: expandedCategory === 'VIP'
                ? 'rgba(192, 132, 252, 0.04)'
                : 'rgba(255, 255, 255, 0.02)',
              overflow: 'hidden',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Accordion Header */}
            <div
              onClick={() => toggleCategory('VIP')}
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: expandedCategory === 'VIP' ? '#C084FC' : 'rgba(192, 132, 252, 0.15)',
                    color: expandedCategory === 'VIP' ? '#000000' : '#C084FC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px'
                  }}
                >
                  3
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      VIP Subscription Plans
                    </h4>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(192, 132, 252, 0.18)',
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
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                    Full catalog unlimited streaming & downloads (Monthly, 3 Months, Yearly)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#C084FC' }}>
                  From ₹{vipConfig.MONTHLY.price}
                </span>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9CA3AF'
                  }}
                >
                  {expandedCategory === 'VIP' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </div>

            {/* Accordion Content */}
            {expandedCategory === 'VIP' && (
              <div
                style={{
                  padding: '16px 20px 20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)'
                }}
              >
                {/* 3 VIP Plans Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  {(['MONTHLY', '3_MONTHS', 'YEARLY'] as const).map(vId => {
                    const plan = vipConfig[vId];
                    const isSelected = selectedVipPlan === vId;
                    return (
                      <div
                        key={vId}
                        onClick={() => setSelectedVipPlan(vId)}
                        style={{
                          padding: '16px 14px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #C084FC' : '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: isSelected ? 'rgba(192, 132, 252, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isSelected ? '#C084FC' : 'rgba(255, 255, 255, 0.08)',
                              color: isSelected ? '#000000' : '#9CA3AF',
                              textTransform: 'uppercase'
                            }}
                          >
                            {plan.badge}
                          </span>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', marginTop: '6px' }}>
                            {plan.durationLabel}
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '22px', fontWeight: 900, color: isSelected ? '#C084FC' : '#FFFFFF' }}>
                            ₹{plan.price}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected VIP Details & Pay CTA */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                      {currentVip.name} • ₹{currentVip.price}
                    </div>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                      {currentVip.features.map((feat, idx) => (
                        <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={13} color="#C084FC" />
                          <span>{feat}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleContinue('VIP')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: '#C084FC',
                      color: '#000000',
                      fontWeight: 900,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(192, 132, 252, 0.3)'
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

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(10, 10, 16, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Active Selection:</span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: expandedCategory === 'VIP' ? '#C084FC' : expandedCategory === 'WATCH_PASS' ? '#38BDF8' : 'var(--brand-gold, #F5C518)'
              }}
            >
              {expandedCategory === null
                ? 'No category selected (click any category to expand)'
                : expandedCategory === 'OWN'
                ? `${isSeries ? 'Series' : 'Movie'} 30-Day Access (₹${ownPrice})`
                : expandedCategory === 'WATCH_PASS'
                ? `${currentPass.name} (₹${currentPass.price})`
                : `${currentVip.name} (₹${currentVip.price})`}
            </span>
          </div>

          <button
            type="button"
            onClick={closePlanSelector}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#D1D5DB',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

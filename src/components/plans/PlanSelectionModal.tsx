import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Film,
  Tv,
  Check,
  Download,
  ArrowRight
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

  const [selectedCategory, setSelectedCategory] = useState<'OWN' | 'WATCH_PASS' | 'VIP'>('OWN');
  const [selectedPassPlan, setSelectedPassPlan] = useState<'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D'>('PASS_7D');
  const [selectedVipPlan, setSelectedVipPlan] = useState<'MONTHLY' | '3_MONTHS' | 'YEARLY'>('3_MONTHS');

  if (activeModal !== 'plan_selector' || !planSelectorTarget) return null;

  const item = planSelectorTarget;
  const isSeries = item.type === 'series';
  const ownPrice = isSeries ? 35 : 30;

  // Watch pass plans metadata
  const passConfig = {
    PASS_24H: {
      name: '24 Hours Pass',
      durationLabel: '24 Hours',
      price: 19,
      badge: 'Quick Pass',
      features: [
        '24 Hours Access',
        'HD 720p',
        '1 Device',
        'No Download'
      ]
    },
    PASS_3D: {
      name: '3 Days Pass',
      durationLabel: '3 Days',
      price: 29,
      badge: 'Weekend Pass',
      features: [
        '3 Days Access',
        'HD 720p',
        '1 Device',
        '1 Tablet',
        'No Download'
      ]
    },
    PASS_7D: {
      name: '7 Days Pass',
      durationLabel: '7 Days',
      price: 44,
      badge: 'Recommended',
      features: [
        '7 Days Access',
        'Full HD 1080p',
        'Download Available',
        '2 Devices',
        '1 Tablet + 1 TV'
      ]
    },
    PASS_15D: {
      name: '15 Days Pass',
      durationLabel: '15 Days',
      price: 69,
      badge: 'Best Value',
      features: [
        '15 Days Access',
        'Full HD 1080p',
        'Download Available',
        '3 Devices',
        '2 Tablets + 1 TV'
      ]
    }
  };

  // VIP plans metadata
  const vipConfig = {
    MONTHLY: {
      name: 'VIP Monthly',
      durationLabel: 'Monthly',
      price: 89,
      badge: '30 Days VIP',
      features: [
        '30 Days Unlimited Catalog Access',
        'Full HD 1080p Streaming',
        'Download Available on all devices',
        'All Movies & Webseries Included'
      ]
    },
    '3_MONTHS': {
      name: 'VIP 3 Months',
      durationLabel: '3 Months',
      price: 189,
      badge: 'Best Value',
      features: [
        '90 Days Unlimited Catalog Access',
        'Full HD 1080p Streaming',
        'Download Available on all devices',
        'Zero Per-Content Charges'
      ]
    },
    YEARLY: {
      name: 'VIP 12 Months',
      durationLabel: 'Full Year',
      price: 449,
      badge: 'Annual VIP',
      features: [
        '365 Days Unlimited VIP Access',
        'Full HD 1080p Streaming',
        'Download Available on all devices',
        'Multi-Device Playback'
      ]
    }
  };

  const handleContinue = () => {
    closePlanSelector();
    if (selectedCategory === 'OWN') {
      openPurchaseModal(item);
    } else if (selectedCategory === 'WATCH_PASS') {
      openWatchPassModal(item, selectedPassPlan, 'pay');
    } else if (selectedCategory === 'VIP') {
      openSubscriptionModal(selectedVipPlan, 'pay');
    }
  };

  // Dynamic Continue Button label
  let continueBtnLabel = '';
  if (selectedCategory === 'OWN') {
    continueBtnLabel = isSeries
      ? 'Continue with Series Ownership'
      : 'Continue with Movie Ownership';
  } else if (selectedCategory === 'WATCH_PASS') {
    const p = passConfig[selectedPassPlan];
    continueBtnLabel = `Continue with ${p.durationLabel} Watch Pass`;
  } else {
    const v = vipConfig[selectedVipPlan];
    continueBtnLabel = `Continue with ${v.name}`;
  }

  const currentPass = passConfig[selectedPassPlan];
  const currentVip = vipConfig[selectedVipPlan];

  return (
    <div className="modal-backdrop" onClick={closePlanSelector} style={{ zIndex: 1050 }}>
      <div
        className="modal-dialog"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '920px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0E0E14',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)'
              }}
            >
              {isSeries ? <Tv size={18} /> : <Film size={18} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Choose How to Watch
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
                Select an access plan below to unlock streaming. Payment screen opens after confirmation.
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

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {/* Option Cards Container */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}
          >
            {/* ============================================================ */}
            {/* OPTION 1: OWN THIS MOVIE / SERIES                            */}
            {/* ============================================================ */}
            <div
              onClick={() => setSelectedCategory('OWN')}
              style={{
                borderRadius: '16px',
                padding: '20px',
                backgroundColor: selectedCategory === 'OWN' ? 'rgba(245, 197, 24, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                border: selectedCategory === 'OWN'
                  ? '2px solid var(--brand-gold, #F5C518)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'all 0.2s ease',
                boxShadow: selectedCategory === 'OWN' ? '0 8px 24px rgba(245, 197, 24, 0.15)' : 'none'
              }}
            >
              {/* Selected Radio Indicator */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: selectedCategory === 'OWN' ? '2px solid var(--brand-gold, #F5C518)' : '2px solid rgba(255, 255, 255, 0.3)',
                  backgroundColor: selectedCategory === 'OWN' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {selectedCategory === 'OWN' && <Check size={14} color="#000000" strokeWidth={3} />}
              </div>

              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--brand-gold, #F5C518)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  1. Own this {isSeries ? 'Series' : 'Movie'}
                </span>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px' }}>
                  {isSeries ? 'Series Ownership' : 'Movie Ownership'}
                </h4>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF' }}>₹{ownPrice}</span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>/ 1 month</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#FFFFFF', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={15} color="var(--brand-gold, #F5C518)" />
                    <span><strong>1 Month Validity</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={15} color="var(--brand-gold, #F5C518)" />
                    <span><strong>Full HD 1080p</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={15} color="var(--brand-gold, #F5C518)" />
                    <span><strong>Download Available</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={15} color="var(--brand-gold, #F5C518)" />
                    <span>{isSeries ? 'Full season / all episodes' : 'Single movie ownership'}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: '11.5px',
                  color: selectedCategory === 'OWN' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                  fontWeight: 600,
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                Added to your library for 30 days
              </div>
            </div>

            {/* ============================================================ */}
            {/* OPTION 2: WATCH PASS (Catalog-Wide Temporary Access)         */}
            {/* ============================================================ */}
            <div
              onClick={() => setSelectedCategory('WATCH_PASS')}
              style={{
                borderRadius: '16px',
                padding: '20px',
                backgroundColor: selectedCategory === 'WATCH_PASS' ? 'rgba(245, 197, 24, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                border: selectedCategory === 'WATCH_PASS'
                  ? '2px solid var(--brand-gold, #F5C518)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'all 0.2s ease',
                boxShadow: selectedCategory === 'WATCH_PASS' ? '0 8px 24px rgba(245, 197, 24, 0.15)' : 'none'
              }}
            >
              {/* Selected Radio Indicator */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: selectedCategory === 'WATCH_PASS' ? '2px solid var(--brand-gold, #F5C518)' : '2px solid rgba(255, 255, 255, 0.3)',
                  backgroundColor: selectedCategory === 'WATCH_PASS' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {selectedCategory === 'WATCH_PASS' && <Check size={14} color="#000000" strokeWidth={3} />}
              </div>

              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--brand-gold, #F5C518)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  2. Watch Pass (Catalog-Wide)
                </span>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px' }}>
                  FLOPSHOW Watch Pass
                </h4>

                {/* Duration Pills Switcher */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '14px' }}>
                  {(['PASS_24H', 'PASS_3D', 'PASS_7D', 'PASS_15D'] as const).map(pId => {
                    const plan = passConfig[pId];
                    const isPSelected = selectedPassPlan === pId;
                    return (
                      <button
                        key={pId}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedCategory('WATCH_PASS');
                          setSelectedPassPlan(pId);
                        }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: isPSelected ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: isPSelected ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          color: isPSelected ? '#FFFFFF' : '#9CA3AF',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <div>{plan.durationLabel}</div>
                        <div style={{ color: 'var(--brand-gold, #F5C518)', fontWeight: 800 }}>₹{plan.price}</div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF' }}>₹{currentPass.price}</span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>/ {currentPass.durationLabel.toLowerCase()}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(245, 197, 24, 0.15)',
                      color: 'var(--brand-gold, #F5C518)'
                    }}
                  >
                    {currentPass.badge}
                  </span>
                </div>

                {/* Features for selected pass */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#FFFFFF', marginBottom: '16px' }}>
                  {currentPass.features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={15} color="var(--brand-gold, #F5C518)" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  fontSize: '11.5px',
                  color: selectedCategory === 'WATCH_PASS' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                  fontWeight: 600,
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                Stream all movies &amp; series during pass
              </div>
            </div>

            {/* ============================================================ */}
            {/* OPTION 3: VIP MEMBERSHIP                                    */}
            {/* ============================================================ */}
            <div
              onClick={() => setSelectedCategory('VIP')}
              style={{
                borderRadius: '16px',
                padding: '20px',
                backgroundColor: selectedCategory === 'VIP' ? 'rgba(168, 85, 247, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                border: selectedCategory === 'VIP'
                  ? '2px solid #A855F7'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'all 0.2s ease',
                boxShadow: selectedCategory === 'VIP' ? '0 8px 24px rgba(168, 85, 247, 0.18)' : 'none'
              }}
            >
              {/* Selected Radio Indicator */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: selectedCategory === 'VIP' ? '2px solid #A855F7' : '2px solid rgba(255, 255, 255, 0.3)',
                  backgroundColor: selectedCategory === 'VIP' ? '#A855F7' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {selectedCategory === 'VIP' && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </div>

              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#C084FC',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  3. VIP Membership
                </span>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px' }}>
                  VIP All-Access
                </h4>

                {/* Duration Pills Switcher */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '14px' }}>
                  {(['MONTHLY', '3_MONTHS', 'YEARLY'] as const).map(vId => {
                    const plan = vipConfig[vId];
                    const isVSelected = selectedVipPlan === vId;
                    return (
                      <button
                        key={vId}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedCategory('VIP');
                          setSelectedVipPlan(vId);
                        }}
                        style={{
                          padding: '6px 4px',
                          borderRadius: '8px',
                          border: isVSelected ? '1.5px solid #A855F7' : '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: isVSelected ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          color: isVSelected ? '#FFFFFF' : '#9CA3AF',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <div>{plan.durationLabel}</div>
                        <div style={{ color: '#C084FC', fontWeight: 800 }}>₹{plan.price}</div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF' }}>₹{currentVip.price}</span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>/ {currentVip.durationLabel.toLowerCase()}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(168, 85, 247, 0.15)',
                      color: '#C084FC'
                    }}
                  >
                    {currentVip.badge}
                  </span>
                </div>

                {/* Features for selected VIP plan */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#FFFFFF', marginBottom: '16px' }}>
                  {currentVip.features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={15} color="#A855F7" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  fontSize: '11.5px',
                  color: selectedCategory === 'VIP' ? '#C084FC' : '#9CA3AF',
                  fontWeight: 600,
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                Highest quality &amp; complete access
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(10, 10, 16, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Selected Plan:</span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: selectedCategory === 'VIP' ? '#C084FC' : 'var(--brand-gold, #F5C518)'
              }}
            >
              {selectedCategory === 'OWN'
                ? (isSeries ? 'Series Ownership (₹35)' : 'Movie Ownership (₹30)')
                : selectedCategory === 'WATCH_PASS'
                ? `${currentPass.name} (₹${currentPass.price})`
                : `${currentVip.name} (₹${currentVip.price})`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={closePlanSelector}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#D1D5DB',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleContinue}
              style={{
                padding: '12px 28px',
                borderRadius: '12px',
                backgroundColor: selectedCategory === 'VIP' ? '#A855F7' : 'var(--brand-gold, #F5C518)',
                color: selectedCategory === 'VIP' ? '#FFFFFF' : '#000000',
                border: 'none',
                fontSize: '14px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: selectedCategory === 'VIP'
                  ? '0 6px 20px rgba(168, 85, 247, 0.3)'
                  : '0 6px 20px rgba(245, 197, 24, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{continueBtnLabel}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

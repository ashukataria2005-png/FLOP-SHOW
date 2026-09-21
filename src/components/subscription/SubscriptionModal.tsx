import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  Crown,
  Check,
  Copy,
  Clock,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { generateUpiQrDataUrl } from '../../utils/upiQr';

export const SubscriptionModal: React.FC = () => {
  const {
    activeModal,
    closeSubscriptionModal,
    subscriptionPlans,
    activeSubscription,
    pendingSubscription,
    submitSubscriptionRequest,
    isAuthenticated,
    showToast,
    subscriptionTargetPlan,
    subscriptionTargetStep,
    user
  } = useApp();

  const [selectedPlanId, setSelectedPlanId] = useState<'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY'>(subscriptionTargetPlan || 'MONTHLY');
  const [step, setStep] = useState<'choose' | 'pay'>(subscriptionTargetStep || 'choose');
  const [utr, setUtr] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UPI payment config
  const [upiConfig, setUpiConfig] = useState<{ upiId: string; merchantName: string; upiEnabled: boolean }>({
    upiId: 'flopshow@upi',
    merchantName: 'FLOPSHOW',
    upiEnabled: true,
  });

  // Dynamic UPI QR code state
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(false);

  // Safe fallback plans guaranteeing non-null selectedPlan and numbers
  const fallbackPlans = [
    { id: 'MONTHLY' as const, name: 'Monthly Plan', durationDays: 30, priceRupees: 89, description: '30 days full catalog access with HD & 1080p playback.' },
    { id: '3_MONTHS' as const, name: '3 Months Plan', durationDays: 90, priceRupees: 189, description: '90 days full catalog access with HD & 1080p playback. Great quarterly value!' },
    { id: 'YEARLY' as const, name: '12 Months / Full Year', durationDays: 365, priceRupees: 449, description: 'Best value! 365 days of unlimited movies and webseries across all devices.' }
  ];

  const plans = (subscriptionPlans && Array.isArray(subscriptionPlans) && subscriptionPlans.length > 0)
    ? subscriptionPlans
    : fallbackPlans;

  const selectedPlan = plans.find(p => p.id === selectedPlanId)
    || plans.find(p => p.id === 'MONTHLY')
    || plans[0]
    || fallbackPlans[0];

  // 1. Background Movie Screen Scroll Lock jab modal open ho
  useEffect(() => {
    if (activeModal === 'subscription') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || '';
      };
    }
  }, [activeModal]);

  useEffect(() => {
    if (activeModal === 'subscription') {
      api.payments.getConfig()
        .then(cfg => {
          if (cfg?.upiId) setUpiConfig(cfg);
        })
        .catch(() => { });
      if (subscriptionTargetPlan) {
        setSelectedPlanId(subscriptionTargetPlan);
      }
      setStep(subscriptionTargetStep || 'choose');
      setUtr('');
      setErrorMessage(null);
    }
  }, [activeModal, subscriptionTargetPlan, subscriptionTargetStep]);

  // Dynamically generate UPI QR code when reaching 'pay' step with selected plan amount
  useEffect(() => {
    let isCancelled = false;
    if (step === 'pay' && selectedPlan) {
      const upi = upiConfig?.upiId || 'flopshow@upi';
      const merchant = upiConfig?.merchantName || 'FLOPSHOW';
      const price = Number(selectedPlan.priceRupees) || 149;

      setQrLoading(true);
      generateUpiQrDataUrl(upi, price, merchant)
        .then(url => {
          if (!isCancelled) {
            setQrCodeUrl(url);
            setQrLoading(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setQrLoading(false);
          }
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [step, upiConfig?.upiId, upiConfig?.merchantName, selectedPlan?.priceRupees, selectedPlanId]);

  if (activeModal !== 'subscription') return null;

  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiConfig.upiId || 'flopshow@upi');
      showToast('UPI ID copied to clipboard!', 'success');
    }
  };

  const handleSelectPlan = (planId: 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY') => {
    setSelectedPlanId(planId);
    setStep('pay');
  };

  const handleProceedToPayment = () => {
    setStep('pay');
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr.trim()) {
      setErrorMessage('Please enter the 6-35 character UPI Transaction ID / UTR.');
      return;
    }
    if (!isAuthenticated && (!guestEmail.trim() || !guestEmail.includes('@'))) {
      setErrorMessage('Please enter a valid email address for subscription verification.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    const finalName = isAuthenticated ? user.name : (guestName.trim() || 'FLOPSHOW Subscriber');
    const finalEmail = isAuthenticated ? user.email : guestEmail.trim();

    const res = await submitSubscriptionRequest(selectedPlan.id, utr.trim(), finalName, finalEmail);
    setSubmitting(false);

    if (res.success) {
      closeSubscriptionModal();
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={closeSubscriptionModal}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
      }}
    >
      <div
        className="modal-dialog"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '88vh',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#12121A',
          border: '1px solid rgba(245, 166, 35, 0.3)',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(245, 166, 35, 0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Header - Fixed on top */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            backgroundColor: '#12121A'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 166, 35, 0.15)',
                border: '1px solid rgba(245, 166, 35, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold)',
                flexShrink: 0
              }}
            >
              <Crown size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
                FLOPSHOW Premium Pass
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Unlimited access to all movies and webseries
              </p>
            </div>
          </div>

          <button
            onClick={closeSubscriptionModal}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              padding: '6px'
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body - Independent Touch Scrollable Container */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            padding: '18px',
            paddingBottom: 'max(24px, calc(18px + env(safe-area-inset-bottom, 16px)))'
          }}
        >
          {/* If user already has an active subscription */}
          {activeSubscription && (
            <div
              style={{
                padding: '14px',
                borderRadius: '14px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <ShieldCheck size={20} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#10B981' }}>
                  You currently have an Active {activeSubscription.plan} Subscription
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  Valid until {new Date(activeSubscription.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ({activeSubscription.daysRemaining} days remaining). Enjoy full streaming access!
                </div>
              </div>
            </div>
          )}

          {/* If user has a pending verification request */}
          {pendingSubscription && (
            <div
              style={{
                padding: '14px',
                borderRadius: '14px',
                backgroundColor: 'rgba(245, 166, 35, 0.12)',
                border: '1px solid rgba(245, 166, 35, 0.4)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <Clock size={20} color="var(--brand-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-gold)' }}>
                  {pendingSubscription.plan} Subscription Payment Pending Verification
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  UTR: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{pendingSubscription.payment_reference}</strong>. Your subscription request is currently under review by an administrator. Once approved, your streaming access will activate immediately.
                </div>
              </div>
            </div>
          )}

          {step === 'choose' ? (
            /* STEP 1: CHOOSE SUBSCRIPTION PLAN */
            <div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Select Subscription Plan
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plans.map(plan => {
                    const isSelected = selectedPlanId === plan.id;
                    const badgeText = plan.id === '3_MONTHS' ? 'BEST VALUE' : plan.id === 'YEARLY' ? 'FULL YEAR' : null;

                    return (
                      <div
                        key={plan.id}
                        onClick={() => handleSelectPlan(plan.id)}
                        style={{
                          position: 'relative',
                          padding: '14px 16px',
                          borderRadius: '14px',
                          border: isSelected ? '2px solid var(--brand-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: isSelected ? '0 4px 20px rgba(245, 166, 35, 0.15)' : 'none'
                        }}
                      >
                        {badgeText && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '16px',
                              padding: '1px 8px',
                              borderRadius: '9999px',
                              backgroundColor: 'var(--brand-gold)',
                              color: '#0E0E12',
                              fontSize: '9px',
                              fontWeight: 800,
                              letterSpacing: '0.04em'
                            }}
                          >
                            {badgeText}
                          </span>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: isSelected ? '5px solid var(--brand-gold)' : '2px solid rgba(255, 255, 255, 0.3)',
                              backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                              boxSizing: 'border-box',
                              flexShrink: 0
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                              {plan.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {plan.description}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: isSelected ? 'var(--brand-gold)' : '#FFFFFF' }}>
                            ₹{plan.priceRupees}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            /{plan.durationDays === 7 ? 'week' : plan.durationDays === 365 ? 'year' : plan.durationDays === 90 ? '3 months' : 'month'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* OTT Value Props */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  marginBottom: '16px'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-gold)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={13} />
                  <span>ALL PLANS INCLUDE</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Check size={13} color="var(--brand-gold)" /> Full Catalog Access
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Check size={13} color="var(--brand-gold)" /> HD & 4K Playback
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Check size={13} color="var(--brand-gold)" /> Ad-Free Streaming
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Check size={13} color="var(--brand-gold)" /> Any Device Support
                  </div>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={handleProceedToPayment}
                className="btn btn-primary btn-block btn-lg"
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <Crown size={17} />
                <span>
                  Continue with {selectedPlan.name} • ₹{selectedPlan.priceRupees}
                </span>
              </button>
            </div>
          ) : (
            /* STEP 2: UPI PAYMENT & UTR SUBMISSION */
            <form onSubmit={handleSubmitUtr}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(245, 166, 35, 0.1)',
                  border: '1px solid rgba(245, 166, 35, 0.3)',
                  marginBottom: '16px'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Selected Plan:</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                    {selectedPlan.name} ({selectedPlan.durationDays} Days)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Payable Amount:</div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--brand-gold)' }}>
                    ₹{selectedPlan.priceRupees}
                  </div>
                </div>
              </div>

              {/* Dynamic QR Display */}
              <div
                style={{
                  backgroundColor: '#0A0A0F',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '14px',
                  textAlign: 'center',
                  marginBottom: '16px'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)', marginBottom: '10px' }}>
                  Scan Dynamic UPI QR Code
                </div>

                {qrLoading ? (
                  <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#9CA3AF' }}>
                    <Loader2 size={22} className="animate-spin" color="var(--brand-gold, #F5C518)" />
                    <span style={{ fontSize: '12px' }}>Generating dynamic UPI QR...</span>
                  </div>
                ) : qrCodeUrl ? (
                  <div style={{ display: 'inline-block', padding: '8px', backgroundColor: '#FFFFFF', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)' }}>
                    <img
                      src={qrCodeUrl}
                      alt={`UPI QR Code for ₹${selectedPlan.priceRupees}`}
                      style={{ width: '160px', height: '160px', display: 'block' }}
                    />
                  </div>
                ) : (
                  <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', fontSize: '12px' }}>
                    Could not generate QR code. Please use the UPI ID below.
                  </div>
                )}

                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px', marginBottom: 0 }}>
                  Scan with <strong>GPay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, or any UPI app.
                </p>
              </div>

              {/* UPI ID (Secondary / Manual Option) */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '12px',
                  marginBottom: '16px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#181824',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>UPI ID (Manual Option)</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'monospace' }}>
                      {upiConfig.upiId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '12px' }}
                  >
                    <Copy size={12} />
                    <span>Copy</span>
                  </button>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  1. Transfer <strong>₹{selectedPlan.priceRupees}</strong> to the UPI ID or QR.<br />
                  2. Copy the <strong>12-digit UTR / Reference Number</strong> from payment receipt.<br />
                  3. Enter it below and submit.
                </div>
              </div>

              {/* Guest Details if not signed in */}
              {!isAuthenticated && (
                <div style={{ marginBottom: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      style={{
                        width: '100%',
                        padding: '9px 11px',
                        fontSize: '13px',
                        backgroundColor: '#161622',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Your Email <span style={{ color: '#F87171' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      placeholder="e.g. rahul@gmail.com"
                      style={{
                        width: '100%',
                        padding: '9px 11px',
                        fontSize: '13px',
                        backgroundColor: '#161622',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* UTR Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                  UPI Reference / UTR Number <span style={{ color: '#F87171' }}>*</span>
                </label>
                <input
                  type="text"
                  value={utr}
                  onChange={e => setUtr(e.target.value)}
                  placeholder="e.g. 425689104523"
                  className="input-field"
                  maxLength={35}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                    backgroundColor: '#161622',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {errorMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(248, 113, 113, 0.15)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    color: '#F87171',
                    fontSize: '12px',
                    marginBottom: '14px'
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  disabled={submitting}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{
                    flex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={15} />
                      <span>Submit for Verification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
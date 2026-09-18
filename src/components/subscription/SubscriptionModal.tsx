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
    openAuthModal,
    isAuthenticated,
    showToast
  } = useApp();

  const [selectedPlanId, setSelectedPlanId] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [step, setStep] = useState<'choose' | 'pay'>('choose');
  const [utr, setUtr] = useState('');
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

  useEffect(() => {
    if (activeModal === 'subscription') {
      api.payments.getConfig()
        .then(cfg => {
          if (cfg) setUpiConfig(cfg);
        })
        .catch(() => {});
      setStep('choose');
      setUtr('');
      setErrorMessage(null);
    }
  }, [activeModal]);

  if (activeModal !== 'subscription') return null;

  const selectedPlan = subscriptionPlans.find(p => p.id === selectedPlanId) || subscriptionPlans[1] || subscriptionPlans[0];

  // Dynamically generate UPI QR code when reaching 'pay' step with selected plan amount
  useEffect(() => {
    if (step === 'pay' && upiConfig.upiId && selectedPlan && selectedPlan.priceRupees > 0) {
      setQrLoading(true);
      generateUpiQrDataUrl(upiConfig.upiId, selectedPlan.priceRupees, upiConfig.merchantName || 'FLOPSHOW')
        .then(url => {
          setQrCodeUrl(url);
          setQrLoading(false);
        })
        .catch(() => {
          setQrLoading(false);
        });
    }
  }, [step, upiConfig.upiId, upiConfig.merchantName, selectedPlan?.priceRupees]);

  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiConfig.upiId);
      showToast('UPI ID copied to clipboard!', 'success');
    }
  };

  const handleProceedToPayment = () => {
    if (!isAuthenticated) {
      closeSubscriptionModal();
      openAuthModal();
      return;
    }
    setStep('pay');
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr.trim()) {
      setErrorMessage('Please enter the 6-35 character UPI Transaction ID / UTR.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    const res = await submitSubscriptionRequest(selectedPlan.id, utr.trim());
    setSubmitting(false);

    if (res.success) {
      closeSubscriptionModal();
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeSubscriptionModal}>
      <div
        className="modal-dialog"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '94%',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#12121A',
          border: '1px solid rgba(245, 166, 35, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 166, 35, 0.1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 166, 35, 0.15)',
                border: '1px solid rgba(245, 166, 35, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold)'
              }}
            >
              <Crown size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
                FLOPSHOW Premium Pass
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
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
              padding: '4px'
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {/* If user already has an active subscription */}
          {activeSubscription && (
            <div
              style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <ShieldCheck size={20} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#10B981' }}>
                  You currently have an Active {activeSubscription.plan} Subscription
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Valid until {new Date(activeSubscription.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ({activeSubscription.daysRemaining} days remaining). Enjoy full streaming access!
                </div>
              </div>
            </div>
          )}

          {/* If user has a pending verification request */}
          {pendingSubscription && (
            <div
              style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: 'rgba(245, 166, 35, 0.12)',
                border: '1px solid rgba(245, 166, 35, 0.4)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <Clock size={20} color="var(--brand-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--brand-gold)' }}>
                  {pendingSubscription.plan} Subscription Payment Pending Verification
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  UTR: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{pendingSubscription.payment_reference}</strong>. Your subscription request is currently under review by an administrator. Once approved, your streaming access will activate immediately.
                </div>
              </div>
            </div>
          )}

          {step === 'choose' ? (
            /* STEP 1: CHOOSE SUBSCRIPTION PLAN */
            <div>
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Select Subscription Plan
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {subscriptionPlans.map(plan => {
                    const isSelected = selectedPlanId === plan.id;
                    const isPopular = plan.id === 'MONTHLY';

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        style={{
                          position: 'relative',
                          padding: '16px 20px',
                          borderRadius: '16px',
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
                        {isPopular && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '-10px',
                              right: '20px',
                              padding: '2px 10px',
                              borderRadius: '9999px',
                              backgroundColor: 'var(--brand-gold)',
                              color: '#0E0E12',
                              fontSize: '10px',
                              fontWeight: 800,
                              letterSpacing: '0.04em'
                            }}
                          >
                            MOST POPULAR
                          </span>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              border: isSelected ? '6px solid var(--brand-gold)' : '2px solid rgba(255, 255, 255, 0.3)',
                              backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                              boxSizing: 'border-box',
                              flexShrink: 0
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                              {plan.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {plan.description}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: isSelected ? 'var(--brand-gold)' : '#FFFFFF' }}>
                            ₹{plan.priceRupees}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            /{plan.durationDays === 7 ? 'week' : plan.durationDays === 365 ? 'year' : 'month'}
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
                  padding: '14px 16px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  marginBottom: '24px'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-gold)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} />
                  <span>ALL PLANS INCLUDE</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} color="var(--brand-gold)" /> Full Movie & Series Catalog
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} color="var(--brand-gold)" /> HD & 4K Ultra Playback
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} color="var(--brand-gold)" /> Ad-Free Streaming
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} color="var(--brand-gold)" /> Watch on Any Screen
                  </div>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={handleProceedToPayment}
                className="btn btn-primary btn-block btn-lg"
                style={{
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Crown size={18} />
                <span>
                  {isAuthenticated
                    ? `Continue with ${selectedPlan.name} • ₹${selectedPlan.priceRupees}`
                    : 'Sign In to Subscribe'}
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
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(245, 166, 35, 0.1)',
                  border: '1px solid rgba(245, 166, 35, 0.3)',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Selected Plan:</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                    {selectedPlan.name} ({selectedPlan.durationDays} Days)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Payable Amount:</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--brand-gold)' }}>
                    ₹{selectedPlan.priceRupees}
                  </div>
                </div>
              </div>

              {/* Dynamic QR Display */}
              <div
                style={{
                  backgroundColor: '#0A0A0F',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '18px',
                  textAlign: 'center',
                  marginBottom: '18px'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)', marginBottom: '12px' }}>
                  Scan Dynamic UPI QR Code
                </div>

                {qrLoading ? (
                  <div style={{ height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#9CA3AF' }}>
                    <Loader2 size={24} className="animate-spin" color="var(--brand-gold, #F5C518)" />
                    <span style={{ fontSize: '13px' }}>Generating dynamic UPI QR...</span>
                  </div>
                ) : qrCodeUrl ? (
                  <div style={{ display: 'inline-block', padding: '10px', backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)' }}>
                    <img
                      src={qrCodeUrl}
                      alt={`UPI QR Code for ₹${selectedPlan.priceRupees}`}
                      style={{ width: '180px', height: '180px', display: 'block' }}
                    />
                  </div>
                ) : (
                  <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', fontSize: '13px' }}>
                    Could not generate QR code. Please use the UPI ID below.
                  </div>
                )}

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', marginBottom: 0 }}>
                  Scan with <strong>GPay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, or any UPI app. Exact amount ₹{selectedPlan.priceRupees} is encoded.
                </p>
              </div>

              {/* UPI ID (Secondary / Manual Option) */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '14px',
                  marginBottom: '20px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#181824',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>UPI ID (Manual Option)</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'monospace' }}>
                      {upiConfig.upiId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  1. Scan the dynamic QR above or transfer <strong>₹{selectedPlan.priceRupees}</strong> to the UPI ID.<br />
                  2. Copy the <strong>12-digit UTR / UPI Reference Number</strong> from your payment confirmation.<br />
                  3. Enter it below and submit for administrator verification.
                </div>
              </div>

              {/* UTR Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
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
                    padding: '12px 14px',
                    fontSize: '15px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                    backgroundColor: '#161622',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: '#FFFFFF'
                  }}
                />
              </div>

              {errorMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(248, 113, 113, 0.15)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    color: '#F87171',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  disabled={submitting}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
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
                    gap: '8px'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
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

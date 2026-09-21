import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  Copy,
  ShieldCheck,
  Loader2,
  Film,
  ArrowRight,
  Zap
} from 'lucide-react';
import { generateUpiQrDataUrl } from '../../utils/upiQr';
import { WatchPassPlanTemplate } from '../../pages/PlansPage';

const DEFAULT_PLANS: WatchPassPlanTemplate[] = [
  {
    id: 'PASS_24H',
    plan: 'PASS_24H',
    name: '24 Hours Pass',
    durationLabel: '24 Hours',
    durationDays: 1,
    priceRupees: 19,
    maxResolution: '720p',
    downloadAllowed: false,
    maxDevices: 1,
    allowedDevicesLabel: '1 Device',
    allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'],
    description: '24 Hours Access • 720p HD • 1 Device',
    highlight: 'Quick Access',
    benefits: [
      '24 Hours Access',
      'HD 720p',
      '1 Device',
      'Unlimited eligible catalog streaming',
      'No Download'
    ]
  },
  {
    id: 'PASS_3D',
    plan: 'PASS_3D',
    name: '3 Days Pass',
    durationLabel: '3 Days',
    durationDays: 3,
    priceRupees: 29,
    maxResolution: '720p',
    downloadAllowed: false,
    maxDevices: 1,
    allowedDevicesLabel: '1 Device',
    allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'],
    description: '3 Days Access • 720p HD • 1 Device',
    highlight: 'Weekend Favorite',
    benefits: [
      '3 Days Access',
      'HD 720p',
      '1 Device',
      'No Download'
    ]
  },
  {
    id: 'PASS_7D',
    plan: 'PASS_7D',
    name: '7 Days Pass',
    durationLabel: '7 Days',
    durationDays: 7,
    priceRupees: 44,
    maxResolution: '1080p',
    downloadAllowed: true,
    maxDevices: 2,
    allowedDevicesLabel: '2 Devices (1 Tablet + 1 TV)',
    allowedDeviceTypes: ['Tablet', 'TV'],
    popular: true,
    highlight: 'Recommended',
    description: '',
    benefits: [
      '7 Days Access',
      'Full HD 1080p',
      'Download Available',
      '2 Devices',
      '1 Tablet + 1 TV'
    ]
  },
  {
    id: 'PASS_15D',
    plan: 'PASS_15D',
    name: '15 Days Pass',
    durationLabel: '15 Days',
    durationDays: 15,
    priceRupees: 69,
    maxResolution: '1080p',
    downloadAllowed: true,
    maxDevices: 3,
    allowedDevicesLabel: '3 Devices (2 Tablets + 1 TV)',
    allowedDeviceTypes: ['Tablet', 'Tablet', 'TV'],
    highlight: 'Best Value',
    description: '',
    benefits: [
      '15 Days Access',
      'Full HD 1080p',
      'Download Available',
      '3 Devices',
      '2 Tablets + 1 TV'
    ]
  }
];

export const WatchPassModal: React.FC = () => {
  const {
    activeModal,
    watchPassTarget,
    watchPassInitialPlan,
    watchPassInitialStep,
    closeWatchPassModal,
    isAuthenticated,
    openAuthModal,
    showToast,
    user
  } = useApp();

  const [plans, setPlans] = useState<WatchPassPlanTemplate[]>(DEFAULT_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D'>('PASS_7D');
  const [step, setStep] = useState<'choose' | 'pay'>(watchPassInitialStep || 'choose');
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

  const selectedPlan = plans.find(p => p.plan === selectedPlanId) || plans[2] || DEFAULT_PLANS[2];

  useEffect(() => {
    if (activeModal === 'watchpass') {
      if (watchPassInitialPlan) {
        setSelectedPlanId(watchPassInitialPlan);
      }
      api.payments.getConfig()
        .then(cfg => {
          if (cfg?.upiId) setUpiConfig(cfg);
        })
        .catch(() => {});

      api.watchPasses.getPlans()
        .then(res => {
          if (res?.plans && Array.isArray(res.plans) && res.plans.length > 0) {
            setPlans(res.plans as WatchPassPlanTemplate[]);
          }
        })
        .catch(() => {});

      setStep(watchPassInitialStep || 'choose');
      setUtr('');
      setErrorMessage(null);
    }
  }, [activeModal, watchPassInitialPlan, watchPassInitialStep]);

  // Dynamically generate UPI QR code when reaching 'pay' step with selected pass amount
  useEffect(() => {
    let isCancelled = false;
    if (step === 'pay' && selectedPlan) {
      const upi = upiConfig?.upiId || 'flopshow@upi';
      const merchant = upiConfig?.merchantName || 'FLOPSHOW';
      const price = Number(selectedPlan.priceRupees) || 44;

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

  if (activeModal !== 'watchpass') return null;

  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiConfig.upiId || 'flopshow@upi');
      showToast('UPI ID copied to clipboard!', 'success');
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      closeWatchPassModal();
      openAuthModal();
      return;
    }

    const clean = utr.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!clean || clean.length < 6 || clean.length > 35) {
      setErrorMessage('Please enter a valid 6-35 character alphanumeric UPI UTR / Transaction ID.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.watchPasses.submitRequest({
        contentId: watchPassTarget?.id || null,
        plan: selectedPlanId,
        utr: clean,
        userName: user?.name,
        userEmail: user?.email,
      });

      if (res?.success) {
        showToast('Watch Pass request submitted! Catalog-wide access will activate upon admin approval.', 'success');
        closeWatchPassModal();
      } else {
        setErrorMessage(res?.message || 'Failed to submit Watch Pass request.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment submission failed. Please verify your UTR.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 2500,
        backgroundColor: 'rgba(5, 5, 8, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={closeWatchPassModal}
    >
      <div
        className="modal-dialog"
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '24px',
          border: '1.5px solid rgba(245, 197, 24, 0.35)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 197, 24, 0.12)',
          maxWidth: '560px',
          width: '100%',
          maxHeight: 'min(92vh, 92dvh)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          padding: '24px 20px',
          paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 20px))',
          margin: 'auto 0',
          position: 'relative',
          color: '#FFFFFF'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeWatchPassModal}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9CA3AF',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <X size={18} />
        </button>

        {/* Content Title Chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 197, 24, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold, #F5C518)',
              flexShrink: 0
            }}
          >
            {watchPassTarget ? <Film size={18} /> : <Zap size={18} />}
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {watchPassTarget ? 'Watch Pass Target' : 'Catalog-Wide Access'}
            </span>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
              {watchPassTarget ? watchPassTarget.title : 'Unlimited Catalog Watch Pass'}
            </div>
          </div>
        </div>

        {/* Catalog-wide notice */}
        <div
          style={{
            backgroundColor: 'rgba(245, 197, 24, 0.08)',
            border: '1px solid rgba(245, 197, 24, 0.2)',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#FDE047',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px'
          }}
        >
          <Zap size={14} style={{ flexShrink: 0 }} />
          <span>This pass unlocks unlimited streaming of all eligible titles across the entire catalog during its active validity.</span>
        </div>

        {/* STEP 1: CHOOSE PLAN DURATION */}
        {step === 'choose' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: '#FFFFFF' }}>
              Select Pass Duration
            </h2>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 16px', lineHeight: 1.5 }}>
              Choose your temporary access duration. Access activates immediately upon admin verification.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
              {plans.map(p => {
                const isSelected = selectedPlanId === p.plan;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.plan as any)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '14px',
                      backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '2px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: isSelected ? '5px solid var(--brand-gold, #F5C518)' : '2px solid #6B7280',
                          backgroundColor: '#0E0E12',
                          flexShrink: 0
                        }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? 'var(--brand-gold, #F5C518)' : '#FFFFFF' }}>
                            {p.name}
                          </span>
                          {p.popular && (
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--brand-gold, #F5C518)', color: '#0E0E12', textTransform: 'uppercase' }}>
                              Recommended
                            </span>
                          )}
                          {p.highlight && !p.popular && (
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#D1D5DB' }}>
                              {p.highlight}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                          {p.allowedDevicesLabel ? `${p.allowedDevicesLabel} • ${p.maxResolution || '720p'}` : p.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#FFFFFF' }}>
                        ₹{p.priceRupees}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                        {p.maxResolution || (p.durationDays >= 7 ? '1080p' : '720p')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                if (!isAuthenticated) {
                  closeWatchPassModal();
                  openAuthModal();
                  return;
                }
                setStep('pay');
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                color: '#0E0E12',
                fontWeight: 800,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>Continue to UPI Payment (₹{selectedPlan.priceRupees})</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: MANUAL UPI PAYMENT + QR + UTR SUBMISSION */}
        {step === 'pay' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                Scan QR or Pay via UPI
              </h2>
              <button
                onClick={() => setStep('choose')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-gold, #F5C518)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Change Plan
              </button>
            </div>

            {/* Selected Plan Summary Banner */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                  {selectedPlan.name} ({selectedPlan.durationLabel})
                </span>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Unlimited catalog access • {selectedPlan.maxResolution || (selectedPlan.durationDays >= 7 ? '1080p Full HD' : '720p HD')}
                </div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)' }}>
                ₹{selectedPlan.priceRupees}
              </div>
            </div>

            {/* Dynamic QR Code */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '14px',
                width: '180px',
                height: '180px',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
              }}
            >
              {qrLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#0E0E12' }}>
                  <Loader2 size={24} className="animate-spin" />
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>Generating QR...</span>
                </div>
              ) : qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`Pay ₹${selectedPlan.priceRupees} via UPI`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '12px', color: '#000000', textAlign: 'center' }}>
                  Scan UPI QR for ₹{selectedPlan.priceRupees}
                </span>
              )}
            </div>

            {/* UPI ID Copy Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '16px'
              }}
            >
              <div>
                <span style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  FLOPSHOW Official UPI ID
                </span>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em' }}>
                  {upiConfig.upiId}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyUpi}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(245, 197, 24, 0.15)',
                  border: '1px solid rgba(245, 197, 24, 0.3)',
                  color: 'var(--brand-gold, #F5C518)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Copy size={13} />
                <span>Copy</span>
              </button>
            </div>

            {/* UTR Submission Form */}
            <form onSubmit={handleSubmitUtr}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  12-Digit UPI Ref ID / UTR Number
                </label>
                <input
                  type="text"
                  value={utr}
                  onChange={e => setUtr(e.target.value)}
                  placeholder="e.g. 428901234567"
                  required
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {errorMessage && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', fontSize: '12px', marginBottom: '14px' }}>
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--brand-gold, #F5C518)',
                  color: '#0E0E12',
                  fontWeight: 800,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Submitting UTR...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Submit UTR for Verification</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

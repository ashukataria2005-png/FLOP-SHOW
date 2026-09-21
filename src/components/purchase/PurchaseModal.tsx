import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  CheckCircle,
  ArrowRight,
  Film,
  Tv,
  Copy,
  Check,
  Clock,
  Loader2,
  ShieldCheck,
  Tag,
  Gift,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { generateUpiQrDataUrl } from '../../utils/upiQr';

export const PurchaseModal: React.FC = () => {
  const {
    activeModal,
    purchaseTarget,
    closePurchaseModal,
    syncPurchases,
    openAuthModal,
    startPlaying,
    isAuthenticated,
    showToast,
    user
  } = useApp();

  const [purchasedSuccess, setPurchasedSuccess] = useState(false);
  const [submittedPending, setSubmittedPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [utr, setUtr] = useState('');
  const [copied, setCopied] = useState(false);

  // Promo code & discount state
  const [promoInput, setPromoInput] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent: number;
    discountAmount: number;
    finalAmount: number;
    isFreePass?: boolean;
  } | null>(null);
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // UPI payment config
  const [upiConfig, setUpiConfig] = useState<{ upiId: string; merchantName: string; upiEnabled: boolean; approvalMode?: string }>({
    upiId: 'flopshow@upi',
    merchantName: 'FLOPSHOW',
    upiEnabled: true,
    approvalMode: 'MANUAL'
  });

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(false);

  // Fetch UPI config whenever modal opens
  useEffect(() => {
    if (activeModal === 'purchase' && purchaseTarget) {
      api.payments.getConfig()
        .then(cfg => {
          if (cfg?.upiId) setUpiConfig(cfg);
        })
        .catch(() => {});

      setPurchasedSuccess(false);
      setSubmittedPending(false);
      setErrorMessage(null);
      setUtr('');
      setPromoInput('');
      setAppliedPromo(null);
      setPromoMessage(null);
    }
  }, [activeModal, purchaseTarget?.id]);

  // Determine uniform title price: custom override if present, else type default (₹30 movie, ₹35 series)
  const defaultPrice = purchaseTarget?.type === 'series' ? 35 : 30;
  const price = (typeof purchaseTarget?.price === 'number' && purchaseTarget.price > 0)
    ? purchaseTarget.price
    : defaultPrice;

  const finalPrice = appliedPromo ? appliedPromo.finalAmount : price;

  // Generate dynamic QR code for title price
  useEffect(() => {
    let isCancelled = false;
    if (activeModal === 'purchase' && purchaseTarget && finalPrice > 0) {
      const upi = upiConfig?.upiId || 'flopshow@upi';
      const merchant = upiConfig?.merchantName || 'FLOPSHOW';

      setQrLoading(true);
      generateUpiQrDataUrl(upi, finalPrice, merchant)
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
  }, [activeModal, purchaseTarget?.id, finalPrice, upiConfig?.upiId, upiConfig?.merchantName]);

  if (activeModal !== 'purchase' || !purchaseTarget) return null;

  const handleApplyPromo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = promoInput.trim().toUpperCase();
    if (!cleanCode) {
      setPromoMessage({ text: 'Please enter a promo code.', type: 'error' });
      return;
    }
    try {
      setValidatingPromo(true);
      setPromoMessage(null);
      const res = await api.promos.validate(cleanCode, price);
      if (res.valid) {
        setAppliedPromo({
          code: res.code,
          discountPercent: res.discountPercent,
          discountAmount: res.discountAmountRupees,
          finalAmount: res.finalAmountRupees,
          isFreePass: res.isFreePass
        });
        setPromoMessage({
          text: res.isFreePass
            ? `Code "${res.code}" applied! 100% Free Access Pass.`
            : `Code "${res.code}" applied! ${res.discountPercent}% discount saved ₹${res.discountAmountRupees}.`,
          type: 'success'
        });
      } else {
        setPromoMessage({ text: res.message || 'Invalid promo code.', type: 'error' });
      }
    } catch (err: any) {
      setPromoMessage({ text: err.message || 'Failed to validate promo code.', type: 'error' });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoMessage(null);
  };

  const handleClaimFreeUnlock = async () => {
    if (!isAuthenticated) {
      handleClose();
      openAuthModal();
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.promos.redeem(appliedPromo!.code, purchaseTarget.id);
      await syncPurchases();
      setPurchasedSuccess(true);
      showToast(res.message || 'Title unlocked successfully with promo code!', 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to unlock title with promo code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiConfig.upiId || 'flopshow@upi');
      setCopied(true);
      showToast('UPI ID copied to clipboard!', 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Pay directly with UPI QR & UTR submission
  const handleSubmitUpiUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      handleClose();
      openAuthModal();
      return;
    }

    const cleanUtr = utr.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanUtr || cleanUtr.length < 6 || cleanUtr.length > 35) {
      setErrorMessage('Please enter a valid 6-35 character alphanumeric UPI UTR / Transaction ID.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.payments.submitRequest(finalPrice, cleanUtr, user?.name, user?.email, purchaseTarget.id);
      if (res?.payment?.status === 'APPROVED') {
        // Automatic Approval mode: title entitlement is active in backend
        await syncPurchases();
        setPurchasedSuccess(true);
      } else {
        // Manual verification mode: pending admin review
        setSubmittedPending(true);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Payment submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPurchasedSuccess(false);
    setSubmittedPending(false);
    setErrorMessage(null);
    setUtr('');
    closePurchaseModal();
  };

  const handleWatchNow = () => {
    const item = purchaseTarget;
    handleClose();
    startPlaying(item, undefined, true);
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--brand-gold)' }}>
              {purchaseTarget.type === 'movie' ? <Film size={20} /> : <Tv size={20} />}
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
              {purchasedSuccess
                ? 'Ownership Confirmed'
                : submittedPending
                ? 'Payment Under Review'
                : `Unlock ${purchaseTarget.type === 'series' ? 'Series' : 'Movie'} for 1 Month`}
            </h3>
          </div>

          <button
            onClick={handleClose}
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {purchasedSuccess ? (
            /* Success State */
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1.5px solid #10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#10B981'
                }}
              >
                <CheckCircle size={36} />
              </div>

              <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                You now own this title!
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                "{purchaseTarget.title}" is active in your library for 1 Month. Enjoy 1080p Full HD playback and offline downloads.
              </p>

              <button
                onClick={handleWatchNow}
                className="btn btn-primary btn-block btn-lg"
              >
                <span>Watch now</span>
                <ArrowRight size={18} />
              </button>
            </div>
          ) : submittedPending ? (
            /* Pending State */
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 197, 24, 0.12)',
                  border: '1.5px solid var(--brand-gold, #F5C518)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: 'var(--brand-gold, #F5C518)'
                }}
              >
                <Clock size={36} />
              </div>

              <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                Payment Submitted
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                Your payment reference has been recorded. Your 1-Month ownership of "{purchaseTarget.title}" will activate as soon as the administrator verifies your UTR.
              </p>

              <button onClick={handleClose} className="btn btn-primary btn-block btn-lg">
                <span>Done</span>
              </button>
            </div>
          ) : (
            /* Purchase Screen with direct UPI QR + UTR */
            <div>
              {/* Content Pill Summary */}
              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  marginBottom: '16px'
                }}
              >
                <img
                  src={purchaseTarget.posterUrl}
                  alt={purchaseTarget.title}
                  style={{
                    width: '56px',
                    height: '84px',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--brand-gold)',
                      textTransform: 'uppercase'
                    }}
                  >
                    {purchaseTarget.type === 'movie' ? 'Movie Ownership' : 'Web Series Ownership'}
                  </span>
                  <h4
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {purchaseTarget.title}
                  </h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Validity: 1 Month • 1080p Full HD • Downloads Available
                  </div>
                </div>
              </div>

              {/* PROMO / DISCOUNT COUPON INPUT BOX (Requirement 3) */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: appliedPromo ? '8px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#D1D5DB' }}>
                    <Tag size={14} color="var(--brand-gold, #F5C518)" />
                    <span>Have a Promo or Discount Code?</span>
                  </div>
                  {appliedPromo && (
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      style={{ background: 'none', border: 'none', color: '#F87171', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {!appliedPromo ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      value={promoInput}
                      onChange={e => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE (e.g. DISCOUNT20)"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.04em'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={validatingPromo}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--brand-gold, #F5C518)',
                        color: '#0A0A0F',
                        fontSize: '12px',
                        fontWeight: 800,
                        border: 'none',
                        cursor: validatingPromo ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {validatingPromo ? 'Validating...' : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#34D399', fontWeight: 700, marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={14} />
                      <span>
                        Promo <strong>{appliedPromo.code}</strong> Applied ({appliedPromo.discountPercent}% OFF)
                      </span>
                    </div>
                    <span>-₹{appliedPromo.discountAmount}</span>
                  </div>
                )}

                {promoMessage && (
                  <div style={{ fontSize: '11.5px', marginTop: '6px', color: promoMessage.type === 'success' ? '#34D399' : '#F87171' }}>
                    {promoMessage.text}
                  </div>
                )}
              </div>

              {errorMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    color: '#F87171',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}
                >
                  {errorMessage}
                </div>
              )}

              {/* FREE PASS / 100% DISCOUNT STATE */}
              {finalPrice === 0 ? (
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '14px',
                    padding: '20px',
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}
                >
                  <Gift size={32} color="#10B981" style={{ margin: '0 auto 10px' }} />
                  <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
                    100% Free Access Available!
                  </h4>
                  <p style={{ fontSize: '12.5px', color: '#D1D5DB', margin: '0 0 16px', lineHeight: 1.45 }}>
                    Your promo code gives you completely free streaming access for 30 days without any payment.
                  </p>
                  <button
                    type="button"
                    onClick={handleClaimFreeUnlock}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '8px',
                      backgroundColor: '#10B981',
                      color: '#0A0A0F',
                      fontSize: '14px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    {isSubmitting ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                    <span>{isSubmitting ? 'Unlocking Content...' : 'Claim Free Access & Watch Now'}</span>
                  </button>
                </div>
              ) : (
                /* UPI QR CODE & UTR SUBMISSION */
                <form onSubmit={handleSubmitUpiUtr}>
                  <div
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '14px',
                      padding: '16px',
                      textAlign: 'center',
                      marginBottom: '16px'
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
                      Scan QR code with Google Pay, PhonePe, Paytm, or BHIM
                    </div>

                    <div
                      style={{
                        width: '180px',
                        height: '180px',
                        margin: '0 auto 12px',
                        backgroundColor: '#FFFFFF',
                        padding: '10px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                      }}
                    >
                      {qrLoading ? (
                        <Loader2 size={32} className="animate-spin" color="#000000" />
                      ) : qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="UPI QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '12px', color: '#666' }}>Generating QR...</span>
                      )}
                    </div>

                    {/* Amount & UPI ID Copy */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: '#9CA3AF' }}>UPI ID:</span>
                      <code style={{ fontSize: '13px', color: 'var(--brand-gold, #F5C518)', fontWeight: 800 }}>
                        {upiConfig.upiId}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copied ? '#10B981' : 'var(--brand-gold)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          padding: '4px'
                        }}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 800 }}>
                      {appliedPromo && (
                        <span style={{ color: '#9CA3AF', textDecoration: 'line-through', fontSize: '13px' }}>
                          ₹{price}
                        </span>
                      )}
                      <span style={{ color: '#FFFFFF' }}>Amount to Pay:</span>
                      <span style={{ color: 'var(--brand-gold, #F5C518)', fontSize: '16px' }}>₹{finalPrice}</span>
                      {appliedPromo && (
                        <span style={{ fontSize: '11px', color: '#34D399', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                          {appliedPromo.discountPercent}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  {/* UTR Input */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D1D5DB', marginBottom: '6px' }}>
                      Enter 12-Digit UPI UTR / Transaction ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 425619882314"
                      value={utr}
                      onChange={e => setUtr(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        fontSize: '14px',
                        color: '#FFFFFF',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={handleClose} className="btn btn-secondary" style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 2 }}>
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      <span>{isSubmitting ? 'Verifying...' : `Submit UTR & Unlock (₹${finalPrice})`}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

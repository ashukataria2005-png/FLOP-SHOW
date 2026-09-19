import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  CheckCircle,
  Wallet,
  ArrowRight,
  Film,
  Tv,
  QrCode,
  Copy,
  Check,
  Clock,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { generateUpiQrDataUrl } from '../../utils/upiQr';

export const PurchaseModal: React.FC = () => {
  const {
    activeModal,
    purchaseTarget,
    closePurchaseModal,
    walletBalance,
    buyContent,
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
  const [liveBalance, setLiveBalance] = useState<number>(walletBalance);

  // Pay method: 'UPI' (direct QR + UTR) or 'WALLET'
  const [payMethod, setPayMethod] = useState<'UPI' | 'WALLET'>('UPI');
  const [utr, setUtr] = useState('');
  const [copied, setCopied] = useState(false);

  // UPI payment config
  const [upiConfig, setUpiConfig] = useState<{ upiId: string; merchantName: string; upiEnabled: boolean; approvalMode?: string }>({
    upiId: 'flopshow@upi',
    merchantName: 'FLOPSHOW',
    upiEnabled: true,
    approvalMode: 'MANUAL'
  });

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(false);

  // Fetch balance and config whenever modal opens
  useEffect(() => {
    if (activeModal === 'purchase' && purchaseTarget) {
      const defaultPrice = purchaseTarget.type === 'series' ? 35 : 30;
      const targetPrice = (typeof purchaseTarget.price === 'number' && purchaseTarget.price >= 10)
        ? purchaseTarget.price
        : defaultPrice;

      if (isAuthenticated) {
        setLiveBalance(walletBalance);
        api.wallet.getBalance()
          .then(res => {
            if (typeof res.balanceRupees === 'number') {
              setLiveBalance(res.balanceRupees);
              if (res.balanceRupees >= targetPrice) {
                setPayMethod('WALLET');
              } else {
                setPayMethod('UPI');
              }
            }
          })
          .catch(() => {
            setLiveBalance(walletBalance);
          });
      } else {
        setPayMethod('UPI');
      }

      api.payments.getConfig()
        .then(cfg => {
          if (cfg?.upiId) setUpiConfig(cfg);
        })
        .catch(() => {});

      setPurchasedSuccess(false);
      setSubmittedPending(false);
      setErrorMessage(null);
      setUtr('');
    }
  }, [activeModal, purchaseTarget?.id, isAuthenticated]);

  // Generate dynamic QR code for title price
  useEffect(() => {
    let isCancelled = false;
    if (activeModal === 'purchase' && purchaseTarget && payMethod === 'UPI') {
      const upi = upiConfig?.upiId || 'flopshow@upi';
      const merchant = upiConfig?.merchantName || 'FLOPSHOW';
      const defaultPrice = purchaseTarget.type === 'series' ? 35 : 30;
      const priceToCharge = (typeof purchaseTarget.price === 'number' && purchaseTarget.price >= 10)
        ? purchaseTarget.price
        : defaultPrice;

      setQrLoading(true);
      generateUpiQrDataUrl(upi, priceToCharge, merchant)
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
  }, [activeModal, purchaseTarget?.price, purchaseTarget?.type, payMethod, upiConfig?.upiId, upiConfig?.merchantName]);

  if (activeModal !== 'purchase' || !purchaseTarget) return null;

  const hybridPrice = purchaseTarget.type === 'series' ? 35 : 30;
  const price = (typeof purchaseTarget.price === 'number' && purchaseTarget.price >= 10)
    ? purchaseTarget.price
    : hybridPrice;
  const hasSufficientBalance = liveBalance >= price;

  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiConfig.upiId || 'flopshow@upi');
      setCopied(true);
      showToast('UPI ID copied to clipboard!', 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 1. Pay with wallet
  const handleConfirmWallet = async () => {
    if (isSubmitting || !purchaseTarget) return;

    if (!isAuthenticated) {
      handleClose();
      openAuthModal();
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await buyContent(purchaseTarget);
      if (result.success) {
        setPurchasedSuccess(true);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Purchase transaction failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Pay directly with UPI QR & UTR
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
      const res = await api.payments.submitRequest(price, cleanUtr, user?.name, user?.email, purchaseTarget.id);
      if (res?.payment?.status === 'APPROVED') {
        // Automatic Approval mode: title entitlement is active in backend
        await syncPurchases();
        setPurchasedSuccess(true);
      } else {
        // Manual verification mode: pending review
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
            /* Purchase Screen with UPI QR + UTR / Wallet */
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

              {/* Payment Method Switcher Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  padding: '4px',
                  borderRadius: '10px',
                  marginBottom: '18px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setPayMethod('UPI')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: payMethod === 'UPI' ? 800 : 500,
                    backgroundColor: payMethod === 'UPI' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                    color: payMethod === 'UPI' ? '#000000' : '#9CA3AF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <QrCode size={15} />
                  <span>UPI QR &amp; UTR (₹{price})</span>
                </button>

                {hasSufficientBalance && (
                  <button
                    type="button"
                    onClick={() => setPayMethod('WALLET')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: payMethod === 'WALLET' ? 800 : 500,
                      backgroundColor: payMethod === 'WALLET' ? 'var(--brand-gold, #F5C518)' : 'transparent',
                      color: payMethod === 'WALLET' ? '#000000' : '#9CA3AF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Wallet size={15} />
                    <span>Wallet (Bal: ₹{liveBalance})</span>
                  </button>
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

              {/* TAB 1: UPI QR CODE & UTR SUBMISSION */}
              {payMethod === 'UPI' && (
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

                    <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                      Amount to Pay: <span style={{ color: 'var(--brand-gold, #F5C518)' }}>₹{price}</span>
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
                      <span>{isSubmitting ? 'Verifying...' : `Submit UTR & Unlock (₹${price})`}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: PAY WITH WALLET */}
              {payMethod === 'WALLET' && (
                <div>
                  <div
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      marginBottom: '20px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Content Price:</span>
                      <span style={{ fontWeight: 700, color: 'var(--brand-gold)' }}>₹{price}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Current Wallet Balance:</span>
                      <span style={{ fontWeight: 600, color: '#FFFFFF' }}>₹{liveBalance}</span>
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span style={{ color: '#FFFFFF', fontWeight: 600 }}>Balance After Purchase:</span>
                      <span style={{ fontWeight: 800, color: '#10B981' }}>
                        ₹{liveBalance - price}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleClose} disabled={isSubmitting} className="btn btn-secondary" style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button onClick={handleConfirmWallet} disabled={isSubmitting} className="btn btn-primary" style={{ flex: 2 }}>
                      {isSubmitting ? 'Processing...' : `Confirm Purchase (₹${price})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

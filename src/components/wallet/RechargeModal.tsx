import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { generateUpiQrDataUrl } from '../../utils/upiQr';
import {
  X,
  Wallet,
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';

type Step = 'SELECT_AMOUNT' | 'UPI_PAYMENT' | 'SUBMITTED';

export const RechargeModal: React.FC = () => {
  const { activeModal, closeRechargeModal, walletBalance, user, showToast } = useApp();

  const [step, setStep] = useState<Step>('SELECT_AMOUNT');
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [utr, setUtr] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedPayment, setSubmittedPayment] = useState<any>(null);

  // Config State from Backend
  const [upiId, setUpiId] = useState<string>('flopshow@upi');
  const [upiEnabled, setUpiEnabled] = useState<boolean>(true);
  const [merchantName, setMerchantName] = useState<string>('FLOPSHOW');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(false);

  const quickAmounts = [50, 100, 200, 500, 1000];

  // Fetch active payment config whenever modal opens
  useEffect(() => {
    if (activeModal === 'recharge') {
      api.payments.getConfig()
        .then(cfg => {
          if (cfg) {
            setUpiId(cfg.upiId || 'flopshow@upi');
            setUpiEnabled(cfg.upiEnabled !== false);
            setMerchantName(cfg.merchantName || 'FLOPSHOW');
          }
        })
        .catch(() => {
          // Keep defaults
        });
    }
  }, [activeModal]);

  const activeAmount = customAmount ? parseInt(customAmount, 10) || 0 : selectedAmount;

  // Generate dynamic QR whenever activeAmount or upiId changes in UPI_PAYMENT step
  useEffect(() => {
    if (step === 'UPI_PAYMENT' && upiId && activeAmount > 0) {
      setQrLoading(true);
      generateUpiQrDataUrl(upiId, activeAmount, merchantName)
        .then(url => {
          setQrCodeUrl(url);
          setQrLoading(false);
        })
        .catch(() => {
          setQrLoading(false);
        });
    }
  }, [step, activeAmount, upiId, merchantName]);

  if (activeModal !== 'recharge') return null;

  const handleAmountSelect = (amt: number) => {
    setSelectedAmount(amt);
    setCustomAmount('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(val);
    if (val) {
      setSelectedAmount(parseInt(val, 10));
    }
  };

  const handleCopyUpi = () => {
    if (navigator.clipboard && upiId) {
      navigator.clipboard.writeText(upiId);
      setCopied(true);
      showToast('UPI ID copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClose = () => {
    setStep('SELECT_AMOUNT');
    setCustomAmount('');
    setUtr('');
    setSubmittedPayment(null);
    closeRechargeModal();
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utr.trim().replace(/[^a-zA-Z0-9]/g, '');

    if (!cleanUtr || cleanUtr.length < 6) {
      showToast('Please enter a valid UTR / Transaction ID (min 6 characters).', 'error');
      return;
    }

    if (activeAmount < 10) {
      showToast('Minimum recharge amount is ₹10.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.payments.submitRequest(
        activeAmount,
        cleanUtr,
        user.name,
        user.email
      );

      if (res.success && res.payment) {
        setSubmittedPayment(res.payment);
        setStep('SUBMITTED');
        showToast('Payment request submitted for verification!', 'success');
      } else {
        throw new Error(res.message || 'Submission failed');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit payment request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-dialog"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: step === 'UPI_PAYMENT' ? '520px' : '460px', transition: 'max-width 0.2s ease' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {step === 'UPI_PAYMENT' ? (
              <button
                type="button"
                onClick={() => setStep('SELECT_AMOUNT')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-gold, #F5C518)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '6px'
                }}
                title="Change amount"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <Wallet size={20} color="var(--brand-gold, #F5C518)" />
            )}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
                {step === 'SELECT_AMOUNT' && 'Add Funds to Wallet'}
                {step === 'UPI_PAYMENT' && 'FLOPSHOW UPI Payment'}
                {step === 'SUBMITTED' && 'Payment Request Submitted'}
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {step === 'SELECT_AMOUNT' && 'Instant Pay-Per-Content Wallet'}
                {step === 'UPI_PAYMENT' && 'Scan & Pay with any UPI App'}
                {step === 'SUBMITTED' && 'Admin Verification in Progress'}
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px 24px 24px' }}>
          {/* ============================================================ */}
          {/* STEP 1: SELECT AMOUNT */}
          {/* ============================================================ */}
          {step === 'SELECT_AMOUNT' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Current Balance</span>
                <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', marginTop: '2px' }}>
                  ₹{walletBalance.toFixed(2)}
                </div>
              </div>

              {!upiEnabled && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#F87171',
                    fontSize: '13px'
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>UPI recharges are temporarily paused by administration. Please check back shortly.</span>
                </div>
              )}

              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Select Recharge Amount
              </label>

              {/* Quick Amounts Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAmountSelect(amt)}
                    style={{
                      padding: '12px 4px',
                      borderRadius: '12px',
                      backgroundColor: !customAmount && selectedAmount === amt ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.05)',
                      color: !customAmount && selectedAmount === amt ? '#0E0E12' : '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '14px',
                      border: `1px solid ${!customAmount && selectedAmount === amt ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.1)'}`,
                      transition: 'all 0.15s ease',
                      cursor: 'pointer'
                    }}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '0 16px',
                    height: '46px'
                  }}
                >
                  <span style={{ color: 'var(--brand-gold, #F5C518)', fontWeight: 700, fontSize: '16px', marginRight: '6px' }}>
                    ₹
                  </span>
                  <input
                    type="text"
                    placeholder="Or enter custom amount"
                    value={customAmount}
                    onChange={handleCustomChange}
                    style={{
                      width: '100%',
                      fontSize: '14px',
                      color: '#FFFFFF',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none'
                    }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px', paddingLeft: '4px' }}>
                  Min ₹10 • Max ₹10,000 per recharge
                </span>
              </div>

              {/* Notice */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'rgba(245, 197, 24, 0.08)',
                  border: '1px solid rgba(245, 197, 24, 0.2)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '20px'
                }}
              >
                <ShieldCheck size={18} color="var(--brand-gold, #F5C518)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Scan the dynamic QR with any UPI app (GPay, PhonePe, Paytm, BHIM), then submit your UTR to credit your wallet.
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleClose} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  onClick={() => setStep('UPI_PAYMENT')}
                  disabled={activeAmount < 10 || !upiEnabled}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  <QrCode size={16} />
                  <span>Pay ₹{activeAmount} via UPI</span>
                </button>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* STEP 2: DYNAMIC UPI QR & UTR SUBMISSION */}
          {/* ============================================================ */}
          {step === 'UPI_PAYMENT' && (
            <form onSubmit={handleSubmitPayment}>
              {/* Amount Banner */}
              <div
                style={{
                  backgroundColor: 'rgba(245, 197, 24, 0.08)',
                  border: '1.5px solid rgba(245, 197, 24, 0.3)',
                  borderRadius: '14px',
                  padding: '12px 18px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Recharge Amount
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)' }}>
                    ₹{activeAmount}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    ● Dynamic QR Ready
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Exact ₹{activeAmount} encoded
                  </div>
                </div>
              </div>

              {/* Dynamic QR Display */}
              <div
                style={{
                  backgroundColor: '#0A0A0F',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '16px',
                  textAlign: 'center',
                  marginBottom: '16px'
                }}
              >
                {qrLoading ? (
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#9CA3AF' }}>
                    <Loader2 size={24} className="animate-spin" color="var(--brand-gold, #F5C518)" />
                    <span>Generating dynamic UPI QR...</span>
                  </div>
                ) : qrCodeUrl ? (
                  <div style={{ display: 'inline-block', padding: '10px', backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)' }}>
                    <img
                      src={qrCodeUrl}
                      alt={`UPI QR Code for ₹${activeAmount}`}
                      style={{ width: '190px', height: '190px', display: 'block' }}
                    />
                  </div>
                ) : (
                  <div style={{ height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                    Could not generate QR code. Please use the UPI ID below.
                  </div>
                )}

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px', marginBottom: 0 }}>
                  Scan this QR using <strong>GPay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, or any UPI app.
                </p>
              </div>

              {/* UPI ID with Copy Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  marginBottom: '16px'
                }}
              >
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                    UPI ID
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                    {upiId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: copied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
                    color: copied ? '#10B981' : 'var(--brand-gold, #F5C518)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy UPI ID'}</span>
                </button>
              </div>

              {/* UTR Input Section */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '6px' }}>
                  Enter UTR / Transaction ID <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789012 (found in your UPI app receipt)"
                  value={utr}
                  onChange={e => setUtr(e.target.value.toUpperCase())}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: '0.04em'
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Enter the 12-digit reference or transaction number from your payment confirmation.
                </span>
              </div>

              {/* Verification Notice */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                  marginBottom: '18px'
                }}
              >
                Payment is manually verified. Wallet balance will be credited after admin approval.
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStep('SELECT_AMOUNT')}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || utr.trim().length < 6}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Submit Payment (₹{activeAmount})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* STEP 3: SUBMISSION CONFIRMATION */}
          {/* ============================================================ */}
          {step === 'SUBMITTED' && submittedPayment && (
            <div style={{ textAlign: 'center', padding: '12px 8px 8px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 197, 24, 0.15)',
                  border: '2px solid rgba(245, 197, 24, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <Clock size={30} color="var(--brand-gold, #F5C518)" />
              </div>

              <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                Payment Request Submitted!
              </h4>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(245, 197, 24, 0.15)',
                  border: '1px solid rgba(245, 197, 24, 0.3)',
                  color: 'var(--brand-gold, #F5C518)',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '16px'
                }}
              >
                ● PENDING ADMIN VERIFICATION
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                Your payment request has been received. Our team will verify the UTR and credit ₹{(submittedPayment.amount / 100).toFixed(0)} to your wallet shortly.
              </p>

              {/* Receipt Box */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount:</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)' }}>
                    ₹{(submittedPayment.amount / 100).toFixed(0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Submitted UTR:</span>
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: '#FFFFFF' }}>
                    {submittedPayment.utr}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Request ID:</span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#9CA3AF' }}>
                    {submittedPayment.id}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date:</span>
                  <span style={{ fontSize: '12px', color: '#E0E0E0' }}>
                    {new Date(submittedPayment.submitted_at || Date.now()).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

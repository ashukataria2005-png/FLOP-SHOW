import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, CheckCircle, AlertCircle, Wallet, ArrowRight, Film, Tv } from 'lucide-react';

export const PurchaseModal: React.FC = () => {
  const {
    activeModal,
    purchaseTarget,
    closePurchaseModal,
    walletBalance,
    buyContent,
    openRechargeModal,
    startPlaying
  } = useApp();

  const [purchasedSuccess, setPurchasedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (activeModal !== 'purchase' || !purchaseTarget) return null;

  const price = purchaseTarget.price;
  const hasSufficientBalance = walletBalance >= price;
  const remainingBalance = walletBalance - price;

  const handleConfirm = () => {
    setErrorMessage(null);
    const result = buyContent(purchaseTarget);
    if (result.success) {
      setPurchasedSuccess(true);
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleClose = () => {
    setPurchasedSuccess(false);
    setErrorMessage(null);
    closePurchaseModal();
  };

  const handleWatchNow = () => {
    const item = purchaseTarget;
    handleClose();
    startPlaying(item);
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--brand-gold)' }}>
              {purchaseTarget.type === 'movie' ? <Film size={20} /> : <Tv size={20} />}
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
              {purchasedSuccess ? 'Purchase Confirmed' : 'Unlock Content'}
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
                  border: '1.5px solid var(--badge-owned-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: 'var(--badge-owned-bg)'
                }}
              >
                <CheckCircle size={36} />
              </div>

              <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                You now own this title!
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                "{purchaseTarget.title}" has been added to your permanent library. You can stream it anytime on any device.
              </p>

              <button
                onClick={handleWatchNow}
                className="btn btn-primary btn-block btn-lg"
              >
                <span>Watch now</span>
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            /* Purchase Details */
            <div>
              {/* Content Summary Pill */}
              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  marginBottom: '20px'
                }}
              >
                <img
                  src={purchaseTarget.posterUrl}
                  alt={purchaseTarget.title}
                  style={{
                    width: '60px',
                    height: '90px',
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
                    {purchaseTarget.type === 'movie' ? 'Feature Film' : 'Webseries'}
                  </span>
                  <h4
                    style={{
                      fontSize: '17px',
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
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {purchaseTarget.releaseYear} • {purchaseTarget.genres[0]}
                  </div>
                </div>
              </div>

              {/* Price & Balance Breakdown */}
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
                  <span style={{ fontWeight: 600, color: '#FFFFFF' }}>₹{walletBalance}</span>
                </div>

                <div
                  style={{
                    height: '1px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    margin: '4px 0'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ color: hasSufficientBalance ? 'var(--text-primary)' : 'var(--badge-now-bg)', fontWeight: 600 }}>
                    Remaining Balance:
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      color: hasSufficientBalance ? 'var(--badge-owned-bg)' : 'var(--badge-now-bg)'
                    }}
                  >
                    {hasSufficientBalance ? `₹${remainingBalance}` : `Insufficient (Need ₹${price - walletBalance} more)`}
                  </span>
                </div>
              </div>

              {/* Error Alert if insufficient funds */}
              {!hasSufficientBalance && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#F87171',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>Your wallet does not have enough credits to complete this purchase.</span>
                </div>
              )}

              {/* Error Message if any */}
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

              {/* Actions */}
              {hasSufficientBalance ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleClose} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button onClick={handleConfirm} className="btn btn-primary" style={{ flex: 2 }}>
                    Confirm Purchase
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleClose} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleClose();
                      openRechargeModal();
                    }}
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                  >
                    <Wallet size={16} />
                    <span>Recharge Wallet</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

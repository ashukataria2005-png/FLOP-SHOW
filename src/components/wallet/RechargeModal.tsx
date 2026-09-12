import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Wallet, Plus } from 'lucide-react';

export const RechargeModal: React.FC = () => {
  const { activeModal, closeRechargeModal, rechargeWallet, walletBalance } = useApp();
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');

  if (activeModal !== 'recharge') return null;

  const quickAmounts = [50, 100, 200, 500];

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

  const handleRecharge = () => {
    const amt = customAmount ? parseInt(customAmount, 10) : selectedAmount;
    if (amt > 0) {
      rechargeWallet(amt);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeRechargeModal}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={20} color="var(--brand-gold)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>Add Funds to Wallet</h3>
          </div>
          <button
            onClick={closeRechargeModal}
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Current Balance</span>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--brand-gold)', marginTop: '2px' }}>
              ₹{walletBalance}
            </div>
          </div>

          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
            Select Recharge Amount
          </label>

          {/* Quick Amounts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
            {quickAmounts.map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => handleAmountSelect(amt)}
                style={{
                  padding: '12px 8px',
                  borderRadius: '12px',
                  backgroundColor: !customAmount && selectedAmount === amt ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.05)',
                  color: !customAmount && selectedAmount === amt ? '#0E0E12' : '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '15px',
                  border: `1px solid ${!customAmount && selectedAmount === amt ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.1)'}`,
                  transition: 'all var(--transition-fast)'
                }}
              >
                +₹{amt}
              </button>
            ))}
          </div>

          {/* Custom Amount Input */}
          <div style={{ marginBottom: '24px' }}>
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
              <span style={{ color: 'var(--brand-gold)', fontWeight: 700, fontSize: '16px', marginRight: '6px' }}>
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
                  color: '#FFFFFF'
                }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={closeRechargeModal} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              onClick={handleRecharge}
              disabled={selectedAmount <= 0}
              className="btn btn-primary"
              style={{ flex: 2 }}
            >
              <Plus size={16} />
              <span>Add ₹{selectedAmount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

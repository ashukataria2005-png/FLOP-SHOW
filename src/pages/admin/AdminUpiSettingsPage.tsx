import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  QrCode,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { generateUpiQrDataUrl } from '../../utils/upiQr';

interface AdminUpiSettingsPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminUpiSettingsPage: React.FC<AdminUpiSettingsPageProps> = ({ onNavigateTab: _onNavigateTab }) => {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [upiId, setUpiId] = useState('');
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [merchantName, setMerchantName] = useState('FLOPSHOW');
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string>('');

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update dynamic QR preview whenever UPI ID or merchant name changes
  useEffect(() => {
    let active = true;
    const generatePreview = async () => {
      if (!upiId.trim()) {
        setQrPreviewUrl('');
        return;
      }
      try {
        const url = await generateUpiQrDataUrl(upiId.trim(), 100, merchantName.trim() || 'FLOPSHOW');
        if (active) setQrPreviewUrl(url);
      } catch {
        if (active) setQrPreviewUrl('');
      }
    };
    generatePreview();
    return () => {
      active = false;
    };
  }, [upiId, merchantName]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getSettings();
      if (data && data.settings) {
        if (data.settings.payment_upi_id !== undefined) setUpiId(data.settings.payment_upi_id);
        if (data.settings.payment_upi_enabled !== undefined) {
          setUpiEnabled(String(data.settings.payment_upi_enabled) === 'true');
        }
        if (data.settings.payment_upi_merchant_name !== undefined) {
          setMerchantName(data.settings.payment_upi_merchant_name);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load UPI settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!upiId.trim()) {
      showToast('Please provide a valid Receiver UPI ID.', 'error');
      return;
    }

    try {
      setSaving(true);
      await api.admin.updateSettings({
        payment_upi_id: upiId.trim(),
        payment_upi_enabled: String(upiEnabled),
        payment_upi_merchant_name: merchantName.trim() || 'FLOPSHOW'
      });
      showToast('UPI Payment settings saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save UPI settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px', color: '#9CA3AF' }}>
        <Loader2 size={24} className="animate-spin" color="var(--brand-gold, #F5C518)" />
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading UPI Payment Settings...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--brand-gold, #F5C518)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(245, 197, 24, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(245, 197, 24, 0.25)'
              }}
            >
              PAYMENTS
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
            UPI Payment Configuration
          </h1>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Manage the direct receiver UPI ID, merchant display name, and availability for user wallet recharges.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '10px',
            backgroundColor: 'var(--brand-gold, #F5C518)',
            border: 'none',
            color: '#000000',
            fontSize: '14px',
            fontWeight: 800,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 16px rgba(245, 197, 24, 0.35)',
            opacity: saving ? 0.7 : 1,
            transition: 'all 0.15s ease'
          }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
        </button>
      </div>

      <form onSubmit={handleSave}>
        {/* Main Configuration Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            border: '1.5px solid rgba(245, 197, 24, 0.25)',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Card Header & Master Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              paddingBottom: '20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(245, 197, 24, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <QrCode size={24} color="var(--brand-gold, #F5C518)" />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Receiver UPI ID & Dynamic QR
                </h2>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  Users scan the automatically encoded dynamic QR code in their UPI app or copy the UPI ID directly.
                </span>
              </div>
            </div>

            {/* Master Toggle */}
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 16px',
                borderRadius: '9999px',
                backgroundColor: upiEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${upiEnabled ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={upiEnabled}
                onChange={e => setUpiEnabled(e.target.checked)}
                style={{ accentColor: '#10B981', cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '13px', fontWeight: 800, color: upiEnabled ? '#10B981' : '#EF4444' }}>
                {upiEnabled ? 'UPI Recharges Enabled' : 'UPI Recharges Disabled'}
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'start' }}>
            {/* Input fields */}
            <div>
              {/* Receiver UPI ID */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#E0E0E0', display: 'block', marginBottom: '6px' }}>
                  Receiver UPI ID / VPA <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  placeholder="e.g. flopshow@upi or yourname@okhdfcbank"
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginTop: '6px' }}>
                  Funds transferred by users arrive directly into the bank account linked to this UPI ID.
                </span>
              </div>

              {/* Merchant / App Display Name */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#E0E0E0', display: 'block', marginBottom: '6px' }}>
                  Merchant / App Display Name
                </label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={e => setMerchantName(e.target.value)}
                  placeholder="e.g. FLOPSHOW"
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginTop: '6px' }}>
                  Visible to users as the recipient name in GPay, PhonePe, Paytm, and BHIM apps.
                </span>
              </div>

              {/* Information callout */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 197, 24, 0.08)',
                  border: '1px solid rgba(245, 197, 24, 0.2)',
                  fontSize: '12px',
                  color: '#D1D5DB',
                  lineHeight: 1.6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--brand-gold, #F5C518)', fontWeight: 800 }}>
                  <Smartphone size={15} />
                  <span>Dynamic QR Spec Compliance</span>
                </div>
                The system automatically builds standard UPI intent URIs (`upi://pay?pa=...&am=...&cu=INR`).
                Users will get exact-amount QR codes generated dynamically on demand without manual static image uploads.
              </div>
            </div>

            {/* Live QR Preview Box */}
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#E0E0E0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Live Dynamic QR Preview (Sample ₹100)
                </span>
              </div>

              {qrPreviewUrl ? (
                <div>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '12px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)'
                    }}
                  >
                    <img
                      src={qrPreviewUrl}
                      alt="Dynamic UPI QR Code Preview"
                      style={{ width: '200px', height: '200px', display: 'block' }}
                    />
                  </div>
                  <div style={{ marginTop: '14px', fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                    Pay to: <span style={{ color: 'var(--brand-gold, #F5C518)', fontFamily: 'monospace' }}>{upiId || 'Not Set'}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                    Merchant: {merchantName || 'FLOPSHOW'} • Amount: ₹100.00
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    height: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6B7280',
                    fontSize: '13px',
                    gap: '10px'
                  }}
                >
                  <AlertCircle size={32} />
                  <span>Enter a valid UPI ID on the left to render the live QR preview.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '10px',
              backgroundColor: 'var(--brand-gold, #F5C518)',
              border: 'none',
              color: '#000000',
              fontSize: '14px',
              fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(245, 197, 24, 0.35)',
              opacity: saving ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{saving ? 'Saving Settings...' : 'Save UPI Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

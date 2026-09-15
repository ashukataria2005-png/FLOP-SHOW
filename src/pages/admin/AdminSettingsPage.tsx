import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { AppThemeSelector } from '../../components/admin/AppThemeSelector';
import {
  Sliders,
  Save,
  Loader2,
  Shield,
  HelpCircle,
  QrCode
} from 'lucide-react';
import { generateUpiQrDataUrl } from '../../utils/upiQr';

interface AdminSettingsPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = () => {
  const { theme, setTheme, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [platformName, setPlatformName] = useState('FLOPSHOW');
  const [platformTagline, setPlatformTagline] = useState('Stream the Unstreamable');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [supportEmail, setSupportEmail] = useState('support@flopshow.tv');
  const [defaultResolution, setDefaultResolution] = useState('1080p');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowGuestBrowsing, setAllowGuestBrowsing] = useState(true);

  // UPI Payment Settings State
  const [upiId, setUpiId] = useState('flopshow@upi');
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [merchantName, setMerchantName] = useState('FLOPSHOW');
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string>('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getSettings();
      if (res.settings) {
        if (res.settings.platform_name) setPlatformName(res.settings.platform_name);
        if (res.settings.platform_tagline) setPlatformTagline(res.settings.platform_tagline);
        if (res.settings.currency_symbol) setCurrencySymbol(res.settings.currency_symbol);
        if (res.settings.support_email) setSupportEmail(res.settings.support_email);
        if (res.settings.default_resolution) setDefaultResolution(res.settings.default_resolution);
        if (res.settings.maintenance_mode !== undefined) setMaintenanceMode(res.settings.maintenance_mode === 'true');
        if (res.settings.allow_guest_browsing !== undefined) setAllowGuestBrowsing(res.settings.allow_guest_browsing === 'true');
        if (res.settings.payment_upi_id) setUpiId(res.settings.payment_upi_id);
        if (res.settings.payment_upi_enabled !== undefined) setUpiEnabled(res.settings.payment_upi_enabled !== 'false');
        if (res.settings.payment_upi_merchant_name) setMerchantName(res.settings.payment_upi_merchant_name);
        if (res.settings.app_theme && (res.settings.app_theme === 'netflix-red' || res.settings.app_theme === 'flopshow-gold')) {
          setTheme(res.settings.app_theme as any);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load application settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (upiId && upiId.includes('@')) {
      generateUpiQrDataUrl(upiId, 100, merchantName)
        .then(url => setQrPreviewUrl(url))
        .catch(() => setQrPreviewUrl(''));
    } else {
      setQrPreviewUrl('');
    }
  }, [upiId, merchantName]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.admin.updateSettings({
        platform_name: platformName.trim(),
        platform_tagline: platformTagline.trim(),
        currency_symbol: currencySymbol.trim(),
        support_email: supportEmail.trim(),
        default_resolution: defaultResolution,
        maintenance_mode: String(maintenanceMode),
        allow_guest_browsing: String(allowGuestBrowsing),
        app_theme: theme,
        payment_upi_id: upiId.trim(),
        payment_upi_enabled: String(upiEnabled),
        payment_upi_merchant_name: merchantName.trim()
      });
      showToast('Application & UPI payment settings saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#9CA3AF' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--brand-gold, #F5C518)' }} />
        <span>Loading system configurations...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Application Settings & Controls
        </h1>
        <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
          Configure global platform branding, default streaming player resolutions, contact channels, and system modes.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* App Theme Section */}
        <AppThemeSelector />

        {/* Section 1: Platform Branding */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px'
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} style={{ color: 'var(--brand-gold, #F5C518)' }} />
            <span>Brand & Identity</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Platform Name
              </label>
              <input
                type="text"
                value={platformName}
                onChange={e => setPlatformName(e.target.value)}
                required
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Platform Tagline
              </label>
              <input
                type="text"
                value={platformTagline}
                onChange={e => setPlatformTagline(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Financial & Support */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px'
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={20} style={{ color: 'var(--brand-gold, #F5C518)' }} />
            <span>Currency & Customer Support</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Currency Symbol
              </label>
              <input
                type="text"
                value={currencySymbol}
                onChange={e => setCurrencySymbol(e.target.value)}
                required
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Support Contact Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Media & Video Player */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px'
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} style={{ color: 'var(--brand-gold, #F5C518)' }} />
            <span>Media Player & Access Controls</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Default Playback Resolution
              </label>
              <select
                value={defaultResolution}
                onChange={e => setDefaultResolution(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#1E1E2A',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="1080p">1080p Full HD (Recommended)</option>
                <option value="720p">720p HD</option>
                <option value="480p">480p Standard</option>
                <option value="auto">Adaptive Bitrate (HLS Auto)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Maintenance Mode Toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: maintenanceMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                border: maintenanceMode ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer'
              }}
            >
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: maintenanceMode ? '#F87171' : '#FFFFFF', display: 'block' }}>
                  Maintenance Mode
                </span>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  When enabled, shows a maintenance notice to non-admin visitors.
                </span>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={e => setMaintenanceMode(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#EF4444', cursor: 'pointer' }}
              />
            </label>

            {/* Guest Browsing Toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer'
              }}
            >
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', display: 'block' }}>
                  Allow Guest Browsing
                </span>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  Allow unauthenticated visitors to browse catalog and preview trailers before sign in.
                </span>
              </div>
              <input
                type="checkbox"
                checked={allowGuestBrowsing}
                onChange={e => setAllowGuestBrowsing(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--brand-gold, #F5C518)', cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>

        {/* 5. UPI Payment Settings */}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 197, 24, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <QrCode size={20} color="var(--brand-gold, #F5C518)" />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Payment Settings / UPI Payment
                </h2>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  Configure receiver UPI ID for manual wallet recharges. The QR code is generated dynamically per recharge amount.
                </span>
              </div>
            </div>

            {/* Enable/Disable Toggle Pill */}
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '9999px',
                backgroundColor: upiEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${upiEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={upiEnabled}
                onChange={e => setUpiEnabled(e.target.checked)}
                style={{ accentColor: '#10B981', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px', fontWeight: 700, color: upiEnabled ? '#10B981' : '#EF4444' }}>
                {upiEnabled ? 'UPI Payments Enabled' : 'UPI Payments Disabled'}
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
            {/* Form Inputs */}
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#E0E0E0', display: 'block', marginBottom: '6px' }}>
                  Receiver UPI ID <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  placeholder="e.g. flopshow@upi or username@okhdfcbank"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    fontWeight: 600
                  }}
                  required
                />
                <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginTop: '4px' }}>
                  Money paid by users will go directly to this UPI ID. You can update this anytime.
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#E0E0E0', display: 'block', marginBottom: '6px' }}>
                  Merchant / Business Name
                </label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={e => setMerchantName(e.target.value)}
                  placeholder="e.g. FLOPSHOW"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '14px'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginTop: '4px' }}>
                  Displayed inside UPI apps (GPay, PhonePe, Paytm, BHIM) when scanning QR.
                </span>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 197, 24, 0.08)',
                  border: '1px solid rgba(245, 197, 24, 0.2)',
                  fontSize: '12px',
                  color: '#D1D5DB',
                  lineHeight: 1.5
                }}
              >
                <strong style={{ color: 'var(--brand-gold, #F5C518)' }}>Automatic Dynamic QR:</strong> When a user selects ₹100, ₹200, or ₹500, the system automatically builds the official UPI URI and encodes the exact amount into the QR. No static image upload is needed.
              </div>
            </div>

            {/* Live QR Preview Box */}
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                padding: '20px',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '12px' }}>
                Live QR Preview (Sample ₹100)
              </span>

              {qrPreviewUrl ? (
                <div style={{ display: 'inline-block', padding: '10px', backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)' }}>
                  <img
                    src={qrPreviewUrl}
                    alt="Dynamic UPI QR Code Preview"
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>
              ) : (
                <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                  Enter a valid UPI ID to generate preview
                </div>
              )}

              <div style={{ marginTop: '12px' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)' }}>
                  {upiId || 'No UPI ID configured'}
                </div>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Encodes: upi://pay?pa={upiId}&pn={encodeURIComponent(merchantName)}&am=100.00&cu=INR
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              borderRadius: '10px',
              backgroundColor: 'var(--brand-gold, #F5C518)',
              color: '#0E0E12',
              fontWeight: 800,
              fontSize: '15px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(245, 197, 24, 0.25)'
            }}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Platform Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

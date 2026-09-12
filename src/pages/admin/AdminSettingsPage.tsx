import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Sliders,
  Save,
  Loader2,
  Shield,
  HelpCircle
} from 'lucide-react';

interface AdminSettingsPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = () => {
  const { showToast } = useApp();
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
        allow_guest_browsing: String(allowGuestBrowsing)
      });
      showToast('Application settings saved successfully!', 'success');
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

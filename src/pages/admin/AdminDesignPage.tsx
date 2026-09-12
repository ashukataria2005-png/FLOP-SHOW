import React from 'react';
import { useApp } from '../../context/AppContext';
import { AppThemeSelector } from '../../components/admin/AppThemeSelector';
import { Palette, Play, Sparkles, CheckCircle2, Bookmark, Sliders } from 'lucide-react';

interface AdminDesignPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminDesignPage: React.FC<AdminDesignPageProps> = ({ onNavigateTab }) => {
  const { theme } = useApp();

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold, #F5C518)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Palette size={20} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            App Design
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
          Manage platform aesthetics and visual appearance. Customize the global color theme applied across all user-facing streaming screens.
        </p>
      </div>

      {/* Main Section: App Theme Setting */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <AppThemeSelector />

        {/* Live Appearance & Component Showcase Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--brand-gold, #F5C518)' }} />
              <span>Live Theme Component Showcase</span>
            </h2>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--brand-gold, #F5C518)',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              Active: {theme === 'netflix-red' ? 'Netflix Red' : 'FLOPSHOW Gold'}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '20px' }}>
            The preview below reflects the current real-time CSS tokens applied to buttons, badges, navigation, and accents across your entire application.
          </p>

          <div
            style={{
              padding: '24px',
              backgroundColor: '#09090E',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            {/* Row 1: Primary, Secondary, Ghost Buttons */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '10px' }}>
                Brand Buttons
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary">
                  <Play size={16} fill="currentColor" />
                  <span>Primary Watch Now</span>
                </button>

                <button type="button" className="btn btn-secondary">
                  <Bookmark size={16} />
                  <span>My List</span>
                </button>

                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-focus)',
                    color: 'var(--brand-gold)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'default'
                  }}
                >
                  Active Pill
                </button>
              </div>
            </div>

            {/* Row 2: Badges & Tags */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '10px' }}>
                Pricing & Status Badges
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span className="badge-tag price">
                  ₹149 / BUY
                </span>
                <span className="badge-tag owned">
                  PURCHASED
                </span>
                <span className="badge-tag free">
                  FREE TO STREAM
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    padding: '4px 8px',
                    borderRadius: '5px',
                    backgroundColor: 'var(--brand-gold)',
                    color: theme === 'netflix-red' ? '#FFFFFF' : '#0E0E12'
                  }}
                >
                  #1 TRENDING
                </span>
              </div>
            </div>
          </div>

          {/* Quick jump to Full Platform Settings */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#9CA3AF' }}>
              <CheckCircle2 size={16} color="var(--brand-gold)" />
              <span>Theme selection persists automatically across browser refreshes and server reboots.</span>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('admin-settings')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--brand-gold)',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0
              }}
            >
              <Sliders size={14} />
              <span>Go to General Settings →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

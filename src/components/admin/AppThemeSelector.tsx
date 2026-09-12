import React, { useState } from 'react';
import { useApp, AppTheme } from '../../context/AppContext';
import { api } from '../../services/api';
import { Check, Palette, Sparkles, Loader2 } from 'lucide-react';

interface AppThemeSelectorProps {
  onThemeChanged?: (theme: AppTheme) => void;
}

export const AppThemeSelector: React.FC<AppThemeSelectorProps> = ({ onThemeChanged }) => {
  const { theme, setTheme, showToast } = useApp();
  const [savingTheme, setSavingTheme] = useState<AppTheme | null>(null);

  const themeOptions: Array<{
    id: AppTheme;
    title: string;
    badge: string;
    description: string;
    primaryColor: string;
    glowColor: string;
    palette: string[];
    features: string[];
  }> = [
    {
      id: 'flopshow-gold',
      title: 'FLOPSHOW Gold',
      badge: 'Current / Default Theme',
      description: 'Signature FLOPSHOW cinematic yellow/gold brand accents on obsidian black backdrop.',
      primaryColor: '#F5A623',
      glowColor: 'rgba(245, 166, 35, 0.35)',
      palette: ['#F5A623', '#FFBF52', '#07070A', '#12121A'],
      features: ['Warm cinematic gold highlights', 'High contrast obsidian blacks', 'Classic FLOPSHOW look']
    },
    {
      id: 'netflix-red',
      title: 'Netflix Red',
      badge: 'Netflix-Style Theme',
      description: 'Iconic Netflix-style bold crimson red accents on sleek deep dark surfaces.',
      primaryColor: '#E50914',
      glowColor: 'rgba(229, 9, 20, 0.4)',
      palette: ['#E50914', '#FF3B47', '#07070A', '#12121A'],
      features: ['Bold cinematic crimson red', 'Clean white primary action text', 'Immersive streaming vibe']
    }
  ];

  const handleSelectTheme = async (selectedId: AppTheme) => {
    if (savingTheme) return;
    try {
      setSavingTheme(selectedId);
      // Immediately apply to global context and DOM
      setTheme(selectedId);
      if (onThemeChanged) onThemeChanged(selectedId);

      // Persist centrally in database app_settings
      await api.admin.updateSettings({ app_theme: selectedId });

      const label = selectedId === 'netflix-red' ? 'Netflix Red' : 'FLOPSHOW Gold';
      showToast(`Active platform theme set to ${label}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save theme setting to database.', 'error');
    } finally {
      setSavingTheme(null);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface, #12121A)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '24px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Palette size={20} style={{ color: 'var(--brand-gold, #F5C518)' }} />
          <span>App Theme</span>
        </h2>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Global Design System
        </span>
      </div>

      <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '20px', lineHeight: 1.5 }}>
        Choose the global visual theme for the entire platform. Switching updates all buttons, navigation accents,
        active pills, badges, and brand highlights across customer and admin views.
      </p>

      {/* 2 Theme Option Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}
      >
        {themeOptions.map(opt => {
          const isSelected = theme === opt.id;
          const isProcessing = savingTheme === opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => handleSelectTheme(opt.id)}
              style={{
                position: 'relative',
                borderRadius: '14px',
                backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected
                  ? `2px solid ${opt.primaryColor}`
                  : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: isSelected
                  ? `0 6px 24px ${opt.glowColor}`
                  : 'none',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              {/* Top Row: Title + Selected Badge */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: opt.primaryColor,
                          display: 'inline-block',
                          boxShadow: `0 0 8px ${opt.primaryColor}`
                        }}
                      />
                      {opt.title}
                    </h3>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                      {opt.badge}
                    </div>
                  </div>

                  {/* Active Indicator Radio / Checkmark */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? opt.primaryColor : 'rgba(255, 255, 255, 0.08)',
                      border: isSelected ? `2px solid ${opt.primaryColor}` : '2px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {isProcessing ? (
                      <Loader2 size={13} className="animate-spin" color="#FFFFFF" />
                    ) : isSelected ? (
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    ) : null}
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#A0A0B2', lineHeight: 1.5, margin: '10px 0 16px' }}>
                  {opt.description}
                </p>

                {/* Color Swatch Preview */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Palette Swatches
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {opt.palette.map((color, idx) => (
                      <div
                        key={idx}
                        title={color}
                        style={{
                          flex: 1,
                          height: '24px',
                          borderRadius: '6px',
                          backgroundColor: color,
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: idx === 0 ? `0 2px 8px ${opt.glowColor}` : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Micro preview mock of primary button */}
                <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#07070A', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px' }}>UI Preview</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        backgroundColor: opt.primaryColor,
                        color: opt.id === 'netflix-red' ? '#FFFFFF' : '#0E0E12',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Sparkles size={12} />
                      <span>Watch now</span>
                    </div>
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      Trailer
                    </div>
                  </div>
                </div>
              </div>

              {/* Status footer inside card */}
              <div
                style={{
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: isSelected ? opt.primaryColor : '#6B7280'
                  }}
                >
                  {isSelected ? '✓ Currently Active Theme' : 'Click to Activate'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

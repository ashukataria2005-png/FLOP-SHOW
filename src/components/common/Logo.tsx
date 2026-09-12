import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', onClick }) => {
  const iconSizes = {
    sm: { box: 28, radius: 7 },
    md: { box: 36, radius: 9 },
    lg: { box: 44, radius: 11 }
  };

  const fontSizes = {
    sm: '16px',
    md: '20px',
    lg: '26px'
  };

  const config = iconSizes[size];

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? 8 : 12,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
    >
      {/* Brand Icon: Golden rounded square with film frame perforations */}
      <div
        style={{
          width: config.box,
          height: config.box,
          borderRadius: config.radius,
          background: 'linear-gradient(135deg, var(--brand-gold-light, #FFB944) 0%, var(--brand-gold, #F5A623) 50%, var(--brand-gold-dark, #D88914) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px var(--brand-gold-glow, rgba(245, 166, 35, 0.4))',
          flexShrink: 0
        }}
      >
        <svg width={config.box * 0.72} height={config.box * 0.72} viewBox="0 0 24 24" fill="none">
          {/* Inner dark frame */}
          <rect x="2" y="2" width="20" height="20" rx="3" fill="#0C0C10" />
          {/* Left perforations */}
          <rect x="4" y="4" width="2.5" height="2.5" rx="0.5" fill="var(--brand-gold, #F5A623)" />
          <rect x="4" y="9" width="2.5" height="2.5" rx="0.5" fill="var(--brand-gold, #F5A623)" />
          <rect x="4" y="14" width="2.5" height="2.5" rx="0.5" fill="var(--brand-gold, #F5A623)" />
          <rect x="4" y="19" width="2.5" height="1" rx="0.5" fill="var(--brand-gold, #F5A623)" />
          {/* Right perforations */}
          <rect x="17.5" y="4" width="2.5" height="2.5" rx="0.5" fill="var(--brand-gold, #F5A623)" />
          <rect x="17.5" y="9" width="2.5" height="2.5" rx="0.5" fill="var(--brand-gold, #F5A623)" />
          <rect x="17.5" y="14" width="2.5" height="2.5" rx="0.5" fill="var(--brand-gold, #F5A623)" />
          <rect x="17.5" y="19" width="2.5" height="1" rx="0.5" fill="var(--brand-gold, #F5A623)" />
          {/* Central film viewing window */}
          <rect x="8.5" y="5" width="7" height="14" rx="1.5" fill="var(--brand-gold, #F5A623)" />
        </svg>
      </div>

      {/* Brand Wordmark */}
      <span
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: fontSizes[size],
          letterSpacing: '0.08em',
          color: '#FFFFFF',
          lineHeight: 1
        }}
      >
        FLOP<span style={{ color: 'var(--brand-gold, #F5A623)' }}>SHOW</span>
      </span>
    </div>
  );
};

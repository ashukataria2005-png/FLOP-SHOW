import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  animated?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', onClick, animated = false }) => {
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
      className={`flopshow-logo-wrap ${animated ? 'is-animated' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? 8 : 12,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        position: 'relative'
      }}
    >
      {/* Icon Area: contains static logo or animated logo + camera + projector beam */}
      <div
        style={{
          width: config.box,
          height: config.box,
          position: 'relative',
          flexShrink: 0
        }}
      >
        {/* Base / Original Film Frame Logo */}
        <div
          className={animated ? 'cinematic-original-logo' : undefined}
          style={{
            width: config.box,
            height: config.box,
            borderRadius: config.radius,
            background: 'linear-gradient(135deg, var(--brand-gold-light, #FFB944) 0%, var(--brand-gold, #F5A623) 50%, var(--brand-gold-dark, #D88914) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px var(--brand-gold-glow, rgba(245, 166, 35, 0.4))',
            position: animated ? 'absolute' : 'static',
            inset: 0,
            zIndex: 2
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

        {animated && (
          <>
            {/* Vintage Movie Camera (Morphed State) */}
            <div
              className="cinematic-camera-logo"
              style={{
                width: config.box,
                height: config.box,
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                filter: 'drop-shadow(0 4px 14px rgba(245, 166, 35, 0.45))'
              }}
            >
              <svg width={config.box} height={config.box} viewBox="0 0 36 36" fill="none">
                <defs>
                  <linearGradient id="camBodyGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#282836" />
                    <stop offset="50%" stopColor="#151520" />
                    <stop offset="100%" stopColor="#0B0B12" />
                  </linearGradient>
                  <linearGradient id="camGoldGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFE082" />
                    <stop offset="50%" stopColor="#F5A623" />
                    <stop offset="100%" stopColor="#D88914" />
                  </linearGradient>
                </defs>

                {/* Tripod mounting base */}
                <rect x="15" y="30" width="6" height="2" rx="0.5" fill="#F5A623" />
                <path d="M14 32L10 36H26L22 32H14Z" fill="#14141E" stroke="#F5A623" strokeWidth="0.8" />

                {/* Left Film Reel with spinning spokes */}
                <g className="cinematic-reel-left">
                  <circle cx="12" cy="8" r="5.5" fill="#161622" stroke="url(#camGoldGrad)" strokeWidth="1.2" />
                  <circle cx="12" cy="8" r="2" fill="#2A2A38" stroke="#F5A623" strokeWidth="0.8" />
                  <circle cx="12" cy="4.5" r="0.9" fill="#F5A623" />
                  <circle cx="15" cy="9.8" r="0.9" fill="#F5A623" />
                  <circle cx="9" cy="9.8" r="0.9" fill="#F5A623" />
                </g>

                {/* Right Film Reel with spinning spokes */}
                <g className="cinematic-reel-right">
                  <circle cx="21" cy="8" r="5.5" fill="#161622" stroke="url(#camGoldGrad)" strokeWidth="1.2" />
                  <circle cx="21" cy="8" r="2" fill="#2A2A38" stroke="#F5A623" strokeWidth="0.8" />
                  <circle cx="21" cy="4.5" r="0.9" fill="#F5A623" />
                  <circle cx="24" cy="9.8" r="0.9" fill="#F5A623" />
                  <circle cx="18" cy="9.8" r="0.9" fill="#F5A623" />
                </g>

                {/* Reel bridge saddle */}
                <rect x="10" y="11" width="13" height="3.5" rx="1" fill="#14141E" stroke="#F5A623" strokeWidth="0.8" />

                {/* Viewfinder on top-left */}
                <rect x="4" y="13" width="5" height="3" rx="0.8" fill="#181824" stroke="#F5A623" strokeWidth="0.8" />
                <circle cx="4.5" cy="14.5" r="1" fill="#FFE082" />

                {/* Main Camera Body */}
                <rect x="6" y="13.5" width="19" height="16.5" rx="2" fill="url(#camBodyGrad)" stroke="url(#camGoldGrad)" strokeWidth="1.2" />

                {/* Screws/Rivets */}
                <circle cx="8" cy="15.5" r="0.7" fill="#FFE082" />
                <circle cx="23" cy="15.5" r="0.7" fill="#FFE082" />
                <circle cx="8" cy="28" r="0.7" fill="#FFE082" />
                <circle cx="23" cy="28" r="0.7" fill="#FFE082" />

                {/* Side mechanical gear / film meter */}
                <circle cx="14" cy="22" r="3.8" fill="#0C0C12" stroke="#F5A623" strokeWidth="0.9" />
                <circle cx="14" cy="22" r="1.5" fill="#F5A623" />
                <line x1="14" y1="18.8" x2="14" y2="20" stroke="#FFE082" strokeWidth="0.8" />
                <line x1="14" y1="24" x2="14" y2="25.2" stroke="#FFE082" strokeWidth="0.8" />
                <line x1="10.8" y1="22" x2="12" y2="22" stroke="#FFE082" strokeWidth="0.8" />
                <line x1="16" y1="22" x2="17.2" y2="22" stroke="#FFE082" strokeWidth="0.8" />

                {/* Hand crank */}
                <path d="M6 23.5H3.5V26.5" stroke="#FFE082" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="3.5" cy="26.5" r="0.9" fill="#F5A623" />

                {/* Lens barrel & flared conical matte box pointing right */}
                <rect x="25" y="17.5" width="2.5" height="8.5" rx="0.8" fill="#1A1A28" stroke="#F5A623" strokeWidth="0.8" />
                <polygon points="27.5,18 34.5,15.5 34.5,28 27.5,25.5" fill="url(#camGoldGrad)" stroke="#FFE082" strokeWidth="0.8" />
                <line x1="34.5" y1="16.5" x2="34.5" y2="27" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Lens Focal Flare */}
            <div className="cinematic-lens-flare" />

            {/* V-Shaped Golden Projector Light Beam */}
            <div className="cinematic-projector-beam" />
          </>
        )}
      </div>

      {/* Brand Wordmark */}
      <span
        className={animated ? 'cinematic-wordmark' : undefined}
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: fontSizes[size],
          letterSpacing: '0.08em',
          color: '#FFFFFF',
          lineHeight: 1,
          position: 'relative',
          zIndex: 4,
          display: 'inline-block'
        }}
      >
        FLOP<span style={{ color: 'var(--brand-gold, #F5A623)' }}>SHOW</span>
      </span>

      {animated && (
        <style>{`
          /* Overall cinematic 11s loop animation */
          .cinematic-original-logo {
            animation: cinematicOriginalLogo 11s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center center;
            will-change: transform, opacity, filter;
          }

          .cinematic-camera-logo {
            animation: cinematicCameraLogo 11s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center center;
            will-change: transform, opacity, filter;
          }

          .cinematic-reel-left {
            transform-origin: 12px 8px;
            animation: cinematicReelSpin 2.4s linear infinite;
          }

          .cinematic-reel-right {
            transform-origin: 21px 8px;
            animation: cinematicReelSpin 2.4s linear infinite;
          }

          .cinematic-lens-flare {
            position: absolute;
            left: 31px;
            top: calc(50% - 6px);
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: radial-gradient(circle, #FFFFFF 0%, #FFE082 40%, #F5A623 75%, transparent 100%);
            box-shadow: 0 0 10px #FFE082, 0 0 18px #F5A623;
            pointer-events: none;
            z-index: 3;
            animation: cinematicFlare 11s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center center;
            will-change: transform, opacity;
          }

          .cinematic-projector-beam {
            position: absolute;
            left: 32px;
            top: 50%;
            transform: translateY(-50%);
            width: 155px;
            height: 44px;
            pointer-events: none;
            z-index: 1;
            clip-path: polygon(0% 44%, 100% 0%, 100% 100%, 0% 56%);
            background: linear-gradient(
              90deg,
              rgba(255, 225, 100, 0.88) 0%,
              rgba(245, 166, 35, 0.55) 28%,
              rgba(245, 166, 35, 0.18) 68%,
              rgba(245, 166, 35, 0) 100%
            );
            filter: drop-shadow(0 0 10px rgba(245, 166, 35, 0.65));
            transform-origin: left center;
            animation: cinematicBeam 11s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            will-change: transform, opacity;
          }

          .cinematic-wordmark {
            animation: cinematicWordmark 11s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: left center;
            will-change: transform, opacity, filter;
          }

          /* Keyframe Sequences */
          @keyframes cinematicOriginalLogo {
            0%, 22.7% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: blur(0px);
            }
            30%, 34% {
              opacity: 0;
              transform: scale(0.85) rotate(-6deg);
              filter: blur(1.5px);
            }
            34.1%, 77.3% {
              opacity: 0;
              transform: scale(0.85) rotate(0deg);
              filter: blur(1.5px);
            }
            83%, 87.3% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: blur(0px);
            }
            87.4%, 100% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: blur(0px);
            }
          }

          @keyframes cinematicCameraLogo {
            0%, 28% {
              opacity: 0;
              transform: scale(0.85) rotate(6deg);
              filter: blur(1.5px);
            }
            35%, 72% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: blur(0px);
            }
            78%, 84% {
              opacity: 0;
              transform: scale(0.85) rotate(-6deg);
              filter: blur(1.5px);
            }
            84.1%, 100% {
              opacity: 0;
              transform: scale(0.85) rotate(0deg);
              filter: blur(1.5px);
            }
          }

          @keyframes cinematicReelSpin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes cinematicBeam {
            0%, 43.6% {
              opacity: 0;
              transform: translateY(-50%) scaleX(0.12);
            }
            48%, 66% {
              opacity: 0.92;
              transform: translateY(-50%) scaleX(1);
            }
            73%, 77.3% {
              opacity: 0;
              transform: translateY(-50%) scaleX(0.85);
            }
            77.4%, 100% {
              opacity: 0;
              transform: translateY(-50%) scaleX(0.12);
            }
          }

          @keyframes cinematicFlare {
            0%, 43.6% {
              opacity: 0;
              transform: scale(0.2);
            }
            47%, 66% {
              opacity: 1;
              transform: scale(1);
            }
            72%, 77.3% {
              opacity: 0;
              transform: scale(0.2);
            }
            77.4%, 100% {
              opacity: 0;
              transform: scale(0.2);
            }
          }

          @keyframes cinematicWordmark {
            0%, 22.7% {
              opacity: 1;
              transform: translateX(0px) scale(1);
              filter: none;
            }
            30%, 33.6% {
              opacity: 0;
              transform: translateX(-42px) scale(0.35);
              filter: blur(2px);
            }
            33.7%, 52.7% {
              opacity: 0;
              transform: translateX(-24px) scale(0.68);
              filter: drop-shadow(0 0 12px rgba(245, 166, 35, 0.9)) brightness(1.3);
            }
            62%, 68.2% {
              opacity: 1;
              transform: translateX(0px) scale(1);
              filter: drop-shadow(0 0 10px rgba(245, 166, 35, 0.8)) brightness(1.2);
            }
            74%, 77.3% {
              opacity: 1;
              transform: translateX(0px) scale(1);
              filter: drop-shadow(0 0 2px rgba(245, 166, 35, 0.3)) brightness(1.05);
            }
            80%, 100% {
              opacity: 1;
              transform: translateX(0px) scale(1);
              filter: none;
            }
          }

          /* Accessibility: prefers-reduced-motion support */
          @media (prefers-reduced-motion: reduce) {
            .cinematic-original-logo,
            .cinematic-camera-logo,
            .cinematic-projector-beam,
            .cinematic-lens-flare,
            .cinematic-wordmark {
              animation: none !important;
              transform: none !important;
              filter: none !important;
            }
            .cinematic-camera-logo,
            .cinematic-projector-beam,
            .cinematic-lens-flare {
              display: none !important;
            }
            .cinematic-original-logo {
              opacity: 1 !important;
            }
            .cinematic-wordmark {
              opacity: 1 !important;
            }
          }
        `}</style>
      )}
    </div>
  );
};

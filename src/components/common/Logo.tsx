import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  animated?: boolean;
}

const LETTERS = [
  { char: 'F', color: '#FFFFFF' },
  { char: 'L', color: '#FFFFFF' },
  { char: 'O', color: '#FFFFFF' },
  { char: 'P', color: '#FFFFFF' },
  { char: 'S', color: 'var(--brand-gold, #F5A623)' },
  { char: 'H', color: 'var(--brand-gold, #F5A623)' },
  { char: 'O', color: 'var(--brand-gold, #F5A623)' },
  { char: 'W', color: 'var(--brand-gold, #F5A623)' }
];

export const Logo: React.FC<LogoProps> = ({ size = 'md', onClick, animated = false }) => {
  const iconSizes = {
    sm: { box: 28, radius: 7, lensY: 17.0, lensX: 26 },
    md: { box: 36, radius: 9, lensY: 21.75, lensX: 34 },
    lg: { box: 44, radius: 11, lensY: 26.5, lensX: 41 }
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
        position: 'relative',
        overflow: 'visible'
      }}
    >
      {/* Icon Area: contains static logo or animated logo + magnetic aura + camera + projector beam */}
      <div
        style={{
          width: config.box,
          height: config.box,
          position: 'relative',
          flexShrink: 0,
          overflow: 'visible'
        }}
      >
        {animated && <div className="cinematic-magnetic-aura" />}

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

                {/* Lens barrel & flared conical matte box:
                    Center of lens is at y = (16.5 + 27) / 2 = 21.75px, x = 34.5px */}
                <rect x="25" y="17.5" width="2.5" height="8.5" rx="0.8" fill="#1A1A28" stroke="#F5A623" strokeWidth="0.8" />
                <polygon points="27.5,18 34.5,15.5 34.5,28 27.5,25.5" fill="url(#camGoldGrad)" stroke="#FFE082" strokeWidth="0.8" />
                <line x1="34.5" y1="16.5" x2="34.5" y2="27" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Lens Focal Flare: exactly centered at lens opening (x = 34px, y = 21.75px) */}
            <div
              className="cinematic-lens-flare"
              style={{
                left: `${config.lensX - 5}px`,
                top: `${config.lensY - 5}px`
              }}
            />

            {/* V-Shaped Golden Projector Light Beam: origin centered at EXACT lens opening */}
            <div
              className="cinematic-projector-beam"
              style={{
                left: `${config.lensX}px`,
                top: `${config.lensY}px`
              }}
            />
          </>
        )}
      </div>

      {/* Brand Wordmark: continuous track translation with coordinated letter-by-letter absorption */}
      <span
        className={animated ? 'cinematic-wordmark-track' : undefined}
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: fontSizes[size],
          letterSpacing: '0.08em',
          lineHeight: 1,
          position: 'relative',
          zIndex: 4,
          display: 'inline-flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          overflow: 'visible'
        }}
      >
        {animated ? (
          LETTERS.map((item, idx) => (
            <span
              key={idx}
              className={`cinematic-letter cinematic-letter-${idx}`}
              style={{
                color: item.color,
                display: 'inline-block',
                position: 'relative',
                overflow: 'visible'
              }}
            >
              {item.char}
            </span>
          ))
        ) : (
          <>
            FLOP<span style={{ color: 'var(--brand-gold, #F5A623)' }}>SHOW</span>
          </>
        )}
      </span>

      {animated && (
        <style>{`
          /* ========================================================================= */
          /* TIMING ARCHITECTURE (12.5s Total Seamless Loop)                          */
          /* ========================================================================= */

          /* 1. ORIGINAL FILM FRAME LOGO */
          .cinematic-original-logo {
            animation: cinematicOriginalLogo 12.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center center;
            will-change: transform, opacity, filter;
          }

          @keyframes cinematicOriginalLogo {
            /* Static initial rest */
            0%, 18.0% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: none;
            }
            /* Magnetic activation pulse */
            19.5%, 20.0% {
              opacity: 1;
              transform: scale(1.06);
              filter: drop-shadow(0 0 10px rgba(245, 166, 35, 0.8));
            }
            /* Magnetic pull phase: solidly visible, actively absorbing text */
            20.1%, 37.5% {
              opacity: 1;
              transform: scale(1.04);
              filter: drop-shadow(0 0 14px rgba(245, 166, 35, 0.9));
            }
            /* All letters absorbed: Logo sits alone, solid and holding the swallowed text */
            37.6%, 42.0% {
              opacity: 1;
              transform: scale(1);
              filter: drop-shadow(0 0 6px rgba(245, 166, 35, 0.45));
            }
            /* Smooth morph into vintage camera */
            45.5%, 47.5% {
              opacity: 0;
              transform: scale(0.85) rotate(-6deg);
              filter: blur(1.5px);
            }
            /* Hidden while camera is active */
            47.6%, 76.5% {
              opacity: 0;
              transform: scale(0.85) rotate(0deg);
              filter: blur(1.5px);
            }
            /* Smooth morph back from camera */
            80.5%, 82.5% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: blur(0px);
            }
            /* Static final rest before seamless loop */
            82.6%, 100% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: none;
            }
          }

          /* 2. MAGNETIC AURA: Golden magnetic pulses signaling attraction */
          .cinematic-magnetic-aura {
            position: absolute;
            inset: -5px;
            border-radius: 12px;
            border: 1.5px solid rgba(245, 166, 35, 0.65);
            box-shadow: 0 0 14px rgba(245, 166, 35, 0.6), inset 0 0 10px rgba(245, 166, 35, 0.35);
            pointer-events: none;
            z-index: 1;
            animation: cinematicMagneticAura 12.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center center;
            will-change: transform, opacity;
          }

          @keyframes cinematicMagneticAura {
            0%, 18.0% {
              opacity: 0;
              transform: scale(0.9);
            }
            19.5%, 20.0% {
              opacity: 0.85;
              transform: scale(1.18);
            }
            24.0% {
              opacity: 0.7;
              transform: scale(1.1);
            }
            28.0% {
              opacity: 0.95;
              transform: scale(1.22);
            }
            32.5% {
              opacity: 0.8;
              transform: scale(1.14);
            }
            37.5%, 39.5% {
              opacity: 0;
              transform: scale(0.85);
            }
            39.6%, 100% {
              opacity: 0;
              transform: scale(0.9);
            }
          }

          /* 3. CONTINUOUS WORDMARK TRACK: Single uninterrupted mathematical glide */
          .cinematic-wordmark-track {
            animation: cinematicWordmarkTrack 12.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: left center;
            will-change: transform, opacity, filter;
          }

          @keyframes cinematicWordmarkTrack {
            /* Static initial rest */
            0%, 20.0% {
              opacity: 1;
              transform: translateX(0px) scale(1);
              filter: none;
            }
            /* Pure unbroken continuous magnetic glide carrying all letters all the way to logo center */
            37.5% {
              opacity: 1;
              transform: translateX(-145px) scale(1);
              filter: drop-shadow(0 0 8px rgba(245, 166, 35, 0.5));
            }
            /* Absorbed & hidden inside logo/camera */
            37.6%, 54.9% {
              opacity: 0;
              transform: translateX(-24px) scale(0.7);
              filter: drop-shadow(0 0 16px rgba(255, 215, 0, 0.95)) brightness(1.35);
            }
            /* Pure unbroken continuous emergence from golden projector light beam */
            55.0% {
              opacity: 0;
              transform: translateX(-24px) scale(0.7);
              filter: drop-shadow(0 0 16px rgba(255, 215, 0, 0.95)) brightness(1.35);
            }
            58.0% {
              opacity: 0.95;
            }
            70.0% {
              opacity: 1;
              transform: translateX(0px) scale(1);
              filter: drop-shadow(0 0 6px rgba(245, 166, 35, 0.4)) brightness(1.1);
            }
            /* Beam fades, text settles into crisp default */
            76.0% {
              opacity: 1;
              transform: translateX(0px) scale(1);
              filter: none;
            }
            76.1%, 100% {
              opacity: 1;
              transform: translateX(0px) scale(1);
              filter: none;
            }
          }

          /* 4. LETTER-BY-LETTER PROGRESSIVE ABSORPTION AT THE EXACT LOGO THRESHOLD
             Every letter travels all the way to the logo boundary before dissolving into the center!
             Zero premature disappearing for last 'O' and 'W'! */
          .cinematic-letter {
            will-change: transform, opacity;
            transform-origin: center center;
          }

          /* Letter 0: 'F' (starts at 0px -> reaches logo at ~21.8%) */
          .cinematic-letter-0 { animation: cinematicLetter0 12.5s linear infinite; }
          @keyframes cinematicLetter0 {
            0%, 21.8% { opacity: 1; transform: scale(1); }
            23.4%, 54.9% { opacity: 0; transform: scale(0.2); }
            55.0%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 1: 'L' (starts at 14px -> reaches logo at ~23.6%) */
          .cinematic-letter-1 { animation: cinematicLetter1 12.5s linear infinite; }
          @keyframes cinematicLetter1 {
            0%, 23.6% { opacity: 1; transform: scale(1); }
            25.2%, 54.9% { opacity: 0; transform: scale(0.2); }
            55.0%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 2: 'O' (starts at 28px -> reaches logo at ~25.4%) */
          .cinematic-letter-2 { animation: cinematicLetter2 12.5s linear infinite; }
          @keyframes cinematicLetter2 {
            0%, 25.4% { opacity: 1; transform: scale(1); }
            27.0%, 54.9% { opacity: 0; transform: scale(0.2); }
            55.0%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 3: 'P' (starts at 43px -> reaches logo at ~27.2%) */
          .cinematic-letter-3 { animation: cinematicLetter3 12.5s linear infinite; }
          @keyframes cinematicLetter3 {
            0%, 27.2% { opacity: 1; transform: scale(1); }
            28.8%, 54.9% { opacity: 0; transform: scale(0.2); }
            55.0%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 4: 'S' (starts at 58px -> reaches logo at ~29.1%) */
          .cinematic-letter-4 { animation: cinematicLetter4 12.5s linear infinite; }
          @keyframes cinematicLetter4 {
            0%, 29.1% { opacity: 1; transform: scale(1); }
            30.7%, 54.9% { opacity: 0; transform: scale(0.2); }
            55.0%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 5: 'H' (starts at 72px -> reaches logo at ~31.0%) */
          .cinematic-letter-5 { animation: cinematicLetter5 12.5s linear infinite; }
          @keyframes cinematicLetter5 {
            0%, 31.0% { opacity: 1; transform: scale(1); }
            32.6%, 54.9% { opacity: 0; transform: scale(0.2); }
            55.0%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 6: 'O' (starts at 88px -> reaches logo at ~33.0%) */
          .cinematic-letter-6 { animation: cinematicLetter6 12.5s linear infinite; }
          @keyframes cinematicLetter6 {
            0%, 33.0% { opacity: 1; transform: scale(1); }
            34.6%, 54.9% { opacity: 0; transform: scale(0.2); }
            55.0%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 7: 'W' (starts at 105px -> reaches logo at ~35.0%) */
          .cinematic-letter-7 { animation: cinematicLetter7 12.5s linear infinite; }
          @keyframes cinematicLetter7 {
            0%, 35.0% { opacity: 1; transform: scale(1); }
            37.2%, 54.9% { opacity: 0; transform: scale(0.2); }
            55.0%, 100% { opacity: 1; transform: scale(1); }
          }

          /* 5. VINTAGE MOVIE CAMERA */
          .cinematic-camera-logo {
            animation: cinematicCameraLogo 12.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center center;
            will-change: transform, opacity, filter;
          }

          @keyframes cinematicCameraLogo {
            0%, 42.0% {
              opacity: 0;
              transform: scale(0.85) rotate(6deg);
              filter: blur(1.5px);
            }
            47.0%, 74.0% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: blur(0px);
            }
            76.5%, 82.0% {
              opacity: 0;
              transform: scale(0.85) rotate(-6deg);
              filter: blur(1.5px);
            }
            82.1%, 100% {
              opacity: 0;
              transform: scale(0.85);
            }
          }

          .cinematic-reel-left {
            transform-origin: 12px 8px;
            animation: cinematicReelSpin 2.4s linear infinite;
          }

          .cinematic-reel-right {
            transform-origin: 21px 8px;
            animation: cinematicReelSpin 2.4s linear infinite;
          }

          @keyframes cinematicReelSpin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          /* 6. LENS FOCAL FLARE: Origin centered exactly at camera lens opening */
          .cinematic-lens-flare {
            position: absolute;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: radial-gradient(circle, #FFFFFF 0%, #FFE082 40%, #F5A623 75%, transparent 100%);
            box-shadow: 0 0 10px #FFE082, 0 0 18px #F5A623;
            pointer-events: none;
            z-index: 3;
            animation: cinematicFlare 12.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center center;
            will-change: transform, opacity;
          }

          @keyframes cinematicFlare {
            0%, 47.0% {
              opacity: 0;
              transform: scale(0.2);
            }
            51.0%, 70.0% {
              opacity: 1;
              transform: scale(1);
            }
            73.0%, 76.0% {
              opacity: 0;
              transform: scale(0.2);
            }
            76.1%, 100% {
              opacity: 0;
              transform: scale(0.2);
            }
          }

          /* 7. V-SHAPED PROJECTOR BEAM: Originates precisely from the center of the lens glass */
          .cinematic-projector-beam {
            position: absolute;
            transform: translateY(-50%);
            width: 165px;
            height: 48px;
            pointer-events: none;
            z-index: 1;
            /* Narrow horizontal slit centered vertically on the lens, spreading to full cone */
            clip-path: polygon(0% 46%, 100% 0%, 100% 100%, 0% 54%);
            background: linear-gradient(
              90deg,
              rgba(255, 225, 100, 0.92) 0%,
              rgba(245, 166, 35, 0.58) 25%,
              rgba(245, 166, 35, 0.18) 68%,
              rgba(245, 166, 35, 0) 100%
            );
            filter: drop-shadow(0 0 10px rgba(245, 166, 35, 0.65));
            transform-origin: left center;
            animation: cinematicBeam 12.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            will-change: transform, opacity;
          }

          @keyframes cinematicBeam {
            0%, 47.0% {
              opacity: 0;
              transform: translateY(-50%) scaleX(0.05);
            }
            51.0%, 70.0% {
              opacity: 0.95;
              transform: translateY(-50%) scaleX(1);
            }
            73.0%, 76.0% {
              opacity: 0;
              transform: translateY(-50%) scaleX(0.85);
            }
            76.1%, 100% {
              opacity: 0;
              transform: translateY(-50%) scaleX(0.05);
            }
          }

          /* Accessibility: prefers-reduced-motion support */
          @media (prefers-reduced-motion: reduce) {
            .cinematic-original-logo,
            .cinematic-camera-logo,
            .cinematic-projector-beam,
            .cinematic-lens-flare,
            .cinematic-wordmark-track,
            .cinematic-letter,
            .cinematic-magnetic-aura {
              animation: none !important;
              transform: none !important;
              filter: none !important;
              opacity: 1 !important;
            }
            .cinematic-camera-logo,
            .cinematic-projector-beam,
            .cinematic-lens-flare,
            .cinematic-magnetic-aura {
              display: none !important;
            }
            .cinematic-original-logo {
              opacity: 1 !important;
            }
          }
        `}</style>
      )}
    </div>
  );
};

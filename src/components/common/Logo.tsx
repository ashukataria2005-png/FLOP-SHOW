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
    sm: { box: 28, radius: 7, lensY: 17.0, lensX: 26, deltaX: -10, deltaY: 3.0 },
    md: { box: 36, radius: 9, lensY: 21.75, lensX: 34, deltaX: -14, deltaY: 3.75 },
    lg: { box: 44, radius: 11, lensY: 26.5, lensX: 41, deltaX: -17, deltaY: 4.5 }
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
        overflow: 'visible',
        // Pass exact lens center delta coordinates to CSS keyframes
        ['--emerge-x' as string]: `${config.deltaX}px`,
        ['--emerge-y' as string]: `${config.deltaY}px`
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
                top: '-0.75px',
                left: 0,
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
                    Center of lens aperture is at y = (16.5 + 27) / 2 = 21.75px, x = 34.5px */}
                <rect x="25" y="17.5" width="2.5" height="8.5" rx="0.8" fill="#1A1A28" stroke="#F5A623" strokeWidth="0.8" />
                <polygon points="27.5,18 34.5,15.5 34.5,28 27.5,25.5" fill="url(#camGoldGrad)" stroke="#FFE082" strokeWidth="0.8" />
                <line x1="34.5" y1="16.5" x2="34.5" y2="27" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Full Vertical Aperture Illuminated Lens Gate: spans the complete lens opening */}
            <div
              className="cinematic-lens-flare"
              style={{
                left: `${config.lensX - 1.5}px`,
                top: `${config.lensY - 5.5}px`
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

      {/* Brand Wordmark: continuous track translation with coordinated progressive letter-by-letter absorption */}
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
          /* TIMING ARCHITECTURE (15.0s Total Seamless Loop with Calm Hold)            */
          /* ========================================================================= */

          /* 1. ORIGINAL FILM FRAME LOGO */
          .cinematic-original-logo {
            animation: cinematicOriginalLogo 15s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center center;
            will-change: transform, opacity, filter;
          }

          @keyframes cinematicOriginalLogo {
            /* Static initial rest */
            0%, 15.8% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: none;
            }
            /* Magnetic activation pulse */
            16.2%, 16.7% {
              opacity: 1;
              transform: scale(1.06);
              filter: drop-shadow(0 0 10px rgba(245, 166, 35, 0.8));
            }
            /* Magnetic pull phase: solidly visible, actively absorbing text */
            16.8%, 31.7% {
              opacity: 1;
              transform: scale(1.04);
              filter: drop-shadow(0 0 14px rgba(245, 166, 35, 0.9));
            }
            /* All letters absorbed: Logo sits alone, solid and holding the swallowed text */
            31.8%, 35.0% {
              opacity: 1;
              transform: scale(1);
              filter: drop-shadow(0 0 6px rgba(245, 166, 35, 0.45));
            }
            /* Smooth morph into vintage camera */
            37.9%, 39.6% {
              opacity: 0;
              transform: scale(0.85) rotate(-6deg);
              filter: blur(1.5px);
            }
            /* Hidden while camera is active */
            39.7%, 63.8% {
              opacity: 0;
              transform: scale(0.85) rotate(0deg);
              filter: blur(1.5px);
            }
            /* Smooth morph back from camera */
            67.1%, 68.8% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: blur(0px);
            }
            /* Static final rest before seamless loop (4.69s at end + 2.50s at start = 7.19s calm hold) */
            68.9%, 100% {
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
            animation: cinematicMagneticAura 15s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center center;
            will-change: transform, opacity;
          }

          @keyframes cinematicMagneticAura {
            0%, 15.8% {
              opacity: 0;
              transform: scale(0.9);
            }
            16.2%, 16.7% {
              opacity: 0.85;
              transform: scale(1.18);
            }
            20.0% {
              opacity: 0.7;
              transform: scale(1.1);
            }
            23.3% {
              opacity: 0.95;
              transform: scale(1.22);
            }
            27.5% {
              opacity: 0.8;
              transform: scale(1.14);
            }
            31.7% {
              opacity: 0.85;
              transform: scale(1.2);
            }
            32.1%, 33.3% {
              opacity: 0;
              transform: scale(0.85);
            }
            33.4%, 100% {
              opacity: 0;
              transform: scale(0.9);
            }
          }

          /* 3. CONTINUOUS WORDMARK TRACK:
             - Absorption: uniform continuous pull carrying letters directly toward the exact logo center (-30px)
             - Emergence: begins at 45.8% AFTER the yellow projector beam has fired and established (41.7%).
               Emerge as an intact, uncropped miniature (scale 0.05) from inside the full 10.5px lens aperture.
               ONE single continuous unbroken curve to resting position (60.0%) with ZERO intermediate stops or clipping.
             - Noticeable calm hold: 63.3% to 100% (and 0% to 16.7%) resting peacefully in original state. */
          .cinematic-wordmark-track {
            animation: cinematicWordmarkTrack 15s cubic-bezier(0.35, 0, 0.25, 1) infinite;
            transform-origin: left center;
            will-change: transform, opacity, filter;
          }

          @keyframes cinematicWordmarkTrack {
            /* 1. Static initial rest */
            0%, 16.7% {
              opacity: 1;
              transform: translate(0px, 0px) scale(1);
              filter: none;
              animation-timing-function: linear;
            }
            /* 2. Magnetic pull toward logo center (-138px): uniform continuous pull */
            31.7% {
              opacity: 1;
              transform: translate(-138px, 0px) scale(1);
              filter: drop-shadow(0 0 6px rgba(245, 166, 35, 0.45));
              animation-timing-function: step-end;
            }
            /* 3. Swallowed & hidden inside logo/camera while beam fires first */
            31.8%, 45.7% {
              opacity: 0;
              transform: translate(var(--emerge-x, -14px), var(--emerge-y, 3.75px)) scale(0.05);
              filter: drop-shadow(0 0 14px #FFE082) brightness(1.5);
            }
            /* 4. EMERGENCE: Starts at 45.8% AFTER the projector beam has already fired and expanded.
               Begins as a completely intact, uncropped miniature (scale 0.05) from the illuminated lens opening.
               Smoothly and continuously expands outward through the beam cone into final size and position. */
            45.8% {
              opacity: 1;
              transform: translate(var(--emerge-x, -14px), var(--emerge-y, 3.75px)) scale(0.05);
              filter: drop-shadow(0 0 10px #FFE082) brightness(1.35);
              animation-timing-function: cubic-bezier(0.22, 0.75, 0.35, 1);
            }
            60.0% {
              opacity: 1;
              transform: translate(0px, 0px) scale(1.0);
              filter: drop-shadow(0 0 4px rgba(245, 166, 35, 0.25)) brightness(1.03);
              animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            }
            /* 5. Subtle settling into crisp default state as projector beam fades */
            63.3%, 100% {
              opacity: 1;
              transform: translate(0px, 0px) scale(1.0);
              filter: none;
            }
          }

          /* 4. PROGRESSIVE PER-LETTER COMPRESSION INTO EXACT LOGO CENTRE (-30px):
             - Each letter stays 100% full-sized (scale: 1) until it enters the logo attraction zone.
             - As it travels toward the logo center (-30px), ONLY THAT LEADING LETTER progressively compresses horizontally.
             - Letters behind remain completely normal sized until their turn.
             - At the exact logo centre (-30px), the letter reaches near-zero width/scale and disappears.
             - No letter ever travels past the logo centre! */
          .cinematic-letter {
            will-change: transform, opacity;
            transform-origin: left center;
            display: inline-block;
          }

          /* Letter 0: 'F' (starts at 0px -> enters zone at 18.3% -> absorbed at exact centre at 19.9%) */
          .cinematic-letter-0 { animation: cinematicLetter0 15s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
          @keyframes cinematicLetter0 {
            0%, 18.3% { opacity: 1; transform: scaleX(1) scaleY(1); }
            19.0% { opacity: 0.95; transform: scaleX(0.7) scaleY(0.92); }
            19.5% { opacity: 0.8; transform: scaleX(0.35) scaleY(0.8); }
            19.9%, 45.7% { opacity: 0; transform: scaleX(0.02) scaleY(0.1); }
            45.8%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 1: 'L' (starts at 14.1px -> enters zone at 20.0% -> absorbed at exact centre at 21.5%) */
          .cinematic-letter-1 { animation: cinematicLetter1 15s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
          @keyframes cinematicLetter1 {
            0%, 20.0% { opacity: 1; transform: scaleX(1) scaleY(1); }
            20.6% { opacity: 0.95; transform: scaleX(0.7) scaleY(0.92); }
            21.1% { opacity: 0.8; transform: scaleX(0.35) scaleY(0.8); }
            21.5%, 45.7% { opacity: 0; transform: scaleX(0.02) scaleY(0.1); }
            45.8%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 2: 'O' (starts at 27.2px -> enters zone at 21.6% -> absorbed at exact centre at 22.9%) */
          .cinematic-letter-2 { animation: cinematicLetter2 15s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
          @keyframes cinematicLetter2 {
            0%, 21.6% { opacity: 1; transform: scaleX(1) scaleY(1); }
            22.1% { opacity: 0.95; transform: scaleX(0.7) scaleY(0.92); }
            22.5% { opacity: 0.8; transform: scaleX(0.35) scaleY(0.8); }
            22.9%, 45.7% { opacity: 0; transform: scaleX(0.02) scaleY(0.1); }
            45.8%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 3: 'P' (starts at 44.3px -> enters zone at 23.2% -> absorbed at exact centre at 24.8%) */
          .cinematic-letter-3 { animation: cinematicLetter3 15s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
          @keyframes cinematicLetter3 {
            0%, 23.2% { opacity: 1; transform: scaleX(1) scaleY(1); }
            23.8% { opacity: 0.95; transform: scaleX(0.7) scaleY(0.92); }
            24.3% { opacity: 0.8; transform: scaleX(0.35) scaleY(0.8); }
            24.8%, 45.7% { opacity: 0; transform: scaleX(0.02) scaleY(0.1); }
            45.8%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 4: 'S' (starts at 59.4px -> enters zone at 24.9% -> absorbed at exact centre at 26.4%) */
          .cinematic-letter-4 { animation: cinematicLetter4 15s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
          @keyframes cinematicLetter4 {
            0%, 24.9% { opacity: 1; transform: scaleX(1) scaleY(1); }
            25.5% { opacity: 0.95; transform: scaleX(0.7) scaleY(0.92); }
            26.0% { opacity: 0.8; transform: scaleX(0.35) scaleY(0.8); }
            26.4%, 45.7% { opacity: 0; transform: scaleX(0.02) scaleY(0.1); }
            45.8%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 5: 'H' (starts at 74.0px -> enters zone at 26.5% -> absorbed at exact centre at 28.0%) */
          .cinematic-letter-5 { animation: cinematicLetter5 15s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
          @keyframes cinematicLetter5 {
            0%, 26.5% { opacity: 1; transform: scaleX(1) scaleY(1); }
            27.1% { opacity: 0.95; transform: scaleX(0.7) scaleY(0.92); }
            27.6% { opacity: 0.8; transform: scaleX(0.35) scaleY(0.8); }
            28.0%, 45.7% { opacity: 0; transform: scaleX(0.02) scaleY(0.1); }
            45.8%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 6: 'O' (starts at 90.6px -> enters zone at 28.2% -> absorbed at exact centre at 29.8%) */
          .cinematic-letter-6 { animation: cinematicLetter6 15s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
          @keyframes cinematicLetter6 {
            0%, 28.2% { opacity: 1; transform: scaleX(1) scaleY(1); }
            28.8% { opacity: 0.95; transform: scaleX(0.7) scaleY(0.92); }
            29.3% { opacity: 0.8; transform: scaleX(0.35) scaleY(0.8); }
            29.8%, 45.7% { opacity: 0; transform: scaleX(0.02) scaleY(0.1); }
            45.8%, 100% { opacity: 1; transform: scale(1); }
          }

          /* Letter 7: 'W' (starts at 107.7px -> enters zone at 29.9% -> absorbed at exact centre at 31.7%) */
          .cinematic-letter-7 { animation: cinematicLetter7 15s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
          @keyframes cinematicLetter7 {
            0%, 29.9% { opacity: 1; transform: scaleX(1) scaleY(1); }
            30.6% { opacity: 0.95; transform: scaleX(0.7) scaleY(0.92); }
            31.2% { opacity: 0.8; transform: scaleX(0.35) scaleY(0.8); }
            31.7%, 45.7% { opacity: 0; transform: scaleX(0.02) scaleY(0.1); }
            45.8%, 100% { opacity: 1; transform: scale(1); }
          }

          /* 5. VINTAGE MOVIE CAMERA */
          .cinematic-camera-logo {
            animation: cinematicCameraLogo 15s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center center;
            will-change: transform, opacity, filter;
          }

          @keyframes cinematicCameraLogo {
            0%, 35.0% {
              opacity: 0;
              transform: scale(0.85) rotate(6deg);
              filter: blur(1.5px);
            }
            39.2%, 61.7% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: blur(0px);
            }
            63.8%, 68.3% {
              opacity: 0;
              transform: scale(0.85) rotate(-6deg);
              filter: blur(1.5px);
            }
            68.4%, 100% {
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

          /* 6. LENS APERTURE ILLUMINATION: Full vertical gate illumination across complete lens opening */
          .cinematic-lens-flare {
            position: absolute;
            width: 3px;
            height: 11px;
            border-radius: 1.5px;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, #FFE082 50%, rgba(255, 255, 255, 0.95) 100%);
            box-shadow: 0 0 8px #FFE082, 0 0 16px rgba(245, 166, 35, 0.8), 2px 0 6px #FFF;
            pointer-events: none;
            z-index: 3;
            animation: cinematicFlare 15s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center center;
            will-change: transform, opacity;
          }

          @keyframes cinematicFlare {
            0%, 40.0% {
              opacity: 0;
              transform: scaleY(0.2) scaleX(0.5);
            }
            41.3%, 59.2% {
              opacity: 1;
              transform: scaleY(1) scaleX(1);
            }
            61.3%, 63.3% {
              opacity: 0;
              transform: scaleY(0.2) scaleX(0.5);
            }
            63.4%, 100% {
              opacity: 0;
            }
          }

          /* 7. V-SHAPED PROJECTOR BEAM: Originates from the FULL VERTICAL APERTURE of the camera lens */
          .cinematic-projector-beam {
            position: absolute;
            transform: translateY(-50%);
            width: 165px;
            height: 48px;
            pointer-events: none;
            z-index: 1;
            /* Full vertical lens opening (39% to 61% = 10.5px aperture height) spreading to full cone */
            clip-path: polygon(0% 39%, 100% 0%, 100% 100%, 0% 61%);
            background: linear-gradient(
              90deg,
              rgba(255, 235, 130, 0.96) 0%,
              rgba(245, 166, 35, 0.6) 24%,
              rgba(245, 166, 35, 0.2) 68%,
              rgba(245, 166, 35, 0) 100%
            );
            filter: drop-shadow(0 0 10px rgba(245, 166, 35, 0.65));
            transform-origin: left center;
            animation: cinematicBeam 15s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            will-change: transform, opacity;
          }

          @keyframes cinematicBeam {
            0%, 40.8% {
              opacity: 0;
              transform: translateY(-50%) scaleX(0.04);
            }
            /* Beam fires at 41.7% — establishing golden projector light BEFORE text appears */
            41.7% {
              opacity: 0.95;
              transform: translateY(-50%) scaleX(0.06);
              animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1);
            }
            46.7%, 59.2% {
              opacity: 0.95;
              transform: translateY(-50%) scaleX(1.0);
              animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            }
            61.3%, 63.3% {
              opacity: 0;
              transform: translateY(-50%) scaleX(0.9);
            }
            63.4%, 100% {
              opacity: 0;
              transform: translateY(-50%) scaleX(0.04);
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

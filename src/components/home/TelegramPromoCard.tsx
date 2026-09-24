import { Send, Star, ArrowUpRight, Zap } from 'lucide-react';

interface TelegramPromoCardProps {
  channelUrl?: string;
}

export const TelegramPromoCard: React.FC<TelegramPromoCardProps> = ({
  channelUrl
}) => {
  // Configured invite link or fallback to official channel link
  const defaultUrl = 'https://t.me/flopshow_official';
  let targetUrl = channelUrl;
  if (!targetUrl) {
    try {
      targetUrl = localStorage.getItem('flopshow_telegram_link') || defaultUrl;
    } catch {
      targetUrl = defaultUrl;
    }
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 'var(--max-width, 1400px)',
        margin: '28px auto',
        padding: '0 20px',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* Subtle ambient blue glow behind the card */}
      <div
        style={{
          position: 'absolute',
          inset: '0 20px',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(37, 99, 235, 0.22) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 75%)',
          filter: 'blur(32px)',
          borderRadius: '24px',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Main Glassmorphic Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(24, 24, 27, 0.9) 45%, rgba(30, 58, 138, 0.35) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '20px',
          padding: '24px 28px',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(37, 99, 235, 0.15)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          overflow: 'hidden'
        }}
      >
        {/* Decorative corner light accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* Left Side: Icon, Header & Value Points */}
        <div style={{ flex: '1 1 520px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header with Circular Telegram Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0088cc 0%, #29b6f6 100%)',
                boxShadow: '0 4px 18px rgba(0, 136, 204, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0
              }}
            >
              <Send size={22} style={{ transform: 'translate(-1px, 1px)' }} />
            </div>

            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#38BDF8',
                  marginBottom: '2px'
                }}
              >
                <Zap size={13} fill="#38BDF8" />
                <span>OFFICIAL COMMUNITY</span>
              </div>
              <h3
                style={{
                  fontSize: 'clamp(20px, 3.2vw, 26px)',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  margin: 0,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}
              >
                Join Our Telegram Channel Now
              </h3>
            </div>
          </div>

          {/* Value Points with Glowing Bullet Stars */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Star
                size={16}
                fill="#38BDF8"
                color="#38BDF8"
                style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))', flexShrink: 0 }}
              />
              <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.92)' }}>
                Request Any Movies & Web Series
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Star
                size={16}
                fill="#38BDF8"
                color="#38BDF8"
                style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))', flexShrink: 0 }}
              />
              <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.92)' }}>
                Daily High-Speed Updates & Direct Releases
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Star
                size={16}
                fill="#38BDF8"
                color="#38BDF8"
                style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))', flexShrink: 0 }}
              />
              <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.92)' }}>
                Instant Bug Reports & Feature Requests
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: High-Visibility Glowing CTA Button */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 28px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0088cc 0%, #0284c7 50%, #0369a1 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '15px',
              letterSpacing: '0.01em',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.5), 0 0 15px rgba(56, 189, 248, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(2, 132, 199, 0.7), 0 0 25px rgba(56, 189, 248, 0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(2, 132, 199, 0.5), 0 0 15px rgba(56, 189, 248, 0.4)';
            }}
          >
            <Send size={18} />
            <span>Join Telegram</span>
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
};

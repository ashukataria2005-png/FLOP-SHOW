import React from 'react';

export const BrandPromoCard: React.FC = () => {
  return (
    <div style={{ padding: '0 20px', margin: '36px 0 20px' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(22, 22, 34, 0.7) 0%, rgba(14, 14, 22, 0.9) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: 'clamp(24px, 4vw, 36px)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Subtle background warm ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 166, 35, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* Small gold category tag */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.16em',
            color: 'var(--brand-gold)',
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}
        >
          THE FLOPSHOW EDIT
        </div>

        {/* Headline */}
        <h3
          style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
            lineHeight: 1.15,
            marginBottom: '14px'
          }}
        >
          No noise. Just good stories.
        </h3>

        {/* Paragraph */}
        <p
          style={{
            fontSize: '15px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '560px'
          }}
        >
          From midnight thrillers to slow-burn romances, find the film that fits the room you are in. New titles land every week.
        </p>
      </div>
    </div>
  );
};

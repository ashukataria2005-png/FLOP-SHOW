import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Crown, Sparkles } from 'lucide-react';
import { ContentItem } from '../../types/content';

interface OnlyOnFlopshowRowProps {
  catalog: ContentItem[];
  onSelect: (item: ContentItem) => void;
}

export const OnlyOnFlopshowRow: React.FC<OnlyOnFlopshowRowProps> = ({ catalog, onSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Exclusive titles for "Only on FlopShow"
  const exclusiveItems = React.useMemo(() => {
    // Select standout high-prestige series and flagship movies
    const items = catalog.filter(c =>
      c.isFeatured ||
      c.isHero ||
      c.rating >= 8.4 ||
      (c.genres && c.genres.some(g => ['Thriller', 'Crime', 'Drama', 'Action'].includes(g)))
    );
    return (items.length > 0 ? items : catalog).slice(0, 15);
  }, [catalog]);

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [exclusiveItems]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (exclusiveItems.length === 0) return null;

  return (
    <section
      style={{
        margin: '32px 0',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box'
      }}
      aria-label="Only on FlopShow Originals & Exclusives"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          maxWidth: 'var(--max-width, 1400px)',
          margin: '0 auto 16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(245, 197, 24, 0.25), rgba(217, 119, 6, 0.25))',
              border: '1px solid rgba(245, 197, 24, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold, #F5C518)'
            }}
          >
            <Crown size={18} />
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: 'var(--brand-gold, #F5C518)',
                textTransform: 'uppercase'
              }}
            >
              ORIGINALS & EXCLUSIVES
            </div>
            <h2
              style={{
                fontSize: 'clamp(18px, 2.5vw, 22px)',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: 0,
                letterSpacing: '-0.01em'
              }}
            >
              Only on FlopShow
            </h2>
          </div>
        </div>
      </div>

      {/* Tall Poster Carousel */}
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll('left')}
            aria-label="Scroll left"
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '42px',
              height: '64px',
              borderRadius: '8px',
              backgroundColor: 'rgba(10, 10, 15, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
            }}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll('right')}
            aria-label="Scroll right"
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '42px',
              height: '64px',
              borderRadius: '8px',
              backgroundColor: 'rgba(10, 10, 15, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
            }}
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Horizontal Track */}
        <div
          ref={scrollRef}
          className="no-scrollbar scrollbar-none"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            overflowX: 'auto',
            padding: '12px 20px 24px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {exclusiveItems.map(item => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                flex: '0 0 auto',
                width: 'clamp(140px, 20vw, 200px)',
                // Extra-tall vertical aspect ratio (~1:2 or elongated 9:16 portrait)
                aspectRatio: '1/1.9',
                borderRadius: '16px',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                backgroundColor: '#14141F',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.7)',
                scrollSnapAlign: 'start',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease, border-color 0.3s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)';
                e.currentTarget.style.boxShadow = '0 24px 48px rgba(0, 0, 0, 0.9), 0 0 20px rgba(245, 197, 24, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(245, 197, 24, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.7)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              {/* Full Character Art Poster */}
              <img
                src={item.posterUrl}
                alt={item.title}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  display: 'block'
                }}
                onError={e => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80';
                }}
              />

              {/* FLOPSHOW Exclusive Tag on Top Left */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(10, 10, 15, 0.75)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(245, 197, 24, 0.5)',
                  color: 'var(--brand-gold, #F5C518)',
                  fontSize: '9.5px',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Sparkles size={10} />
                <span>ORIGINAL</span>
              </div>

              {/* Frameless Sleek Bottom Gradient with Title and Tag */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(7, 7, 10, 0.98) 0%, rgba(7, 7, 10, 0.6) 28%, transparent 55%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '14px 12px'
                }}
              >
                <h4
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    margin: '0 0 4px',
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {item.title}
                </h4>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontWeight: 600
                  }}
                >
                  <span>{item.genres?.[0] || 'Drama'}</span>
                  <span>•</span>
                  <span>★ {item.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

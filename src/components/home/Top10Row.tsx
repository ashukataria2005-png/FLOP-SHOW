import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { ContentItem } from '../../types/content';
import { getResolvedTop10 } from '../../utils/top10Rotation';

interface Top10RowProps {
  catalog: ContentItem[];
  onSelect: (item: ContentItem) => void;
}

export const Top10Row: React.FC<Top10RowProps> = ({ catalog, onSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [updateTick, setUpdateTick] = useState(0);

  // Listen to admin or daily update changes
  useEffect(() => {
    const handleUpdate = () => setUpdateTick(t => t + 1);
    window.addEventListener('flopshow_top10_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('flopshow_top10_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Compute 24-hour deterministic daily lineup or admin manual curated items
  const { items: top10Items } = React.useMemo(() => {
    return getResolvedTop10(catalog);
  }, [catalog, updateTick]);

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
  }, [top10Items]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (top10Items.length === 0) return null;

  return (
    <section
      style={{
        margin: '28px 0',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box'
      }}
      aria-label="Top 10 in FlopShow Today"
    >
      {/* Row Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          marginBottom: '14px',
          maxWidth: 'var(--max-width, 1400px)',
          margin: '0 auto 14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(245, 197, 24, 0.25))',
              border: '1px solid rgba(245, 197, 24, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold, #F5C518)'
            }}
          >
            <Flame size={18} fill="var(--brand-gold, #F5C518)" color="var(--brand-gold, #F5C518)" />
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: 'var(--brand-gold, #F5C518)',
                textTransform: 'uppercase'
              }}
            >
              {/* DAILY RANKINGS */}
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
              Top 10 in FlopShow Today
            </h2>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel Wrapper */}
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

        {/* Horizontal Scroll Track with Hidden Scrollbar across all browsers */}
        <div
          ref={scrollRef}
          className="top10-scroll-track no-scrollbar scrollbar-none"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            overflowX: 'auto',
            padding: '12px 20px 24px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {top10Items.map((item, index) => {
            const rank = index + 1;
            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                style={{
                  flex: '0 0 auto',
                  display: 'flex',
                  alignItems: 'flex-end',
                  cursor: 'pointer',
                  position: 'relative',
                  scrollSnapAlign: 'start',
                  transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  paddingRight: '8px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                {/* Prominent Scaled Rank Number occupying dedicated left space */}
                <div
                  className="top10-rank-number"
                  style={{
                    letterSpacing: rank === 10 ? '-0.09em' : '-0.04em'
                  }}
                >
                  {rank}
                </div>

                {/* Poster Card */}
                <div
                  className="top10-poster-card"
                  style={{
                    width: 'clamp(135px, 19vw, 180px)',
                    aspectRatio: '2/3',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 2,
                    backgroundColor: '#16161F',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.75)',
                    flexShrink: 0
                  }}
                >
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src =
                        '';
                    }}
                  />

                  {/* Gradient bottom overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(10, 10, 15, 0.95) 0%, rgba(10, 10, 15, 0.4) 30%, transparent 60%)',
                      pointerEvents: 'none'
                    }}
                  />

                  {/* Card Bottom: "Top 3" / "Top 10" badge */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      right: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      zIndex: 3
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: rank <= 3 ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.18)',
                        color: rank <= 3 ? '#0E0E12' : '#FFFFFF',
                        backdropFilter: 'blur(8px)',
                        textTransform: 'uppercase'
                      }}
                    >
                      {rank <= 3 ? '★ Top 3' : 'Top 10'}
                    </span>

                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.85)'
                      }}
                    >
                      {item.type === 'series' ? 'Series' : 'Movie'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        /* Completely invisible horizontal scrollbar */
        .top10-scroll-track::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        /* Scaled, prominent rank numbers with refined dark charcoal / matte black styling */
        .top10-rank-number {
          font-size: 100px;
          line-height: 0.85;
          font-weight: 900;
          font-family: 'Impact', 'Bebas Neue', 'Arial Black', sans-serif;
          user-select: none;
          position: relative;
          z-index: 1;
          margin-right: -12px;
          flex-shrink: 0;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          color: #121214;
          background: #121214;
          -webkit-background-clip: text;
          -webkit-text-fill-color: #121214;
          -webkit-text-stroke: 1.5px rgba(90, 90, 100, 0.6);
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.75));
        }

        @media (max-width: 480px) {
          .top10-scroll-track {
            gap: 10px !important;
            padding: 8px 12px 18px !important;
          }
          .top10-poster-card {
            width: clamp(110px, 30vw, 130px) !important;
          }
          .top10-rank-number {
            font-size: 76px !important;
            margin-right: -10px !important;
            -webkit-text-stroke: 1.2px rgba(90, 90, 100, 0.6);
          }
        }

        @media (min-width: 768px) {
          .top10-rank-number {
            font-size: 140px;
            line-height: 0.82;
            margin-right: -16px;
            -webkit-text-stroke: 1.5px rgba(90, 90, 100, 0.6);
          }
        }
      `}</style>
    </section>
  );
};

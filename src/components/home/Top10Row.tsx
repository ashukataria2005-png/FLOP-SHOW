import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { ContentItem } from '../../types/content';

interface Top10RowProps {
  catalog: ContentItem[];
  onSelect: (item: ContentItem) => void;
}

export const Top10Row: React.FC<Top10RowProps> = ({ catalog, onSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Compute curated or computed Top 10 items
  const top10Items = React.useMemo(() => {
    let savedIds: string[] = [];
    try {
      const raw = localStorage.getItem('flopshow_top10_ids');
      if (raw) savedIds = JSON.parse(raw);
    } catch (_) {}

    const selected: ContentItem[] = [];
    const seen = new Set<string>();

    // 1. Fill from custom admin saved IDs in specified order
    if (Array.isArray(savedIds) && savedIds.length > 0) {
      for (const id of savedIds) {
        const found = catalog.find(c => c.id === id);
        if (found && !seen.has(found.id)) {
          seen.add(found.id);
          selected.push(found);
        }
      }
    }

    // 2. If fewer than 10, fill from highest rating / popular items
    if (selected.length < 10) {
      const remainingCandidates = [...catalog]
        .filter(c => !seen.has(c.id))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));

      for (const cand of remainingCandidates) {
        if (selected.length >= 10) break;
        seen.add(cand.id);
        selected.push(cand);
      }
    }

    return selected.slice(0, 10);
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
              DAILY RANKINGS
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

        {/* Horizontal Scroll Track */}
        <div
          ref={scrollRef}
          className="no-scrollbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            overflowX: 'auto',
            padding: '12px 20px 24px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
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
                  paddingRight: '6px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                {/* Massive Outlined / Hollow Rank Number overlapping left edge */}
                <div
                  style={{
                    fontSize: 'clamp(86px, 11vw, 120px)',
                    fontWeight: 900,
                    lineHeight: 0.8,
                    letterSpacing: '-0.08em',
                    color: 'transparent',
                    WebkitTextStroke: '3.5px rgba(255, 255, 255, 0.55)',
                    textShadow: '0 0 20px rgba(0,0,0,0.8)',
                    fontFamily: 'Impact, "Arial Black", "Bebas Neue", sans-serif',
                    userSelect: 'none',
                    position: 'relative',
                    zIndex: 1,
                    marginRight: '-28px',
                    filter: 'drop-shadow(2px 4px 10px rgba(0,0,0,0.9))'
                  }}
                >
                  {rank}
                </div>

                {/* Poster Card */}
                <div
                  style={{
                    width: 'clamp(130px, 18vw, 175px)',
                    aspectRatio: '2/3',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 2,
                    backgroundColor: '#16161F',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.75)'
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
                        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80';
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

                  {/* Card Bottom: "Top 10" or "Recently Added" pill */}
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
                        backgroundColor: rank <= 3 ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.15)',
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
                        color: 'rgba(255, 255, 255, 0.8)'
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
    </section>
  );
};

import React, { useRef } from 'react';
import { ContentItem } from '../../types/content';
import { ContentCard } from '../cards/ContentCard';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface ContentSectionProps {
  categoryLabel?: string;
  title: string;
  items: ContentItem[];
  onSelect: (item: ContentItem) => void;
  onSeeAll?: () => void;
}

export const ContentSection: React.FC<ContentSectionProps> = ({
  categoryLabel,
  title,
  items,
  onSelect,
  onSeeAll
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const distance = direction === 'left' ? -380 : 380;
    scrollRef.current.scrollBy({ left: distance, behavior: 'smooth' });
  };

  return (
    <section style={{ margin: '32px 0', position: 'relative' }}>
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '0 20px',
          marginBottom: '14px'
        }}
      >
        <div>
          {categoryLabel && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: 'var(--brand-gold)',
                textTransform: 'uppercase',
                marginBottom: '4px'
              }}
            >
              {categoryLabel}
            </div>
          )}
          <h2
            style={{
              fontSize: 'clamp(20px, 3vw, 24px)',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.01em',
              lineHeight: 1.2
            }}
          >
            {title}
          </h2>
        </div>

        {onSeeAll && (
          <button
            onClick={onSeeAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              transition: 'color var(--transition-fast)'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <span>See all</span>
            <ChevronRight size={15} />
          </button>
        )}
      </div>

      {/* Row Container with Desktop Navigation arrows */}
      <div style={{ position: 'relative' }}>
        {/* Desktop Left Scroll button */}
        <button
          onClick={() => handleScroll('left')}
          className="section-scroll-arrow left"
          aria-label="Scroll left"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Horizontal Card Track */}
        <div
          ref={scrollRef}
          className="content-row-track no-scrollbar scrollbar-none"
          style={{
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            padding: '4px 20px 16px',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {items.map(item => (
            <div
              key={item.id}
              style={{
                scrollSnapAlign: 'start',
                flexShrink: 0,
                width: 'clamp(150px, 22vw, 190px)'
              }}
            >
              <ContentCard item={item} onSelect={onSelect} />
            </div>
          ))}
        </div>

        {/* Desktop Right Scroll button */}
        <button
          onClick={() => handleScroll('right')}
          className="section-scroll-arrow right"
          aria-label="Scroll right"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      <style>{`
        .content-row-track::-webkit-scrollbar {
          display: none;
        }
        .section-scroll-arrow {
          display: none;
          position: absolute;
          top: 40%;
          transform: translateY(-50%);
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(18, 18, 26, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          align-items: center;
          justify-content: center;
          z-index: 10;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
        }
        .section-scroll-arrow:hover {
          background: var(--brand-gold);
          color: #0E0E12;
          border-color: var(--brand-gold);
        }
        .section-scroll-arrow.left {
          left: 6px;
        }
        .section-scroll-arrow.right {
          right: 6px;
        }
        @media (min-width: 900px) {
          .section-scroll-arrow {
            display: flex;
          }
        }
      `}</style>
    </section>
  );
};

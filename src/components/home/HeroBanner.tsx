import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ContentItem } from '../../types/content';
import { useApp } from '../../context/AppContext';
import { Play, Star, ChevronRight, ChevronLeft, Video } from 'lucide-react';

interface HeroBannerProps {
  item?: ContentItem;
  items?: ContentItem[];
  onViewDetails: (item: ContentItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ item, items, onViewDetails }) => {
  const { isOwned, playTrailer, monetizationMode, hasActiveSubscription } = useApp();

  // Deduplicate and resolve active slides
  const slides = React.useMemo(() => {
    if (items && items.length > 0) {
      const seen = new Set<string>();
      return items.filter(it => {
        if (!it || !it.id || seen.has(it.id)) return false;
        seen.add(it.id);
        return true;
      });
    }
    return item ? [item] : [];
  }, [items, item]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Swipe handling
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Auto-slide every 5 seconds (5000ms), paused on hover or touch hold
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const interval = window.setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length, isPaused, nextSlide]);

  // Touch swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const deltaX = touchStartXRef.current - touchEndXRef.current;
      if (Math.abs(deltaX) > 40) {
        if (deltaX > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  if (slides.length === 0) return null;

  const currentItem = slides[currentIndex] || slides[0];
  const owned = isOwned(currentItem.id);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '480px',
        maxHeight: '620px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '24px 20px 32px',
        boxSizing: 'border-box'
      }}
      className="hero-banner-container"
    >
      {/* Cinematic Backdrop Image with Smooth Fade Transition */}
      {slides.map((slide, idx) => (
        <img
          key={slide.id}
          src={slide.backdropUrl || slide.posterUrl}
          alt={slide.title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 25%',
            zIndex: 0,
            opacity: idx === currentIndex ? 1 : 0,
            transition: 'opacity 0.8s ease-in-out',
            pointerEvents: 'none'
          }}
        />
      ))}

      {/* Cinematic Vignette Gradients */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(7, 7, 10, 0.25) 0%, rgba(7, 7, 10, 0.6) 45%, rgba(7, 7, 10, 0.94) 85%, #07070A 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 30% 30%, transparent 40%, rgba(7, 7, 10, 0.7) 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* Left / Right Carousel Navigation Arrows (visible when slides > 1) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="hero-nav-arrow hero-nav-prev"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(10, 10, 16, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
            }}
            title="Previous Slide"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="hero-nav-arrow hero-nav-next"
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(10, 10, 16, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
            }}
            title="Next Slide"
            aria-label="Next Slide"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Hero Content Information */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Category Label with Dash */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.15em',
            color: 'var(--brand-gold)',
            textTransform: 'uppercase'
          }}
        >
          <span style={{ width: '24px', height: '2px', backgroundColor: 'var(--brand-gold)', display: 'inline-block' }} />
          <span>{currentItem.trendingPosition === 1 ? 'TRENDING #1 • ' : ''}{currentItem.categoryLabel || 'FEATURED PREMIERE'}</span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(32px, 5.5vw, 56px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
            lineHeight: 1.05,
            margin: '2px 0 6px'
          }}
        >
          {currentItem.title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: 'clamp(13.5px, 2vw, 16px)',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.55,
            maxWidth: '560px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {currentItem.description}
        </p>

        {/* Metadata Row: Star Rating, Year, Duration, Language */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: '4px 0 12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#FFFFFF', fontWeight: 700 }}>
            <Star size={16} fill="var(--brand-gold)" color="var(--brand-gold)" />
            <span>{currentItem.rating.toFixed(1)}</span>
          </div>

          <span>{currentItem.releaseYear}</span>

          <span>{currentItem.runtime || (currentItem.seasonsCount ? `${currentItem.seasonsCount} Seasons` : '2h 00m')}</span>

          <span
            style={{
              padding: '2px 9px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            {currentItem.language}
          </span>
        </div>

        {/* Action Buttons: Watch Now / Buy, Watch Trailer, and Details */}
        <div className="hero-actions-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onViewDetails(currentItem)}
            className="btn btn-primary btn-lg"
            style={{ minWidth: '140px' }}
          >
            <Play size={18} fill="currentColor" />
            <span>
              {monetizationMode === 'SUBSCRIPTION'
                ? (hasActiveSubscription || owned || currentItem.isFree || currentItem.price === 0 ? 'Watch now' : 'Subscribe to Watch')
                : (owned || currentItem.isFree || currentItem.price === 0 ? 'Watch now' : `Buy for ₹${currentItem.price}`)}
            </span>
          </button>

          <button
            onClick={() => playTrailer(currentItem)}
            className="btn btn-secondary btn-lg"
            style={{ minWidth: '120px' }}
          >
            <Video size={18} color="var(--brand-gold)" />
            <span>Trailer</span>
          </button>

          <button
            onClick={() => onViewDetails(currentItem)}
            className="btn btn-secondary btn-lg"
            style={{ minWidth: '110px' }}
          >
            <span>Details</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Pagination Dots at Bottom */}
      {slides.length > 1 && (
        <div
          className="hero-pagination-dots"
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10
          }}
        >
          {slides.map((slide, idx) => (
            <button
              key={`dot-${slide.id}`}
              onClick={() => goToSlide(idx)}
              style={{
                width: idx === currentIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '9999px',
                backgroundColor: idx === currentIndex ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.35)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0
              }}
              title={`Go to slide ${idx + 1}`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .hero-banner-container {
            padding: 40px 48px 52px;
            min-height: 540px;
          }
        }
        @media (max-width: 640px) {
          .hero-banner-container {
            padding: 20px 16px 28px !important;
            min-height: 440px !important;
          }
          .hero-actions-row {
            width: 100% !important;
            gap: 10px !important;
          }
          .hero-actions-row .btn {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            padding: 12px 14px !important;
            font-size: 13.5px !important;
          }
          .hero-nav-arrow {
            display: none !important;
          }
          .hero-pagination-dots {
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            bottom: 12px !important;
          }
        }
        .hero-nav-arrow:hover {
          background-color: rgba(245, 197, 24, 0.25) !important;
          border-color: var(--brand-gold, #F5C518) !important;
          color: var(--brand-gold, #F5C518) !important;
        }
      `}</style>
    </div>
  );
};

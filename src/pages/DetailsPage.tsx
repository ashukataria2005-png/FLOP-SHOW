import React, { useState, useEffect, useMemo } from 'react';
import { ContentItem, Episode } from '../types/content';
import { useApp } from '../context/AppContext';
import { EpisodeCard } from '../components/cards/EpisodeCard';
import { api } from '../services/api';
import {
  ArrowLeft,
  Play,
  Plus,
  Check,
  Star,
  Video,
  Clock,
  Zap,
  Download,
  Loader2,
  Volume2
} from 'lucide-react';

interface DetailsPageProps {
  item: ContentItem;
  onBack: () => void;
  onSelectItem: (item: ContentItem) => void;
}

type TabType = 'episodes' | 'more-like-this' | 'more-details';

export const DetailsPage: React.FC<DetailsPageProps> = ({ item, onBack, onSelectItem }) => {
  const {
    isOwned,
    openPlanSelector,
    startPlaying,
    playTrailer,
    inMyList,
    toggleMyList,
    activeEpisode,
    catalog,
    getProgress,
    monetizationMode,
    hasActiveSubscription,
    openWatchPassModal,
    isAuthenticated,
    showToast
  } = useApp();

  const [details, setDetails] = useState<ContentItem>(item);
  const [downloading, setDownloading] = useState(false);
  const [passStatus, setPassStatus] = useState<{
    hasActivePass: boolean;
    activePass: any;
    pendingPass: any;
    isExpired: boolean;
  }>({
    hasActivePass: false,
    activePass: null,
    pendingPass: null,
    isExpired: false
  });

  // Tab State: default to 'episodes' for series, 'more-like-this' for standalone movies
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    item.type === 'series' ? 'episodes' : 'more-like-this'
  );

  // Sync tab when switching items
  useEffect(() => {
    setActiveTab(item.type === 'series' ? 'episodes' : 'more-like-this');
  }, [item.id, item.type]);

  const handleDownload = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to download content.', 'info');
      return;
    }
    setDownloading(true);
    try {
      const res = await api.media.downloadContent(details.id);
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
        showToast(`Starting download: ${details.title}`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Offline download is only available on 7-Day & 15-Day Watch Passes, 1-Month Ownership, and VIP Subscriptions.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const getInitialSeasonNumber = (seasonsList?: { seasonNumber: number }[]) => {
    if (!seasonsList || seasonsList.length === 0) return 1;
    const hasS1 = seasonsList.some(s => s.seasonNumber === 1);
    return hasS1 ? 1 : seasonsList[0].seasonNumber;
  };

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(() =>
    getInitialSeasonNumber(item.seasons)
  );

  useEffect(() => {
    setDetails(item);
    api.content.getDetails(item.id)
      .then(full => {
        if (full) {
          setDetails(full);
          if (full.type === 'series' && full.seasons && full.seasons.length > 0) {
            setSelectedSeasonNumber(prev => {
              const seasonExists = full.seasons!.some(s => s.seasonNumber === prev);
              if (seasonExists) return prev;
              return getInitialSeasonNumber(full.seasons);
            });
          }
        }
      })
      .catch(() => {});

    // Check user pass status for this specific item
    if (isAuthenticated) {
      api.watchPasses.getContentStatus(item.id)
        .then(res => {
          if (res) {
            setPassStatus({
              hasActivePass: Boolean(res.hasActivePass),
              activePass: res.activePass || null,
              pendingPass: res.pendingPass || null,
              isExpired: Boolean(res.isExpired)
            });
          }
        })
        .catch(() => {});
    }
  }, [item.id, isAuthenticated]);

  const currentItem = details || item;
  const isSeries = currentItem.type === 'series';
  const seasons = currentItem.seasons || [];
  const activeSeason = seasons.find(s => s.seasonNumber === selectedSeasonNumber) || seasons[0];
  const episodes = activeSeason?.episodes || [];
  const owned = isOwned(currentItem.id);
  const isInList = inMyList(currentItem.id);

  // Available audio tracks for horizontal language slider
  const availableLanguages = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    const add = (lang: string) => {
      const clean = lang.trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        list.push(clean);
      }
    };

    if (currentItem.language) add(currentItem.language);
    const itemLangs = (currentItem as any).languages;
    if (Array.isArray(itemLangs)) {
      itemLangs.forEach((l: any) => {
        if (typeof l === 'string') add(l);
      });
    }
    // High-fidelity standard languages
    ['Hindi', 'English', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Spanish'].forEach(l => add(l));
    return list;
  }, [currentItem]);

  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => currentItem.language || 'Hindi');

  // Related titles (More Like This) in same genre or category
  const relatedTitles = useMemo(() => {
    return (catalog || []).filter(
      c => c.id !== currentItem.id && c.genres.some(g => currentItem.genres.includes(g))
    ).slice(0, 12);
  }, [catalog, currentItem]);

  const isFreeItem = Boolean(currentItem.isFree || currentItem.price === 0);
  const hasPass = Boolean(passStatus.hasActivePass);
  const canWatch = isFreeItem || owned || hasPass || (monetizationMode === 'SUBSCRIPTION' && hasActiveSubscription);

  const handlePrimaryAction = () => {
    if (canWatch) {
      if (currentItem.type === 'series' && currentItem.seasons?.length) {
        const firstEp = currentItem.seasons
          .flatMap(s => s.episodes ?? [])
          .sort((a, b) => {
            if ((a.seasonNumber ?? 0) !== (b.seasonNumber ?? 0))
              return (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0);
            return (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0);
          })[0];
        startPlaying(currentItem, firstEp);
      } else {
        startPlaying(currentItem);
      }
    } else {
      showToast('Subscribe or get a Watch Pass to watch this title', 'info');
      openPlanSelector(currentItem);
    }
  };

  const handlePlayEpisode = (episode: Episode) => {
    if (canWatch) {
      startPlaying(currentItem, episode);
    } else {
      showToast('Subscribe or get a Watch Pass to watch this title', 'info');
      openPlanSelector(currentItem);
    }
  };

  // Tone tags derived from genre & title
  const toneTags = useMemo(() => {
    const tags: string[] = [];
    if (currentItem.genres?.includes('Crime') || currentItem.genres?.includes('Action')) tags.push('Gritty', 'Adrenaline-Fueled');
    if (currentItem.genres?.includes('Thriller') || currentItem.genres?.includes('Mystery')) tags.push('Suspenseful', 'Mind-Bending');
    if (currentItem.genres?.includes('Comedy')) tags.push('Witty', 'Feel-Good');
    if (currentItem.genres?.includes('Drama')) tags.push('Emotional', 'Compelling');
    if (currentItem.genres?.includes('Horror')) tags.push('Ominous', 'Dark');
    if (tags.length === 0) tags.push('Compelling', 'Atmospheric', 'Immersive');
    return Array.from(new Set(tags));
  }, [currentItem.genres]);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: 'var(--bg-black, #07070A)' }}>
      {/* Floating Back Navigation Button on top left */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          zIndex: 30
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill, 9999px)',
            backgroundColor: 'rgba(10, 10, 15, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245, 197, 24, 0.25)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(10, 10, 15, 0.75)')}
        >
          <ArrowLeft size={16} />
          <span>Back to browse</span>
        </button>
      </div>

      {/* TASK 2: CLEAN DETAILS MODAL HERO / TRAILER POSTER (NO TEXT OVERLAY) */}
      {/* Top container renders ONLY the clean high-res backdrop image or video trailer cleanly */}
      <div
        className="details-hero-container"
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(280px, 42vw, 500px)',
          overflow: 'hidden',
          backgroundColor: '#0A0A10'
        }}
      >
        <img
          src={currentItem.backdropUrl || currentItem.posterUrl}
          alt={currentItem.title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
            zIndex: 0
          }}
          onError={e => {
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=80';
          }}
        />

        {/* Clean bottom gradient vignette fading into body background black */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #07070A 0%, rgba(7, 7, 10, 0.5) 35%, transparent 70%)',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* CONTENT BODY BELOW HERO: Title, Metadata, Language Slider, Actions, Synopsis, and 3-Tab Section */}
      <div
        style={{
          maxWidth: 'var(--max-width, 1400px)',
          margin: '0 auto',
          padding: '24px 20px 60px',
          boxSizing: 'border-box'
        }}
      >
        {/* Title and Category Tag */}
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: 'var(--brand-gold, #F5C518)',
              textTransform: 'uppercase',
              marginBottom: '6px'
            }}
          >
            {currentItem.categoryLabel || `${currentItem.type.toUpperCase()} • ${currentItem.genres?.join(' • ')}`}
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4.8vw, 50px)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
              lineHeight: 1.1,
              margin: 0
            }}
          >
            {currentItem.title}
          </h1>
        </div>

        {/* Metadata Badges Row: Match %, Release Year, Maturity Badge, Seasons / Runtime, HD, Star Rating */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '14px',
            color: 'var(--text-secondary, #9CA3AF)',
            marginBottom: '18px'
          }}
        >
          {/* Match Percentage (Green) */}
          <span style={{ color: '#10B981', fontWeight: 800 }}>
            {Math.round(Math.min(99, Math.max(86, (currentItem.rating || 8.0) * 10)))}% Match
          </span>

          {/* Release Year */}
          <span style={{ fontWeight: 600 }}>{currentItem.releaseYear}</span>

          {/* Maturity Rating Badge */}
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 700
            }}
          >
            {currentItem.rating >= 8.5 ? 'U/A 16+' : 'U/A 13+'}
          </span>

          {/* Season Count or Runtime */}
          <span style={{ fontWeight: 600 }}>
            {isSeries
              ? `${seasons.length > 0 ? seasons.length : (currentItem.seasonsCount || 1)} Seasons`
              : currentItem.runtime}
          </span>

          {/* HD Badge */}
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.05em'
            }}
          >
            HD
          </span>

          {/* Star Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--brand-gold, #F5C518)', fontWeight: 700 }}>
            <Star size={15} fill="var(--brand-gold, #F5C518)" />
            <span>{currentItem.rating.toFixed(1)}</span>
          </div>

          {currentItem.director && (
            <span style={{ color: '#9CA3AF', fontSize: '13.5px' }}>
              Directed by <strong style={{ color: '#FFFFFF' }}>{currentItem.director}</strong>
            </span>
          )}
        </div>

        {/* TASK 3: HORIZONTAL SCROLLABLE AUDIO / LANGUAGE PILLS SLIDER */}
        {/* Placed right below metadata badges and above Play / Download buttons */}
        <div style={{ marginBottom: '22px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px'
            }}
          >
            <Volume2 size={13} color="var(--brand-gold, #F5C518)" />
            <span>Audio & Language Options</span>
          </div>

          <div
            className="no-scrollbar scrollbar-none"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              flexWrap: 'nowrap',
              padding: '4px 0',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {availableLanguages.map(lang => {
              const isActive = selectedLanguage.toLowerCase() === lang.toLowerCase();
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLanguage(lang)}
                  style={{
                    flex: '0 0 auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: isActive ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#0E0E12' : '#FFFFFF',
                    border: isActive ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.12)',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive ? '0 0 16px rgba(245, 197, 24, 0.35)' : 'none'
                  }}
                >
                  {isActive && <Play size={12} fill="#0E0E12" />}
                  <span>{lang}</span>
                  {isActive && <span style={{ fontSize: '10px', opacity: 0.85 }}>[Active]</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action CTAs: Play / Download / Watch Pass / Trailer / My List */}
        <div
          className="details-actions-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '26px'
          }}
        >
          {/* Primary Action Button */}
          <button
            onClick={handlePrimaryAction}
            className="btn btn-primary btn-lg"
            style={{ minWidth: '150px' }}
          >
            <Play size={18} fill="#0E0E12" />
            <span>
              {canWatch
                ? 'Watch now'
                : 'Subscribe to Watch'}
            </span>
          </button>

          {/* Download CTA (Available when user can watch) */}
          {canWatch && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn btn-secondary btn-lg"
              style={{
                minWidth: '140px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              title="Download for offline viewing"
            >
              {downloading ? (
                <Loader2 size={18} className="animate-spin" color="var(--brand-gold, #F5C518)" />
              ) : (
                <Download size={18} color="var(--brand-gold, #F5C518)" />
              )}
              <span>{downloading ? 'Preparing...' : 'Download'}</span>
            </button>
          )}

          {/* Watch Pass CTA (Shown when user does NOT already permanently own this title and it is not free) */}
          {!isFreeItem && !owned && (
            <>
              {passStatus.hasActivePass ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1.5px solid #10B981',
                    color: '#34D399',
                    fontSize: '13px',
                    fontWeight: 800
                  }}
                >
                  <Clock size={16} />
                  <span>
                    Pass Active: {passStatus.activePass?.remainingHours > 24 ? `${passStatus.activePass.remainingDays}d left` : `${passStatus.activePass?.remainingHours || 1}h left`}
                  </span>
                </div>
              ) : passStatus.pendingPass ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(245, 197, 24, 0.12)',
                    border: '1.5px solid var(--brand-gold, #F5C518)',
                    color: 'var(--brand-gold, #F5C518)',
                    fontSize: '13px',
                    fontWeight: 800
                  }}
                >
                  <Clock size={16} />
                  <span>Watch Pass Pending Review</span>
                </div>
              ) : (
                <button
                  onClick={() => openWatchPassModal(currentItem)}
                  className="btn btn-secondary btn-lg"
                  style={{
                    minWidth: '160px',
                    borderColor: 'rgba(245, 197, 24, 0.4)',
                    backgroundColor: 'rgba(245, 197, 24, 0.1)',
                    color: 'var(--brand-gold, #F5C518)'
                  }}
                >
                  <Zap size={17} />
                  <span>{passStatus.isExpired ? 'Renew Watch Pass' : 'Get Watch Pass (From ₹19)'}</span>
                </button>
              )}
            </>
          )}

          {/* Watch Trailer CTA */}
          {Boolean(currentItem.trailerUrl) && (
            <button
              onClick={() => playTrailer(currentItem)}
              className="btn btn-secondary btn-lg"
              style={{ minWidth: '150px' }}
            >
              <Video size={18} color="var(--brand-gold, #F5C518)" />
              <span>Watch Trailer</span>
            </button>
          )}

          {/* My List Toggle */}
          <button
            onClick={() => toggleMyList(currentItem.id)}
            className="btn btn-secondary btn-lg"
            style={{ minWidth: '130px' }}
          >
            {isInList ? (
              <>
                <Check size={18} color="var(--badge-owned-bg, #10B981)" />
                <span>In My list</span>
              </>
            ) : (
              <>
                <Plus size={18} />
                <span>My list</span>
              </>
            )}
          </button>
        </div>

        {/* Synopsis & About Summary */}
        <p
          style={{
            fontSize: 'clamp(14.5px, 2vw, 16px)',
            color: 'rgba(255, 255, 255, 0.88)',
            lineHeight: 1.65,
            maxWidth: '840px',
            margin: '0 0 36px'
          }}
        >
          {currentItem.description || currentItem.about}
        </p>

        {/* TASK 4 & 5: THREE-TAB SECTION: [EPISODES] | [MORE LIKE THIS] | [MORE DETAILS] */}
        <div style={{ marginTop: '20px' }}>
          {/* Tab Bar Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '28px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
            className="no-scrollbar scrollbar-none"
          >
            {/* Tab 1: Episodes (visible for series) */}
            {isSeries && (
              <button
                type="button"
                onClick={() => setActiveTab('episodes')}
                style={{
                  position: 'relative',
                  padding: '12px 4px 16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '17px',
                  fontWeight: 800,
                  color: activeTab === 'episodes' ? '#FFFFFF' : '#9CA3AF',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  transition: 'color 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>Episodes</span>
                {activeTab === 'episodes' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      left: 0,
                      right: 0,
                      height: '3px',
                      backgroundColor: 'var(--brand-gold, #F5C518)',
                      borderRadius: '3px 3px 0 0'
                    }}
                  />
                )}
              </button>
            )}

            {/* Tab 2: More Like This */}
            <button
              type="button"
              onClick={() => setActiveTab('more-like-this')}
              style={{
                position: 'relative',
                padding: '12px 4px 16px',
                background: 'none',
                border: 'none',
                fontSize: '17px',
                fontWeight: 800,
                color: activeTab === 'more-like-this' ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                letterSpacing: '0.01em',
                transition: 'color 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span>More Like This</span>
              {activeTab === 'more-like-this' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0,
                    right: 0,
                    height: '3px',
                    backgroundColor: 'var(--brand-gold, #F5C518)',
                    borderRadius: '3px 3px 0 0'
                  }}
                />
              )}
            </button>

            {/* Tab 3: More Details */}
            <button
              type="button"
              onClick={() => setActiveTab('more-details')}
              style={{
                position: 'relative',
                padding: '12px 4px 16px',
                background: 'none',
                border: 'none',
                fontSize: '17px',
                fontWeight: 800,
                color: activeTab === 'more-details' ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                letterSpacing: '0.01em',
                transition: 'color 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span>More Details</span>
              {activeTab === 'more-details' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0,
                    right: 0,
                    height: '3px',
                    backgroundColor: 'var(--brand-gold, #F5C518)',
                    borderRadius: '3px 3px 0 0'
                  }}
                />
              )}
            </button>
          </div>

          {/* TAB 1: EPISODES LISTING */}
          {activeTab === 'episodes' && isSeries && (
            <div>
              {/* Season Selection and Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    {activeSeason?.title || `Season ${activeSeason?.seasonNumber || 1}`}
                  </h2>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary, #9CA3AF)', fontWeight: 600 }}>
                    {episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
                  </span>
                </div>

                {/* Season Pills Selector */}
                {seasons.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {seasons.map(s => {
                      const isSelected = selectedSeasonNumber === s.seasonNumber;
                      return (
                        <button
                          key={s.seasonNumber}
                          type="button"
                          onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                          style={{
                            padding: '7px 18px',
                            borderRadius: 'var(--radius-pill, 9999px)',
                            fontSize: '13px',
                            fontWeight: 700,
                            backgroundColor: isSelected ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.08)',
                            color: isSelected ? '#0E0E12' : '#FFFFFF',
                            border: isSelected ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.12)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {s.title || `Season ${s.seasonNumber}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Episode Cards List */}
              {episodes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {episodes.map(ep => (
                    <EpisodeCard
                      key={ep.id}
                      episode={ep}
                      seriesPosterUrl={currentItem.posterUrl}
                      isCurrent={activeEpisode?.id === ep.id}
                      progress={getProgress(currentItem.id, ep.id)}
                      onPlay={handlePlayEpisode}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '36px 20px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(22, 22, 34, 0.4)',
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    textAlign: 'center',
                    color: 'var(--text-secondary, #9CA3AF)',
                    fontSize: '14px'
                  }}
                >
                  No episodes available in this season yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MORE LIKE THIS (Compact Posters on Mobile) */}
          {activeTab === 'more-like-this' && (
            <div>
              <div className="details-more-like-this-grid">
                {relatedTitles.map(rec => (
                  <div
                    key={rec.id}
                    onClick={() => onSelectItem(rec)}
                    className="details-more-card"
                  >
                    <div className="details-more-poster-wrap">
                      <img
                        src={rec.posterUrl || rec.backdropUrl}
                        alt={rec.title}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(10, 10, 15, 0.85)',
                          fontSize: '10px',
                          fontWeight: 800,
                          color: 'var(--brand-gold, #F5C518)'
                        }}
                      >
                        ★ {rec.rating.toFixed(1)}
                      </div>
                    </div>
                    <div className="details-more-info">
                      <h4 className="details-more-title" title={rec.title}>
                        {rec.title}
                      </h4>
                      <div className="details-more-meta">
                        <span style={{ color: '#10B981', fontWeight: 700 }}>
                          {Math.round(Math.min(99, Math.max(85, rec.rating * 10)))}%
                        </span>
                        <span>•</span>
                        <span>{rec.releaseYear}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MORE DETAILS (Structured Table & Metadata Specs) */}
          {activeTab === 'more-details' && (
            <div
              style={{
                backgroundColor: 'rgba(22, 22, 34, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '28px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '32px'
              }}
            >
              {/* Left Column: Creators, Cast, Genres */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                    Director(s)
                  </h4>
                  <p style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: 600, margin: 0 }}>
                    {currentItem.director || 'FlopShow Direction Team'}
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                    Writer(s)
                  </h4>
                  <p style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: 600, margin: 0 }}>
                    {(currentItem as any).writer || (currentItem as any).writers || currentItem.director || 'Original Screenplay'}
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                    Full Cast
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {currentItem.cast && currentItem.cast.length > 0 ? (
                      currentItem.cast.map(actor => (
                        <span
                          key={actor}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: '13px',
                            color: '#FFFFFF',
                            fontWeight: 600
                          }}
                        >
                          {actor}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '14px', color: '#9CA3AF' }}>Ensemble Cast</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                    Categorized Genres
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {currentItem.genres?.map(genre => (
                      <span
                        key={genre}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(245, 197, 24, 0.12)',
                          border: '1px solid rgba(245, 197, 24, 0.3)',
                          color: 'var(--brand-gold, #F5C518)',
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Tone Tags, Maturity Details, Audio & Subtitles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                    This {isSeries ? 'Series' : 'Movie'} Is:
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {toneTags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38BDF8',
                          fontSize: '12.5px',
                          fontWeight: 700
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                    Maturity Rating & Content Descriptors
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 800,
                        flexShrink: 0
                      }}
                    >
                      {currentItem.rating >= 8.5 ? 'U/A 16+' : 'U/A 13+'}
                    </span>
                    <p style={{ fontSize: '13px', color: '#D1D5DB', margin: 0, lineHeight: 1.5 }}>
                      Recommended for ages {currentItem.rating >= 8.5 ? '16' : '13'} and up. May contain graphic violence, mature language, intense psychological sequences, and substance use.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                    Available Audio
                  </h4>
                  <p style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: 600, margin: 0 }}>
                    {availableLanguages.join(', ')} [Original]
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                    Subtitles
                  </h4>
                  <p style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: 600, margin: 0 }}>
                    English [CC], Hindi, Tamil, Telugu, Spanish
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .details-actions-row {
            width: 100% !important;
            gap: 10px !important;
          }
          .details-actions-row .btn {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            padding: 12px 14px !important;
            font-size: 13.5px !important;
          }
        }
      `}</style>
    </div>
  );
};

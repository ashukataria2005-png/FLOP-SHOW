import React, { useState, useEffect } from 'react';
import { ContentItem, Episode } from '../types/content';
import { useApp } from '../context/AppContext';
import { EpisodeCard } from '../components/cards/EpisodeCard';
import { ContentCard } from '../components/cards/ContentCard';
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
  Loader2
} from 'lucide-react';

interface DetailsPageProps {
  item: ContentItem;
  onBack: () => void;
  onSelectItem: (item: ContentItem) => void;
}

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

    if (isAuthenticated) {
      api.watchPasses.getContentStatus(item.id)
        .then(res => {
          if (res) {
            setPassStatus({
              hasActivePass: Boolean(res.hasActivePass),
              activePass: res.activePass,
              pendingPass: res.pendingPass,
              isExpired: Boolean(res.isExpired)
            });
          }
        })
        .catch(() => {});
    }
  }, [item.id, isAuthenticated]);

  const currentItem = details || item;
  const owned = isOwned(currentItem.id);
  const isInList = inMyList(currentItem.id);
  const isSeries = currentItem.type === 'series';
  const seasons = currentItem.seasons || [];

  // Current season episodes if series
  const activeSeason = seasons.find(s => s.seasonNumber === selectedSeasonNumber) || seasons[0];
  const episodes = activeSeason?.episodes || [];

  // Recommendations (same genre or other titles) from central catalog
  const recommendations = (catalog || []).filter(
    c => c.id !== currentItem.id && c.genres.some(g => currentItem.genres.includes(g))
  ).slice(0, 4);

  const isFreeItem = Boolean(currentItem.isFree || currentItem.price === 0);
  const hasPass = Boolean(passStatus.hasActivePass);
  const canWatch = isFreeItem || owned || hasPass || (monetizationMode === 'SUBSCRIPTION' && hasActiveSubscription);

  const handlePrimaryAction = () => {
    if (canWatch) {
      if (currentItem.type === 'series' && currentItem.seasons?.length) {
        // Resolve Ep 1 sorted ascending — never default to whatever array order arrives
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

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: 'var(--bg-black)' }}>
      {/* Back Navigation Button matching screenshot 3 */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          zIndex: 20
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'rgba(10, 10, 15, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245, 166, 35, 0.2)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(10, 10, 15, 0.7)')}
        >
          <ArrowLeft size={16} />
          <span>Back to browse</span>
        </button>
      </div>

      {/* Hero Backdrop Banner matching Screenshot 3 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '480px',
          maxHeight: '620px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '24px 20px 40px',
          boxSizing: 'border-box'
        }}
        className="details-hero-container"
      >
        {/* Backdrop Image */}
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
        />

        {/* Heavy dark vignette overlay to ensure text contrast */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(7, 7, 10, 0.4) 0%, rgba(7, 7, 10, 0.75) 50%, rgba(7, 7, 10, 0.98) 92%, #07070A 100%)',
            zIndex: 1
          }}
        />

        {/* Hero Details Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '720px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Tag: SERIES • MYSTERY in gold uppercase */}
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: 'var(--brand-gold)',
              textTransform: 'uppercase'
            }}
          >
            {currentItem.categoryLabel || `${currentItem.type.toUpperCase()} • ${currentItem.genres.join(' • ')}`}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: 'clamp(32px, 5.5vw, 54px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
              lineHeight: 1.05
            }}
          >
            {currentItem.title}
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: 'clamp(14px, 2vw, 16px)',
              color: 'rgba(255, 255, 255, 0.88)',
              lineHeight: 1.6,
              maxWidth: '580px'
            }}
          >
            {currentItem.description}
          </p>

          {/* Metadata Row matching Screenshot 3: ★ 9.1  2024  2 Seasons  Hindi  Directed by S. Banerjee */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: '4px 0 16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#FFFFFF', fontWeight: 700 }}>
              <Star size={16} fill="var(--brand-gold)" color="var(--brand-gold)" />
              <span>{currentItem.rating.toFixed(1)}</span>
            </div>

            <span>{currentItem.releaseYear}</span>

            <span>{isSeries ? `${seasons.length > 0 ? seasons.length : (currentItem.seasonsCount || 1)} Seasons` : currentItem.runtime}</span>

            <span
              style={{
                padding: '2px 8px',
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

            {currentItem.director && (
              <span style={{ color: 'var(--text-secondary)' }}>
                Directed by <strong>{currentItem.director}</strong>
              </span>
            )}
          </div>

          {/* Action CTAs: Watch now / Buy, Watch Trailer, and + My list */}
          <div className="details-actions-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
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
                  <Loader2 size={18} className="animate-spin" color="var(--brand-gold)" />
                ) : (
                  <Download size={18} color="var(--brand-gold)" />
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
                <Video size={18} color="var(--brand-gold)" />
                <span>Watch Trailer</span>
              </button>
            )}

            <button
              onClick={() => toggleMyList(currentItem.id)}
              className="btn btn-secondary btn-lg"
              style={{ minWidth: '130px' }}
            >
              {isInList ? (
                <>
                  <Check size={18} color="var(--badge-owned-bg)" />
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
        </div>
      </div>

      {/* Main Body Content */}
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '0 20px 40px' }}>
        {/* About Section matching Screenshot 3 */}
        <div style={{ margin: '24px 0 36px' }}>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#FFFFFF',
              marginBottom: '12px'
            }}
          >
            About the {isSeries ? 'series' : 'film'}
          </h2>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              maxWidth: '820px'
            }}
          >
            {currentItem.about}
          </p>

          {/* Cast Chips */}
          {currentItem.cast && currentItem.cast.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Cast & Credits
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {currentItem.cast.map(actor => (
                  <span
                    key={actor}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '13px',
                      color: '#FFFFFF'
                    }}
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* If Series: Seasons & Episodes Listing */}
        {isSeries && (
          <div style={{ margin: '36px 0' }}>
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
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Episodes
                </h2>
                {activeSeason && (
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {activeSeason.title || `Season ${activeSeason.seasonNumber}`} • {episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
                  </span>
                )}
              </div>

              {/* Season Selector Tabs */}
              {seasons.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {seasons.map(s => {
                    const isSelected = selectedSeasonNumber === s.seasonNumber;
                    return (
                      <button
                        key={s.seasonNumber}
                        onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                        style={{
                          padding: '7px 18px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: '13px',
                          fontWeight: 700,
                          backgroundColor: isSelected ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#0E0E12' : '#FFFFFF',
                          border: isSelected ? '1px solid var(--brand-gold)' : '1px solid rgba(255, 255, 255, 0.12)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        {s.title || `Season ${s.seasonNumber}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Episode Cards Grid/List */}
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
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}
              >
                No episodes available in this season yet.
              </div>
            )}
          </div>
        )}

        {/* Recommended Titles */}
        {recommendations.length > 0 && (
          <div style={{ margin: '48px 0 20px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginBottom: '18px' }}>
              You may also like
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '16px'
              }}
            >
              {recommendations.map(rec => (
                <ContentCard key={rec.id} item={rec} onSelect={onSelectItem} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .details-hero-container {
            padding: 50px 48px 60px;
            min-height: 520px;
          }
        }
        @media (max-width: 640px) {
          .details-hero-container {
            padding: 24px 16px 36px !important;
            min-height: 440px !important;
          }
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

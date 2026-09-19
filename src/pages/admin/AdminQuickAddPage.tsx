import React, { useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Film,
  Tv,
  Search,
  Check,
  AlertTriangle,
  Calendar,
  Star,
  Play,
  ArrowLeft,
  ExternalLink,
  Layers,
  Loader2,
  CheckCircle2,
  Edit3,
  ListFilter
} from 'lucide-react';

interface AdminQuickAddPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

interface SearchCandidate {
  providerId: string;
  title: string;
  year: number;
  type: 'MOVIE' | 'SERIES';
  poster: string;
  backdrop?: string;
  rating?: number;
  overview?: string;
  alreadyInFlopshow: boolean;
  existingContentId?: string;
}

interface ContentDetailsPreview {
  providerId: string;
  title: string;
  slug: string;
  type: 'MOVIE' | 'SERIES';
  releaseYear: number;
  description: string;
  tagline: string;
  about?: string;
  poster: string;
  backdrop: string;
  trailerUrl: string;
  language: string;
  genres: string[];
  runtime: string;
  rating: number;
  director: string;
  cast: string[];
  ageRating: string;
  suggestedPriceRupees: number;
  status: 'PUBLISHED' | 'DRAFT';
  featured: boolean;
  trending: boolean;
  alreadyExists: boolean;
  existingContentId?: string;
  seasons?: Array<{
    seasonNumber: number;
    title: string;
    episodes: Array<{
      episodeNumber: number;
      title: string;
      description: string;
      thumbnail: string;
      duration: string;
      durationSeconds: number;
    }>;
  }>;
}

export const AdminQuickAddPage: React.FC<AdminQuickAddPageProps> = ({ onNavigateTab }) => {
  const { showToast, refreshCatalog } = useApp();

  // Search Form State
  const [titleInput, setTitleInput] = useState('');
  const [yearInput, setYearInput] = useState('');
  const [typeInput, setTypeInput] = useState<'MOVIE' | 'SERIES'>('MOVIE');

  // Async States
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchCandidate[] | null>(null);

  // Detail / Preview State
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [previewDetails, setPreviewDetails] = useState<ContentDetailsPreview | null>(null);
  const [customPriceRupees, setCustomPriceRupees] = useState<number>(10);
  const [allowOverwrite, setAllowOverwrite] = useState(false);

  // Import Execution State
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessResult, setImportSuccessResult] = useState<{
    contentId: string;
    title: string;
    type: 'MOVIE' | 'SERIES';
    seasonsCount: number;
    episodesCount: number;
  } | null>(null);

  // Search Online Providers
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = titleInput.trim();
    if (!query) {
      showToast('Please enter a movie or series title to search.', 'info');
      return;
    }

    setIsSearching(true);
    setSearchResults(null);
    setPreviewDetails(null);
    setImportSuccessResult(null);

    try {
      const year = yearInput ? parseInt(yearInput, 10) : undefined;
      const res = await api.admin.searchMetadata(query, year, typeInput);
      setSearchResults(res.results || []);

      if (!res.results || res.results.length === 0) {
        showToast('No matching titles found. Try adjusting title or year.', 'info');
      } else if (res.results.length === 1) {
        // Automatically fetch details for single match
        handleSelectCandidate(res.results[0]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to search online metadata.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Select a match to preview full details
  const handleSelectCandidate = async (candidate: SearchCandidate) => {
    setIsLoadingDetails(true);
    try {
      const res = await api.admin.getMetadataDetails(candidate.providerId, candidate.type);
      setPreviewDetails(res.details);
      setCustomPriceRupees(res.details.suggestedPriceRupees || (candidate.type === 'MOVIE' ? 30 : 35));
      setAllowOverwrite(false);
      // Smooth scroll down to preview
      window.scrollTo({ top: 320, behavior: 'smooth' });
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch detailed metadata.', 'error');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!previewDetails) return;

    if (previewDetails.alreadyExists && !allowOverwrite) {
      showToast('Title already exists in FLOPSHOW catalog. Check overwrite box to replace.', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const payload = {
        title: previewDetails.title,
        slug: previewDetails.slug,
        type: previewDetails.type,
        releaseYear: previewDetails.releaseYear,
        description: previewDetails.description,
        tagline: previewDetails.tagline,
        about: previewDetails.about || previewDetails.description,
        poster: previewDetails.poster,
        backdrop: previewDetails.backdrop,
        trailerUrl: previewDetails.trailerUrl,
        language: previewDetails.language,
        genres: previewDetails.genres,
        duration: previewDetails.runtime,
        rating: previewDetails.rating,
        director: previewDetails.director,
        cast: previewDetails.cast,
        ageRating: previewDetails.ageRating,
        priceRupees: Number(customPriceRupees) >= 0 ? Number(customPriceRupees) : previewDetails.suggestedPriceRupees,
        seasons: previewDetails.seasons,
        status: 'PUBLISHED',
        overwrite: allowOverwrite
      };

      const res = await api.admin.importContent(payload);
      setImportSuccessResult(res.result);
      showToast(`"${res.result.title}" imported successfully to FLOPSHOW!`, 'success');
      await refreshCatalog();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      showToast(err.message || 'Import failed. Please review details.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Reset form to search again
  const handleReset = () => {
    setTitleInput('');
    setYearInput('');
    setSearchResults(null);
    setPreviewDetails(null);
    setImportSuccessResult(null);
  };

  // Extract YouTube embed URL safely
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    if (url.includes('youtube.com/watch?v=')) {
      const vid = url.split('v=')[1]?.split('&')[0];
      return vid ? `https://www.youtube.com/embed/${vid}` : null;
    }
    if (url.includes('youtu.be/')) {
      const vid = url.split('youtu.be/')[1]?.split('?')[0];
      return vid ? `https://www.youtube.com/embed/${vid}` : null;
    }
    return url;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)'
              }}
            >
              <Sparkles size={20} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
              Quick Add & Auto Import
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: '#9CA3AF', maxWidth: '720px', lineHeight: 1.5 }}>
            Instantly fetch and populate official metadata, real artwork posters, backdrop banners, ratings, and TV season/episode guides from online movie/TV databases directly into FLOPSHOW.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('admin-content')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Catalog</span>
        </button>
      </div>

      {/* SUCCESS MODAL / BANNER (Shown when import finishes) */}
      {importSuccessResult && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '32px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <CheckCircle2 size={32} color="#10B981" />
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Successfully Imported into FLOPSHOW Catalog!
              </h2>
              <p style={{ fontSize: '14px', color: '#D1FAE5', margin: '4px 0 0' }}>
                <strong>"{importSuccessResult.title}"</strong> has been successfully imported and <strong>PUBLISHED</strong> in your central database.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              margin: '18px 0',
              padding: '12px 18px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0,0,0,0.25)',
              fontSize: '13px',
              color: '#9CA3AF'
            }}
          >
            <div>Type: <strong style={{ color: '#FFFFFF' }}>{importSuccessResult.type}</strong></div>
            <div>Content ID: <strong style={{ color: '#FFFFFF' }}>{importSuccessResult.contentId}</strong></div>
            {importSuccessResult.type === 'SERIES' && (
              <>
                <div>Seasons: <strong style={{ color: '#FFFFFF' }}>{importSuccessResult.seasonsCount}</strong></div>
                <div>Episodes: <strong style={{ color: '#FFFFFF' }}>{importSuccessResult.episodesCount}</strong></div>
              </>
            )}
            <div>Initial Status: <strong style={{ color: '#10B981' }}>PUBLISHED (Active in Catalog)</strong></div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
            <button
              onClick={() => onNavigateTab('admin-editor', importSuccessResult.contentId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                color: '#0E0E12',
                fontWeight: 800,
                fontSize: '14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 197, 24, 0.3)'
              }}
            >
              <Edit3 size={18} />
              <span>Open in Content Editor</span>
            </button>

            <button
              onClick={() => onNavigateTab('admin-content')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '14px',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              <ListFilter size={18} />
              <span>View in Catalog</span>
            </button>

            <button
              onClick={handleReset}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#9CA3AF',
                fontWeight: 600,
                fontSize: '14px',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              Import Another Title
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: SEARCH & FETCH INPUT CARD */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '18px',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
        }}
      >
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
            {/* Title / Name */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#D1D5DB', marginBottom: '8px' }}>
                Title / Movie or Series Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  placeholder="e.g. Inception, Breaking Bad, Panchayat, Oppenheimer..."
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px 13px 40px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }}
                />
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
              </div>
            </div>

            {/* Release Year */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#D1D5DB', marginBottom: '8px' }}>
                Release Year <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 400 }}>(Optional helper)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={yearInput}
                  onChange={e => setYearInput(e.target.value)}
                  placeholder="e.g. 2010"
                  min={1900}
                  max={2035}
                  style={{
                    width: '100%',
                    padding: '13px 16px 13px 40px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }}
                />
                <Calendar size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
              </div>
            </div>

            {/* Type Selector Toggle */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#D1D5DB', marginBottom: '8px' }}>
                Content Type <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTypeInput('MOVIE')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: typeInput === 'MOVIE' ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: typeInput === 'MOVIE' ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: typeInput === 'MOVIE' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <Film size={16} />
                  <span>Movie</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTypeInput('SERIES')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: typeInput === 'SERIES' ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: typeInput === 'SERIES' ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: typeInput === 'SERIES' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <Tv size={16} />
                  <span>Series</span>
                </button>
              </div>
            </div>

            {/* Fetch Button */}
            <div>
              <button
                type="submit"
                disabled={isSearching || !titleInput.trim()}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  backgroundColor: 'var(--brand-gold, #F5C518)',
                  color: '#0E0E12',
                  fontWeight: 800,
                  fontSize: '15px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: isSearching || !titleInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSearching || !titleInput.trim() ? 0.6 : 1,
                  boxShadow: '0 4px 14px rgba(245, 197, 24, 0.25)'
                }}
              >
                {isSearching ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Searching Providers...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>FETCH DETAILS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* STEP 2: SEARCH CANDIDATES LIST */}
      {searchResults && searchResults.length > 0 && !previewDetails && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Matching Titles Found ({searchResults.length})
            </h2>
            <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
              Select the correct title to preview and import:
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {searchResults.map((item, index) => {
              const isFirstMatch = index === 0;
              return (
                <div
                  key={item.providerId}
                  onClick={() => handleSelectCandidate(item)}
                  style={{
                    backgroundColor: isFirstMatch ? 'rgba(245, 197, 24, 0.05)' : 'var(--bg-surface, #12121A)',
                    border: isFirstMatch ? '1.5px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    gap: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {isFirstMatch && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: 'var(--brand-gold, #F5C518)',
                        color: '#0E0E12',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderBottomLeftRadius: '8px'
                      }}
                    >
                      BEST MATCH
                    </div>
                  )}

                  {/* Poster Thumbnail */}
                  <div
                    style={{
                      width: '70px',
                      height: '105px',
                      borderRadius: '8px',
                      backgroundColor: '#1E1E2A',
                      flexShrink: 0,
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4B5563' }}>
                        {item.type === 'SERIES' ? <Tv size={24} /> : <Film size={24} />}
                      </div>
                    )}
                  </div>

                  {/* Content details */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: item.type === 'SERIES' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 197, 24, 0.2)',
                            color: item.type === 'SERIES' ? '#60A5FA' : 'var(--brand-gold, #F5C518)'
                          }}
                        >
                          {item.type}
                        </span>
                        <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>
                          {item.year}
                        </span>
                      </div>

                      <h3
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                          margin: '0 0 6px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.title}
                      </h3>

                      {item.overview && (
                        <p
                          style={{
                            fontSize: '12px',
                            color: '#9CA3AF',
                            margin: 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.4
                          }}
                        >
                          {item.overview}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                      {item.alreadyInFlopshow ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#F59E0B',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <AlertTriangle size={12} />
                          Already in Catalog
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                          Ready to Import
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--brand-gold, #F5C518)'
                        }}
                      >
                        Select &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading Details Overlay */}
      {isLoadingDetails && (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '18px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <Loader2 size={36} className="animate-spin" color="var(--brand-gold, #F5C518)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
            Fetching Complete Metadata & Artwork...
          </h3>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
            Retrieving high-resolution poster, backdrop, official trailers, and season/episode guides...
          </p>
        </div>
      )}

      {/* STEP 3: RICH PREVIEW & IMPORT ACTION CARD */}
      {previewDetails && !isLoadingDetails && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            marginBottom: '40px'
          }}
        >
          {/* Backdrop Header Banner */}
          <div
            style={{
              height: '280px',
              position: 'relative',
              backgroundImage: `url(${previewDetails.backdrop || previewDetails.poster})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '28px'
            }}
          >
            {/* Dark gradient overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, #12121A 0%, rgba(18, 18, 26, 0.7) 60%, rgba(18, 18, 26, 0.3) 100%)'
              }}
            />

            {/* Back button */}
            <button
              onClick={() => setPreviewDetails(null)}
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                zIndex: 2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} />
              <span>Change Selection</span>
            </button>

            {/* Title & Key Stats on top of backdrop */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
              {/* Poster Card */}
              <div
                style={{
                  width: '130px',
                  height: '190px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.8)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  flexShrink: 0,
                  backgroundColor: '#1E1E2A'
                }}
              >
                {previewDetails.poster ? (
                  <img
                    src={previewDetails.poster}
                    alt={previewDetails.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Film size={32} color="#6B7280" />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: previewDetails.type === 'SERIES' ? '#3B82F6' : 'var(--brand-gold, #F5C518)',
                      color: previewDetails.type === 'SERIES' ? '#FFFFFF' : '#0E0E12'
                    }}
                  >
                    {previewDetails.type}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#E5E7EB' }}>
                    {previewDetails.releaseYear}
                  </span>
                  <span style={{ color: '#6B7280' }}>&bull;</span>
                  <span style={{ fontSize: '13px', color: '#D1D5DB' }}>
                    {previewDetails.runtime}
                  </span>
                  <span style={{ color: '#6B7280' }}>&bull;</span>
                  <span style={{ fontSize: '13px', color: '#D1D5DB' }}>
                    {previewDetails.language}
                  </span>
                  <span style={{ color: '#6B7280' }}>&bull;</span>
                  <span style={{ fontSize: '12px', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', color: '#9CA3AF' }}>
                    {previewDetails.ageRating}
                  </span>
                </div>

                <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                  {previewDetails.title}
                </h2>

                {previewDetails.tagline && (
                  <p style={{ fontSize: '14px', color: 'var(--brand-gold, #F5C518)', fontStyle: 'italic', margin: '0 0 8px' }}>
                    "{previewDetails.tagline}"
                  </p>
                )}

                {/* Rating & Genres */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--brand-gold, #F5C518)', fontWeight: 700, fontSize: '14px' }}>
                    <Star size={16} fill="currentColor" />
                    <span>{previewDetails.rating.toFixed(1)}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {previewDetails.genres.map(g => (
                      <span
                        key={g}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: '#FFFFFF'
                        }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Details Body */}
          <div style={{ padding: '28px' }}>
            {/* Warning if already exists */}
            {previewDetails.alreadyExists && (
              <div
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px'
                }}
              >
                <AlertTriangle size={22} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#F59E0B', margin: '0 0 4px' }}>
                    Duplicate Title Detected in FLOPSHOW Catalog
                  </h4>
                  <p style={{ fontSize: '13px', color: '#FEF3C7', margin: 0, lineHeight: 1.5 }}>
                    "{previewDetails.title}" ({previewDetails.releaseYear}) already exists in your database with ID: <code>{previewDetails.existingContentId}</code>.
                    To prevent accidental duplicate catalog records, enable the overwrite checkbox below if you wish to refresh it with this data.
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '13px', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowOverwrite}
                      onChange={e => setAllowOverwrite(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Yes, overwrite and update the existing catalog item with fresh provider data</span>
                  </label>
                </div>
              </div>
            )}

            {/* Grid Layout: Details & Safe Import Config */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {/* Left Column: Synopsis, Cast, Director, Trailer */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }}>
                  Synopsis & Overview
                </h3>
                <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: 1.6, marginBottom: '20px' }}>
                  {previewDetails.description || 'No description provided by online metadata provider.'}
                </p>

                {previewDetails.director && (
                  <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                    <span style={{ color: '#9CA3AF', fontWeight: 600 }}>Director: </span>
                    <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{previewDetails.director}</span>
                  </div>
                )}

                {previewDetails.cast && previewDetails.cast.length > 0 && (
                  <div style={{ marginBottom: '20px', fontSize: '13px' }}>
                    <span style={{ color: '#9CA3AF', fontWeight: 600 }}>Starring Cast: </span>
                    <span style={{ color: '#FFFFFF' }}>{previewDetails.cast.join(', ')}</span>
                  </div>
                )}

                {/* Trailer Preview */}
                {previewDetails.trailerUrl && (
                  <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Play size={14} color="var(--brand-gold, #F5C518)" />
                        Official Trailer Linked
                      </span>
                      <a
                        href={previewDetails.trailerUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '12px', color: 'var(--brand-gold, #F5C518)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                      >
                        Open on YouTube <ExternalLink size={12} />
                      </a>
                    </div>
                    {getEmbedUrl(previewDetails.trailerUrl) && (
                      <div style={{ aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden' }}>
                        <iframe
                          src={getEmbedUrl(previewDetails.trailerUrl)!}
                          title="Trailer Preview"
                          style={{ width: '100%', height: '100%', border: 'none' }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Safe FLOPSHOW Defaults & Pricing */}
              <div>
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color="var(--brand-gold, #F5C518)" />
                    FLOPSHOW Import Safeguards
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#9CA3AF' }}>Published Status:</span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>PUBLISHED (Active upon Import)</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#9CA3AF' }}>Featured Banner:</span>
                      <span style={{ color: '#9CA3AF', fontWeight: 600 }}>OFF (Disabled)</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#9CA3AF' }}>Trending #1:</span>
                      <span style={{ color: '#9CA3AF', fontWeight: 600 }}>OFF (Disabled)</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#9CA3AF' }}>Main Full Video:</span>
                      <span style={{ color: '#10B981', fontWeight: 600 }}>Blank / Unconfigured</span>
                    </div>

                    {/* Price Configuration */}
                    <div style={{ paddingTop: '6px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                        FLOPSHOW Purchase Price (₹)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ position: 'relative', width: '120px' }}>
                          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-gold, #F5C518)', fontWeight: 800 }}>
                            ₹
                          </span>
                          <input
                            type="number"
                            value={customPriceRupees}
                            onChange={e => setCustomPriceRupees(Number(e.target.value))}
                            min={0}
                            style={{
                              width: '100%',
                              padding: '10px 10px 10px 28px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '15px',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          Default: ₹{previewDetails.type === 'MOVIE' ? '30 (Movie)' : '35 (Series)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Series Seasons / Episodes Summary */}
                {previewDetails.type === 'SERIES' && previewDetails.seasons && (
                  <div
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '14px',
                      padding: '18px',
                      marginBottom: '20px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <Tv size={18} color="#60A5FA" />
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        Series Structure Automatically Ready to Import
                      </h4>
                    </div>
                    <p style={{ fontSize: '13px', color: '#BFDBFE', margin: '0 0 10px' }}>
                      {previewDetails.seasons.length} Season(s) and {previewDetails.seasons.reduce((acc, s) => acc + s.episodes.length, 0)} Episode(s) detected with complete titles, episode numbers, thumbnails, and descriptions.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {previewDetails.seasons.map(s => (
                        <span
                          key={s.seasonNumber}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            color: '#FFFFFF'
                          }}
                        >
                          {s.title} ({s.episodes.length} eps)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Big Import Button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <button
                    onClick={handleExecuteImport}
                    disabled={isImporting || (previewDetails.alreadyExists && !allowOverwrite)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--brand-gold, #F5C518)',
                      color: '#0E0E12',
                      fontWeight: 900,
                      fontSize: '16px',
                      letterSpacing: '0.02em',
                      border: 'none',
                      cursor: isImporting || (previewDetails.alreadyExists && !allowOverwrite) ? 'not-allowed' : 'pointer',
                      opacity: isImporting || (previewDetails.alreadyExists && !allowOverwrite) ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 6px 20px rgba(245, 197, 24, 0.3)'
                    }}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Saving to FLOPSHOW Central Database...</span>
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        <span>IMPORT TO FLOPSHOW</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setPreviewDetails(null)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#9CA3AF',
                      fontWeight: 600,
                      fontSize: '14px',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel & Return to Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

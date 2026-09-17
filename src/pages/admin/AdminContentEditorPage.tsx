import React, { useState, useEffect, useCallback } from 'react';
import { api, API_BASE_URL } from '../../services/api';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { ContentType } from '../../types/content';
import { useApp } from '../../context/AppContext';
import { MediaPlayer, MediaPlayerSource } from '../../components/player/MediaPlayer';
import {
  ArrowLeft,
  Save,
  Upload,
  Film,
  Tv,
  Play,
  Plus,
  TrendingUp,
  Loader2,
  Video,
  Image as ImageIcon,
  Edit3,
  Trash2
} from 'lucide-react';

interface AdminContentEditorPageProps {
  contentId?: string; // 'new' or existing id
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminContentEditorPage: React.FC<AdminContentEditorPageProps> = ({
  contentId,
  onNavigateTab
}) => {
  const { showToast, refreshCatalog } = useApp();
  const isNew = !contentId || contentId === 'new' || contentId === 'new_movie' || contentId === 'new_series';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'pricing' | 'media' | 'seasons'>('info');

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<ContentType>(() => {
    if (contentId === 'new_series') return 'series';
    return 'movie';
  });
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [about, setAbout] = useState('');
  const [releaseYear, setReleaseYear] = useState<number>(2025);
  const [runtime, setRuntime] = useState('2h 10m');
  const [language, setLanguage] = useState('Hindi');
  const [genresInput, setGenresInput] = useState('Drama, Thriller');
  const [director, setDirector] = useState('');
  const [castInput, setCastInput] = useState('');
  const [rating, setRating] = useState<number>(8.5);

  // Pricing, Status & Ranking
  const [price, setPrice] = useState<number>(20);
  const [isFree, setIsFree] = useState<boolean>(false);
  const [status, setStatus] = useState<'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('PUBLISHED');
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [isTrending1, setIsTrending1] = useState<boolean>(false);
  const [displayPriority, setDisplayPriority] = useState<number>(0);

  // Artwork
  const [posterUrl, setPosterUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);

  // Media (Movies & Series Trailers)
  const [mainVideoUrl, setMainVideoUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingTrailer, setUploadingTrailer] = useState(false);
  const [uploadProgressVideo, setUploadProgressVideo] = useState<number>(0);
  const [uploadProgressTrailer, setUploadProgressTrailer] = useState<number>(0);

  // Seasons & Episodes (Series)
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [newSeasonTitle, setNewSeasonTitle] = useState('');

  // Episode Modal / Form
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [episodeDuration, setEpisodeDuration] = useState('45m');
  const [episodeSynopsis, setEpisodeSynopsis] = useState('');
  const [episodeVideoUrl, setEpisodeVideoUrl] = useState('');
  const [episodeThumbnailUrl, setEpisodeThumbnailUrl] = useState('');
  const [uploadingEpisodeVideo, setUploadingEpisodeVideo] = useState(false);
  const [uploadProgressEpisodeVideo, setUploadProgressEpisodeVideo] = useState<number>(0);
  const [uploadingEpisodeThumb, setUploadingEpisodeThumb] = useState(false);

  // VCDN Media & Transcoding State
  const [vcdnVideoId, setVcdnVideoId] = useState<string>('');
  const [vcdnStatus, setVcdnStatus] = useState<string>('');
  const [vcdnPlaybackUrl, setVcdnPlaybackUrl] = useState<string>('');
  const [_isVcdnPolling, setIsVcdnPolling] = useState<boolean>(false);

  // Episode VCDN State
  const [episodeVcdnVideoId, setEpisodeVcdnVideoId] = useState<string>('');
  const [episodeVcdnStatus, setEpisodeVcdnStatus] = useState<string>('');
  const [episodeVcdnPlaybackUrl, setEpisodeVcdnPlaybackUrl] = useState<string>('');

  // Preview Player State
  const [previewSource, setPreviewSource] = useState<MediaPlayerSource | null>(null);

  // Load existing content details
  useEffect(() => {
    if (!isNew && contentId) {
      loadContentDetails(contentId);
    }
  }, [contentId]);

  const loadContentDetails = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.content.getDetails(id);
      setTitle(data.title);
      setSlug(data.id);
      setType(data.type);
      setTagline(data.tagline || '');
      setDescription(data.description || '');
      setAbout(data.about || '');
      setReleaseYear(data.releaseYear || 2025);
      setRuntime(data.runtime || '');
      setLanguage(data.language || 'Hindi');
      setGenresInput(data.genres.join(', '));
      setDirector(data.director || '');
      setCastInput((data.cast || []).join(', '));
      setRating(data.rating || 8.0);
      setPrice(data.price || 0);
      setIsFree(data.price === 0);
      setStatus((data as any).status || 'PUBLISHED');
      setIsFeatured(Boolean(data.isFeatured));
      setIsTrending1(data.trendingPosition === 1);
      setDisplayPriority(data.displayPriority || 0);
      setPosterUrl(data.posterUrl || '');
      setBackdropUrl(data.backdropUrl || '');
      setTrailerUrl(data.trailerUrl || '');
      setMainVideoUrl(data.videoUrl || '');
      if ((data as any).vcdnVideoId) {
        setVcdnVideoId((data as any).vcdnVideoId);
        setVcdnStatus((data as any).vcdnStatus || 'READY');
        setVcdnPlaybackUrl((data as any).vcdnPlaybackUrl || data.videoUrl || '');
      }

      if (data.type === 'series' && data.seasons) {
        setSeasons(data.seasons);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load content details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startVcdnPolling = useCallback((vidId: string) => {
    if (!vidId) return;
    setIsVcdnPolling(true);
    const interval = window.setInterval(async () => {
      try {
        const check = await api.admin.getVcdnStatus(vidId);
        if (check.success && check.status) {
          setVcdnStatus(check.status);
          if (check.playbackUrl) {
            setVcdnPlaybackUrl(check.playbackUrl);
            setMainVideoUrl(check.playbackUrl);
          }
          if (check.status === 'READY') {
            window.clearInterval(interval);
            setIsVcdnPolling(false);
            showToast('✓ VCDN HLS stream transcoding complete! Ready for playback.', 'success');
          } else if (check.status === 'FAILED') {
            window.clearInterval(interval);
            setIsVcdnPolling(false);
            showToast('VCDN Transcoding failed.', 'error');
          }
        }
      } catch (err) {
        console.warn('VCDN status poll error:', err);
      }
    }, 5000);
  }, [showToast]);

  const handleManualCheckVcdnStatus = async () => {
    if (!vcdnVideoId) return;
    try {
      showToast('Checking VCDN status...', 'info');
      const check = await api.admin.getVcdnStatus(vcdnVideoId);
      if (check.success && check.status) {
        setVcdnStatus(check.status);
        if (check.playbackUrl) {
          setVcdnPlaybackUrl(check.playbackUrl);
          setMainVideoUrl(check.playbackUrl);
        }
        showToast(`VCDN Status: ${check.status}`, check.status === 'READY' ? 'success' : 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch VCDN status.', 'error');
    }
  };

  // Upload handlers
  const handleUploadPoster = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPoster(true);
      const res = await api.admin.uploadFile(file);
      setPosterUrl(res.url);
      showToast('Poster artwork uploaded successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Upload failed.', 'error');
    } finally {
      setUploadingPoster(false);
      e.target.value = '';
    }
  };

  const handleUploadBackdrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingBackdrop(true);
      const res = await api.admin.uploadFile(file);
      setBackdropUrl(res.url);
      showToast('Backdrop artwork uploaded successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Upload failed.', 'error');
    } finally {
      setUploadingBackdrop(false);
      e.target.value = '';
    }
  };

  const handleUploadTrailer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingTrailer(true);
      setUploadProgressTrailer(0);
      const res = await api.admin.uploadFile(file, pct => setUploadProgressTrailer(pct));
      setTrailerUrl(res.url);
      showToast('Trailer uploaded successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Trailer upload failed.', 'error');
    } finally {
      setUploadingTrailer(false);
      setUploadProgressTrailer(0);
      e.target.value = '';
    }
  };

  const handleUploadMainVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingVideo(true);
      setUploadProgressVideo(0);
      const res = await api.admin.uploadFile(file, pct => setUploadProgressVideo(pct));
      setMainVideoUrl(res.url);
      if (res.vcdnVideoId) {
        setVcdnVideoId(res.vcdnVideoId);
        setVcdnStatus(res.vcdnStatus || 'PROCESSING');
        if (res.playbackUrl) setVcdnPlaybackUrl(res.playbackUrl);
        showToast('Video uploaded to VCDN! Transcoding into HLS streams...', 'success');
        startVcdnPolling(res.vcdnVideoId);
      } else {
        showToast('Main video file uploaded successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Video upload failed.', 'error');
    } finally {
      setUploadingVideo(false);
      setUploadProgressVideo(0);
      e.target.value = '';
    }
  };

  const handleUploadEpisodeVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingEpisodeVideo(true);
      setUploadProgressEpisodeVideo(0);
      const res = await api.admin.uploadFile(file, pct => setUploadProgressEpisodeVideo(pct));
      setEpisodeVideoUrl(res.url);
      if (res.vcdnVideoId) {
        setEpisodeVcdnVideoId(res.vcdnVideoId);
        setEpisodeVcdnStatus(res.vcdnStatus || 'PROCESSING');
        if (res.playbackUrl) setEpisodeVcdnPlaybackUrl(res.playbackUrl);
        showToast('Episode video uploaded to VCDN! Processing...', 'success');
      } else {
        showToast('Episode video uploaded!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Episode upload failed.', 'error');
    } finally {
      setUploadingEpisodeVideo(false);
      setUploadProgressEpisodeVideo(0);
      e.target.value = '';
    }
  };

  const handleUploadEpisodeThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingEpisodeThumb(true);
      const res = await api.admin.uploadFile(file);
      setEpisodeThumbnailUrl(res.url);
      showToast('Episode thumbnail uploaded!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Thumbnail upload failed.', 'error');
    } finally {
      setUploadingEpisodeThumb(false);
      e.target.value = '';
    }
  };

  // Add Season
  const handleAddSeason = () => {
    const seasonNumber = seasons.length + 1;
    const title = newSeasonTitle.trim() || `Season ${seasonNumber}`;
    const newSeason = {
      seasonNumber,
      title,
      episodes: []
    };
    setSeasons(prev => [...prev, newSeason]);
    setSelectedSeasonNumber(seasonNumber);
    setNewSeasonTitle('');
    showToast(`Added ${title}!`, 'success');
  };

  const handleOpenAddEpisode = () => {
    const currentSeason = seasons.find(s => s.seasonNumber === selectedSeasonNumber);
    const nextNum = currentSeason ? currentSeason.episodes.length + 1 : 1;
    setEpisodeTitle('');
    setEpisodeNumber(nextNum);
    setEpisodeDuration('45m');
    setEpisodeSynopsis('');
    setEpisodeVideoUrl('');
    setEpisodeThumbnailUrl('');
    setEpisodeVcdnVideoId('');
    setEpisodeVcdnStatus('');
    setEpisodeVcdnPlaybackUrl('');
    setShowEpisodeModal(true);
  };

  const handleOpenEditEpisode = (ep: any) => {
    setEpisodeTitle(ep.title || '');
    setEpisodeNumber(ep.episodeNumber || 1);
    setEpisodeDuration(ep.duration || '45m');
    setEpisodeSynopsis(ep.synopsis || ep.description || '');
    setEpisodeVideoUrl(ep.videoUrl || '');
    setEpisodeThumbnailUrl(ep.thumbnailUrl || ep.thumbnail || '');
    setEpisodeVcdnVideoId(ep.vcdnVideoId || '');
    setEpisodeVcdnStatus(ep.vcdnStatus || '');
    setEpisodeVcdnPlaybackUrl(ep.vcdnPlaybackUrl || '');
    setShowEpisodeModal(true);
  };

  const handleDeleteEpisode = (epNum: number) => {
    setSeasons(prev =>
      prev.map(s => {
        if (s.seasonNumber === selectedSeasonNumber) {
          return {
            ...s,
            episodes: s.episodes.filter((e: any) => e.episodeNumber !== epNum)
          };
        }
        return s;
      })
    );
    showToast(`Removed Episode ${epNum}.`, 'info');
  };

  // Add / Save Episode to current season
  const handleSaveEpisode = () => {
    if (!episodeTitle.trim()) {
      showToast('Please provide an episode title.', 'error');
      return;
    }

    const currentSeason = seasons.find(s => s.seasonNumber === selectedSeasonNumber);
    if (!currentSeason) return;

    const newEp = {
      id: `${slug || 'series'}-s${selectedSeasonNumber}-e${episodeNumber}`,
      seriesId: slug || 'series',
      seasonNumber: selectedSeasonNumber,
      episodeNumber,
      title: episodeTitle,
      duration: episodeDuration,
      durationSeconds: 2400,
      thumbnailUrl: episodeThumbnailUrl || posterUrl || '',
      videoUrl: episodeVideoUrl,
      synopsis: episodeSynopsis,
      vcdnVideoId: episodeVcdnVideoId || undefined,
      vcdnStatus: episodeVcdnStatus || undefined,
      vcdnPlaybackUrl: episodeVcdnPlaybackUrl || undefined
    };

    setSeasons(prev =>
      prev.map(s => {
        if (s.seasonNumber === selectedSeasonNumber) {
          return {
            ...s,
            episodes: [...s.episodes.filter((e: any) => e.episodeNumber !== episodeNumber), newEp].sort(
              (a, b) => a.episodeNumber - b.episodeNumber
            )
          };
        }
        return s;
      })
    );

    setShowEpisodeModal(false);
    setEpisodeTitle('');
    setEpisodeVideoUrl('');
    setEpisodeThumbnailUrl('');
    setEpisodeSynopsis('');
    setEpisodeVcdnVideoId('');
    setEpisodeVcdnStatus('');
    setEpisodeVcdnPlaybackUrl('');
    showToast(`Saved Episode ${episodeNumber}!`, 'success');
  };

  // Save Content
  const handleSaveAll = async () => {
    if (!title.trim()) {
      showToast('Title is required.', 'error');
      return;
    }

    const finalPrice = isFree ? 0 : Number(price) || 0;
    const genres = genresInput.split(',').map(g => g.trim()).filter(Boolean);
    const cast = castInput.split(',').map(c => c.trim()).filter(Boolean);

    const payload: any = {
      title,
      type: type.toUpperCase(),
      tagline,
      description,
      about: about || description,
      releaseYear: Number(releaseYear) || 2025,
      runtime: type === 'movie' ? runtime : undefined,
      language,
      priceRupees: finalPrice,
      rating: Number(rating) || 8.0,
      status,
      isFeatured,
      trendingPosition: isTrending1 ? 1 : null,
      displayPriority: Number(displayPriority) || 0,
      poster: posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80',
      posterUrl: posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80',
      backdrop: backdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&q=80',
      backdropUrl: backdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&q=80',
      trailer_url: trailerUrl || null,
      trailerUrl: trailerUrl || null,
      video_url: mainVideoUrl || null,
      videoUrl: mainVideoUrl || null,
      genres,
      cast
    };

    try {
      setSaving(true);
      let targetId = contentId;

      if (isNew) {
        const res = await api.admin.createContent(payload);
        targetId = res.contentId;
        showToast('Created new title successfully!', 'success');
      } else {
        await api.admin.updateContent(targetId!, payload);
        showToast('Updated content successfully!', 'success');
      }

      // If Trending #1 was set
      if (isTrending1 && targetId) {
        await api.admin.setTrending(targetId, 1);
      } else if (!isTrending1 && targetId && !isNew) {
        await api.admin.setTrending(targetId, null);
      }

      // Attach Trailer Media if provided
      if (trailerUrl && targetId) {
        await api.admin.attachMedia({
          contentId: targetId,
          mediaType: 'TRAILER',
          url: trailerUrl
        });
      }

      // Attach Main Movie Video if provided
      if (type === 'movie' && mainVideoUrl && targetId) {
        await api.admin.attachMedia({
          contentId: targetId,
          mediaType: 'MAIN',
          url: mainVideoUrl,
          vcdnVideoId: vcdnVideoId || undefined,
          vcdnStatus: vcdnStatus || (vcdnVideoId ? 'PROCESSING' : undefined),
          vcdnPlaybackUrl: vcdnPlaybackUrl || mainVideoUrl,
          mediaProvider: vcdnVideoId ? 'VCDN' : undefined
        });
      }

      // If series, save seasons & episodes on backend
      if (type === 'series' && seasons.length > 0 && targetId) {
        for (const s of seasons) {
          try {
            let activeSeasonId = (s as any).id;
            if (!activeSeasonId || activeSeasonId.startsWith('new-')) {
              try {
                const seasonRes = await api.admin.createSeason(targetId, s.seasonNumber, s.title);
                activeSeasonId = seasonRes.seasonId;
              } catch {
                const currentFull = await api.content.getDetails(targetId);
                const matchingSeason = currentFull?.seasons?.find(cs => cs.seasonNumber === s.seasonNumber);
                if (matchingSeason) activeSeasonId = (matchingSeason as any).id;
              }
            } else {
              try {
                await api.admin.updateSeason(activeSeasonId, s.title, s.seasonNumber);
              } catch {
                // Ignore if not modified
              }
            }

            for (const ep of s.episodes) {
              let activeEpId = ep.id;
              const epData = {
                episodeNumber: ep.episodeNumber,
                title: ep.title,
                durationSeconds: ep.durationSeconds || 2400,
                duration: ep.duration || '45m',
                synopsis: ep.synopsis,
                description: ep.synopsis,
                thumbnail: ep.thumbnailUrl,
                thumbnailUrl: ep.thumbnailUrl,
                videoUrl: ep.videoUrl
              };

              if (!activeEpId || !activeEpId.startsWith('ep-')) {
                try {
                  if (activeSeasonId) {
                    const epRes = await api.admin.createEpisode(activeSeasonId, epData);
                    activeEpId = epRes.episodeId;
                  }
                } catch {
                  // Episode might already exist
                }
              }

              if (activeEpId) {
                try {
                  await api.admin.updateEpisode(activeEpId, epData);
                } catch {
                  // Episode update fallback
                }
                if (ep.videoUrl) {
                  await api.admin.attachMedia({
                    episodeId: activeEpId,
                    mediaType: 'MAIN',
                    url: ep.videoUrl,
                    vcdnVideoId: ep.vcdnVideoId || undefined,
                    vcdnStatus: ep.vcdnStatus || undefined,
                    vcdnPlaybackUrl: ep.vcdnPlaybackUrl || ep.videoUrl,
                    mediaProvider: ep.vcdnVideoId ? 'VCDN' : undefined
                  });
                }
              }
            }
          } catch (seasonErr) {
            console.warn('Season save error:', seasonErr);
          }
        }
      }

      // Refresh global app catalog immediately so consumer app & admin panel have newest artwork
      await refreshCatalog();

      onNavigateTab('admin-content');
    } catch (err: any) {
      showToast(err.message || 'Failed to save content.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#9CA3AF' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--brand-gold, #F5C518)' }} />
        <span>Loading content details...</span>
      </div>
    );
  }

  const currentSeason = seasons.find(s => s.seasonNumber === selectedSeasonNumber);

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => onNavigateTab('admin-content')}
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
              {isNew ? 'Create New Title' : `Edit: ${title || 'Untitled'}`}
            </h1>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Configure metadata, pricing, video files, YouTube trailers, and streaming assets.
            </p>
          </div>
        </div>

        <button
          disabled={saving}
          onClick={handleSaveAll}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: 'var(--brand-gold, #F5C518)',
            color: '#0E0E12',
            fontWeight: 800,
            fontSize: '14px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(245, 197, 24, 0.25)'
          }}
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          <span>{saving ? 'Saving...' : 'Save & Publish'}</span>
        </button>
      </div>

      {/* Segmented Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px'
        }}
      >
        <button
          onClick={() => setActiveTab('info')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'info' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
            color: activeTab === 'info' ? '#FFFFFF' : '#9CA3AF'
          }}
        >
          1. General Information
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'pricing' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
            color: activeTab === 'pricing' ? '#FFFFFF' : '#9CA3AF'
          }}
        >
          2. Pricing & Discovery
        </button>

        <button
          onClick={() => setActiveTab('media')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'media' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
            color: activeTab === 'media' ? '#FFFFFF' : '#9CA3AF'
          }}
        >
          3. Media & Artwork
        </button>

        {type === 'series' && (
          <button
            onClick={() => setActiveTab('seasons')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'seasons' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'seasons' ? '#FFFFFF' : '#9CA3AF'
            }}
          >
            4. Seasons & Episodes ({seasons.length})
          </button>
        )}
      </div>

      {/* TAB 1: General Info */}
      {activeTab === 'info' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Dhurandhar or Afterglow"
                required
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Format Type</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setType('movie')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: type === 'movie' ? '1px solid #F5C518' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: type === 'movie' ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: type === 'movie' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Film size={16} />
                  <span>Feature Movie</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('series')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: type === 'series' ? '1px solid #C084FC' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: type === 'series' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: type === 'series' ? '#C084FC' : '#9CA3AF',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Tv size={16} />
                  <span>Episodic Series</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="e.g. Some truths are meant to burn before daylight."
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Brief Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short premise shown on discover cards..."
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Detailed About / Synopsis</label>
            <textarea
              rows={4}
              value={about}
              onChange={e => setAbout(e.target.value)}
              placeholder="Full plot details displayed on the title page..."
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Release Year</label>
              <input
                type="number"
                value={releaseYear}
                onChange={e => setReleaseYear(Number(e.target.value))}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {type === 'movie' && (
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Runtime</label>
                <input
                  type="text"
                  value={runtime}
                  onChange={e => setRuntime(e.target.value)}
                  placeholder="e.g. 2h 10m"
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Language</label>
              <input
                type="text"
                value={language}
                onChange={e => setLanguage(e.target.value)}
                placeholder="e.g. Hindi, English"
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Rating (out of 10)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={rating}
                onChange={e => setRating(Number(e.target.value))}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Director</label>
              <input
                type="text"
                value={director}
                onChange={e => setDirector(e.target.value)}
                placeholder="e.g. Christopher Nolan, Anurag Kashyap"
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Genres (comma separated)</label>
              <input
                type="text"
                value={genresInput}
                onChange={e => setGenresInput(e.target.value)}
                placeholder="Drama, Thriller, Mystery"
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Cast Members (comma separated)</label>
            <input
              type="text"
              value={castInput}
              onChange={e => setCastInput(e.target.value)}
              placeholder="e.g. Ranveer Singh, Sanjay Dutt, Akshaye Khanna"
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 2: Pricing & Discovery */}
      {activeTab === 'pricing' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          {/* Published Status Controls */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
              Publishing & Visibility Status
            </h3>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '14px' }}>
              Control whether this title is visible to normal visitors on Discover and Search, or kept in draft mode.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { id: 'PUBLISHED', label: 'Published (Live)', desc: 'Visible to all users and searchable on FLOPSHOW' },
                { id: 'DRAFT', label: 'Draft (Unpublished)', desc: 'Hidden from public app; accessible only to administrators' },
                { id: 'ARCHIVED', label: 'Archived', desc: 'De-listed and hidden from active discovery' }
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setStatus(opt.id as any)}
                  style={{
                    flex: 1,
                    minWidth: '220px',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: status === opt.id ? '2px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: status === opt.id ? 'rgba(245, 197, 24, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700, color: status === opt.id ? 'var(--brand-gold, #F5C518)' : '#FFFFFF', display: 'block', marginBottom: '4px' }}>
                    {opt.label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.3 }}>
                    {opt.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

          {/* Pricing & Display Priority Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px' }}>
                Pay-Per-View Pricing
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={e => setIsFree(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#10B981' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: isFree ? '#10B981' : '#9CA3AF' }}>
                    Free Content (₹0)
                  </span>
                </label>

                {!isFree && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#9CA3AF' }}>Price in INR (₹):</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={price}
                      onChange={e => setPrice(Number(e.target.value))}
                      style={{
                        width: '100px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'var(--brand-gold, #F5C518)',
                        fontSize: '16px',
                        fontWeight: 800
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px' }}>
                Display Priority
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  value={displayPriority}
                  onChange={e => setDisplayPriority(Number(e.target.value))}
                  style={{
                    width: '100px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 700
                  }}
                />
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  Higher numbers are ordered first in rows. Default: 0
                </span>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

          {/* Trending #1 System */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--brand-gold, #F5C518)' }} />
              <span>Trending #1 Position</span>
            </h3>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '14px' }}>
              Only one title across the entire FLOPSHOW platform can hold Trending #1. Setting this title as #1 automatically clears #1 from the previous title.
            </p>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isTrending1}
                onChange={e => setIsTrending1(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--brand-gold, #F5C518)' }}
              />
              <span style={{ fontSize: '15px', fontWeight: 800, color: isTrending1 ? 'var(--brand-gold, #F5C518)' : '#9CA3AF' }}>
                Designate as FLOPSHOW Trending #1
              </span>
            </label>
          </div>
        </div>
      )}

      {/* TAB 3: Media & Artwork */}
      {activeTab === 'media' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Visual Artwork Section */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '28px'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={18} style={{ color: 'var(--brand-gold, #F5C518)' }} />
              <span>Poster & Backdrop Artwork</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {/* Poster Artwork */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Poster Artwork (Vertical)</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={posterUrl}
                    onChange={e => setPosterUrl(e.target.value)}
                    placeholder="https://... or upload local file"
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px'
                    }}
                  />
                  <label
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {uploadingPoster ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleUploadPoster} style={{ display: 'none' }} />
                  </label>
                  {posterUrl && (
                    <button
                      type="button"
                      onClick={() => setPosterUrl('')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#F87171',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {posterUrl && (
                  <img
                    src={posterUrl}
                    alt="Poster Preview"
                    style={{
                      width: '120px',
                      height: '170px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginTop: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  />
                )}
              </div>

              {/* Backdrop Artwork */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>Backdrop Artwork (Horizontal)</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={backdropUrl}
                    onChange={e => setBackdropUrl(e.target.value)}
                    placeholder="https://... or upload local file"
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px'
                    }}
                  />
                  <label
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {uploadingBackdrop ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleUploadBackdrop} style={{ display: 'none' }} />
                  </label>
                  {backdropUrl && (
                    <button
                      type="button"
                      onClick={() => setBackdropUrl('')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#F87171',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {backdropUrl && (
                  <img
                    src={backdropUrl}
                    alt="Backdrop Preview"
                    style={{
                      width: '260px',
                      height: '146px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginTop: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Video Playback & Trailer Section */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '28px'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} style={{ color: 'var(--brand-gold, #F5C518)' }} />
              <span>Trailer & Main Video Streaming</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Promotional Trailer (Separate from Main Movie Video) */}
              <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                    1. Promotional Trailer (Public Preview)
                  </label>
                  <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    FREE FOR ALL VISITORS
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 10px' }}>
                  Promotional teaser playable by everyone. Supports YouTube links or direct MP4/WebM uploads.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={trailerUrl}
                    onChange={e => setTrailerUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or /uploads/videos/..."
                    style={{
                      flex: 1,
                      minWidth: '240px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '14px'
                    }}
                  />
                  <label
                    style={{
                      padding: '12px 18px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: uploadingTrailer ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {uploadingTrailer ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
                    <span>{uploadingTrailer ? `Uploading ${uploadProgressTrailer > 0 ? `${uploadProgressTrailer}%` : '...'}` : 'Upload Trailer'}</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleUploadTrailer}
                      disabled={uploadingTrailer}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {trailerUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewSource({
                            title: `${title || 'Title'} (Trailer Preview)`,
                            mediaType: 'TRAILER',
                            url: resolveMediaUrl(trailerUrl, API_BASE_URL)
                          })
                        }
                        style={{
                          padding: '12px 18px',
                          borderRadius: '10px',
                          backgroundColor: '#EF4444',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '13px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Play size={15} />
                        <span>Preview Trailer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrailerUrl('')}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#F87171',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Main Feature Movie Video (Only for Movies) */}
              {type === 'movie' ? (
                <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'rgba(245, 197, 24, 0.03)', border: '1px solid rgba(245, 197, 24, 0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)' }}>
                      2. Main Feature Movie Video (Paid Playback Stream)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {mainVideoUrl ? (
                        <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '3px 10px', borderRadius: '6px' }}>
                          ● STREAM CONFIGURED & READY
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700, backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '3px 10px', borderRadius: '6px' }}>
                          ○ UNCONFIGURED (NO STREAM)
                        </span>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--brand-gold, #F5C518)', fontWeight: 700, backgroundColor: 'rgba(245, 197, 24, 0.12)', padding: '3px 10px', borderRadius: '6px' }}>
                        PURCHASE PROTECTED
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 12px' }}>
                    This is the full paid movie stream delivered only to authorized buyers. Trailer and Main Movie Video remain strictly separated. Supports MP4, WebM, HLS URLs, or local file uploads.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={mainVideoUrl}
                      onChange={e => setMainVideoUrl(e.target.value)}
                      placeholder="/uploads/videos/... or https://domain.com/movie.mp4"
                      style={{
                        flex: 1,
                        minWidth: '240px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />

                    <label
                      style={{
                        padding: '12px 18px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: uploadingVideo ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {uploadingVideo ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
                      <span>
                        {uploadingVideo
                          ? `Uploading ${uploadProgressVideo > 0 ? `${uploadProgressVideo}%` : '...'}`
                          : mainVideoUrl
                          ? 'Replace Movie Video'
                          : 'Upload Movie Video'}
                      </span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleUploadMainVideo}
                        disabled={uploadingVideo}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {mainVideoUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewSource({
                              title: `${title || 'Movie'} — Main Video Preview (Admin Test Play)`,
                              mediaType: 'MAIN',
                              url: resolveMediaUrl(mainVideoUrl, API_BASE_URL)
                            })
                          }
                          style={{
                            padding: '12px 18px',
                            borderRadius: '10px',
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '13px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Play size={15} />
                          <span>Preview / Test Play</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMainVideoUrl('')}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#F87171',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove Video
                        </button>
                      </>
                    )}
                  </div>

                  {/* VCDN Status & Transcoding Card */}
                  {vcdnVideoId && (
                    <div
                      style={{
                        marginTop: '14px',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(245, 197, 24, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: vcdnStatus === 'READY' ? '#10B981' : vcdnStatus === 'FAILED' ? '#EF4444' : '#F59E0B',
                            boxShadow: `0 0 10px ${vcdnStatus === 'READY' ? '#10B981' : vcdnStatus === 'FAILED' ? '#EF4444' : '#F59E0B'}`
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>VCDN Stream ID: <code style={{ color: 'var(--brand-gold, #F5C518)', fontSize: '12px' }}>{vcdnVideoId}</code></span>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                backgroundColor: vcdnStatus === 'READY' ? 'rgba(16, 185, 129, 0.2)' : vcdnStatus === 'FAILED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                color: vcdnStatus === 'READY' ? '#10B981' : vcdnStatus === 'FAILED' ? '#EF4444' : '#F59E0B'
                              }}
                            >
                              {vcdnStatus || 'PROCESSING'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                            {vcdnStatus === 'READY'
                              ? 'Adaptive HLS master playlist is active.'
                              : vcdnStatus === 'FAILED'
                              ? 'Transcoding encountered an issue on VCDN.'
                              : 'VCDN is transcoding video into multi-bitrate HLS streams...'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleManualCheckVcdnStatus}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Refresh Status
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'rgba(192, 132, 252, 0.1)', border: '1px solid rgba(192, 132, 252, 0.2)' }}>
                  <p style={{ fontSize: '13px', color: '#C084FC', margin: 0 }}>
                    💡 <strong>Episodic Series Format</strong>: Main streaming videos are managed at the individual episode level under the <strong>Seasons & Episodes</strong> tab.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Seasons & Episodes (Series only) */}
      {activeTab === 'seasons' && type === 'series' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Season Bar */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#9CA3AF' }}>Seasons:</span>
              {seasons.map(s => (
                <button
                  key={s.seasonNumber}
                  onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedSeasonNumber === s.seasonNumber ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.06)',
                    color: selectedSeasonNumber === s.seasonNumber ? '#0E0E12' : '#9CA3AF'
                  }}
                >
                  {s.title} ({s.episodes?.length || 0})
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Season Title (e.g. Season 2)"
                value={newSeasonTitle}
                onChange={e => setNewSeasonTitle(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '13px'
                }}
              />
              <button
                onClick={handleAddSeason}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} />
                <span>Add Season</span>
              </button>
            </div>
          </div>

          {/* Episode List for Selected Season */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                {currentSeason ? currentSeason.title : 'Episodes'} — Episodes ({currentSeason?.episodes?.length || 0})
              </h3>

              <button
                onClick={handleOpenAddEpisode}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--brand-gold, #F5C518)',
                  color: '#0E0E12',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={15} />
                <span>Add Episode</span>
              </button>
            </div>

            {!currentSeason || !currentSeason.episodes || currentSeason.episodes.length === 0 ? (
              <p style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
                No episodes created in this season yet. Click "Add Episode" above.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentSeason.episodes.map((ep: any) => (
                  <div
                    key={ep.id || ep.episodeNumber}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '240px' }}>
                      <span
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(245, 197, 24, 0.1)',
                          color: 'var(--brand-gold, #F5C518)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 800
                        }}
                      >
                        {ep.episodeNumber}
                      </span>

                      <div>
                        <p style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px' }}>
                          {ep.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{ep.duration || '45m'}</span>
                          {ep.videoUrl ? (
                            <span style={{ fontSize: '11px', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                              ● Main Video Configured
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                              ○ No Video Attached
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {ep.videoUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewSource({
                              title: `${title} - S${selectedSeasonNumber}E${ep.episodeNumber}: ${ep.title}`,
                              mediaType: 'MAIN',
                              url: ep.videoUrl
                            })
                          }
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <Play size={13} />
                          <span>Preview Video</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditEpisode(ep)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Edit3 size={13} />
                        <span>Edit / Video</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEpisode(ep.episodeNumber)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          color: '#F87171',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Episode Creation Modal */}
      {showEpisodeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: '#161622',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)'
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginBottom: '18px' }}>
              {episodeTitle ? `Episode ${episodeNumber}: ${episodeTitle}` : `Add Episode — Season ${selectedSeasonNumber}`}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '100px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF' }}>Episode #</label>
                  <input
                    type="number"
                    min="1"
                    value={episodeNumber}
                    onChange={e => setEpisodeNumber(Number(e.target.value))}
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF' }}>Episode Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. The Beginning"
                    value={episodeTitle}
                    onChange={e => setEpisodeTitle(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF' }}>Duration (e.g. 48m)</label>
                <input
                  type="text"
                  value={episodeDuration}
                  onChange={e => setEpisodeDuration(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Main Episode Video Field */}
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(245, 197, 24, 0.03)', border: '1px solid rgba(245, 197, 24, 0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)' }}>
                    Main Episode Video (Protected Playback Stream)
                  </label>
                  {episodeVideoUrl ? (
                    <span style={{ fontSize: '11px', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      ● VIDEO CONFIGURED
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      ○ UNCONFIGURED
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 8px' }}>
                  The streaming source for this episode. Only authorized/purchased users can play it. Supports MP4, WebM, HLS URLs, or file uploads.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={episodeVideoUrl}
                    onChange={e => setEpisodeVideoUrl(e.target.value)}
                    placeholder="/uploads/videos/... or https://domain.com/ep.mp4"
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px'
                    }}
                  />
                  <label
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: uploadingEpisodeVideo ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {uploadingEpisodeVideo ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                    <span>
                      {uploadingEpisodeVideo
                        ? `Uploading ${uploadProgressEpisodeVideo > 0 ? `${uploadProgressEpisodeVideo}%` : '...'}`
                        : episodeVideoUrl
                        ? 'Replace Video'
                        : 'Upload Video'}
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleUploadEpisodeVideo}
                      disabled={uploadingEpisodeVideo}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {episodeVideoUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewSource({
                            title: `Episode ${episodeNumber}: ${episodeTitle || 'Preview'}`,
                            mediaType: 'MAIN',
                            url: resolveMediaUrl(episodeVideoUrl, API_BASE_URL)
                          })
                        }
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Play size={14} />
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEpisodeVideoUrl('')}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          color: '#F87171',
                          fontSize: '13px',
                          fontWeight: 700,
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF' }}>Episode Thumbnail URL or Upload</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="text"
                    value={episodeThumbnailUrl}
                    onChange={e => setEpisodeThumbnailUrl(e.target.value)}
                    placeholder="Thumbnail URL or upload"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px'
                    }}
                  />
                  <label
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {uploadingEpisodeThumb ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleUploadEpisodeThumb} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF' }}>Synopsis</label>
                <textarea
                  rows={2}
                  value={episodeSynopsis}
                  onChange={e => setEpisodeSynopsis(e.target.value)}
                  placeholder="Episode summary..."
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={() => setShowEpisodeModal(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleSaveEpisode}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--brand-gold, #F5C518)',
                  color: '#0E0E12',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Save Episode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Preview Player */}
      {previewSource && (
        <MediaPlayer source={previewSource} onClose={() => setPreviewSource(null)} />
      )}
    </div>
  );
};

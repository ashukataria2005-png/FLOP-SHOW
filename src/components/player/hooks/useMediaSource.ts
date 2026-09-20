import { useState, useEffect, useCallback } from 'react';
import { MediaItem } from '../../../types/mediaPlayer';
import { mediaPlayerService } from '../../../services/mediaPlayerService';
import { MOCK_MEDIA_CATALOG } from '../../../data/mockMediaCatalog';

interface UseMediaSourceProps {
  initialMedia?: MediaItem | null;
  initialMediaId?: string;
  enableUrlSync?: boolean;
}

export function useMediaSource({
  initialMedia,
  initialMediaId,
  enableUrlSync = true
}: UseMediaSourceProps = {}) {
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(() => {
    if (initialMedia) return initialMedia;
    if (initialMediaId) {
      return MOCK_MEDIA_CATALOG.find(m => m.id === initialMediaId) || null;
    }
    const urlId = mediaPlayerService.getMediaIdFromUrl();
    if (urlId) {
      return MOCK_MEDIA_CATALOG.find(m => m.id === urlId) || null;
    }
    return MOCK_MEDIA_CATALOG[0] || null;
  });

  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(false);
  const [mediaResolutionError, setMediaResolutionError] = useState<string | null>(null);

  // Switch to a new media item
  const selectMedia = useCallback((item: MediaItem) => {
    setActiveMedia(item);
    setMediaResolutionError(null);
    if (enableUrlSync) {
      mediaPlayerService.updateUrlParam(item.id);
    }
  }, [enableUrlSync]);

  // Switch by ID
  const selectMediaById = useCallback(async (id: string) => {
    setIsLoadingMedia(true);
    setMediaResolutionError(null);
    try {
      const found = await mediaPlayerService.getMediaById(id);
      if (found) {
        setActiveMedia(found);
        if (enableUrlSync) {
          mediaPlayerService.updateUrlParam(found.id);
        }
      } else {
        setMediaResolutionError(`Media with ID "${id}" was not found.`);
      }
    } catch (err: any) {
      setMediaResolutionError(err?.message || 'Failed to load media');
    } finally {
      setIsLoadingMedia(false);
    }
  }, [enableUrlSync]);

  // Sync if initialMedia prop changes
  useEffect(() => {
    if (initialMedia) {
      setActiveMedia(initialMedia);
    }
  }, [initialMedia]);

  // Listen for browser popstate (back/forward history navigation)
  useEffect(() => {
    if (!enableUrlSync) return;

    const handlePopState = () => {
      const currentUrlId = mediaPlayerService.getMediaIdFromUrl();
      if (currentUrlId && currentUrlId !== activeMedia?.id) {
        const match = MOCK_MEDIA_CATALOG.find(m => m.id === currentUrlId);
        if (match) {
          setActiveMedia(match);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeMedia?.id, enableUrlSync]);

  return {
    activeMedia,
    isLoadingMedia,
    mediaResolutionError,
    selectMedia,
    selectMediaById
  };
}

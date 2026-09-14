import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, WatchProgress } from '../types/user';
import { WalletTransaction, PurchaseRecord } from '../types/transaction';
import { ContentItem, Episode } from '../types/content';
import {
  INITIAL_USER,
  INITIAL_WALLET_BALANCE,
  INITIAL_PURCHASES,
  INITIAL_MY_LIST,
  INITIAL_WATCH_PROGRESS,
  INITIAL_TRANSACTIONS
} from '../data/initialData';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { formatCurrentDate } from '../utils/formatters';
import { MediaPlayerSource } from '../components/player/MediaPlayer';
import { api, tokenStorage, API_BASE_URL } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export type AppTheme = 'flopshow-gold' | 'netflix-red';

interface AppContextType {
  // Theme
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;

  // Catalog
  catalog: ContentItem[];
  refreshCatalog: () => Promise<void>;

  // User & Auth
  user: User;
  isAuthenticated: boolean;
  login: (name: string, email: string, role?: 'USER' | 'ADMIN') => void;
  signup: (name: string, email: string) => void;
  logout: () => void;
  updateProfile: (name: string, email: string) => void;

  // Wallet
  walletBalance: number;
  transactions: WalletTransaction[];
  rechargeWallet: (amount: number) => void;

  // Purchases & Library
  purchases: PurchaseRecord[];
  isOwned: (contentId: string) => boolean;
  buyContent: (item: ContentItem) => Promise<{ success: boolean; message: string }>;

  // My List
  myList: string[];
  inMyList: (contentId: string) => boolean;
  toggleMyList: (contentId: string) => void;

  // Watch Progress
  watchProgress: WatchProgress[];
  getProgress: (contentId: string, episodeId?: string) => WatchProgress | undefined;
  saveWatchProgress: (progress: Omit<WatchProgress, 'updatedAt'>) => void;

  // Modals & UI Triggers
  activeModal: 'purchase' | 'recharge' | 'auth' | null;
  purchaseTarget: ContentItem | null;
  openPurchaseModal: (item: ContentItem) => void;
  closePurchaseModal: () => void;
  openRechargeModal: () => void;
  closeRechargeModal: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;

  // Player State
  activePlayerContent: ContentItem | null;
  activeEpisode: Episode | null;
  activeMediaSource: MediaPlayerSource | null;
  startPlaying: (content: ContentItem, episode?: Episode, skipOwnershipCheck?: boolean) => Promise<void>;
  playTrailer: (content: ContentItem) => Promise<void>;
  playMedia: (source: MediaPlayerSource) => void;
  closePlayer: () => void;
  hasNextEpisode: boolean;
  hasPrevEpisode: boolean;
  playNextEpisode: () => void;
  playPrevEpisode: () => void;

  // Feedback Toast
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State initialization with localStorage persistence
  const [theme, setThemeState] = useState<AppTheme>(() => loadFromStorage('app_theme', 'flopshow-gold'));
  const [user, setUser] = useState<User>(() => loadFromStorage('user', INITIAL_USER));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => loadFromStorage('is_authenticated', true));
  const [walletBalance, setWalletBalance] = useState<number>(() => loadFromStorage('wallet_balance', INITIAL_WALLET_BALANCE));
  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => loadFromStorage('transactions', INITIAL_TRANSACTIONS));
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => loadFromStorage('purchases', INITIAL_PURCHASES));
  const [myList, setMyList] = useState<string[]>(() => loadFromStorage('my_list', INITIAL_MY_LIST));
  const [watchProgress, setWatchProgress] = useState<WatchProgress[]>(() => loadFromStorage('watch_progress', INITIAL_WATCH_PROGRESS));

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    saveToStorage('app_theme', newTheme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', newTheme);
      document.body.setAttribute('data-theme', newTheme);
    }
  };

  // Ensure DOM attribute is set immediately on render
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Catalog state from central database (strictly dynamic, no hardcoded fallbacks)
  const [catalog, setCatalog] = useState<ContentItem[]>([]);

  // Modal states
  const [activeModal, setActiveModal] = useState<'purchase' | 'recharge' | 'auth' | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<ContentItem | null>(null);

  // Player state
  const [activePlayerContent, setActivePlayerContent] = useState<ContentItem | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [activeMediaSource, setActiveMediaSource] = useState<MediaPlayerSource | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Fetch central catalog from backend
  const refreshCatalog = async () => {
    try {
      const items = await api.content.list();
      setCatalog(items || []);
    } catch {
      // Offline: keep current state
    }
  };

  useEffect(() => {
    refreshCatalog();

    // Sync theme setting from central backend
    api.content.getTheme().then(serverTheme => {
      if (serverTheme === 'netflix-red' || serverTheme === 'flopshow-gold') {
        setTheme(serverTheme as AppTheme);
      }
    }).catch(() => {
      // Keep local default
    });

    const token = tokenStorage.get();
    if (token) {
      api.auth.me().then(({ user: serverUser, wallet: serverWallet }) => {
        if (serverUser) {
          setUser(prev => ({
            ...prev,
            name: serverUser.name,
            email: serverUser.email,
            role: serverUser.role
          }));
          setWalletBalance(serverWallet.balanceRupees);
          setIsAuthenticated(true);
          // Fetch purchases
          api.library.getPurchases().then((backendPurchases) => {
            const localPurchases = backendPurchases.map((p: any) => ({
              id: p.id,
              contentId: p.content_id,
              title: p.title,
              price: p.amount_paid / 100,
              purchasedAt: new Date(p.purchased_at).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
              })
            }));
            setPurchases(localPurchases);
          }).catch((err) => {
            console.warn('Failed to sync purchases from backend', err);
          });
        }
      }).catch(() => {
        // Token invalid/expired
      });
    }
  }, []);

  // Sync to local storage
  useEffect(() => { saveToStorage('user', user); }, [user]);
  useEffect(() => { saveToStorage('is_authenticated', isAuthenticated); }, [isAuthenticated]);
  useEffect(() => { saveToStorage('wallet_balance', walletBalance); }, [walletBalance]);
  useEffect(() => { saveToStorage('transactions', transactions); }, [transactions]);
  useEffect(() => { saveToStorage('purchases', purchases); }, [purchases]);
  useEffect(() => { saveToStorage('my_list', myList); }, [myList]);
  useEffect(() => { saveToStorage('watch_progress', watchProgress); }, [watchProgress]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // Auth actions
  const login = (name: string, email: string, role: 'USER' | 'ADMIN' = 'USER') => {
    const initials = name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'DU';
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      avatarInitials: initials,
      joinedDate: formatCurrentDate(),
      role
    };
    setUser(newUser);
    setIsAuthenticated(true);
    closeAuthModal();
    showToast(`Signed in as ${name}`, 'success');
  };

  const signup = (name: string, email: string) => {
    login(name, email);
    showToast(`Account created! Welcome to FLOPSHOW.`, 'success');
  };

  const logout = () => {
    api.auth.logout();
    setIsAuthenticated(false);
    showToast('Signed out', 'info');
  };

  const updateProfile = (name: string, email: string) => {
    const initials = name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || user.avatarInitials;
    setUser(prev => ({ ...prev, name, email, avatarInitials: initials }));
    showToast('Profile updated successfully', 'success');
  };

  // Wallet actions
  const rechargeWallet = (amount: number) => {
    if (amount <= 0) return;
    const newBalance = walletBalance + amount;
    setWalletBalance(newBalance);

    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      timestamp: formatCurrentDate(),
      title: 'Wallet Recharge',
      amount,
      type: 'credit',
      status: 'success'
    };

    setTransactions(prev => [newTx, ...prev]);
    showToast(`Added ₹${amount} to wallet. Balance: ₹${newBalance}`, 'success');
    closeRechargeModal();
  };

  // Purchases & Library
  const isOwned = (contentId: string): boolean => {
    const catalogItem = catalog.find(c => c.id === contentId || (c as any).slug === contentId);
    if (catalogItem && catalogItem.price === 0) return true; // Free items are always owned
    return purchases.some(p => {
      if (p.contentId === contentId) return true;
      if (catalogItem && (p.contentId === catalogItem.id || (catalogItem as any).slug === p.contentId)) return true;
      return false;
    });
  };

  const buyContent = async (item: ContentItem): Promise<{ success: boolean; message: string }> => {
    // Prevent double charge if already owned
    if (isOwned(item.id)) {
      return {
        success: true,
        message: 'You already own this title.'
      };
    }

    // Optimistic check for insufficient balance to avoid unnecessary API call
    if (walletBalance < item.price) {
      return {
        success: false,
        message: `Insufficient wallet balance. You have ₹${walletBalance}, need ₹${item.price}.`
      };
    }

    try {
      const result = await api.purchases.buy(item.id);
      // Update wallet balance from backend
      if (typeof result.remainingBalanceRupees === 'number') {
        setWalletBalance(result.remainingBalanceRupees);
      }

      // Format purchase entry
      const newPurchaseEntry: PurchaseRecord = {
        id: (result as any).purchase?.id || `pur-${item.id}-${Date.now()}`,
        contentId: item.id,
        title: item.title,
        price: item.price,
        purchasedAt: new Date().toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        })
      };

      // Refetch purchases to get the updated list from backend
      try {
        const backendPurchases = await api.library.getPurchases();
        const localPurchases = backendPurchases.map((p: any) => ({
          id: p.id,
          contentId: p.content_id || p.contentId,
          title: p.title,
          price: typeof p.amount_paid === 'number' ? p.amount_paid / 100 : (p.price || item.price),
          purchasedAt: new Date(p.purchased_at || Date.now()).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          })
        }));

        if (!localPurchases.some(p => p.contentId === item.id)) {
          localPurchases.unshift(newPurchaseEntry);
        }
        setPurchases(localPurchases);
      } catch {
        setPurchases(prev => [newPurchaseEntry, ...prev.filter(p => p.contentId !== item.id)]);
      }

      showToast(`Unlocked "${item.title}"! Enjoy streaming.`, 'success');
      return { success: true, message: 'Purchase complete.' };
    } catch (err: any) {
      if (err.status === 409) {
        // Backend confirms already owned - update local state without deducting wallet
        if (!purchases.some(p => p.contentId === item.id)) {
          setPurchases(prev => [{
            id: `pur-${item.id}`,
            contentId: item.id,
            title: item.title,
            price: item.price,
            purchasedAt: new Date().toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            })
          }, ...prev]);
        }
        return { success: true, message: 'You already own this title.' };
      }
      return { success: false, message: err.message || 'Purchase failed' };
    }
  };

  // My List
  const inMyList = (contentId: string): boolean => {
    return myList.includes(contentId);
  };

  const toggleMyList = (contentId: string) => {
    const item = catalog.find(c => c.id === contentId);
    const title = item ? `"${item.title}"` : 'Title';

    if (inMyList(contentId)) {
      setMyList(prev => prev.filter(id => id !== contentId));
      showToast(`Removed ${title} from My List`, 'info');
    } else {
      setMyList(prev => [...prev, contentId]);
      showToast(`Added ${title} to My List`, 'success');
    }
  };

  // Watch Progress
  const getProgress = (contentId: string, episodeId?: string): WatchProgress | undefined => {
    if (episodeId) {
      return watchProgress.find(p => p.contentId === contentId && p.episodeId === episodeId)
        || watchProgress.find(p => p.episodeId === episodeId);
    }
    return watchProgress.find(p => p.contentId === contentId);
  };

  const saveWatchProgress = (progressData: Omit<WatchProgress, 'updatedAt'>) => {
    const entry: WatchProgress = {
      ...progressData,
      updatedAt: formatCurrentDate()
    };

    setWatchProgress(prev => {
      const filtered = prev.filter(p => {
        if (progressData.episodeId) {
          return !(p.contentId === progressData.contentId && p.episodeId === progressData.episodeId);
        }
        return p.contentId !== progressData.contentId;
      });
      return [entry, ...filtered];
    });
  };

  // Determine current season's episodes for Previous / Next Episode navigation
  const currentSeasonEpisodes = React.useMemo(() => {
    if (!activePlayerContent || activePlayerContent.type !== 'series' || !activeEpisode) {
      return [];
    }
    const season = activePlayerContent.seasons?.find(s => s.seasonNumber === activeEpisode.seasonNumber);
    return season?.episodes || [];
  }, [activePlayerContent, activeEpisode]);

  const currentEpisodeIndex = React.useMemo(() => {
    if (!activeEpisode || currentSeasonEpisodes.length === 0) return -1;
    return currentSeasonEpisodes.findIndex(e => e.id === activeEpisode.id);
  }, [activeEpisode, currentSeasonEpisodes]);

  const hasPrevEpisode = currentEpisodeIndex > 0;
  const hasNextEpisode = currentEpisodeIndex >= 0 && currentEpisodeIndex < currentSeasonEpisodes.length - 1;

  const playPrevEpisode = () => {
    if (hasPrevEpisode && activePlayerContent) {
      const prevEp = currentSeasonEpisodes[currentEpisodeIndex - 1];
      if (prevEp) {
        startPlaying(activePlayerContent, prevEp);
      }
    }
  };

  const playNextEpisode = () => {
    if (hasNextEpisode && activePlayerContent) {
      const nextEp = currentSeasonEpisodes[currentEpisodeIndex + 1];
      if (nextEp) {
        startPlaying(activePlayerContent, nextEp);
      }
    }
  };

  // Real Media Player controls
  const startPlaying = async (content: ContentItem, episode?: Episode, skipOwnershipCheck?: boolean) => {
    setActivePlayerContent(content);

    let ep = episode;
    let subtitle = '';
    let sourceUrl = '';
    let episodeId = episode?.id;

    if (content.type === 'series') {
      // If no specific episode was provided, try to find from progress or first season episode
      if (!ep) {
        if (!content.seasons || content.seasons.length === 0) {
          try {
            const full = await api.content.getDetails(content.id);
            if (full?.seasons && full.seasons.length > 0) {
              content = full;
              setActivePlayerContent(full);
            }
          } catch {
            // Keep existing content
          }
        }

        const existingProgress = getProgress(content.id);
        if (existingProgress?.episodeId && content.seasons) {
          ep = content.seasons.flatMap(s => s.episodes).find(e => e.id === existingProgress.episodeId);
        }
        if (!ep && content.seasons && content.seasons.length > 0) {
          for (const s of content.seasons) {
            if (s.episodes && s.episodes.length > 0) {
              ep = s.episodes[0];
              break;
            }
          }
        }
      }

      if (!ep) {
        showToast(`No episodes are currently available for "${content.title}".`, 'info');
        return;
      }

      setActiveEpisode(ep);
      subtitle = `S${ep.seasonNumber} E${ep.episodeNumber}: ${ep.title}`;
      episodeId = ep.id;

      // Attempt to resolve real episode media from backend database
      try {
        const mediaRes = await api.media.getEpisodeMedia(ep.id, 'MAIN');
        if (mediaRes?.url && mediaRes.url.trim() !== '') {
          sourceUrl = mediaRes.url;
        }
      } catch (err: any) {
        if (err?.code === 'PURCHASE_REQUIRED' || err?.status === 403) {
          // skipOwnershipCheck is set when called immediately after a purchase (before React re-renders
          // the purchases state), so we trust the caller that the content is now owned.
          if (!skipOwnershipCheck && !isOwned(content.id) && !content.isFree) {
            openPurchaseModal(content);
            return;
          }
        }
        if (ep.videoUrl && ep.videoUrl.trim() !== '') {
          sourceUrl = ep.videoUrl;
        }
      }

      // Safeguard: Ensure episode media never uses series trailer
      if (content.trailerUrl && sourceUrl === content.trailerUrl) {
        sourceUrl = '';
      }

      if (!sourceUrl || sourceUrl.trim() === '') {
        showToast(`No playable video is currently configured for Episode ${ep.episodeNumber}: "${ep.title}".`, 'info');
        return;
      }
    } else {
      setActiveEpisode(null);

      // Attempt to resolve real movie media from backend database
      try {
        const mediaRes = await api.media.getContentMedia(content.id, 'MAIN');
        if (mediaRes?.url && mediaRes.url.trim() !== '') {
          sourceUrl = mediaRes.url;
        }
      } catch (err: any) {
        if (err?.code === 'PURCHASE_REQUIRED' || err?.status === 403) {
          // skipOwnershipCheck is set when called immediately after a purchase (before React re-renders
          // the purchases state), so we trust the caller that the content is now owned.
          if (!skipOwnershipCheck && !isOwned(content.id) && !content.isFree) {
            openPurchaseModal(content);
            return;
          }
        }
        if (content.videoUrl && content.videoUrl.trim() !== '') {
          sourceUrl = content.videoUrl;
        }
      }

      // Safeguard: Trailer video must remain completely separate from MAIN movie video
      if (content.trailerUrl && sourceUrl === content.trailerUrl) {
        sourceUrl = '';
      }

      if (!sourceUrl || sourceUrl.trim() === '') {
        showToast(`No playable video is currently configured for "${content.title}".`, 'info');
        return;
      }
    }

    const resolvedUrl = resolveMediaUrl(sourceUrl, API_BASE_URL);
    const progress = ep ? getProgress(content.id, ep.id) : getProgress(content.id);

    setActiveMediaSource({
      title: content.title,
      subtitle,
      mediaType: 'MAIN',
      url: resolvedUrl,
      poster: ep?.thumbnailUrl || content.backdropUrl || content.posterUrl,
      contentId: content.id,
      episodeId,
      initialTimeSeconds: progress?.currentTime || 0
    });
  };

  const playTrailer = async (content: ContentItem) => {
    let trailerUrl = content.trailerUrl || '';

    try {
      const mediaRes = await api.media.getContentMedia(content.id, 'TRAILER');
      if (mediaRes?.url) trailerUrl = mediaRes.url;
    } catch {
      // Keep item trailerUrl
    }

    if (!trailerUrl || trailerUrl.trim() === '') {
      showToast(`Trailer is not currently available for "${content.title}".`, 'info');
      return;
    }

    setActiveMediaSource({
      title: `${content.title} (Official Trailer)`,
      mediaType: 'TRAILER',
      url: resolveMediaUrl(trailerUrl, API_BASE_URL),
      poster: content.backdropUrl || content.posterUrl,
      contentId: content.id
    });
  };

  const playMedia = (source: MediaPlayerSource) => {
    setActiveMediaSource(source);
  };

  const closePlayer = () => {
    setActivePlayerContent(null);
    setActiveEpisode(null);
    setActiveMediaSource(null);
  };

  // Modal controls
  const openPurchaseModal = (item: ContentItem) => {
    setPurchaseTarget(item);
    setActiveModal('purchase');
  };

  const closePurchaseModal = () => {
    setActiveModal(null);
    setPurchaseTarget(null);
  };

  const openRechargeModal = () => {
    setActiveModal('recharge');
  };

  const closeRechargeModal = () => {
    setActiveModal(null);
  };

  const openAuthModal = () => {
    setActiveModal('auth');
  };

  const closeAuthModal = () => {
    setActiveModal(null);
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        catalog,
        refreshCatalog,
        user,
        isAuthenticated,
        login,
        signup,
        logout,
        updateProfile,
        walletBalance,
        transactions,
        rechargeWallet,
        purchases,
        isOwned,
        buyContent,
        myList,
        inMyList,
        toggleMyList,
        watchProgress,
        getProgress,
        saveWatchProgress,
        activeModal,
        purchaseTarget,
        openPurchaseModal,
        closePurchaseModal,
        openRechargeModal,
        closeRechargeModal,
        openAuthModal,
        closeAuthModal,
        activePlayerContent,
        activeEpisode,
        activeMediaSource,
        startPlaying,
        playTrailer,
        playMedia,
        closePlayer,
        hasNextEpisode,
        hasPrevEpisode,
        playNextEpisode,
        playPrevEpisode,
        toasts,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

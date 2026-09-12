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
import { api, tokenStorage } from '../services/api';

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
  buyContent: (item: ContentItem) => { success: boolean; message: string };

  // My List
  myList: string[];
  inMyList: (contentId: string) => boolean;
  toggleMyList: (contentId: string) => void;

  // Watch Progress
  watchProgress: WatchProgress[];
  getProgress: (contentId: string) => WatchProgress | undefined;
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
  startPlaying: (content: ContentItem, episode?: Episode) => Promise<void>;
  playTrailer: (content: ContentItem) => Promise<void>;
  playMedia: (source: MediaPlayerSource) => void;
  closePlayer: () => void;

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
      api.auth.me().then(({ user: serverUser }) => {
        if (serverUser) {
          setUser(prev => ({
            ...prev,
            name: serverUser.name,
            email: serverUser.email,
            role: serverUser.role
          }));
          setIsAuthenticated(true);
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
    const catalogItem = catalog.find(c => c.id === contentId);
    if (catalogItem && catalogItem.price === 0) return true; // Free items are always owned
    return purchases.some(p => p.contentId === contentId);
  };

  const buyContent = (item: ContentItem): { success: boolean; message: string } => {
    if (isOwned(item.id)) {
      return { success: false, message: 'You already own this title.' };
    }

    if (walletBalance < item.price) {
      return {
        success: false,
        message: `Insufficient wallet balance. You have ₹${walletBalance}, need ₹${item.price}.`
      };
    }

    // Deduct balance
    const newBalance = walletBalance - item.price;
    setWalletBalance(newBalance);

    // Record purchase
    const newPurchase: PurchaseRecord = {
      id: `pur-${Date.now()}`,
      contentId: item.id,
      title: item.title,
      price: item.price,
      purchasedAt: formatCurrentDate()
    };
    setPurchases(prev => [newPurchase, ...prev]);

    // Record transaction
    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      timestamp: formatCurrentDate(),
      title: `Purchased: ${item.title}`,
      amount: item.price,
      type: 'debit',
      contentId: item.id,
      status: 'success'
    };
    setTransactions(prev => [newTx, ...prev]);

    closePurchaseModal();
    showToast(`Unlocked "${item.title}"! Enjoy streaming.`, 'success');
    return { success: true, message: 'Purchase complete.' };
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
  const getProgress = (contentId: string): WatchProgress | undefined => {
    return watchProgress.find(p => p.contentId === contentId);
  };

  const saveWatchProgress = (progressData: Omit<WatchProgress, 'updatedAt'>) => {
    const entry: WatchProgress = {
      ...progressData,
      updatedAt: formatCurrentDate()
    };

    setWatchProgress(prev => {
      const filtered = prev.filter(p => p.contentId !== progressData.contentId);
      return [entry, ...filtered];
    });
  };

  // Real Media Player controls
  const startPlaying = async (content: ContentItem, episode?: Episode) => {
    setActivePlayerContent(content);

    let ep = episode;
    let subtitle = '';
    let sourceUrl = '';
    let episodeId = episode?.id;

    if (content.type === 'series') {
      if (!ep && content.seasons && content.seasons.length > 0 && content.seasons[0].episodes.length > 0) {
        const existingProgress = getProgress(content.id);
        ep = existingProgress?.episodeId
          ? content.seasons.flatMap(s => s.episodes).find(e => e.id === existingProgress.episodeId)
          : content.seasons[0].episodes[0];
      }
      setActiveEpisode(ep || null);
      if (ep) {
        subtitle = `S${ep.seasonNumber} E${ep.episodeNumber}: ${ep.title}`;
        episodeId = ep.id;
        sourceUrl = ep.videoUrl || '';
      }
    } else {
      setActiveEpisode(null);
      sourceUrl = content.videoUrl || '';
    }

    // Attempt to resolve real media from backend API
    try {
      if (episodeId) {
        const mediaRes = await api.media.getEpisodeMedia(episodeId, 'MAIN');
        if (mediaRes?.url) sourceUrl = mediaRes.url;
      } else {
        const mediaRes = await api.media.getContentMedia(content.id, 'MAIN');
        if (mediaRes?.url) sourceUrl = mediaRes.url;
      }
    } catch {
      // Keep local sourceUrl or fallback
    }

    // Default sample stream if none configured
    if (!sourceUrl) {
      sourceUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    }

    const progress = getProgress(content.id);

    setActiveMediaSource({
      title: content.title,
      subtitle,
      mediaType: 'MAIN',
      url: sourceUrl,
      poster: content.backdropUrl || content.posterUrl,
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

    if (!trailerUrl) {
      showToast(`Trailer is not currently available for "${content.title}".`, 'info');
      return;
    }

    setActiveMediaSource({
      title: `${content.title} (Official Trailer)`,
      mediaType: 'TRAILER',
      url: trailerUrl,
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

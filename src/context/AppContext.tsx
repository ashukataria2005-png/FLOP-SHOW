import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, WatchProgress } from '../types/user';
import { WalletTransaction, PurchaseRecord } from '../types/transaction';
import { ContentItem, Episode } from '../types/content';
import {
  INITIAL_PURCHASES,
  INITIAL_MY_LIST,
  INITIAL_WATCH_PROGRESS,
  GUEST_USER
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
  login: (userId: string, name: string, email: string, role?: 'USER' | 'ADMIN', walletBalance?: number) => void;
  signup: (userId: string, name: string, email: string, walletBalance?: number) => void;
  logout: () => void;
  updateProfile: (name: string, email: string) => void;

  // Wallet
  walletBalance: number;
  transactions: WalletTransaction[];
  rechargeWallet: (amount: number) => Promise<void>;
  syncTransactions: () => Promise<void>;

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

  // Session
  sessionLoading: boolean;

  // Feedback Toast
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State initialization with localStorage persistence
  // NOTE: isAuthenticated defaults to FALSE — the startup useEffect will restore
  // the session from the stored JWT if one exists and is still valid.
  // Defaulting to true was the root cause of silent demo-account auto-login.
  const [theme, setThemeState] = useState<AppTheme>(() => loadFromStorage('app_theme', 'flopshow-gold'));
  const [user, setUser] = useState<User>(() => {
    // Only restore a saved user if there is an auth token — otherwise start as guest.
    // We check localStorage directly here to avoid a circular import (tokenStorage).
    const hasToken = Boolean(localStorage.getItem('flopshow_auth_token'));
    return hasToken ? loadFromStorage('user', GUEST_USER) : GUEST_USER;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const hasToken = Boolean(localStorage.getItem('flopshow_auth_token'));
    const savedUser = loadFromStorage('user', GUEST_USER);
    return Boolean(hasToken && savedUser && savedUser.id && savedUser.id !== 'guest-user');
  });
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    const hasToken = Boolean(localStorage.getItem('flopshow_auth_token'));
    return hasToken ? loadFromStorage('purchases', INITIAL_PURCHASES) : [];
  });
  const [myList, setMyList] = useState<string[]>(() => {
    const hasToken = Boolean(localStorage.getItem('flopshow_auth_token'));
    return hasToken ? loadFromStorage('my_list', INITIAL_MY_LIST) : [];
  });
  const [watchProgress, setWatchProgress] = useState<WatchProgress[]>(() => {
    const hasToken = Boolean(localStorage.getItem('flopshow_auth_token'));
    return hasToken ? loadFromStorage('watch_progress', INITIAL_WATCH_PROGRESS) : [];
  });
  // sessionLoading: true while we're checking the stored JWT on startup
  const [sessionLoading, setSessionLoading] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('flopshow_auth_token'));
  });

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
      // We have a stored JWT — validate it with the backend and restore the session.
      api.auth.me().then(({ user: serverUser, wallet: serverWallet }) => {
        if (serverUser) {
          // Update user state with the authoritative backend values (including real ID)
          const restoredUser: User = {
            id: serverUser.id,
            name: serverUser.name,
            email: serverUser.email,
            avatarInitials: (serverUser.name || '').trim().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U',
            joinedDate: serverUser.createdAt ? new Date(serverUser.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : formatCurrentDate(),
            role: serverUser.role
          };
          setUser(restoredUser);
          saveToStorage('user', restoredUser);
          setWalletBalance(serverWallet.balanceRupees);
          setIsAuthenticated(true);
          // Fetch purchases for the restored session
          api.library.getPurchases().then((backendPurchases) => {
            const localPurchases = backendPurchases.map((p: any) => ({
              id: p.id,
              contentId: p.content_id,
              title: p.title,
              price: p.amount_paid / 100,
              purchasedAt: new Date(p.purchased_at).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })
            }));
            setPurchases(localPurchases);
          }).catch((err) => {
            console.warn('Failed to sync purchases from backend', err);
          });
          // Sync wallet transactions from backend
          syncTransactions();
        }
      }).catch((err: any) => {
        // ONLY invalidate session if server explicitly rejected credentials (401 Unauthorized or INVALID_TOKEN).
        // If it's a network glitch, timeout, 500/502/503 server restart error, DO NOT log the user out!
        const isAuthRejection = err?.status === 401 || err?.code === 'INVALID_TOKEN' || err?.code === 'UNAUTHORIZED';
        if (isAuthRejection) {
          console.warn('[Auth] Session token invalid or expired, signing out.');
          tokenStorage.clear();
          setIsAuthenticated(false);
          setUser(GUEST_USER);
          setWalletBalance(0);
          setTransactions([]);
          setPurchases([]);
          setMyList([]);
          setWatchProgress([]);
          saveToStorage('user', GUEST_USER);
        } else {
          console.warn('[Auth] Transient network or server error while validating session; keeping cached session.', err);
          // Keep the restored session active!
        }
      }).finally(() => {
        setSessionLoading(false);
      });
    } else {
      // No token — definitively not authenticated
      setIsAuthenticated(false);
      setSessionLoading(false);
    }
  }, []);

  // Sync user-specific data to localStorage (only when authenticated, so guest state doesn't overwrite)
  useEffect(() => { if (isAuthenticated) saveToStorage('purchases', purchases); }, [purchases, isAuthenticated]);
  useEffect(() => { if (isAuthenticated) saveToStorage('my_list', myList); }, [myList, isAuthenticated]);
  useEffect(() => { if (isAuthenticated) saveToStorage('watch_progress', watchProgress); }, [watchProgress, isAuthenticated]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // Auth actions
  const login = (userId: string, name: string, email: string, role: 'USER' | 'ADMIN' = 'USER', serverWalletBalance?: number) => {
    const initials = name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    const newUser: User = {
      id: userId,   // Real backend UUID — never a client-generated timestamp ID
      name,
      email,
      avatarInitials: initials,
      joinedDate: formatCurrentDate(),
      role
    };
    setUser(newUser);
    // Persist the real user so a browser refresh restores it correctly
    saveToStorage('user', newUser);
    setIsAuthenticated(true);
    // Use the authoritative server wallet balance; reset purchases so we re-sync from backend.
    setWalletBalance(typeof serverWalletBalance === 'number' ? serverWalletBalance : 0);
    setPurchases([]);
    closeAuthModal();
    showToast(`Signed in as ${name}`, 'success');
    // Fetch authoritative purchases from backend for the newly logged-in user
    api.library.getPurchases().then((backendPurchases) => {
      const localPurchases = backendPurchases.map((p: any) => ({
        id: p.id,
        contentId: p.content_id || p.contentId,
        title: p.title,
        price: typeof p.amount_paid === 'number' ? p.amount_paid / 100 : (p.price || 0),
        purchasedAt: new Date(p.purchased_at || Date.now()).toLocaleString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        })
      }));
      setPurchases(localPurchases);
    }).catch(() => { /* keep the empty reset */ });
    // Sync wallet transactions
    syncTransactions();
  };

  const signup = (userId: string, name: string, email: string, serverWalletBalance?: number) => {
    login(userId, name, email, 'USER', serverWalletBalance);
    showToast(`Account created! Welcome to FLOPSHOW.`, 'success');
  };

  const logout = () => {
    api.auth.logout();
    setIsAuthenticated(false);
    // Reset user to a clean guest state so the old user's name/email
    // is never visible to the next visitor or after a reload.
    setUser(GUEST_USER);
    // Clear ALL per-user state so account A's data cannot bleed into account B.
    setWalletBalance(0);
    setTransactions([]);
    setPurchases([]);
    setMyList([]);
    setWatchProgress([]);
    // Clear persisted per-user keys from localStorage
    saveToStorage('user', GUEST_USER);
    saveToStorage('wallet_balance', 0);
    saveToStorage('purchases', []);
    saveToStorage('my_list', []);
    saveToStorage('watch_progress', []);
    showToast('Signed out', 'info');
  };

  const updateProfile = (name: string, email: string) => {
    const initials = name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || user.avatarInitials;
    setUser(prev => ({ ...prev, name, email, avatarInitials: initials }));
    showToast('Profile updated successfully', 'success');
  };

  // Sync transaction audit ledger from backend
  const syncTransactions = async () => {
    try {
      const res = await api.wallet.getTransactions(50);
      if (res?.transactions && Array.isArray(res.transactions)) {
        const mapped: WalletTransaction[] = res.transactions.map((t: any) => {
          const isCredit = t.type === 'RECHARGE' || t.type === 'REFUND';
          const amtRupees = typeof t.amount === 'number' ? t.amount / 100 : 0;
          return {
            id: t.id,
            timestamp: t.created_at
              ? new Date(t.created_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              : formatCurrentDate(),
            title: t.description || (isCredit ? 'Wallet Recharge' : 'Content Purchase'),
            amount: amtRupees,
            type: isCredit ? 'credit' : 'debit',
            contentId: t.type === 'PURCHASE' ? t.reference_id : undefined,
            status: 'success',
          };
        });
        setTransactions(mapped);
      }
    } catch {
      // Keep existing transactions in state if network is unavailable
    }
  };


  // Wallet actions
  const rechargeWallet = async (amount: number) => {
    if (amount <= 0) return;

    try {
      const res = await api.wallet.recharge(amount);
      const serverBalance = res?.wallet?.balanceRupees ?? res?.wallet?.balance_rupees;
      const newBalance = typeof serverBalance === 'number' ? serverBalance : walletBalance + amount;
      setWalletBalance(newBalance);
      await syncTransactions();
      showToast(`Added ₹${amount} to wallet. Balance: ₹${newBalance}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Recharge failed', 'error');
    }
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
    // Prevent double charge if already owned (local check is a fast-path UX optimisation only)
    if (isOwned(item.id)) {
      return {
        success: true,
        message: 'You already own this title.'
      };
    }

    // NOTE: We intentionally do NOT perform an optimistic client-side wallet balance check here.
    // The previous optimistic check used potentially stale React/localStorage wallet state
    // and could incorrectly show "Insufficient balance" for a valid account (e.g. after
    // switching accounts, after recharge, or when the local state is out of sync).
    // The backend atomically validates the REAL wallet balance inside a DB transaction
    // and returns the authoritative error when balance is genuinely insufficient.

    try {
      const result = await api.purchases.buy(item.id);
      // Update wallet balance from backend
      if (typeof result.remainingBalanceRupees === 'number') {
        setWalletBalance(result.remainingBalanceRupees);
      }
      syncTransactions();

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
        syncTransactions,
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
        showToast,
        sessionLoading
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

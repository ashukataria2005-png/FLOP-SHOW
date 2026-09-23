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

function isDemoStreamUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('commondatastorage.googleapis.com') ||
    url.includes('test-streams.mux.dev') ||
    url.includes('vjs.zencdn.net')
  );
}

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
  login: (userId: string, name: string, email: string, role?: 'USER' | 'ADMIN', walletBalance?: number, extraFields?: { is_super_admin?: boolean; permissions?: string[]; status?: 'ACTIVE' | 'SUSPENDED'; last_login_at?: string | null }) => void;
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
  syncPurchases: () => Promise<void>;

  // My List
  myList: string[];
  inMyList: (contentId: string) => boolean;
  toggleMyList: (contentId: string) => void;

  // Watch Progress
  watchProgress: WatchProgress[];
  getProgress: (contentId: string, episodeId?: string) => WatchProgress | undefined;
  saveWatchProgress: (progress: Omit<WatchProgress, 'updatedAt'>) => void;

  // Modals & UI Triggers
  activeModal: 'purchase' | 'recharge' | 'auth' | 'subscription' | 'watchpass' | 'plan_selector' | null;
  purchaseTarget: ContentItem | null;
  watchPassTarget: ContentItem | null;
  planSelectorTarget: ContentItem | null;
  openPlanSelector: (item?: ContentItem | null) => void;
  closePlanSelector: () => void;
  openPurchaseModal: (item: ContentItem) => void;
  closePurchaseModal: () => void;
  openRechargeModal: () => void;
  closeRechargeModal: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  openSubscriptionModal: (planId?: 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY', initialStep?: 'choose' | 'pay') => void;
  closeSubscriptionModal: () => void;
  openWatchPassModal: (item?: ContentItem | null, defaultPlan?: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D', initialStep?: 'choose' | 'pay') => void;
  closeWatchPassModal: () => void;
  watchPassInitialPlan: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D';
  watchPassInitialStep: 'choose' | 'pay';
  subscriptionTargetPlan: 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY';
  subscriptionTargetStep: 'choose' | 'pay';

  // Monetization Mode & Subscriptions
  monetizationMode: 'PER_CONTENT' | 'SUBSCRIPTION';
  subscriptionPlans: Array<{
    id: 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY';
    name: string;
    durationDays: number;
    priceRupees: number;
    description: string;
  }>;
  activeSubscription: {
    id: string;
    plan: 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY';
    status: 'ACTIVE';
    amount_paid: number;
    start_date: string;
    end_date: string;
    daysRemaining: number;
    payment_reference: string | null;
  } | null;
  pendingSubscription: {
    id: string;
    plan: 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY';
    status: 'PENDING';
    amount_paid: number;
    payment_reference: string;
    submitted_at: string;
  } | null;
  hasActiveSubscription: boolean;
  activeWatchPass: any | null;
  activeWatchPasses: any[];
  hasActiveWatchPass: boolean;
  userWatchPasses: { activePasses: any[]; expiredPasses: any[]; pendingPasses: any[] };
  refreshMonetizationConfig: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>;
  refreshWatchPassStatus: () => Promise<void>;
  submitSubscriptionRequest: (plan: 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY', utr: string, userName?: string, userEmail?: string, promoCode?: string) => Promise<{ success: boolean; message: string }>;

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

  // Search History
  searchHistory: string[];
  addSearchHistory: (query: string) => void;
  removeSearchHistoryItem: (query: string) => void;
  clearSearchHistory: () => void;

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
  // Helper to determine if a stored user token exists
  const getStoredUserToken = (): string | null => {
    try {
      return (
        localStorage.getItem('flops_token') ||
        localStorage.getItem('flops_user_token') ||
        localStorage.getItem('flopshow_auth_token')
      );
    } catch {
      return null;
    }
  };

  const getStoredUserProfile = (): User | null => {
    try {
      const u = loadFromStorage<User | null>('flops_user', null) || loadFromStorage<User | null>('user', null);
      if (u && u.id && u.id !== 'guest-user') {
        return u;
      }
    } catch {
      // Ignore
    }
    return null;
  };

  const [theme, setThemeState] = useState<AppTheme>(() => loadFromStorage('app_theme', 'flopshow-gold'));
  const [user, setUser] = useState<User>(() => {
    const token = getStoredUserToken();
    const stored = getStoredUserProfile();
    if (token && stored) {
      return stored;
    }
    return GUEST_USER;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = getStoredUserToken();
    const stored = getStoredUserProfile();
    return Boolean(token && stored);
  });
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    const token = getStoredUserToken();
    return token ? loadFromStorage('purchases', INITIAL_PURCHASES) : [];
  });
  const [myList, setMyList] = useState<string[]>(() => {
    const token = getStoredUserToken();
    return token ? loadFromStorage('my_list', INITIAL_MY_LIST) : [];
  });
  const [watchProgress, setWatchProgress] = useState<WatchProgress[]>(() => {
    const token = getStoredUserToken();
    return token ? loadFromStorage('watch_progress', INITIAL_WATCH_PROGRESS) : [];
  });
  // sessionLoading: only true if token exists but cached user profile is missing and needs fetching
  const [sessionLoading, setSessionLoading] = useState<boolean>(() => {
    return Boolean(getStoredUserToken() && !getStoredUserProfile());
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
  const [activeModal, setActiveModal] = useState<'purchase' | 'recharge' | 'auth' | 'subscription' | 'watchpass' | 'plan_selector' | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<ContentItem | null>(null);
  const [watchPassTarget, setWatchPassTarget] = useState<ContentItem | null>(null);
  const [watchPassInitialPlan, setWatchPassInitialPlan] = useState<'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D'>('PASS_7D');
  const [watchPassInitialStep, setWatchPassInitialStep] = useState<'choose' | 'pay'>('choose');
  const [planSelectorTarget, setPlanSelectorTarget] = useState<ContentItem | null>(null);

  const openPlanSelector = (item?: ContentItem | null) => {
    setPlanSelectorTarget(item || null);
    setActiveModal('plan_selector');
  };

  const closePlanSelector = () => {
    setActiveModal(null);
    setPlanSelectorTarget(null);
  };

  const openWatchPassModal = (item?: ContentItem | null, defaultPlan?: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D', initialStep: 'choose' | 'pay' = 'choose') => {
    setWatchPassTarget(item || null);
    if (defaultPlan) setWatchPassInitialPlan(defaultPlan);
    setWatchPassInitialStep(initialStep);
    setActiveModal('watchpass');
  };

  const closeWatchPassModal = () => {
    setActiveModal(null);
    setWatchPassTarget(null);
    setWatchPassInitialStep('choose');
  };

  // Lock background page scrolling when any modal is open without suppressing the modal's own touch gestures.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (activeModal !== null) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      const originalBodyTouchAction = document.body.style.touchAction;
      const originalHtmlTouchAction = document.documentElement.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = '';
      document.documentElement.style.touchAction = '';

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        document.body.style.touchAction = originalBodyTouchAction;
        document.documentElement.style.touchAction = originalHtmlTouchAction;
      };
    }
  }, [activeModal]);

  // Player state
  const [activePlayerContent, setActivePlayerContent] = useState<ContentItem | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [activeMediaSource, setActiveMediaSource] = useState<MediaPlayerSource | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Monetization Mode & Subscription states
  const [monetizationMode, setMonetizationMode] = useState<'PER_CONTENT' | 'SUBSCRIPTION'>('PER_CONTENT');
  const DEFAULT_SUBSCRIPTION_PLANS: Array<{
    id: 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY';
    name: string;
    durationDays: number;
    priceRupees: number;
    description: string;
  }> = [
    { id: 'MONTHLY', name: 'Monthly Plan', durationDays: 30, priceRupees: 89, description: '30 days full catalog access with HD & 1080p playback.' },
    { id: '3_MONTHS', name: '3 Months Plan', durationDays: 90, priceRupees: 189, description: '90 days full catalog access with HD & 1080p playback. Great quarterly value!' },
    { id: 'YEARLY', name: '12 Months / Full Year', durationDays: 365, priceRupees: 449, description: 'Best value! 365 days of unlimited movies and webseries across all devices.' }
  ];

  const [subscriptionPlans, setSubscriptionPlans] = useState<Array<{
    id: 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY';
    name: string;
    durationDays: number;
    priceRupees: number;
    description: string;
  }>>(DEFAULT_SUBSCRIPTION_PLANS);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [pendingSubscription, setPendingSubscription] = useState<any>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(false);
  const [userWatchPasses, setUserWatchPasses] = useState<{ activePasses: any[]; expiredPasses: any[]; pendingPasses: any[] }>({
    activePasses: [],
    expiredPasses: [],
    pendingPasses: []
  });
  const [activeWatchPass, setActiveWatchPass] = useState<any | null>(null);
  const [hasActiveWatchPass, setHasActiveWatchPass] = useState<boolean>(false);
  const [subscriptionTargetPlan, setSubscriptionTargetPlan] = useState<'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY'>('MONTHLY');
  const [subscriptionTargetStep, setSubscriptionTargetStep] = useState<'choose' | 'pay'>('choose');

  const refreshMonetizationConfig = async () => {
    try {
      const res = await api.monetization.getConfig();
      if (res?.mode) {
        setMonetizationMode(res.mode);
      }
      if (res?.plans && Array.isArray(res.plans) && res.plans.length > 0) {
        const normalized = res.plans.map((p: any) => {
          const rawId = String(p.id || p.plan || 'MONTHLY').toUpperCase();
          const id = (rawId === '3_MONTHS' || rawId === 'YEARLY' || rawId === 'WEEKLY' ? rawId : 'MONTHLY') as 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY';
          const defaultRef = DEFAULT_SUBSCRIPTION_PLANS.find(d => d.id === id) || DEFAULT_SUBSCRIPTION_PLANS[0];
          const rawPrice = p.priceRupees ?? p.price_inr ?? p.price;
          const numPrice = Number(rawPrice);
          const rawDays = p.durationDays ?? p.duration_days;
          const numDays = Number(rawDays);
          return {
            id,
            name: p.name || defaultRef.name,
            durationDays: !isNaN(numDays) && numDays > 0 ? numDays : defaultRef.durationDays,
            priceRupees: !isNaN(numPrice) && numPrice >= 0 ? numPrice : defaultRef.priceRupees,
            description: p.description || defaultRef.description
          };
        });
        setSubscriptionPlans(normalized);
      }
    } catch {
      // Offline fallback: keep current defaults
    }
  };

  const refreshWatchPassStatus = async () => {
    if (!isAuthenticated) {
      setUserWatchPasses({ activePasses: [], expiredPasses: [], pendingPasses: [] });
      setActiveWatchPass(null);
      setHasActiveWatchPass(false);
      return;
    }
    try {
      const res = await api.watchPasses.getMyPasses();
      if (res) {
        const active = Array.isArray(res.activePasses) ? res.activePasses : [];
        const expired = Array.isArray(res.expiredPasses) ? res.expiredPasses : [];
        const pending = Array.isArray(res.pendingPasses) ? res.pendingPasses : [];
        setUserWatchPasses({ activePasses: active, expiredPasses: expired, pendingPasses: pending });
        setActiveWatchPass(active.length > 0 ? active[0] : null);
        setHasActiveWatchPass(active.length > 0);
      }
    } catch {
      // Offline fallback
    }
  };

  const refreshSubscriptionStatus = async () => {
    if (!isAuthenticated) {
      setActiveSubscription(null);
      setPendingSubscription(null);
      setHasActiveSubscription(false);
      setUserWatchPasses({ activePasses: [], expiredPasses: [], pendingPasses: [] });
      setActiveWatchPass(null);
      setHasActiveWatchPass(false);
      return;
    }
    try {
      const [statusRes, passRes] = await Promise.allSettled([
        api.subscriptions.getMyStatus(),
        api.watchPasses.getMyPasses()
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value) {
        setHasActiveSubscription(Boolean(statusRes.value.hasActiveSubscription));
        setActiveSubscription(statusRes.value.activeSubscription || null);
        setPendingSubscription(statusRes.value.pendingSubscription || null);
      }

      if (passRes.status === 'fulfilled' && passRes.value) {
        const active = Array.isArray(passRes.value.activePasses) ? passRes.value.activePasses : [];
        const expired = Array.isArray(passRes.value.expiredPasses) ? passRes.value.expiredPasses : [];
        const pending = Array.isArray(passRes.value.pendingPasses) ? passRes.value.pendingPasses : [];
        setUserWatchPasses({ activePasses: active, expiredPasses: expired, pendingPasses: pending });
        setActiveWatchPass(active.length > 0 ? active[0] : null);
        setHasActiveWatchPass(active.length > 0);
      }
    } catch {
      // Offline fallback
    }
  };

  // Search History persistent state (stored in 'flops_search_history')
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('flops_search_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.slice(0, 10);
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const addSearchHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('flops_search_history', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const removeSearchHistoryItem = (query: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(item => item !== query);
      try {
        localStorage.setItem('flops_search_history', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('flops_search_history');
    } catch {
      // Ignore
    }
  };

  const submitSubscriptionRequest = async (plan: 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY', utr: string, userName?: string, userEmail?: string, promoCode?: string) => {
    try {
      const finalName = userName || user.name || 'FLOPSHOW Subscriber';
      const finalEmail = userEmail || user.email || 'subscriber@flopshow.in';
      const res = await api.subscriptions.submitRequest(plan, utr, finalName, finalEmail, promoCode);
      await refreshSubscriptionStatus();
      showToast(res.message || 'Subscription payment submitted! Awaiting administrator verification.', 'success');
      return { success: true, message: res.message };
    } catch (err: any) {
      showToast(err.message || 'Failed to submit subscription request.', 'error');
      return { success: false, message: err.message || 'Submission failed' };
    }
  };

  const openSubscriptionModal = (planId?: 'MONTHLY' | '3_MONTHS' | 'YEARLY' | 'WEEKLY', initialStep: 'choose' | 'pay' = 'choose') => {
    if (planId) {
      setSubscriptionTargetPlan(planId);
    }
    setSubscriptionTargetStep(initialStep);
    setActiveModal('subscription');
  };

  const closeSubscriptionModal = () => {
    setActiveModal(null);
  };

  // Fetch central catalog from backend
  const refreshCatalog = async () => {
    try {
      const items = await api.content.list({ limit: 1000 });
      setCatalog(items || []);
    } catch {
      // Offline: keep current state
    }
  };

  useEffect(() => {
    refreshCatalog();
    refreshMonetizationConfig();

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
      // Validate token with backend and restore user session
      api.auth.me().then(({ user: serverUser, wallet: serverWallet }) => {
        if (serverUser) {
          const isSuper = Boolean(
            serverUser.is_super_admin === 1 ||
            serverUser.is_super_admin === true ||
            (serverUser.email && serverUser.email.toLowerCase() === 'ashukataria2005@gmail.com')
          );
          const perms = Array.isArray(serverUser.permissions)
            ? serverUser.permissions
            : (isSuper ? ['analytics', 'monetization', 'promos', 'payments', 'catalog', 'users', 'settings'] : []);

          const restoredUser: User = {
            id: serverUser.id,
            name: serverUser.name,
            email: serverUser.email,
            avatarInitials: (serverUser.name || '').trim().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U',
            joinedDate: serverUser.createdAt ? new Date(serverUser.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : formatCurrentDate(),
            role: serverUser.role,
            is_super_admin: isSuper,
            permissions: perms,
            status: serverUser.status || 'ACTIVE',
            last_login_at: serverUser.last_login_at || null,
          };
          setUser(restoredUser);
          saveToStorage('flops_user', restoredUser);
          saveToStorage('user', restoredUser);
          if (serverWallet?.balanceRupees !== undefined) {
            setWalletBalance(serverWallet.balanceRupees);
          }
          setIsAuthenticated(true);

          // Fetch purchases for restored session
          syncPurchases();

          // Sync wallet transactions from backend
          syncTransactions();

          // Sync watch progress from backend
          syncProgressFromBackend();
        }
      }).catch(async (err: any) => {
        // Persistent User Session:
        // User MUST stay logged in indefinitely until they explicitly click "Log Out".
        // Do NOT invalidate user session on window reload, cold start, or network hiccups!
        console.warn('[Auth] Session validation offline or delayed; retaining cached user session.', err);
      }).finally(() => {
        setSessionLoading(false);
      });
    } else {
      setSessionLoading(false);
    }
  }, []);

  // Synchronize subscription status and purchases whenever user authentication changes
  useEffect(() => {
    refreshSubscriptionStatus();
    if (isAuthenticated) {
      syncPurchases();
    }
  }, [isAuthenticated, user?.id]);

  const syncPurchases = async () => {
    try {
      const backendPurchases = await api.library.getPurchases();
      if (Array.isArray(backendPurchases)) {
        const localPurchases: PurchaseRecord[] = backendPurchases.map((p: any) => ({
          id: p.id,
          contentId: p.content_id || p.contentId,
          title: p.title || p.content_title || '',
          price: typeof p.amount_paid === 'number' ? p.amount_paid / 100 : (p.price || 0),
          purchasedAt: new Date(p.created_at || p.purchased_at || Date.now()).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
          }),
          expiresAt: p.expires_at || null,
          isExpired: Boolean(p.is_expired),
          daysRemaining: typeof p.days_remaining === 'number' ? p.days_remaining : null,
          contentType: p.content_type || 'movie',
          poster: p.poster || null
        }));
        setPurchases(localPurchases);
      }
    } catch {
      // Keep existing purchases on network error
    }
  };

  // Proactive background session refresh to prevent random expiry during long editing sessions
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const token = tokenStorage.get();
      if (token) {
        api.auth.refresh().catch(() => {
          // Ignore background refresh errors
        });
      }
    }, 4 * 60 * 60 * 1000); // every 4 hours

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const token = tokenStorage.get();
        if (token) {
          api.auth.refresh().catch(() => {});
          refreshSubscriptionStatus().catch(() => {});
          syncPurchases().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  // Real-time entitlement polling:
  // When a user has a pending subscription or watch pass request,
  // poll every 5 seconds so access activates immediately on admin approval without reload
  useEffect(() => {
    if (!isAuthenticated) return;
    const hasPending = Boolean(pendingSubscription || (userWatchPasses?.pendingPasses && userWatchPasses.pendingPasses.length > 0));
    if (!hasPending) return;

    const pollTimer = setInterval(async () => {
      try {
        await refreshSubscriptionStatus();
        await syncPurchases();
      } catch {
        // Ignore polling errors
      }
    }, 5000);

    return () => {
      clearInterval(pollTimer);
    };
  }, [isAuthenticated, Boolean(pendingSubscription), userWatchPasses?.pendingPasses?.length]);

  // Auto-dismiss paywall modal and toast when subscription/pass activates in real time
  useEffect(() => {
    if (isAuthenticated && (hasActiveSubscription || hasActiveWatchPass)) {
      if (activeModal === 'subscription' || activeModal === 'watchpass' || activeModal === 'plan_selector') {
        setActiveModal(null);
        showToast('Your access is now ACTIVE! Enjoy full catalog streaming.', 'success');
      }
    }
  }, [hasActiveSubscription, hasActiveWatchPass]);

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
  const login = (
    userId: string,
    name: string,
    email: string,
    role: 'USER' | 'ADMIN' = 'USER',
    serverWalletBalance?: number,
    extraFields?: {
      is_super_admin?: boolean;
      permissions?: string[];
      status?: 'ACTIVE' | 'SUSPENDED';
      last_login_at?: string | null;
    }
  ) => {
    const initials = name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    const isSuper = Boolean(
      extraFields?.is_super_admin === true ||
      (extraFields as any)?.is_super_admin === 1 ||
      String(extraFields?.is_super_admin) === '1' ||
      String(extraFields?.is_super_admin).toLowerCase() === 'true' ||
      (email && email.toLowerCase() === 'ashukataria2005@gmail.com')
    );
    const perms = Array.isArray(extraFields?.permissions)
      ? extraFields!.permissions
      : (isSuper ? ['analytics', 'monetization', 'promos', 'payments', 'catalog', 'users', 'settings'] : (role === 'ADMIN' ? ['analytics', 'monetization', 'promos', 'payments', 'catalog', 'users', 'settings'] : []));

    if (role === 'ADMIN') {
      try {
        localStorage.removeItem('user');
        localStorage.removeItem('flopshow_auth_token');
      } catch {}
    }

    const newUser: User = {
      id: userId,   // Real backend UUID — never a client-generated timestamp ID
      name,
      email,
      avatarInitials: initials,
      joinedDate: formatCurrentDate(),
      role,
      is_super_admin: isSuper,
      permissions: perms,
      status: extraFields?.status || 'ACTIVE',
      last_login_at: extraFields?.last_login_at || null,
    };
    setUser(newUser);
    // Persist the real user so a browser refresh restores it correctly
    saveToStorage('flops_user', newUser);
    saveToStorage('user', newUser);
    setIsAuthenticated(true);
    // Use the authoritative server wallet balance; reset purchases so we re-sync from backend.
    setWalletBalance(typeof serverWalletBalance === 'number' ? serverWalletBalance : 0);
    setPurchases([]);
    closeAuthModal();
    showToast(`Signed in as ${name}`, 'success');
    // Fetch authoritative purchases from backend for the newly logged-in user
    syncPurchases();
    // Sync wallet transactions
    syncTransactions();
    // Sync watch progress from backend
    syncProgressFromBackend();
  };

  const signup = (userId: string, name: string, email: string, serverWalletBalance?: number) => {
    login(userId, name, email, 'USER', serverWalletBalance);
    showToast(`Account created! Welcome to FLOPSHOW.`, 'success');
  };

  const logout = () => {
    api.auth.logout();
    tokenStorage.clear();
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
    setUserWatchPasses({ activePasses: [], expiredPasses: [], pendingPasses: [] });
    setActiveWatchPass(null);
    setHasActiveWatchPass(false);
    // Clear persisted per-user keys from localStorage
    saveToStorage('flops_user', GUEST_USER);
    saveToStorage('user', GUEST_USER);
    saveToStorage('wallet_balance', 0);
    saveToStorage('purchases', []);
    saveToStorage('my_list', []);
    saveToStorage('watch_progress', []);
    showToast('Signed out', 'info');
  };

  const updateProfile = (name: string, email: string) => {
    const initials = name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || user.avatarInitials;
    const updated = { ...user, name, email, avatarInitials: initials };
    setUser(updated);
    saveToStorage('flops_user', updated);
    saveToStorage('user', updated);
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

  // Sync watch progress from backend database and merge with local state
  const syncProgressFromBackend = async () => {
    try {
      const records = await api.library.getAllProgress();
      if (records && Array.isArray(records)) {
        const serverProgress: WatchProgress[] = records.map((r: any) => ({
          contentId: r.content_id || r.contentId,
          contentType: r.episode_id ? 'series' : 'movie',
          title: r.title || '',
          posterUrl: r.poster || '',
          percent: typeof r.progress_percent === 'number' ? r.progress_percent : 0,
          currentTime: typeof r.current_time_seconds === 'number' ? r.current_time_seconds : 0,
          duration: typeof r.duration_seconds === 'number' ? r.duration_seconds : 0,
          episodeId: r.episode_id || undefined,
          completed: Boolean(r.completed === 1 || r.completed === true || r.progress_percent >= 90),
          updatedAt: r.updated_at || formatCurrentDate()
        }));

        setWatchProgress(prev => {
          const map = new Map<string, WatchProgress>();
          const makeKey = (p: WatchProgress) => `${p.contentId}:${p.episodeId || 'movie'}`;

          for (const item of serverProgress) {
            map.set(makeKey(item), item);
          }
          for (const item of prev) {
            const key = makeKey(item);
            const existing = map.get(key);
            if (!existing || new Date(item.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
              map.set(key, item);
            }
          }
          return Array.from(map.values());
        });
      }
    } catch {
      // Keep cached progress if offline
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
      if (p.isExpired) return false;
      if (p.contentId === contentId) return true;
      if (catalogItem && (p.contentId === catalogItem.id || (catalogItem as any).slug === p.contentId)) return true;
      return false;
    });
  };

  const buyContent = async (item: ContentItem): Promise<{ success: boolean; message: string }> => {
    // Prevent double charge if already actively owned
    if (isOwned(item.id)) {
      return {
        success: true,
        message: 'You already own this title.'
      };
    }

    try {
      const result = await api.purchases.buy(item.id);
      // Update wallet balance from backend
      if (typeof result.remainingBalanceRupees === 'number') {
        setWalletBalance(result.remainingBalanceRupees);
      }
      syncTransactions();

      // Format purchase entry with 30-day validity
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
        }),
        expiresAt: (result as any).purchase?.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isExpired: false,
        daysRemaining: 30,
        contentType: item.type,
        poster: item.posterUrl
      };

      // Refetch purchases to get the updated list from backend
      try {
        const backendPurchases = await api.library.getPurchases();
        const localPurchases: PurchaseRecord[] = backendPurchases.map((p: any) => ({
          id: p.id,
          contentId: p.content_id || p.contentId,
          title: p.title || p.content_title || item.title,
          price: typeof p.amount_paid === 'number' ? p.amount_paid / 100 : (p.price || item.price),
          purchasedAt: new Date(p.created_at || p.purchased_at || Date.now()).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          }),
          expiresAt: p.expires_at || null,
          isExpired: Boolean(p.is_expired),
          daysRemaining: typeof p.days_remaining === 'number' ? p.days_remaining : null,
          contentType: p.content_type || item.type,
          poster: p.poster || item.posterUrl
        }));

        if (!localPurchases.some(p => p.contentId === item.id)) {
          localPurchases.unshift(newPurchaseEntry);
        }
        setPurchases(localPurchases);
      } catch {
        setPurchases(prev => [newPurchaseEntry, ...prev.filter(p => p.contentId !== item.id)]);
      }

      showToast(`Unlocked "${item.title}" for 1 Month! Enjoy streaming.`, 'success');
      return { success: true, message: 'Purchase complete.' };
    } catch (err: any) {
      if (err.status === 409) {
        // Backend confirms already actively owned
        if (!purchases.some(p => p.contentId === item.id && !p.isExpired)) {
          await syncPurchases();
        }
        return { success: true, message: 'You already own an active pass for this title.' };
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

  // Watch Progress (Null-Safe Movie vs Episode Specific)
  const getProgress = (contentId: string, episodeId?: string): WatchProgress | undefined => {
    if (episodeId) {
      return watchProgress.find(p => p.contentId === contentId && p.episodeId === episodeId)
        || watchProgress.find(p => p.episodeId === episodeId);
    }
    // For movie or overall series:
    // If movie entry exists (no episodeId), return it
    const movieEntry = watchProgress.find(p => p.contentId === contentId && !p.episodeId);
    if (movieEntry) return movieEntry;
    // Otherwise return the latest progress for this content (e.g. series most recent episode)
    return watchProgress.find(p => p.contentId === contentId);
  };

  const saveWatchProgress = (progressData: Omit<WatchProgress, 'updatedAt'>) => {
    const isCompleted = progressData.completed !== undefined
      ? progressData.completed
      : (progressData.percent >= 90);

    const entry: WatchProgress = {
      ...progressData,
      completed: isCompleted,
      updatedAt: formatCurrentDate()
    };

    setWatchProgress(prev => {
      const filtered = prev.filter(p => {
        if (progressData.episodeId) {
          return !(p.contentId === progressData.contentId && p.episodeId === progressData.episodeId);
        }
        return !(p.contentId === progressData.contentId && !p.episodeId);
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
    let activeVcdnStatus: string | undefined = undefined;
    let activeMaxResolution: '720p' | '1080p' | undefined = undefined;
    let activeDownloadAllowed: boolean | undefined = undefined;
    let activeSubtitles: Array<{ id?: string; label: string; language: string; url: string; format?: string }> | undefined = undefined;

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

        // Select the episode from progress: prioritize the latest in-progress episode
        const seriesProgress = watchProgress.filter(p => p.contentId === content.id && p.episodeId);
        const activeEpProgress = seriesProgress.find(p => !p.completed && (p.percent || 0) < 90) || seriesProgress[0];
        if (activeEpProgress?.episodeId && content.seasons) {
          ep = content.seasons.flatMap(s => s.episodes).find(e => e.id === activeEpProgress.episodeId);
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
      const cleanEpTitle = ep.title ? ep.title.replace(/^Episode\s*\d+\s*[:\-]\s*/i, '').trim() : '';
      subtitle = `S${ep.seasonNumber} E${ep.episodeNumber}: ${cleanEpTitle || ep.title}`;
      episodeId = ep.id;

      // Attempt to resolve real episode media from backend database
      try {
        const mediaRes = await api.media.getEpisodeMedia(ep.id, 'MAIN');
        if (mediaRes?.url && mediaRes.url.trim() !== '') {
          sourceUrl = mediaRes.url;
        }
        if ((mediaRes as any)?.subtitles) {
          activeSubtitles = (mediaRes as any).subtitles;
        }
        if ((mediaRes as any)?.vcdnStatus) {
          activeVcdnStatus = (mediaRes as any).vcdnStatus;
        }
        if ((mediaRes as any)?.maxResolution) {
          activeMaxResolution = (mediaRes as any).maxResolution;
        }
        if (typeof (mediaRes as any)?.downloadAllowed === 'boolean') {
          activeDownloadAllowed = (mediaRes as any).downloadAllowed;
        }
      } catch (err: any) {
        if (err?.code === 'SUBSCRIPTION_REQUIRED' || (monetizationMode === 'SUBSCRIPTION' && (err?.code === 'PURCHASE_REQUIRED' || err?.status === 403))) {
          showToast('Subscribe or get a Watch Pass to watch this title', 'info');
          openPlanSelector(content);
          return;
        }
        if (err?.code === 'PURCHASE_REQUIRED' || err?.status === 403) {
          if (!skipOwnershipCheck && !isOwned(content.id) && !content.isFree) {
            showToast('Subscribe or get a Watch Pass to watch this title', 'info');
            openPlanSelector(content);
            return;
          }
        }
        if (ep.videoUrl && ep.videoUrl.trim() !== '') {
          sourceUrl = ep.videoUrl;
        }
      }

      // Safeguard: Ensure episode media never uses series trailer or demo streams
      if (content.trailerUrl && sourceUrl === content.trailerUrl) {
        sourceUrl = '';
      }
      if (isDemoStreamUrl(sourceUrl)) {
        sourceUrl = '';
      }

      if (!sourceUrl || sourceUrl.trim() === '') {
        try {
          const streamRes = await api.streaming.getEpisodeStream(content.id, ep.id);
          if (streamRes?.source?.streamUrl && !isDemoStreamUrl(streamRes.source.streamUrl)) {
            sourceUrl = streamRes.source.streamUrl;
            if (streamRes.source.subtitles) {
              activeSubtitles = streamRes.source.subtitles;
            }
          }
        } catch {
          // Keep empty
        }
      }

      if (!sourceUrl || sourceUrl.trim() === '' || isDemoStreamUrl(sourceUrl)) {
        showToast(`No playable video is currently configured for Episode ${ep.episodeNumber}: "${ep.title}".`, 'info');
        return;
      }
    } else {
      setActiveEpisode(null);
      activeVcdnStatus = (content as any)?.vcdnStatus;

      // Attempt to resolve real movie media from backend database
      try {
        const mediaRes = await api.media.getContentMedia(content.id, 'MAIN');
        if (mediaRes?.url && mediaRes.url.trim() !== '') {
          sourceUrl = mediaRes.url;
        }
        if ((mediaRes as any)?.subtitles) {
          activeSubtitles = (mediaRes as any).subtitles;
        }
        if ((mediaRes as any)?.vcdnStatus) {
          activeVcdnStatus = (mediaRes as any).vcdnStatus;
        }
        if ((mediaRes as any)?.maxResolution) {
          activeMaxResolution = (mediaRes as any).maxResolution;
        }
        if (typeof (mediaRes as any)?.downloadAllowed === 'boolean') {
          activeDownloadAllowed = (mediaRes as any).downloadAllowed;
        }
      } catch (err: any) {
        if (err?.code === 'SUBSCRIPTION_REQUIRED' || (monetizationMode === 'SUBSCRIPTION' && (err?.code === 'PURCHASE_REQUIRED' || err?.status === 403))) {
          showToast('Subscribe or get a Watch Pass to watch this title', 'info');
          openPlanSelector(content);
          return;
        }
        if (err?.code === 'PURCHASE_REQUIRED' || err?.status === 403) {
          if (!skipOwnershipCheck && !isOwned(content.id) && !content.isFree) {
            showToast('Subscribe or get a Watch Pass to watch this title', 'info');
            openPlanSelector(content);
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
      if (isDemoStreamUrl(sourceUrl)) {
        sourceUrl = '';
      }

      if (!sourceUrl || sourceUrl.trim() === '') {
        try {
          const streamRes = await api.streaming.getMovieStream(content.id);
          if (streamRes?.source?.streamUrl && !isDemoStreamUrl(streamRes.source.streamUrl)) {
            sourceUrl = streamRes.source.streamUrl;
            if (streamRes.source.subtitles) {
              activeSubtitles = streamRes.source.subtitles;
            }
          }
        } catch {
          // Keep empty
        }
      }

      if (!sourceUrl || sourceUrl.trim() === '' || isDemoStreamUrl(sourceUrl)) {
        showToast(`No playable video is currently configured for "${content.title}".`, 'info');
        return;
      }
    }

    const resolvedUrl = resolveMediaUrl(sourceUrl, API_BASE_URL);
    const progress = ep ? getProgress(content.id, ep.id) : getProgress(content.id);

    // If item was already completed (>= 90%), restart from beginning (0s); otherwise resume exact position
    const resumeTime = (progress && !progress.completed && (progress.percent || 0) < 90) ? (progress.currentTime || 0) : 0;

    setActiveMediaSource({
      title: content.title,
      subtitle,
      mediaType: 'MAIN',
      url: resolvedUrl,
      poster: ep?.thumbnailUrl || content.backdropUrl || content.posterUrl,
      contentId: content.id,
      episodeId,
      initialTimeSeconds: resumeTime,
      vcdnStatus: activeVcdnStatus || (content as any)?.vcdnStatus,
      maxResolution: activeMaxResolution,
      downloadAllowed: activeDownloadAllowed,
      subtitles: activeSubtitles
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
        syncPurchases,
        myList,
        inMyList,
        toggleMyList,
        watchProgress,
        getProgress,
        saveWatchProgress,
        activeModal,
        purchaseTarget,
        watchPassTarget,
        planSelectorTarget,
        openPlanSelector,
        closePlanSelector,
        openPurchaseModal,
        closePurchaseModal,
        openRechargeModal,
        closeRechargeModal,
        openAuthModal,
        closeAuthModal,
        openSubscriptionModal,
        closeSubscriptionModal,
        openWatchPassModal,
        closeWatchPassModal,
        watchPassInitialPlan,
        watchPassInitialStep,
        subscriptionTargetPlan,
        subscriptionTargetStep,
        monetizationMode,
        subscriptionPlans,
        activeSubscription,
        pendingSubscription,
        hasActiveSubscription,
        activeWatchPass,
        activeWatchPasses: userWatchPasses.activePasses,
        hasActiveWatchPass,
        userWatchPasses,
        refreshMonetizationConfig,
        refreshSubscriptionStatus,
        refreshWatchPassStatus,
        submitSubscriptionRequest,
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
        sessionLoading,
        searchHistory,
        addSearchHistory,
        removeSearchHistoryItem,
        clearSearchHistory
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

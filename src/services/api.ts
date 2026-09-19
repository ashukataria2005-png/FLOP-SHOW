/// <reference types="vite/client" />
import { ContentItem, Season, Episode } from '../types/content';
import { resolveMediaUrl } from '../utils/mediaUrl';

/**
 * Backend API Base URL Configuration:
 * - Uses VITE_API_BASE_URL for the backend base URL.
 * - In production, defaults to the live backend (https://flop-show.onrender.com).
 * - Local development continues working with the existing local API/proxy setup ('/api')
 *   unless VITE_API_BASE_URL is explicitly set.
 */
function resolveApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  // If in production environment or deployed remotely
  if (
    import.meta.env.PROD ||
    import.meta.env.MODE === 'production' ||
    (typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1')
  ) {
    return 'https://flop-show.onrender.com/api';
  }
  // Local development fallback to Vite proxy setup
  return '/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Helper to get and set auth tokens in localStorage
 */
const TOKEN_KEY = 'flopshow_auth_token';
const ADMIN_TOKEN_KEY = 'flopshow_admin_token';
const ADMIN_QUICK_LOGIN_KEY = 'flopshow_admin_quick_login';

export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore in non-browser environments
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore
    }
  }
};

export const adminTokenStorage = {
  get: (): string | null => {
    try {
      const direct = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (direct) return direct;
      const quick = localStorage.getItem(ADMIN_QUICK_LOGIN_KEY);
      if (quick) {
        const parsed = JSON.parse(quick);
        if (parsed?.token) return parsed.token;
      }
      return null;
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } catch {
      // Ignore
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
      // Ignore
    }
  }
};

interface RequestOptions extends RequestInit {
  _isRetry?: boolean;
}

/**
 * Standard HTTP Request Wrapper for FLOPSHOW API
 * Robust session handling:
 * - Differentiates admin vs user tokens
 * - Transparently auto-refreshes on 401 before giving up
 * - Never destroys state on transient network/server errors
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const isAdminEndpoint =
    endpoint.startsWith('/admin') ||
    endpoint.startsWith('/payments/admin') ||
    endpoint.includes('admin-quick-login');

  const token = isAdminEndpoint
    ? (adminTokenStorage.get() || tokenStorage.get())
    : (tokenStorage.get() || adminTokenStorage.get());

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // If 401 Unauthorized, attempt transparent token refresh ONCE before throwing or destroying session
    if (response.status === 401 && !options._isRetry && token) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json().catch(() => ({}));
          if (refreshData?.token) {
            const freshToken = refreshData.token;
            if (isAdminEndpoint) {
              adminTokenStorage.set(freshToken);
              try {
                const quick = localStorage.getItem(ADMIN_QUICK_LOGIN_KEY);
                if (quick) {
                  const parsed = JSON.parse(quick);
                  parsed.token = freshToken;
                  localStorage.setItem(ADMIN_QUICK_LOGIN_KEY, JSON.stringify(parsed));
                }
              } catch {
                // Ignore storage parsing error
              }
            } else {
              tokenStorage.set(freshToken);
            }

            // Retry original request once with fresh token
            const retryHeaders = {
              ...headers,
              'Authorization': `Bearer ${freshToken}`
            };

            return await request<T>(endpoint, {
              ...options,
              headers: retryHeaders,
              _isRetry: true
            });
          }
        }
      } catch {
        // Fall through to standard error throw below
      }
    }

    const message = data?.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).code = data?.error?.code;
    throw error;
  }

  return data as T;
}

/**
 * Adapter mapping backend database content schema to frontend ContentItem interface
 */
export function adaptDbContentToFrontend(item: any): ContentItem {
  let cast: string[] = [];
  try {
    cast = typeof item.cast_json === 'string' ? JSON.parse(item.cast_json) : (item.cast || []);
  } catch {
    cast = [];
  }

  const seasons: Season[] = (item.seasons || []).map((s: any) => ({
    seasonNumber: s.season_number ?? s.seasonNumber,
    title: s.title,
    episodes: (s.episodes || []).map((e: any): Episode => ({
      id: e.id,
      seriesId: item.id,
      seasonNumber: s.season_number ?? s.seasonNumber,
      episodeNumber: e.episode_number ?? e.episodeNumber,
      title: e.title,
      duration: e.duration || '45m',
      durationSeconds: e.duration_seconds ?? e.durationSeconds ?? 0,
      thumbnailUrl: resolveMediaUrl(e.thumbnail || e.thumbnail_url || e.thumbnailUrl || item.poster || item.posterUrl, API_BASE_URL),
      videoUrl: e.video_url || e.videoUrl ? resolveMediaUrl(e.video_url || e.videoUrl, API_BASE_URL) : '',
      synopsis: e.description || e.synopsis || ''
    }))
  }));

  const priceRupees = item.price ? Math.round(item.price / 100) : (item.priceRupees ?? 0);

  return {
    id: item.id,
    title: item.title,
    type: item.type ? (item.type.toLowerCase() as 'movie' | 'series') : 'movie',
    backdropUrl: item.backdrop || item.backdropUrl || item.backdrop_url,
    posterUrl: item.poster || item.posterUrl || item.poster_url,
    tagline: item.tagline,
    description: item.description,
    about: item.about || item.description,
    rating: Number(item.rating || 8.0),
    releaseYear: Number(item.release_year || item.releaseYear || 2025),
    runtime: item.duration || item.runtime || undefined,
    seasonsCount: seasons.length > 0 ? seasons.length : (item.seasonsCount || item.seasons_count || undefined),
    language: item.language || 'Hindi',
    genres: item.genres || [],
    price: priceRupees,
    isFree: priceRupees === 0,
    isFeatured: Boolean(item.featured ?? item.isFeatured),
    isHero: Boolean(item.is_hero ?? item.isHero),
    director: item.director || undefined,
    cast,
    trailerUrl: item.trailer_url || item.trailerUrl ? resolveMediaUrl(item.trailer_url || item.trailerUrl, API_BASE_URL) : undefined,
    videoUrl: item.video_url || item.videoUrl ? resolveMediaUrl(item.video_url || item.videoUrl, API_BASE_URL) : undefined,
    trendingPosition: item.trending_position !== null && item.trending_position !== undefined ? Number(item.trending_position) : (item.trendingPosition !== undefined ? Number(item.trendingPosition) : undefined),
    displayPriority: item.display_priority !== null && item.display_priority !== undefined ? Number(item.display_priority) : (item.displayPriority !== undefined ? Number(item.displayPriority) : undefined),
    seasons: seasons.length > 0 ? seasons : undefined,
    status: (item.status || 'PUBLISHED') as 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED'
  };
}

/**
 * FLOPSHOW Central API Service Client
 */
export const api = {
  // --------------------------------------------------------------------------
  // AUTHENTICATION
  // --------------------------------------------------------------------------
  auth: {
    async register(name: string, email: string, password: string) {
      const data = await request<{ user: any; token: string; wallet: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      tokenStorage.set(data.token);
      return data;
    },

    async login(email: string, password: string) {
      const data = await request<{ user: any; token: string; wallet: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      tokenStorage.set(data.token);
      return data;
    },

    async adminLogin(adminId: string, adminPassword: string) {
      const data = await request<{ user: any; token: string }>('/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ adminId, adminPassword })
      });
      adminTokenStorage.set(data.token);
      tokenStorage.set(data.token);
      return data;
    },

    async me() {
      const data = await request<{ user: any; wallet: any; token?: string }>('/auth/me');
      if (data && data.token) {
        if (data.user?.role === 'ADMIN') {
          adminTokenStorage.set(data.token);
        }
        tokenStorage.set(data.token);
      }
      return data;
    },

    async refresh() {
      const data = await request<{ success: boolean; user: any; wallet: any; token: string }>('/auth/refresh', {
        method: 'POST'
      });
      if (data && data.token) {
        if (data.user?.role === 'ADMIN') {
          adminTokenStorage.set(data.token);
        }
        tokenStorage.set(data.token);
      }
      return data;
    },

    async adminQuickLogin() {
      const data = await request<{ success: boolean; user: any; token: string; message: string }>('/auth/admin-quick-login', {
        method: 'POST'
      });
      if (data && data.token) {
        adminTokenStorage.set(data.token);
        tokenStorage.set(data.token);
      }
      return data;
    },

    async changePassword(currentPassword: string, newPassword: string) {
      return request<{ success: boolean; message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
    },

    async updateProfile(name: string, email?: string) {
      return request<{ success: boolean; user: any }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, email })
      });
    },

    logout() {
      tokenStorage.clear();
      adminTokenStorage.clear();
    }
  },

  // --------------------------------------------------------------------------
  // CONTENT & CATALOG
  // --------------------------------------------------------------------------
  content: {
    async list(params?: { type?: 'MOVIE' | 'SERIES'; genre?: string; limit?: number }) {
      const query = new URLSearchParams();
      if (params?.type) query.append('type', params.type);
      if (params?.genre && params.genre !== 'All') query.append('genre', params.genre);
      if (params?.limit) query.append('limit', String(params.limit));

      const qs = query.toString() ? `?${query.toString()}` : '';
      const data = await request<{ items: any[] }>(`/content${qs}`);
      return data.items.map(adaptDbContentToFrontend);
    },

    async featured() {
      const data = await request<{ items: any[] }>('/content/featured');
      return data.items.map(adaptDbContentToFrontend);
    },

    async getHero(): Promise<ContentItem | null> {
      try {
        const data = await request<{ hero: any | null }>('/content/hero');
        return data.hero ? adaptDbContentToFrontend(data.hero) : null;
      } catch {
        return null;
      }
    },

    async getSpotlight(): Promise<ContentItem | null> {
      try {
        const data = await request<{ spotlight: any | null; spotlights?: any[] }>('/content/spotlight');
        return data.spotlight ? adaptDbContentToFrontend(data.spotlight) : null;
      } catch {
        return null;
      }
    },

    async getSpotlights(): Promise<ContentItem[]> {
      try {
        const data = await request<{ spotlights: any[] }>('/content/spotlights');
        return (data.spotlights || []).map(adaptDbContentToFrontend);
      } catch {
        return [];
      }
    },

    async getAdsConfig(): Promise<{
      enabled: boolean;
      type: 'IMAGE' | 'VIDEO';
      mediaUrl: string;
      durationSeconds: number;
      skipEnabled: boolean;
      skipAfterSeconds: number;
      title: string;
      clickUrl: string;
    }> {
      try {
        const data = await request<{ ads: any }>('/content/ads');
        return data.ads;
      } catch {
        return {
          enabled: false,
          type: 'IMAGE',
          mediaUrl: '',
          durationSeconds: 10,
          skipEnabled: true,
          skipAfterSeconds: 5,
          title: 'Advertisement',
          clickUrl: ''
        };
      }
    },

    async getTheme(): Promise<string> {
      try {
        const data = await request<{ theme: string }>('/content/theme');
        return data.theme || 'flopshow-gold';
      } catch {
        return 'flopshow-gold';
      }
    },

    async getDetails(idOrSlug: string): Promise<ContentItem> {
      const data = await request<{ item: any }>(`/content/${idOrSlug}`);
      return adaptDbContentToFrontend(data.item);
    },

    async search(query: string, options?: { type?: 'MOVIE' | 'SERIES'; genre?: string }) {
      const params = new URLSearchParams({ q: query });
      if (options?.type) params.append('type', options.type);
      if (options?.genre && options.genre !== 'All') params.append('genre', options.genre);

      const data = await request<{ items: any[] }>(`/content/search?${params.toString()}`);
      return data.items.map(adaptDbContentToFrontend);
    },

    async getGenres(): Promise<{ id: string; name: string; slug: string }[]> {
      const data = await request<{ genres: any[] }>('/content/genres');
      return data.genres;
    }
  },

  // --------------------------------------------------------------------------
  // PURCHASES
  // --------------------------------------------------------------------------
  purchases: {
    async buy(contentId: string) {
      return request<{ success: boolean; remainingBalanceRupees: number; message: string }>(
        '/purchases',
        {
          method: 'POST',
          body: JSON.stringify({ contentId })
        }
      );
    },

    async checkOwnership(contentId: string): Promise<boolean> {
      try {
        const data = await request<{ isOwned: boolean }>(`/purchases/check/${contentId}`);
        return data.isOwned;
      } catch {
        return false;
      }
    }
  },

  // --------------------------------------------------------------------------
  // WALLET
  // --------------------------------------------------------------------------
  wallet: {
    async getBalance() {
      return request<{ balancePaise: number; balanceRupees: number; formattedBalance: string }>('/wallet/balance');
    },

    async getTransactions(limit = 50) {
      return request<{ transactions: any[] }>(`/wallet/transactions?limit=${limit}`);
    },

    async recharge(amountRupees: number) {
      return request<{ message: string; wallet: any }>('/wallet/recharge', {
        method: 'POST',
        body: JSON.stringify({ amount: amountRupees })
      });
    }
  },

  // --------------------------------------------------------------------------
  // UPI PAYMENTS & UTR VERIFICATION
  // --------------------------------------------------------------------------
  payments: {
    async getConfig() {
      return request<{ upiId: string; upiEnabled: boolean; merchantName: string }>('/payments/config');
    },

    async submitRequest(amountRupees: number, utr: string, userName?: string, userEmail?: string) {
      return request<{
        success: boolean;
        message: string;
        payment: any;
      }>('/payments/submit-request', {
        method: 'POST',
        body: JSON.stringify({ amount: amountRupees, utr, userName, userEmail })
      });
    },

    async getMyRequests(limit = 50) {
      return request<{ count: number; requests: any[] }>(`/payments/my-requests?limit=${limit}`);
    },

    async getAdminMetrics() {
      return request<{
        pendingCount: number;
        pendingAmountPaise: number;
        approvedCount: number;
        approvedAmountPaise: number;
        rejectedCount: number;
        rejectedAmountPaise: number;
      }>('/payments/admin/metrics');
    },

    async getAdminRequests(status = 'ALL', limit = 100) {
      return request<{ count: number; requests: any[] }>(`/payments/admin/requests?status=${status}&limit=${limit}`);
    },

    async getAdminSettings() {
      return request<{ upiId: string; upiEnabled: boolean; merchantName: string }>('/payments/admin/settings');
    },

    async updateAdminSettings(data: { upiId: string; enabled: boolean; merchantName?: string }) {
      return request<{ success: boolean; message: string; config: any }>('/payments/admin/settings', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async approvePayment(id: string, adminNote?: string) {
      return request<{
        success: boolean;
        payment: any;
        newBalanceRupees: number;
        message: string;
      }>(`/payments/admin/requests/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ adminNote })
      });
    },

    async rejectPayment(id: string, adminNote?: string) {
      return request<{
        success: boolean;
        message: string;
        payment: any;
      }>(`/payments/admin/requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ adminNote })
      });
    }
  },

  // --------------------------------------------------------------------------
  // USER LIBRARY
  // --------------------------------------------------------------------------
  library: {
    async getPurchases() {
      const data = await request<{ purchases: any[] }>('/library/purchases');
      return data.purchases;
    },

    async getMyList(): Promise<ContentItem[]> {
      const data = await request<{ items: any[] }>('/library/my-list');
      return data.items.map(adaptDbContentToFrontend);
    },

    async toggleMyList(contentId: string): Promise<{ inMyList: boolean; contentId: string }> {
      return request<{ inMyList: boolean; contentId: string }>(`/library/my-list/${contentId}`, {
        method: 'POST'
      });
    },

    async getAllProgress() {
      const data = await request<{ count: number; progress: any[] }>('/library/progress');
      return data.progress;
    },

    async getProgress(contentId: string, episodeId?: string) {
      const epParam = episodeId ? `?episodeId=${episodeId}` : '';
      const data = await request<{ progress: any }>(`/library/progress/${contentId}${epParam}`);
      return data.progress;
    },

    async saveProgress(params: {
      contentId: string;
      episodeId?: string;
      progressPercent: number;
      currentTimeSeconds: number;
      durationSeconds: number;
    }) {
      return request<{ success: boolean }>('/library/progress', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    },

    async getHistory(limit = 30) {
      const data = await request<{ history: any[] }>(`/library/history?limit=${limit}`);
      return data.history;
    }
  },

  // --------------------------------------------------------------------------
  // MEDIA & PLAYBACK
  // --------------------------------------------------------------------------
  media: {
    async getContentMedia(contentId: string, mediaType: 'MAIN' | 'TRAILER' = 'MAIN') {
      const res = await request<{
        mediaId?: string;
        mediaType: 'MAIN' | 'TRAILER';
        sourceType: 'UPLOAD' | 'DIRECT_URL' | 'YOUTUBE';
        url: string;
        embedUrl?: string;
        isYouTube: boolean;
        title: string;
        poster?: string;
        authorized: boolean;
        maxResolution?: '720p' | '1080p';
        downloadAllowed?: boolean;
      }>(`/media/content/${contentId}?type=${mediaType}`);
      if (res && res.url) {
        res.url = resolveMediaUrl(res.url, API_BASE_URL);
      }
      return res;
    },

    async getEpisodeMedia(episodeId: string, mediaType: 'MAIN' | 'TRAILER' = 'MAIN') {
      const res = await request<{
        mediaId?: string;
        mediaType: 'MAIN' | 'TRAILER';
        sourceType: 'UPLOAD' | 'DIRECT_URL' | 'YOUTUBE';
        url: string;
        embedUrl?: string;
        isYouTube: boolean;
        title: string;
        poster?: string;
        authorized: boolean;
        maxResolution?: '720p' | '1080p';
        downloadAllowed?: boolean;
      }>(`/media/episode/${episodeId}?type=${mediaType}`);
      if (res && res.url) {
        res.url = resolveMediaUrl(res.url, API_BASE_URL);
      }
      return res;
    },

    async downloadContent(contentId: string) {
      const res = await request<{
        success: boolean;
        downloadUrl: string;
        title: string;
        mimeType?: string;
      }>(`/media/download/content/${contentId}`);
      if (res && res.downloadUrl) {
        res.downloadUrl = resolveMediaUrl(res.downloadUrl, API_BASE_URL);
      }
      return res;
    },

    async downloadEpisode(episodeId: string) {
      const res = await request<{
        success: boolean;
        downloadUrl: string;
        title: string;
        mimeType?: string;
      }>(`/media/download/episode/${episodeId}`);
      if (res && res.downloadUrl) {
        res.downloadUrl = resolveMediaUrl(res.downloadUrl, API_BASE_URL);
      }
      return res;
    }
  },

  // --------------------------------------------------------------------------
  // ADMIN MANAGEMENT
  // --------------------------------------------------------------------------
  admin: {
    async getDashboard(tzOffset?: number) {
      const qs = tzOffset !== undefined ? `?tzOffset=${tzOffset}` : '';
      return request<{
        totalUsers: number;
        totalMovies: number;
        totalSeries: number;
        totalPublished: number;
        totalUnpublished: number;
        totalPurchases: number;
        totalRevenueRupees: number;
        walletActivity: {
          totalRechargeRupees: number;
          totalTransactions: number;
        };
        todayStats?: {
          todayRevenueRupees: number;
          todayPurchasesRevenueRupees: number;
          todayUpiRevenueRupees: number;
          todayNewMembersCount: number;
          todayPurchasesCount: number;
          todayUpiApprovedCount: number;
          pendingPaymentRequestsCount: number;
          pendingPaymentAmountRupees: number;
          todayProfitRupees: number;
          profitNote: string;
          calendarDate: string;
          windowStart: string;
          windowEnd: string;
        };
        currentTrending1: any | null;
        recentlyAddedContent: any[];
        recentPurchases: any[];
        recentUsers: any[];
      }>(`/admin/dashboard${qs}`);
    },

    async getTodayDetails(type: string, tzOffset?: number) {
      const offset = tzOffset !== undefined ? tzOffset : new Date().getTimezoneOffset();
      return request<any>(`/admin/today-details?type=${encodeURIComponent(type)}&tzOffset=${offset}`);
    },

    async listContent(filters: {
      status?: string;
      type?: string;
      genre?: string;
      featured?: boolean;
      trending?: boolean;
      search?: string;
      sortBy?: string;
      limit?: number;
      offset?: number;
    } = {}) {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.type && filters.type !== 'ALL') params.set('type', filters.type);
      if (filters.genre && filters.genre !== 'ALL') params.set('genre', filters.genre);
      if (filters.featured !== undefined) params.set('featured', String(filters.featured));
      if (filters.trending) params.set('trending', 'true');
      if (filters.search) params.set('search', filters.search);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.offset) params.set('offset', String(filters.offset));

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await request<{ count: number; items: any[] }>(`/admin/content${query}`);
      return res.items.map(adaptDbContentToFrontend);
    },

    async getUsers() {
      return request<{ count: number; users: any[] }>('/admin/users');
    },

    async deleteUsers(userIds: string[]) {
      return request<{ success: boolean; deletedCount: number; message: string }>('/admin/users', {
        method: 'DELETE',
        body: JSON.stringify({ userIds })
      });
    },


    async updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED') {
      return request<{ success: boolean; message: string }>(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },

    async getUserPurchases(userId: string) {
      return request<{ count: number; purchases: any[] }>(`/admin/users/${userId}/purchases`);
    },

    async getUserTransactions(userId: string) {
      return request<{ count: number; transactions: any[] }>(`/admin/users/${userId}/transactions`);
    },

    async getUserDetails(userId: string) {
      return request<{ success: boolean; user: any }>(`/admin/users/${userId}`);
    },

    async resetUserPassword(userId: string, newPassword: string) {
      return request<{ success: boolean; message: string }>(`/admin/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword })
      });
    },

    async getPurchases(limit = 100, offset = 0) {
      return request<{ count: number; purchases: any[] }>(`/admin/purchases?limit=${limit}&offset=${offset}`);
    },

    async getTransactions(limit = 100) {
      return request<{ count: number; transactions: any[] }>(`/admin/transactions?limit=${limit}`);
    },

    async uploadFile(
      file: File,
      onProgress?: (percent: number) => void
    ): Promise<{
      success: boolean;
      url: string;
      filename: string;
      mimeType: string;
      size: number;
      provider?: string;
      playbackUrl?: string;
      embedUrl?: string;
      vcdnVideoId?: string;
      vcdnStatus?: string;
    }> {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `${API_BASE_URL}/admin/upload`;

        xhr.open('POST', url, true);
        xhr.timeout = 10 * 60 * 1000; // 10 minutes timeout for large video uploads

        const token = adminTokenStorage.get() || tokenStorage.get();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
              onProgress(percent);
            }
          };
        }

        xhr.onload = () => {
          let data: any = {};
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            data = {
              error: {
                message: xhr.status === 413
                  ? 'Video file size exceeds the allowed limit (1GB). Please select a compressed file.'
                  : `Server responded with status ${xhr.status}.`
              }
            };
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            // Return the raw relative path or VCDN streaming URL as returned by the server.
            resolve({
              ...data,
              url: data.url || data.playbackUrl || ''
            });
          } else {
            const errMsg = data?.error?.message || `Upload failed with status ${xhr.status}.`;
            reject(new Error(errMsg));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during upload. Please verify your connection to the server.'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Upload timed out. The file may be too large for your connection speed.'));
        };

        const formData = new FormData();
        formData.append('file', file, file.name);
        xhr.send(formData);
      });
    },

    async getVcdnStatus(videoId: string) {
      return request<{
        success: boolean;
        vcdnVideoId: string;
        status: string;
        playbackUrl?: string;
        embedUrl?: string;
        thumbnails?: string[];
        duration?: number;
      }>(`/admin/media/vcdn/status/${videoId}`);
    },

    async createContent(contentData: any) {
      return request<{ success: boolean; contentId: string }>('/admin/content', {
        method: 'POST',
        body: JSON.stringify(contentData)
      });
    },

    async updateContent(id: string, contentData: any) {
      return request<{ success: boolean; message: string }>(`/admin/content/${id}`, {
        method: 'PUT',
        body: JSON.stringify(contentData)
      });
    },

    async deleteContent(id: string) {
      return request<{ success: boolean; message: string }>(`/admin/content/${id}`, {
        method: 'DELETE'
      });
    },

    async updatePrice(contentId: string, priceRupees: number) {
      return request<{ success: boolean }>(`/admin/content/${contentId}/price`, {
        method: 'PATCH',
        body: JSON.stringify({ priceRupees })
      });
    },

    async updateStatus(contentId: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') {
      return request<{ success: boolean }>(`/admin/content/${contentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },

    async setTrending(contentId: string, position: number | null) {
      return request<{ success: boolean; message: string }>(`/admin/content/${contentId}/trending`, {
        method: 'PATCH',
        body: JSON.stringify({ position })
      });
    },

    async attachMedia(mediaData: {
      contentId?: string;
      episodeId?: string;
      mediaType: 'MAIN' | 'TRAILER';
      sourceType?: 'UPLOAD' | 'DIRECT_URL' | 'YOUTUBE';
      url: string;
      mimeType?: string;
      duration?: string;
      thumbnail?: string;
      vcdnVideoId?: string;
      vcdnStatus?: string;
      vcdnPlaybackUrl?: string;
      vcdnEmbedUrl?: string;
      vcdnThumbnailUrl?: string;
      mediaProvider?: string;
    }) {
      return request<{ success: boolean; media: any }>('/admin/media', {
        method: 'POST',
        body: JSON.stringify(mediaData)
      });
    },

    async getContentMedia(contentId: string) {
      return request<{ count: number; media: any[] }>(`/admin/content/${contentId}/media`);
    },

    async getEpisodeMedia(episodeId: string) {
      return request<{ count: number; media: any[] }>(`/admin/episodes/${episodeId}/media`);
    },

    async deleteMedia(mediaId: string) {
      return request<{ success: boolean; message: string }>(`/admin/media/${mediaId}`, {
        method: 'DELETE'
      });
    },

    async getGenres() {
      return request<{ count: number; genres: Array<{ id: string; name: string; slug: string; contentCount: number }> }>('/admin/genres');
    },

    async createGenre(name: string, slug?: string) {
      return request<{ success: boolean; genreId: string }>('/admin/genres', {
        method: 'POST',
        body: JSON.stringify({ name, slug })
      });
    },

    async updateGenre(id: string, name: string, slug?: string) {
      return request<{ success: boolean; message: string }>(`/admin/genres/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, slug })
      });
    },

    async deleteGenre(id: string) {
      return request<{ success: boolean; message: string }>(`/admin/genres/${id}`, {
        method: 'DELETE'
      });
    },

    async getSettings() {
      return request<{ success: boolean; settings: Record<string, string> }>('/admin/settings');
    },

    async updateSettings(settings: Record<string, string>) {
      return request<{ success: boolean; message: string; settings: Record<string, string> }>('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings })
      });
    },

    async getHero(): Promise<ContentItem | null> {
      try {
        const data = await request<{ success: boolean; hero: any | null }>('/admin/hero');
        return data.hero ? adaptDbContentToFrontend(data.hero) : null;
      } catch {
        return null;
      }
    },

    async setHero(contentId: string | null): Promise<{ success: boolean; message: string; hero: ContentItem | null }> {
      const data = await request<{ success: boolean; message: string; hero: any | null }>('/admin/hero', {
        method: 'PUT',
        body: JSON.stringify({ contentId })
      });
      return {
        success: data.success,
        message: data.message,
        hero: data.hero ? adaptDbContentToFrontend(data.hero) : null
      };
    },

    async getSpotlight(): Promise<ContentItem | null> {
      try {
        const data = await request<{ success: boolean; spotlight: any | null }>('/admin/spotlight');
        return data.spotlight ? adaptDbContentToFrontend(data.spotlight) : null;
      } catch {
        return null;
      }
    },

    async getSpotlights(): Promise<ContentItem[]> {
      try {
        const data = await request<{ success: boolean; spotlights: any[] }>('/admin/spotlights');
        return (data.spotlights || []).map(adaptDbContentToFrontend);
      } catch {
        return [];
      }
    },

    async setSpotlight(contentId: string | null): Promise<{ success: boolean; message: string; spotlight: ContentItem | null }> {
      const data = await request<{ success: boolean; message: string; spotlight: any | null }>('/admin/spotlight', {
        method: 'PUT',
        body: JSON.stringify({ contentId })
      });
      return {
        success: data.success,
        message: data.message,
        spotlight: data.spotlight ? adaptDbContentToFrontend(data.spotlight) : null
      };
    },

    async setSpotlights(contentIds: string[]): Promise<{ success: boolean; message: string; spotlights: ContentItem[] }> {
      const data = await request<{ success: boolean; message: string; spotlights: any[] }>('/admin/spotlights', {
        method: 'PUT',
        body: JSON.stringify({ contentIds })
      });
      return {
        success: data.success,
        message: data.message,
        spotlights: (data.spotlights || []).map(adaptDbContentToFrontend)
      };
    },

    async addSpotlight(contentId: string): Promise<{ success: boolean; message: string; spotlights: ContentItem[] }> {
      const data = await request<{ success: boolean; message: string; spotlights: any[] }>('/admin/spotlights/add', {
        method: 'POST',
        body: JSON.stringify({ contentId })
      });
      return {
        success: data.success,
        message: data.message,
        spotlights: (data.spotlights || []).map(adaptDbContentToFrontend)
      };
    },

    async removeSpotlight(contentId: string): Promise<{ success: boolean; message: string; spotlights: ContentItem[] }> {
      const data = await request<{ success: boolean; message: string; spotlights: any[] }>(`/admin/spotlights/${encodeURIComponent(contentId)}`, {
        method: 'DELETE'
      });
      return {
        success: data.success,
        message: data.message,
        spotlights: (data.spotlights || []).map(adaptDbContentToFrontend)
      };
    },

    async getAdsConfig(): Promise<{
      enabled: boolean;
      type: 'IMAGE' | 'VIDEO';
      mediaUrl: string;
      durationSeconds: number;
      skipEnabled: boolean;
      skipAfterSeconds: number;
      title: string;
      clickUrl: string;
    }> {
      const data = await request<{ success: boolean; ads: any }>('/admin/ads');
      return data.ads;
    },

    async updateAdsConfig(payload: {
      enabled?: boolean;
      type?: 'IMAGE' | 'VIDEO';
      mediaUrl?: string;
      durationSeconds?: number;
      skipEnabled?: boolean;
      skipAfterSeconds?: number;
      title?: string;
      clickUrl?: string;
    }) {
      const data = await request<{ success: boolean; message: string; ads: any }>('/admin/ads', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      return data;
    },

    async getAdMediaLibrary(type?: 'IMAGE' | 'VIDEO') {
      const qs = type ? `?type=${type}` : '';
      const data = await request<{ success: boolean; items: any[] }>(`/admin/ads/library${qs}`);
      return data.items || [];
    },

    async uploadAdMedia(files: FileList | File[], type: 'IMAGE' | 'VIDEO' = 'IMAGE') {
      const formData = new FormData();
      const fileArray = Array.from(files);
      for (const f of fileArray) {
        formData.append('files', f, f.name);
      }
      return new Promise<{ success: boolean; message: string; added: any[]; library: any[] }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/admin/ads/library/upload?type=${type}`, true);
        xhr.timeout = 10 * 60 * 1000;
        const token = adminTokenStorage.get() || tokenStorage.get();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.onload = () => {
          let data: any = {};
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            data = { error: { message: `Server error ${xhr.status}` } };
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data?.error?.message || `Upload failed with status ${xhr.status}.`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error uploading advertisement media.'));
        xhr.ontimeout = () => reject(new Error('Upload timed out.'));
        xhr.send(formData);
      });
    },

    async deleteAdMedia(id: string) {
      return request<{ success: boolean; message: string; library: any[] }>(`/admin/ads/library/${id}`, {
        method: 'DELETE'
      });
    },

    async resetFinancialAnalytics() {
      return request<{ success: boolean; resetAt: string; message: string }>('/admin/reset-financial-analytics', {
        method: 'POST'
      });
    },

    async createSeason(contentId: string, seasonNumber: number, title: string) {
      return request<{ success: boolean; seasonId: string }>(`/admin/content/${contentId}/seasons`, {
        method: 'POST',
        body: JSON.stringify({ seasonNumber, title })
      });
    },

    async updateSeason(seasonId: string, title: string, seasonNumber?: number) {
      return request<{ success: boolean }>(`/admin/seasons/${seasonId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, seasonNumber })
      });
    },

    async deleteSeason(seasonId: string) {
      return request<{ success: boolean }>(`/admin/seasons/${seasonId}`, {
        method: 'DELETE'
      });
    },

    async createEpisode(seasonId: string, episodeData: any) {
      return request<{ success: boolean; episodeId: string }>(`/admin/seasons/${seasonId}/episodes`, {
        method: 'POST',
        body: JSON.stringify(episodeData)
      });
    },

    async updateEpisode(episodeId: string, episodeData: any) {
      return request<{ success: boolean }>(`/admin/episodes/${episodeId}`, {
        method: 'PUT',
        body: JSON.stringify(episodeData)
      });
    },

    async deleteEpisode(episodeId: string) {
      return request<{ success: boolean }>(`/admin/episodes/${episodeId}`, {
        method: 'DELETE'
      });
    },

    // ------------------------------------------------------------------------
    // QUICK ADD & AUTO IMPORT
    // ------------------------------------------------------------------------
    async searchMetadata(query: string, year?: number, type: 'MOVIE' | 'SERIES' = 'MOVIE') {
      const params = new URLSearchParams({ query, type });
      if (year) params.append('year', String(year));
      return request<{
        success: boolean;
        count: number;
        results: Array<{
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
        }>;
      }>(`/admin/auto-import/search?${params.toString()}`);
    },

    async getMetadataDetails(providerId: string, type: 'MOVIE' | 'SERIES') {
      const params = new URLSearchParams({ providerId, type });
      return request<{
        success: boolean;
        details: {
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
          status: 'DRAFT';
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
        };
      }>(`/admin/auto-import/details?${params.toString()}`);
    },

    async importContent(payload: any) {
      return request<{
        success: boolean;
        message: string;
        result: {
          success: boolean;
          contentId: string;
          title: string;
          type: 'MOVIE' | 'SERIES';
          seasonsCount: number;
          episodesCount: number;
        };
      }>('/admin/auto-import/import', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  },

  // --------------------------------------------------------------------------
  // MONETIZATION (DUAL MODE: PER-CONTENT VS SUBSCRIPTION)
  // --------------------------------------------------------------------------
  monetization: {
    async getConfig() {
      return request<{
        mode: 'PER_CONTENT' | 'SUBSCRIPTION';
        plans: Array<{
          id: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
          name: string;
          durationDays: number;
          priceRupees: number;
          description: string;
        }>;
        currencySymbol: string;
        upiId: string;
        merchantName: string;
      }>('/monetization/config');
    },

    async getAdminConfig() {
      return request<{
        success: boolean;
        config: {
          mode: 'PER_CONTENT' | 'SUBSCRIPTION';
          weeklyPrice: number;
          monthlyPrice: number;
          yearlyPrice: number;
          currencySymbol: string;
          metrics: {
            totalSubscriptions: number;
            activeCount: number;
            pendingCount: number;
            totalRevenueRupees: number;
          };
        };
      }>('/monetization/admin');
    },

    async updateAdminConfig(data: {
      mode?: 'PER_CONTENT' | 'SUBSCRIPTION';
      weeklyPrice?: number;
      monthlyPrice?: number;
      yearlyPrice?: number;
    }) {
      return request<{
        success: boolean;
        message: string;
        config: {
          mode: 'PER_CONTENT' | 'SUBSCRIPTION';
          weeklyPrice: number;
          monthlyPrice: number;
          yearlyPrice: number;
          currencySymbol: string;
          metrics: {
            totalSubscriptions: number;
            activeCount: number;
            pendingCount: number;
            totalRevenueRupees: number;
          };
        };
      }>('/monetization/admin', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
  },

  // --------------------------------------------------------------------------
  // SUBSCRIPTIONS (USER & ADMIN VERIFICATION)
  // --------------------------------------------------------------------------
  subscriptions: {
    async getPlans() {
      return request<{
        plans: Array<{
          id: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
          name: string;
          durationDays: number;
          priceRupees: number;
          description: string;
        }>;
      }>('/subscriptions/plans');
    },

    async getMyStatus() {
      return request<{
        hasActiveSubscription: boolean;
        activeSubscription: {
          id: string;
          plan: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
          status: 'ACTIVE';
          amount_paid: number;
          start_date: string;
          end_date: string;
          daysRemaining: number;
          payment_reference: string | null;
        } | null;
        pendingSubscription: {
          id: string;
          plan: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
          status: 'PENDING';
          amount_paid: number;
          payment_reference: string;
          submitted_at: string;
        } | null;
        latestSubscription: any;
      }>('/subscriptions/my-status');
    },

    async submitRequest(plan: 'WEEKLY' | 'MONTHLY' | 'YEARLY', utr: string, userName?: string, userEmail?: string) {
      return request<{
        success: boolean;
        message: string;
        subscription: any;
      }>('/subscriptions/submit-request', {
        method: 'POST',
        body: JSON.stringify({ plan, utr, userName, userEmail })
      });
    },

    async getMyHistory(limit = 50) {
      return request<{ count: number; subscriptions: any[] }>(`/subscriptions/my-history?limit=${limit}`);
    },

    // Admin endpoints
    async adminGetRequests(status?: string, limit = 100) {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (limit) params.append('limit', String(limit));
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<{ count: number; requests: any[] }>(`/subscriptions/admin/requests${query}`);
    },

    async adminApprove(subscriptionId: string, adminNote?: string) {
      return request<{
        success: boolean;
        message: string;
        subscription: any;
      }>('/subscriptions/admin/approve', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId, adminNote })
      });
    },

    async adminReject(subscriptionId: string, adminNote?: string) {
      return request<{
        success: boolean;
        message: string;
        subscription: any;
      }>('/subscriptions/admin/reject', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId, adminNote })
      });
    },

    async adminGrant(userId: string, plan: 'WEEKLY' | 'MONTHLY' | 'YEARLY', adminNote?: string) {
      return request<{
        success: boolean;
        message: string;
        subscription: any;
      }>('/subscriptions/admin/grant', {
        method: 'POST',
        body: JSON.stringify({ userId, plan, adminNote })
      });
    }
  },

  watchPasses: {
    async getPlans() {
      return request<{
        plans: Array<{
          id: string;
          plan: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D';
          name: string;
          durationLabel: string;
          durationDays: number;
          priceRupees: number;
          maxResolution?: '720p' | '1080p';
          downloadAllowed?: boolean;
          description: string;
          popular?: boolean;
          highlight?: string;
          benefits?: string[];
        }>;
      }>('/watch-passes/plans');
    },

    async getContentStatus(contentId: string) {
      return request<{
        hasActivePass: boolean;
        activePass: {
          id: string;
          content_id: string | null;
          plan: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D' | 'PASS_30D';
          status: 'ACTIVE';
          amount_paid: number;
          submitted_at: string;
          activated_at: string;
          expires_at: string;
          remainingHours: number;
          remainingDays: number;
          maxResolution?: '720p' | '1080p';
          downloadAllowed?: boolean;
          payment_reference: string | null;
        } | null;
        pendingPass: {
          id: string;
          content_id: string | null;
          plan: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D' | 'PASS_30D';
          status: 'PENDING';
          amount_paid: number;
          payment_reference: string;
          submitted_at: string;
        } | null;
        latestPass: any;
        isExpired: boolean;
      }>(`/watch-passes/content-status/${contentId}`);
    },

    async getMyPasses() {
      return request<{
        activePasses: Array<{
          id: string;
          content_id: string | null;
          content_title?: string;
          content_poster?: string;
          content_type?: string;
          plan: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D' | 'PASS_30D';
          status: 'ACTIVE';
          amount_paid: number;
          submitted_at: string;
          activated_at: string;
          expires_at: string;
          remainingHours: number;
          remainingDays: number;
          maxResolution?: '720p' | '1080p';
          downloadAllowed?: boolean;
          payment_reference: string | null;
        }>;
        expiredPasses: Array<{
          id: string;
          content_id: string | null;
          content_title?: string;
          content_poster?: string;
          content_type?: string;
          plan: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D' | 'PASS_30D';
          status: 'EXPIRED';
          amount_paid: number;
          submitted_at: string;
          activated_at: string | null;
          expires_at: string | null;
          payment_reference: string | null;
        }>;
        pendingPasses: Array<{
          id: string;
          content_id: string | null;
          content_title?: string;
          content_poster?: string;
          content_type?: string;
          plan: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D' | 'PASS_30D';
          status: 'PENDING';
          amount_paid: number;
          submitted_at: string;
          payment_reference: string;
        }>;
      }>('/watch-passes/my-passes');
    },

    async submitRequest(data: {
      contentId?: string | null;
      plan: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D';
      utr: string;
      userName?: string;
      userEmail?: string;
    }) {
      return request<{
        success: boolean;
        message: string;
        pass: any;
      }>('/watch-passes/submit-request', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    // Admin endpoints
    async adminGetRequests(status?: string, limit = 100) {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (limit) params.append('limit', String(limit));
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<{ count: number; requests: any[] }>(`/watch-passes/admin/requests${query}`);
    },

    async adminApprove(passId: string, adminNote?: string) {
      return request<{
        success: boolean;
        message: string;
        pass: any;
      }>('/watch-passes/admin/approve', {
        method: 'POST',
        body: JSON.stringify({ passId, adminNote })
      });
    },

    async adminReject(passId: string, adminNote?: string) {
      return request<{
        success: boolean;
        message: string;
        pass: any;
      }>('/watch-passes/admin/reject', {
        method: 'POST',
        body: JSON.stringify({ passId, adminNote })
      });
    },

    async adminUpdatePlans(prices: {
      price24h?: number;
      price3d?: number;
      price7d?: number;
      price15d?: number;
    }) {
      return request<{
        success: boolean;
        message: string;
        plans: any[];
      }>('/watch-passes/admin/plans', {
        method: 'POST',
        body: JSON.stringify(prices)
      });
    },

    async adminGetAnalytics() {
      return request<{
        totalPasses: number;
        activePasses: number;
        expiredPasses: number;
        pendingPasses: number;
        rejectedPasses: number;
        totalRevenueRupees: number;
        durationBreakdown: Record<string, number>;
        revenueByPlan: Record<string, number>;
        activeByPlan: Record<string, number>;
      }>('/watch-passes/admin/analytics');
    }
  }
};

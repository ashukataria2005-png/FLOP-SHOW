import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/navigation/Header';
import { BottomNav } from './components/navigation/BottomNav';
import { DiscoverPage } from './pages/DiscoverPage';
import { SearchPage } from './pages/SearchPage';
import { DetailsPage } from './pages/DetailsPage';
import { LibraryPage } from './pages/LibraryPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminContentPage } from './pages/admin/AdminContentPage';
import { AdminContentEditorPage } from './pages/admin/AdminContentEditorPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminTransactionsPage } from './pages/admin/AdminTransactionsPage';
import { AdminGenresPage } from './pages/admin/AdminGenresPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminDesignPage } from './pages/admin/AdminDesignPage';
import { AdminQuickAddPage } from './pages/admin/AdminQuickAddPage';
import { AdminHeroPage } from './pages/admin/AdminHeroPage';
import { AdminSpotlightPage } from './pages/admin/AdminSpotlightPage';
import { AdminAdsPage } from './pages/admin/AdminAdsPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminUpiSettingsPage } from './pages/admin/AdminUpiSettingsPage';
import { AdminFinancePage } from './pages/admin/AdminFinancePage';
import { AdminFreeContentPage } from './pages/admin/AdminFreeContentPage';
import { AdminResetPage } from './pages/admin/AdminResetPage';
import { PurchaseModal } from './components/purchase/PurchaseModal';
import { RechargeModal } from './components/wallet/RechargeModal';
import { AuthModal } from './components/auth/AuthModal';
import { MediaPlayer } from './components/player/MediaPlayer';
import { ContentItem } from './types/content';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

/**
 * Map browser pathname to app tab state
 */
function pathToTab(pathname: string): { tab: string; param?: string } {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  if (cleanPath === '/admin' || cleanPath === '/admin/') {
    return { tab: 'admin' };
  }
  if (cleanPath === '/admin/dashboard') {
    return { tab: 'admin-dashboard' };
  }
  if (cleanPath === '/admin/content') {
    return { tab: 'admin-content' };
  }
  if (cleanPath === '/admin/free-content') {
    return { tab: 'admin-free-content' };
  }
  if (cleanPath === '/admin/hero') {
    return { tab: 'admin-hero' };
  }
  if (cleanPath === '/admin/spotlight') {
    return { tab: 'admin-spotlight' };
  }
  if (cleanPath === '/admin/ads') {
    return { tab: 'admin-ads' };
  }
  if (cleanPath === '/admin/quick-add') {
    return { tab: 'admin-quick-add' };
  }
  if (cleanPath === '/admin/trending') {
    return { tab: 'admin-trending' };
  }
  if (cleanPath.startsWith('/admin/editor')) {
    const parts = cleanPath.split('/');
    const param = parts[3];
    return { tab: 'admin-editor', param };
  }
  if (cleanPath === '/admin/users') {
    return { tab: 'admin-users' };
  }
  if (cleanPath === '/admin/payments') {
    return { tab: 'admin-payments' };
  }
  if (cleanPath === '/admin/upi-settings') {
    return { tab: 'admin-upi-settings' };
  }
  if (cleanPath === '/admin/finance') {
    return { tab: 'admin-finance' };
  }
  if (cleanPath === '/admin/transactions') {
    return { tab: 'admin-transactions' };
  }
  if (cleanPath === '/admin/genres') {
    return { tab: 'admin-genres' };
  }
  if (cleanPath === '/admin/design') {
    return { tab: 'admin-design' };
  }
  if (cleanPath === '/admin/settings') {
    return { tab: 'admin-settings' };
  }
  if (cleanPath === '/admin/reset') {
    return { tab: 'admin-reset' };
  }
  if (cleanPath.startsWith('/admin')) {
    return { tab: 'admin' };
  }
  if (cleanPath === '/search') {
    return { tab: 'search' };
  }
  if (cleanPath === '/library') {
    return { tab: 'library' };
  }
  if (cleanPath === '/wallet' || cleanPath === '/profile/wallet') {
    return { tab: 'profile', param: 'wallet' };
  }
  if (cleanPath === '/profile') {
    return { tab: 'profile' };
  }
  return { tab: 'discover' };
}

/**
 * Map app tab state to browser URL pathname
 */
export function tabToPath(tab: string, param?: string): string {
  switch (tab) {
    case 'admin':
      return '/admin';
    case 'admin-dashboard':
      return '/admin/dashboard';
    case 'admin-content':
      return '/admin/content';
    case 'admin-free-content':
      return '/admin/free-content';
    case 'admin-hero':
      return '/admin/hero';
    case 'admin-spotlight':
      return '/admin/spotlight';
    case 'admin-ads':
      return '/admin/ads';
    case 'admin-quick-add':
      return '/admin/quick-add';
    case 'admin-trending':
      return '/admin/trending';
    case 'admin-editor':
      return param ? `/admin/editor/${param}` : '/admin/editor';
    case 'admin-users':
      return '/admin/users';
    case 'admin-payments':
      return '/admin/payments';
    case 'admin-upi-settings':
      return '/admin/upi-settings';
    case 'admin-finance':
      return '/admin/finance';
    case 'admin-transactions':
      return '/admin/transactions';
    case 'admin-genres':
      return '/admin/genres';
    case 'admin-design':
      return '/admin/design';
    case 'admin-settings':
      return '/admin/settings';
    case 'admin-reset':
      return '/admin/reset';
    case 'search':
      return '/search';
    case 'library':
      return '/library';
    case 'wallet':
      return '/profile/wallet';
    case 'profile':
      return param === 'wallet' ? '/profile/wallet' : '/profile';
    case 'discover':
    default:
      return '/';
  }
}

const AppContent: React.FC = () => {
  const {
    user,
    isAuthenticated,
    sessionLoading,
    toasts,
    activeMediaSource,
    closePlayer,
    catalog,
    hasNextEpisode,
    hasPrevEpisode,
    playNextEpisode,
    playPrevEpisode
  } = useApp();
  const isAdmin = Boolean(user && user.role === 'ADMIN');

  const [currentTab, setCurrentTab] = useState<string>(() => {
    const initial = pathToTab(window.location.pathname);
    return initial.tab;
  });
  const [adminParam, setAdminParam] = useState<string | undefined>(() => {
    const initial = pathToTab(window.location.pathname);
    return initial.param;
  });
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  // Keep selectedItem synchronized with the latest catalog updates (e.g. poster/backdrop edits)
  useEffect(() => {
    if (selectedItem && catalog.length > 0) {
      const latest = catalog.find(c => c.id === selectedItem.id);
      if (latest && (latest.posterUrl !== selectedItem.posterUrl || latest.backdropUrl !== selectedItem.backdropUrl || latest.title !== selectedItem.title)) {
        setSelectedItem(latest);
      }
    }
  }, [catalog, selectedItem]);

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentTab, selectedItem]);

  // Route security: Only redirect unauthenticated non-admins once the initial session loading has completed
  useEffect(() => {
    const hasAdminDeviceAuth = Boolean(
      localStorage.getItem('flopshow_admin_quick_login') ||
      localStorage.getItem('flopshow_admin_token')
    );
    if (!sessionLoading && currentTab.startsWith('admin') && currentTab !== 'admin' && (!isAuthenticated || !isAdmin) && !hasAdminDeviceAuth) {
      setCurrentTab('admin');
      window.history.replaceState(null, '', '/admin');
    }
  }, [currentTab, isAuthenticated, isAdmin, sessionLoading]);

  // If authenticated as admin and on /admin, redirect/open the Admin Dashboard
  useEffect(() => {
    if (currentTab === 'admin' && isAuthenticated && isAdmin) {
      setCurrentTab('admin-dashboard');
      window.history.replaceState(null, '', '/admin/dashboard');
    }
  }, [currentTab, isAuthenticated, isAdmin]);

  // Sync state when user navigates using browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = pathToTab(window.location.pathname);
      const hasAdminDeviceAuth = Boolean(
        localStorage.getItem('flopshow_admin_quick_login') ||
        localStorage.getItem('flopshow_admin_token')
      );
      if (!sessionLoading && route.tab.startsWith('admin') && route.tab !== 'admin' && (!isAuthenticated || !isAdmin) && !hasAdminDeviceAuth) {
        setCurrentTab('admin');
        window.history.replaceState(null, '', '/admin');
        return;
      }
      setCurrentTab(route.tab);
      setAdminParam(route.param);
      setSelectedItem(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, isAdmin, sessionLoading]);

  const handleNavigate = (tab: string, param?: string) => {
    if (tab === 'details' && !param) return;
    setSelectedItem(null);
    setAdminParam(param);
    setCurrentTab(tab);

    const targetPath = tabToPath(tab, param);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  const handleSelectItem = (item: ContentItem) => {
    setSelectedItem(item);
  };

  const handleBackFromDetails = () => {
    setSelectedItem(null);
  };

  // If viewing admin route, render Admin Layout and Admin Views
  if (currentTab.startsWith('admin')) {
    return (
      <div className="app-container">
        <AdminLayout
          currentTab={currentTab}
          onNavigateTab={handleNavigate}
          onExitAdmin={() => handleNavigate('discover')}
        >
          {currentTab === 'admin-dashboard' && <AdminDashboardPage onNavigateTab={handleNavigate} />}
          {(currentTab === 'admin-content' || currentTab === 'admin-trending') && (
            <AdminContentPage
              initialTypeFilter={adminParam === 'movie' ? 'MOVIE' : adminParam === 'series' ? 'SERIES' : 'ALL'}
              initialTrendingFilter={currentTab === 'admin-trending' || adminParam === 'trending' ? 'TRENDING' : 'ALL'}
              onNavigateTab={handleNavigate}
            />
          )}
          {currentTab === 'admin-free-content' && <AdminFreeContentPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-hero' && <AdminHeroPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-spotlight' && <AdminSpotlightPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-ads' && <AdminAdsPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-editor' && (
            <AdminContentEditorPage contentId={adminParam} onNavigateTab={handleNavigate} />
          )}
          {currentTab === 'admin-users' && <AdminUsersPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-payments' && <AdminPaymentsPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-upi-settings' && <AdminUpiSettingsPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-finance' && <AdminFinancePage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-transactions' && <AdminTransactionsPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-genres' && <AdminGenresPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-design' && <AdminDesignPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-settings' && <AdminSettingsPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-quick-add' && <AdminQuickAddPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-reset' && <AdminResetPage onNavigateTab={handleNavigate} />}
          {!['admin-dashboard', 'admin-content', 'admin-free-content', 'admin-hero', 'admin-spotlight', 'admin-ads', 'admin-editor', 'admin-quick-add', 'admin-users', 'admin-payments', 'admin-upi-settings', 'admin-finance', 'admin-transactions', 'admin-genres', 'admin-design', 'admin-settings', 'admin-reset'].includes(currentTab) && (
            <AdminDashboardPage onNavigateTab={handleNavigate} />
          )}
        </AdminLayout>

        {/* Real Media Player Overlay */}
        {activeMediaSource && (
          <MediaPlayer
            source={activeMediaSource}
            onClose={closePlayer}
            onNextEpisode={playNextEpisode}
            onPrevEpisode={playPrevEpisode}
            hasNextEpisode={hasNextEpisode}
            hasPrevEpisode={hasPrevEpisode}
          />
        )}

        {/* Toast Notifications */}
        {toasts.length > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 3000,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              pointerEvents: 'none'
            }}
          >
            {toasts.map(toast => (
              <div
                key={toast.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#161622',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  animation: 'fadeIn 0.2s ease-out'
                }}
              >
                {toast.type === 'success' && <CheckCircle2 size={18} color="var(--brand-gold)" />}
                {toast.type === 'error' && <AlertCircle size={18} color="#F87171" />}
                {toast.type === 'info' && <Info size={18} color="var(--text-secondary)" />}
                <span>{toast.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Consumer Customer View
  return (
    <div className="app-container">
      {/* Top Header */}
      <Header currentTab={currentTab} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <main className="main-content">
        {selectedItem ? (
          <DetailsPage
            item={selectedItem}
            onBack={handleBackFromDetails}
            onSelectItem={handleSelectItem}
          />
        ) : (
          <>
            <div style={{ display: currentTab === 'discover' ? 'block' : 'none' }}>
              <DiscoverPage onSelectItem={handleSelectItem} onNavigate={handleNavigate} />
            </div>
            {currentTab === 'search' && (
              <SearchPage onSelectItem={handleSelectItem} />
            )}
            {currentTab === 'library' && (
              <LibraryPage onSelectItem={handleSelectItem} onNavigate={handleNavigate} />
            )}
            {(currentTab === 'wallet' || currentTab === 'settings' || currentTab === 'profile') && (
              <ProfilePage
                initialSection={
                  currentTab === 'wallet' || adminParam === 'wallet'
                    ? 'wallet'
                    : currentTab === 'settings' || adminParam === 'settings'
                    ? 'settings'
                    : 'profile'
                }
                onNavigate={handleNavigate}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomNav currentTab={selectedItem ? '' : currentTab} onNavigate={handleNavigate} />

      {/* Overlays & Modals */}
      <PurchaseModal />
      <RechargeModal />
      <AuthModal />

      {/* Real Media Player (HTML5, local uploads, direct URLs, YouTube trailers) */}
      {activeMediaSource && (
        <MediaPlayer
          source={activeMediaSource}
          onClose={closePlayer}
          onNextEpisode={playNextEpisode}
          onPrevEpisode={playPrevEpisode}
          hasNextEpisode={hasNextEpisode}
          hasPrevEpisode={hasPrevEpisode}
        />
      )}

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            zIndex: 3000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'none'
          }}
        >
          {toasts.map(toast => (
            <div
              key={toast.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 18px',
                borderRadius: '12px',
                backgroundColor: '#161622',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              {toast.type === 'success' && <CheckCircle2 size={18} color="var(--brand-gold)" />}
              {toast.type === 'error' && <AlertCircle size={18} color="#F87171" />}
              {toast.type === 'info' && <Info size={18} color="var(--text-secondary)" />}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;

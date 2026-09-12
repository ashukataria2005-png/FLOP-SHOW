import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/navigation/Header';
import { BottomNav } from './components/navigation/BottomNav';
import { DiscoverPage } from './pages/DiscoverPage';
import { SearchPage } from './pages/SearchPage';
import { DetailsPage } from './pages/DetailsPage';
import { LibraryPage } from './pages/LibraryPage';
import { WalletPage } from './pages/WalletPage';
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
import { AdminAdsPage } from './pages/admin/AdminAdsPage';
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
  if (cleanPath === '/admin/hero') {
    return { tab: 'admin-hero' };
  }
  if (cleanPath === '/admin/ads') {
    return { tab: 'admin-ads' };
  }
  if (cleanPath === '/admin/quick-add') {
    return { tab: 'admin-quick-add' };
  }
  if (cleanPath.startsWith('/admin/editor')) {
    const parts = cleanPath.split('/');
    const param = parts[3];
    return { tab: 'admin-editor', param };
  }
  if (cleanPath === '/admin/users') {
    return { tab: 'admin-users' };
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
  if (cleanPath.startsWith('/admin')) {
    return { tab: 'admin' };
  }
  if (cleanPath === '/search') {
    return { tab: 'search' };
  }
  if (cleanPath === '/library') {
    return { tab: 'library' };
  }
  if (cleanPath === '/wallet') {
    return { tab: 'wallet' };
  }
  if (cleanPath === '/profile') {
    return { tab: 'profile' };
  }
  return { tab: 'discover' };
}

/**
 * Map app tab state to browser URL pathname
 */
function tabToPath(tab: string, param?: string): string {
  switch (tab) {
    case 'admin':
      return '/admin';
    case 'admin-dashboard':
      return '/admin/dashboard';
    case 'admin-content':
      return '/admin/content';
    case 'admin-hero':
      return '/admin/hero';
    case 'admin-ads':
      return '/admin/ads';
    case 'admin-quick-add':
      return '/admin/quick-add';
    case 'admin-editor':
      return param ? `/admin/editor/${param}` : '/admin/editor';
    case 'admin-users':
      return '/admin/users';
    case 'admin-transactions':
      return '/admin/transactions';
    case 'admin-genres':
      return '/admin/genres';
    case 'admin-design':
      return '/admin/design';
    case 'admin-settings':
      return '/admin/settings';
    case 'search':
      return '/search';
    case 'library':
      return '/library';
    case 'wallet':
      return '/wallet';
    case 'profile':
      return '/profile';
    case 'discover':
    default:
      return '/';
  }
}

const AppContent: React.FC = () => {
  const { user, isAuthenticated, toasts, activeMediaSource, closePlayer, catalog } = useApp();
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

  // Route security: If an unauthenticated user or non-admin tries to open a protected admin sub-route directly, send them to /admin (the Admin Login page)
  useEffect(() => {
    if (currentTab.startsWith('admin') && currentTab !== 'admin' && (!isAuthenticated || !isAdmin)) {
      setCurrentTab('admin');
      window.history.replaceState(null, '', '/admin');
    }
  }, [currentTab, isAuthenticated, isAdmin]);

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
      if (route.tab.startsWith('admin') && route.tab !== 'admin' && (!isAuthenticated || !isAdmin)) {
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
  }, [isAuthenticated, isAdmin]);

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
          {currentTab === 'admin-content' && <AdminContentPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-hero' && <AdminHeroPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-ads' && <AdminAdsPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-editor' && (
            <AdminContentEditorPage contentId={adminParam} onNavigateTab={handleNavigate} />
          )}
          {currentTab === 'admin-users' && <AdminUsersPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-transactions' && <AdminTransactionsPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-genres' && <AdminGenresPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-design' && <AdminDesignPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-settings' && <AdminSettingsPage onNavigateTab={handleNavigate} />}
          {currentTab === 'admin-quick-add' && <AdminQuickAddPage onNavigateTab={handleNavigate} />}
          {!['admin-dashboard', 'admin-content', 'admin-hero', 'admin-ads', 'admin-editor', 'admin-quick-add', 'admin-users', 'admin-transactions', 'admin-genres', 'admin-design', 'admin-settings'].includes(currentTab) && (
            <AdminDashboardPage onNavigateTab={handleNavigate} />
          )}
        </AdminLayout>

        {/* Real Media Player Overlay */}
        {activeMediaSource && (
          <MediaPlayer source={activeMediaSource} onClose={closePlayer} />
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
            {currentTab === 'discover' && (
              <DiscoverPage onSelectItem={handleSelectItem} onNavigate={handleNavigate} />
            )}
            {currentTab === 'search' && (
              <SearchPage onSelectItem={handleSelectItem} />
            )}
            {currentTab === 'library' && (
              <LibraryPage onSelectItem={handleSelectItem} onNavigate={handleNavigate} />
            )}
            {currentTab === 'wallet' && (
              <WalletPage />
            )}
            {currentTab === 'profile' && (
              <ProfilePage onNavigate={handleNavigate} />
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
        <MediaPlayer source={activeMediaSource} onClose={closePlayer} />
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

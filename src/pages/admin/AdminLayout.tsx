import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  LayoutDashboard,
  Film,
  Users,
  CreditCard,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Sliders,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  Crown,
  Megaphone,
  Palette
} from 'lucide-react';

interface AdminLayoutProps {
  currentTab: string;
  onNavigateTab: (tab: string, param?: string) => void;
  onExitAdmin: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onNavigateTab,
  onExitAdmin,
  children
}) => {
  const { user, login, logout, showToast } = useApp();
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isAdmin = Boolean(user && user.role === 'ADMIN');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const data = await api.auth.adminLogin(adminId.trim(), adminPassword);
      if (data.user.role !== 'ADMIN') {
        setLoginError('Authentication failed: Administrator privileges required.');
        return;
      }

      login(data.user.name, data.user.email, 'ADMIN');
      showToast(`Admin signed in: ${data.user.name}`, 'success');
      onNavigateTab('admin-dashboard');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid Admin ID or Admin Password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Dedicated Admin Login Screen: Displayed whenever the user is not authenticated as an ADMIN
  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary, #07070A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: 'var(--bg-surface, #12121A)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '36px 28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 197, 24, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'var(--brand-gold, #F5C518)'
            }}
          >
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
            FLOPSHOW Admin Sign In
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #9CA3AF)', marginBottom: '24px' }}>
            Enter your administrator credentials to access the management portal.
          </p>

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Admin ID
              </label>
              <input
                type="text"
                value={adminId}
                onChange={e => setAdminId(e.target.value)}
                placeholder="Enter Admin ID"
                required
                autoFocus
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Admin Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Enter Admin Password"
                required
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {loginError && (
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#F87171', fontSize: '13px' }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                marginTop: '10px',
                padding: '13px',
                borderRadius: '10px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                color: '#0E0E12',
                fontWeight: 700,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In as Administrator'}
            </button>
          </form>

          <button
            onClick={onExitAdmin}
            style={{
              marginTop: '20px',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #9CA3AF)',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Return to FLOPSHOW Home</span>
          </button>
        </div>
      </div>
    );
  }

  // Authenticated Admin Shell
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-content', label: 'Content & Media / Catalog', icon: Film },
    { id: 'admin-hero', label: 'Home Hero Control', icon: Crown },
    { id: 'admin-ads', label: 'Advertisement / Ads', icon: Megaphone },
    { id: 'admin-quick-add', label: 'Quick Add / Auto Import', icon: Sparkles },
    { id: 'admin-users', label: 'Users', icon: Users },
    { id: 'admin-transactions', label: 'Transactions', icon: CreditCard },
    { id: 'admin-genres', label: 'Genres', icon: Tag },
    { id: 'admin-design', label: 'App Design', icon: Palette },
    { id: 'admin-settings', label: 'Settings', icon: Sliders }
  ];

  const activeNavItem = navItems.find(item => item.id === currentTab);
  const currentSectionLabel = activeNavItem
    ? activeNavItem.label
    : currentTab === 'admin-editor'
    ? 'Content Editor'
    : 'Admin Dashboard';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary, #07070A)', color: '#FFFFFF' }}>
      {/* Top Admin Navigation Header */}
      <header
        style={{
          height: '68px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(14, 14, 22, 0.95)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px'
        }}
      >
        {/* Left Side: 3-Line Menu Trigger, Logo & Section Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* 3-Line / Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(prev => !prev)}
            title={isMenuOpen ? 'Close Admin Menu' : 'Open Admin Menu (3-Line)'}
            aria-label="Admin Navigation Menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 14px',
              borderRadius: '10px',
              backgroundColor: isMenuOpen ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.07)',
              border: isMenuOpen ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.15)',
              color: isMenuOpen ? 'var(--brand-gold, #F5C518)' : '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              transition: 'all 0.15s ease'
            }}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            <span>Menu</span>
          </button>

          {/* Brand Logo & Admin Badge */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            onClick={() => onNavigateTab('admin-dashboard')}
          >
            <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
              FLOP<span style={{ color: 'var(--brand-gold, #F5C518)' }}>SHOW</span>
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(245, 197, 24, 0.2)',
                color: 'var(--brand-gold, #F5C518)',
                border: '1px solid rgba(245, 197, 24, 0.35)'
              }}
            >
              ADMIN
            </span>
          </div>

          {/* Current Active Section Breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '13px',
              fontWeight: 600,
              color: '#D1D5DB'
            }}
          >
            <span style={{ color: 'var(--brand-gold, #F5C518)', fontWeight: 800 }}>•</span>
            <span>{currentSectionLabel}</span>
          </div>
        </div>

        {/* Right side: Exit to Main Site / Admin Profile / Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9CA3AF' }}>
            <ShieldCheck size={16} color="var(--brand-gold, #F5C518)" />
            <span>{user.name || user.email || 'Admin'}</span>
          </div>

          <button
            onClick={() => {
              logout();
              onNavigateTab('admin');
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#F87171',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>

          <button
            onClick={onExitAdmin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Site</span>
          </button>
        </div>
      </header>

      {/* ADMIN 3-LINE MENU DRAWER OVERLAY */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 998
            }}
          />

          {/* Drawer Sidebar */}
          <aside
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '320px',
              maxWidth: '85vw',
              backgroundColor: '#0E0E16',
              borderRight: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '10px 0 40px rgba(0, 0, 0, 0.85)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '20px 22px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    FLOP<span style={{ color: 'var(--brand-gold, #F5C518)' }}>SHOW</span>
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(245, 197, 24, 0.2)',
                      color: 'var(--brand-gold, #F5C518)'
                    }}
                  >
                    ADMIN
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0' }}>Administration & Control</p>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                title="Close Menu"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Items (The 3-Line Menu contents) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 14px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0 10px 10px'
                }}
              >
                Admin Sections
              </div>

              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigateTab(item.id);
                        setIsMenuOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: isActive ? 'rgba(245, 197, 24, 0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(245, 197, 24, 0.35)' : '1px solid transparent',
                        color: isActive ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                        fontSize: '14px',
                        fontWeight: isActive ? 700 : 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: isActive ? 'rgba(245, 197, 24, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isActive ? 'var(--brand-gold, #F5C518)' : '#9CA3AF'
                          }}
                        >
                          <Icon size={18} />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight size={16} style={{ color: isActive ? 'var(--brand-gold, #F5C518)' : '#4B5563' }} />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <ShieldCheck size={18} color="var(--brand-gold, #F5C518)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name || 'Admin'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email || 'Administrator'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExitAdmin();
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Exit Site</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                    onNavigateTab('admin');
                  }}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#F87171',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Admin Content Container */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 80px' }}>
        {children}
      </main>
    </div>
  );
};

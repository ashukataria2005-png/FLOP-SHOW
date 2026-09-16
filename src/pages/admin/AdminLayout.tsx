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
  ChevronDown,
  Crown,
  Megaphone,
  Palette,
  QrCode,
  Wallet,
  Zap,
  KeyRound,
  Trash2,
  Loader2,
  LogOut
} from 'lucide-react';

const ADMIN_QUICK_LOGIN_KEY = 'flopshow_admin_quick_login';

interface AdminQuickLoginData {
  token: string;
  adminName: string;
  adminId: string;
  savedAt: string;
}

interface AdminLayoutProps {
  currentTab: string;
  onNavigateTab: (tab: string, param?: string) => void;
  onExitAdmin: () => void;
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
}

interface NavGroup {
  id: string;
  title: string;
  icon: any;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'group-dashboard',
    title: 'DASHBOARD',
    icon: LayoutDashboard,
    items: [
      { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard }
    ]
  },
  {
    id: 'group-payments',
    title: 'PAYMENTS',
    icon: QrCode,
    items: [
      { id: 'admin-upi-settings', label: 'UPI Settings', icon: QrCode },
      { id: 'admin-payments', label: 'Verify Payments', icon: ShieldCheck }
    ]
  },
  {
    id: 'group-content',
    title: 'CONTENT / CATALOG',
    icon: Film,
    items: [
      { id: 'admin-content', label: 'Catalog & Media', icon: Film },
      { id: 'admin-quick-add', label: 'Quick Add / Auto Import', icon: Sparkles },
      { id: 'admin-genres', label: 'Genres & Categories', icon: Tag }
    ]
  },
  {
    id: 'group-homepage',
    title: 'HOME PAGE',
    icon: Crown,
    items: [
      { id: 'admin-hero', label: 'Hero Banner', icon: Crown },
      { id: 'admin-spotlight', label: 'Cinematic Spotlight', icon: Sparkles }
    ]
  },
  {
    id: 'group-users',
    title: 'USERS',
    icon: Users,
    items: [
      { id: 'admin-users', label: 'User Management', icon: Users }
    ]
  },
  {
    id: 'group-finance',
    title: 'TRANSACTIONS / FINANCE',
    icon: CreditCard,
    items: [
      { id: 'admin-finance', label: 'Finance Overview', icon: Wallet },
      { id: 'admin-transactions', label: 'All Transactions', icon: CreditCard }
    ]
  },
  {
    id: 'group-ads',
    title: 'ADS',
    icon: Megaphone,
    items: [
      { id: 'admin-ads', label: 'Advertisement / Ads', icon: Megaphone }
    ]
  },
  {
    id: 'group-settings',
    title: 'SETTINGS',
    icon: Sliders,
    items: [
      { id: 'admin-settings', label: 'General Settings', icon: Sliders },
      { id: 'admin-design', label: 'App Design & Themes', icon: Palette }
    ]
  }
];

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

  // Quick Login state (device-bound persistent admin session token — NEVER plaintext password)
  const [quickLoginData, setQuickLoginData] = useState<AdminQuickLoginData | null>(() => {
    try {
      const raw = localStorage.getItem(ADMIN_QUICK_LOGIN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [useStandardLogin, setUseStandardLogin] = useState<boolean>(false);
  const [isQuickLoggingIn, setIsQuickLoggingIn] = useState<boolean>(false);

  // ALL hooks must be declared unconditionally before any conditional early return.
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Track expanded groups in the sidebar drawer
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'group-dashboard': true,
    'group-content': true,
    'group-payments': true,
    'group-homepage': true,
    'group-users': true,
    'group-finance': true,
    'group-ads': true,
    'group-settings': true
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Auto-expand group containing currentTab
  useEffect(() => {
    const activeGroup = navGroups.find(g => g.items.some(item => item.id === currentTab));
    if (activeGroup) {
      setExpandedGroups(prev => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [currentTab]);

  // Close drawer on Escape key (always registered; no-op when login screen is shown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

      if (rememberDevice) {
        const qData: AdminQuickLoginData = {
          token: data.token,
          adminName: data.user.name || 'FLOPSHOW Admin',
          adminId: adminId.trim(),
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(ADMIN_QUICK_LOGIN_KEY, JSON.stringify(qData));
        setQuickLoginData(qData);
      }

      login(data.user.id, data.user.name, data.user.email, 'ADMIN', 0);
      showToast(`Admin signed in: ${data.user.name}`, 'success');
      onNavigateTab('admin-dashboard');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid Admin ID or Admin Password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = async () => {
    if (!quickLoginData || !quickLoginData.token) return;
    setIsQuickLoggingIn(true);
    setLoginError(null);

    try {
      localStorage.setItem('flopshow_auth_token', quickLoginData.token);
      const res = await api.auth.adminQuickLogin();
      if (res && res.user && res.user.role === 'ADMIN') {
        const updatedQuick: AdminQuickLoginData = {
          ...quickLoginData,
          token: res.token,
          adminName: res.user.name,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(ADMIN_QUICK_LOGIN_KEY, JSON.stringify(updatedQuick));
        setQuickLoginData(updatedQuick);

        login(res.user.id, res.user.name, res.user.email, 'ADMIN', 0);
        showToast(`Welcome back, ${res.user.name}! (One-Click Quick Login)`, 'success');
        onNavigateTab('admin-dashboard');
      } else {
        throw new Error('Quick login rejected: Administrator privileges required.');
      }
    } catch (err: any) {
      console.warn('Quick login session expired, prompting password:', err);
      localStorage.removeItem(ADMIN_QUICK_LOGIN_KEY);
      setQuickLoginData(null);
      setUseStandardLogin(true);
      setLoginError(err.message || 'Remembered session expired. Please enter your credentials.');
    } finally {
      setIsQuickLoggingIn(false);
    }
  };

  const handleForgetDevice = () => {
    localStorage.removeItem(ADMIN_QUICK_LOGIN_KEY);
    setQuickLoginData(null);
    setUseStandardLogin(true);
    showToast('Device forgotten. Quick Login removed from this browser.', 'info');
  };

  const handleAdminLogout = (forgetDevice: boolean = false) => {
    if (forgetDevice) {
      localStorage.removeItem(ADMIN_QUICK_LOGIN_KEY);
      setQuickLoginData(null);
      showToast('Signed out and device forgotten.', 'info');
    } else {
      showToast('Signed out. Quick Login remains ready on this device.', 'info');
    }
    logout();
    onNavigateTab('admin');
  };

  // Dedicated Admin Login Screen: Displayed whenever the user is not authenticated as an ADMIN
  if (!isAdmin) {
    // 1. One-Click Quick Login UI for remembered devices
    if (quickLoginData && !useStandardLogin) {
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
              border: '1px solid rgba(245, 197, 24, 0.3)',
              borderRadius: '22px',
              padding: '36px 28px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 30px rgba(245, 197, 24, 0.1)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 197, 24, 0.18)',
                border: '1px solid rgba(245, 197, 24, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                color: 'var(--brand-gold, #F5C518)'
              }}
            >
              <Zap size={34} />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                backgroundColor: 'rgba(245, 197, 24, 0.12)',
                border: '1px solid rgba(245, 197, 24, 0.25)',
                color: 'var(--brand-gold, #F5C518)',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '14px'
              }}
            >
              <span>⚡ Remembered Device • Quick Login</span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              Welcome Back, Admin
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #9CA3AF)', marginBottom: '22px' }}>
              Your device has a verified administrator session saved securely. Click below for instant one-click access.
            </p>

            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '20px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(245, 197, 24, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-gold, #F5C518)',
                  fontWeight: 800,
                  fontSize: '16px',
                  flexShrink: 0
                }}
              >
                {quickLoginData.adminName.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '15px' }}>
                  {quickLoginData.adminName}
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                  Admin ID: <strong style={{ color: '#D1D5DB' }}>{quickLoginData.adminId}</strong>
                </div>
              </div>
            </div>

            {loginError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#F87171', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
                {loginError}
              </div>
            )}

            <button
              onClick={handleQuickLogin}
              disabled={isQuickLoggingIn}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                color: '#0E0E12',
                fontWeight: 800,
                fontSize: '15px',
                border: 'none',
                cursor: isQuickLoggingIn ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(245, 197, 24, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              {isQuickLoggingIn ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Verifying Secure Session...</span>
                </>
              ) : (
                <>
                  <Zap size={18} />
                  <span>One-Click Sign In</span>
                </>
              )}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                onClick={() => { setUseStandardLogin(true); setLoginError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-gold, #F5C518)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <KeyRound size={14} />
                <span>Use password / other ID</span>
              </button>

              <button
                onClick={handleForgetDevice}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Trash2 size={13} />
                <span>Forget device</span>
              </button>
            </div>

            <button
              onClick={onExitAdmin}
              style={{
                marginTop: '18px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary, #9CA3AF)',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={15} />
              <span>Return to FLOPSHOW Home</span>
            </button>
          </div>
        </div>
      );
    }

    // 2. Standard Username & Password Form
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

          {quickLoginData && (
            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => { setUseStandardLogin(false); setLoginError(null); }}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 197, 24, 0.1)',
                  border: '1px solid rgba(245, 197, 24, 0.3)',
                  color: 'var(--brand-gold, #F5C518)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Zap size={14} />
                <span>Switch to One-Click Quick Login</span>
              </button>
            </div>
          )}

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

            {/* Remember this device checkbox */}
            <div style={{ textAlign: 'left', marginTop: '2px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#D1D5DB',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={e => setRememberDevice(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--brand-gold, #F5C518)',
                    cursor: 'pointer'
                  }}
                />
                <span>Remember this device for One-Click Quick Login</span>
              </label>
              <p style={{ fontSize: '11px', color: '#6B7280', margin: '4px 0 0 24px' }}>
                Secure token will be saved on this browser (password is never stored).
              </p>
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
  const allNavItems = navGroups.flatMap(group => group.items);
  const activeNavItem = allNavItems.find(item => item.id === currentTab);
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

          {quickLoginData && (
            <button
              onClick={() => handleAdminLogout(true)}
              title="Sign out and forget this device (removes One-Click Quick Login)"
              style={{
                padding: '7px 11px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#9CA3AF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Trash2 size={13} />
              <span>Forget Device</span>
            </button>
          )}

          <button
            onClick={() => handleAdminLogout(false)}
            title={quickLoginData ? 'Sign out (Quick Login remains enabled on this device)' : 'Sign out'}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#F87171',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
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

              <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {navGroups.map(group => {
                  const GroupIcon = group.icon;
                  const isExpanded = !!expandedGroups[group.id];
                  const hasActiveChild = group.items.some(item => item.id === currentTab);

                  return (
                    <div
                      key={group.id}
                      style={{
                        borderRadius: '12px',
                        backgroundColor: hasActiveChild ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                        border: hasActiveChild ? '1px solid rgba(245, 197, 24, 0.15)' : '1px solid transparent',
                        overflow: 'hidden',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Group Header Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (group.items.length === 1) {
                            onNavigateTab(group.items[0].id);
                            setIsMenuOpen(false);
                          } else {
                            toggleGroup(group.id);
                          }
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: hasActiveChild ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '7px',
                              backgroundColor: hasActiveChild ? 'rgba(245, 197, 24, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: hasActiveChild ? 'var(--brand-gold, #F5C518)' : '#6B7280'
                            }}
                          >
                            <GroupIcon size={14} />
                          </div>
                          <span>{group.title}</span>
                        </div>

                        {group.items.length > 1 && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroup(group.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              color: hasActiveChild ? 'var(--brand-gold, #F5C518)' : '#6B7280'
                            }}
                          >
                            {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </div>
                        )}
                      </button>

                      {/* Group Child Items (Expandable) */}
                      {isExpanded && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            padding: group.items.length > 1 ? '4px 8px 10px 24px' : '2px 8px 8px 8px',
                            borderLeft: group.items.length > 1 ? '2px solid rgba(245, 197, 24, 0.2)' : 'none',
                            marginLeft: group.items.length > 1 ? '18px' : '0',
                            marginTop: '2px'
                          }}
                        >
                          {group.items.map(item => {
                            const ItemIcon = item.icon;
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
                                  padding: '9px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: isActive ? 'rgba(245, 197, 24, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                                  border: isActive ? '1px solid rgba(245, 197, 24, 0.4)' : '1px solid transparent',
                                  color: isActive ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                                  fontSize: '13px',
                                  fontWeight: isActive ? 700 : 500,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <ItemIcon
                                    size={15}
                                    style={{
                                      color: isActive ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                                      flexShrink: 0
                                    }}
                                  />
                                  <span>{item.label}</span>
                                </div>

                                {isActive && (
                                  <div
                                    style={{
                                      width: '6px',
                                      height: '6px',
                                      borderRadius: '50%',
                                      backgroundColor: 'var(--brand-gold, #F5C518)',
                                      boxShadow: '0 0 8px var(--brand-gold, #F5C518)'
                                    }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
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

                {quickLoginData && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleAdminLogout(true);
                    }}
                    title="Sign out and forget this device"
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#9CA3AF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px'
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Forget</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleAdminLogout(false);
                  }}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#F87171',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
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

import React, { useState } from 'react';
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
  Sparkles
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
  const navItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-content', label: 'Content & Media', icon: Film },
    { id: 'admin-quick-add', label: 'Quick Add / Import', icon: Sparkles },
    { id: 'admin-users', label: 'Users', icon: Users },
    { id: 'admin-transactions', label: 'Transactions', icon: CreditCard },
    { id: 'admin-genres', label: 'Genres', icon: Tag },
    { id: 'admin-settings', label: 'Settings', icon: Sliders }
  ];

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {/* Brand Logo & Admin Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => onNavigateTab('admin-dashboard')}>
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
              ADMIN PANEL
            </span>
          </div>

          {/* Nav Tabs */}
          <nav style={{ display: 'flex', gap: '4px' }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigateTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'rgba(245, 197, 24, 0.15)' : 'transparent',
                    color: isActive ? 'var(--brand-gold, #F5C518)' : 'var(--text-secondary, #9CA3AF)',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
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

      {/* Main Admin Content Container */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 80px' }}>
        {children}
      </main>
    </div>
  );
};

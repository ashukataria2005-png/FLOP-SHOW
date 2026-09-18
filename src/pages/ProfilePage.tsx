import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  User,
  Wallet,
  Bookmark,
  Film,
  History,
  LogOut,
  Edit2,
  Check,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  Settings,
  Lock,
  Key,
  Shield,
  Eye,
  EyeOff,
  Moon,
  Globe,
  Bell,
  Trash2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Crown,
  Sparkles,
  Calendar
} from 'lucide-react';

interface UserPaymentRequest {
  id: string;
  amount: number;
  upi_id_snapshot: string;
  utr: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_note: string | null;
  submitted_at: string;
  processed_at: string | null;
}

interface ProfilePageProps {
  onNavigate: (tab: string, param?: string) => void;
  initialSection?: 'profile' | 'wallet' | 'subscription' | 'settings';
}

// In-memory cache for instant switching between profile tabs
let cachedRechargeRequests: UserPaymentRequest[] = [];

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate, initialSection = 'profile' }) => {
  const {
    user,
    walletBalance,
    transactions,
    purchases,
    myList,
    watchProgress,
    logout,
    openAuthModal,
    openRechargeModal,
    updateProfile,
    isAuthenticated,
    monetizationMode,
    subscriptionPlans,
    activeSubscription,
    pendingSubscription,
    hasActiveSubscription,
    openSubscriptionModal
  } = useApp();

  const [activeSection, setActiveSection] = useState<'profile' | 'wallet' | 'subscription' | 'settings'>(() => {
    if (initialSection === 'wallet' && monetizationMode === 'SUBSCRIPTION') {
      return 'subscription';
    }
    return initialSection;
  });
  const [rechargeRequests, setRechargeRequests] = useState<UserPaymentRequest[]>(() => cachedRechargeRequests);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);

  // Settings tab states
  const [qualityPref, setQualityPref] = useState(() => {
    return localStorage.getItem('flopshow_quality') || '1080p Full HD';
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });

  const [themePref, setThemePref] = useState<'dark' | 'oled'>(() => {
    return (localStorage.getItem('flopshow_theme') as 'dark' | 'oled') || 'dark';
  });
  const [langPref, setLangPref] = useState(() => {
    return localStorage.getItem('flopshow_lang_pref') || 'Hindi & English';
  });
  const [subsPref, setSubsPref] = useState(() => {
    return localStorage.getItem('flopshow_subs_pref') || 'English & Hindi (Auto)';
  });
  const [autoplayNext, setAutoplayNext] = useState(() => {
    return localStorage.getItem('flopshow_autoplay') !== 'false';
  });
  const [previewHover, setPreviewHover] = useState(() => {
    return localStorage.getItem('flopshow_preview_hover') !== 'false';
  });
  const [notifyReleases, setNotifyReleases] = useState(() => {
    return localStorage.getItem('flopshow_notify_releases') !== 'false';
  });
  const [notifyWallet, setNotifyWallet] = useState(() => {
    return localStorage.getItem('flopshow_notify_wallet') !== 'false';
  });
  const [clearDataSuccess, setClearDataSuccess] = useState(false);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const fetchUserRequests = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.payments.getMyRequests();
      if (res && res.requests) {
        cachedRechargeRequests = res.requests;
        setRechargeRequests(res.requests);
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    if (activeSection === 'wallet') {
      fetchUserRequests();
    }
  }, [isAuthenticated, walletBalance, activeSection]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim() && editEmail.trim()) {
      try {
        if (isAuthenticated) {
          await api.auth.updateProfile(editName.trim(), editEmail.trim());
        }
      } catch {
        // Fallback gracefully
      }
      updateProfile(editName.trim(), editEmail.trim());
      setIsEditing(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordStatus({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    try {
      setPasswordStatus({ type: 'loading', message: 'Updating password securely...' });
      const res = await api.auth.changePassword(currentPassword, newPassword);
      if (res && res.success) {
        setPasswordStatus({
          type: 'success',
          message: 'Password updated successfully! Encrypted with secure server bcrypt hashing.'
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordStatus({ type: 'error', message: (res as any)?.message || 'Failed to update password.' });
      }
    } catch (err: any) {
      setPasswordStatus({
        type: 'error',
        message: err?.message || 'Failed to update password. Verify your current password.'
      });
    }
  };

  const handleThemeChange = (newTheme: 'dark' | 'oled') => {
    setThemePref(newTheme);
    localStorage.setItem('flopshow_theme', newTheme);
    if (newTheme === 'oled') {
      document.documentElement.style.setProperty('--bg-base', '#000000');
      document.documentElement.style.setProperty('--bg-surface', '#050508');
    } else {
      document.documentElement.style.removeProperty('--bg-base');
      document.documentElement.style.removeProperty('--bg-surface');
    }
  };

  const handleClearWatchHistory = () => {
    try {
      localStorage.removeItem('watch_progress');
      setClearDataSuccess(true);
      setTimeout(() => setClearDataSuccess(false), 3000);
    } catch {
      // Ignore
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: '840px', margin: '0 auto' }}>
      {/* Top Section Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '14px',
          overflowX: 'auto'
        }}
      >
        <button
          onClick={() => setActiveSection('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            border: activeSection === 'profile' ? '1px solid rgba(245, 166, 35, 0.4)' : '1px solid transparent',
            backgroundColor: activeSection === 'profile' ? 'rgba(245, 166, 35, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            color: activeSection === 'profile' ? 'var(--brand-gold, #F5C518)' : 'var(--text-secondary)',
            fontWeight: activeSection === 'profile' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          <User size={16} />
          <span>Account Profile</span>
        </button>

        {/* Mode A: Wallet & UPI Payments Tab */}
        {monetizationMode === 'PER_CONTENT' && (
          <button
            onClick={() => setActiveSection('wallet')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '12px',
              border: activeSection === 'wallet' ? '1px solid rgba(245, 166, 35, 0.4)' : '1px solid transparent',
              backgroundColor: activeSection === 'wallet' ? 'rgba(245, 166, 35, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              color: activeSection === 'wallet' ? 'var(--brand-gold, #F5C518)' : 'var(--text-secondary)',
              fontWeight: activeSection === 'wallet' ? 700 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Wallet size={16} />
            <span>Wallet & UPI Payments</span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(245, 166, 35, 0.2)',
                color: 'var(--brand-gold, #F5C518)',
                fontSize: '12px',
                fontWeight: 800
              }}
            >
              ₹{walletBalance.toFixed(0)}
            </span>
          </button>
        )}

        {/* Mode B: Subscription Tab */}
        {monetizationMode === 'SUBSCRIPTION' && (
          <button
            onClick={() => setActiveSection('subscription')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '12px',
              border: (activeSection === 'subscription' || activeSection === 'wallet') ? '1px solid rgba(245, 166, 35, 0.4)' : '1px solid transparent',
              backgroundColor: (activeSection === 'subscription' || activeSection === 'wallet') ? 'rgba(245, 166, 35, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              color: (activeSection === 'subscription' || activeSection === 'wallet') ? 'var(--brand-gold, #F5C518)' : 'var(--text-secondary)',
              fontWeight: (activeSection === 'subscription' || activeSection === 'wallet') ? 700 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Crown size={16} />
            <span>My Subscription</span>
            {hasActiveSubscription ? (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  fontSize: '11px',
                  fontWeight: 800
                }}
              >
                ACTIVE
              </span>
            ) : pendingSubscription ? (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(245, 166, 35, 0.2)',
                  color: 'var(--brand-gold)',
                  fontSize: '11px',
                  fontWeight: 800
                }}
              >
                PENDING
              </span>
            ) : null}
          </button>
        )}

        <button
          onClick={() => setActiveSection('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            border: activeSection === 'settings' ? '1px solid rgba(245, 166, 35, 0.4)' : '1px solid transparent',
            backgroundColor: activeSection === 'settings' ? 'rgba(245, 166, 35, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            color: activeSection === 'settings' ? 'var(--brand-gold, #F5C518)' : 'var(--text-secondary)',
            fontWeight: activeSection === 'settings' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>

      {/* SECTION 1: ACCOUNT PROFILE */}
      {activeSection === 'profile' && (
        <>
          {/* Profile Header Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: 'clamp(20px, 4vw, 32px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginBottom: '24px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: '#161624',
                  border: '2px solid var(--brand-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-gold)',
                  fontSize: '24px',
                  fontWeight: 800,
                  boxShadow: '0 4px 16px rgba(245, 166, 35, 0.3)',
                  flexShrink: 0
                }}
              >
                {user.avatarInitials}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF' }}>{user.name}</h2>
                  {isAuthenticated && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(245, 166, 35, 0.15)',
                        color: 'var(--brand-gold)',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    >
                      {user.role || 'MEMBER'}
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>{user.email}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                  Member since {user.joinedDate}
                </p>
              </div>

              {isAuthenticated && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="btn btn-ghost btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Edit2 size={14} />
                  <span>{isEditing ? 'Close' : 'Edit Info'}</span>
                </button>
              )}
            </div>

            {/* In-place Profile Edit Form */}
            {isEditing && (
              <form
                onSubmit={handleSaveProfile}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-gold)' }}>Edit Account Info</h4>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      fontSize: '14px',
                      color: '#FFFFFF'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      fontSize: '14px',
                      color: '#FFFFFF'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <Check size={14} />
                    <span>Save Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Quick Stats Banner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '16px',
                padding: '14px 10px',
                textAlign: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--brand-gold)' }}>
                  {purchases.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Owned Titles</div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
                  {myList.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>In My List</div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
                  {watchProgress.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Watched</div>
              </div>
            </div>
          </div>

          {/* Mode A: Wallet Balance Shortcut Strip */}
          {monetizationMode === 'PER_CONTENT' && (
            <div
              onClick={() => setActiveSection('wallet')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(245, 166, 35, 0.08)',
                border: '1px solid rgba(245, 166, 35, 0.25)',
                borderRadius: '16px',
                padding: '18px 20px',
                marginBottom: '24px',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--brand-gold)',
                    color: '#0E0E12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Wallet size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--brand-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
                    FLOPSHOW Wallet
                  </span>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF' }}>
                    ₹{walletBalance.toFixed(2)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--brand-gold)', fontWeight: 600 }}>
                  Manage Wallet & History →
                </span>
              </div>
            </div>
          )}

          {/* Mode B: Subscription Shortcut Strip */}
          {monetizationMode === 'SUBSCRIPTION' && (
            <div
              onClick={() => setActiveSection('subscription')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: hasActiveSubscription ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 166, 35, 0.08)',
                border: `1px solid ${hasActiveSubscription ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 166, 35, 0.3)'}`,
                borderRadius: '16px',
                padding: '18px 20px',
                marginBottom: '24px',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: hasActiveSubscription ? '#10B981' : 'var(--brand-gold)',
                    color: '#0E0E12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Crown size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: hasActiveSubscription ? '#10B981' : 'var(--brand-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Subscription Status
                  </span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
                    {hasActiveSubscription ? `${activeSubscription?.plan} Plan Active` : pendingSubscription ? 'Payment Verification Pending' : 'No Active Subscription'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: hasActiveSubscription ? '#10B981' : 'var(--brand-gold)', fontWeight: 600 }}>
                  {hasActiveSubscription ? 'View Plan Details →' : 'View Plans →'}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Shortcuts List */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              overflow: 'hidden',
              marginBottom: '24px'
            }}
          >
            <button
              onClick={() => onNavigate('library')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                color: '#FFFFFF'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Film size={18} color="var(--brand-gold)" />
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Purchased Films & Series</span>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>

            <button
              onClick={() => onNavigate('library')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                color: '#FFFFFF'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Bookmark size={18} color="var(--brand-gold)" />
                <span style={{ fontSize: '15px', fontWeight: 600 }}>My Saved List</span>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>

            {/* Mode A: Billing & Transaction History */}
            {monetizationMode === 'PER_CONTENT' && (
              <button
                onClick={() => setActiveSection('wallet')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  color: '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <History size={18} color="var(--brand-gold)" />
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>Billing & Transaction History</span>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </button>
            )}

            {/* Mode B: My Subscription & Plans */}
            {monetizationMode === 'SUBSCRIPTION' && (
              <button
                onClick={() => setActiveSection('subscription')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  color: '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Crown size={18} color="var(--brand-gold)" />
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>My Subscription & OTT Plans</span>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </button>
            )}

            <button
              onClick={() => setActiveSection('settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '16px 20px',
                color: '#FFFFFF'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Settings size={18} color="var(--brand-gold)" />
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Settings & Security Preferences</span>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>
          </div>

          {/* Account Switcher / Sign Out */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {isAuthenticated ? (
              <button
                onClick={logout}
                className="btn btn-secondary btn-block"
                style={{ color: '#F87171', borderColor: 'rgba(244, 63, 94, 0.3)' }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            ) : (
              <button onClick={openAuthModal} className="btn btn-primary btn-block">
                <User size={16} />
                <span>Sign In / Create Account</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* SECTION 2: WALLET & UPI PAYMENTS (Mode A only) */}
      {activeSection === 'wallet' && monetizationMode === 'PER_CONTENT' && (
        <div>
          {/* Main Balance Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1C1914 0%, #151318 50%, #0E0E14 100%)',
              border: '1.5px solid rgba(245, 166, 35, 0.35)',
              borderRadius: '24px',
              padding: 'clamp(24px, 4vw, 36px)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(245, 166, 35, 0.1)',
              marginBottom: '32px'
            }}
          >
            {/* Glow backdrop */}
            <div
              style={{
                position: 'absolute',
                top: '-60px',
                right: '-60px',
                width: '220px',
                height: '220px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(245, 166, 35, 0.25) 0%, transparent 70%)',
                pointerEvents: 'none'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-gold, #F5C518)' }}>
                <Wallet size={20} />
                <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Available Balance
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: 'var(--badge-owned-bg)',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <ShieldCheck size={14} />
                <span>Pay-Per-Content Ready</span>
              </div>
            </div>

            {/* Big Balance Display */}
            <div style={{ fontSize: 'clamp(40px, 7vw, 56px)', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
              ₹{walletBalance.toFixed(2)}
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '440px' }}>
              Use your wallet balance to unlock movies (₹10) and web series (₹20) with instant one-click checkout.
            </p>

            {/* Action Button */}
            <div style={{ marginTop: '24px' }}>
              <button onClick={openRechargeModal} className="btn btn-primary btn-lg">
                <Plus size={18} />
                <span>Add Funds / Recharge via UPI</span>
              </button>
            </div>
          </div>

          {/* Quick Recharge Packs */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px' }}>
              Quick Recharge Amounts
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              {[50, 100, 200, 500].map(amt => (
                <button
                  key={amt}
                  onClick={openRechargeModal}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--brand-gold)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--brand-gold)' }}>₹{amt}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Recharge</div>
                </button>
              ))}
            </div>
          </div>

          {/* UPI Recharge Requests Section */}
          {rechargeRequests.length > 0 && (
            <div style={{ marginBottom: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <QrCode size={18} color="var(--brand-gold, #F5C518)" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Submitted UPI Requests
                  </h2>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {rechargeRequests.length} request{rechargeRequests.length === 1 ? '' : 's'}
                </span>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden'
                }}
              >
                {rechargeRequests.map((req, idx) => (
                  <div
                    key={req.id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: idx < rechargeRequests.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                          ₹{(req.amount / 100).toFixed(0)}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          UTR: {req.utr}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} />
                        <span>
                          Submitted: {new Date(req.submitted_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                        {req.processed_at && (
                          <span>
                            • {req.status === 'APPROVED' ? 'Approved' : 'Reviewed'}: {new Date(req.processed_at).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        )}
                      </div>

                      {req.admin_note && (
                        <div style={{ fontSize: '11px', color: req.status === 'REJECTED' ? '#F87171' : '#10B981', marginTop: '4px' }}>
                          Admin Note: {req.admin_note}
                        </div>
                      )}
                    </div>

                    <div>
                      {req.status === 'PENDING' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(245, 197, 24, 0.15)',
                            color: 'var(--brand-gold, #F5C518)',
                            fontSize: '11px',
                            fontWeight: 800
                          }}
                        >
                          <Clock size={12} />
                          PENDING VERIFICATION
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#10B981',
                            fontSize: '11px',
                            fontWeight: 800
                          }}
                        >
                          <CheckCircle2 size={12} />
                          APPROVED & CREDITED
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#EF4444',
                            fontSize: '11px',
                            fontWeight: 800
                          }}
                        >
                          <XCircle size={12} />
                          DECLINED
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction History Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>Wallet Transactions</h2>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {transactions.length} record{transactions.length === 1 ? '' : 's'}
              </span>
            </div>

            {transactions.length > 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden'
                }}
              >
                {transactions.map((tx, idx) => {
                  const isCredit = tx.type === 'credit';
                  return (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderBottom: idx < transactions.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                            color: isCredit ? 'var(--badge-owned-bg)' : '#F87171',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                        </div>

                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>
                            {tx.title}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '2px'
                            }}
                          >
                            <Clock size={12} />
                            <span>{tx.timestamp}</span>
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: 800,
                            color: isCredit ? 'var(--badge-owned-bg)' : '#FFFFFF'
                          }}
                        >
                          {isCredit ? `+₹${tx.amount}` : `-₹${tx.amount}`}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '16px',
                  border: '1px dashed rgba(255, 255, 255, 0.08)'
                }}
              >
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No transactions yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2B: SUBSCRIPTION PASS & PLANS (Mode B only) */}
      {(activeSection === 'subscription' || (activeSection === 'wallet' && monetizationMode === 'SUBSCRIPTION')) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Main Status Hero Card */}
          <div
            style={{
              background: hasActiveSubscription
                ? 'linear-gradient(135deg, #2A1F0D 0%, #17141D 50%, #0E0E14 100%)'
                : 'linear-gradient(135deg, #1C1914 0%, #151318 50%, #0E0E14 100%)',
              border: hasActiveSubscription
                ? '1.5px solid rgba(245, 197, 24, 0.5)'
                : '1.5px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: 'clamp(24px, 4vw, 36px)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: hasActiveSubscription
                ? '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(245, 197, 24, 0.15)'
                : '0 16px 40px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Glow backdrop */}
            <div
              style={{
                position: 'absolute',
                top: '-60px',
                right: '-60px',
                width: '220px',
                height: '220px',
                borderRadius: '50%',
                background: hasActiveSubscription
                  ? 'radial-gradient(circle, rgba(245, 197, 24, 0.28) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
                pointerEvents: 'none'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-gold, #F5C518)' }}>
                <Crown size={20} />
                <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  FLOPSHOW VIP Pass
                </span>
              </div>
              {hasActiveSubscription ? (
                <span
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    color: '#4ADE80',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <CheckCircle2 size={12} />
                  ACTIVE
                </span>
              ) : pendingSubscription ? (
                <span
                  style={{
                    backgroundColor: 'rgba(234, 179, 8, 0.15)',
                    color: '#FACC15',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Clock size={12} />
                  APPROVAL PENDING
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-secondary)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  NO ACTIVE PLAN
                </span>
              )}
            </div>

            {hasActiveSubscription && activeSubscription ? (
              <div>
                <h1 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 900, color: '#FFFFFF', marginBottom: '8px' }}>
                  {activeSubscription.plan.toUpperCase()} PASS
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Unlimited streaming of all movies and web series unlocked.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D1D5DB', fontSize: '13px' }}>
                    <Calendar size={16} color="var(--brand-gold)" />
                    <span>Valid until: <strong>{new Date(activeSubscription.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D1D5DB', fontSize: '13px' }}>
                    <Clock size={16} color="var(--brand-gold)" />
                    <span>Days remaining: <strong>{activeSubscription.daysRemaining} days</strong></span>
                  </div>
                </div>
                <button
                  onClick={() => openSubscriptionModal()}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 700 }}
                >
                  <Sparkles size={16} />
                  <span>Renew or Extend Pass</span>
                </button>
              </div>
            ) : pendingSubscription ? (
              <div>
                <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 900, color: '#FACC15', marginBottom: '8px' }}>
                  Payment Verification Underway
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '18px', maxWidth: '600px' }}>
                  Your request for the <strong>{pendingSubscription.plan.toUpperCase()}</strong> plan (₹{pendingSubscription.amount_paid}) with UTR reference <code style={{ color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{pendingSubscription.payment_reference}</code> has been submitted. Our administrators are verifying your transaction. Access will automatically activate once approved.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#FACC15', backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.25)', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                  <Clock size={15} />
                  <span>Typically verified within 10 to 30 minutes</span>
                </div>
              </div>
            ) : (
              <div>
                <h1 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 900, color: '#FFFFFF', marginBottom: '8px' }}>
                  Subscribe for Unlimited OTT Streaming
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px', maxWidth: '600px' }}>
                  Switch to an all-inclusive VIP pass to stream every blockbuster, exclusive original, and full web series season with zero per-content charges.
                </p>
                <button
                  onClick={() => openSubscriptionModal()}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: 700, fontSize: '15px' }}
                >
                  <Crown size={18} />
                  <span>Choose Your Plan</span>
                </button>
              </div>
            )}
          </div>

          {/* Available Plans Section */}
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
                Subscription Plans
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Select a plan, pay via any UPI app, and submit your UTR reference for instant verification.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '20px'
              }}
            >
              {subscriptionPlans.map((plan) => {
                const isCurrentActive = activeSubscription?.plan === plan.id;
                const isPendingForThis = pendingSubscription?.plan === plan.id;
                const isPopular = plan.id === 'MONTHLY';

                return (
                  <div
                    key={plan.id}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: '20px',
                      border: isPopular
                        ? '2px solid var(--brand-gold, #F5C518)'
                        : isCurrentActive
                        ? '1.5px solid rgba(34, 197, 94, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '24px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isPopular ? '0 12px 30px rgba(245, 197, 24, 0.1)' : 'none'
                    }}
                  >
                    {isPopular && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-12px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'var(--brand-gold, #F5C518)',
                          color: '#000000',
                          fontSize: '11px',
                          fontWeight: 900,
                          padding: '3px 12px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em'
                        }}
                      >
                        Most Popular
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {plan.name}
                        </span>
                        {isCurrentActive && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#4ADE80', backgroundColor: 'rgba(34, 197, 94, 0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                            Current Plan
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF' }}>
                          ₹{plan.priceRupees}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          / {plan.durationDays === 7 ? 'week' : plan.durationDays === 30 ? 'month' : 'year'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#D1D5DB' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>Full HD & 4K Streaming</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#D1D5DB' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>Unlimited movies & web series</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#D1D5DB' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>Ad-free cinema experience</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#D1D5DB' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>Zero per-content charges</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openSubscriptionModal()}
                      className={isPopular ? 'btn btn-primary btn-block' : 'btn btn-secondary btn-block'}
                      disabled={isPendingForThis}
                      style={{
                        fontWeight: 700,
                        opacity: isPendingForThis ? 0.7 : 1,
                        cursor: isPendingForThis ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isPendingForThis
                        ? 'Verification In Progress'
                        : isCurrentActive
                        ? 'Extend This Pass'
                        : `Get ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secure Guarantee Note */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            <ShieldCheck size={24} color="var(--brand-gold, #F5C518)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              All subscription transactions are protected by FLOPSHOW's secure manual verification. After paying via UPI QR or VPA, simply paste your 12-digit UTR reference. Our team activates your VIP pass upon receipt.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: USER SETTINGS */}
      {activeSection === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Banner */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={22} color="var(--brand-gold)" />
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>Preferences & Account Settings</h2>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Customize your streaming experience, language, privacy, and account security.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  color: '#4ADE80',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <ShieldCheck size={14} />
                Bcrypt Encrypted Session
              </span>
            </div>
          </div>

          {/* 1. Account Information */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={18} color="var(--brand-gold)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Account Information</h3>
              </div>
              {isAuthenticated && !isEditing && (
                <button onClick={() => setIsEditing(true)} className="btn btn-ghost btn-sm" style={{ gap: '6px' }}>
                  <Edit2 size={13} />
                  <span>Edit Info</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      fontSize: '14px',
                      color: '#FFFFFF'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      fontSize: '14px',
                      color: '#FFFFFF'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <Check size={14} />
                    <span>Save Changes</span>
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn btn-ghost btn-sm">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Name
                  </span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                    {user.name}
                  </div>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Email
                  </span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                    {user.email}
                  </div>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Role & Status
                  </span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-gold)', marginTop: '2px' }}>
                    {user.role || 'MEMBER'} · ACTIVE
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Security & Password Change */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Lock size={18} color="var(--brand-gold)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Security & Password Change</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Your password is encrypted with cryptographic bcrypt hashing. It is never stored or transmitted in plaintext.
            </p>

            {isAuthenticated ? (
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {passwordStatus.message && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      backgroundColor:
                        passwordStatus.type === 'success'
                          ? 'rgba(34, 197, 94, 0.15)'
                          : passwordStatus.type === 'error'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(245, 166, 35, 0.15)',
                      color:
                        passwordStatus.type === 'success'
                          ? '#4ADE80'
                          : passwordStatus.type === 'error'
                          ? '#F87171'
                          : 'var(--brand-gold)',
                      border:
                        passwordStatus.type === 'success'
                          ? '1px solid rgba(34, 197, 94, 0.3)'
                          : passwordStatus.type === 'error'
                          ? '1px solid rgba(239, 68, 68, 0.3)'
                          : '1px solid rgba(245, 166, 35, 0.3)'
                    }}
                  >
                    {passwordStatus.type === 'success' && <CheckCircle2 size={16} />}
                    {passwordStatus.type === 'error' && <AlertCircle size={16} />}
                    {passwordStatus.type === 'loading' && <RefreshCw size={16} className="animate-spin" />}
                    <span>{passwordStatus.message}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Current Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        fontSize: '14px',
                        color: '#FFFFFF'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      New Password (min 6 chars)
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        fontSize: '14px',
                        color: '#FFFFFF'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        fontSize: '14px',
                        color: '#FFFFFF'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={passwordStatus.type === 'loading'}
                    className="btn btn-primary btn-sm"
                    style={{ gap: '6px' }}
                  >
                    <Key size={14} />
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            ) : (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Sign in to manage your account password and security credentials.
                </span>
                <button onClick={openAuthModal} className="btn btn-primary btn-sm">
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* 3. Streaming Quality & Autoplay */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Sliders size={18} color="var(--brand-gold)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Streaming & Playback</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Default Streaming Quality</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Preferred resolution for movies, studio releases, and series
                  </div>
                </div>
                <select
                  value={qualityPref}
                  onChange={e => {
                    setQualityPref(e.target.value);
                    localStorage.setItem('flopshow_quality', e.target.value);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    fontSize: '13px'
                  }}
                >
                  <option value="Auto (Adaptive)">Auto (Adaptive)</option>
                  <option value="1080p Full HD">1080p Full HD</option>
                  <option value="4K Ultra HD">4K Ultra HD</option>
                  <option value="720p HD (Data Saver)">720p HD (Data Saver)</option>
                </select>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '14px'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Autoplay Next Episode</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Automatically queue and start the next episode when watching a series
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoplayNext;
                    setAutoplayNext(next);
                    localStorage.setItem('flopshow_autoplay', String(next));
                  }}
                  style={{
                    width: '46px',
                    height: '26px',
                    borderRadius: '9999px',
                    backgroundColor: autoplayNext ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.15)',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: autoplayNext ? '23px' : '3px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#0E0E14',
                      transition: 'left 0.2s'
                    }}
                  />
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '14px'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Video Previews on Browse</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Show motion previews when hovering over movie and series cards
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !previewHover;
                    setPreviewHover(next);
                    localStorage.setItem('flopshow_preview_hover', String(next));
                  }}
                  style={{
                    width: '46px',
                    height: '26px',
                    borderRadius: '9999px',
                    backgroundColor: previewHover ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.15)',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: previewHover ? '23px' : '3px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#0E0E14',
                      transition: 'left 0.2s'
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Language & Subtitles */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Globe size={18} color="var(--brand-gold)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Language & Subtitles</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Preferred Audio Language
                </label>
                <select
                  value={langPref}
                  onChange={e => {
                    setLangPref(e.target.value);
                    localStorage.setItem('flopshow_lang_pref', e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    fontSize: '13px'
                  }}
                >
                  <option value="Hindi & English">Hindi & English (Dual Audio)</option>
                  <option value="Hindi">Hindi (Original & Dubbed)</option>
                  <option value="English">English (Original)</option>
                  <option value="Multi-Language">All Available Regional Tracks</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Default Subtitles
                </label>
                <select
                  value={subsPref}
                  onChange={e => {
                    setSubsPref(e.target.value);
                    localStorage.setItem('flopshow_subs_pref', e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    fontSize: '13px'
                  }}
                >
                  <option value="English & Hindi (Auto)">English & Hindi (Auto)</option>
                  <option value="English">English Only</option>
                  <option value="Hindi">Hindi Only</option>
                  <option value="Off">Turn Off Subtitles</option>
                </select>
              </div>
            </div>
          </div>

          {/* 5. Appearance / Theme */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Moon size={18} color="var(--brand-gold)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Appearance & Theme</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div
                onClick={() => handleThemeChange('dark')}
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: themePref === 'dark' ? 'rgba(245, 166, 35, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: themePref === 'dark' ? '1.5px solid var(--brand-gold)' : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>Cinematic Dark</span>
                  {themePref === 'dark' && <Check size={16} color="var(--brand-gold)" />}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Deep charcoal with signature golden highlights (Recommended).
                </p>
              </div>

              <div
                onClick={() => handleThemeChange('oled')}
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: themePref === 'oled' ? 'rgba(245, 166, 35, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: themePref === 'oled' ? '1.5px solid var(--brand-gold)' : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>OLED Pure Black</span>
                  {themePref === 'oled' && <Check size={16} color="var(--brand-gold)" />}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  True 100% black levels optimized for OLED and AMOLED displays.
                </p>
              </div>
            </div>
          </div>

          {/* 6. Notification Preferences */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Bell size={18} color="var(--brand-gold)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Notification Preferences</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Studio & Spider-Man Premieres</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Get alerted when new Marvel, Disney, Warner Bros., or Spider-Man films drop
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !notifyReleases;
                    setNotifyReleases(next);
                    localStorage.setItem('flopshow_notify_releases', String(next));
                  }}
                  style={{
                    width: '46px',
                    height: '26px',
                    borderRadius: '9999px',
                    backgroundColor: notifyReleases ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.15)',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: notifyReleases ? '23px' : '3px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#0E0E14',
                      transition: 'left 0.2s'
                    }}
                  />
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '14px'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Wallet & UPI Alerts</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Receive instant confirmation when admin approves your balance recharge
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !notifyWallet;
                    setNotifyWallet(next);
                    localStorage.setItem('flopshow_notify_wallet', String(next));
                  }}
                  style={{
                    width: '46px',
                    height: '26px',
                    borderRadius: '9999px',
                    backgroundColor: notifyWallet ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.15)',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: notifyWallet ? '23px' : '3px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#0E0E14',
                      transition: 'left 0.2s'
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 7. Privacy, Data & Sign Out */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Shield size={18} color="var(--brand-gold)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Privacy & Account Control</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Clear Local Watch History</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Reset your locally cached 'Continue Watching' resume points
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {clearDataSuccess && (
                    <span style={{ fontSize: '12px', color: '#4ADE80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> Cleared!
                    </span>
                  )}
                  <button
                    onClick={handleClearWatchHistory}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#F87171', border: '1px solid rgba(248, 113, 113, 0.2)' }}
                  >
                    <Trash2 size={14} />
                    <span>Clear History</span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '16px',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Active Session</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {isAuthenticated ? `Logged in as ${user.email}` : 'Browsing as Guest'}
                  </div>
                </div>
                {isAuthenticated ? (
                  <button
                    onClick={logout}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#F87171', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button onClick={openAuthModal} className="btn btn-primary btn-sm">
                    <User size={14} />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

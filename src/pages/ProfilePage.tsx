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
  Sliders,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode
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
  initialSection?: 'profile' | 'wallet';
}

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
    isAuthenticated
  } = useApp();

  const [activeSection, setActiveSection] = useState<'profile' | 'wallet'>(initialSection);
  const [rechargeRequests, setRechargeRequests] = useState<UserPaymentRequest[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [qualityPref, setQualityPref] = useState('1080p Full HD');

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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim() && editEmail.trim()) {
      updateProfile(editName.trim(), editEmail.trim());
      setIsEditing(false);
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

          {/* Wallet Balance Shortcut Strip */}
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

            <button
              onClick={() => setActiveSection('wallet')}
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
                <History size={18} color="var(--brand-gold)" />
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Billing & Transaction History</span>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>
          </div>

          {/* Preferences Section */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Sliders size={18} color="var(--brand-gold)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Playback Preferences</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Default Streaming Quality</span>
              <select
                value={qualityPref}
                onChange={e => setQualityPref(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '13px'
                }}
              >
                <option value="Auto (Adaptive)">Auto (Adaptive)</option>
                <option value="1080p Full HD">1080p Full HD</option>
                <option value="4K Ultra HD">4K Ultra HD</option>
              </select>
            </div>
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

      {/* SECTION 2: WALLET & UPI PAYMENTS */}
      {activeSection === 'wallet' && (
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
    </div>
  );
};

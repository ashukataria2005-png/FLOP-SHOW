import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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
  ChevronRight
} from 'lucide-react';

interface ProfilePageProps {
  onNavigate: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const {
    user,
    walletBalance,
    purchases,
    myList,
    watchProgress,
    logout,
    openAuthModal,
    openRechargeModal,
    updateProfile,
    isAuthenticated
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [qualityPref, setQualityPref] = useState('1080p Full HD');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim() && editEmail.trim()) {
      updateProfile(editName.trim(), editEmail.trim());
      setIsEditing(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: '780px', margin: '0 auto' }}>
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
          {/* Avatar circle matching Screenshot 1 */}
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

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF' }}>{user.name}</h2>
              <button
                onClick={() => {
                  setEditName(user.name);
                  setEditEmail(user.email);
                  setIsEditing(true);
                }}
                style={{ color: 'var(--brand-gold)', padding: '4px' }}
                title="Edit Profile"
              >
                <Edit2 size={16} />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>{user.email}</p>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Member since {user.joinedDate}</span>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              animation: 'fadeIn 0.2s ease-out'
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

      {/* Wallet Balance Strip */}
      <div
        onClick={() => onNavigate('wallet')}
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

        <button
          onClick={e => {
            e.stopPropagation();
            openRechargeModal();
          }}
          className="btn btn-primary btn-sm"
        >
          <span>Recharge</span>
        </button>
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
          onClick={() => onNavigate('wallet')}
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

      {/* Admin Panel Gateway */}
      <div
        onClick={() => onNavigate('admin')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(245, 197, 24, 0.08)',
          border: '1px solid rgba(245, 197, 24, 0.3)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 197, 24, 0.2)',
              color: 'var(--brand-gold, #F5C518)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Sliders size={20} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
              FLOPSHOW Admin Panel
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #9CA3AF)' }}>
              Manage movies, series, pricing, Trending #1, and media
            </div>
          </div>
        </div>

        <ChevronRight size={18} color="var(--brand-gold, #F5C518)" />
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
    </div>
  );
};

import React from 'react';
import { Logo } from '../common/Logo';
import { useApp } from '../../context/AppContext';
import { Wallet, Search, Compass, Bookmark } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  const { user, walletBalance } = useApp();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        backgroundColor: 'rgba(9, 9, 14, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        justifyContent: 'space-between',
        transition: 'background-color 0.2s ease'
      }}
    >
      {/* Brand Logo */}
      <Logo size="md" onClick={() => onNavigate('discover')} />

      {/* Desktop Navigation Links */}
      <nav
        style={{
          display: 'none',
          alignItems: 'center',
          gap: '32px'
        }}
        className="desktop-nav-links"
      >
        <button
          onClick={() => onNavigate('discover')}
          style={{
            color: currentTab === 'discover' ? 'var(--brand-gold)' : 'var(--text-secondary)',
            fontWeight: currentTab === 'discover' ? 700 : 500,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'color var(--transition-fast)'
          }}
        >
          <Compass size={18} />
          Discover
        </button>

        <button
          onClick={() => onNavigate('search')}
          style={{
            color: currentTab === 'search' ? 'var(--brand-gold)' : 'var(--text-secondary)',
            fontWeight: currentTab === 'search' ? 700 : 500,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'color var(--transition-fast)'
          }}
        >
          <Search size={18} />
          Search
        </button>

        <button
          onClick={() => onNavigate('library')}
          style={{
            color: currentTab === 'library' ? 'var(--brand-gold)' : 'var(--text-secondary)',
            fontWeight: currentTab === 'library' ? 700 : 500,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'color var(--transition-fast)'
          }}
        >
          <Bookmark size={18} />
          My Library
        </button>
      </nav>

      {/* Right Action Icons: Wallet balance & Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Wallet Balance Pill */}
        <button
          onClick={() => onNavigate('profile', 'wallet')}
          title="Open Wallet in Profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'rgba(245, 166, 35, 0.12)',
            border: '1px solid rgba(245, 166, 35, 0.3)',
            color: 'var(--brand-gold)',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(245, 166, 35, 0.2)';
            e.currentTarget.style.borderColor = 'var(--brand-gold)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'rgba(245, 166, 35, 0.12)';
            e.currentTarget.style.borderColor = 'rgba(245, 166, 35, 0.3)';
          }}
        >
          <Wallet size={15} />
          <span>₹{walletBalance}</span>
        </button>

        {/* User Avatar Circle */}
        <button
          onClick={() => onNavigate('profile', 'profile')}
          title="Account Profile"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#161622',
            border: '1.5px solid rgba(245, 166, 35, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-gold)',
            fontWeight: 700,
            fontSize: '14px',
            letterSpacing: '0.04em',
            transition: 'all var(--transition-fast)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--brand-gold)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(245, 166, 35, 0.45)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {user.avatarInitials || 'DU'}
        </button>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .desktop-nav-links {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
};

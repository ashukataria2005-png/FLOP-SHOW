import React from 'react';
import { Logo } from '../common/Logo';
import { useApp } from '../../context/AppContext';
import { Search, Compass, Bookmark, Crown, Zap, Gift } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  const {
    user,
    monetizationMode,
    hasActiveSubscription,
    activeSubscription,
    openSubscriptionModal
  } = useApp();

  const handleHomeNavigation = () => {
    if (currentTab === 'discover') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onNavigate('discover');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
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
      <Logo size="md" animated onClick={handleHomeNavigation} />

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
          onClick={handleHomeNavigation}
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
          onClick={() => onNavigate('plans')}
          style={{
            color: currentTab === 'plans' ? 'var(--brand-gold)' : 'var(--text-secondary)',
            fontWeight: currentTab === 'plans' ? 700 : 500,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'color var(--transition-fast)'
          }}
        >
          <Zap size={18} />
          Plans
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

        <button
          onClick={() => onNavigate('bonus')}
          style={{
            color: currentTab === 'bonus' ? 'var(--brand-gold)' : 'var(--text-secondary)',
            fontWeight: currentTab === 'bonus' ? 700 : 500,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'color var(--transition-fast)'
          }}
        >
          <Gift size={18} />
          Bonus
        </button>
      </nav>

      {/* Right Action Icons: Subscription pill & Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Bonus / Rewards Pill */}
        <button
          onClick={() => onNavigate('bonus')}
          title="Bonus & Rewards Hub"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: currentTab === 'bonus' ? 'rgba(245, 197, 24, 0.25)' : 'rgba(245, 197, 24, 0.12)',
            border: '1px solid rgba(245, 197, 24, 0.35)',
            color: 'var(--brand-gold)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          <Gift size={14} />
          <span>Bonus</span>
        </button>

        {/* Mode B: Subscription Badge / CTA */}
        {monetizationMode === 'SUBSCRIPTION' && (
          <button
            onClick={() => {
              if (hasActiveSubscription) {
                onNavigate('profile', 'subscription');
              } else {
                openSubscriptionModal();
              }
            }}
            title={hasActiveSubscription ? 'Active Subscription' : 'Subscribe to FLOPSHOW'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: hasActiveSubscription ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 166, 35, 0.15)',
              border: `1px solid ${hasActiveSubscription ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 166, 35, 0.4)'}`,
              color: hasActiveSubscription ? '#10B981' : 'var(--brand-gold)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Crown size={14} />
            <span>{hasActiveSubscription ? (activeSubscription?.plan ? `${activeSubscription.plan}` : 'VIP Active') : 'Subscribe'}</span>
          </button>
        )}

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

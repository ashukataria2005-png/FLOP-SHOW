import React from 'react';
import { Logo } from '../common/Logo';
import { useApp } from '../../context/AppContext';
import { Search, Compass, Bookmark, Crown, Zap, Gift, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  const {
    user,
    hasActiveSubscription,
    activeSubscription,
    hasActiveWatchPass,
    activeWatchPass,
    openPlanSelector
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Dynamic Plan Badge (Replaces duplicate Bonus button) */}
        {(() => {
          if (hasActiveSubscription && activeSubscription) {
            const planLabel = activeSubscription.plan === 'MONTHLY'
              ? 'MONTHLY VIP'
              : activeSubscription.plan === '3_MONTHS'
              ? '3M VIP'
              : activeSubscription.plan === 'YEARLY'
              ? 'ANNUAL VIP'
              : activeSubscription.plan === 'WEEKLY'
              ? 'WEEKLY VIP'
              : 'VIP MEMBER';

            return (
              <button
                onClick={() => openPlanSelector()}
                title="Active VIP Subscription - Click to view plans & details"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'linear-gradient(135deg, rgba(245, 197, 24, 0.22) 0%, rgba(168, 85, 247, 0.22) 100%)',
                  border: '1.5px solid var(--brand-gold, #F5C518)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(245, 197, 24, 0.25)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Crown size={14} color="var(--brand-gold, #F5C518)" />
                <span>{planLabel}</span>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 6px #10B981',
                    marginLeft: '2px'
                  }}
                />
              </button>
            );
          }

          if (hasActiveWatchPass && activeWatchPass) {
            const passName = activeWatchPass.plan === 'PASS_24H'
              ? '24H PASS'
              : activeWatchPass.plan === 'PASS_3D'
              ? '3D PASS'
              : activeWatchPass.plan === 'PASS_7D'
              ? '7D PASS'
              : activeWatchPass.plan === 'PASS_15D'
              ? '15D PASS'
              : activeWatchPass.plan === 'PASS_30D'
              ? '30D PASS'
              : 'WATCH PASS';

            return (
              <button
                onClick={() => openPlanSelector()}
                title="Active Watch Pass - Click to view plans & details"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(16, 185, 129, 0.16)',
                  border: '1.5px solid rgba(16, 185, 129, 0.6)',
                  color: '#34D399',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Zap size={14} color="#10B981" />
                <span>{passName}</span>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 6px #10B981',
                    marginLeft: '2px'
                  }}
                />
              </button>
            );
          }

          // Free Tier (Default / No Active Plan)
          return (
            <button
              onClick={() => openPlanSelector()}
              title="Free Tier - Click to explore streaming passes & VIP subscriptions"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#E5E7EB',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(245, 197, 24, 0.6)';
                e.currentTarget.style.color = 'var(--brand-gold, #F5C518)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = '#E5E7EB';
              }}
            >
              <Sparkles size={13} color="var(--brand-gold, #F5C518)" />
              <span>FREE TIER</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: 'var(--brand-gold, #F5C518)',
                  backgroundColor: 'rgba(245, 197, 24, 0.15)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  marginLeft: '2px'
                }}
              >
                UPGRADE
              </span>
            </button>
          );
        })()}

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

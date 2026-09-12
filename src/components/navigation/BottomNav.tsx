import React from 'react';
import { Compass, Search, Bookmark, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onNavigate }) => {
  const tabs = [
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'My library', icon: Bookmark },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--bottom-nav-height)',
        backgroundColor: 'rgba(10, 10, 15, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        padding: '0 8px'
      }}
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '8px 12px',
              flex: 1,
              maxWidth: '90px',
              color: isActive ? 'var(--brand-gold)' : 'var(--text-muted)',
              transition: 'all var(--transition-fast)',
              userSelect: 'none'
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform var(--transition-fast)'
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.3 : 1.7}
                style={{
                  color: isActive ? 'var(--brand-gold)' : 'currentColor',
                  filter: isActive ? 'drop-shadow(0 0 6px rgba(245, 166, 35, 0.4))' : 'none'
                }}
              />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.02em',
                lineHeight: 1
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}

      <style>{`
        @media (min-width: 900px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
};

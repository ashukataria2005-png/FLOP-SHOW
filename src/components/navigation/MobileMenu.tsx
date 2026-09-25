import React, { useState, useEffect } from 'react';
import { Logo } from '../common/Logo';
import { useApp } from '../../context/AppContext';
import { getSavedSocials, SocialLinks } from '../../utils/socials';
import {
  X,
  Compass,
  Search,
  Zap,
  Bookmark,
  Gift,
  User as UserIcon,
  Crown,
  ExternalLink,
  Send,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Linkedin
} from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  currentTab,
  onNavigate
}) => {
  const {
    user,
    hasActiveSubscription,
    hasActiveWatchPass,
    openPlanSelector
  } = useApp();

  const [socials, setSocials] = useState<SocialLinks>(() => getSavedSocials());

  useEffect(() => {
    const handleUpdate = () => {
      setSocials(getSavedSocials());
    };
    window.addEventListener('flopshow_socials_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('flopshow_socials_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavClick = (tab: string, param?: string) => {
    onNavigate(tab, param);
    onClose();
  };

  const navItems = [
    { id: 'discover', label: 'Discover & Featured', icon: Compass },
    { id: 'search', label: 'Explore & Search', icon: Search },
    { id: 'plans', label: 'VIP Plans & Passes', icon: Zap, badge: 'HOT' },
    { id: 'library', label: 'My Library', icon: Bookmark },
    { id: 'bonus', label: 'Bonus & Promos', icon: Gift },
    { id: 'profile', label: 'My Account & Watchlist', icon: UserIcon }
  ];

  const socialPlatforms = [
    {
      name: 'Telegram',
      url: socials.telegram,
      icon: Send,
      color: '#229ED9',
      bg: 'rgba(34, 158, 217, 0.12)',
      border: 'rgba(34, 158, 217, 0.35)',
      description: 'Official Channel'
    },
    {
      name: 'Instagram',
      url: socials.instagram,
      icon: Instagram,
      color: '#E1306C',
      bg: 'rgba(225, 48, 108, 0.12)',
      border: 'rgba(225, 48, 108, 0.35)',
      description: '@flopshow'
    },
    {
      name: 'YouTube',
      url: socials.youtube,
      icon: Youtube,
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.35)',
      description: 'Trailers & Clips'
    },
    {
      name: 'X / Twitter',
      url: socials.twitter,
      icon: Twitter,
      color: '#E2E8F0',
      bg: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.2)',
      description: 'Updates & News'
    },
    {
      name: 'Facebook',
      url: socials.facebook,
      icon: Facebook,
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.35)',
      description: 'Community Page'
    },
    {
      name: 'LinkedIn',
      url: socials.linkedin,
      icon: Linkedin,
      color: '#0A66C2',
      bg: 'rgba(10, 102, 194, 0.12)',
      border: 'rgba(10, 102, 194, 0.35)',
      description: 'Company & Press'
    }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      />

      {/* Drawer Container */}
      <div
        style={{
          position: 'relative',
          width: '85%',
          maxWidth: '340px',
          height: '100%',
          backgroundColor: '#0C0C12',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          boxShadow: '10px 0 40px rgba(0, 0, 0, 0.8)',
          animation: 'slideFromLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto'
        }}
      >
        {/* Header Bar inside Drawer */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <Logo size="sm" onClick={() => handleNavClick('discover')} />
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card / Plan Status */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div
            onClick={() => handleNavClick('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 166, 35, 0.15)',
                border: '1.5px solid var(--brand-gold, #F5C518)',
                color: 'var(--brand-gold, #F5C518)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px'
              }}
            >
              {user.avatarInitials || 'DU'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email || 'Streaming Member'}
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {hasActiveSubscription ? (
                  <span style={{ color: 'var(--brand-gold, #F5C518)', fontWeight: 700 }}>VIP Member</span>
                ) : hasActiveWatchPass ? (
                  <span style={{ color: '#10B981', fontWeight: 700 }}>Pass Active</span>
                ) : (
                  <span>Free Tier Account</span>
                )}
              </div>
            </div>
          </div>

          {/* Upgrade Banner in Drawer */}
          {!hasActiveSubscription && (
            <button
              onClick={() => {
                onClose();
                openPlanSelector();
              }}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.2) 0%, rgba(239, 68, 68, 0.2) 100%)',
                border: '1px solid rgba(245, 166, 35, 0.4)',
                color: 'var(--brand-gold, #F5C518)',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Crown size={14} />
              <span>Upgrade to VIP or Buy Pass</span>
            </button>
          )}
        </div>

        {/* Navigation List */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px' }}>
            Navigation
          </span>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'rgba(245, 166, 35, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(245, 166, 35, 0.3)' : '1px solid transparent',
                  color: isActive ? 'var(--brand-gold, #F5C518)' : '#D1D5DB',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={17} color={isActive ? 'var(--brand-gold, #F5C518)' : '#9CA3AF'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(245, 166, 35, 0.2)',
                      color: 'var(--brand-gold, #F5C518)',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Community & Socials Section at the Bottom */}
        <div
          style={{
            marginTop: 'auto',
            padding: '18px 16px 28px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Community &amp; Socials
            </span>
            <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              Live Links
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px'
            }}
          >
            {socialPlatforms.map(platform => {
              const Icon = platform.icon;
              const hasUrl = Boolean(platform.url && platform.url.trim());
              return (
                <a
                  key={platform.name}
                  href={hasUrl ? platform.url : '#'}
                  target={hasUrl ? '_blank' : undefined}
                  rel={hasUrl ? 'noopener noreferrer' : undefined}
                  onClick={e => {
                    if (!hasUrl) {
                      e.preventDefault();
                    }
                  }}
                  title={hasUrl ? `Open ${platform.name}` : `${platform.name} link not configured`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: platform.bg,
                    border: `1px solid ${platform.border}`,
                    color: platform.color,
                    textDecoration: 'none',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    transition: 'all 0.15s ease',
                    opacity: hasUrl ? 1 : 0.6
                  }}
                >
                  <Icon size={14} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {platform.name}
                  </span>
                  <ExternalLink size={10} style={{ opacity: 0.7, flexShrink: 0 }} />
                </a>
              );
            })}
          </div>

          <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '10.5px', color: '#6B7280' }}>
            FLOPSHOW Streaming Platform © {new Date().getFullYear()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideFromLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

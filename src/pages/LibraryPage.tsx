import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ContentItem } from '../types/content';
import { Film, Zap, Compass, Clock, RotateCcw, Play, CheckCircle2 } from 'lucide-react';

interface LibraryPageProps {
  onSelectItem: (item: ContentItem) => void;
  onNavigate: (tab: string) => void;
}

export function formatPassPlanName(p: any): string {
  const planType = (p.plan_type || p.planType || '').toUpperCase();
  if (planType === '24H' || planType === '1D') return '24-Hour Watch Pass';
  if (planType === '3D') return '3-Day VIP Pass';
  if (planType === '7D') return '7-Day VIP Pass';
  if (planType === '15D') return '15-Day VIP Pass';
  if (planType === '30D' || planType === 'MONTHLY') return 'Monthly All-Access Pass';
  if (planType === 'YEARLY' || planType === '365D') return 'Annual VIP Pass';
  if (p.plan_name || p.planName) return p.plan_name || p.planName;
  if (p.name && !p.content_id) return p.name;
  return 'All-Access Watch Pass';
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ onSelectItem, onNavigate }) => {
  const { purchases, catalog, openPurchaseModal, userWatchPasses, openPlanSelector } = useApp();
  const activeCatalog = catalog || [];
  const [activeTab, setActiveTab] = useState<'owned' | 'passes'>('owned');

  // Individually Purchased / Owned items
  const ownedItems = purchases
    .map(p => activeCatalog.find(c => c.id === p.contentId))
    .filter((c): c is ContentItem => c !== undefined);

  const tabs = [
    { id: 'owned', label: 'My Purchases', count: ownedItems.length, icon: Film },
    { id: 'passes', label: 'My Passes', count: userWatchPasses.activePasses.length, icon: Zap }
  ];

  return (
    <div style={{ padding: '24px 20px', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
      {/* Title & Description */}
      <div style={{ marginBottom: '22px' }}>
        <h1
          style={{
            fontSize: 'clamp(26px, 4vw, 36px)',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            margin: '0 0 6px'
          }}
        >
          My Library
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          Manage your individually rented/purchased titles and active duration passes.
        </p>
      </div>

      {/* Tabs: Strictly "My Purchases" & "My Passes" */}
      <div
        className="no-scrollbar scrollbar-none"
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '26px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '14px',
                fontWeight: isSelected ? 800 : 500,
                backgroundColor: isSelected ? 'var(--brand-gold)' : 'rgba(255, 255, 255, 0.06)',
                color: isSelected ? '#0E0E12' : 'var(--text-secondary)',
                border: isSelected ? '1px solid var(--brand-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.12)',
                  color: isSelected ? '#0E0E12' : '#FFFFFF'
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: My Purchases (Individual Titles) */}
      {activeTab === 'owned' && (
        ownedItems.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 'clamp(14px, 2.5vw, 22px)'
            }}
          >
            {ownedItems.map(item => {
              const purchase = purchases.find(p => p.contentId === item.id);

              const countdown = (() => {
                if (!purchase?.expiresAt) {
                  return { label: '30 days left', isExpired: Boolean(purchase?.isExpired), isUrgent: false };
                }
                const exp = new Date(purchase.expiresAt).getTime();
                const now = Date.now();
                const diffMs = exp - now;

                if (purchase.isExpired || diffMs <= 0) {
                  return { label: 'Expired', isExpired: true, isUrgent: true };
                }

                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffDays >= 2) {
                  return { label: `${diffDays} days left`, isExpired: false, isUrgent: false };
                }
                if (diffDays === 1) {
                  return { label: '1 day left', isExpired: false, isUrgent: false };
                }
                if (diffHours >= 1) {
                  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                  return { label: `${diffHours}h ${mins}m left`, isExpired: false, isUrgent: true };
                }
                const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
                return { label: `${mins}m left`, isExpired: false, isUrgent: true };
              })();

              const isExpired = countdown.isExpired;

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: '16px',
                    border: isExpired
                      ? '1px solid rgba(239, 68, 68, 0.4)'
                      : countdown.isUrgent
                      ? '1px solid rgba(245, 158, 11, 0.4)'
                      : '1px solid rgba(16, 185, 129, 0.35)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}
                >
                  {/* Poster Thumbnail */}
                  <div
                    onClick={() => isExpired ? openPurchaseModal(item) : onSelectItem(item)}
                    style={{
                      position: 'relative',
                      aspectRatio: '16 / 9',
                      width: '100%',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      backgroundColor: '#12121A'
                    }}
                  >
                    <img
                      src={item.backdropUrl || item.posterUrl}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: isExpired ? 'grayscale(0.7) brightness(0.6)' : 'none'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)'
                      }}
                    />

                    {/* Validity Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        zIndex: 2,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: isExpired
                          ? 'rgba(239, 68, 68, 0.95)'
                          : countdown.isUrgent
                          ? 'rgba(245, 158, 11, 0.95)'
                          : 'rgba(16, 185, 129, 0.92)',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}
                    >
                      <Clock size={12} />
                      <span>{countdown.label}</span>
                    </div>
                  </div>

                  {/* Card Content & Renew CTA */}
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--brand-gold)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                        INDIVIDUAL TITLE • 1080P FHD
                      </div>
                      <h4
                        onClick={() => isExpired ? openPurchaseModal(item) : onSelectItem(item)}
                        style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          margin: 0,
                          cursor: 'pointer',
                          lineHeight: 1.3
                        }}
                      >
                        {item.title}
                      </h4>
                    </div>

                    {isExpired ? (
                      <button
                        onClick={() => openPurchaseModal(item)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--brand-gold)',
                          color: '#0E0E12',
                          border: 'none',
                          fontWeight: 800,
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <RotateCcw size={14} />
                        <span>Renew for 1 Month (₹{item.price || (item.type === 'series' ? 35 : 30)})</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectItem(item)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255, 255, 255, 0.18)',
                          fontWeight: 700,
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Play size={14} fill="#FFFFFF" />
                        <span>Watch Now</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '70px 20px',
              backgroundColor: 'rgba(22, 22, 34, 0.35)',
              borderRadius: '20px',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              maxWidth: '520px',
              margin: '40px auto'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 166, 35, 0.1)',
                border: '1px solid rgba(245, 166, 35, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--brand-gold)'
              }}
            >
              <Film size={30} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              No Purchased Titles Yet
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              Individual pay-per-view movies and series you rent or buy will appear here with instant unrestricted playback.
            </p>
            <button onClick={() => onNavigate('discover')} className="btn btn-primary btn-lg">
              <Compass size={18} />
              <span>Explore Discover</span>
            </button>
          </div>
        )
      )}

      {/* Tab 2: My Passes (Strictly displays Plan Name) */}
      {activeTab === 'passes' && (
        userWatchPasses.activePasses.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}
          >
            {userWatchPasses.activePasses.map((p: any, idx: number) => {
              const passPlanName = formatPassPlanName(p);
              const expDate = p.expires_at || p.expiresAt;
              const remaining = p.remainingHours ? (p.remainingHours > 24 ? `${p.remainingDays} days left` : `${p.remainingHours}h left`) : null;

              return (
                <div
                  key={p.id || idx}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: '16px',
                    border: '1.5px solid rgba(16, 185, 129, 0.5)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          color: '#34D399',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        Active Plan
                      </span>
                      {remaining && (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#34D399' }}>
                          {remaining}
                        </span>
                      )}
                    </div>
                    {/* Strictly displays Plan Name */}
                    <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>
                      {passPlanName}
                    </h4>
                    {expDate && (
                      <div style={{ fontSize: '12.5px', color: '#9CA3AF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} color="#10B981" />
                        <span>Valid until: {new Date(expDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#34D399', fontWeight: 600 }}>
                      <CheckCircle2 size={14} />
                      <span>All-access streaming unlocked across catalog</span>
                    </div>
                    <button
                      onClick={() => onNavigate('discover')}
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        padding: '9px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#34D399',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Stream All Access Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '70px 20px',
              backgroundColor: 'rgba(22, 22, 34, 0.35)',
              borderRadius: '20px',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              maxWidth: '520px',
              margin: '40px auto'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#10B981'
              }}
            >
              <Zap size={30} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              No Active Watch Passes
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              Time-based passes (24H, 3-Day, 7-Day, Monthly VIP) unlock instant unlimited streaming for all movies and web series.
            </p>
            <button onClick={() => openPlanSelector()} className="btn btn-primary btn-lg">
              <Zap size={18} />
              <span>Explore Watch Passes & VIP</span>
            </button>
          </div>
        )
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import {
  Clock,
  Check,
  ArrowRight,
  Zap,
  Film,
  Crown,
  Download,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { ContentItem } from '../types/content';

interface PlansPageProps {
  onNavigate: (tab: string, param?: string) => void;
  onSelectItem?: (item: ContentItem) => void;
}

export interface WatchPassPlanTemplate {
  id: string;
  plan: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D';
  name: string;
  durationLabel: string;
  durationDays: number;
  priceRupees: number;
  maxResolution?: '720p' | '1080p';
  downloadAllowed?: boolean;
  description: string;
  popular?: boolean;
  highlight?: string;
  benefits?: string[];
}

const DEFAULT_WATCH_PASS_PLANS: WatchPassPlanTemplate[] = [
  {
    id: 'PASS_24H',
    plan: 'PASS_24H',
    name: '24 Hours Pass',
    durationLabel: '24 Hours',
    durationDays: 1,
    priceRupees: 19,
    maxResolution: '720p',
    downloadAllowed: false,
    description: 'Unlimited movies & series across the entire catalog for 24 hours.',
    highlight: 'Quick Access',
    benefits: [
      'Unlimited movies & series',
      '24-Hour full catalog access',
      'HD 720p streaming',
      'Streaming only (No downloads)',
      'Instant activation upon approval',
    ]
  },
  {
    id: 'PASS_3D',
    plan: 'PASS_3D',
    name: '3 Days Pass',
    durationLabel: '3 Days',
    durationDays: 3,
    priceRupees: 29,
    maxResolution: '720p',
    downloadAllowed: false,
    description: '72 hours of continuous catalog access with priority playback experience.',
    highlight: 'Weekend Favorite',
    benefits: [
      'Unlimited movies & series',
      '3-Day continuous access',
      'HD 720p streaming',
      'Priority playback experience',
      'Streaming only (No downloads)',
    ]
  },
  {
    id: 'PASS_7D',
    plan: 'PASS_7D',
    name: '7 Days Pass',
    durationLabel: '7 Days',
    durationDays: 7,
    priceRupees: 44,
    maxResolution: '1080p',
    downloadAllowed: true,
    description: 'Full week of unrestricted streaming in 1080p Full HD with offline downloads available.',
    popular: true,
    highlight: 'Recommended',
    benefits: [
      'Unlimited movies & series',
      '7-Day full catalog access',
      'Full HD 1080p cinema streaming',
      'Download Available for offline watch',
      'Continue Watching cross-device sync',
    ]
  },
  {
    id: 'PASS_15D',
    plan: 'PASS_15D',
    name: '15 Days Pass',
    durationLabel: '15 Days',
    durationDays: 15,
    priceRupees: 69,
    maxResolution: '1080p',
    downloadAllowed: true,
    description: 'Half-month premium pass with 1080p Full HD, downloads, and lowest daily rate.',
    highlight: 'Best Value',
    benefits: [
      'Unlimited movies & series',
      '15-Day extended access',
      'Full HD 1080p cinema streaming',
      'Download Available for offline watch',
      'Continue Watching cross-device sync',
      'Lowest daily rate',
    ]
  }
];

export const PlansPage: React.FC<PlansPageProps> = ({ onNavigate }) => {
  const { openWatchPassModal, openSubscriptionModal, subscriptionPlans } = useApp();
  const [watchPassPlans, setWatchPassPlans] = useState<WatchPassPlanTemplate[]>(DEFAULT_WATCH_PASS_PLANS);

  useEffect(() => {
    api.watchPasses.getPlans()
      .then(res => {
        if (res?.plans && Array.isArray(res.plans) && res.plans.length > 0) {
          setWatchPassPlans(res.plans as WatchPassPlanTemplate[]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '80vh', padding: '32px 16px 80px', maxWidth: '1180px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Top Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '44px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(245, 197, 24, 0.12)',
            border: '1px solid rgba(245, 197, 24, 0.3)',
            borderRadius: '999px',
            padding: '6px 16px',
            marginBottom: '14px',
            color: 'var(--brand-gold, #F5C518)',
            fontSize: '12px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}
        >
          <Sparkles size={14} />
          <span>FLOPSHOW Hybrid Access System</span>
        </div>

        <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: 900, color: '#FFFFFF', margin: '0 0 12px', lineHeight: 1.15 }}>
          Choose How You Stream
        </h1>
        <p style={{ fontSize: 'clamp(13px, 2vw, 16px)', color: '#9CA3AF', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
          Whether you want single-title temporary ownership, temporary all-access bingeing, or full catalog VIP membership, FLOPSHOW gives you complete flexibility.
        </p>

        {/* Visual Hierarchy Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginTop: '20px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#D1D5DB'
          }}
        >
          <span style={{ color: '#60A5FA' }}>1. Per Title (1 Month)</span>
          <span style={{ color: '#6B7280' }}>→</span>
          <span style={{ color: 'var(--brand-gold, #F5C518)' }}>2. Watch Pass (Unlimited Catalog)</span>
          <span style={{ color: '#6B7280' }}>→</span>
          <span style={{ color: '#A855F7' }}>3. VIP Subscriptions</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A — PER MOVIE / SERIES (Own a Title for 1 Month)                  */}
      {/* ========================================================================= */}
      <section style={{ marginBottom: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Film size={20} color="#60A5FA" />
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                Own a Title for 1 Month
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
              Purchase any specific blockbuster or web series season and keep it in your personal library for a full 30-day active validity.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          {/* Card A1: Movie Ownership */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '20px',
              border: '1.5px solid rgba(96, 165, 250, 0.35)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Single Movie Ownership
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' }}>
                  1 Month Access
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
                <span style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF' }}>₹30</span>
                <span style={{ fontSize: '13px', color: '#9CA3AF' }}>/ per movie</span>
              </div>

              <p style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.5, marginBottom: '18px' }}>
                Your selected movie remains unlocked in your library for 30 full days with multi-replay and offline download privileges.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#E5E7EB' }}>
                  <Check size={16} color="#60A5FA" />
                  <span><strong>1 Month Validity</strong> (30 days from purchase)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#E5E7EB' }}>
                  <Check size={16} color="#60A5FA" />
                  <span><strong>Full HD 1080p</strong> crisp playback</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#E5E7EB' }}>
                  <Download size={16} color="#60A5FA" />
                  <span><strong>Download Available</strong> for offline watching</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#E5E7EB' }}>
                  <Check size={16} color="#60A5FA" />
                  <span>Personal Library listing & resume sync</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('discover')}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(96, 165, 250, 0.15)',
                border: '1.5px solid #60A5FA',
                color: '#60A5FA',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>Browse Movies to Own</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Card A2: Series Ownership */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '20px',
              border: '1.5px solid rgba(147, 197, 253, 0.35)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Complete Series Season
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(147, 197, 253, 0.15)', color: '#93C5FD' }}>
                  1 Month Access
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
                <span style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF' }}>₹35</span>
                <span style={{ fontSize: '13px', color: '#9CA3AF' }}>/ full series</span>
              </div>

              <p style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.5, marginBottom: '18px' }}>
                Unlocks the complete web series and all current episodes for a full month in your personal library.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#E5E7EB' }}>
                  <Check size={16} color="#93C5FD" />
                  <span><strong>1 Month Validity</strong> (Entire series & episodes)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#93C5FD' }}>
                  <Check size={16} color="#93C5FD" />
                  <span><strong>Full HD 1080p</strong> on all episodes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#93C5FD' }}>
                  <Download size={16} color="#93C5FD" />
                  <span><strong>Download Available</strong> for every episode</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#93C5FD' }}>
                  <Check size={16} color="#93C5FD" />
                  <span>Episode progress & autoplay tracking</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('discover')}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(147, 197, 253, 0.15)',
                border: '1.5px solid #93C5FD',
                color: '#93C5FD',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>Browse Web Series to Own</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION B — WATCH PASS (Catalog-Wide Temporary Access)                    */}
      {/* ========================================================================= */}
      <section style={{ marginBottom: '56px' }}>
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Zap size={20} color="var(--brand-gold, #F5C518)" />
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
              FLOPSHOW Watch Pass
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
            Catalog-wide temporary access passes. Stream unlimited titles across the entire catalog during your pass window. No content-count limit!
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {watchPassPlans.map(plan => {
            const isRecommended = plan.popular;
            const isBestValue = plan.highlight === 'Best Value';

            return (
              <div
                key={plan.id}
                style={{
                  backgroundColor: 'var(--bg-surface, #12121A)',
                  borderRadius: '20px',
                  border: isRecommended
                    ? '2px solid var(--brand-gold, #F5C518)'
                    : isBestValue
                    ? '2px solid #34D399'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  boxShadow: isRecommended
                    ? '0 12px 30px rgba(245, 197, 24, 0.15)'
                    : isBestValue
                    ? '0 12px 30px rgba(52, 211, 153, 0.12)'
                    : 'none'
                }}
              >
                {/* Top Badge */}
                {isRecommended && (
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
                    Recommended
                  </div>
                )}
                {isBestValue && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#34D399',
                      color: '#000000',
                      fontSize: '11px',
                      fontWeight: 900,
                      padding: '3px 12px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em'
                    }}
                  >
                    Best Value
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {plan.name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600 }}>
                      {plan.durationLabel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF' }}>
                      ₹{plan.priceRupees}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      / {plan.durationLabel.toLowerCase()}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: '#D1D5DB', lineHeight: 1.5, marginBottom: '18px' }}>
                    {plan.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                      <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                      <span>Unlimited movies & web series</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                      <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                      <span>
                        Quality: <strong>{plan.maxResolution || (plan.durationDays >= 7 ? '1080p Full HD' : '720p HD')}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: plan.downloadAllowed ? '#34D399' : '#9CA3AF' }}>
                      {plan.downloadAllowed ? (
                        <>
                          <Download size={15} color="#34D399" />
                          <span><strong>Download Available</strong> for offline play</span>
                        </>
                      ) : (
                        <>
                          <Clock size={15} color="#9CA3AF" />
                          <span>Streaming only (No downloads)</span>
                        </>
                      )}
                    </div>

                    {plan.durationDays === 3 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                        <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                        <span>Priority playback stream experience</span>
                      </div>
                    )}

                    {plan.durationDays >= 7 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                        <Smartphone size={15} color="var(--brand-gold, #F5C518)" />
                        <span>Continue Watching cross-device sync</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openWatchPassModal(null, plan.plan as any)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: isRecommended ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.08)',
                    color: isRecommended ? '#000000' : '#FFFFFF',
                    border: isRecommended ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>Get {plan.name}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION C — SUBSCRIPTION PLANS (Full VIP OTT Catalog Access)               */}
      {/* ========================================================================= */}
      <section>
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Crown size={20} color="#A855F7" />
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
              VIP Subscriptions
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
            Catalog-wide VIP membership. Stream all content with zero per-content charges and premium privileges.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {subscriptionPlans.map(sub => {
            const isMonthly = sub.id === 'MONTHLY';
            return (
              <div
                key={sub.id}
                style={{
                  backgroundColor: 'var(--bg-surface, #12121A)',
                  borderRadius: '20px',
                  border: isMonthly
                    ? '2px solid #A855F7'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  boxShadow: isMonthly ? '0 12px 30px rgba(168, 85, 247, 0.15)' : 'none'
                }}
              >
                {isMonthly && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#A855F7',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 900,
                      padding: '3px 12px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em'
                    }}
                  >
                    VIP Choice
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#A855F7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {sub.name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600 }}>
                      {sub.durationDays} Days
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF' }}>
                      ₹{sub.priceRupees}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      / {sub.id === 'WEEKLY' ? 'week' : sub.id === 'MONTHLY' ? 'month' : 'year'}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: '#D1D5DB', lineHeight: 1.5, marginBottom: '18px' }}>
                    {sub.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                      <CheckCircle2 size={15} color="#A855F7" />
                      <span>Full HD & 4K Cinema Streaming</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                      <CheckCircle2 size={15} color="#A855F7" />
                      <span>Unlimited movies & web series</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                      <CheckCircle2 size={15} color="#A855F7" />
                      <span>Offline downloads available</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                      <CheckCircle2 size={15} color="#A855F7" />
                      <span>Zero per-content charges</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openSubscriptionModal(sub.id, 'pay')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: isMonthly ? '#A855F7' : 'rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    border: isMonthly ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>Subscribe ({sub.name})</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Safety Guarantee */}
      <div
        style={{
          marginTop: '48px',
          padding: '16px 20px',
          borderRadius: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}
      >
        <ShieldCheck size={26} color="var(--brand-gold, #F5C518)" style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF', lineHeight: 1.5 }}>
          All payments are protected through FLOPSHOW's verified manual UPI gateway. Submit your 12-digit UTR transaction ID after payment for fast admin verification. Access activates automatically once verified.
        </p>
      </div>
    </div>
  );
};

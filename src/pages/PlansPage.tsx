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
  Smartphone,
  Tv,
  Tablet
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
  maxDevices?: number;
  allowedDevicesLabel?: string;
  allowedDeviceTypes?: string[];
  description?: string;
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
    maxDevices: 1,
    allowedDevicesLabel: '1 Device',
    allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'],
    description: '',
    highlight: 'Quick Access',
    benefits: [
      '24 Hours Access',
      'HD 720p',
      '1 Device',
      'Unlimited eligible catalog streaming',
      'No Download',
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
    maxDevices: 1,
    allowedDevicesLabel: '1 Device',
    allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'],
    description: '',
    highlight: 'Weekend Favorite',
    benefits: [
      '3 Days Access',
      'HD 720p',
      '1 Device',
      'No Download',
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
    maxDevices: 2,
    allowedDevicesLabel: '2 Devices (1 Tablet + 1 TV)',
    allowedDeviceTypes: ['Tablet', 'TV'],
    popular: true,
    highlight: 'Recommended',
    benefits: [
      '7 Days Access',
      'Full HD 1080p',
      'Download Available',
      '2 Devices',
      '1 Tablet + 1 TV',
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
    maxDevices: 3,
    allowedDevicesLabel: '3 Devices (2 Tablets + 1 TV)',
    allowedDeviceTypes: ['Tablet', 'Tablet', 'TV'],
    highlight: 'Best Value',
    benefits: [
      '15 Days Access',
      'Full HD 1080p',
      'Download Available',
      '3 Devices',
      '2 Tablets + 1 TV',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFFFFF' }}>
                  <Check size={16} color="var(--brand-gold, #F5C518)" />
                  <span><strong>1 Month Validity</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFFFFF' }}>
                  <Check size={16} color="var(--brand-gold, #F5C518)" />
                  <span><strong>Full HD 1080p</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFFFFF' }}>
                  <Download size={16} color="var(--brand-gold, #F5C518)" />
                  <span><strong>Download Available</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('discover')}
              className="btn-browse-own"
            >
              <span>Browse Movie/Series to Own</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Card A2: Series Ownership */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #12121A)',
              borderRadius: '20px',
              border: '1.5px solid rgba(245, 166, 35, 0.35)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Complete Series Season
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(245, 166, 35, 0.15)', color: 'var(--brand-gold, #F5C518)' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFFFFF' }}>
                  <Check size={16} color="var(--brand-gold, #F5C518)" />
                  <span><strong>1 Month Validity</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFFFFF' }}>
                  <Check size={16} color="var(--brand-gold, #F5C518)" />
                  <span><strong>Full HD 1080p</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFFFFF' }}>
                  <Download size={16} color="var(--brand-gold, #F5C518)" />
                  <span><strong>Download Available</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FFFFFF' }}>
                  <Check size={16} color="var(--brand-gold, #F5C518)" />
                  <span>Full season / all episodes</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('discover')}
              className="btn-browse-own"
            >
              <span>Browse Movie/Series to Own</span>
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

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '18px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF' }}>
                      ₹{plan.priceRupees}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      / {plan.durationLabel.toLowerCase()}
                    </span>
                  </div>

                  {/* Individual feature list strictly adhering to requested specifications */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    {plan.plan === 'PASS_24H' && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>24 Hours Access</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>HD 720p</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <Smartphone size={15} color="var(--brand-gold, #F5C518)" />
                          <span>1 Device</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>Unlimited eligible catalog streaming</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9CA3AF' }}>
                          <Clock size={15} color="#9CA3AF" />
                          <span>No Download</span>
                        </div>
                      </>
                    )}

                    {plan.plan === 'PASS_3D' && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>3 Days Access</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>HD 720p</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <Smartphone size={15} color="var(--brand-gold, #F5C518)" />
                          <span>1 Device</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9CA3AF' }}>
                          <Clock size={15} color="#9CA3AF" />
                          <span>No Download</span>
                        </div>
                      </>
                    )}

                    {plan.plan === 'PASS_7D' && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>7 Days Access</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>Full HD 1080p</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#34D399' }}>
                          <Download size={15} color="#34D399" />
                          <span><strong>Download Available</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <Tablet size={15} color="var(--brand-gold, #F5C518)" />
                          <span>2 Devices</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--brand-gold, #F5C518)' }}>
                          <Tv size={15} color="var(--brand-gold, #F5C518)" />
                          <span>1 Tablet + 1 TV</span>
                        </div>
                      </>
                    )}

                    {plan.plan === 'PASS_15D' && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>15 Days Access</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />
                          <span>Full HD 1080p</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#34D399' }}>
                          <Download size={15} color="#34D399" />
                          <span><strong>Download Available</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                          <Tablet size={15} color="var(--brand-gold, #F5C518)" />
                          <span>3 Devices</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--brand-gold, #F5C518)' }}>
                          <Tv size={15} color="var(--brand-gold, #F5C518)" />
                          <span>2 Tablets + 1 TV</span>
                        </div>
                      </>
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
              VIP Subscription Plans
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
            Catalog-wide VIP membership. Stream all movies and series with zero per-content charges and premium full-season access.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px' }}>
          {subscriptionPlans.filter(sub => sub.id !== 'WEEKLY').map(sub => {
            const isMonthly = sub.id === 'MONTHLY';
            const is3Months = sub.id === '3_MONTHS';
            const isYearly = sub.id === 'YEARLY';

            const badgeText = is3Months ? 'QUARTERLY VALUE' : isYearly ? 'BEST VALUE • SAVE 58%' : null;
            const badgeBg = is3Months ? 'var(--brand-gold, #F5C518)' : '#A855F7';
            const badgeColor = is3Months ? '#000000' : '#FFFFFF';

            const durationSubtitle = isMonthly
              ? '1 Month (30 Days) • Standard billing'
              : is3Months
              ? '3 Months (90 Days) • Only ₹63/mo'
              : '12 Months (365 Days) • Only ₹37.4/mo';

            const durationUnit = isMonthly ? 'month' : is3Months ? '3 months' : 'full year';

            return (
              <div
                key={sub.id}
                style={{
                  backgroundColor: 'var(--bg-surface, #12121A)',
                  borderRadius: '20px',
                  border: is3Months
                    ? '2px solid var(--brand-gold, #F5C518)'
                    : isYearly
                    ? '2px solid #A855F7'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  boxShadow: is3Months
                    ? '0 12px 30px rgba(245, 197, 24, 0.15)'
                    : isYearly
                    ? '0 12px 30px rgba(168, 85, 247, 0.15)'
                    : 'none'
                }}
              >
                {badgeText && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: badgeBg,
                      color: badgeColor,
                      fontSize: '11px',
                      fontWeight: 900,
                      padding: '3px 12px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {badgeText}
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: is3Months ? 'var(--brand-gold, #F5C518)' : '#A855F7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {sub.name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600 }}>
                      {sub.durationDays} Days
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF' }}>
                      ₹{sub.priceRupees}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      / {durationUnit}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: is3Months ? 'var(--brand-gold, #F5C518)' : isYearly ? '#C084FC' : '#9CA3AF', fontWeight: 600, marginBottom: '18px' }}>
                    {durationSubtitle}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                      <CheckCircle2 size={15} color={is3Months ? 'var(--brand-gold, #F5C518)' : '#A855F7'} />
                      <span>Full HD 1080p & 4K Cinema Streaming</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                      <CheckCircle2 size={15} color={is3Months ? 'var(--brand-gold, #F5C518)' : '#A855F7'} />
                      <span>Unlimited movies & web series catalog</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                      <Download size={15} color="#34D399" />
                      <span>Offline downloads available</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FFFFFF' }}>
                      <CheckCircle2 size={15} color={is3Months ? 'var(--brand-gold, #F5C518)' : '#A855F7'} />
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
                    backgroundColor: is3Months ? 'var(--brand-gold, #F5C518)' : isYearly ? '#A855F7' : 'rgba(255, 255, 255, 0.08)',
                    color: is3Months ? '#000000' : '#FFFFFF',
                    border: is3Months || isYearly ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
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

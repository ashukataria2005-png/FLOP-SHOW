import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Clock,
  Check,
  ArrowRight,
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';
import { ContentItem } from '../types/content';

interface PlansPageProps {
  onNavigate: (tab: string, param?: string) => void;
  onSelectItem?: (item: ContentItem) => void;
}

export interface WatchPassPlanTemplate {
  id: string;
  plan: 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_30D';
  name: string;
  durationLabel: string;
  durationDays: number;
  priceRupees: number;
  description: string;
  popular?: boolean;
  highlight?: string;
}

const DEFAULT_PLANS: WatchPassPlanTemplate[] = [
  {
    id: 'PASS_24H',
    plan: 'PASS_24H',
    name: '24 Hours Pass',
    durationLabel: '24 Hours',
    durationDays: 1,
    priceRupees: 29,
    description: 'Perfect for movie night. 24 hours of instant playback on any single chosen title.',
    highlight: 'Quick Access'
  },
  {
    id: 'PASS_3D',
    plan: 'PASS_3D',
    name: '3 Days Pass',
    durationLabel: '3 Days',
    durationDays: 3,
    priceRupees: 49,
    description: 'Ideal for weekend bingeing. 72 hours of uninterrupted access to your selected movie or web series.',
    highlight: 'Weekend Favorite'
  },
  {
    id: 'PASS_7D',
    plan: 'PASS_7D',
    name: '7 Days Pass',
    durationLabel: '7 Days',
    durationDays: 7,
    priceRupees: 79,
    description: 'Full week of playback. Watch at your own pace across all your devices with HD quality.',
    popular: true,
    highlight: 'Most Popular'
  },
  {
    id: 'PASS_30D',
    plan: 'PASS_30D',
    name: '30 Days Pass',
    durationLabel: '30 Days',
    durationDays: 30,
    priceRupees: 149,
    description: 'Extended monthly title pass. Re-watch and finish complete multi-episode web series anytime.',
    highlight: 'Best Value'
  }
];

export const PlansPage: React.FC<PlansPageProps> = ({ onNavigate }) => {
  const [plans, setPlans] = useState<WatchPassPlanTemplate[]>(DEFAULT_PLANS);
  const [showPickerNotice, setShowPickerNotice] = useState<string | null>(null);

  useEffect(() => {
    // Fetch dynamic pass pricing if configured in backend
    api.watchPasses.getPlans()
      .then(res => {
        if (res?.plans && Array.isArray(res.plans) && res.plans.length > 0) {
          setPlans(res.plans);
        }
      })
      .catch(() => {
        // Fallback to default plans
      });
  }, []);

  const handleChoosePass = (plan: WatchPassPlanTemplate) => {
    setShowPickerNotice(plan.durationLabel);
  };

  return (
    <div style={{ minHeight: '80vh', padding: '36px 20px 80px', maxWidth: '1180px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(245, 197, 24, 0.12)',
            border: '1px solid rgba(245, 197, 24, 0.3)',
            color: 'var(--brand-gold, #F5C518)',
            fontSize: '12px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '16px'
          }}
        >
          <Zap size={14} />
          <span>FLOPSHOW Watch Passes</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(28px, 4.5vw, 44px)',
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
            lineHeight: 1.15
          }}
        >
          Temporary Access To What You Want To Watch
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: '#9CA3AF',
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: 1.6
          }}
        >
          Choose a flexible Watch Pass duration for your chosen movie or web series.
          Pay once using UPI, watch with zero recurring commitments, and enjoy high-speed streaming.
        </p>
      </div>

      {/* Notice Banner when user clicks Choose Pass */}
      {showPickerNotice && (
        <div
          style={{
            backgroundColor: 'rgba(245, 197, 24, 0.12)',
            border: '1.5px solid var(--brand-gold, #F5C518)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '720px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 197, 24, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)',
                flexShrink: 0
              }}
            >
              <Info size={22} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
                Selected Plan: {showPickerNotice} Watch Pass
              </div>
              <div style={{ fontSize: '13px', color: '#D1D5DB' }}>
                Select a movie or series first to use this Watch Pass. Once on the title page, click "Get Watch Pass" to complete your activation!
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onNavigate('discover')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                color: '#0E0E12',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Explore Discover</span>
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => setShowPickerNotice(null)}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Grid of Watch Pass Cards */}
      <div
        className="plans-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '50px'
        }}
      >
        {plans.map(plan => {
          const isPop = Boolean(plan.popular);

          return (
            <div
              key={plan.id}
              style={{
                backgroundColor: 'var(--bg-surface, #12121A)',
                borderRadius: '18px',
                border: isPop ? '2px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '28px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                boxShadow: isPop ? '0 12px 30px rgba(245, 197, 24, 0.15)' : '0 8px 20px rgba(0, 0, 0, 0.3)',
                transition: 'transform 0.2s ease, border-color 0.2s ease'
              }}
            >
              {/* Highlight Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '18px',
                  padding: '3px 12px',
                  borderRadius: '999px',
                  backgroundColor: isPop ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.12)',
                  color: isPop ? '#0E0E12' : '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}
              >
                {plan.highlight || plan.durationLabel}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock size={16} color="var(--brand-gold, #F5C518)" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', textTransform: 'uppercase' }}>
                    {plan.durationLabel}
                  </span>
                </div>

                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 14px' }}>
                  {plan.name}
                </h3>

                {/* Price Display */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
                    ₹{plan.priceRupees}
                  </span>
                  <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
                    / title
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6, marginBottom: '22px' }}>
                  {plan.description}
                </p>

                {/* Feature Bullet Points */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#D1D5DB' }}>
                    <Check size={15} color="#10B981" />
                    <span>Instant UPI + UTR activation</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#D1D5DB' }}>
                    <Check size={15} color="#10B981" />
                    <span>Full HD streaming across all devices</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#D1D5DB' }}>
                    <Check size={15} color="#10B981" />
                    <span>Episodes included for series</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#D1D5DB' }}>
                    <Check size={15} color="#10B981" />
                    <span>Zero recurring auto-debit</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleChoosePass(plan)}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  backgroundColor: isPop ? 'var(--brand-gold, #F5C518)' : 'rgba(255, 255, 255, 0.08)',
                  color: isPop ? '#0E0E12' : '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '14px',
                  border: isPop ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Choose {plan.durationLabel} Pass</span>
                <ArrowRight size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Frequently Asked Questions / How Watch Pass Works */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '32px 28px'
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HelpCircle size={20} color="var(--brand-gold, #F5C518)" />
          <span>How FLOPSHOW Watch Passes Work</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px' }}>
              1. Title-Specific Access
            </h4>
            <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>
              A Watch Pass grants temporary playback access to the specific title you choose. It does not unlock unrelated catalog titles, keeping it ultra-affordable.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px' }}>
              2. Independent From Subscriptions & Ownership
            </h4>
            <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>
              Purchasing a Watch Pass will never alter or overwrite your existing permanent movie purchases or full platform subscription. All access mechanisms work harmoniously.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px' }}>
              3. Automatic Expiry Control
            </h4>
            <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>
              Your pass timer starts upon administrator verification and stops automatically when the duration completes. You are never auto-charged again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

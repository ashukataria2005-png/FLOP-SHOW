import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { ContentItem } from '../../types/content';
import {
  Zap,
  Crown,
  Film,
  Save,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface AdminPlansPricingPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminPlansPricingPage: React.FC<AdminPlansPricingPageProps> = () => {
  const { showToast, refreshMonetizationConfig } = useApp();

  // Loading States
  const [loading, setLoading] = useState(true);
  const [savingPasses, setSavingPasses] = useState(false);
  const [savingVip, setSavingVip] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);

  // Section A: Watch Pass Prices (in ₹)
  const [price24h, setPrice24h] = useState<number>(19);
  const [price3d, setPrice3d] = useState<number>(29);
  const [price7d, setPrice7d] = useState<number>(44);
  const [price15d, setPrice15d] = useState<number>(69);

  // Section B: VIP Subscription Plan Prices (in ₹)
  const [monthlyVipPrice, setMonthlyVipPrice] = useState<number>(89);
  const [threeMonthsVipPrice, setThreeMonthsVipPrice] = useState<number>(189);
  const [yearlyVipPrice, setYearlyVipPrice] = useState<number>(449);

  // Section C: Global Defaults for Single Title Access (in ₹)
  const [defaultMoviePrice, setDefaultMoviePrice] = useState<number>(30);
  const [defaultSeriesPrice, setDefaultSeriesPrice] = useState<number>(35);

  // Catalog & Custom Overrides
  const [catalog, setCatalog] = useState<ContentItem[]>([]);
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [overridePriceInput, setOverridePriceInput] = useState<string>('');

  const loadAllPricingData = async () => {
    try {
      setLoading(true);
      const [watchPassRes, subRes, monRes, catalogRes] = await Promise.all([
        api.watchPasses.getPlans().catch(() => null),
        api.subscriptions.getPlans().catch(() => null),
        api.monetization.getAdminConfig().catch(() => null),
        api.content.list({ limit: 1000 }).catch(() => [])
      ]);

      // 1. Populate Watch Pass prices
      if (watchPassRes?.plans) {
        for (const p of watchPassRes.plans) {
          if (p.plan === 'PASS_24H') setPrice24h(p.priceRupees);
          if (p.plan === 'PASS_3D') setPrice3d(p.priceRupees);
          if (p.plan === 'PASS_7D') setPrice7d(p.priceRupees);
          if (p.plan === 'PASS_15D') setPrice15d(p.priceRupees);
        }
      }

      // 2. Populate VIP prices
      if (subRes?.plans) {
        for (const p of subRes.plans) {
          if (p.id === 'MONTHLY') setMonthlyVipPrice(p.priceRupees);
          if (p.id === '3_MONTHS') setThreeMonthsVipPrice(p.priceRupees);
          if (p.id === 'YEARLY') setYearlyVipPrice(p.priceRupees);
        }
      }

      // 3. Populate Global defaults
      if (monRes?.config) {
        if (monRes.config.defaultMoviePrice) setDefaultMoviePrice(monRes.config.defaultMoviePrice);
        if (monRes.config.defaultSeriesPrice) setDefaultSeriesPrice(monRes.config.defaultSeriesPrice);
        if (monRes.config.monthlyPrice) setMonthlyVipPrice(monRes.config.monthlyPrice);
        if (monRes.config.threeMonthsPrice) setThreeMonthsVipPrice(monRes.config.threeMonthsPrice);
        if (monRes.config.yearlyPrice) setYearlyVipPrice(monRes.config.yearlyPrice);
      }

      // 4. Populate catalog
      if (Array.isArray(catalogRes)) {
        setCatalog(catalogRes);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load pricing data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPricingData();
  }, []);

  // Save Watch Pass Prices
  const handleSaveWatchPassPrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPasses(true);
    try {
      const res = await api.watchPasses.adminUpdatePlans({
        price24h: Number(price24h),
        price3d: Number(price3d),
        price7d: Number(price7d),
        price15d: Number(price15d)
      });
      if (res?.success) {
        showToast('Watch Pass prices updated successfully!', 'success');
        refreshMonetizationConfig();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update Watch Pass prices.', 'error');
    } finally {
      setSavingPasses(false);
    }
  };

  // Save VIP Subscription Plan Prices
  const handleSaveVipPrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVip(true);
    try {
      const res = await api.monetization.updateAdminConfig({
        monthlyPrice: Number(monthlyVipPrice),
        threeMonthsPrice: Number(threeMonthsVipPrice),
        yearlyPrice: Number(yearlyVipPrice)
      });
      if (res?.success) {
        showToast('VIP Plan prices updated successfully!', 'success');
        refreshMonetizationConfig();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update VIP Plan prices.', 'error');
    } finally {
      setSavingVip(false);
    }
  };

  // Save Global Single Title Default Prices
  const handleSaveDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDefaults(true);
    try {
      const res = await api.monetization.updateAdminConfig({
        defaultMoviePrice: Number(defaultMoviePrice),
        defaultSeriesPrice: Number(defaultSeriesPrice)
      });
      if (res?.success) {
        showToast('Default Single Title prices updated successfully!', 'success');
        refreshMonetizationConfig();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update default prices.', 'error');
    } finally {
      setSavingDefaults(false);
    }
  };

  // Apply or Update Custom Title Price Override
  const handleApplyCustomOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContent) {
      showToast('Please select a movie or series from the catalog first.', 'error');
      return;
    }

    const priceNum = Number(overridePriceInput);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Please enter a valid price greater than ₹0.', 'error');
      return;
    }

    setSavingOverride(true);
    try {
      await api.admin.updatePrice(selectedContent.id, priceNum, priceNum);
      showToast(`Custom price ₹${priceNum} applied to "${selectedContent.title}"!`, 'success');
      setSelectedContent(null);
      setOverridePriceInput('');
      setSearchCatalogQuery('');
      // Reload catalog to refresh overrides
      const items = await api.content.list({ limit: 1000 });
      setCatalog(items);
      refreshMonetizationConfig();
    } catch (err: any) {
      showToast(err.message || 'Failed to set custom price.', 'error');
    } finally {
      setSavingOverride(false);
    }
  };

  // Remove Custom Override (Revert to System Default)
  const handleRemoveOverride = async (item: ContentItem) => {
    const defaultBasePrice = item.type === 'series' ? defaultSeriesPrice : defaultMoviePrice;
    try {
      await api.admin.updatePrice(item.id, defaultBasePrice, null);
      showToast(`Reset "${item.title}" to default price ₹${defaultBasePrice}.`, 'success');
      const items = await api.content.list({ limit: 1000 });
      setCatalog(items);
      refreshMonetizationConfig();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove override.', 'error');
    }
  };

  // Existing Overrides Filtered
  const existingOverrides = catalog.filter(
    item => item.customPrice !== null && item.customPrice !== undefined && item.customPrice > 0
  );

  // Search Results for Title Selector
  const searchResults = searchCatalogQuery.trim()
    ? catalog
        .filter(c => c.title.toLowerCase().includes(searchCatalogQuery.toLowerCase()))
        .slice(0, 8)
    : [];

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '12px',
          color: '#9CA3AF'
        }}
      >
        <Loader2 size={24} className="animate-spin" color="var(--brand-gold, #F5C518)" />
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading Plans & Pricing Configuration...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--brand-gold, #F5C518)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(245, 197, 24, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(245, 197, 24, 0.25)'
              }}
            >
              PRICING CONTROLS
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
            Plans & Pricing Management
          </h1>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>
            Configure live customer pricing across Watch Passes, VIP Subscriptions, and Single Title Access with custom overrides.
          </p>
        </div>

        <button
          onClick={loadAllPricingData}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} />
          <span>Refresh Prices</span>
        </button>
      </div>

      {/* SECTION A: WATCH PASS PLANS PRICING */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '16px',
          border: '1px solid rgba(245, 197, 24, 0.25)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)'
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Section A: Watch Pass Plans Pricing
              </h2>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                Set catalog-wide temporary access prices for all 4 Watch Pass duration tiers.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveWatchPassPrices}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}
          >
            {/* 24 Hours */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>24 Hours Pass</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(245, 197, 24, 0.15)', color: 'var(--brand-gold, #F5C518)' }}>
                  1 Day • 720p
                </span>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Price in Rupees (₹)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--brand-gold, #F5C518)', fontWeight: 800, fontSize: '14px' }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    value={price24h}
                    onChange={e => setPrice24h(Math.max(1, Number(e.target.value)))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 3 Days */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>3 Days Pass</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(245, 197, 24, 0.15)', color: 'var(--brand-gold, #F5C518)' }}>
                  3 Days • 720p
                </span>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Price in Rupees (₹)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--brand-gold, #F5C518)', fontWeight: 800, fontSize: '14px' }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    value={price3d}
                    onChange={e => setPrice3d(Math.max(1, Number(e.target.value)))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 7 Days */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(245, 197, 24, 0.3)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>7 Days Pass</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--brand-gold, #F5C518)', color: '#000000' }}>
                  RECOMMENDED
                </span>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Price in Rupees (₹)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--brand-gold, #F5C518)', fontWeight: 800, fontSize: '14px' }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    value={price7d}
                    onChange={e => setPrice7d(Math.max(1, Number(e.target.value)))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 15 Days */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>15 Days Pass</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(245, 197, 24, 0.15)', color: 'var(--brand-gold, #F5C518)' }}>
                  15 Days • 1080p
                </span>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Price in Rupees (₹)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--brand-gold, #F5C518)', fontWeight: 800, fontSize: '14px' }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    value={price15d}
                    onChange={e => setPrice15d(Math.max(1, Number(e.target.value)))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPasses}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              borderRadius: '10px',
              backgroundColor: 'var(--brand-gold, #F5C518)',
              color: '#000000',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: savingPasses ? 'not-allowed' : 'pointer',
              opacity: savingPasses ? 0.7 : 1
            }}
          >
            {savingPasses ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{savingPasses ? 'Saving Watch Pass Prices...' : 'Save Watch Pass Prices'}</span>
          </button>
        </form>
      </div>

      {/* SECTION B: VIP SUBSCRIPTION PLANS PRICING */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '16px',
          border: '1px solid rgba(192, 132, 252, 0.25)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(192, 132, 252, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C084FC'
            }}
          >
            <Crown size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Section B: VIP Subscription Plans Pricing
            </h2>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
              Set prices for all 3 VIP membership subscription tiers (Monthly, 3 Months, Yearly).
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveVipPrices}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}
          >
            {/* Monthly */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>VIP Monthly</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(192, 132, 252, 0.15)', color: '#C084FC' }}>
                  30 Days Validity
                </span>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Price in Rupees (₹)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: '#C084FC', fontWeight: 800, fontSize: '14px' }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    value={monthlyVipPrice}
                    onChange={e => setMonthlyVipPrice(Math.max(1, Number(e.target.value)))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 3 Months */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(192, 132, 252, 0.35)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>VIP 3 Months</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#C084FC', color: '#000000' }}>
                  MOST POPULAR
                </span>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Price in Rupees (₹)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: '#C084FC', fontWeight: 800, fontSize: '14px' }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    value={threeMonthsVipPrice}
                    onChange={e => setThreeMonthsVipPrice(Math.max(1, Number(e.target.value)))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Yearly */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>VIP 12 Months (Yearly)</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(52, 211, 153, 0.15)', color: '#34D399' }}>
                  BEST VALUE
                </span>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Price in Rupees (₹)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: '#C084FC', fontWeight: 800, fontSize: '14px' }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    value={yearlyVipPrice}
                    onChange={e => setYearlyVipPrice(Math.max(1, Number(e.target.value)))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingVip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              borderRadius: '10px',
              backgroundColor: '#C084FC',
              color: '#000000',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: savingVip ? 'not-allowed' : 'pointer',
              opacity: savingVip ? 0.7 : 1
            }}
          >
            {savingVip ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{savingVip ? 'Saving VIP Plan Prices...' : 'Save VIP Plan Prices'}</span>
          </button>
        </form>
      </div>

      {/* SECTION C: PER-MOVIE / SERIES ACCESS PRICING + CUSTOM OVERRIDES */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #12121A)',
          borderRadius: '16px',
          border: '1px solid rgba(96, 165, 250, 0.25)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(96, 165, 250, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60A5FA'
            }}
          >
            <Film size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Section C: Single Title Access Pricing & Custom Overrides
            </h2>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
              Set global standard single-title pricing (30 days validity) and configure custom price overrides for specific titles.
            </p>
          </div>
        </div>

        {/* 1. Global Defaults */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '20px'
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 14px' }}>
            1. Global Default Standard Pricing
          </h3>
          <form onSubmit={handleSaveDefaults}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              {/* Default Movie */}
              <div>
                <label style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
                  Standard Movie 30-Day Access Price
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: '#60A5FA', fontWeight: 800 }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    value={defaultMoviePrice}
                    onChange={e => setDefaultMoviePrice(Math.max(1, Number(e.target.value)))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Default Series */}
              <div>
                <label style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
                  Standard Webseries 30-Day Access Price
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: '#60A5FA', fontWeight: 800 }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    value={defaultSeriesPrice}
                    onChange={e => setDefaultSeriesPrice(Math.max(1, Number(e.target.value)))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingDefaults}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#60A5FA',
                color: '#000000',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: savingDefaults ? 'not-allowed' : 'pointer',
                opacity: savingDefaults ? 0.7 : 1
              }}
            >
              {savingDefaults ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{savingDefaults ? 'Saving Defaults...' : 'Save Global Defaults'}</span>
            </button>
          </form>
        </div>

        {/* 2. Custom Title Override Setter */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '20px'
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
            2. Set Custom Price Override for a Specific Title
          </h3>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 16px' }}>
            Search for a blockbuster movie or premium series to assign an individual custom price (e.g. ₹49 instead of default ₹35).
          </p>

          {/* Search Catalog Input */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="text"
                placeholder="Search catalog titles by name..."
                value={searchCatalogQuery}
                onChange={e => setSearchCatalogQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Dropdown Results */}
            {searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#161622',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
                  zIndex: 20,
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}
              >
                {searchResults.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedContent(c);
                      setOverridePriceInput(String(c.customPrice || c.price || (c.type === 'series' ? defaultSeriesPrice : defaultMoviePrice)));
                      setSearchCatalogQuery('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <img
                      src={c.posterUrl}
                      alt={c.title}
                      style={{ width: '30px', height: '42px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{c.title}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                        {c.type.toUpperCase()} • Current Price: ₹{c.price}
                        {c.customPrice ? ` (Custom Override: ₹${c.customPrice})` : ' (Default Base Price)'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Content Card & Price Override Form */}
          {selectedContent && (
            <form onSubmit={handleApplyCustomOverride}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(96, 165, 250, 0.08)',
                  border: '1px solid rgba(96, 165, 250, 0.25)',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img
                    src={selectedContent.posterUrl}
                    alt={selectedContent.title}
                    style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                        {selectedContent.title}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: selectedContent.type === 'series' ? 'rgba(192, 132, 252, 0.2)' : 'rgba(96, 165, 250, 0.2)',
                          color: selectedContent.type === 'series' ? '#C084FC' : '#60A5FA'
                        }}
                      >
                        {selectedContent.type.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                      System Default: ₹{selectedContent.type === 'series' ? defaultSeriesPrice : defaultMoviePrice}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '10px', color: 'var(--brand-gold, #F5C518)', fontWeight: 800 }}>₹</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Custom ₹"
                      value={overridePriceInput}
                      onChange={e => setOverridePriceInput(e.target.value)}
                      required
                      style={{
                        width: '120px',
                        padding: '8px 10px 8px 24px',
                        borderRadius: '8px',
                        backgroundColor: '#0A0A10',
                        border: '1.5px solid var(--brand-gold, #F5C518)',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: 800,
                        outline: 'none'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingOverride}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--brand-gold, #F5C518)',
                      color: '#000000',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: savingOverride ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {savingOverride ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>{savingOverride ? 'Saving...' : 'Apply Price'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedContent(null)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* 3. Existing Custom Overrides List */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              3. Active Custom Price Overrides ({existingOverrides.length})
            </h3>
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
              Overrides take precedence over the global default price
            </span>
          </div>

          {existingOverrides.length === 0 ? (
            <div
              style={{
                padding: '28px',
                textAlign: 'center',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                color: '#9CA3AF',
                fontSize: '13px'
              }}
            >
              No individual title price overrides are currently active. All catalog movies and series use the global defaults (₹{defaultMoviePrice} / ₹{defaultSeriesPrice}). Use the search box above to add a custom override.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
              {existingOverrides.map(item => {
                const defaultBase = item.type === 'series' ? defaultSeriesPrice : defaultMoviePrice;
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        style={{ width: '38px', height: '52px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            color: '#FFFFFF',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: item.type === 'series' ? 'rgba(192, 132, 252, 0.2)' : 'rgba(96, 165, 250, 0.2)',
                              color: item.type === 'series' ? '#C084FC' : '#60A5FA'
                            }}
                          >
                            {item.type.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Default: ₹{defaultBase}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--brand-gold, #F5C518)' }}>
                          ₹{item.customPrice}
                        </div>
                        <div style={{ fontSize: '10px', color: '#34D399', fontWeight: 700 }}>OVERRIDE</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveOverride(item)}
                        title="Reset to default price"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#F87171',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

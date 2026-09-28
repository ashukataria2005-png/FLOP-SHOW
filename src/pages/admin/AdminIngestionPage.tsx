import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  RefreshCw,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Film,
  Tv,
  Power,
  Loader2,
  ArrowLeft,
  XCircle,
  TrendingUp,
  BarChart3,
  Filter,
  Check
} from 'lucide-react';

interface AdminIngestionPageProps {
  onNavigateTab?: (tab: string, param?: string) => void;
}

interface IngestionRunResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalCandidates: number;
  filteredOut: number;
  duplicatesSkipped: number;
  imported: number;
  failed: number;
  errors: string[];
  importedTitles: Array<{ id: string; title: string; type: string; year: number; status?: string }>;
}

interface IngestionStatus {
  enabled: boolean;
  lastRunAt: string | null;
  lastRunResult: IngestionRunResult | null;
  totalRuns: number;
  totalImported: number;
  isRunning: boolean;
  cronSchedule: string;
}

interface SchedulerInfo {
  active: boolean;
  intervalMinutes: number;
  intervalHours: number;
  lastRunTime: string | null;
  nextRunEstimated: string | null;
}

export const AdminIngestionPage: React.FC<AdminIngestionPageProps> = ({ onNavigateTab }) => {
  const { showToast, refreshCatalog } = useApp();

  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [togglingCron, setTogglingCron] = useState(false);
  const [status, setStatus] = useState<IngestionStatus | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerInfo | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Custom filter overrides for manual run
  const [minRating, setMinRating] = useState<number>(7.2);
  const [minVotes, setMinVotes] = useState<number>(1000);
  const [region, setRegion] = useState<string>('IN');
  const [maxTitles, setMaxTitles] = useState<number>(30);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Fetch ingestion status
  const fetchStatus = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await api.admin.getIngestionStatus();
      if (res && res.status) {
        setStatus(res.status);
        if (res.scheduler) {
          setScheduler(res.scheduler);
        }
        setLastError(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch ingestion status:', err);
      if (!quiet) {
        setLastError(err.message || 'Failed to connect to ingestion engine.');
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Poll status while running
  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      fetchStatus(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Handle manual trigger
  const handleTriggerIngestion = async () => {
    if (triggering || status?.isRunning) return;

    setTriggering(true);
    try {
      showToast('Starting automated metadata ingestion cycle...', 'info');
      const res = await api.admin.triggerIngestion({
        minRating: Number(minRating),
        minVoteCount: Number(minVotes),
        region: region.trim().toUpperCase(),
        maxTitlesPerRun: Number(maxTitles)
      });

      if (res.success) {
        showToast(
          `Ingestion completed successfully! ${res.result?.imported ?? 0} titles imported as COMING SOON.`,
          'success'
        );
        await refreshCatalog();
        await fetchStatus(true);
      } else {
        showToast(res.message || 'Ingestion completed with warnings.', 'info');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Ingestion run failed.';
      showToast(errorMsg, 'error');
      setLastError(errorMsg);
    } finally {
      setTriggering(false);
      await fetchStatus(true);
    }
  };

  // Handle cron toggle
  const handleToggleCron = async () => {
    if (togglingCron) return;
    const targetState = !status?.enabled;

    setTogglingCron(true);
    try {
      const res = await api.admin.toggleIngestionCron(targetState);
      if (res.success) {
        showToast(
          targetState
            ? 'Automatic 6-hourly ingestion scheduler ENABLED.'
            : 'Automatic ingestion scheduler DISABLED.',
          'success'
        );
        await fetchStatus(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle cron scheduler state.', 'error');
    } finally {
      setTogglingCron(false);
    }
  };

  const isRunning = Boolean(status?.isRunning || triggering);
  const lastResult = status?.lastRunResult;
  const isEnabled = Boolean(status?.enabled);

  // Format date helper
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)'
              }}
            >
              <RefreshCw size={20} className={isRunning ? 'animate-spin' : ''} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
              Automated Metadata Ingestion Engine
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: '#9CA3AF', maxWidth: '750px', lineHeight: 1.5, margin: 0 }}>
            Automated crawler that queries TMDB trending and popular releases (India & Global regions), filters for quality titles (rating &ge; 7.2, 1000+ votes), deduplicates against the FLOPSHOW catalog, and imports them automatically as DRAFT (&quot;COMING SOON&quot;).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => fetchStatus(false)}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh Status
          </button>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('admin-content')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} />
              Catalog Manager
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Live Status & Cron Job Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          marginBottom: '28px'
        }}
      >
        {/* 1. Live Engine Status Card */}
        <div
          style={{
            backgroundColor: 'rgba(20, 20, 24, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: isRunning ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isRunning ? '#60A5FA' : '#9CA3AF'
                }}
              >
                <TrendingUp size={18} />
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>Live Ingestion Status</span>
            </div>

            {/* Status Badge */}
            {isRunning ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#60A5FA',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.04em'
                }}
              >
                <Loader2 size={13} className="animate-spin" />
                RUNNING INGESTION...
              </span>
            ) : lastResult?.errors && lastResult.errors.length > 0 && lastResult.imported === 0 ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#F87171',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.04em'
                }}
              >
                <XCircle size={13} />
                FAILED / ERROR
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#4ADE80',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.04em'
                }}
              >
                <CheckCircle2 size={13} />
                IDLE / STANDBY
              </span>
            )}
          </div>

          {/* Quick Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '24px',
              padding: '14px',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Runs
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
                {status?.totalRuns ?? 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Ingested
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--brand-gold, #F5C518)', marginTop: '4px' }}>
                {status?.totalImported ?? 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>
                Last Run
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#D1D5DB',
                  marginTop: '6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={formatDate(status?.lastRunAt)}
              >
                {status?.lastRunAt ? formatDate(status.lastRunAt).split(',')[0] : 'None'}
              </div>
            </div>
          </div>

          {/* Manual Trigger Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleTriggerIngestion}
              disabled={isRunning || loading}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '14px 20px',
                borderRadius: '12px',
                background: isRunning
                  ? 'linear-gradient(135deg, rgba(245, 197, 24, 0.4), rgba(217, 119, 6, 0.4))'
                  : 'linear-gradient(135deg, #F5C518, #D97706)',
                border: 'none',
                color: '#000000',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isRunning || loading ? 'not-allowed' : 'pointer',
                boxShadow: isRunning ? 'none' : '0 4px 16px rgba(245, 197, 24, 0.3)',
                transition: 'all 0.2s ease',
                opacity: isRunning || loading ? 0.7 : 1
              }}
            >
              {isRunning ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Running Ingestion Pipeline...
                </>
              ) : (
                <>
                  <Play size={18} fill="#000000" />
                  Trigger Ingestion Now
                </>
              )}
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <Filter size={13} />
              {showFilters ? 'Hide Ingestion Filter Overrides' : 'Customize Trigger Filters (Rating, Region, Votes)'}
            </button>
          </div>

          {/* Collapsible Filter Overrides */}
          {showFilters && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px'
              }}
            >
              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Min Rating (TMDB)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={minRating}
                  onChange={e => setMinRating(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Min Vote Count
                </label>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={minVotes}
                  onChange={e => setMinVotes(parseInt(e.target.value, 10) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Target Region
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Max Titles / Run
                </label>
                <input
                  type="number"
                  step="5"
                  min="1"
                  max="100"
                  value={maxTitles}
                  onChange={e => setMaxTitles(parseInt(e.target.value, 10) || 30)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Cron Job Status Card */}
        <div
          style={{
            backgroundColor: 'rgba(20, 20, 24, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isEnabled ? '#4ADE80' : '#9CA3AF'
                  }}
                >
                  <Clock size={18} />
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>Cron Job Scheduler</span>
              </div>

              {/* Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: isEnabled ? '#4ADE80' : '#9CA3AF' }}>
                  {isEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
                <button
                  onClick={handleToggleCron}
                  disabled={togglingCron}
                  aria-label="Toggle Cron Ingestion"
                  style={{
                    width: '50px',
                    height: '28px',
                    borderRadius: '14px',
                    backgroundColor: isEnabled ? '#22C55E' : 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    position: 'relative',
                    cursor: togglingCron ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s ease',
                    padding: '2px'
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      transform: isEnabled ? 'translateX(22px)' : 'translateX(0)',
                      transition: 'transform 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    {togglingCron ? (
                      <Loader2 size={12} className="animate-spin" color="#000" />
                    ) : isEnabled ? (
                      <Check size={12} color="#22C55E" />
                    ) : (
                      <Power size={11} color="#666" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Cron Schedule Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Execution Interval</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Every 6 Hours (0 */6 * * *)</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Cron Worker Status</span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: scheduler?.active ? '#4ADE80' : '#9CA3AF'
                  }}
                >
                  {scheduler?.active ? 'Active & Running' : 'Stopped / Standby'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Next Run Estimate</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-gold, #F5C518)' }}>
                  {isEnabled && scheduler?.nextRunEstimated
                    ? formatDate(scheduler.nextRunEstimated)
                    : isEnabled
                    ? 'In ~6 hours'
                    : 'Paused'}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              fontSize: '12px',
              color: '#9CA3AF',
              lineHeight: 1.5,
              padding: '10px 14px',
              backgroundColor: 'rgba(245, 197, 24, 0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(245, 197, 24, 0.2)'
            }}
          >
            <strong style={{ color: 'var(--brand-gold, #F5C518)' }}>Crash Recovery:</strong> The background worker tracks heartbeat timestamps in the database and restarts automatically if the server experiences a reboot.
          </div>
        </div>
      </div>

      {/* 3. Last Ingestion Run Summary */}
      <div
        style={{
          backgroundColor: 'rgba(20, 20, 24, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '28px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)'
              }}
            >
              <BarChart3 size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                Last Ingestion Run Summary
              </h2>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, marginTop: '2px' }}>
                Run ID: {lastResult?.runId || 'No recorded runs yet'}
              </p>
            </div>
          </div>

          {lastResult?.completedAt && (
            <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
              Duration:{' '}
              <strong style={{ color: '#FFFFFF' }}>
                {((lastResult.durationMs || 0) / 1000).toFixed(1)}s
              </strong>{' '}
              | Completed:{' '}
              <strong style={{ color: '#FFFFFF' }}>{formatDate(lastResult.completedAt)}</strong>
            </div>
          )}
        </div>

        {lastResult ? (
          <>
            {/* Stat Pills */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '24px'
              }}
            >
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Candidates Fetched</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
                  {lastResult.totalCandidates}
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Filtered Out (&lt; 7.2)</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#9CA3AF', marginTop: '4px' }}>
                  {lastResult.filteredOut}
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Duplicates Skipped</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>
                  {lastResult.duplicatesSkipped}
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '12px',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}
              >
                <div style={{ fontSize: '12px', color: '#4ADE80' }}>Items Ingested</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#4ADE80', marginTop: '4px' }}>
                  {lastResult.imported}
                </div>
              </div>
            </div>

            {/* Imported Titles Table / List */}
            {lastResult.importedTitles && lastResult.importedTitles.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Sparkles size={16} color="var(--brand-gold, #F5C518)" />
                  Titles Ingested in Last Run ({lastResult.importedTitles.length})
                </h3>

                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)'
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', color: '#9CA3AF', fontWeight: 600 }}>Title</th>
                        <th style={{ padding: '10px 14px', color: '#9CA3AF', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '10px 14px', color: '#9CA3AF', fontWeight: 600 }}>Year</th>
                        <th style={{ padding: '10px 14px', color: '#9CA3AF', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastResult.importedTitles.map((t, idx) => (
                        <tr
                          key={`${t.id}-${idx}`}
                          style={{
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '10px 14px', color: '#FFFFFF', fontWeight: 600 }}>
                            {t.title}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#9CA3AF' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor:
                                  t.type === 'SERIES'
                                    ? 'rgba(168, 85, 247, 0.15)'
                                    : 'rgba(59, 130, 246, 0.15)',
                                color: t.type === 'SERIES' ? '#C084FC' : '#93C5FD',
                                fontSize: '11px',
                                fontWeight: 700
                              }}
                            >
                              {t.type === 'SERIES' ? <Tv size={11} /> : <Film size={11} />}
                              {t.type}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#9CA3AF' }}>{t.year}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                                color: 'var(--brand-gold, #F5C518)',
                                fontSize: '11px',
                                fontWeight: 700
                              }}
                            >
                              {t.status || 'COMING SOON'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Error Log Table (if any) */}
            {lastResult.errors && lastResult.errors.length > 0 && (
              <div>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#F87171',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertTriangle size={16} />
                  Error &amp; Warning Log ({lastResult.errors.length})
                </h3>
                <div
                  style={{
                    padding: '14px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '10px',
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}
                >
                  {lastResult.errors.map((errStr, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: '12px',
                        color: '#FCA5A5',
                        marginBottom: idx === lastResult.errors.length - 1 ? 0 : '8px',
                        fontFamily: 'monospace'
                      }}
                    >
                      &bull; {errStr}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              color: '#9CA3AF',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '12px',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}
          >
            <Clock size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#D1D5DB' }}>
              No ingestion runs recorded yet
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
              Click &quot;Trigger Ingestion Now&quot; to perform an initial cycle, or wait for the scheduled 6-hour cron run.
            </div>
          </div>
        )}
      </div>

      {/* Global Last Error Banner (if any) */}
      {lastError && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#FCA5A5',
            fontSize: '13px'
          }}
        >
          <AlertTriangle size={18} color="#F87171" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{lastError}</div>
          <button
            onClick={() => setLastError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FCA5A5',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px'
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

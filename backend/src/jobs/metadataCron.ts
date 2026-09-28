/**
 * FLOPSHOW Metadata Ingestion Cron Scheduler
 *
 * Schedules automatic metadata ingestion runs every 6 hours (0 *​/6 * * *).
 * Uses setInterval-based scheduling (no external cron dependency) with crash recovery.
 *
 * Automatically starts on server boot if ingestion is enabled in app_settings.
 */

import { ingestionService } from '../services/ingestionService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Cron interval: 6 hours in milliseconds */
const CRON_INTERVAL_MS = 6 * 60 * 60 * 1000; // 21,600,000ms = 6 hours

/** Cron expression (for display purposes) */
export const CRON_EXPRESSION = '0 */6 * * *';

// ─────────────────────────────────────────────────────────────────────────────
// Scheduler State
// ─────────────────────────────────────────────────────────────────────────────

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _isSchedulerActive = false;
let _nextRunAt: Date | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled Run Handler
// ─────────────────────────────────────────────────────────────────────────────

async function executeScheduledRun(): Promise<void> {
  // Update next run timestamp
  _nextRunAt = new Date(Date.now() + CRON_INTERVAL_MS);

  // Check if ingestion is enabled before running
  const enabled = await ingestionService.isEnabled();
  if (!enabled) {
    console.log('[MetadataCron] Auto-ingestion is disabled. Skipping scheduled run.');
    return;
  }

  // Check if already running (shouldn't happen with 6h intervals, but be safe)
  if (ingestionService.isRunning()) {
    console.log('[MetadataCron] Previous ingestion run still in progress. Skipping this cycle.');
    return;
  }

  console.log('[MetadataCron] Starting scheduled ingestion run (batch size: 30)...');
  try {
    const result = await ingestionService.runNow({ maxTitlesPerRun: 30 });
    console.log(
      `[MetadataCron] Scheduled run complete: ${result.imported} imported, ` +
      `${result.failed} failed, ${result.duplicatesSkipped} duplicates skipped ` +
      `(${(result.durationMs / 1000).toFixed(1)}s)`
    );
  } catch (err) {
    console.error('[MetadataCron] Scheduled ingestion run failed:', (err as Error).message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export const metadataCron = {
  /**
   * Start the cron scheduler. Safe to call multiple times (idempotent).
   * Automatically checks if ingestion is enabled before starting.
   */
  async start(): Promise<void> {
    if (_isSchedulerActive) {
      console.log('[MetadataCron] Scheduler is already active.');
      return;
    }

    const enabled = await ingestionService.isEnabled();
    if (!enabled) {
      console.log('[MetadataCron] Auto-ingestion is disabled in settings. Scheduler not started.');
      console.log('[MetadataCron] Enable it via Admin Panel → Ingestion Settings to start automatic imports.');
      return;
    }

    _isSchedulerActive = true;
    _nextRunAt = new Date(Date.now() + CRON_INTERVAL_MS);

    _intervalId = setInterval(() => {
      executeScheduledRun().catch(err => {
        console.error('[MetadataCron] Unhandled error in scheduled run:', err);
      });
    }, CRON_INTERVAL_MS);

    // Prevent the interval from blocking Node.js shutdown
    if (_intervalId && typeof _intervalId === 'object' && 'unref' in _intervalId) {
      _intervalId.unref();
    }

    console.log(`[MetadataCron] ✓ Scheduler started (every 6 hours, schedule: ${CRON_EXPRESSION})`);
    console.log(`[MetadataCron]   Next run at: ${_nextRunAt.toISOString()}`);
  },

  /**
   * Stop the cron scheduler.
   */
  stop(): void {
    if (_intervalId) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
    _isSchedulerActive = false;
    _nextRunAt = null;
    console.log('[MetadataCron] Scheduler stopped.');
  },

  /**
   * Restart the scheduler (stop + start). Useful after toggling enabled/disabled.
   */
  async restart(): Promise<void> {
    this.stop();
    await this.start();
  },

  /**
   * Check if the scheduler is currently active.
   */
  isActive(): boolean {
    return _isSchedulerActive;
  },

  /**
   * Get the next scheduled run time.
   */
  getNextRunAt(): Date | null {
    return _nextRunAt;
  },

  /**
   * Get scheduler status info.
   */
  getInfo(): { active: boolean; schedule: string; nextRunAt: string | null; intervalMs: number } {
    return {
      active: _isSchedulerActive,
      schedule: CRON_EXPRESSION,
      nextRunAt: _nextRunAt?.toISOString() || null,
      intervalMs: CRON_INTERVAL_MS,
    };
  },
};

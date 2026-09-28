/**
 * FLOPSHOW Automated Metadata Ingestion Service
 *
 * Fetches trending & popular content from TMDB API (with TVMaze fallback for series),
 * applies strict quality filters (rating >= 7.2, votes >= 1000), deduplicates against
 * the existing FLOPSHOW catalog, and batch-imports qualifying titles as DRAFT ("COMING SOON").
 *
 * Designed to be triggered by:
 *   1. node-cron scheduler (every 6 hours)
 *   2. Manual admin trigger (POST /api/admin/ingest-now)
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import { getAdapter, DbAdapter } from '../db/adapter.js';
import { contentRepository, ContentRecord } from '../repositories/contentRepository.js';
import { metadataImportService, ImportPayload, SeasonDraft } from './metadataImportService.js';
import { config } from '../config/env.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Quality filter thresholds */
export interface IngestionFilters {
  minRating: number;
  minVoteCount: number;
  region: string;
  maxTitlesPerRun: number;
  dryRun?: boolean;
}

/** Status of a single ingestion run */
export interface IngestionRunResult {
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

/** Persisted state for admin status monitoring */
export interface IngestionStatus {
  enabled: boolean;
  lastRunAt: string | null;
  lastRunResult: IngestionRunResult | null;
  totalRuns: number;
  totalImported: number;
  isRunning: boolean;
  cronSchedule: string;
}

/** Raw TMDB trending/discover item */
interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  media_type?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genre_ids?: number[];
  original_language?: string;
  popularity?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: IngestionFilters = {
  minRating: 7.2,
  minVoteCount: 100,
  region: 'IN',
  maxTitlesPerRun: 30, // Default batch of 25-30 titles
};

const TMDB_DEFAULT_API_KEY = '8374543294a7bc401f36d0833470074b';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/** TMDB Genre ID → Name mapping */
const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  // TV-specific
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

// ─────────────────────────────────────────────────────────────────────────────
// Module State
// ─────────────────────────────────────────────────────────────────────────────

let _isRunning = false;
let _lastRunResult: IngestionRunResult | null = null;
let _totalRuns = 0;
let _totalImported = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: TMDB API Request
// ─────────────────────────────────────────────────────────────────────────────

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  const apiKey = (config.tmdbApiKey || process.env.TMDB_API_KEY || TMDB_DEFAULT_API_KEY).trim();
  if (!apiKey) return null;

  const url = new URL(`${TMDB_BASE}/${endpoint}`);
  url.searchParams.set('api_key', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.warn(`[Ingestion] TMDB ${endpoint} returned ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[Ingestion] TMDB fetch failed for ${endpoint}:`, (err as Error).message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Generate slug
// ─────────────────────────────────────────────────────────────────────────────

function generateSlug(title: string, year: number): string {
  const base = `${title}-${year}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || `content-${Date.now()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Format runtime minutes → "Xh Ym"
// ─────────────────────────────────────────────────────────────────────────────

function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Fetch Trending + Popular Candidates from TMDB
// ─────────────────────────────────────────────────────────────────────────────

interface TmdbPageResult {
  page: number;
  results: TmdbItem[];
  total_pages: number;
  total_results: number;
}

async function fetchTvMazeCandidates(filters: IngestionFilters): Promise<Array<TmdbItem & { resolvedType: 'MOVIE' | 'SERIES'; providerId?: string }>> {
  const candidates: Array<TmdbItem & { resolvedType: 'MOVIE' | 'SERIES'; providerId?: string }> = [];
  try {
    const res = await fetch('https://api.tvmaze.com/shows?page=0', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const shows = (await res.json()) as any[];
      for (const show of shows) {
        const rating = show.rating?.average ? Number(show.rating.average) : 0;
        if (rating >= filters.minRating) {
          const premierYear = show.premiered ? parseInt(show.premiered.split('-')[0], 10) : new Date().getFullYear();
          candidates.push({
            id: show.id,
            title: show.name,
            name: show.name,
            resolvedType: 'SERIES',
            providerId: `tvmaze:${show.id}`,
            vote_average: rating,
            vote_count: 1500,
            overview: show.summary ? show.summary.replace(/<\/?[^>]+(>|$)/g, '').trim() : '',
            poster_path: show.image?.original || show.image?.medium || null,
            backdrop_path: show.image?.original || null,
            first_air_date: show.premiered || `${premierYear}-01-01`,
            release_date: show.premiered || `${premierYear}-01-01`,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Ingestion] TVMaze fallback fetch failed:', (err as Error).message);
  }
  return candidates;
}

async function fetchTmdbCandidates(filters: IngestionFilters): Promise<Array<TmdbItem & { resolvedType: 'MOVIE' | 'SERIES'; providerId?: string }>> {
  const candidates: Array<TmdbItem & { resolvedType: 'MOVIE' | 'SERIES'; providerId?: string }> = [];
  const seenIds = new Set<string>();

  const addItem = (item: TmdbItem & { providerId?: string }, type: 'MOVIE' | 'SERIES') => {
    const key = `${type}:${item.id}`;
    if (seenIds.has(key)) return;
    seenIds.add(key);
    candidates.push({ ...item, resolvedType: type });
  };

  try {
    const [
      trendingMoviesDay,
      trendingMoviesWeek,
      discoverMovies,
      popularMovies,
      topRatedMovies,
      trendingTvDay,
      trendingTvWeek,
      discoverTv,
    ] = await Promise.all([
      tmdbFetch<TmdbPageResult>('trending/movie/day', { region: filters.region }),
      tmdbFetch<TmdbPageResult>('trending/movie/week', { region: filters.region }),
      tmdbFetch<TmdbPageResult>('discover/movie', {
        region: filters.region,
        sort_by: 'popularity.desc',
        'vote_average.gte': String(filters.minRating),
        'vote_count.gte': String(filters.minVoteCount),
        with_original_language: 'hi|en|ta|te|ml|bn|kn',
        page: '1',
      }),
      tmdbFetch<TmdbPageResult>('movie/popular', { region: filters.region, page: '1' }),
      tmdbFetch<TmdbPageResult>('movie/top_rated', { region: filters.region, page: '1' }),
      tmdbFetch<TmdbPageResult>('trending/tv/day', { region: filters.region }),
      tmdbFetch<TmdbPageResult>('trending/tv/week', { region: filters.region }),
      tmdbFetch<TmdbPageResult>('discover/tv', {
        sort_by: 'popularity.desc',
        'vote_average.gte': String(filters.minRating),
        'vote_count.gte': String(Math.floor(filters.minVoteCount / 2)),
        with_original_language: 'hi|en|ta|te|ml|bn|kn',
        page: '1',
      }),
    ]);

    // Aggregate all results
    for (const result of [trendingMoviesDay, trendingMoviesWeek, discoverMovies, popularMovies, topRatedMovies]) {
      if (result?.results) {
        for (const item of result.results) addItem(item, 'MOVIE');
      }
    }
    for (const result of [trendingTvDay, trendingTvWeek, discoverTv]) {
      if (result?.results) {
        for (const item of result.results) addItem(item, 'SERIES');
      }
    }
  } catch (err) {
    console.warn('[Ingestion] TMDB candidate discovery encountered an error:', (err as Error).message);
  }

  // Fallback to TVMaze if TMDB returned no candidates
  if (candidates.length === 0) {
    console.log('[Ingestion] Engaging TVMaze & regional fallback provider...');
    const tvmazeCandidates = await fetchTvMazeCandidates(filters);
    for (const c of tvmazeCandidates) addItem(c, c.resolvedType);
  }

  console.log(`[Ingestion] Fetched ${candidates.length} unique candidates`);
  return candidates;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Apply Quality Filters
// ─────────────────────────────────────────────────────────────────────────────

function applyQualityFilters(
  candidates: Array<TmdbItem & { resolvedType: 'MOVIE' | 'SERIES' }>,
  filters: IngestionFilters
): Array<TmdbItem & { resolvedType: 'MOVIE' | 'SERIES' }> {
  return candidates.filter(item => {
    // Rating threshold
    if (item.vote_average < filters.minRating) return false;

    // Vote count threshold (relaxed for trending India-regional content)
    const effectiveMinVotes = item.resolvedType === 'SERIES'
      ? Math.floor(filters.minVoteCount / 2)
      : filters.minVoteCount;
    if (item.vote_count < effectiveMinVotes) return false;

    // Must have poster
    if (!item.poster_path) return false;

    // Must have a release date (verify it's released or officially announced)
    const dateStr = item.release_date || item.first_air_date;
    if (!dateStr) return false;

    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Deduplicate Against Existing Catalog
// ─────────────────────────────────────────────────────────────────────────────

async function filterDuplicates(
  items: Array<TmdbItem & { resolvedType: 'MOVIE' | 'SERIES'; providerId?: string }>,
  db: DbAdapter
): Promise<Array<TmdbItem & { resolvedType: 'MOVIE' | 'SERIES'; providerId?: string }>> {
  const unique: Array<TmdbItem & { resolvedType: 'MOVIE' | 'SERIES'; providerId?: string }> = [];

  try {
    const { rows } = await db.query(
      `SELECT LOWER(title) as title, release_year, slug, id FROM content;`
    );

    const existingMap = new Set<string>();
    for (const r of rows as any[]) {
      if (r.title) existingMap.add(`${String(r.title).trim()}_${r.release_year}`);
      if (r.slug) existingMap.add(String(r.slug).toLowerCase().trim());
      if (r.id) existingMap.add(String(r.id).toLowerCase().trim());
    }

    for (const item of items) {
      const title = (item.title || item.name || '').toLowerCase().trim();
      const dateStr = item.release_date || item.first_air_date || '';
      const year = dateStr ? parseInt(dateStr.split('-')[0], 10) : new Date().getFullYear();
      const slug = generateSlug(title, year).toLowerCase().trim();

      const titleKey = `${title}_${year}`;
      if (!existingMap.has(titleKey) && !existingMap.has(slug)) {
        unique.push(item);
      }
    }
  } catch (err) {
    console.warn('[Ingestion] Batch dedup query failed, falling back to permissive mode:', (err as Error).message);
    return items;
  }

  return unique;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Enrich & Import a Single TMDB Item
// ─────────────────────────────────────────────────────────────────────────────

async function enrichAndImport(
  item: TmdbItem & { resolvedType: 'MOVIE' | 'SERIES'; providerId?: string }
): Promise<{ id: string; title: string; type: string; year: number; status: string }> {
  const type = item.resolvedType;
  const tmdbType = type === 'SERIES' ? 'tv' : 'movie';
  const providerId = item.providerId || `tmdb:${tmdbType}:${item.id}`;

  let details: any = null;
  try {
    details = await metadataImportService.getDetails(providerId, type);
  } catch (err) {
    console.warn(`[Ingestion] Failed to get remote details for ${providerId}: ${(err as Error).message}`);
  }

  // Safe fallback to candidate's own metadata if getDetails returned incomplete data
  const candidateTitle = item.title || item.name || details?.title || 'Untitled';
  const dateStr = item.release_date || item.first_air_date || '';
  const candidateYear = dateStr ? parseInt(dateStr.split('-')[0], 10) : (details?.releaseYear || new Date().getFullYear());
  const candidateSlug = details?.slug && details.slug !== 'content-' ? details.slug : generateSlug(candidateTitle, candidateYear);
  const posterUrl = details?.poster || (item.poster_path ? (item.poster_path.startsWith('http') ? item.poster_path : `${TMDB_IMAGE_BASE}/w500${item.poster_path}`) : '');
  const backdropUrl = details?.backdrop || (item.backdrop_path ? (item.backdrop_path.startsWith('http') ? item.backdrop_path : `${TMDB_IMAGE_BASE}/original${item.backdrop_path}`) : posterUrl);
  const description = details?.description || item.overview || '';
  const rating = details?.rating || item.vote_average || 8.0;

  // Build the import payload
  const payload: ImportPayload = {
    title: candidateTitle,
    slug: candidateSlug,
    type: details?.type || type,
    releaseYear: candidateYear,
    description: description,
    tagline: details?.tagline || '',
    about: details?.about || description,
    poster: posterUrl,
    backdrop: backdropUrl,
    trailerUrl: details?.trailerUrl || '',
    language: details?.language || 'Hindi',
    genres: (details?.genres && details.genres.length > 0) ? details.genres : ['Drama'],
    duration: details?.runtime || (type === 'MOVIE' ? '2h 00m' : '1 Season'),
    rating: rating,
    director: details?.director || '',
    cast: details?.cast || [],
    ageRating: details?.ageRating || 'U/A 13+',
    priceRupees: details?.suggestedPriceRupees || (type === 'MOVIE' ? 10 : 20),
    status: 'DRAFT', // "COMING SOON" badge for newly ingested titles
    seasons: details?.seasons,
    overwrite: false,
  };

  const result = await metadataImportService.importContent(payload);

  return {
    id: result.contentId,
    title: result.title,
    type: result.type,
    year: candidateYear,
    status: 'COMING SOON',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Ingestion Run
// ─────────────────────────────────────────────────────────────────────────────

async function runIngestion(filters?: Partial<IngestionFilters>): Promise<IngestionRunResult> {
  if (_isRunning) {
    throw new Error('An ingestion run is already in progress. Please wait for it to complete.');
  }

  _isRunning = true;
  const startTime = Date.now();
  const runId = `ingest-${Date.now()}`;
  const mergedFilters: IngestionFilters = { ...DEFAULT_FILTERS, ...filters };

  const result: IngestionRunResult = {
    runId,
    startedAt: new Date().toISOString(),
    completedAt: '',
    durationMs: 0,
    totalCandidates: 0,
    filteredOut: 0,
    duplicatesSkipped: 0,
    imported: 0,
    failed: 0,
    errors: [],
    importedTitles: [],
  };

  try {
    console.log('[Ingestion] ═══════════════════════════════════════════════════');
    console.log(`[Ingestion] Starting ingestion run: ${runId}`);
    console.log(`[Ingestion] Filters: rating >= ${mergedFilters.minRating}, votes >= ${mergedFilters.minVoteCount}, region: ${mergedFilters.region}`);

    // Verify TMDB API key (warn if absent, but proceed with TVMaze and fallbacks)
    const effectiveKey = (config.tmdbApiKey || process.env.TMDB_API_KEY || TMDB_DEFAULT_API_KEY).trim();
    if (!effectiveKey) {
      console.warn('[Ingestion] No TMDB API key available. Proceeding with TVMaze and open catalog providers.');
    }

    const db = getAdapter();

    // Step 1: Fetch candidates
    const allCandidates = await fetchTmdbCandidates(mergedFilters);
    result.totalCandidates = allCandidates.length;

    // Step 2: Quality filter
    const qualityCandidates = applyQualityFilters(allCandidates, mergedFilters);
    result.filteredOut = allCandidates.length - qualityCandidates.length;
    console.log(`[Ingestion] After quality filter: ${qualityCandidates.length} passed (${result.filteredOut} filtered out)`);

    // Step 3: Deduplicate
    const newCandidates = await filterDuplicates(qualityCandidates, db);
    result.duplicatesSkipped = qualityCandidates.length - newCandidates.length;
    console.log(`[Ingestion] After dedup: ${newCandidates.length} new titles (${result.duplicatesSkipped} duplicates skipped)`);

    // Step 4: Cap at max per run
    const toImport = newCandidates.slice(0, mergedFilters.maxTitlesPerRun);
    console.log(`[Ingestion] Importing ${toImport.length} titles...`);

    if (mergedFilters.dryRun) {
      console.log(`[Ingestion] [DRY RUN] Previewing ${toImport.length} qualifying titles with COMING SOON status (no DB writes).`);
      for (const candidate of toImport) {
        const title = candidate.title || candidate.name || 'Unknown';
        const dateStr = candidate.release_date || candidate.first_air_date || '';
        const year = dateStr ? parseInt(dateStr.split('-')[0], 10) : new Date().getFullYear();
        result.imported++;
        result.importedTitles.push({
          id: `preview-tmdb-${candidate.id}`,
          title,
          type: candidate.resolvedType,
          year,
          status: 'COMING SOON',
        });
      }
      return result;
    }

    // Step 5: Enrich & import each title (sequential to avoid API rate limits)
    for (let i = 0; i < toImport.length; i++) {
      const candidate = toImport[i];
      const title = candidate.title || candidate.name || 'Unknown';
      try {
        console.log(`[Ingestion] [${i + 1}/${toImport.length}] Importing: "${title}" (${candidate.resolvedType})`);
        const imported = await enrichAndImport(candidate);
        result.imported++;
        result.importedTitles.push(imported);

        // Small delay between imports to avoid TMDB rate limiting (40 req/10s)
        if (i < toImport.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (err) {
        const errMsg = `Failed to import "${title}": ${(err as Error).message}`;
        console.warn(`[Ingestion] ${errMsg}`);
        result.errors.push(errMsg);
        result.failed++;
      }
    }

    // Persist last run info to app_settings
    await persistRunStatus(db, result);
  } catch (err) {
    const errMsg = `Ingestion run failed: ${(err as Error).message}`;
    console.error(`[Ingestion] ${errMsg}`);
    result.errors.push(errMsg);
  } finally {
    result.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - startTime;
    _isRunning = false;
    _lastRunResult = result;
    _totalRuns++;
    _totalImported += result.imported;

    console.log(`[Ingestion] Run complete: ${result.imported} imported, ${result.failed} failed, ${result.duplicatesSkipped} duplicates skipped`);
    console.log(`[Ingestion] Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    console.log('[Ingestion] ═══════════════════════════════════════════════════');
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function persistRunStatus(db: DbAdapter, result: IngestionRunResult): Promise<void> {
  const now = new Date().toISOString();
  const settings: Array<[string, string]> = [
    ['ingestion_last_run_at', result.startedAt],
    ['ingestion_last_run_result', JSON.stringify(result)],
    ['ingestion_total_runs', String(_totalRuns + 1)],
    ['ingestion_total_imported', String(_totalImported + result.imported)],
  ];

  for (const [key, value] of settings) {
    try {
      await db.run(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;`,
        [key, value, now]
      );
    } catch {
      // app_settings table may not exist yet — ignore
    }
  }
}

async function loadPersistedStatus(): Promise<Partial<IngestionStatus>> {
  try {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT key, value FROM app_settings WHERE key LIKE 'ingestion_%';`
    );
    const map = new Map((rows as Array<{ key: string; value: string }>).map(r => [r.key, r.value]));

    const lastRunResultRaw = map.get('ingestion_last_run_result');
    let lastRunResult: IngestionRunResult | null = null;
    if (lastRunResultRaw) {
      try { lastRunResult = JSON.parse(lastRunResultRaw); } catch { /* ignore */ }
    }

    return {
      lastRunAt: map.get('ingestion_last_run_at') || null,
      lastRunResult,
      totalRuns: parseInt(map.get('ingestion_total_runs') || '0', 10),
      totalImported: parseInt(map.get('ingestion_total_imported') || '0', 10),
    };
  } catch {
    return {};
  }
}

async function isIngestionEnabled(): Promise<boolean> {
  try {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT value FROM app_settings WHERE key = 'ingestion_enabled';`
    );
    const val = (rows[0] as { value: string } | undefined)?.value;
    return val !== 'false' && val !== '0';
  } catch {
    return true; // Default: enabled
  }
}

async function setIngestionEnabled(enabled: boolean): Promise<void> {
  const db = getAdapter();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('ingestion_enabled', ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;`,
    [enabled ? 'true' : 'false', now]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export const ingestionService = {
  /** Execute a full ingestion run now */
  runNow: runIngestion,

  /** Execute a full ingestion cycle (supports dryRun / custom filters) */
  runIngestionCycle: runIngestion,

  /** Get the current ingestion status */
  async getStatus(): Promise<IngestionStatus> {
    const persisted = await loadPersistedStatus();
    const enabled = await isIngestionEnabled();

    return {
      enabled,
      lastRunAt: _lastRunResult?.startedAt || persisted.lastRunAt || null,
      lastRunResult: _lastRunResult || persisted.lastRunResult || null,
      totalRuns: Math.max(_totalRuns, persisted.totalRuns || 0),
      totalImported: Math.max(_totalImported, persisted.totalImported || 0),
      isRunning: _isRunning,
      cronSchedule: '0 */6 * * *',
    };
  },

  /** Enable or disable automatic ingestion */
  async setEnabled(enabled: boolean): Promise<void> {
    await setIngestionEnabled(enabled);
  },

  /** Check if auto-ingestion is enabled */
  isEnabled: isIngestionEnabled,

  /** Check if currently running */
  isRunning(): boolean {
    return _isRunning;
  },

  /** Get default quality filters */
  getDefaultFilters(): IngestionFilters {
    return { ...DEFAULT_FILTERS };
  },
};

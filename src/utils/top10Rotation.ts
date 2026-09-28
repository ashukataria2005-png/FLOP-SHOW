import { ContentItem } from '../types/content';

/**
 * Returns the calendar date string in YYYY-MM-DD format for seed generation.
 */
export function getDaySeed(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Hashes a string into a 32-bit integer seed using Fowler-Noll-Vo / Murmur variant.
 */
export function stringToSeed(str: string): number {
  let hash = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return (hash >>> 0);
}

/**
 * Mulberry32 seeded pseudo-random number generator (PRNG).
 * Produces deterministic numbers in [0, 1) for a given integer seed.
 */
export function createSeededPRNG(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically shuffles an array in-place using a seeded PRNG.
 */
export function seededShuffle<T>(array: T[], prng: () => number): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

export const TOP10_MODE_KEY = 'flopshow_top10_mode';
export const TOP10_IDS_KEY = 'flopshow_top10_ids';

/**
 * Checks if 24-hour dynamic auto-rotation is enabled (default: true).
 */
export function isAutoRotationEnabled(): boolean {
  try {
    const val = localStorage.getItem(TOP10_MODE_KEY);
    // If not explicitly 'manual', auto-rotation is enabled by default
    return val !== 'manual';
  } catch {
    return true;
  }
}

/**
 * Sets Top 10 mode: 'auto' (24-hour auto-rotation) or 'manual' (admin curation).
 */
export function setTop10Mode(mode: 'auto' | 'manual'): void {
  try {
    localStorage.setItem(TOP10_MODE_KEY, mode);
    window.dispatchEvent(new CustomEvent('flopshow_top10_updated', { detail: { mode } }));
    window.dispatchEvent(new Event('storage'));
  } catch (_) {}
}

/**
 * Produces a stable, deterministic Top 10 lineup for the given 24-hour calendar day.
 * Rotates every 24 hours at 00:00 midnight based on date seed and catalog popularity/ratings.
 */
export function getDailyTop10(catalog: ContentItem[], dateStr: string = getDaySeed()): ContentItem[] {
  if (!catalog || catalog.length === 0) return [];

  const seed = stringToSeed(`flopshow_top10_${dateStr}`);
  const prng = createSeededPRNG(seed);

  // Eligible pool: non-empty items with posters, prioritizing high ratings and popularity
  const valid = catalog.filter(c => c && c.id && c.title);
  if (valid.length <= 10) return valid;

  // Split into premium tier (ratings >= 7.5 or top tier) and good tier
  const sortedByRating = [...valid].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // Take top 25 candidates to sample from
  const candidatePool = sortedByRating.slice(0, Math.min(30, sortedByRating.length));

  // Deterministically shuffle candidate pool using the day's seeded PRNG
  const shuffled = seededShuffle(candidatePool, prng);

  return shuffled.slice(0, 10);
}

/**
 * Retrieves the Top 10 list based on current active settings:
 * - If manual curation is active with saved IDs, returns the curated list.
 * - Otherwise, returns the 24-hour deterministic daily auto-rotation lineup.
 */
export function getResolvedTop10(catalog: ContentItem[]): {
  items: ContentItem[];
  isAuto: boolean;
  dateKey: string;
} {
  const isAuto = isAutoRotationEnabled();
  const dateKey = getDaySeed();

  if (!isAuto) {
    try {
      const raw = localStorage.getItem(TOP10_IDS_KEY);
      if (raw) {
        const savedIds: string[] = JSON.parse(raw);
        if (Array.isArray(savedIds) && savedIds.length > 0) {
          const selected: ContentItem[] = [];
          const seen = new Set<string>();

          for (const id of savedIds) {
            const found = catalog.find(c => c.id === id);
            if (found && !seen.has(found.id)) {
              seen.add(found.id);
              selected.push(found);
            }
          }

          // If fewer than 10, backfill with top rated items
          if (selected.length < 10) {
            const remaining = [...catalog]
              .filter(c => !seen.has(c.id))
              .sort((a, b) => (b.rating || 0) - (a.rating || 0));

            for (const cand of remaining) {
              if (selected.length >= 10) break;
              seen.add(cand.id);
              selected.push(cand);
            }
          }

          return {
            items: selected.slice(0, 10),
            isAuto: false,
            dateKey
          };
        }
      }
    } catch (_) {}
  }

  // Auto-rotation active
  return {
    items: getDailyTop10(catalog, dateKey),
    isAuto: true,
    dateKey
  };
}

export type ContentType = 'movie' | 'series';

export interface Episode {
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  duration: string; // e.g. "45m" or "52m"
  durationSeconds: number;
  thumbnailUrl: string;
  videoUrl: string;
  synopsis: string;
}

export interface Season {
  seasonNumber: number;
  title: string;
  episodes: Episode[];
}

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  backdropUrl: string;
  posterUrl: string;
  tagline?: string;
  description: string;
  about: string;
  rating: number; // e.g. 8.7
  releaseYear: number; // e.g. 2025
  runtime?: string; // e.g. "2h 08m" (movies)
  seasonsCount?: number; // e.g. 2 (series)
  language: string; // e.g. "Hindi"
  genres: string[]; // e.g. ["Drama", "Thriller"]
  price: number; // in INR e.g. 30 or 35, 0 = free
  customPrice?: number | null; // custom individual price override in INR, null if using default
  isNow?: boolean; // displays "NOW" badge
  isFree?: boolean; // displays "FREE" badge
  isFeatured?: boolean; // featured spotlight
  isHero?: boolean; // designated Home Hero
  categoryLabel?: string; // e.g. "FEATURED PREMIERE", "SERIES • MYSTERY"
  director?: string; // e.g. "S. Banerjee"
  cast?: string[]; // e.g. ["Actor 1", "Actor 2"]
  trailerUrl?: string;
  videoUrl?: string; // sample video for movie
  trendingPosition?: number; // 1 = Trending #1
  displayPriority?: number;
  seasons?: Season[]; // present if series
  status?: 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
}

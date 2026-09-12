import { getDatabase } from '../db/connection.js';
import { contentRepository, ContentRecord } from '../repositories/contentRepository.js';
import { config } from '../config/env.js';

export interface SearchCandidate {
  providerId: string;
  title: string;
  year: number;
  type: 'MOVIE' | 'SERIES';
  poster: string;
  backdrop?: string;
  rating?: number;
  overview?: string;
  alreadyInFlopshow: boolean;
  existingContentId?: string;
}

export interface SeasonEpisodeDraft {
  episodeNumber: number;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
}

export interface SeasonDraft {
  seasonNumber: number;
  title: string;
  episodes: SeasonEpisodeDraft[];
}

export interface ContentDetailsPreview {
  providerId: string;
  title: string;
  slug: string;
  type: 'MOVIE' | 'SERIES';
  releaseYear: number;
  description: string;
  tagline: string;
  about?: string;
  poster: string;
  backdrop: string;
  trailerUrl: string;
  language: string;
  genres: string[];
  runtime: string;
  rating: number;
  director: string;
  cast: string[];
  ageRating: string;
  suggestedPriceRupees: number;
  status: 'DRAFT';
  featured: boolean;
  trending: boolean;
  alreadyExists: boolean;
  existingContentId?: string;
  seasons?: SeasonDraft[];
}

export interface ImportPayload {
  title: string;
  slug?: string;
  type: 'MOVIE' | 'SERIES';
  releaseYear: number;
  description: string;
  tagline?: string;
  about?: string;
  poster: string;
  backdrop: string;
  trailerUrl?: string;
  language?: string;
  genres?: string[];
  duration?: string;
  rating?: number;
  director?: string;
  cast?: string[];
  ageRating?: string;
  priceRupees?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  seasons?: SeasonDraft[];
  overwrite?: boolean;
}

// Strip HTML tags helper (e.g. from TVMaze summaries)
function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '').trim();
}

// Convert minutes to readable duration (e.g. 148 -> "2h 28m")
function formatMinutes(minutes?: number | string): string {
  if (!minutes) return '';
  const mins = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes;
  if (isNaN(mins) || mins <= 0) return typeof minutes === 'string' ? minutes : '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// Generate URL slug from title and release year
function generateSlug(title: string, year: number): string {
  const base = `${title}-${year}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || `content-${Date.now()}`;
}

export const metadataImportService = {
  /**
   * Search for movie or series candidates from online metadata providers
   */
  async search(query: string, year?: number, type: 'MOVIE' | 'SERIES' = 'MOVIE'): Promise<SearchCandidate[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const candidatesMap = new Map<string, SearchCandidate>();
    const db = getDatabase();

    // 1. If TV series, search TVMaze (instant, high accuracy, free)
    if (type === 'SERIES') {
      try {
        const tvmazeRes = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(trimmedQuery)}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        if (tvmazeRes.ok) {
          const shows = await tvmazeRes.json();
          for (const item of shows) {
            const s = item.show;
            const premieredYear = s.premiered ? parseInt(s.premiered.split('-')[0], 10) : 0;
            if (year && premieredYear && Math.abs(premieredYear - year) > 1) {
              // If user specified year and it differs by more than 1 year, skip or de-prioritize
              continue;
            }

            const candidateYear = premieredYear || year || new Date().getFullYear();
            const posterImg = s.image?.original || s.image?.medium || '';
            const imdbId = s.externals?.imdb;
            const providerId = imdbId ? `imdb:${imdbId}` : `tvmaze:${s.id}`;

            candidatesMap.set(providerId, {
              providerId,
              title: s.name,
              year: candidateYear,
              type: 'SERIES',
              poster: posterImg,
              rating: s.rating?.average ? Number(s.rating.average) : 8.0,
              overview: stripHtml(s.summary) || '',
              alreadyInFlopshow: false
            });
          }
        }
      } catch (err) {
        console.warn('TVMaze search skipped or failed:', (err as any).message);
      }
    }

    // 2. Search OMDb API (works for both movies and series, returns IMDb IDs)
    if (config.omdbApiKey) {
      const omdbApiKey = config.omdbApiKey;
      try {
        const omdbType = type === 'SERIES' ? 'series' : 'movie';
        let omdbUrl = `https://www.omdbapi.com/?s=${encodeURIComponent(trimmedQuery)}&type=${omdbType}&apikey=${omdbApiKey}`;
        if (year) {
          omdbUrl += `&y=${year}`;
        }

        const omdbRes = await fetch(omdbUrl, { signal: AbortSignal.timeout(5000) });
        if (omdbRes.ok) {
          const omdbData = await omdbRes.json();
        if (omdbData.Search && Array.isArray(omdbData.Search)) {
          for (const item of omdbData.Search) {
            const providerId = `imdb:${item.imdbID}`;
            const itemYear = parseInt(item.Year, 10) || year || new Date().getFullYear();
            const poster = item.Poster && item.Poster !== 'N/A' ? item.Poster : '';

            if (candidatesMap.has(providerId)) {
              // Update poster if current is empty
              const existing = candidatesMap.get(providerId)!;
              if (!existing.poster && poster) existing.poster = poster;
            } else {
              candidatesMap.set(providerId, {
                providerId,
                title: item.Title,
                year: itemYear,
                type: item.Type?.toLowerCase() === 'series' ? 'SERIES' : 'MOVIE',
                poster,
                alreadyInFlopshow: false
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('OMDb search skipped or failed:', (err as any).message);
    }
    }

    // 3. If TMDB API key is configured, query TMDB
    if (config.tmdbApiKey) {
      try {
        const tmdbEndpoint = type === 'SERIES' ? 'search/tv' : 'search/movie';
        let tmdbUrl = `https://api.themoviedb.org/3/${tmdbEndpoint}?api_key=${config.tmdbApiKey}&query=${encodeURIComponent(trimmedQuery)}`;
        if (year) {
          tmdbUrl += type === 'SERIES' ? `&first_air_date_year=${year}` : `&year=${year}`;
        }

        const tmdbRes = await fetch(tmdbUrl, { signal: AbortSignal.timeout(5000) });
        if (tmdbRes.ok) {
          const tmdbData = await tmdbRes.json();
          if (tmdbData.results && Array.isArray(tmdbData.results)) {
            for (const item of tmdbData.results.slice(0, 10)) {
              const tmdbId = `tmdb:${type === 'SERIES' ? 'tv' : 'movie'}:${item.id}`;
              const title = item.title || item.name;
              const dateStr = item.release_date || item.first_air_date || '';
              const itemYear = dateStr ? parseInt(dateStr.split('-')[0], 10) : (year || new Date().getFullYear());
              const poster = item.poster_path ? `https://image.tmdb.org/t/p/w780${item.poster_path}` : '';
              const backdrop = item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '';

              if (!candidatesMap.has(tmdbId)) {
                candidatesMap.set(tmdbId, {
                  providerId: tmdbId,
                  title,
                  year: itemYear,
                  type,
                  poster,
                  backdrop,
                  rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : 8.0,
                  overview: item.overview || '',
                  alreadyInFlopshow: false
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('TMDB search skipped or failed:', (err as any).message);
      }
    }

    const results = Array.from(candidatesMap.values());

    // 4. Cross-reference with central FLOPSHOW database to check for existing content & duplicate detection
    for (const item of results) {
      const slugCandidate = generateSlug(item.title, item.year);
      const existing = db.prepare(`
        SELECT id, title, release_year, type FROM content 
        WHERE (LOWER(title) = LOWER(?) AND release_year = ? AND type = ?)
           OR slug = ?
           OR id = ?
        LIMIT 1;
      `).get(item.title, item.year, item.type, slugCandidate, slugCandidate) as any;

      if (existing) {
        item.alreadyInFlopshow = true;
        item.existingContentId = existing.id;
      }
    }

    // 5. Sort results: exact title matches first, year matches second, then by rating
    return results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === trimmedQuery.toLowerCase();
      const bExact = b.title.toLowerCase() === trimmedQuery.toLowerCase();
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      if (year) {
        const aYearMatch = a.year === year;
        const bYearMatch = b.year === year;
        if (aYearMatch && !bYearMatch) return -1;
        if (!aYearMatch && bYearMatch) return 1;
      }

      return (b.rating || 0) - (a.rating || 0);
    });
  },

  /**
   * Fetch complete metadata details for the selected title
   */
  async getDetails(providerId: string, type: 'MOVIE' | 'SERIES'): Promise<ContentDetailsPreview> {
    const db = getDatabase();

    let title = '';
    let releaseYear = new Date().getFullYear();
    let description = '';
    let tagline = '';
    let poster = '';
    let backdrop = '';
    let trailerUrl = '';
    let language = 'Hindi';
    let genres: string[] = [];
    let runtime = type === 'MOVIE' ? '2h 00m' : '1 Season';
    let rating = 8.0;
    let director = '';
    let cast: string[] = [];
    let ageRating = 'U/A 13+';
    let seasons: SeasonDraft[] | undefined = undefined;

    // A. Provider: IMDb via Cinemeta + OMDb
    if (providerId.startsWith('imdb:')) {
      const imdbId = providerId.replace('imdb:', '');

      // 1. Fetch Cinemeta for rich metadata, backdrops, trailer streams, and episodes
      try {
        const cinemetaType = type === 'SERIES' ? 'series' : 'movie';
        const cinemetaRes = await fetch(`https://v3-cinemeta.strem.io/meta/${cinemetaType}/${imdbId}.json`, {
          signal: AbortSignal.timeout(6000)
        });
        if (cinemetaRes.ok) {
          const cData = await cinemetaRes.json();
          const meta = cData.meta || {};

          title = meta.name || title;
          if (meta.year) {
            const yr = parseInt(String(meta.year).split('-')[0], 10);
            if (!isNaN(yr)) releaseYear = yr;
          }
          description = meta.description || description;
          if (meta.background) backdrop = meta.background;
          if (meta.poster) poster = meta.poster;

          if (meta.genres && Array.isArray(meta.genres)) {
            genres = meta.genres;
          } else if (meta.genre && Array.isArray(meta.genre)) {
            genres = meta.genre;
          }

          if (meta.runtime) runtime = meta.runtime;
          if (meta.imdbRating) rating = parseFloat(meta.imdbRating) || 8.0;
          if (meta.director && Array.isArray(meta.director)) director = meta.director.join(', ');
          if (meta.cast && Array.isArray(meta.cast)) cast = meta.cast.slice(0, 8);

          // Trailer
          if (meta.trailerStreams && meta.trailerStreams.length > 0) {
            const yt = meta.trailerStreams.find((t: any) => t.ytId);
            if (yt) trailerUrl = `https://www.youtube.com/watch?v=${yt.ytId}`;
          } else if (meta.trailers && meta.trailers.length > 0) {
            const tr = meta.trailers.find((t: any) => t.source);
            if (tr) trailerUrl = `https://www.youtube.com/watch?v=${tr.source}`;
          }

          // Series episodes & seasons
          if (type === 'SERIES' && meta.videos && Array.isArray(meta.videos)) {
            const seasonMap = new Map<number, SeasonEpisodeDraft[]>();
            for (const v of meta.videos) {
              const sNum = v.season || 1;
              const epNum = v.number || v.episode || 1;
              if (sNum === 0) continue; // Skip specials/season 0 if any

              if (!seasonMap.has(sNum)) {
                seasonMap.set(sNum, []);
              }

              seasonMap.get(sNum)!.push({
                episodeNumber: epNum,
                title: v.name || v.title || `Episode ${epNum}`,
                description: v.overview || v.description || '',
                thumbnail: v.thumbnail || poster || '',
                duration: v.duration ? `${v.duration}m` : '45m',
                durationSeconds: (v.duration ? parseInt(v.duration, 10) : 45) * 60
              });
            }

            seasons = Array.from(seasonMap.entries())
              .sort(([a], [b]) => a - b)
              .map(([seasonNumber, episodes]) => ({
                seasonNumber,
                title: `Season ${seasonNumber}`,
                episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber)
              }));

            if (seasons.length > 0) {
              runtime = `${seasons.length} Season${seasons.length > 1 ? 's' : ''}`;
            }
          }
        }
      } catch (err) {
        console.warn('Cinemeta fetch warning:', (err as any).message);
      }

      // 2. Fetch OMDb for additional details (synopsis, high-res poster, age rating, language, director)
      if (config.omdbApiKey) {
        const omdbApiKey = config.omdbApiKey;
        try {
          const omdbRes = await fetch(`https://www.omdbapi.com/?i=${imdbId}&plot=full&apikey=${omdbApiKey}`, {
            signal: AbortSignal.timeout(5000)
          });
          if (omdbRes.ok) {
            const omdb = await omdbRes.json();
          if (omdb.Response === 'True') {
            if (!title) title = omdb.Title;
            if (omdb.Year && !releaseYear) releaseYear = parseInt(omdb.Year.split('–')[0], 10);
            if (!description || description.length < (omdb.Plot || '').length) {
              description = omdb.Plot && omdb.Plot !== 'N/A' ? omdb.Plot : description;
            }
            if (omdb.Poster && omdb.Poster !== 'N/A') {
              // High quality IMDb poster
              poster = omdb.Poster;
            }
            if (omdb.Rated && omdb.Rated !== 'N/A') {
              ageRating = omdb.Rated;
            }
            if (omdb.Language && omdb.Language !== 'N/A') {
              language = omdb.Language.split(',')[0].trim();
            }
            if (omdb.Genre && omdb.Genre !== 'N/A' && genres.length === 0) {
              genres = omdb.Genre.split(',').map((g: string) => g.trim());
            }
            if (omdb.Director && omdb.Director !== 'N/A' && !director) {
              director = omdb.Director;
            }
            if (omdb.Actors && omdb.Actors !== 'N/A' && cast.length === 0) {
              cast = omdb.Actors.split(',').map((a: string) => a.trim());
            }
            if (omdb.Runtime && omdb.Runtime !== 'N/A' && !runtime) {
              runtime = omdb.Runtime;
            }
            if (omdb.imdbRating && omdb.imdbRating !== 'N/A') {
              rating = parseFloat(omdb.imdbRating) || rating;
            }
          }
        }
      } catch (err) {
        console.warn('OMDb details fetch warning:', (err as any).message);
      }
      }
    }

    // B. Provider: TVMaze (TV Shows)
    if (providerId.startsWith('tvmaze:') || (type === 'SERIES' && (!seasons || seasons.length === 0))) {
      const showId = providerId.startsWith('tvmaze:') ? providerId.replace('tvmaze:', '') : null;
      try {
        let url = showId
          ? `https://api.tvmaze.com/shows/${showId}?embed[]=episodes&embed[]=cast`
          : (title ? `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}&embed[]=episodes&embed[]=cast` : null);

        if (url) {
          const tmRes = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (tmRes.ok) {
            const show = await tmRes.json();
            if (!title) title = show.name;
            if (show.premiered && !releaseYear) releaseYear = parseInt(show.premiered.split('-')[0], 10);
            if (!description) description = stripHtml(show.summary);
            if (!poster && show.image?.original) poster = show.image.original;
            if (!backdrop && show.image?.original) backdrop = show.image.original;
            if (show.genres && show.genres.length > 0 && genres.length === 0) genres = show.genres;
            if (show.rating?.average && !rating) rating = Number(show.rating.average);
            if (show.language && !language) language = show.language;

            // Episodes
            const episodesList = show._embedded?.episodes;
            if (Array.isArray(episodesList) && (!seasons || seasons.length === 0)) {
              const seasonMap = new Map<number, SeasonEpisodeDraft[]>();
              for (const ep of episodesList) {
                const sNum = ep.season || 1;
                if (!seasonMap.has(sNum)) seasonMap.set(sNum, []);

                seasonMap.get(sNum)!.push({
                  episodeNumber: ep.number || 1,
                  title: ep.name || `Episode ${ep.number}`,
                  description: stripHtml(ep.summary) || '',
                  thumbnail: ep.image?.medium || ep.image?.original || poster || '',
                  duration: ep.runtime ? `${ep.runtime}m` : '45m',
                  durationSeconds: (ep.runtime || 45) * 60
                });
              }

              seasons = Array.from(seasonMap.entries())
                .sort(([a], [b]) => a - b)
                .map(([seasonNumber, eps]) => ({
                  seasonNumber,
                  title: `Season ${seasonNumber}`,
                  episodes: eps.sort((a, b) => a.episodeNumber - b.episodeNumber)
                }));

              if (seasons.length > 0) {
                runtime = `${seasons.length} Season${seasons.length > 1 ? 's' : ''}`;
              }
            }

            // Cast
            if (show._embedded?.cast && Array.isArray(show._embedded.cast) && cast.length === 0) {
              cast = show._embedded.cast.slice(0, 8).map((c: any) => c.person?.name).filter(Boolean);
            }
          }
        }
      } catch (err) {
        console.warn('TVMaze details fetch warning:', (err as any).message);
      }
    }

    // C. Provider: TMDB (if TMDB providerId or key configured)
    if (providerId.startsWith('tmdb:') && config.tmdbApiKey) {
      const parts = providerId.split(':');
      const tmdbType = parts[1]; // movie or tv
      const tmdbId = parts[2];

      try {
        const tmdbUrl = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${config.tmdbApiKey}&append_to_response=videos,credits`;
        const tmdbRes = await fetch(tmdbUrl, { signal: AbortSignal.timeout(6000) });
        if (tmdbRes.ok) {
          const tmdb = await tmdbRes.json();
          title = tmdb.title || tmdb.name || title;
          tagline = tmdb.tagline || tagline;
          description = tmdb.overview || description;
          if (tmdb.poster_path) poster = `https://image.tmdb.org/t/p/w780${tmdb.poster_path}`;
          if (tmdb.backdrop_path) backdrop = `https://image.tmdb.org/t/p/original${tmdb.backdrop_path}`;

          const dateStr = tmdb.release_date || tmdb.first_air_date || '';
          if (dateStr) releaseYear = parseInt(dateStr.split('-')[0], 10);

          if (tmdb.genres && Array.isArray(tmdb.genres)) {
            genres = tmdb.genres.map((g: any) => g.name);
          }

          if (tmdb.runtime) runtime = formatMinutes(tmdb.runtime);
          if (tmdb.vote_average) rating = Number(tmdb.vote_average.toFixed(1));

          // Director
          if (tmdb.credits?.crew && Array.isArray(tmdb.credits.crew)) {
            const dir = tmdb.credits.crew.find((c: any) => c.job === 'Director');
            if (dir) director = dir.name;
          } else if (tmdb.created_by && Array.isArray(tmdb.created_by) && tmdb.created_by.length > 0) {
            director = tmdb.created_by.map((c: any) => c.name).join(', ');
          }

          // Cast
          if (tmdb.credits?.cast && Array.isArray(tmdb.credits.cast)) {
            cast = tmdb.credits.cast.slice(0, 8).map((c: any) => c.name);
          }

          // Trailer
          if (tmdb.videos?.results && Array.isArray(tmdb.videos.results)) {
            const ytTrailer = tmdb.videos.results.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
                              tmdb.videos.results.find((v: any) => v.site === 'YouTube');
            if (ytTrailer) {
              trailerUrl = `https://www.youtube.com/watch?v=${ytTrailer.key}`;
            }
          }

          // If TV and has seasons
          if (tmdbType === 'tv' && tmdb.seasons && Array.isArray(tmdb.seasons)) {
            const seasonDrafts: SeasonDraft[] = [];
            for (const s of tmdb.seasons) {
              if (s.season_number === 0) continue; // skip specials
              seasonDrafts.push({
                seasonNumber: s.season_number,
                title: s.name || `Season ${s.season_number}`,
                episodes: []
              });
            }
            if (seasonDrafts.length > 0) {
              seasons = seasonDrafts;
              runtime = `${seasonDrafts.length} Season${seasonDrafts.length > 1 ? 's' : ''}`;
            }
          }
        }
      } catch (err) {
        console.warn('TMDB details fetch warning:', (err as any).message);
      }
    }

    // Artwork Fallback: if backdrop is missing, use poster as backdrop or vice versa
    if (!backdrop && poster) backdrop = poster;
    if (!poster && backdrop) poster = backdrop;

    // FLOPSHOW Default Pricing: ₹10 for Movie, ₹20 for Series
    const suggestedPriceRupees = type === 'MOVIE' ? 10 : 20;

    // Check duplicate in FLOPSHOW database
    const slug = generateSlug(title || 'untitled', releaseYear);
    const existing = db.prepare(`
      SELECT id, title, release_year, type FROM content 
      WHERE (LOWER(title) = LOWER(?) AND release_year = ? AND type = ?)
         OR slug = ?
         OR id = ?
      LIMIT 1;
    `).get(title, releaseYear, type, slug, slug) as any;

    return {
      providerId,
      title,
      slug,
      type,
      releaseYear,
      description,
      tagline,
      about: description,
      poster,
      backdrop,
      trailerUrl,
      language: language || 'Hindi',
      genres: genres.length > 0 ? genres : ['Drama'],
      runtime: runtime || (type === 'MOVIE' ? '2h 00m' : '1 Season'),
      rating: rating || 8.0,
      director,
      cast,
      ageRating,
      suggestedPriceRupees,
      status: 'DRAFT',
      featured: false,
      trending: false,
      alreadyExists: Boolean(existing),
      existingContentId: existing ? existing.id : undefined,
      seasons
    };
  },

  /**
   * Import verified content directly into FLOPSHOW central database
   */
  importContent(payload: ImportPayload): {
    success: boolean;
    contentId: string;
    title: string;
    type: 'MOVIE' | 'SERIES';
    seasonsCount: number;
    episodesCount: number;
  } {
    const db = getDatabase();

    const title = payload.title.trim();
    if (!title) {
      throw new Error('Title is required for import.');
    }

    const releaseYear = Number(payload.releaseYear) || new Date().getFullYear();
    const type = payload.type === 'SERIES' ? 'SERIES' : 'MOVIE';
    const slug = payload.slug || generateSlug(title, releaseYear);

    // Duplicate detection check
    const existingItem = db.prepare(`
      SELECT id, title, release_year, type, slug FROM content 
      WHERE (LOWER(title) = LOWER(?) AND release_year = ? AND type = ?)
         OR slug = ?
         OR id = ?
      LIMIT 1;
    `).get(title, releaseYear, type, slug, slug) as any;

    if (existingItem && !payload.overwrite) {
      throw new Error(
        `Duplicate content detected: "${title}" (${releaseYear}) is already in your FLOPSHOW catalog with ID: "${existingItem.id}".`
      );
    }

    // Default FLOPSHOW price in paise: ₹10 (1000 paise) for Movie, ₹20 (2000 paise) for Series
    const defaultPriceRupees = type === 'MOVIE' ? 10 : 20;
    const finalPriceRupees = payload.priceRupees !== undefined ? Number(payload.priceRupees) : defaultPriceRupees;
    const pricePaise = Math.round(finalPriceRupees * 100);

    // Default safe defaults:
    // Status: PUBLISHED (Immediately active in FLOPSHOW catalog)
    // Featured: 0 (OFF)
    // Trending: null (OFF)
    // Main video / Episode video: null / blank (Main Video left blank for admin manual upload/configuration)
    const contentId = slug;

    // Resolve or Auto-Create Genres in genres table
    const genreIds: string[] = [];
    if (payload.genres && Array.isArray(payload.genres)) {
      for (const gName of payload.genres) {
        const cleanName = gName.trim();
        if (!cleanName) continue;
        const gSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const existingGenre = db.prepare('SELECT id FROM genres WHERE LOWER(name) = LOWER(?) OR slug = ?').get(cleanName, gSlug) as any;

        if (existingGenre) {
          genreIds.push(existingGenre.id);
        } else {
          const newGenreId = `genre-${gSlug}`;
          contentRepository.createGenre(newGenreId, cleanName, gSlug);
          genreIds.push(newGenreId);
        }
      }
    }

    // If overwriting existing, delete old record first
    if (existingItem && payload.overwrite) {
      contentRepository.deleteContent(existingItem.id);
    }

    // Create central content record
    const record: Omit<ContentRecord, 'created_at' | 'updated_at'> = {
      id: contentId,
      type,
      title,
      slug,
      description: payload.description || '',
      poster: payload.poster,
      backdrop: payload.backdrop || payload.poster,
      trailer_url: payload.trailerUrl || null,
      video_url: null, // MAIN VIDEO IS BLANK
      price: pricePaise,
      language: payload.language || 'Hindi',
      release_year: releaseYear,
      duration: payload.duration || (type === 'MOVIE' ? '2h 00m' : '1 Season'),
      age_rating: payload.ageRating || 'U/A 13+',
      status: payload.status || 'PUBLISHED', // PUBLISHED (Auto-published to catalog)
      featured: 0,     // FEATURED OFF
      trending_position: null, // TRENDING OFF
      display_priority: 0,
      category_label: type === 'MOVIE' ? 'IMPORTED MOVIE' : 'IMPORTED SERIES',
      tagline: payload.tagline || null,
      about: payload.about || payload.description || null,
      rating: payload.rating ? Number(payload.rating) : 8.0,
      director: payload.director || null,
      cast_json: JSON.stringify(payload.cast || [])
    };

    contentRepository.createContent(record, genreIds);

    // If SERIES and seasons/episodes supplied, import seasons and episodes structure
    let seasonsCount = 0;
    let episodesCount = 0;

    if (type === 'SERIES' && payload.seasons && Array.isArray(payload.seasons)) {
      for (const s of payload.seasons) {
        seasonsCount++;
        const seasonId = `${contentId}-s${s.seasonNumber}`;
        contentRepository.createSeason({
          id: seasonId,
          contentId,
          seasonNumber: s.seasonNumber,
          title: s.title || `Season ${s.seasonNumber}`
        });

        if (s.episodes && Array.isArray(s.episodes)) {
          for (const ep of s.episodes) {
            episodesCount++;
            const epId = `${seasonId}-e${ep.episodeNumber}`;
            contentRepository.createEpisode({
              id: epId,
              seasonId,
              episodeNumber: ep.episodeNumber,
              title: ep.title || `Episode ${ep.episodeNumber}`,
              description: ep.description || '',
              thumbnail: ep.thumbnail || payload.poster || '',
              duration: ep.duration || '45m',
              durationSeconds: ep.durationSeconds || 2700,
              videoUrl: '' // MAIN EPISODE VIDEO LEFT BLANK / UNCONFIGURED
            });
          }
        }
      }
    }

    return {
      success: true,
      contentId,
      title,
      type,
      seasonsCount,
      episodesCount
    };
  }
};

import { ContentItem } from '../types/content';
import { POPULAR_SERIES_CATALOG } from './series';
import { POPULAR_MOVIES_CATALOG } from './movies';

/**
 * FLOPSHOW CATALOG
 * Populated with top popular Indian & global series and cinema with complete canonical metadata,
 * multi-season episodes, and high-res assets.
 */
export { POPULAR_SERIES_CATALOG };
export { POPULAR_MOVIES_CATALOG };
export const DEMO_CATALOG: ContentItem[] = [...POPULAR_SERIES_CATALOG, ...POPULAR_MOVIES_CATALOG];

export const GENRE_LIST = [
  "All",
  "Action",
  "Adventure",
  "Animation",
  "Biography",
  "Comedy",
  "Crime",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "War",
  "Marvel",
  "DC",
  "HBO",
  "Warner Bros.",
  "Universal Pictures",
  "Sony Pictures",
  "Paramount Pictures",
  "Disney",
  "Spider-Man"
];

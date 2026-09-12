import { contentRepository, ContentRecord, GenreRecord, SeasonRecord } from '../repositories/contentRepository.js';

export interface ContentDetailsResponse extends ContentRecord {
  seasons?: SeasonRecord[];
}

export const contentService = {
  listPublished(filters: {
    type?: 'MOVIE' | 'SERIES';
    genreSlug?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  } = {}): ContentRecord[] {
    return contentRepository.list({
      ...filters,
      status: 'PUBLISHED'
    });
  },

  getFeatured(): ContentRecord[] {
    return contentRepository.list({
      status: 'PUBLISHED',
      featured: true,
      limit: 5
    });
  },

  getDetails(idOrSlug: string): ContentDetailsResponse | null {
    const item = contentRepository.findByIdOrSlug(idOrSlug);
    if (!item) return null;

    if (item.type === 'SERIES') {
      const seasons = contentRepository.getSeasonsWithEpisodes(item.id);
      return {
        ...item,
        seasons
      };
    }

    return item;
  },

  search(
    query: string,
    options: { type?: 'MOVIE' | 'SERIES'; genreSlug?: string } = {}
  ): ContentRecord[] {
    return contentRepository.search(query, options);
  },

  getGenres(): GenreRecord[] {
    return contentRepository.getAllGenres();
  }
};

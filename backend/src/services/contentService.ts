import { contentRepository, ContentRecord, GenreRecord, SeasonRecord } from '../repositories/contentRepository.js';

export interface ContentDetailsResponse extends ContentRecord {
  seasons?: SeasonRecord[];
}

export const contentService = {
  async listPublished(
    filters: {
      type?: 'MOVIE' | 'SERIES';
      genreSlug?: string;
      featured?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ContentRecord[]> {
    return contentRepository.list({
      ...filters,
      status: 'PUBLISHED',
    });
  },

  async getFeatured(): Promise<ContentRecord[]> {
    return contentRepository.list({
      status: 'PUBLISHED',
      featured: true,
      limit: 5,
    });
  },

  async getDetails(idOrSlug: string): Promise<ContentDetailsResponse | null> {
    const item = await contentRepository.findByIdOrSlug(idOrSlug);
    if (!item) return null;

    if (item.type === 'SERIES') {
      const seasons = await contentRepository.getSeasonsWithEpisodes(item.id);
      return { ...item, seasons };
    }

    return item;
  },

  async search(
    query: string,
    options: { type?: 'MOVIE' | 'SERIES'; genreSlug?: string } = {}
  ): Promise<ContentRecord[]> {
    return contentRepository.search(query, options);
  },

  async getGenres(): Promise<GenreRecord[]> {
    return contentRepository.getAllGenres();
  },

  async getHero(): Promise<ContentRecord | null> {
    return contentRepository.getHero();
  },

  async getSpotlight(): Promise<ContentRecord | null> {
    return contentRepository.getSpotlight();
  },
};

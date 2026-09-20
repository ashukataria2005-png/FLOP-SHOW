import { getAdapter } from '../db/adapter.js';
import crypto from 'crypto';

export interface ContentProviderMapping {
  id: string;
  content_id: string;
  provider: string;
  external_id: string;
  media_type: 'movie' | 'tv';
  created_at: string;
  updated_at: string;
}

// Canonical default mappings for standard FLOPSHOW catalog titles (using verified TMDB IDs)
const CANONICAL_CATALOG_MAPPINGS: Record<string, { externalId: string; mediaType: 'movie' | 'tv' }> = {
  // Movies
  'the-dark-knight-2008': { externalId: '155', mediaType: 'movie' },
  'the-dark-knight': { externalId: '155', mediaType: 'movie' },
  'oppenheimer-2023': { externalId: '872585', mediaType: 'movie' },
  'oppenheimer': { externalId: '872585', mediaType: 'movie' },
  'batman-begins-2005': { externalId: '272', mediaType: 'movie' },
  'batman-begins': { externalId: '272', mediaType: 'movie' },
  'fight-club-1999': { externalId: '550', mediaType: 'movie' },
  'fight-club': { externalId: '550', mediaType: 'movie' },
  'spider-man-far-from-home-2019': { externalId: '429617', mediaType: 'movie' },
  'rrr-2022': { externalId: '579974', mediaType: 'movie' },
  'rrr': { externalId: '579974', mediaType: 'movie' },
  'drishyam-2015': { externalId: '360814', mediaType: 'movie' },
  'drishyam': { externalId: '360814', mediaType: 'movie' },
  'afterglow-2025': { externalId: '155', mediaType: 'movie' },
  'afterglow': { externalId: '155', mediaType: 'movie' },
  'winter-signal-2024': { externalId: '550', mediaType: 'movie' },
  'winter-signal': { externalId: '550', mediaType: 'movie' },
  'harry-potter-and-the-deathly-hallows-part-2-2011': { externalId: '12445', mediaType: 'movie' },
  'harry-potter-and-the-sorcerer-s-stone-2001': { externalId: '671', mediaType: 'movie' },
  "you-don-t-know-jack-2010": { externalId: '38167', mediaType: 'movie' },

  // Series
  'sacred-games': { externalId: '79352', mediaType: 'tv' },
  'sacred-games-2018': { externalId: '79352', mediaType: 'tv' },
  'vikings-2013': { externalId: '44217', mediaType: 'tv' },
  'vikings': { externalId: '44217', mediaType: 'tv' },
  'dark': { externalId: '70523', mediaType: 'tv' },
  'dark-2017': { externalId: '70523', mediaType: 'tv' },
  'succession': { externalId: '76331', mediaType: 'tv' },
  'succession-2018': { externalId: '76331', mediaType: 'tv' },
  'the-office-2005': { externalId: '2316', mediaType: 'tv' },
  'the-office': { externalId: '2316', mediaType: 'tv' },
  'taaza-khabar-2023': { externalId: '216262', mediaType: 'tv' },
  'taaza-khabar': { externalId: '216262', mediaType: 'tv' },
  'the-family-man': { externalId: '93741', mediaType: 'tv' },
  'scam-1992-the-harshad-mehta-story-2020': { externalId: '110972', mediaType: 'tv' },
  'scam-1992': { externalId: '110972', mediaType: 'tv' }
};

export const contentProviderMappingRepository = {
  /**
   * Get external provider mapping for a FLOPSHOW content item
   */
  async getMapping(contentId: string, provider: string = 'CINEPRO'): Promise<ContentProviderMapping | null> {
    const db = getAdapter();
    const cleanId = contentId.trim();

    // 1. Query database mapping table first
    const { rows } = await db.query(
      `SELECT * FROM content_provider_mappings WHERE content_id = ? AND provider = ?`,
      [cleanId, provider]
    );

    if (rows && rows.length > 0) {
      return rows[0] as ContentProviderMapping;
    }

    // Also check by slug if contentId was a slug or id
    const { rows: contentRows } = await db.query(
      `SELECT id, slug, type FROM content WHERE id = ? OR slug = ?`,
      [cleanId, cleanId]
    );

    if (contentRows && contentRows.length > 0) {
      const content = contentRows[0];
      if (content.id !== cleanId) {
        const { rows: mappedRows } = await db.query(
          `SELECT * FROM content_provider_mappings WHERE content_id = ? AND provider = ?`,
          [content.id, provider]
        );
        if (mappedRows && mappedRows.length > 0) {
          return mappedRows[0] as ContentProviderMapping;
        }
      }

      // Check canonical catalog fallback
      const canonical = CANONICAL_CATALOG_MAPPINGS[content.slug] || CANONICAL_CATALOG_MAPPINGS[content.id];
      if (canonical) {
        return {
          id: `cpm-canonical-${content.id}`,
          content_id: content.id,
          provider,
          external_id: canonical.externalId,
          media_type: canonical.mediaType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    }

    // Direct canonical key check
    const directCanonical = CANONICAL_CATALOG_MAPPINGS[cleanId];
    if (directCanonical) {
      return {
        id: `cpm-canonical-${cleanId}`,
        content_id: cleanId,
        provider,
        external_id: directCanonical.externalId,
        media_type: directCanonical.mediaType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    // If cleanId is already numeric (e.g. user passed TMDB ID directly)
    if (/^\d{1,20}$/.test(cleanId)) {
      return {
        id: `cpm-numeric-${cleanId}`,
        content_id: cleanId,
        provider,
        external_id: cleanId,
        media_type: 'movie',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    return null;
  },

  /**
   * Store or update a content provider mapping
   */
  async setMapping(
    contentId: string,
    externalId: string,
    mediaType: 'movie' | 'tv' = 'movie',
    provider: string = 'CINEPRO'
  ): Promise<ContentProviderMapping> {
    const db = getAdapter();
    const now = new Date().toISOString();
    const id = `cpm-${crypto.randomUUID()}`;

    await db.query(
      `INSERT INTO content_provider_mappings (id, content_id, provider, external_id, media_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (content_id, provider) DO UPDATE SET
         external_id = EXCLUDED.external_id,
         media_type = EXCLUDED.media_type,
         updated_at = EXCLUDED.updated_at`,
      [id, contentId, provider, externalId, mediaType, now, now]
    );

    const mapping = await this.getMapping(contentId, provider);
    return mapping!;
  },

  /**
   * Resolve external TMDB ID from contentId, title, or catalog fallbacks
   */
  async resolveExternalId(
    contentId: string,
    mediaType: 'movie' | 'tv' = 'movie',
    title?: string,
    provider: string = 'CINEPRO'
  ): Promise<string | null> {
    const mapping = await this.getMapping(contentId, provider);
    if (mapping?.external_id) {
      return mapping.external_id;
    }

    if (title) {
      const normalizedTitle = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const byTitle = CANONICAL_CATALOG_MAPPINGS[normalizedTitle];
      if (byTitle) {
        return byTitle.externalId;
      }
    }

    if (/^\d{1,20}$/.test(contentId)) {
      return contentId;
    }

    return null;
  },

  /**
   * Remove a mapping
   */
  async deleteMapping(contentId: string, provider: string = 'CINEPRO'): Promise<void> {
    const db = getAdapter();
    await db.query(
      `DELETE FROM content_provider_mappings WHERE content_id = ? AND provider = ?`,
      [contentId, provider]
    );
  }
};

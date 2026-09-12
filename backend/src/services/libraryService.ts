import crypto from 'crypto';
import { libraryRepository, WatchProgressRecord, WatchHistoryRecord } from '../repositories/libraryRepository.js';
import { purchaseRepository, PurchaseRecord } from '../repositories/purchaseRepository.js';
import { contentRepository, ContentRecord } from '../repositories/contentRepository.js';

export const libraryService = {
  // Purchases
  getPurchases(userId: string): PurchaseRecord[] {
    return purchaseRepository.getPurchasesByUser(userId);
  },

  // My List
  getMyList(userId: string): ContentRecord[] {
    return libraryRepository.getMyList(userId);
  },

  isInMyList(userId: string, contentId: string): boolean {
    const item = contentRepository.findByIdOrSlug(contentId);
    if (!item) return false;
    return libraryRepository.isInMyList(userId, item.id);
  },

  toggleMyList(userId: string, contentId: string): { inList: boolean; contentId: string } {
    const item = contentRepository.findByIdOrSlug(contentId);
    if (!item) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const exists = libraryRepository.isInMyList(userId, item.id);
    if (exists) {
      libraryRepository.removeFromMyList(userId, item.id);
      return { inList: false, contentId: item.id };
    } else {
      const id = `ml-${crypto.randomUUID()}`;
      libraryRepository.addToMyList(id, userId, item.id, new Date().toISOString());
      return { inList: true, contentId: item.id };
    }
  },

  // Watch Progress
  saveProgress(
    userId: string,
    params: {
      contentId: string;
      episodeId?: string | null;
      progressPercent: number;
      currentTimeSeconds: number;
      durationSeconds: number;
    }
  ): void {
    const item = contentRepository.findByIdOrSlug(params.contentId);
    if (!item) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const now = new Date().toISOString();
    const isCompleted = params.progressPercent >= 90 ? 1 : 0;
    const progressId = `wp-${crypto.randomUUID()}`;

    libraryRepository.saveProgress({
      id: progressId,
      userId,
      contentId: item.id,
      episodeId: params.episodeId || null,
      progressPercent: Math.min(100, Math.max(0, Math.round(params.progressPercent))),
      currentTimeSeconds: Math.max(0, Math.round(params.currentTimeSeconds)),
      durationSeconds: Math.max(0, Math.round(params.durationSeconds)),
      completed: isCompleted,
      updatedAt: now
    });

    // Also record into watch history
    const historyId = `wh-${crypto.randomUUID()}`;
    libraryRepository.addHistory(historyId, userId, item.id, params.episodeId || null, now);
  },

  getProgress(userId: string, contentId: string, episodeId?: string | null): WatchProgressRecord | null {
    const item = contentRepository.findByIdOrSlug(contentId);
    if (!item) return null;
    return libraryRepository.getProgress(userId, item.id, episodeId);
  },

  getAllProgress(userId: string): WatchProgressRecord[] {
    return libraryRepository.getAllProgressForUser(userId);
  },

  // Watch History
  getHistory(userId: string, limit: number = 30): WatchHistoryRecord[] {
    return libraryRepository.getHistory(userId, limit);
  }
};

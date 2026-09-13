import crypto from 'crypto';
import { libraryRepository, WatchProgressRecord, WatchHistoryRecord } from '../repositories/libraryRepository.js';
import { purchaseRepository, PurchaseRecord } from '../repositories/purchaseRepository.js';
import { contentRepository, ContentRecord } from '../repositories/contentRepository.js';

export const libraryService = {
  // Purchases
  async getPurchases(userId: string): Promise<PurchaseRecord[]> {
    return purchaseRepository.getPurchasesByUser(userId);
  },

  // My List
  async getMyList(userId: string): Promise<ContentRecord[]> {
    return libraryRepository.getMyList(userId);
  },

  async isInMyList(userId: string, contentId: string): Promise<boolean> {
    const item = await contentRepository.findByIdOrSlug(contentId);
    if (!item) return false;
    return libraryRepository.isInMyList(userId, item.id);
  },

  async toggleMyList(userId: string, contentId: string): Promise<{ inList: boolean; contentId: string }> {
    const item = await contentRepository.findByIdOrSlug(contentId);
    if (!item) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const exists = await libraryRepository.isInMyList(userId, item.id);
    if (exists) {
      await libraryRepository.removeFromMyList(userId, item.id);
      return { inList: false, contentId: item.id };
    } else {
      const id = `ml-${crypto.randomUUID()}`;
      await libraryRepository.addToMyList(id, userId, item.id, new Date().toISOString());
      return { inList: true, contentId: item.id };
    }
  },

  // Watch Progress
  async saveProgress(
    userId: string,
    params: {
      contentId: string;
      episodeId?: string | null;
      progressPercent: number;
      currentTimeSeconds: number;
      durationSeconds: number;
    }
  ): Promise<void> {
    const item = await contentRepository.findByIdOrSlug(params.contentId);
    if (!item) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const now = new Date().toISOString();
    const isCompleted = params.progressPercent >= 90 ? 1 : 0;
    const progressId = `wp-${crypto.randomUUID()}`;

    await libraryRepository.saveProgress({
      id: progressId,
      userId,
      contentId: item.id,
      episodeId: params.episodeId || null,
      progressPercent: Math.min(100, Math.max(0, Math.round(params.progressPercent))),
      currentTimeSeconds: Math.max(0, Math.round(params.currentTimeSeconds)),
      durationSeconds: Math.max(0, Math.round(params.durationSeconds)),
      completed: isCompleted,
      updatedAt: now,
    });

    // Also record into watch history
    const historyId = `wh-${crypto.randomUUID()}`;
    await libraryRepository.addHistory(historyId, userId, item.id, params.episodeId || null, now);
  },

  async getProgress(
    userId: string,
    contentId: string,
    episodeId?: string | null
  ): Promise<WatchProgressRecord | null> {
    const item = await contentRepository.findByIdOrSlug(contentId);
    if (!item) return null;
    return libraryRepository.getProgress(userId, item.id, episodeId);
  },

  async getAllProgress(userId: string): Promise<WatchProgressRecord[]> {
    return libraryRepository.getAllProgressForUser(userId);
  },

  // Watch History
  async getHistory(userId: string, limit = 30): Promise<WatchHistoryRecord[]> {
    return libraryRepository.getHistory(userId, limit);
  },
};

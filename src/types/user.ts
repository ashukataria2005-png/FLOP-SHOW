export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  joinedDate: string;
  role?: 'USER' | 'ADMIN';
}

export interface WatchProgress {
  contentId: string;
  contentType: 'movie' | 'series';
  title: string;
  posterUrl: string;
  percent: number; // 0 - 100
  currentTime: number; // in seconds
  duration: number; // in seconds
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  completed?: boolean;
  updatedAt: string;
}

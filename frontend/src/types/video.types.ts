// Matches backend/src/models/video.model.ts and video-category.model.ts exactly

export interface VideoCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** List view — description excluded by the API (.select("-description")) */
export interface VideoListItem {
  _id: string;
  title: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  thumbnail?: string;
  category: VideoCategory;
  publishedAt: string;
  duration?: string;
  tags: string[];
  isVisible: boolean;
  isFeatured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Full detail — all fields */
export interface Video extends VideoListItem {
  description?: string;
}

// ── Query params for GET /api/videos ─────────────────────────────────────────

export type VideoSortKey = 'newest' | 'oldest' | 'featured' | 'views';

export interface VideosQuery {
  search?: string;
  category?: string;    // VideoCategory ObjectId string
  isVisible?: boolean;
  isFeatured?: boolean;
  sort?: VideoSortKey;
  page?: number;
  limit?: number;
}

// ── YouTube helpers ───────────────────────────────────────────────────────────

/** Build the YouTube thumbnail URL for a given video ID */
export function youtubeThumbnail(
  videoId: string,
  quality: 'default' | 'hqdefault' | 'maxresdefault' = 'hqdefault',
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/** Build the YouTube embed URL (with privacy-enhanced domain option) */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
}

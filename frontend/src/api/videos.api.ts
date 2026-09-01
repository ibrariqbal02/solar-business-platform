import apiClient from './client';
import type { ApiResponse, PaginationMeta } from '../types';
import type { Video, VideoListItem, VideoCategory, VideosQuery } from '../types/video.types';

// ─── Extended query types ─────────────────────────────────────────────────────

export interface AdminVideosQuery {
  search?: string;
  category?: string;
  /** 'true' | 'false' — omit for all */
  isVisible?: 'true' | 'false';
  isFeatured?: 'true';
  sort?: 'newest' | 'oldest' | 'featured' | 'views';
  page?: number;
  limit?: number;
}

export interface AdminVideoCategoriesQuery {
  search?: string;
  /** 'true' | 'false' — omit for all */
  active?: 'true' | 'false';
  sort?: 'newest' | 'oldest' | 'name';
  page?: number;
  limit?: number;
}

// ─── Videos API ───────────────────────────────────────────────────────────────

export const videosApi = {
  // ── Public ──────────────────────────────────────────────────────────────────

  /**
   * GET /api/videos — public list (description excluded)
   */
  getAll: (params?: VideosQuery) =>
    apiClient.get<ApiResponse<VideoListItem[]>>('/videos', { params }),

  /** GET /api/videos/id/:id — full document */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Video>>(`/videos/id/${id}`),

  /** GET /api/videos/youtube/:youtubeId */
  getByYoutubeId: (youtubeId: string) =>
    apiClient.get<ApiResponse<Video>>(`/videos/youtube/${youtubeId}`),

  // ── Admin ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/videos — admin variant with full pagination meta and string filters.
   * isVisible omitted = show all (visible and hidden).
   */
  adminGetAll: (params?: AdminVideosQuery) =>
    apiClient.get<ApiResponse<VideoListItem[]> & { pagination: PaginationMeta }>(
      '/videos',
      { params },
    ),

  /**
   * POST /api/videos
   * Body: { title, youtubeVideoId (bare ID or full URL), category, description?,
   *         thumbnail?, publishedAt?, duration?, tags?, isVisible?, isFeatured? }
   * Backend extracts the YouTube ID from any URL format.
   */
  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiResponse<Video>>('/videos', data),

  /** PUT /api/videos/:id — partial update, same fields as create */
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<ApiResponse<Video>>(`/videos/${id}`, data),

  /** DELETE /api/videos/:id — soft delete (sets isVisible = false) */
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/videos/${id}`),

  /**
   * PATCH /api/videos/:id/visibility
   * Body: { isVisible: boolean }
   */
  toggleVisibility: (id: string, isVisible: boolean) =>
    apiClient.patch<ApiResponse<{ _id: string; title: string; isVisible: boolean }>>(
      `/videos/${id}/visibility`,
      { isVisible },
    ),

  /**
   * PATCH /api/videos/:id/featured
   * Body: { isFeatured: boolean }
   */
  toggleFeatured: (id: string, isFeatured: boolean) =>
    apiClient.patch<ApiResponse<{ _id: string; title: string; isFeatured: boolean }>>(
      `/videos/${id}/featured`,
      { isFeatured },
    ),
};

// ─── Video Categories API ─────────────────────────────────────────────────────

export const videoCategoriesApi = {
  // ── Public ──────────────────────────────────────────────────────────────────

  /** GET /api/video-categories — public list */
  getAll: (params?: { active?: boolean; limit?: number }) =>
    apiClient.get<ApiResponse<VideoCategory[]>>('/video-categories', { params }),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<VideoCategory>>(`/video-categories/slug/${slug}`),

  getById: (id: string) =>
    apiClient.get<ApiResponse<VideoCategory>>(`/video-categories/id/${id}`),

  // ── Admin ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/video-categories — admin variant with full pagination + status filter.
   * Omitting 'active' returns all.
   */
  adminGetAll: (params?: AdminVideoCategoriesQuery) =>
    apiClient.get<ApiResponse<VideoCategory[]> & { pagination: PaginationMeta }>(
      '/video-categories',
      { params },
    ),

  /**
   * POST /api/video-categories
   * Body (JSON): { name*, description? }
   */
  create: (data: { name: string; description?: string }) =>
    apiClient.post<ApiResponse<VideoCategory>>('/video-categories', data),

  /**
   * PUT /api/video-categories/:id
   * Body (JSON): { name?, description?, isActive? }
   */
  update: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
    apiClient.put<ApiResponse<VideoCategory>>(`/video-categories/${id}`, data),

  /** DELETE /api/video-categories/:id — soft delete */
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/video-categories/${id}`),

  /**
   * PATCH /api/video-categories/:id/status
   * Body: { isActive: boolean }
   */
  toggleStatus: (id: string, isActive: boolean) =>
    apiClient.patch<ApiResponse<{ _id: string; name: string; isActive: boolean }>>(
      `/video-categories/${id}/status`,
      { isActive },
    ),
};

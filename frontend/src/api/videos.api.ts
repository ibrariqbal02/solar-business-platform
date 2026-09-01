import apiClient from './client';
import type { ApiResponse } from '../types';
import type { Video, VideoListItem, VideoCategory, VideosQuery } from '../types/video.types';

export const videosApi = {
  /**
   * GET /api/videos
   * Query params: search, category (ObjectId), isVisible, isFeatured,
   *               sort (newest|oldest|featured|views), page, limit
   * Note: list view omits description field.
   */
  getAll: (params?: VideosQuery) =>
    apiClient.get<ApiResponse<VideoListItem[]>>('/videos', { params }),

  /**
   * GET /api/videos/id/:id — full document including description
   */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Video>>(`/videos/id/${id}`),

  /**
   * GET /api/videos/youtube/:youtubeId
   */
  getByYoutubeId: (youtubeId: string) =>
    apiClient.get<ApiResponse<Video>>(`/videos/youtube/${youtubeId}`),

  // ── Admin ─────────────────────────────────────────────────────────────────

  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiResponse<Video>>('/videos', data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<ApiResponse<Video>>(`/videos/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/videos/${id}`),

  toggleVisibility: (id: string, isVisible: boolean) =>
    apiClient.patch<ApiResponse<Video>>(`/videos/${id}/visibility`, { isVisible }),

  toggleFeatured: (id: string, isFeatured: boolean) =>
    apiClient.patch<ApiResponse<Video>>(`/videos/${id}/featured`, { isFeatured }),
};

// ── Video Categories ──────────────────────────────────────────────────────────

export const videoCategoriesApi = {
  /**
   * GET /api/video-categories
   * Query params: active, search, sort (newest|oldest|name), page, limit
   */
  getAll: (params?: { active?: boolean; limit?: number }) =>
    apiClient.get<ApiResponse<VideoCategory[]>>('/video-categories', { params }),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<VideoCategory>>(`/video-categories/slug/${slug}`),

  getById: (id: string) =>
    apiClient.get<ApiResponse<VideoCategory>>(`/video-categories/id/${id}`),
};

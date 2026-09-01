import apiClient from './client';
import type { ApiResponse, Video } from '../types';

export interface VideosQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isPublished?: boolean;
}

export const videosApi = {
  getAll: (params?: VideosQuery) =>
    apiClient.get<ApiResponse<Video[]>>('/videos', { params }),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Video>>(`/videos/${slug}`),

  create: (data: FormData) =>
    apiClient.post<ApiResponse<Video>>('/videos', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: FormData) =>
    apiClient.put<ApiResponse<Video>>(`/videos/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/videos/${id}`),
};

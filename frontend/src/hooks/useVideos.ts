import { useQuery } from '@tanstack/react-query';
import { videosApi, videoCategoriesApi } from '../api/videos.api';
import type { VideoListItem, VideoCategory, VideosQuery } from '../types/video.types';
import type { PaginationMeta } from '../types';

// ── Video list ────────────────────────────────────────────────────────────────

export interface UseVideosResult {
  videos: VideoListItem[];
  pagination: PaginationMeta | undefined;
}

export function useVideos(params?: VideosQuery) {
  return useQuery<UseVideosResult>({
    queryKey: [
      'videos',
      params?.search ?? '',
      params?.category ?? '',
      params?.isVisible ?? '',
      params?.isFeatured ?? '',
      params?.sort ?? 'newest',
      params?.page ?? 1,
      params?.limit ?? 12,
    ],
    queryFn: async () => {
      const res = await videosApi.getAll(params);
      return {
        videos: res.data.data ?? [],
        pagination: res.data.pagination,
      };
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ── Video categories ──────────────────────────────────────────────────────────

export function useVideoCategories() {
  return useQuery<VideoCategory[]>({
    queryKey: ['video-categories'],
    queryFn: async () => {
      const res = await videoCategoriesApi.getAll({ active: true, limit: 100 });
      return res.data.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

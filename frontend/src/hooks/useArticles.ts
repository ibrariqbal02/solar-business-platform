import { useQuery } from '@tanstack/react-query';
import { articlesApi, articleCategoriesApi } from '../api/articles.api';
import type { Article, ArticleListItem, ArticleCategory, ArticlesQuery } from '../types/article.types';
import type { PaginationMeta } from '../types';

// ── Article list ──────────────────────────────────────────────────────────────

export interface UseArticlesResult {
  articles: ArticleListItem[];
  pagination: PaginationMeta | undefined;
}

export function useArticles(params?: ArticlesQuery) {
  return useQuery<UseArticlesResult>({
    queryKey: [
      'articles',
      params?.search   ?? '',
      params?.category ?? '',
      params?.status   ?? 'published',
      params?.sort     ?? 'published',
      params?.page     ?? 1,
      params?.limit    ?? 9,
    ],
    queryFn: async () => {
      const res = await articlesApi.getAll({ status: 'published', ...params });
      return {
        articles:   res.data.data ?? [],
        pagination: res.data.pagination,
      };
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ── Single article by slug ────────────────────────────────────────────────────

export function useArticle(slug: string | undefined) {
  return useQuery<Article | undefined>({
    queryKey: ['article', slug],
    queryFn: async () => {
      if (!slug) return undefined;
      const res = await articlesApi.getBySlug(slug);
      return res.data.data;
    },
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
}

// ── Article categories ────────────────────────────────────────────────────────

export function useArticleCategories() {
  return useQuery<ArticleCategory[]>({
    queryKey: ['article-categories'],
    queryFn: async () => {
      const res = await articleCategoriesApi.getAll({ active: true, limit: 100 });
      return res.data.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

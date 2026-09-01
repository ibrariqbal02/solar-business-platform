import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, Globe, GlobeLock,
  ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { articlesApi, articleCategoriesApi } from '../../api/articles.api';
import type { AdminArticlesQuery } from '../../api/articles.api';
import { QUERY_KEYS } from '../../lib/constants';
import { cn, imageUrl, formatDate, truncate } from '../../lib/utils';
import Button from '../../components/ui/Button';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import ArticleForm from './articles/ArticleForm';
import { useQuery as useArticleQuery } from '@tanstack/react-query';
import type { ArticleListItem, ArticleStatus } from '../../types/article.types';
import type { PaginationMeta } from '../../types';

const LIMIT = 15;

// ─── Status badge ─────────────────────────────────────────────────────────────

const statusConfig: Record<ArticleStatus, { label: string; cls: string }> = {
  published:   { label: 'Published',   cls: 'bg-green-100 text-green-700' },
  draft:       { label: 'Draft',       cls: 'bg-amber-100 text-amber-700' },
  unpublished: { label: 'Unpublished', cls: 'bg-gray-100  text-gray-500'  },
};

// ─── Edit wrapper ─────────────────────────────────────────────────────────────

function EditArticleWrapper({
  articleId,
  onSuccess,
  onCancel,
}: {
  articleId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { data: article, isLoading, isError } = useArticleQuery({
    queryKey: [QUERY_KEYS.articles, 'detail', articleId],
    queryFn: async () => {
      const res = await articlesApi.getById(articleId);
      return res.data.data!;
    },
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="py-6 max-w-4xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-${i === 0 ? 8 : 40} w-full animate-pulse rounded-lg bg-gray-200`} />
        ))}
      </div>
    );
  }
  if (isError || !article) {
    return (
      <div className="py-6 max-w-4xl mx-auto">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          Failed to load article.
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Back to Articles</Button>
      </div>
    );
  }
  return <ArticleForm mode="edit" article={article} onSuccess={onSuccess} onCancel={onCancel} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface DeleteTarget { id: string; title: string }

export default function AdminArticles() {
  const queryClient = useQueryClient();

  const [view, setView]         = useState<'list' | 'create' | 'edit'>('list');
  const [editId, setEditId]     = useState<string | null>(null);

  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter]   = useState<'' | ArticleStatus>('');
  const [page, setPage]                   = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  };

  const [deleteTarget, setDeleteTarget]   = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const setRowLoading = (id: string, val: boolean) =>
    setActionLoading((prev) => ({ ...prev, [id]: val }));

  // Article categories for filter dropdown
  const { data: artCategories = [] } = useQuery({
    queryKey: ['article-categories', 'dropdown'],
    queryFn: async () => {
      const res = await articleCategoriesApi.getAll({ active: true, limit: 100 });
      return res.data.data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const queryParams: AdminArticlesQuery = {
    ...(debouncedSearch  ? { search: debouncedSearch } : {}),
    ...(categoryFilter   ? { category: categoryFilter } : {}),
    ...(statusFilter     ? { status: statusFilter as ArticleStatus } : {}),
    sort: 'newest',
    page,
    limit: LIMIT,
  };

  const { data: response, isLoading, isError, isFetching } = useQuery({
    queryKey: [QUERY_KEYS.articles, 'admin-list', queryParams],
    queryFn: async () => {
      const res = await articlesApi.adminGetAll(queryParams);
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    enabled: view === 'list',
  });

  const articles: ArticleListItem[]            = response?.data ?? [];
  const pagination: PaginationMeta | undefined = response?.pagination;

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.articles] });
  }, [queryClient]);

  // ── Publish / Unpublish ───────────────────────────────────────────────────
  const handlePublish = async (a: ArticleListItem) => {
    setRowLoading(a._id, true);
    try {
      await articlesApi.publish(a._id);
      await invalidate();
    } finally { setRowLoading(a._id, false); }
  };

  const handleUnpublish = async (a: ArticleListItem) => {
    setRowLoading(a._id, true);
    try {
      await articlesApi.unpublish(a._id);
      await invalidate();
    } finally { setRowLoading(a._id, false); }
  };

  // ── Delete (soft — sets unpublished) ─────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await articlesApi.delete(deleteTarget.id);
      await invalidate();
    } finally { setDeleteLoading(false); setDeleteTarget(null); }
  };

  const hasFilters = debouncedSearch || categoryFilter || statusFilter;
  const resetFilters = () => {
    setSearch(''); setDebouncedSearch(''); setCategoryFilter(''); setStatusFilter(''); setPage(1);
  };

  // ── View routing ──────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <ArticleForm
        mode="create"
        onSuccess={async () => { await invalidate(); setView('list'); }}
        onCancel={() => setView('list')}
      />
    );
  }
  if (view === 'edit' && editId) {
    return (
      <EditArticleWrapper
        articleId={editId}
        onSuccess={async () => { await invalidate(); setView('list'); setEditId(null); }}
        onCancel={() => { setView('list'); setEditId(null); }}
      />
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          {pagination && (
            <p className="mt-0.5 text-sm text-gray-500">
              {pagination.total} article{pagination.total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setView('create')}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add New Article
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search" value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search articles…" aria-label="Search articles"
            className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          aria-label="Filter by category"
          className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
        >
          <option value="">All Categories</option>
          {artCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as '' | ArticleStatus); setPage(1); }}
          aria-label="Filter by status"
          className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="unpublished">Unpublished</option>
        </select>
        {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters}>Clear</Button>}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isFetching && !isLoading && (
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Refreshing…
          </div>
        )}
        {isError && <div className="px-6 py-8 text-center text-sm text-red-600">Failed to load articles.</div>}

        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-12 w-16 animate-pulse rounded-md bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-gray-900">No articles found</p>
            <p className="mt-1 text-sm text-gray-500">
              {hasFilters ? 'Try adjusting your filters.' : 'Write your first article.'}
            </p>
            {!hasFilters && (
              <div className="mt-4">
                <Button size="sm" onClick={() => setView('create')}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add New Article
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3">Article</th>
                  <th scope="col" className="px-3 py-3 hidden sm:table-cell">Category</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3 hidden md:table-cell">Published</th>
                  <th scope="col" className="px-3 py-3 hidden lg:table-cell">Views</th>
                  <th scope="col" className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {articles.map((a) => {
                  const rowLoading  = !!actionLoading[a._id];
                  const statusCfg   = statusConfig[a.status];
                  const thumb       = a.featuredImage;

                  return (
                    <tr key={a._id} className={cn('hover:bg-gray-50 transition-colors', a.status === 'unpublished' && 'opacity-60')}>
                      {/* Thumbnail + title */}
                      <td className="py-3 pl-4 pr-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {thumb ? (
                            <img src={imageUrl(thumb)} alt="" className="h-12 w-16 rounded-md object-cover flex-shrink-0 border border-gray-100" />
                          ) : (
                            <div className="h-12 w-16 rounded-md bg-gray-100 flex-shrink-0 border border-gray-100 flex items-center justify-center text-gray-300 text-xs">No img</div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[200px]" title={a.title}>{a.title}</p>
                            {a.excerpt && (
                              <p className="text-xs text-gray-400 truncate max-w-[200px]">{truncate(a.excerpt, 55)}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3 hidden sm:table-cell text-gray-600 whitespace-nowrap">
                        {a.category?.name ?? '—'}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', statusCfg.cls)}>
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Published date */}
                      <td className="px-3 py-3 hidden md:table-cell text-xs text-gray-500 whitespace-nowrap">
                        {a.publishedAt
                          ? formatDate(a.publishedAt, { year: 'numeric', month: 'short', day: 'numeric' })
                          : <span className="text-gray-300 italic">—</span>}
                      </td>

                      {/* Views */}
                      <td className="px-3 py-3 hidden lg:table-cell tabular-nums text-gray-600">
                        {a.viewCount.toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Publish (if draft or unpublished) */}
                          {a.status !== 'published' && (
                            <button
                              type="button"
                              onClick={() => handlePublish(a)}
                              disabled={rowLoading}
                              title="Publish"
                              aria-label={`Publish ${a.title}`}
                              className="rounded p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                            >
                              {rowLoading
                                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                : <Globe className="h-4 w-4" aria-hidden="true" />}
                            </button>
                          )}

                          {/* Unpublish (if published) */}
                          {a.status === 'published' && (
                            <button
                              type="button"
                              onClick={() => handleUnpublish(a)}
                              disabled={rowLoading}
                              title="Unpublish"
                              aria-label={`Unpublish ${a.title}`}
                              className="rounded p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                            >
                              {rowLoading
                                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                : <GlobeLock className="h-4 w-4" aria-hidden="true" />}
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => { setEditId(a._id); setView('edit'); }}
                            title="Edit" aria-label={`Edit ${a.title}`}
                            className="rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: a._id, title: a.title })}
                            disabled={rowLoading}
                            title="Delete" aria-label={`Delete ${a.title}`}
                            className="rounded p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}</span>{' '}
              of <span className="font-medium">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={!pagination.hasPrevPage} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pagination.totalPages || Math.abs(n - pagination.page) <= 1)
                .reduce<(number | '…')[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '…'
                    ? <span key={`el-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                    : <button key={item} type="button" onClick={() => setPage(item as number)}
                        aria-current={item === pagination.page ? 'page' : undefined}
                        className={cn('min-w-[28px] rounded px-1.5 py-1 text-xs font-medium transition-colors',
                          item === pagination.page ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-100')}
                      >{item}</button>
                )}
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!pagination.hasNextPage} aria-label="Next page">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        variant="danger"
        title="Delete Article"
        message={deleteTarget ? `"${deleteTarget.title}" will be unpublished and hidden from the public site. It will remain in the admin as "Unpublished" and can be republished.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => !deleteLoading && setDeleteTarget(null)}
      />
    </div>
  );
}

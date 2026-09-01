import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, Star, StarOff,
  ChevronLeft, ChevronRight, Loader2,
  Eye, EyeOff, Link,
} from 'lucide-react';
import { videosApi, videoCategoriesApi } from '../../api/videos.api';
import type { AdminVideosQuery } from '../../api/videos.api';
import { QUERY_KEYS } from '../../lib/constants';
import { cn, truncate } from '../../lib/utils';
import { youtubeThumbnail } from '../../types/video.types';
import Button from '../../components/ui/Button';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import VideoForm from './videos/VideoForm';
import type { VideoListItem } from '../../types/video.types';
import type { PaginationMeta } from '../../types';

const LIMIT = 15;

interface DeleteTarget { id: string; title: string }

export default function AdminVideos() {
  const queryClient = useQueryClient();

  // ── View state — list | create | edit ────────────────────────────────────
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editVideo, setEditVideo] = useState<VideoListItem | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'true' | 'false'>('all');
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

  // ── Categories for filter dropdown ────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['video-categories', 'dropdown'],
    queryFn: async () => {
      const res = await videoCategoriesApi.getAll({ active: true, limit: 100 });
      return res.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Videos query ──────────────────────────────────────────────────────────
  const queryParams: AdminVideosQuery = {
    ...(debouncedSearch  ? { search: debouncedSearch } : {}),
    ...(categoryFilter   ? { category: categoryFilter } : {}),
    ...(visibilityFilter !== 'all' ? { isVisible: visibilityFilter as 'true' | 'false' } : {}),
    sort: 'newest',
    page,
    limit: LIMIT,
  };

  const { data: response, isLoading, isError, isFetching } = useQuery({
    queryKey: [QUERY_KEYS.videos, 'admin-list', queryParams],
    queryFn: async () => {
      const res = await videosApi.adminGetAll(queryParams);
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    enabled: view === 'list',
  });

  const videos: VideoListItem[]                = response?.data ?? [];
  const pagination: PaginationMeta | undefined = response?.pagination;

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.videos] });
  }, [queryClient]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await videosApi.delete(deleteTarget.id);
      await invalidate();
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleVisibility = async (v: VideoListItem) => {
    setRowLoading(v._id, true);
    try {
      await videosApi.toggleVisibility(v._id, !v.isVisible);
      await invalidate();
    } finally {
      setRowLoading(v._id, false);
    }
  };

  const handleToggleFeatured = async (v: VideoListItem) => {
    setRowLoading(v._id, true);
    try {
      await videosApi.toggleFeatured(v._id, !v.isFeatured);
      await invalidate();
    } finally {
      setRowLoading(v._id, false);
    }
  };

  const hasFilters = debouncedSearch || categoryFilter || visibilityFilter !== 'all';
  const resetFilters = () => {
    setSearch(''); setDebouncedSearch(''); setCategoryFilter(''); setVisibilityFilter('all'); setPage(1);
  };

  // ── Form views ────────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <VideoForm
        mode="create"
        onSuccess={async () => { await invalidate(); setView('list'); }}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'edit' && editVideo) {
    return (
      <EditVideoWrapper
        videoId={editVideo._id}
        onSuccess={async () => { await invalidate(); setView('list'); setEditVideo(null); }}
        onCancel={() => { setView('list'); setEditVideo(null); }}
      />
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Videos</h1>
          {pagination && (
            <p className="mt-0.5 text-sm text-gray-500">
              {pagination.total} video{pagination.total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setView('create')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add New Video
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search videos…"
            aria-label="Search videos"
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
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => { setVisibilityFilter(e.target.value as 'all' | 'true' | 'false'); setPage(1); }}
          aria-label="Filter by visibility"
          className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
        >
          <option value="all">All Visibility</option>
          <option value="true">Visible</option>
          <option value="false">Hidden</option>
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
        {isError && (
          <div className="px-6 py-8 text-center text-sm text-red-600">Failed to load videos.</div>
        )}
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-12 w-20 animate-pulse rounded-md bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-gray-900">No videos found</p>
            <p className="mt-1 text-sm text-gray-500">
              {hasFilters ? 'Try adjusting your filters.' : 'Add your first video to get started.'}
            </p>
            {!hasFilters && (
              <div className="mt-4">
                <Button size="sm" onClick={() => setView('create')}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add New Video
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3">Video</th>
                  <th scope="col" className="px-3 py-3 hidden sm:table-cell">Category</th>
                  <th scope="col" className="px-3 py-3 hidden md:table-cell">Views</th>
                  <th scope="col" className="px-3 py-3">Visible</th>
                  <th scope="col" className="px-3 py-3 hidden lg:table-cell">Featured</th>
                  <th scope="col" className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {videos.map((v) => {
                  const rowLoading = !!actionLoading[v._id];
                  const thumbSrc   = v.thumbnail || youtubeThumbnail(v.youtubeVideoId, 'default');

                  return (
                    <tr key={v._id} className={cn('hover:bg-gray-50 transition-colors', !v.isVisible && 'opacity-60')}>
                      {/* Thumbnail + title */}
                      <td className="py-3 pl-4 pr-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            <img
                              src={thumbSrc}
                              alt={v.title}
                              className="h-12 w-20 rounded-md object-cover border border-gray-100"
                            />
                            {v.duration && (
                              <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] text-white font-mono">
                                {v.duration}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[200px]" title={v.title}>
                              {v.title}
                            </p>
                            <a
                              href={v.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 transition-colors mt-0.5"
                            >
                              <Link className="h-3 w-3" aria-hidden="true" />
                              {truncate(v.youtubeVideoId, 11)}
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3 hidden sm:table-cell text-gray-600 whitespace-nowrap">
                        {v.category?.name ?? '—'}
                      </td>

                      {/* View count */}
                      <td className="px-3 py-3 hidden md:table-cell tabular-nums text-gray-600">
                        {v.viewCount.toLocaleString()}
                      </td>

                      {/* Visibility */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          v.isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                        )}>
                          {v.isVisible ? 'Visible' : 'Hidden'}
                        </span>
                      </td>

                      {/* Featured */}
                      <td className="px-3 py-3 hidden lg:table-cell whitespace-nowrap">
                        {v.isFeatured ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <Star className="h-3 w-3" aria-hidden="true" /> Featured
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle featured */}
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(v)}
                            disabled={rowLoading}
                            title={v.isFeatured ? 'Unfeature' : 'Mark featured'}
                            aria-label={v.isFeatured ? `Unfeature ${v.title}` : `Feature ${v.title}`}
                            className={cn('rounded p-1.5 transition-colors disabled:opacity-40',
                              v.isFeatured
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50',
                            )}
                          >
                            {rowLoading
                              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              : v.isFeatured
                                ? <StarOff className="h-4 w-4" aria-hidden="true" />
                                : <Star    className="h-4 w-4" aria-hidden="true" />}
                          </button>

                          {/* Toggle visibility */}
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility(v)}
                            disabled={rowLoading}
                            title={v.isVisible ? 'Hide' : 'Make visible'}
                            aria-label={v.isVisible ? `Hide ${v.title}` : `Show ${v.title}`}
                            className={cn('rounded p-1.5 transition-colors disabled:opacity-40',
                              v.isVisible
                                ? 'text-green-500 hover:text-green-700 hover:bg-green-50'
                                : 'text-gray-400 hover:text-green-500 hover:bg-green-50',
                            )}
                          >
                            {rowLoading
                              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              : v.isVisible
                                ? <Eye    className="h-4 w-4" aria-hidden="true" />
                                : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => { setEditVideo(v); setView('edit'); }}
                            title="Edit"
                            aria-label={`Edit ${v.title}`}
                            className="rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: v._id, title: v.title })}
                            disabled={rowLoading}
                            title="Delete"
                            aria-label={`Delete ${v.title}`}
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

      <ConfirmationDialog
        open={!!deleteTarget}
        variant="danger"
        title="Delete Video"
        message={deleteTarget ? `"${deleteTarget.title}" will be hidden from the public gallery. The YouTube video itself is not affected.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => !deleteLoading && setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Edit wrapper — fetches full Video document before rendering form ────────

function EditVideoWrapper({
  videoId,
  onSuccess,
  onCancel,
}: {
  videoId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { data: video, isLoading, isError } = useQuery({
    queryKey: [QUERY_KEYS.videos, 'detail', videoId],
    queryFn: async () => {
      const res = await videosApi.getById(videoId);
      return res.data.data!;
    },
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="py-6 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-40 w-full animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (isError || !video) {
    return (
      <div className="py-6 max-w-3xl mx-auto">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          Failed to load video details.
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Back to Videos
        </Button>
      </div>
    );
  }

  return <VideoForm mode="edit" video={video} onSuccess={onSuccess} onCancel={onCancel} />;
}

import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight,
  Loader2, ToggleLeft, ToggleRight, X, Save,
} from 'lucide-react';
import { videoCategoriesApi } from '../../../api/videos.api';
import type { AdminVideoCategoriesQuery } from '../../../api/videos.api';
import { cn, formatDate, truncate } from '../../../lib/utils';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import ConfirmationDialog from '../../../components/ui/ConfirmationDialog';
import type { VideoCategory } from '../../../types/video.types';
import type { PaginationMeta } from '../../../types';

const LIMIT = 15;
const QUERY_KEY = 'video-categories';

// ─── Form schema ──────────────────────────────────────────────────────────────

const catSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  description: z.string().max(500, 'Max 500 characters').optional(),
});
type CatFormValues = z.infer<typeof catSchema>;

// ─── Slide-in form panel ──────────────────────────────────────────────────────

interface FormPanelProps {
  mode: 'create' | 'edit';
  initial?: VideoCategory;
  onClose: () => void;
  onSaved: () => void;
}

function FormPanel({ mode, initial, onClose, onSaved }: FormPanelProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<CatFormValues>({
      resolver: zodResolver(catSchema),
      defaultValues: {
        name:        initial?.name        ?? '',
        description: initial?.description ?? '',
      },
    });

  const onSubmit = async (values: CatFormValues) => {
    setServerError(null);
    try {
      if (mode === 'create') {
        await videoCategoriesApi.create(values);
      } else {
        await videoCategoriesApi.update(initial!._id, values);
      }
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'An error occurred');
      setServerError(msg);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            {mode === 'create' ? 'Add New Video Category' : `Edit: ${initial?.name}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="rounded p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </CardHeader>
      <CardBody>
        {serverError && (
          <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Category Name"
              required
              placeholder="e.g. Product Demos"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Description"
              placeholder="Optional short description"
              error={errors.description?.message}
              {...register('description')}
            />
          </div>
          {mode === 'edit' && initial?.slug && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Slug:</span>
              <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-mono">
                {initial.slug}
              </code>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface DeleteTarget { id: string; name: string }

export default function VideoCategoriesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter]   = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage]                   = useState(1);
  const [formMode, setFormMode]           = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget]       = useState<VideoCategory | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const setRowLoading = (id: string, val: boolean) =>
    setActionLoading((prev) => ({ ...prev, [id]: val }));

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  };

  const queryParams: AdminVideoCategoriesQuery = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(activeFilter !== 'all' ? { active: activeFilter as 'true' | 'false' } : {}),
    page,
    limit: LIMIT,
    sort: 'newest',
  };

  const { data: response, isLoading, isError, isFetching } = useQuery({
    queryKey: [QUERY_KEY, 'admin-list', queryParams],
    queryFn: async () => {
      const res = await videoCategoriesApi.adminGetAll(queryParams);
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const categories: VideoCategory[]           = response?.data ?? [];
  const pagination: PaginationMeta | undefined = response?.pagination;

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  }, [queryClient]);

  const handleSaved = async () => {
    await invalidate();
    setFormMode(null);
    setEditTarget(null);
  };

  const handleToggleStatus = async (cat: VideoCategory) => {
    setRowLoading(cat._id, true);
    try {
      await videoCategoriesApi.toggleStatus(cat._id, !cat.isActive);
      await invalidate();
    } finally {
      setRowLoading(cat._id, false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await videoCategoriesApi.delete(deleteTarget.id);
      await invalidate();
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const hasFilters = debouncedSearch || activeFilter !== 'all';
  const resetFilters = () => { setSearch(''); setDebouncedSearch(''); setActiveFilter('all'); setPage(1); };

  return (
    <div className="py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Categories</h1>
          {pagination && (
            <p className="mt-0.5 text-sm text-gray-500">
              {pagination.total} categor{pagination.total !== 1 ? 'ies' : 'y'}
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => { setEditTarget(null); setFormMode('create'); }}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Category
        </Button>
      </div>

      {/* Inline form panel */}
      {formMode && (
        <FormPanel
          mode={formMode}
          initial={editTarget ?? undefined}
          onClose={() => { setFormMode(null); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search categories…"
            aria-label="Search video categories"
            className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value as 'all' | 'true' | 'false'); setPage(1); }}
          aria-label="Filter by status"
          className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
        >
          <option value="all">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters}>Clear filters</Button>}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isFetching && !isLoading && (
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Refreshing…
          </div>
        )}
        {isError && (
          <div className="px-6 py-8 text-center text-sm text-red-600">Failed to load categories.</div>
        )}
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-3.5 w-1/4 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-900">No categories found</p>
            <p className="mt-1 text-sm text-gray-500">
              {hasFilters ? 'Try adjusting your filters.' : 'Add a category to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3">Name</th>
                  <th scope="col" className="px-3 py-3 hidden md:table-cell">Slug</th>
                  <th scope="col" className="px-3 py-3 hidden lg:table-cell">Description</th>
                  <th scope="col" className="px-3 py-3 hidden sm:table-cell">Created</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {categories.map((cat) => {
                  const rowLoading = !!actionLoading[cat._id];
                  return (
                    <tr key={cat._id} className={cn('hover:bg-gray-50 transition-colors', !cat.isActive && 'opacity-60')}>
                      <td className="py-3 pl-4 pr-3 font-medium text-gray-900">{cat.name}</td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 font-mono">{cat.slug}</code>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-gray-500 max-w-xs">
                        {cat.description ? truncate(cat.description, 60) : <span className="italic text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(cat.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
                        )}>
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(cat)}
                            disabled={rowLoading}
                            title={cat.isActive ? 'Deactivate' : 'Activate'}
                            aria-label={cat.isActive ? `Deactivate ${cat.name}` : `Activate ${cat.name}`}
                            className={cn('rounded p-1.5 transition-colors disabled:opacity-40',
                              cat.isActive
                                ? 'text-green-500 hover:text-green-700 hover:bg-green-50'
                                : 'text-gray-400 hover:text-green-500 hover:bg-green-50',
                            )}
                          >
                            {rowLoading
                              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              : cat.isActive
                                ? <ToggleRight className="h-4 w-4" aria-hidden="true" />
                                : <ToggleLeft  className="h-4 w-4" aria-hidden="true" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditTarget(cat); setFormMode('edit'); }}
                            title="Edit"
                            aria-label={`Edit ${cat.name}`}
                            className="rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: cat._id, name: cat.name })}
                            disabled={rowLoading}
                            title="Delete"
                            aria-label={`Delete ${cat.name}`}
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
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span>
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
        title="Delete Video Category"
        message={deleteTarget ? `"${deleteTarget.name}" will be deactivated. Videos in this category will remain but won't be filterable by it. You can restore it using the toggle.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => !deleteLoading && setDeleteTarget(null)}
      />
    </div>
  );
}

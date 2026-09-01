import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight,
  Loader2, ToggleLeft, ToggleRight, Check, X,
} from 'lucide-react';
import { servicesApi } from '../../api/services.api';
import type { AdminServicesQuery } from '../../api/services.api';
import { QUERY_KEYS } from '../../lib/constants';
import { cn, imageUrl, truncate } from '../../lib/utils';
import Button from '../../components/ui/Button';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import type { Service } from '../../types/service.types';
import type { PaginationMeta } from '../../types';

const LIMIT = 15;

interface DeleteTarget { id: string; name: string }

// ─── Inline order editor ──────────────────────────────────────────────────────

interface OrderEditorProps {
  service: Service;
  onSaved: () => void;
}

function OrderEditor({ service, onSaved }: OrderEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(String(service.order));
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setValue(String(service.order));
    setError(null);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const cancel = () => { setEditing(false); setError(null); };

  const save = async () => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) { setError('≥ 0'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('order', String(num));
      await servicesApi.update(service._id, fd);
      onSaved();
      setEditing(false);
    } catch {
      setError('Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        title="Click to edit order"
        className="group flex items-center gap-1 rounded px-1.5 py-0.5 text-sm hover:bg-amber-50 transition-colors tabular-nums"
      >
        <span className="font-medium">{service.order}</span>
        <Pencil className="h-3 w-3 text-gray-300 group-hover:text-amber-500 transition-colors" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Edit display order"
          className={cn(
            'w-14 rounded border px-1.5 py-0.5 text-sm tabular-nums',
            'focus:outline-none focus:ring-1',
            error ? 'border-red-400 focus:ring-red-300' : 'border-amber-400 focus:ring-amber-300',
          )}
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          aria-label="Save order"
          className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
        >
          {saving
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel order edit"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── CTA type badge ───────────────────────────────────────────────────────────

const ctaBadgeConfig = {
  whatsapp: { label: 'WhatsApp', cls: 'bg-green-100 text-green-700' },
  link:     { label: 'Link',     cls: 'bg-blue-100  text-blue-700'  },
  modal:    { label: 'Modal',    cls: 'bg-purple-100 text-purple-700'},
} as const;

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminServices() {
  const queryClient = useQueryClient();

  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter]   = useState<'all' | 'true' | 'false'>('all');
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

  // ── Query ──────────────────────────────────────────────────────────────────
  const queryParams: AdminServicesQuery = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(activeFilter !== 'all' ? { active: activeFilter as 'true' | 'false' } : {}),
    sort: 'order',
    page,
    limit: LIMIT,
  };

  const { data: response, isLoading, isError, isFetching } = useQuery({
    queryKey: [QUERY_KEYS.services, 'admin-list', queryParams],
    queryFn: async () => {
      const res = await servicesApi.adminGetAll(queryParams);
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const services: Service[]                    = response?.data ?? [];
  const pagination: PaginationMeta | undefined = response?.pagination;

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.services] });
  }, [queryClient]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await servicesApi.delete(deleteTarget.id);
      await invalidate();
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  // ── Toggle status ─────────────────────────────────────────────────────────
  const handleToggleStatus = async (svc: Service) => {
    setRowLoading(svc._id, true);
    try {
      await servicesApi.toggleStatus(svc._id, !svc.isActive);
      await invalidate();
    } finally {
      setRowLoading(svc._id, false);
    }
  };

  const hasFilters = debouncedSearch || activeFilter !== 'all';
  const resetFilters = () => {
    setSearch(''); setDebouncedSearch(''); setActiveFilter('all'); setPage(1);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="py-6">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          {pagination && (
            <p className="mt-0.5 text-sm text-gray-500">
              {pagination.total} service{pagination.total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <Link to="/admin/services/new">
          <Button size="sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add New Service
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search services…"
            aria-label="Search services"
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

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table card */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isFetching && !isLoading && (
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Refreshing…
          </div>
        )}

        {isError && (
          <div className="px-6 py-8 text-center text-sm text-red-600">
            Failed to load services. Please try refreshing the page.
          </div>
        )}

        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-10 w-16 animate-pulse rounded-md bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-gray-900">No services found</p>
            <p className="mt-1 text-sm text-gray-500">
              {hasFilters ? 'Try adjusting your filters.' : 'Get started by adding your first service.'}
            </p>
            {!hasFilters && (
              <div className="mt-4">
                <Link to="/admin/services/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add New Service
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3">Service</th>
                  <th scope="col" className="px-3 py-3 hidden md:table-cell">Short Description</th>
                  <th scope="col" className="px-3 py-3">Order</th>
                  <th scope="col" className="px-3 py-3 hidden sm:table-cell">CTA</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {services.map((svc) => {
                  const rowLoading = !!actionLoading[svc._id];
                  const ctaCfg = ctaBadgeConfig[svc.cta?.type ?? 'whatsapp'];

                  return (
                    <tr
                      key={svc._id}
                      className={cn(
                        'transition-colors hover:bg-gray-50',
                        !svc.isActive && 'opacity-60',
                      )}
                    >
                      {/* Thumbnail + name */}
                      <td className="py-3 pl-4 pr-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {svc.image ? (
                            <img
                              src={imageUrl(svc.image)}
                              alt={svc.name}
                              className="h-10 w-16 rounded-md object-cover flex-shrink-0 border border-gray-100"
                            />
                          ) : (
                            <div className="h-10 w-16 rounded-md bg-gray-100 flex-shrink-0 flex items-center justify-center border border-gray-100">
                              <span className="text-xs text-gray-300 font-medium text-center leading-tight px-1">
                                No img
                              </span>
                            </div>
                          )}
                          <span
                            className="font-medium text-gray-900 truncate max-w-[180px]"
                            title={svc.name}
                          >
                            {svc.name}
                          </span>
                        </div>
                      </td>

                      {/* Short description */}
                      <td className="px-3 py-3 hidden md:table-cell text-gray-500 max-w-xs">
                        {svc.shortDescription
                          ? truncate(svc.shortDescription, 55)
                          : <span className="text-gray-300 italic">—</span>}
                      </td>

                      {/* Inline order editor */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <OrderEditor service={svc} onSaved={invalidate} />
                      </td>

                      {/* CTA badge */}
                      <td className="px-3 py-3 hidden sm:table-cell whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            ctaCfg.cls,
                          )}
                        >
                          {ctaCfg.label}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            svc.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600',
                          )}
                        >
                          {svc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(svc)}
                            disabled={rowLoading}
                            title={svc.isActive ? 'Deactivate' : 'Activate'}
                            aria-label={svc.isActive ? `Deactivate ${svc.name}` : `Activate ${svc.name}`}
                            className={cn(
                              'rounded p-1.5 transition-colors disabled:opacity-40',
                              svc.isActive
                                ? 'text-green-500 hover:text-green-700 hover:bg-green-50'
                                : 'text-gray-400 hover:text-green-500 hover:bg-green-50',
                            )}
                          >
                            {rowLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : svc.isActive ? (
                              <ToggleRight className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>

                          {/* Edit */}
                          <Link
                            to={`/admin/services/edit/${svc._id}`}
                            className="rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit service"
                            aria-label={`Edit ${svc.name}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Link>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: svc._id, name: svc.name })}
                            disabled={rowLoading}
                            title="Delete service"
                            aria-label={`Delete ${svc.name}`}
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
              Showing{' '}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={!pagination.hasPrevPage}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((n) =>
                  n === 1 || n === pagination.totalPages || Math.abs(n - pagination.page) <= 1,
                )
                .reduce<(number | '…')[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '…' ? (
                    <span key={`el-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item as number)}
                      aria-label={`Page ${item}`}
                      aria-current={item === pagination.page ? 'page' : undefined}
                      className={cn(
                        'min-w-[28px] rounded px-1.5 py-1 text-xs font-medium transition-colors',
                        item === pagination.page
                          ? 'bg-amber-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100',
                      )}
                    >
                      {item}
                    </button>
                  ),
                )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
                aria-label="Next page"
              >
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
        title="Delete Service"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be deactivated and hidden from the public site. You can re-activate it using the toggle button at any time.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => !deleteLoading && setDeleteTarget(null)}
      />
    </div>
  );
}

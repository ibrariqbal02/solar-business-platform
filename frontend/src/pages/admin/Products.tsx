import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, RotateCcw, Star, StarOff,
  ChevronLeft, ChevronRight, Check, X, Loader2,
} from 'lucide-react';
import { productsApi } from '../../api/products.api';
import { useCategories } from '../../hooks/useCategories';
import { QUERY_KEYS } from '../../lib/constants';
import { formatCurrency, imageUrl } from '../../lib/utils';
import { cn } from '../../lib/utils';
import Button from '../../components/ui/Button';
import StockBadge from '../../components/ui/StockBadge';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import type { ProductListItem } from '../../types/product.types';
import type { AdminProductsQuery } from '../../api/products.api';
import type { PaginationMeta } from '../../types';

// ─── Inline stock editor ──────────────────────────────────────────────────────

interface StockEditorProps {
  product: ProductListItem;
  onSaved: () => void;
}

function StockEditor({ product, onSaved }: StockEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setValue(String(product.stock));
    setError(null);
    setEditing(true);
    // Focus after render
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      setError('Must be ≥ 0');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await productsApi.updateStock(product._id, num);
      onSaved();
      setEditing(false);
    } catch {
      setError('Save failed');
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
        title="Click to edit stock"
        className="group flex items-center gap-1 rounded px-1.5 py-0.5 text-sm hover:bg-amber-50 transition-colors"
      >
        <span className="font-medium tabular-nums">{product.stock}</span>
        <Pencil
          className="h-3 w-3 text-gray-300 group-hover:text-amber-500 transition-colors"
          aria-hidden="true"
        />
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
          aria-label="Edit stock quantity"
          className={cn(
            'w-16 rounded border px-1.5 py-0.5 text-sm tabular-nums',
            'focus:outline-none focus:ring-1',
            error
              ? 'border-red-400 focus:ring-red-300'
              : 'border-amber-400 focus:ring-amber-300',
          )}
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          aria-label="Save stock"
          className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
        >
          {saving
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            : <Check className="h-3.5 w-3.5" aria-hidden="true" />
          }
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel stock edit"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ActiveFilter = 'all' | 'true' | 'false';

interface DeleteTarget {
  id: string;
  name: string;
}

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();

  // ── Filter / pagination state ──────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory]     = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [page, setPage]             = useState(1);
  const LIMIT = 15;

  // Debounce search input
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  };

  // ── Delete dialog state ────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Action loading map (for per-row featured / restore spinners) ───────────
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const setRowLoading = (id: string, val: boolean) =>
    setActionLoading((prev) => ({ ...prev, [id]: val }));

  // ── Query ──────────────────────────────────────────────────────────────────
  const queryParams: AdminProductsQuery = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(category ? { category } : {}),
    active: activeFilter === 'all' ? 'all' : activeFilter,
    page,
    limit: LIMIT,
  };

  const { data: response, isLoading, isError, isFetching } = useQuery({
    queryKey: [QUERY_KEYS.products, 'admin-list', queryParams],
    queryFn: async () => {
      const res = await productsApi.adminGetAll(queryParams);
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const products: ProductListItem[] = response?.data ?? [];
  const pagination: PaginationMeta | undefined = response?.pagination;

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.products] });
  }, [queryClient]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await productsApi.delete(deleteTarget.id);
      await invalidate();
    } catch {
      /* errors are silent — re-fetch will show state */
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  // ── Restore ───────────────────────────────────────────────────────────────
  const handleRestore = async (product: ProductListItem) => {
    setRowLoading(product._id, true);
    try {
      await productsApi.restore(product._id);
      await invalidate();
    } finally {
      setRowLoading(product._id, false);
    }
  };

  // ── Toggle featured ────────────────────────────────────────────────────────
  const handleToggleFeatured = async (product: ProductListItem) => {
    setRowLoading(product._id, true);
    try {
      await productsApi.toggleFeatured(product._id, !product.isFeatured);
      await invalidate();
    } finally {
      setRowLoading(product._id, false);
    }
  };

  // ── Filter reset ───────────────────────────────────────────────────────────
  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategory('');
    setActiveFilter('all');
    setPage(1);
  };

  const hasFilters = debouncedSearch || category || activeFilter !== 'all';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="py-6">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          {pagination && (
            <p className="mt-0.5 text-sm text-gray-500">
              {pagination.total} product{pagination.total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <Link to="/admin/products/new">
          <Button size="sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add New Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        {/* Category filter */}
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          aria-label="Filter by category"
          className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>

        {/* Active filter */}
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value as ActiveFilter); setPage(1); }}
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
        {/* Loading overlay */}
        {isFetching && !isLoading && (
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Refreshing…
          </div>
        )}

        {isError && (
          <div className="px-6 py-8 text-center text-sm text-red-600">
            Failed to load products. Please try refreshing the page.
          </div>
        )}

        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-10 w-10 animate-pulse rounded-md bg-gray-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-gray-900">No products found</p>
            <p className="mt-1 text-sm text-gray-500">
              {hasFilters ? 'Try adjusting your filters.' : 'Get started by adding your first product.'}
            </p>
            {!hasFilters && (
              <div className="mt-4">
                <Link to="/admin/products/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add New Product
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
                  <th scope="col" className="py-3 pl-4 pr-3">Product</th>
                  <th scope="col" className="px-3 py-3 hidden sm:table-cell">Category</th>
                  <th scope="col" className="px-3 py-3">Price</th>
                  <th scope="col" className="px-3 py-3">Stock</th>
                  <th scope="col" className="px-3 py-3 hidden md:table-cell">Status</th>
                  <th scope="col" className="px-3 py-3 hidden lg:table-cell">Featured</th>
                  <th scope="col" className="px-3 py-3 hidden lg:table-cell">Active</th>
                  <th scope="col" className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {products.map((p) => {
                  const thumb = p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url;
                  const rowLoading = !!actionLoading[p._id];

                  return (
                    <tr
                      key={p._id}
                      className={cn(
                        'transition-colors hover:bg-gray-50',
                        !p.isActive && 'opacity-60',
                      )}
                    >
                      {/* Thumbnail + name */}
                      <td className="py-3 pl-4 pr-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {thumb ? (
                            <img
                              src={imageUrl(thumb)}
                              alt={p.name}
                              className="h-10 w-10 rounded-md object-cover flex-shrink-0 border border-gray-100"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300 text-xs border border-gray-100">
                              No img
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[180px]" title={p.name}>
                              {p.name}
                            </p>
                            {p.shortDescription && (
                              <p className="text-xs text-gray-400 truncate max-w-[180px]">
                                {p.shortDescription}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3 hidden sm:table-cell text-gray-600 whitespace-nowrap">
                        {p.category?.name ?? '—'}
                      </td>

                      {/* Price */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(p.price)}
                        </span>
                        {p.discountedPrice != null && p.discountedPrice > 0 && (
                          <span className="ml-1.5 text-xs text-gray-400 line-through">
                            {formatCurrency(p.discountedPrice)}
                          </span>
                        )}
                      </td>

                      {/* Stock — inline editor */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <StockEditor product={p} onSaved={invalidate} />
                          <StockBadge status={p.stockStatus} />
                        </div>
                      </td>

                      {/* isAvailable badge */}
                      <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            p.isAvailable
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500',
                          )}
                        >
                          {p.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </td>

                      {/* isFeatured badge */}
                      <td className="px-3 py-3 hidden lg:table-cell whitespace-nowrap">
                        {p.isFeatured ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <Star className="h-3 w-3" aria-hidden="true" />
                            Featured
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* isActive badge */}
                      <td className="px-3 py-3 hidden lg:table-cell whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            p.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600',
                          )}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle featured */}
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(p)}
                            disabled={rowLoading}
                            title={p.isFeatured ? 'Unfeature' : 'Mark as featured'}
                            aria-label={p.isFeatured ? 'Remove from featured' : 'Mark as featured'}
                            className={cn(
                              'rounded p-1.5 transition-colors disabled:opacity-40',
                              p.isFeatured
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50',
                            )}
                          >
                            {rowLoading
                              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              : p.isFeatured
                                ? <StarOff className="h-4 w-4" aria-hidden="true" />
                                : <Star className="h-4 w-4" aria-hidden="true" />
                            }
                          </button>

                          {/* Edit */}
                          <Link
                            to={`/admin/products/edit/${p._id}`}
                            className="rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit product"
                            aria-label={`Edit ${p.name}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Link>

                          {/* Delete or Restore */}
                          {p.isActive ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ id: p._id, name: p.name })}
                              disabled={rowLoading}
                              title="Delete product"
                              aria-label={`Delete ${p.name}`}
                              className="rounded p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRestore(p)}
                              disabled={rowLoading}
                              title="Restore product"
                              aria-label={`Restore ${p.name}`}
                              className="rounded p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                            >
                              {rowLoading
                                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                : <RotateCcw className="h-4 w-4" aria-hidden="true" />
                              }
                            </button>
                          )}
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
              {/* Page number pills */}
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (n) =>
                    n === 1 ||
                    n === pagination.totalPages ||
                    Math.abs(n - pagination.page) <= 1,
                )
                .reduce<(number | '…')[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '…' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">
                      …
                    </span>
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

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        open={!!deleteTarget}
        variant="danger"
        title="Delete Product"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be deactivated and hidden from the public site. You can restore it later.`
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

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal,
  ChevronLeft, ChevronRight, PackageX,
} from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useSettings } from '../../hooks/useSettings';
import { ProductCardSkeleton } from '../../components/ui/Skeleton';
import StockBadge from '../../components/ui/StockBadge';
import { formatCurrency, imageUrl, discountPercent, truncate } from '../../lib/utils';
import { ROUTES } from '../../lib/constants';
import type { ProductSortKey, ProductsQuery } from '../../types/product.types';

const SORT_OPTIONS: { value: ProductSortKey; label: string }[] = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'oldest',     label: 'Oldest First' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'featured',   label: 'Featured' },
  { value: 'views',      label: 'Most Viewed' },
];

const LIMIT = 12;

export default function Products() {
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? 'PKR';

  // ── Filter / pagination state ─────────────────────────────────────────────
  const [searchInput,   setSearchInput]   = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [category,      setCategory]      = useState('');
  const [sort,          setSort]          = useState<ProductSortKey>('newest');
  const [page,          setPage]          = useState(1);

  const query: ProductsQuery = {
    search:   appliedSearch || undefined,
    category: category      || undefined,
    sort,
    page,
    limit: LIMIT,
  };

  const { data, isLoading, isError, isFetching } = useProducts(query);
  const { data: categories } = useCategories();

  const products   = data?.products   ?? [];
  const pagination = data?.pagination;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleCategory = useCallback((val: string) => {
    setCategory(val);
    setPage(1);
  }, []);

  const handleSort = useCallback((val: ProductSortKey) => {
    setSort(val);
    setPage(1);
  }, []);

  const clearFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setCategory('');
    setPage(1);
  };

  const hasFilters = !!(appliedSearch || category);

  // ── Pagination helpers ────────────────────────────────────────────────────
  type PageItem = number | '…';

  function buildPageItems(total: number, current: number): PageItem[] {
    const pages = Array.from({ length: total }, (_, i) => i + 1);
    const visible = pages.filter(
      (p) => p === 1 || p === total || Math.abs(p - current) <= 1,
    );
    return visible.reduce<PageItem[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="py-8">

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <p className="mt-2 text-gray-500">Browse our range of solar energy products.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search products…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md
                         focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md
                       hover:bg-amber-700 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Category */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={category}
            onChange={(e) => handleCategory(e.target.value)}
            aria-label="Filter by category"
            className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white
                       focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
          >
            <option value="">All Categories</option>
            {categories?.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => handleSort(e.target.value as ProductSortKey)}
          aria-label="Sort products"
          className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white
                     focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Result count */}
      {!isLoading && pagination && (
        <p className="text-sm text-gray-500 mb-4">
          {isFetching
            ? 'Loading…'
            : `${pagination.total} product${pagination.total !== 1 ? 's' : ''} found`}
        </p>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
          <p className="text-red-700 font-medium">Failed to load products.</p>
          <p className="text-sm text-red-500 mt-1">
            Make sure the backend is running at{' '}
            <code className="bg-red-100 px-1 rounded">
              {import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'}
            </code>
          </p>
        </div>
      )}

      {/* Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageX className="h-14 w-14 text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">No products found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your search or filters.
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-amber-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && products.length > 0 && (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6
                      transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
        >
          {products.map((product) => {
            const primary = product.images.find((i) => i.isPrimary) ?? product.images[0];
            const hasDiscount =
              product.discountedPrice !== undefined &&
              product.discountedPrice < product.price;

            return (
              <article
                key={product._id}
                className="group flex flex-col rounded-lg border border-gray-200 bg-white
                           shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Image */}
                <Link
                  to={ROUTES.productDetail(product.slug)}
                  className="block overflow-hidden bg-gray-50"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <img
                    src={imageUrl(primary?.url)}
                    alt={primary?.altText ?? product.name}
                    className="h-52 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </Link>

                {/* Body */}
                <div className="flex flex-col flex-1 p-4 gap-2">
                  {product.category && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                      {product.category.name}
                    </span>
                  )}

                  <h2 className="text-sm font-semibold text-gray-900 leading-snug">
                    <Link
                      to={ROUTES.productDetail(product.slug)}
                      className="hover:text-amber-600 transition-colors"
                    >
                      {product.name}
                    </Link>
                  </h2>

                  {product.shortDescription && (
                    <p className="text-xs text-gray-500 leading-relaxed flex-1">
                      {truncate(product.shortDescription, 90)}
                    </p>
                  )}

                  {/* Price row */}
                  <div className="flex items-center justify-between mt-auto pt-2 flex-wrap gap-1">
                    <div>
                      {hasDiscount ? (
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-base font-bold text-gray-900">
                            {formatCurrency(product.discountedPrice!, currency)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            {formatCurrency(product.price, currency)}
                          </span>
                          <span className="text-xs font-semibold text-green-600">
                            -{discountPercent(product.price, product.discountedPrice!)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-base font-bold text-gray-900">
                          {formatCurrency(product.price, currency)}
                        </span>
                      )}
                      <span className="block text-xs text-gray-400">per {product.unit}</span>
                    </div>
                    <StockBadge status={product.stockStatus} />
                  </div>

                  {/* CTA */}
                  <Link
                    to={ROUTES.productDetail(product.slug)}
                    className="mt-2 block text-center text-sm font-medium text-amber-600
                               border border-amber-300 rounded-md px-3 py-1.5
                               hover:bg-amber-50 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={!pagination.hasPrevPage || isFetching}
            aria-label="Previous page"
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md
                       border border-gray-300 bg-white text-gray-700 hover:bg-gray-50
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>

          {buildPageItems(pagination.totalPages, page).map((p, idx) =>
            p === '…' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                disabled={isFetching}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={`min-w-[2.25rem] px-3 py-2 text-sm font-medium rounded-md border
                            transition-colors disabled:cursor-not-allowed
                            ${p === page
                              ? 'border-amber-500 bg-amber-600 text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
              >
                {p}
              </button>
            ),
          )}

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.hasNextPage || isFetching}
            aria-label="Next page"
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md
                       border border-gray-300 bg-white text-gray-700 hover:bg-gray-50
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

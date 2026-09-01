import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar, ChevronLeft, ChevronRight, ServerCrash, FileX } from 'lucide-react';
import { useArticles } from '../../hooks/useArticles';
import { useArticleCategories } from '../../hooks/useArticles';
import { Skeleton } from '../../components/ui/Skeleton';
import { imageUrl, formatDate, truncate } from '../../lib/utils';
import { ROUTES } from '../../lib/constants';
import type { ArticleSortKey, ArticlesQuery } from '../../types/article.types';

const SORT_OPTIONS: { value: ArticleSortKey; label: string }[] = [
  { value: 'published', label: 'Recently Published' },
  { value: 'newest',    label: 'Newest Added' },
  { value: 'oldest',    label: 'Oldest First' },
];

const LIMIT = 9;

function ArticleCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex gap-3 pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export default function Articles() {
  const [category, setCategory] = useState('');
  const [sort, setSort]         = useState<ArticleSortKey>('published');
  const [page, setPage]         = useState(1);

  const query: ArticlesQuery = {
    category: category || undefined,
    sort,
    page,
    limit: LIMIT,
  };

  const { data, isLoading, isError, isFetching } = useArticles(query);
  const { data: categories } = useArticleCategories();

  const articles   = data?.articles   ?? [];
  const pagination = data?.pagination;

  const handleCategory = useCallback((id: string) => { setCategory(id); setPage(1); }, []);
  const handleSort     = useCallback((v: ArticleSortKey) => { setSort(v); setPage(1); }, []);

  // ── Pagination helpers ────────────────────────────────────────────────────
  type PageItem = number | '…';
  function buildPages(total: number, cur: number): PageItem[] {
    const pages = Array.from({ length: total }, (_, i) => i + 1);
    const vis   = pages.filter((p) => p === 1 || p === total || Math.abs(p - cur) <= 1);
    return vis.reduce<PageItem[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);
  }

  return (
    <div className="py-8">
      {/* Heading */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
        <p className="mt-2 text-gray-500 max-w-xl mx-auto">
          Guides, tutorials, and solar energy insights from our team.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        {/* Category tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleCategory('')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
              ${category === ''
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400 hover:text-amber-600'}`}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat._id}
              onClick={() => handleCategory(cat._id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
                ${category === cat._id
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400 hover:text-amber-600'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => handleSort(e.target.value as ArticleSortKey)}
          aria-label="Sort articles"
          className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white
                     focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 shrink-0"
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Result count */}
      {!isLoading && pagination && (
        <p className="text-sm text-gray-500 mb-4">
          {isFetching ? 'Loading…' : `${pagination.total} article${pagination.total !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
          <ServerCrash className="h-10 w-10 text-red-300 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Failed to load articles.</p>
          <p className="text-sm text-red-500 mt-1">Make sure the backend is running.</p>
        </div>
      )}

      {/* Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: LIMIT }).map((_, i) => <ArticleCardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && articles.length === 0 && (
        <div className="py-24 flex flex-col items-center text-center">
          <FileX className="h-14 w-14 text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">No articles found</p>
          {category && (
            <button onClick={() => handleCategory('')} className="mt-3 text-sm text-amber-600 hover:underline">
              Show all categories
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && articles.length > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6
                         transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
          {articles.map((article) => (
            <article key={article._id}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white
                         shadow-sm hover:shadow-md transition-shadow overflow-hidden">

              {/* Featured image */}
              <Link to={ROUTES.articleDetail(article.slug)} tabIndex={-1} aria-hidden="true"
                className="block overflow-hidden bg-gray-100 h-48">
                {article.featuredImage ? (
                  <img src={imageUrl(article.featuredImage)} alt={article.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-amber-50 to-amber-100
                                  flex items-center justify-center text-4xl">📄</div>
                )}
              </Link>

              {/* Body */}
              <div className="flex flex-col flex-1 p-5 gap-2">
                {/* Category badge */}
                {article.category && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    {article.category.name}
                  </span>
                )}

                <h2 className="text-base font-semibold text-gray-900 leading-snug">
                  <Link to={ROUTES.articleDetail(article.slug)}
                    className="hover:text-amber-600 transition-colors">
                    {article.title}
                  </Link>
                </h2>

                {article.excerpt && (
                  <p className="text-sm text-gray-500 leading-relaxed flex-1">
                    {truncate(article.excerpt, 120)}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-4 mt-auto pt-2 text-xs text-gray-400 flex-wrap">
                  {article.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(article.publishedAt)}
                    </span>
                  )}
                  {article.readTimeMinutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {article.readTimeMinutes} min read
                    </span>
                  )}
                </div>

                <Link to={ROUTES.articleDetail(article.slug)}
                  className="mt-2 text-sm font-medium text-amber-600 hover:text-amber-700
                             transition-colors self-start">
                  Read more →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2 flex-wrap">
          <button onClick={() => setPage((p) => p - 1)}
            disabled={!pagination.hasPrevPage || isFetching}
            aria-label="Previous page"
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md
                       border border-gray-300 bg-white text-gray-700 hover:bg-gray-50
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="h-4 w-4" />Prev
          </button>

          {buildPages(pagination.totalPages, page).map((p, idx) =>
            p === '…' ? (
              <span key={`e-${idx}`} className="px-2 text-gray-400 select-none">…</span>
            ) : (
              <button key={p} onClick={() => setPage(p)} disabled={isFetching}
                aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined}
                className={`min-w-[2.25rem] px-3 py-2 text-sm font-medium rounded-md border
                            transition-colors disabled:cursor-not-allowed
                            ${p === page
                              ? 'border-amber-500 bg-amber-600 text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                {p}
              </button>
            )
          )}

          <button onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.hasNextPage || isFetching}
            aria-label="Next page"
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md
                       border border-gray-300 bg-white text-gray-700 hover:bg-gray-50
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Next<ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

import { useSearchParams, Link } from 'react-router-dom';
import {
  Package, Wrench, Video, FileText, HelpCircle,
  SearchX, Loader2, Play,
} from 'lucide-react';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { imageUrl, formatCurrency, truncate } from '../../lib/utils';
import { youtubeThumbnail } from '../../types/video.types';
import { ROUTES } from '../../lib/constants';
import type {
  SearchProduct, SearchService, SearchVideo,
  SearchArticle, SearchFAQ,
} from '../../api/search.api';

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-700 uppercase
                     tracking-wider mb-4">
        <Icon className="h-4 w-4 text-amber-500" />
        {title}
        <span className="ml-1 text-xs font-semibold bg-amber-100 text-amber-700
                         rounded-full px-2 py-0.5">
          {count}
        </span>
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

// ── Result row ────────────────────────────────────────────────────────────────

function ResultRow({
  href,
  image,
  title,
  subtitle,
  badge,
  isExternal = false,
}: {
  href: string;
  image?: string | null;
  title: string;
  subtitle?: string;
  badge?: string;
  isExternal?: boolean;
}) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white
                    hover:border-amber-300 hover:shadow-sm transition-all group">
      {image !== undefined && (
        <div className="shrink-0 w-14 h-14 rounded-md overflow-hidden bg-gray-100">
          <img src={imageUrl(image ?? undefined)} alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 group-hover:text-amber-600
                      transition-colors truncate">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {badge && (
        <span className="shrink-0 text-xs bg-amber-50 text-amber-700 border border-amber-200
                         rounded-full px-2 py-0.5 font-medium">
          {badge}
        </span>
      )}
    </div>
  );

  if (isExternal) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return <Link to={href}>{content}</Link>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const { data, isLoading, isError, isReady } = useGlobalSearch(q);

  const hasResults = data && data.totalResults > 0;

  return (
    <div className="py-8 max-w-3xl mx-auto">

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {q ? `Search results for "${q}"` : 'Search'}
        </h1>
        {data && isReady && (
          <p className="mt-1 text-sm text-gray-500">
            {data.totalResults} result{data.totalResults !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* Loading */}
      {isLoading && isReady && (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Searching…</span>
        </div>
      )}

      {/* Short query hint */}
      {!isReady && q.length > 0 && (
        <p className="text-sm text-gray-400 py-6 text-center">
          Type at least 2 characters to search.
        </p>
      )}

      {/* Empty query */}
      {!q && (
        <p className="text-sm text-gray-400 py-6 text-center">
          Enter a search term above to find products, services, articles, and more.
        </p>
      )}

      {/* Error */}
      {isError && (
        <div className="py-12 text-center">
          <p className="text-red-600 font-medium">Search failed.</p>
          <p className="text-sm text-gray-400 mt-1">Make sure the backend is running.</p>
        </div>
      )}

      {/* No results */}
      {isReady && !isLoading && !isError && data && !hasResults && (
        <div className="flex flex-col items-center py-20 text-center">
          <SearchX className="h-14 w-14 text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">No results found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try different keywords or browse our{' '}
            <Link to={ROUTES.products} className="text-amber-600 hover:underline">products</Link>
            {' '}and{' '}
            <Link to={ROUTES.services} className="text-amber-600 hover:underline">services</Link>.
          </p>
        </div>
      )}

      {/* Grouped results */}
      {hasResults && !isLoading && (
        <div className="space-y-10">

          {/* ── Products ──────────────────────────────────────────────── */}
          {data.results.products.length > 0 && (
            <Section icon={Package} title="Products" count={data.results.products.length}>
              {data.results.products.map((p: SearchProduct) => {
                const img = p.images.find((i) => i.isPrimary) ?? p.images[0];
                return (
                  <ResultRow
                    key={p._id}
                    href={ROUTES.productDetail(p.slug)}
                    image={img?.url ?? null}
                    title={p.name}
                    subtitle={p.shortDescription}
                    badge={formatCurrency(p.price) + ' / ' + p.unit}
                  />
                );
              })}
            </Section>
          )}

          {/* ── Services ──────────────────────────────────────────────── */}
          {data.results.services.length > 0 && (
            <Section icon={Wrench} title="Services" count={data.results.services.length}>
              {data.results.services.map((s: SearchService) => (
                <ResultRow
                  key={s._id}
                  href={ROUTES.serviceDetail(s.slug)}
                  image={s.image ?? null}
                  title={s.name}
                  subtitle={s.shortDescription}
                />
              ))}
            </Section>
          )}

          {/* ── Videos ────────────────────────────────────────────────── */}
          {data.results.videos.length > 0 && (
            <Section icon={Video} title="Videos" count={data.results.videos.length}>
              {data.results.videos.map((v: SearchVideo) => {
                const thumb = v.thumbnail?.startsWith('http')
                  ? v.thumbnail
                  : youtubeThumbnail(v.youtubeVideoId, 'default');
                return (
                  <div key={v._id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white
                               hover:border-amber-300 hover:shadow-sm transition-all group">
                    <a href={v.youtubeUrl} target="_blank" rel="noopener noreferrer"
                      className="relative shrink-0 w-14 h-14 rounded-md overflow-hidden bg-gray-900">
                      <img src={thumb} alt={v.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-60"
                        loading="lazy" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-4 w-4 text-white fill-white" />
                      </span>
                    </a>
                    <div className="flex-1 min-w-0">
                      <a href={v.youtubeUrl} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-semibold text-gray-900 hover:text-amber-600
                                   transition-colors line-clamp-2 block">
                        {v.title}
                      </a>
                    </div>
                  </div>
                );
              })}
            </Section>
          )}

          {/* ── Articles ──────────────────────────────────────────────── */}
          {data.results.articles.length > 0 && (
            <Section icon={FileText} title="Articles" count={data.results.articles.length}>
              {data.results.articles.map((a: SearchArticle) => (
                <ResultRow
                  key={a._id}
                  href={ROUTES.articleDetail(a.slug)}
                  image={a.featuredImage ?? null}
                  title={a.title}
                  subtitle={a.excerpt ? truncate(a.excerpt, 120) : undefined}
                />
              ))}
            </Section>
          )}

          {/* ── FAQs ──────────────────────────────────────────────────── */}
          {data.results.faqs.length > 0 && (
            <Section icon={HelpCircle} title="FAQs" count={data.results.faqs.length}>
              {data.results.faqs.map((f: SearchFAQ) => (
                <Link key={f._id} to={ROUTES.faq}
                  className="block p-3 rounded-lg border border-gray-200 bg-white
                             hover:border-amber-300 hover:shadow-sm transition-all">
                  <p className="text-sm font-semibold text-gray-900 hover:text-amber-600
                                transition-colors">
                    {f.question}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{truncate(f.answer, 140)}</p>
                </Link>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

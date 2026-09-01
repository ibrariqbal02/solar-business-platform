import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, Clock, Calendar, Tag,
  AlertCircle, ShieldAlert, Wrench, Lightbulb, Play,
} from 'lucide-react';
import { useArticle } from '../../hooks/useArticles';
import { Skeleton } from '../../components/ui/Skeleton';
import { imageUrl, formatDate, formatCurrency } from '../../lib/utils';
import { ROUTES } from '../../lib/constants';
import { youtubeThumbnail } from '../../types/video.types';
import { useSettings } from '../../hooks/useSettings';

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, isError } = useArticle(slug);
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? 'PKR';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="py-8 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (isError || !article) {
    return (
      <div className="py-24 flex flex-col items-center text-center">
        <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Article Not Found</h1>
        <p className="text-gray-500 mt-2 max-w-sm">
          This article doesn't exist or may have been removed.
        </p>
        <Link to={ROUTES.articles}
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline">
          <ChevronLeft className="h-4 w-4" />Back to Articles
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-3xl mx-auto">

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-gray-500 flex-wrap" aria-label="Breadcrumb">
        <Link to={ROUTES.home} className="hover:text-amber-600 transition-colors">Home</Link>
        <span>/</span>
        <Link to={ROUTES.articles} className="hover:text-amber-600 transition-colors">Articles</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{article.title}</span>
      </nav>

      {/* Featured image */}
      {article.featuredImage && (
        <div className="rounded-xl overflow-hidden mb-8 bg-gray-100">
          <img src={imageUrl(article.featuredImage)} alt={article.title}
            className="w-full max-h-80 object-cover" />
        </div>
      )}

      {/* Category + meta */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {article.category && (
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600
                           bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            {article.category.name}
          </span>
        )}
        {article.publishedAt && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(article.publishedAt)}
          </span>
        )}
        {article.readTimeMinutes && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            {article.readTimeMinutes} min read
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-6">{article.title}</h1>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="text-lg text-gray-600 leading-relaxed mb-8 border-l-4 border-amber-400 pl-4">
          {article.excerpt}
        </p>
      )}

      {/* Main description */}
      {article.description && (
        <section className="mb-8 prose prose-sm max-w-none">
          <div
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.description }}
          />
        </section>
      )}

      {/* Technical explanation */}
      {article.technicalExplanation && (
        <section className="mb-8 rounded-xl bg-blue-50 border border-blue-200 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-blue-900 mb-3">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            Technical Explanation
          </h2>
          <div
            className="text-blue-800 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.technicalExplanation }}
          />
        </section>
      )}

      {/* Troubleshooting steps */}
      {article.troubleshootingSteps.length > 0 && (
        <section className="mb-8 rounded-xl bg-amber-50 border border-amber-200 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-amber-900 mb-4">
            <Wrench className="h-5 w-5 text-amber-600" />
            Troubleshooting Steps
          </h2>
          <ol className="space-y-3">
            {article.troubleshootingSteps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white text-xs
                                 font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div className="text-amber-900 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: step }} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Safety information */}
      {article.safetyInformation && (
        <section className="mb-8 rounded-xl bg-red-50 border border-red-200 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-red-900 mb-3">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            Safety Information
          </h2>
          <div
            className="text-red-800 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.safetyInformation }}
          />
        </section>
      )}

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-8">
          <Tag className="h-4 w-4 text-gray-400 shrink-0" />
          {article.tags.map((tag) => (
            <span key={tag}
              className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Related Videos ────────────────────────────────────────────────── */}
      {article.relatedVideos.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Related Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {article.relatedVideos.map((video) => {
              const thumb = video.thumbnail?.startsWith('http')
                ? video.thumbnail
                : youtubeThumbnail(video.youtubeVideoId, 'hqdefault');
              return (
                <a key={video._id} href={video.youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="group flex gap-3 rounded-lg border border-gray-200 bg-white p-3
                             hover:border-amber-400 hover:shadow-sm transition-all">
                  <div className="relative shrink-0 w-28 h-16 rounded-md overflow-hidden bg-gray-100">
                    <img src={thumb} alt={video.title}
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                      loading="lazy" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-amber-600/90 rounded-full p-1.5">
                        <Play className="h-3 w-3 text-white fill-white" />
                      </span>
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 group-hover:text-amber-600
                                transition-colors leading-snug line-clamp-3">
                    {video.title}
                  </p>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Related Products ──────────────────────────────────────────────── */}
      {article.relatedProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {article.relatedProducts.map((product) => {
              const primaryImg =
                product.images.find((i) => i.isPrimary) ?? product.images[0];
              return (
                <Link key={product._id} to={ROUTES.productDetail(product.slug)}
                  className="group flex gap-3 rounded-lg border border-gray-200 bg-white p-3
                             hover:border-amber-400 hover:shadow-sm transition-all">
                  <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-100">
                    <img src={imageUrl(primaryImg?.url)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                      loading="lazy" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-amber-600
                                  transition-colors leading-snug line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-xs text-amber-600 font-medium mt-1">
                      {formatCurrency(product.price, currency)} / {product.unit}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Back */}
      <div className="mt-12 pt-6 border-t border-gray-100">
        <Link to={ROUTES.articles}
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline">
          <ChevronLeft className="h-4 w-4" />Back to Articles
        </Link>
      </div>
    </div>
  );
}

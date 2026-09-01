import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight,
  Check, Tag, Zap, AlertCircle, MessageSquare,
} from 'lucide-react';
import { useProduct } from '../../hooks/useProducts';
import { useSettings } from '../../hooks/useSettings';
import { productsApi } from '../../api/products.api';
import StockBadge from '../../components/ui/StockBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency, imageUrl, discountPercent } from '../../lib/utils';
import { ROUTES } from '../../lib/constants';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? 'PKR';

  const { data: product, isLoading, isError } = useProduct(slug);
  const [activeIdx, setActiveIdx] = useState(0);

  // Fire-and-forget view tracking once product id is known
  useEffect(() => {
    if (product?._id) {
      productsApi.trackView(product._id).catch(() => { /* silent */ });
    }
  }, [product?._id]);

  // Reset gallery when navigating between products
  useEffect(() => {
    setActiveIdx(0);
  }, [product?._id]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="py-8 max-w-5xl mx-auto">
        <Skeleton className="h-4 w-40 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Skeleton className="h-96 w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not found / error ─────────────────────────────────────────────────────
  if (isError || !product) {
    return (
      <div className="py-24 flex flex-col items-center text-center">
        <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Product Not Found</h1>
        <p className="text-gray-500 mt-2 max-w-sm">
          The product you're looking for doesn't exist or may have been removed.
        </p>
        <Link
          to={ROUTES.products}
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Products
        </Link>
      </div>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const images     = product.images;
  const hasImages  = images.length > 0;
  const hasDiscount =
    product.discountedPrice !== undefined && product.discountedPrice < product.price;

  const prevImg = () => setActiveIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImg = () => setActiveIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="py-8 max-w-5xl mx-auto">

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-gray-500 flex-wrap" aria-label="Breadcrumb">
        <Link to={ROUTES.home} className="hover:text-amber-600 transition-colors">Home</Link>
        <span>/</span>
        <Link to={ROUTES.products} className="hover:text-amber-600 transition-colors">Products</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* ── Image gallery ────────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square">
            {hasImages ? (
              <img
                src={imageUrl(images[activeIdx]?.url)}
                alt={images[activeIdx]?.altText ?? product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                No image available
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  onClick={prevImg}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white
                             rounded-full p-1.5 shadow transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-700" />
                </button>
                <button
                  onClick={nextImg}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white
                             rounded-full p-1.5 shadow transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-gray-700" />
                </button>
                <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs
                                 rounded-full px-2 py-0.5">
                  {activeIdx + 1} / {images.length}
                </span>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIdx(idx)}
                  aria-label={`View image ${idx + 1}`}
                  className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors
                              ${idx === activeIdx
                                ? 'border-amber-500'
                                : 'border-gray-200 hover:border-gray-400'}`}
                >
                  <img
                    src={imageUrl(img.url)}
                    alt={img.altText ?? `Image ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product info ──────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Category */}
          {product.category && (
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              {product.category.name}
            </span>
          )}

          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 flex-wrap">
            {hasDiscount ? (
              <>
                <span className="text-3xl font-bold text-gray-900">
                  {formatCurrency(product.discountedPrice!, currency)}
                </span>
                <span className="text-lg text-gray-400 line-through">
                  {formatCurrency(product.price, currency)}
                </span>
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                  {discountPercent(product.price, product.discountedPrice!)}% OFF
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(product.price, currency)}
              </span>
            )}
            <span className="text-sm text-gray-500">/ {product.unit}</span>
          </div>

          {/* Stock */}
          <div className="flex items-center gap-3">
            <StockBadge status={product.stockStatus} />
            {product.stockStatus === 'low_stock' && (
              <span className="text-xs text-amber-700">Only {product.stock} left</span>
            )}
          </div>

          {/* Short description */}
          {product.shortDescription && (
            <p className="text-gray-600 leading-relaxed">{product.shortDescription}</p>
          )}

          {/* Key features */}
          {product.features.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Key Features
              </h3>
              <ul className="space-y-1.5">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              {product.tags.map((tag) => (
                <span key={tag}
                  className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Enquiry CTA — wired in Phase 3 */}
          <button
            type="button"
            onClick={() => alert('Enquiry form coming in Phase 3 (Lead integration).')}
            className="w-full flex items-center justify-center gap-2 bg-amber-600
                       hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg
                       transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
            Send Enquiry
          </button>
        </div>
      </div>

      {/* ── Detailed description ──────────────────────────────────────────── */}
      {product.detailedDescription && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {product.detailedDescription}
          </p>
        </section>
      )}

      {/* ── Specifications ────────────────────────────────────────────────── */}
      {product.specifications.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Specifications</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {product.specifications.map((spec, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <th scope="row"
                      className="px-5 py-3 font-medium text-gray-700 text-left w-1/3 whitespace-nowrap">
                      {spec.label}
                    </th>
                    <td className="px-5 py-3 text-gray-600">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Applications ──────────────────────────────────────────────────── */}
      {product.applications.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Applications</h2>
          <div className="flex flex-wrap gap-2">
            {product.applications.map((app) => (
              <span key={app}
                className="text-sm bg-amber-50 text-amber-800 border border-amber-200
                           rounded-full px-3 py-1 capitalize">
                {app}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Back link */}
      <div className="mt-12 pt-6 border-t border-gray-100">
        <Link
          to={ROUTES.products}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Products
        </Link>
      </div>
    </div>
  );
}

import { Star, User, Quote } from 'lucide-react';
import { useTestimonials } from '../../hooks/useTestimonials';
import { Skeleton } from '../ui/Skeleton';
import { imageUrl } from '../../lib/utils';
import type { Testimonial } from '../../types/testimonial.types';

// ── Star display ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  );
}

// ── Single card ───────────────────────────────────────────────────────────────

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm p-6 gap-4">
      <Quote className="h-6 w-6 text-amber-200 shrink-0" />
      <p className="text-gray-600 text-sm leading-relaxed flex-1 line-clamp-5">{t.review}</p>
      <StarRating rating={t.rating} />
      <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
        {t.customerImage ? (
          <img
            src={imageUrl(t.customerImage)}
            alt={t.customerName}
            className="h-10 w-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-amber-600" />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-gray-900">{t.customerName}</p>
          {t.customerLocation && (
            <p className="text-xs text-gray-400">{t.customerLocation}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export default function TestimonialsSection() {
  const { data, isLoading } = useTestimonials({ limit: 6 });
  const testimonials = data?.testimonials ?? [];

  if (!isLoading && testimonials.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">What Our Customers Say</h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Real experiences from homeowners and businesses across Pakistan.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <div className="flex gap-1 pt-1">
                  {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-4 w-4 rounded" />)}
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => <TestimonialCard key={t._id} t={t} />)}
          </div>
        )}
      </div>
    </section>
  );
}

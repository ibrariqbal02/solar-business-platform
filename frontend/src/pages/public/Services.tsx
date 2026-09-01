import { Link } from 'react-router-dom';
import { ArrowRight, ServerCrash } from 'lucide-react';
import { useServices } from '../../hooks/useServices';
import { Skeleton } from '../../components/ui/Skeleton';
import { imageUrl, truncate } from '../../lib/utils';
import { ROUTES } from '../../lib/constants';

function ServiceCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-8 w-28 rounded-md mt-2" />
      </div>
    </div>
  );
}

export default function Services() {
  const { data, isLoading, isError } = useServices({
    active: true,
    sort: 'order',
    limit: 50,
  });

  const services = data?.services ?? [];

  return (
    <div className="py-8">
      {/* Heading */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Our Services</h1>
        <p className="mt-3 text-gray-500 max-w-xl mx-auto">
          End-to-end solar solutions — from consultation to installation and beyond.
        </p>
      </div>

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
          <ServerCrash className="h-10 w-10 text-red-300 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Failed to load services.</p>
          <p className="text-sm text-red-500 mt-1">
            Make sure the backend is running and try refreshing.
          </p>
        </div>
      )}

      {/* Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && services.length === 0 && (
        <div className="py-24 text-center">
          <p className="text-lg font-medium text-gray-500">No services available yet.</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && services.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <article
              key={service._id}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white
                         shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Image */}
              <div className="overflow-hidden bg-amber-50 h-52">
                {service.image ? (
                  <img
                    src={imageUrl(service.image)}
                    alt={service.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  /* Gradient placeholder when no image */
                  <div className="h-full w-full bg-gradient-to-br from-amber-100 to-amber-200
                                  flex items-center justify-center">
                    <span className="text-4xl">☀️</span>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex flex-col flex-1 p-5 gap-3">
                <h2 className="text-base font-semibold text-gray-900">{service.name}</h2>

                {service.shortDescription && (
                  <p className="text-sm text-gray-500 leading-relaxed flex-1">
                    {truncate(service.shortDescription, 120)}
                  </p>
                )}

                {/* Areas */}
                {service.areas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {service.areas.slice(0, 4).map((area) => (
                      <span
                        key={area}
                        className="text-xs bg-amber-50 text-amber-700 border border-amber-200
                                   rounded-full px-2 py-0.5"
                      >
                        {area}
                      </span>
                    ))}
                    {service.areas.length > 4 && (
                      <span className="text-xs text-gray-400">+{service.areas.length - 4} more</span>
                    )}
                  </div>
                )}

                <Link
                  to={ROUTES.serviceDetail(service.slug)}
                  className="mt-auto inline-flex items-center gap-1 text-sm font-medium
                             text-amber-600 hover:text-amber-700 transition-colors"
                >
                  Learn More
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

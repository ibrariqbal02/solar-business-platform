import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, Check, MapPin, AlertCircle,
  ExternalLink, MessageSquare, Phone,
} from 'lucide-react';
import { useService } from '../../hooks/useServices';
import { useSettings } from '../../hooks/useSettings';
import { Skeleton } from '../../components/ui/Skeleton';
import { imageUrl } from '../../lib/utils';
import { ROUTES } from '../../lib/constants';
import { trackEvent } from '../../lib/analytics';
import type { IServiceCTA } from '../../types/service.types';

// ── CTA button ────────────────────────────────────────────────────────────────

interface CtaButtonProps {
  cta: IServiceCTA;
  whatsappNumber?: string;
  serviceName: string;
}

function CtaButton({ cta, whatsappNumber, serviceName }: CtaButtonProps) {
  const baseClass =
    'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-colors';

  if (cta.type === 'link' && cta.url) {
    return (
      <a
        href={cta.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClass} bg-amber-600 hover:bg-amber-700 text-white`}
      >
        <ExternalLink className="h-4 w-4" />
        {cta.label}
      </a>
    );
  }

  if (cta.type === 'whatsapp') {
    const number = whatsappNumber?.replace(/\D/g, '') ?? '';
    const text = encodeURIComponent(
      `Hi! I'm interested in your "${serviceName}" service. Please provide more details.`,
    );
    const href = number
      ? `https://wa.me/${number}?text=${text}`
      : `https://wa.me/?text=${text}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent({ eventType: 'whatsapp_click', metadata: { source: 'service_cta', serviceName } })}
        className={`${baseClass} bg-green-600 hover:bg-green-700 text-white`}
      >
        <Phone className="h-4 w-4" />
        {cta.label}
      </a>
    );
  }

  // type === 'modal' — placeholder until Phase 3
  return (
    <button
      type="button"
      onClick={() => alert('Enquiry form coming in Phase 3 (Lead integration).')}
      className={`${baseClass} bg-amber-600 hover:bg-amber-700 text-white`}
    >
      <MessageSquare className="h-4 w-4" />
      {cta.label}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: service, isLoading, isError } = useService(slug);
  const { data: settings } = useSettings();

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="py-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  }

  // ── Not found / error ─────────────────────────────────────────────────────
  if (isError || !service) {
    return (
      <div className="py-24 flex flex-col items-center text-center">
        <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Service Not Found</h1>
        <p className="text-gray-500 mt-2 max-w-sm">
          This service doesn't exist or may have been removed.
        </p>
        <Link
          to={ROUTES.services}
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Services
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-4xl mx-auto">

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-gray-500 flex-wrap" aria-label="Breadcrumb">
        <Link to={ROUTES.home} className="hover:text-amber-600 transition-colors">Home</Link>
        <span>/</span>
        <Link to={ROUTES.services} className="hover:text-amber-600 transition-colors">Services</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{service.name}</span>
      </nav>

      {/* Hero image */}
      {service.image && (
        <div className="rounded-xl overflow-hidden mb-8 bg-gray-100">
          <img
            src={imageUrl(service.image)}
            alt={service.name}
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      {/* Title + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{service.name}</h1>
        <CtaButton
          cta={service.cta}
          whatsappNumber={settings?.whatsappNumber ?? settings?.phone}
          serviceName={service.name}
        />
      </div>

      {/* Short description */}
      {service.shortDescription && (
        <p className="text-lg text-gray-600 leading-relaxed mb-6 border-l-4 border-amber-400 pl-4">
          {service.shortDescription}
        </p>
      )}

      {/* Full description */}
      {service.description && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">About This Service</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {service.description}
          </p>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Features */}
        {service.features.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">What's Included</h2>
            <ul className="space-y-2">
              {service.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Coverage areas */}
        {service.areas.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-500" />
              Coverage Areas
            </h2>
            <div className="flex flex-wrap gap-2">
              {service.areas.map((area) => (
                <span
                  key={area}
                  className="text-sm bg-amber-50 text-amber-800 border border-amber-200
                             rounded-full px-3 py-1"
                >
                  {area}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bottom CTA strip */}
      <div className="mt-12 rounded-xl bg-amber-50 border border-amber-200 p-6
                      flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">Ready to get started?</p>
          <p className="text-sm text-gray-500 mt-1">
            Contact us today and we'll help you choose the right solution.
          </p>
        </div>
        <CtaButton
          cta={service.cta}
          whatsappNumber={settings?.whatsappNumber ?? settings?.phone}
          serviceName={service.name}
        />
      </div>

      {/* Back */}
      <div className="mt-10 pt-6 border-t border-gray-100">
        <Link
          to={ROUTES.services}
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Services
        </Link>
      </div>
    </div>
  );
}

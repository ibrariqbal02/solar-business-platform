import { Link } from 'react-router-dom';
import {
  Sun, Phone, Mail, MapPin,
  Facebook, Instagram, Youtube, Twitter, Linkedin,
} from 'lucide-react';
import { ROUTES } from '../../lib/constants';
import { useSettings } from '../../hooks/useSettings';
import { trackEvent } from '../../lib/analytics';

const quickLinks = [
  { label: 'Products', to: ROUTES.products },
  { label: 'Services', to: ROUTES.services },
  { label: 'Articles', to: ROUTES.articles },
  { label: 'Contact',  to: ROUTES.contact  },
];

export default function Footer() {
  const { data: settings } = useSettings();

  const businessName = settings?.businessName ?? 'SolarPro';
  const tagline =
    settings?.tagline ??
    'Powering homes and businesses with clean, renewable solar energy.';

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* ── Brand ─────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              {settings?.logo ? (
                <img
                  src={settings.logo}
                  alt={businessName}
                  className="h-7 w-auto object-contain brightness-200"
                />
              ) : (
                <Sun className="h-5 w-5 text-amber-400" />
              )}
              <span>{businessName}</span>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed">{tagline}</p>

            {/* Social links */}
            {settings?.socialLinks && (
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {settings.socialLinks.facebook && (
                  <a href={settings.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="text-gray-400 hover:text-amber-400 transition-colors">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {settings.socialLinks.instagram && (
                  <a href={settings.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-gray-400 hover:text-amber-400 transition-colors">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {(settings.socialLinks.youtube ?? settings.youtubeChannelUrl) && (
                  <a href={settings.socialLinks.youtube ?? settings.youtubeChannelUrl}
                    target="_blank" rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="text-gray-400 hover:text-amber-400 transition-colors">
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
                {settings.socialLinks.twitter && (
                  <a href={settings.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                    aria-label="Twitter / X"
                    className="text-gray-400 hover:text-amber-400 transition-colors">
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                {settings.socialLinks.linkedin && (
                  <a href={settings.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="text-gray-400 hover:text-amber-400 transition-colors">
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Quick links ────────────────────────────────────────────── */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              {quickLinks.map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className="hover:text-amber-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact ────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-gray-400">
              {settings?.phone && (
                <li>
                  <a href={`tel:${settings.phone}`}
                    className="flex items-start gap-2 hover:text-amber-400 transition-colors">
                    <Phone className="h-4 w-4 mt-0.5 shrink-0" />
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings?.whatsappNumber && (
                <li>
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=Hi! I have an enquiry.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent({ eventType: 'whatsapp_click', metadata: { source: 'footer' } })}
                    className="flex items-start gap-2 hover:text-green-400 transition-colors"
                  >
                    <Phone className="h-4 w-4 mt-0.5 shrink-0 text-green-400" />
                    WhatsApp: {settings.whatsappNumber}
                  </a>
                </li>
              )}
              {settings?.email && (
                <li>
                  <a href={`mailto:${settings.email}`}
                    className="flex items-start gap-2 hover:text-amber-400 transition-colors">
                    <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                    {settings.email}
                  </a>
                </li>
              )}
              {(settings?.address ?? settings?.city) && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
                  <span>
                    {[settings?.address, settings?.city, settings?.country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </li>
              )}
              {/* Loading skeleton when settings haven't arrived yet */}
              {!settings && (
                <>
                  <li className="h-4 w-36 bg-gray-800 rounded animate-pulse" />
                  <li className="h-4 w-44 bg-gray-800 rounded animate-pulse" />
                  <li className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-800 pt-6 text-sm text-gray-500 text-center">
          © {new Date().getFullYear()} {businessName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

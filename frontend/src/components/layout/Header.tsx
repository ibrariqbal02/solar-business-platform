import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Sun, Menu, X, Phone } from 'lucide-react';
import { ROUTES } from '../../lib/constants';
import { useSettings } from '../../hooks/useSettings';

const navLinks = [
  { label: 'Home',     to: ROUTES.home },
  { label: 'Products', to: ROUTES.products },
  { label: 'Services', to: ROUTES.services },
  { label: 'Videos',   to: ROUTES.videos },
  { label: 'Articles', to: ROUTES.articles },
  { label: 'FAQ',      to: ROUTES.faq },
  { label: 'Contact',  to: ROUTES.contact },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: settings } = useSettings();

  const businessName = settings?.businessName ?? 'SolarPro';
  const phone        = settings?.phone ?? settings?.whatsappNumber;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">

      {/* Top bar — phone number */}
      {phone && (
        <div className="bg-amber-600 text-white text-xs py-1 text-center hidden sm:block">
          <a href={`tel:${phone}`} className="inline-flex items-center gap-1 hover:underline">
            <Phone className="h-3 w-3" />
            {phone}
          </a>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to={ROUTES.home}
            className="flex items-center gap-2 font-bold text-xl text-amber-600 shrink-0"
          >
            {settings?.logo ? (
              <img
                src={settings.logo}
                alt={businessName}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <Sun className="h-6 w-6" />
            )}
            <span>{businessName}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-amber-600' : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="md:hidden border-t border-gray-200 bg-white px-4 py-3 flex flex-col gap-3">
          {navLinks.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-amber-600' : 'text-gray-600'}`
              }
            >
              {label}
            </NavLink>
          ))}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="text-sm font-medium text-amber-600 flex items-center gap-1"
            >
              <Phone className="h-4 w-4" />
              {phone}
            </a>
          )}
        </nav>
      )}
    </header>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Sun, Menu, X, Phone, Search } from 'lucide-react';
import { ROUTES } from '../../lib/constants';
import { useSettings } from '../../hooks/useSettings';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';

const navLinks = [
  { label: 'Home',        to: ROUTES.home },
  { label: 'Products',    to: ROUTES.products },
  { label: 'Services',    to: ROUTES.services },
  { label: 'Videos',      to: ROUTES.videos },
  { label: 'Articles',    to: ROUTES.articles },
  { label: 'FAQ',         to: ROUTES.faq },
  { label: 'Contact',     to: ROUTES.contact },
  { label: 'Get Support', to: ROUTES.technicalSupport },
];

// ── Inline search dropdown ────────────────────────────────────────────────────

function SearchBar({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data, isLoading, isReady } = useGlobalSearch(query);

  // Auto-focus when opened
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const goToResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      navigate(`${ROUTES.search}?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  const totalResults = data?.totalResults ?? 0;
  const showDropdown = isReady && (isLoading || totalResults > 0);

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <form onSubmit={goToResults} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, services, articles…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
            aria-label="Global search"
          />
        </div>
        <button type="submit"
          className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg
                     hover:bg-amber-700 transition-colors shrink-0">
          Search
        </button>
        <button type="button" onClick={onClose} aria-label="Close search"
          className="p-2 text-gray-500 hover:text-gray-800 shrink-0">
          <X className="h-5 w-5" />
        </button>
      </form>

      {/* Inline quick-results dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border
                        border-gray-200 shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto">
          {isLoading && (
            <p className="text-sm text-gray-400 px-4 py-3">Searching…</p>
          )}

          {!isLoading && totalResults === 0 && (
            <p className="text-sm text-gray-500 px-4 py-3">No results for "{query}"</p>
          )}

          {!isLoading && data && totalResults > 0 && (
            <>
              {/* Products */}
              {data.results.products.slice(0, 3).map((p) => {
                const img = p.images.find((i) => i.isPrimary) ?? p.images[0];
                return (
                  <Link key={p._id} to={ROUTES.productDetail(p.slug)}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors border-b border-gray-50">
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 shrink-0">
                      {img && <img src={img.url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">Product</p>
                    </div>
                  </Link>
                );
              })}

              {/* Services */}
              {data.results.services.slice(0, 2).map((s) => (
                <Link key={s._id} to={ROUTES.serviceDetail(s.slug)}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors border-b border-gray-50">
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-amber-50 shrink-0 flex items-center justify-center">
                    <span className="text-lg">⚡</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">Service</p>
                  </div>
                </Link>
              ))}

              {/* Articles */}
              {data.results.articles.slice(0, 2).map((a) => (
                <Link key={a._id} to={ROUTES.articleDetail(a.slug)}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors border-b border-gray-50">
                  <div className="w-10 h-10 rounded-md bg-blue-50 shrink-0 flex items-center justify-center">
                    <span className="text-lg">📄</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400">Article</p>
                  </div>
                </Link>
              ))}

              {/* View all */}
              {totalResults > 5 && (
                <button onClick={() => {
                  navigate(`${ROUTES.search}?q=${encodeURIComponent(query.trim())}`);
                  onClose();
                }}
                  className="w-full px-4 py-3 text-sm font-medium text-amber-600 hover:bg-amber-50
                             transition-colors text-center border-t border-gray-100">
                  View all {totalResults} results for "{query}" →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

export default function Header() {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: settings } = useSettings();

  const businessName = settings?.businessName ?? 'SolarPro';
  const phone        = settings?.phone ?? settings?.whatsappNumber;

  // Keyboard shortcut: Ctrl/Cmd+K opens search
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">

      {/* Top bar — phone number */}
      {phone && (
        <div className="bg-amber-600 text-white text-xs py-1 text-center hidden sm:block">
          <a href={`tel:${phone}`} className="inline-flex items-center gap-1 hover:underline">
            <Phone className="h-3 w-3" />{phone}
          </a>
        </div>
      )}

      {/* Search bar — full-width overlay when open */}
      {searchOpen && (
        <div className="border-b border-gray-200 bg-white px-4 sm:px-6 py-3">
          <SearchBar onClose={closeSearch} />
        </div>
      )}

      {!searchOpen && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to={ROUTES.home}
              className="flex items-center gap-2 font-bold text-xl text-amber-600 shrink-0">
              {settings?.logo ? (
                <img src={settings.logo} alt={businessName}
                  className="h-8 w-auto object-contain" />
              ) : (
                <Sun className="h-6 w-6" />
              )}
              <span>{businessName}</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-5">
              {navLinks.map(({ label, to }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${
                      isActive ? 'text-amber-600' : 'text-gray-600 hover:text-gray-900'
                    }`}>
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Search icon */}
              <button onClick={openSearch} aria-label="Search (Ctrl+K)"
                title="Search (Ctrl+K)"
                className="p-2 rounded-md text-gray-600 hover:text-amber-600 hover:bg-amber-50
                           transition-colors">
                <Search className="h-5 w-5" />
              </button>

              {/* Mobile menu toggle */}
              <button
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle navigation menu"
                aria-expanded={menuOpen}>
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile nav */}
      {menuOpen && !searchOpen && (
        <nav className="lg:hidden border-t border-gray-200 bg-white px-4 py-3 flex flex-col gap-3">
          {navLinks.map(({ label, to }) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-amber-600' : 'text-gray-600'}`}>
              {label}
            </NavLink>
          ))}
          {phone && (
            <a href={`tel:${phone}`}
              className="text-sm font-medium text-amber-600 flex items-center gap-1">
              <Phone className="h-4 w-4" />{phone}
            </a>
          )}
        </nav>
      )}
    </header>
  );
}

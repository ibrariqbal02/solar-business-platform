import { Link } from 'react-router-dom';
import { Sun } from 'lucide-react';
import { ROUTES } from '../../lib/constants';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <Sun className="h-5 w-5 text-amber-400" />
              <span>SolarPro</span>
            </div>
            <p className="text-sm text-gray-400">
              Powering homes and businesses with clean, renewable solar energy solutions.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Products', to: ROUTES.products },
                { label: 'Services', to: ROUTES.services },
                { label: 'Articles', to: ROUTES.articles },
                { label: 'Contact', to: ROUTES.contact },
              ].map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className="hover:text-amber-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact placeholder */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">
              Contact
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>info@solarpro.com.au</li>
              <li>1800 SOLAR PRO</li>
              <li>Australia-wide service</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-800 pt-6 text-sm text-gray-500 text-center">
          © {new Date().getFullYear()} SolarPro. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

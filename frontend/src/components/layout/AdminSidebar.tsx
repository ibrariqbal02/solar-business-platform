import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Wrench,
  FileText,
  Video,
  Users,
  Star,
  HelpCircle,
  Settings,
  Image,
  Sun,
  LogOut,
} from 'lucide-react';
import { ROUTES } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { label: 'Dashboard', to: ROUTES.adminDashboard, icon: LayoutDashboard, end: true },
  { label: 'Products', to: ROUTES.adminProducts, icon: Package },
  { label: 'Services', to: ROUTES.adminServices, icon: Wrench },
  { label: 'Articles', to: ROUTES.adminArticles, icon: FileText },
  { label: 'Videos', to: ROUTES.adminVideos, icon: Video },
  { label: 'Leads', to: ROUTES.adminLeads, icon: Users },
  { label: 'Testimonials', to: ROUTES.adminTestimonials, icon: Star },
  { label: 'FAQs', to: ROUTES.adminFaqs, icon: HelpCircle },
  { label: 'Media', to: ROUTES.adminMedia, icon: Image },
  { label: 'Settings', to: ROUTES.adminSettings, icon: Settings },
];

export default function AdminSidebar() {
  const { admin, clearAuth } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-gray-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <Sun className="h-6 w-6 text-amber-400" />
        <span className="text-white font-bold text-lg">SolarPro Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-gray-800">
        {admin && (
          <p className="text-xs text-gray-500 mb-3 truncate">
            Signed in as <span className="text-gray-300">{admin.email}</span>
          </p>
        )}
        <button
          onClick={clearAuth}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

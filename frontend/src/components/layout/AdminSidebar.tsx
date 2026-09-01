import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
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
  Bell,
  KeyRound,
} from 'lucide-react';
import { ROUTES } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { label: 'Dashboard',     to: ROUTES.adminDashboard,     icon: LayoutDashboard, end: true },
  { label: 'Products',      to: ROUTES.adminProducts,      icon: Package },
  { label: 'Categories',    to: ROUTES.adminCategories,    icon: Layers },
  { label: 'Services',      to: ROUTES.adminServices,      icon: Wrench },
  { label: 'Videos',        to: ROUTES.adminVideos,        icon: Video },
  { label: 'Articles',      to: ROUTES.adminArticles,      icon: FileText },
  { label: 'FAQs',          to: ROUTES.adminFaqs,          icon: HelpCircle },
  { label: 'Testimonials',  to: ROUTES.adminTestimonials,  icon: Star },
  { label: 'Leads',         to: ROUTES.adminLeads,         icon: Users },
  { label: 'Notifications', to: ROUTES.adminNotifications, icon: Bell },
  { label: 'Media',         to: ROUTES.adminMedia,         icon: Image },
  { label: 'Settings',      to: ROUTES.adminSettings,      icon: Settings },
];

export default function AdminSidebar() {
  const { admin, logout } = useAuth();

  const handleLogout = () => {
    void logout();
  };

  return (
    <aside className="w-64 min-h-screen bg-gray-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <Sun className="h-6 w-6 text-amber-400" aria-hidden="true" />
        <span className="text-white font-bold text-lg">SolarPro Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Admin navigation">
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
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Account section */}
      <div className="px-4 py-4 border-t border-gray-800 space-y-3">
        {/* Admin info */}
        {admin && (
          <div className="px-1">
            <p className="text-xs font-medium text-gray-300 truncate">{admin.name}</p>
            <p className="text-xs text-gray-500 truncate">{admin.email}</p>
            <span className="inline-block mt-1 px-1.5 py-0.5 text-xs rounded bg-gray-800 text-gray-400 capitalize">
              {admin.role.replace('_', ' ')}
            </span>
          </div>
        )}

        {/* Change password */}
        <NavLink
          to={ROUTES.adminChangePassword}
          className={({ isActive }) =>
            `flex items-center gap-2 w-full px-1 text-sm transition-colors ${
              isActive ? 'text-amber-400' : 'text-gray-400 hover:text-white'
            }`
          }
        >
          <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />
          Change password
        </NavLink>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

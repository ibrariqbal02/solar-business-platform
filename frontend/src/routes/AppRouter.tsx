import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout  from './PublicLayout';
import AdminLayout   from './AdminLayout';
import ProtectedRoute from './ProtectedRoute';

// Public pages
import Home          from '../pages/public/Home';
import Products      from '../pages/public/Products';
import ProductDetail from '../pages/public/ProductDetail';
import Services      from '../pages/public/Services';
import ServiceDetail from '../pages/public/ServiceDetail';
import Videos        from '../pages/public/Videos';
import Articles      from '../pages/public/Articles';
import Contact       from '../pages/public/Contact';

// Admin pages
import Login         from '../pages/admin/Login';
import AdminDashboard from '../pages/admin/Dashboard';

export default function AppRouter() {
  return (
    <Routes>
      {/* ── Public routes ─────────────────────────────────────── */}
      <Route element={<PublicLayout />}>
        <Route index                      element={<Home />} />
        <Route path="products"            element={<Products />} />
        <Route path="products/:slug"      element={<ProductDetail />} />
        <Route path="services"            element={<Services />} />
        <Route path="services/:slug"      element={<ServiceDetail />} />
        <Route path="videos"              element={<Videos />} />
        <Route path="articles"            element={<Articles />} />
        <Route path="contact"             element={<Contact />} />
      </Route>

      {/* ── Admin login (no sidebar) ──────────────────────────── */}
      <Route path="admin/login" element={<Login />} />

      {/* ── Protected admin routes ────────────────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* ── Fallback ──────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout          from './PublicLayout';
import AdminLayout           from './AdminLayout';
import ProtectedRoute        from './ProtectedRoute';

// Public pages
import Home                  from '../pages/public/Home';
import Products              from '../pages/public/Products';
import ProductDetail         from '../pages/public/ProductDetail';
import Services              from '../pages/public/Services';
import ServiceDetail         from '../pages/public/ServiceDetail';
import Videos                from '../pages/public/Videos';
import Articles              from '../pages/public/Articles';
import ArticleDetail         from '../pages/public/ArticleDetail';
import FAQPage               from '../pages/public/FAQ';
import Contact               from '../pages/public/Contact';
import TechnicalSupport      from '../pages/public/TechnicalSupport';
import VideoCallRequest      from '../pages/public/VideoCallRequest';
import SiteVisitRequest      from '../pages/public/SiteVisitRequest';
import InstallationRequest   from '../pages/public/InstallationRequest';
import SearchResults         from '../pages/public/SearchResults';

// Admin pages
import Login                 from '../pages/admin/Login';
import AdminDashboard        from '../pages/admin/Dashboard';
import AdminProducts         from '../pages/admin/Products';
import AdminCategories       from '../pages/admin/Categories';
import AdminServices         from '../pages/admin/Services';
import AdminVideos           from '../pages/admin/Videos';
import AdminArticles         from '../pages/admin/Articles';
import AdminFAQs             from '../pages/admin/FAQs';
import AdminTestimonials     from '../pages/admin/Testimonials';
import AdminLeads            from '../pages/admin/Leads';
import AdminNotifications    from '../pages/admin/Notifications';
import AdminMedia            from '../pages/admin/Media';
import AdminSettings         from '../pages/admin/Settings';
import ChangePassword        from '../pages/admin/ChangePassword';

export default function AppRouter() {
  return (
    <Routes>
      {/* ── Public routes ──────────────────────────────────────────────── */}
      <Route element={<PublicLayout />}>
        <Route index                            element={<Home />} />
        <Route path="products"                  element={<Products />} />
        <Route path="products/:slug"            element={<ProductDetail />} />
        <Route path="services"                  element={<Services />} />
        <Route path="services/:slug"            element={<ServiceDetail />} />
        <Route path="videos"                    element={<Videos />} />
        <Route path="articles"                  element={<Articles />} />
        <Route path="articles/:slug"            element={<ArticleDetail />} />
        <Route path="faq"                       element={<FAQPage />} />
        <Route path="contact"                   element={<Contact />} />
        <Route path="search"                    element={<SearchResults />} />
        {/* Support sub-pages */}
        <Route path="support/technical"         element={<TechnicalSupport />} />
        <Route path="support/video-call"        element={<VideoCallRequest />} />
        <Route path="support/site-visit"        element={<SiteVisitRequest />} />
        <Route path="support/installation"      element={<InstallationRequest />} />
      </Route>

      {/* ── Admin login — standalone (no sidebar, no auth guard) ───────── */}
      <Route path="admin/login" element={<Login />} />

      {/* ── Protected admin routes — guarded by ProtectedRoute ─────────── */}
      <Route element={<ProtectedRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index                          element={<AdminDashboard />} />
          <Route path="products"               element={<AdminProducts />} />
          <Route path="categories"             element={<AdminCategories />} />
          <Route path="services"               element={<AdminServices />} />
          <Route path="videos"                 element={<AdminVideos />} />
          <Route path="articles"               element={<AdminArticles />} />
          <Route path="faqs"                   element={<AdminFAQs />} />
          <Route path="testimonials"           element={<AdminTestimonials />} />
          <Route path="leads"                  element={<AdminLeads />} />
          <Route path="notifications"          element={<AdminNotifications />} />
          <Route path="media"                  element={<AdminMedia />} />
          <Route path="settings"               element={<AdminSettings />} />
          <Route path="change-password"        element={<ChangePassword />} />
        </Route>
      </Route>

      {/* ── Fallback ───────────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

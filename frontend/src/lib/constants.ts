export const APP_NAME = 'Solar Business Platform';

export const QUERY_KEYS = {
  products: 'products',
  services: 'services',
  articles: 'articles',
  videos: 'videos',
  testimonials: 'testimonials',
  faqs: 'faqs',
  leads: 'leads',
  settings: 'settings',
  dashboard: 'dashboard',
  analytics: 'analytics',
  notifications: 'notifications',
} as const;

export const ROUTES = {
  home: '/',
  products: '/products',
  productDetail: (slug: string) => `/products/${slug}`,
  services: '/services',
  serviceDetail: (slug: string) => `/services/${slug}`,
  articles: '/articles',
  articleDetail: (slug: string) => `/articles/${slug}`,
  contact: '/contact',
  about: '/about',
  // Admin
  adminLogin: '/admin/login',
  adminDashboard: '/admin',
  adminProducts: '/admin/products',
  adminServices: '/admin/services',
  adminArticles: '/admin/articles',
  adminVideos: '/admin/videos',
  adminLeads: '/admin/leads',
  adminTestimonials: '/admin/testimonials',
  adminFaqs: '/admin/faqs',
  adminSettings: '/admin/settings',
  adminMedia: '/admin/media',
} as const;

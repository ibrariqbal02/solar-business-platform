import { Link } from 'react-router-dom';
import { Sun, Zap, Shield, ArrowRight, Star } from 'lucide-react';
import TestimonialsSection from '../../components/sections/TestimonialsSection';
import TestimonialForm from '../../components/forms/TestimonialForm';
import { ROUTES } from '../../lib/constants';

const features = [
  { icon: Sun,    title: 'Solar Panels',     desc: 'High-efficiency panels for residential and commercial use.' },
  { icon: Zap,    title: 'Inverters',        desc: 'Reliable on-grid, off-grid, and hybrid inverter systems.' },
  { icon: Shield, title: 'After-Sales Care', desc: 'Dedicated support, warranty management, and maintenance.' },
  { icon: Star,   title: 'Trusted Brand',    desc: 'Thousands of satisfied customers across Pakistan.' },
];

export default function Home() {
  return (
    <div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-amber-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-amber-100 text-amber-700
                           rounded-full px-4 py-1 text-sm font-semibold mb-6">
            <Sun className="h-4 w-4" />
            Pakistan's Solar Energy Experts
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
            Power Your Home with <span className="text-amber-600">Clean Solar Energy</span>
          </h1>
          <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            We supply, install, and maintain premium solar systems for homes, businesses,
            and industries across Pakistan. Cut your electricity bills — permanently.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={ROUTES.contact}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700
                         text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              Get a Free Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={ROUTES.products}
              className="inline-flex items-center gap-2 border border-gray-300 hover:border-amber-400
                         text-gray-700 hover:text-amber-600 font-semibold px-6 py-3 rounded-lg transition-colors">
              Browse Products
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Why Choose Us?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center p-6
                                          rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <TestimonialsSection />

      {/* ── Submit review CTA ─────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-xl mx-auto">
          <TestimonialForm />
        </div>
      </section>

      {/* ── Services teaser ──────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-amber-600">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Ready to Go Solar?</h2>
          <p className="text-amber-100 mb-8">
            Browse our complete range of services — from site surveys to full installation and beyond.
          </p>
          <Link to={ROUTES.services}
            className="inline-flex items-center gap-2 bg-white text-amber-700
                       font-semibold px-6 py-3 rounded-lg hover:bg-amber-50 transition-colors">
            Explore Services <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}

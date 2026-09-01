import { useState, useMemo } from 'react';
import { ChevronDown, Search, HelpCircle, ServerCrash } from 'lucide-react';
import { useFAQs } from '../../hooks/useFAQs';
import { Skeleton } from '../../components/ui/Skeleton';
import { cn } from '../../lib/utils';
import { FAQ_CATEGORY_LABELS, FAQ_CATEGORY_ORDER } from '../../types/faq.types';
import type { FAQ, FAQCategory } from '../../types/faq.types';

// ── Single accordion item ─────────────────────────────────────────────────────

function FAQItem({ faq, isOpen, onToggle }: {
  faq: FAQ;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn(
      'border rounded-lg overflow-hidden transition-shadow',
      isOpen ? 'border-amber-300 shadow-sm' : 'border-gray-200',
    )}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 px-5 py-4
                   text-left bg-white hover:bg-amber-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900 leading-snug">
          {faq.question}
        </span>
        <ChevronDown className={cn(
          'h-5 w-5 text-amber-500 shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180',
        )} />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-0 bg-white border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed pt-3">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

// ── Loading skeletons ─────────────────────────────────────────────────────────

function FAQSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FAQPage() {
  const { data: faqs = [], isLoading, isError } = useFAQs();
  const [openId, setOpenId]     = useState<string | null>(null);
  const [search, setSearch]     = useState('');

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  // ── Client-side search ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return faqs;
    const q = search.toLowerCase();
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q),
    );
  }, [faqs, search]);

  // ── Group by category in defined order ────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<FAQCategory, FAQ[]>();
    for (const cat of FAQ_CATEGORY_ORDER) {
      const items = filtered.filter((f) => f.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [filtered]);

  return (
    <div className="py-8 max-w-3xl mx-auto">
      {/* Heading */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
        <p className="mt-2 text-gray-500">
          Everything you need to know about our solar products and services.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search questions…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpenId(null); }}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
        />
      </div>

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
          <ServerCrash className="h-10 w-10 text-red-300 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Failed to load FAQs.</p>
          <p className="text-sm text-red-500 mt-1">Make sure the backend is running.</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && <FAQSkeleton />}

      {/* No results */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="py-16 flex flex-col items-center text-center">
          <HelpCircle className="h-14 w-14 text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">No questions found</p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-3 text-sm text-amber-600 hover:underline">
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Grouped accordion */}
      {!isLoading && !isError && grouped.size > 0 && (
        <div className="space-y-10">
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="text-base font-bold text-gray-700 uppercase tracking-wider mb-4
                             flex items-center gap-2">
                <span className="h-px flex-1 bg-gray-200" />
                {FAQ_CATEGORY_LABELS[cat]}
                <span className="h-px flex-1 bg-gray-200" />
              </h2>
              <div className="space-y-2">
                {items.map((faq) => (
                  <FAQItem
                    key={faq._id}
                    faq={faq}
                    isOpen={openId === faq._id}
                    onToggle={() => toggle(faq._id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Summary */}
      {!isLoading && !isError && faqs.length > 0 && (
        <p className="mt-10 text-center text-sm text-gray-400">
          Showing {filtered.length} of {faqs.length} question{faqs.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

// Matches backend/src/models/faq.model.ts exactly

export type FAQCategory =
  | 'general'
  | 'products'
  | 'installation'
  | 'delivery'
  | 'technical_support'
  | 'pricing'
  | 'warranty'
  | 'other';

export const FAQ_CATEGORY_LABELS: Record<FAQCategory, string> = {
  general:           'General',
  products:          'Products',
  installation:      'Installation',
  delivery:          'Delivery',
  technical_support: 'Technical Support',
  pricing:           'Pricing',
  warranty:          'Warranty',
  other:             'Other',
};

export const FAQ_CATEGORY_ORDER: FAQCategory[] = [
  'general',
  'products',
  'installation',
  'delivery',
  'technical_support',
  'pricing',
  'warranty',
  'other',
];

export interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category: FAQCategory;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/faqs/active returns:
 * { success: true, count: number, data: FAQ[] }
 * Note: no pagination object — returns all active FAQs sorted by category+order.
 */
export interface ActiveFAQsResponse {
  success: boolean;
  count: number;
  data: FAQ[];
}

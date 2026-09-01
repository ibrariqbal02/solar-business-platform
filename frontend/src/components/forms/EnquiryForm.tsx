import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useSubmitLead } from '../../hooks/useLeads';
import { trackEvent } from '../../lib/analytics';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { LeadType } from '../../types/lead.types';
import type { EventType } from '../../types/analytics.types';

// Map lead type → analytics event type
const LEAD_EVENT: Partial<Record<LeadType, EventType>> = {
  contact:           'contact_form_submitted',
  technical_support: 'technical_support_click',
  video_call:        'video_call_request',
  site_visit:        'site_visit_request',
  installation:      'installation_request',
};

// ─────────────────────────────────────────────────────────────────────────────
// One unified schema that makes ALL extra fields optional at the Zod level.
// Per-type required fields are enforced via .superRefine so we only need one
// `useForm<FormValues>` — no casting gymnastics required.
// ─────────────────────────────────────────────────────────────────────────────

const formSchema = z
  .object({
    // ── Base fields (always required) ───────────────────────────────────────
    customerName:    z.string().min(2, 'Name must be at least 2 characters').max(100),
    customerPhone:   z.string().min(7, 'Enter a valid phone number').max(20),
    customerWhatsApp: z.string().max(20).optional().or(z.literal('')),
    customerEmail:   z.string().email('Enter a valid email').optional().or(z.literal('')),

    // ── contact ─────────────────────────────────────────────────────────────
    message: z.string().max(1000).optional().or(z.literal('')),

    // ── technical_support / video_call ──────────────────────────────────────
    problem:      z.string().max(1000).optional().or(z.literal('')),
    productModel: z.string().max(100).optional().or(z.literal('')),

    // ── video_call ──────────────────────────────────────────────────────────
    preferredDate: z.string().optional().or(z.literal('')),
    preferredTime: z.string().optional().or(z.literal('')),

    // ── site_visit / installation ────────────────────────────────────────────
    address:             z.string().max(300).optional().or(z.literal('')),
    city:                z.string().max(100).optional().or(z.literal('')),
    propertyType:        z.string().optional().or(z.literal('')),
    estimatedSystemSize: z.string().optional().or(z.literal('')),
  });

type FormValues = z.infer<typeof formSchema>;

// ── Component props ───────────────────────────────────────────────────────────

interface EnquiryFormProps {
  type: LeadType;
  title?: string;
  subtitle?: string;
  /** Called after successful submit (e.g. to close a modal) */
  onSuccess?: () => void;
}

const TITLES: Record<LeadType, string> = {
  contact:           'Get in Touch',
  technical_support: 'Technical Support Request',
  video_call:        'Book a Video Call',
  site_visit:        'Schedule a Site Visit',
  installation:      'Request Installation Quote',
  product_enquiry:   'Product Enquiry',
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-type client-side validation (called before submit)
// ─────────────────────────────────────────────────────────────────────────────

function validate(type: LeadType, values: FormValues): string | null {
  if (type === 'contact' && !values.message?.trim())
    return 'Message is required.';
  if ((type === 'technical_support' || type === 'video_call') && !values.problem?.trim())
    return 'Problem description is required.';
  if ((type === 'site_visit' || type === 'installation') && !values.address?.trim())
    return 'Address is required.';
  if ((type === 'site_visit' || type === 'installation') && !values.city?.trim())
    return 'City is required.';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function EnquiryForm({ type, title, subtitle, onSuccess }: EnquiryFormProps) {
  const { mutate, isPending, isSuccess, isError, error, reset: resetMutation } = useSubmitLead();

  const {
    register,
    handleSubmit,
    reset: resetForm,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (values: FormValues) => {
    // Per-type extra validation
    const validationError = validate(type, values);
    if (validationError) {
      // Map to the right field so the error shows inline
      const fieldMap: Record<string, keyof FormValues> = {
        'Message is required.':              'message',
        'Problem description is required.':  'problem',
        'Address is required.':              'address',
        'City is required.':                 'city',
      };
      const field = fieldMap[validationError] ?? 'customerName';
      setError(field, { message: validationError });
      return;
    }

    // Build per-type data payload
    let data: Record<string, unknown> = {};
    if (type === 'contact')
      data = { message: values.message };
    if (type === 'technical_support')
      data = { problem: values.problem, ...(values.productModel ? { productModel: values.productModel } : {}) };
    if (type === 'video_call')
      data = {
        problem: values.problem,
        ...(values.preferredDate ? { preferredDate: values.preferredDate } : {}),
        ...(values.preferredTime ? { preferredTime: values.preferredTime } : {}),
      };
    if (type === 'site_visit')
      data = {
        address: values.address,
        city: values.city,
        ...(values.preferredDate ? { preferredDate: values.preferredDate } : {}),
      };
    if (type === 'installation')
      data = {
        address: values.address,
        city: values.city,
        ...(values.propertyType        ? { propertyType:        values.propertyType }        : {}),
        ...(values.estimatedSystemSize ? { estimatedSystemSize: values.estimatedSystemSize } : {}),
      };

    mutate(
      {
        type,
        customerName:     values.customerName,
        customerPhone:    values.customerPhone,
        customerWhatsApp: values.customerWhatsApp  || undefined,
        customerEmail:    values.customerEmail     || undefined,
        data,
      },
      {
        onSuccess: () => {
          const evType = LEAD_EVENT[type];
          if (evType) trackEvent({ eventType: evType, metadata: { leadType: type } });
          resetForm();
          onSuccess?.();
        },
      },
    );
  };

  // ── Success state ────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center py-10 px-4">
        <CheckCircle className="h-14 w-14 text-green-500 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Enquiry Submitted!</h3>
        <p className="text-gray-500 max-w-sm">
          Thanks! We've received your request and will get back to you shortly.
        </p>
        <Button variant="outline" className="mt-6"
          onClick={() => { resetMutation(); resetForm(); }}>
          Submit Another
        </Button>
      </div>
    );
  }

  const errorMsg = isError
    ? ((error as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Something went wrong. Please try again.')
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

      {/* Title */}
      <div className="mb-2">
        <h2 className="text-xl font-bold text-gray-900">{title ?? TITLES[type]}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>

      {/* API error banner */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {errorMsg}
        </div>
      )}

      {/* ── Base fields (all types) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Full Name" required placeholder="Your name"
          error={errors.customerName?.message} {...register('customerName')} />
        <Input label="Phone Number" required type="tel" placeholder="+92 3XX XXXXXXX"
          error={errors.customerPhone?.message} {...register('customerPhone')} />
        <Input label="WhatsApp Number" type="tel" placeholder="If different from phone"
          {...register('customerWhatsApp')} />
        <Input label="Email Address" type="email" placeholder="optional"
          error={errors.customerEmail?.message} {...register('customerEmail')} />
      </div>

      {/* ── contact ─────────────────────────────────────────────────────── */}
      {type === 'contact' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea rows={4} placeholder="How can we help?"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none"
            {...register('message')} />
          {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>}
        </div>
      )}

      {/* ── technical_support ───────────────────────────────────────────── */}
      {type === 'technical_support' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Problem Description <span className="text-red-500">*</span>
            </label>
            <textarea rows={4} placeholder="Describe the issue you're facing…"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none"
              {...register('problem')} />
            {errors.problem && <p className="mt-1 text-xs text-red-600">{errors.problem.message}</p>}
          </div>
          <Input label="Product / Inverter Model" placeholder="e.g. Growatt SPH 5000 (optional)"
            {...register('productModel')} />
        </>
      )}

      {/* ── video_call ───────────────────────────────────────────────────── */}
      {type === 'video_call' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issue Description <span className="text-red-500">*</span>
            </label>
            <textarea rows={3} placeholder="What would you like to discuss?"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none"
              {...register('problem')} />
            {errors.problem && <p className="mt-1 text-xs text-red-600">{errors.problem.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Preferred Date" type="date" {...register('preferredDate')} />
            <Input label="Preferred Time" type="time" {...register('preferredTime')} />
          </div>
        </>
      )}

      {/* ── site_visit ───────────────────────────────────────────────────── */}
      {type === 'site_visit' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Address" required placeholder="Street / area"
              error={errors.address?.message} {...register('address')} />
            <Input label="City" required placeholder="e.g. Lahore"
              error={errors.city?.message} {...register('city')} />
          </div>
          <Input label="Preferred Date" type="date" {...register('preferredDate')} />
        </>
      )}

      {/* ── installation ─────────────────────────────────────────────────── */}
      {type === 'installation' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Address" required placeholder="Street / area"
              error={errors.address?.message} {...register('address')} />
            <Input label="City" required placeholder="e.g. Lahore"
              error={errors.city?.message} {...register('city')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
              <select
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
                {...register('propertyType')}>
                <option value="">Select (optional)</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="agricultural">Agricultural</option>
              </select>
            </div>
            <Input label="Estimated System Size" placeholder="e.g. 5 kW (optional)"
              {...register('estimatedSystemSize')} />
          </div>
        </>
      )}

      <Button type="submit" isLoading={isPending} className="w-full">
        {isPending
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
          : 'Submit Enquiry'}
      </Button>
    </form>
  );
}

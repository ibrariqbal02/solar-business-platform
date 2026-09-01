import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useSubmitTestimonial } from '../../hooks/useTestimonials';
import Button from '../ui/Button';
import Input from '../ui/Input';

const schema = z.object({
  customerName:     z.string().min(2, 'Name required').max(100),
  customerLocation: z.string().max(100).optional().or(z.literal('')),
  review:           z.string().min(20, 'Review must be at least 20 characters').max(2000),
  rating:           z.number().min(1).max(5),
  relatedService:   z.string().max(100).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function TestimonialForm() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [hoverRating, setHoverRating] = useState(0);

  const { mutate, isPending, isSuccess, isError, error, reset: resetMutation } = useSubmitTestimonial();

  const { register, handleSubmit, watch, setValue, reset: resetForm, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rating: 0 },
  });

  const rating = watch('rating');

  const onSubmit = (values: FormValues) => {
    mutate(
      {
        customerName:     values.customerName,
        customerLocation: values.customerLocation || undefined,
        review:           values.review,
        rating:           values.rating,
        relatedService:   values.relatedService || undefined,
        customerImage:    imageFile ?? undefined,
      },
      {
        onSuccess: () => {
          resetForm();
          setImageFile(null);
        },
      },
    );
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center py-8">
        <CheckCircle className="h-14 w-14 text-green-500 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h3>
        <p className="text-gray-500 max-w-sm text-sm">
          Your review has been submitted and is pending admin approval. We'll publish it shortly.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => { resetMutation(); resetForm(); setImageFile(null); }}>
          Submit Another
        </Button>
      </div>
    );
  }

  const errorMsg = isError
    ? ((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to submit. Please try again.')
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Share Your Experience</h2>
        <p className="text-sm text-gray-500 mt-1">Your review helps others make informed decisions.</p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Your Name" required placeholder="Full name"
          error={errors.customerName?.message} {...register('customerName')} />
        <Input label="Location" placeholder="City, Country (optional)"
          error={errors.customerLocation?.message} {...register('customerLocation')} />
      </div>

      {/* Star rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button"
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setValue('rating', n, { shouldValidate: true })}
              aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
              className="focus:outline-none"
            >
              <Star className={`h-7 w-7 transition-colors ${
                n <= (hoverRating || rating)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-200 fill-gray-200 hover:text-amber-300'
              }`} />
            </button>
          ))}
        </div>
        {errors.rating && <p className="mt-1 text-xs text-red-600">Please select a rating</p>}
      </div>

      {/* Review text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Review <span className="text-red-500">*</span>
        </label>
        <textarea rows={4} placeholder="Tell us about your experience…"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none"
          {...register('review')} />
        {errors.review && <p className="mt-1 text-xs text-red-600">{errors.review.message}</p>}
      </div>

      <Input label="Related Service (optional)" placeholder="e.g. Solar Panel Installation"
        {...register('relatedService')} />

      {/* Photo upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
        <input type="file" accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4
                     file:rounded-md file:border-0 file:text-sm file:font-medium
                     file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" />
        {imageFile && <p className="mt-1 text-xs text-gray-500">{imageFile.name}</p>}
      </div>

      <Button type="submit" isLoading={isPending} className="w-full">
        {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Submit Review'}
      </Button>
    </form>
  );
}

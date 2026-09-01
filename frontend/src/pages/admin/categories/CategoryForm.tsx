import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, X, Save, Loader2 } from 'lucide-react';
import { categoriesApi } from '../../../api/categories.api';
import { QUERY_KEYS, ROUTES } from '../../../lib/constants';
import { cn, imageUrl } from '../../../lib/utils';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import type { Category } from '../../../types/product.types';

// ─── Validation ───────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name:        z.string().min(1, 'Category name is required').max(100, 'Max 100 characters'),
  description: z.string().max(500, 'Max 500 characters').optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface CategoryFormProps {
  mode: 'create' | 'edit';
  category?: Category;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CategoryForm({ mode, category }: CategoryFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Image state ────────────────────────────────────────────────────────────
  // existingImageUrl: the current saved image (edit mode)
  // newFile / newPreview: a new file the user has picked but not yet submitted
  // removeExisting: flag to tell the backend to delete the current image on save
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>(undefined);
  const [newFile, setNewFile]     = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form ──────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '' },
  });

  // ── Prefill in edit mode ──────────────────────────────────────────────────

  useEffect(() => {
    if (mode === 'edit' && category) {
      reset({
        name:        category.name,
        description: category.description ?? '',
      });
      setExistingImageUrl(category.image);
    }
  }, [mode, category, reset]);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (newPreview) URL.revokeObjectURL(newPreview);
    };
  }, [newPreview]);

  // ── Image handlers ────────────────────────────────────────────────────────

  const pickFile = (file: File) => {
    if (newPreview) URL.revokeObjectURL(newPreview);
    setNewFile(file);
    setNewPreview(URL.createObjectURL(file));
    setRemoveExisting(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
    // Reset input so the same file can be re-picked if user clears and re-adds
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) pickFile(file);
  };

  const clearNewFile = () => {
    if (newPreview) URL.revokeObjectURL(newPreview);
    setNewFile(null);
    setNewPreview(null);
  };

  const clearExistingImage = () => {
    setExistingImageUrl(undefined);
    setRemoveExisting(true);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (values: CategoryFormValues) => {
    setServerError(null);
    try {
      const fd = new FormData();
      fd.append('name', values.name);
      if (values.description) fd.append('description', values.description);

      if (newFile) {
        fd.append('image', newFile);
      } else if (removeExisting) {
        fd.append('removeImage', 'true');
      }

      if (mode === 'create') {
        await categoriesApi.create(fd);
      } else {
        await categoriesApi.update(category!._id, fd);
      }

      // Invalidate both admin and public category queries
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.products] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });

      navigate(ROUTES.adminCategories);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'An error occurred. Please try again.');
      setServerError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── Derived image to display ──────────────────────────────────────────────

  // Priority: new file preview > existing saved image (if not removed)
  const displayImage = newPreview ?? (removeExisting ? null : (existingImageUrl ?? null));

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.adminCategories)}
          aria-label="Back to categories list"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Add New Category' : 'Edit Category'}
        </h1>
      </div>

      {/* Server error */}
      {serverError && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* ── Details ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Details
            </h2>
          </CardHeader>
          <CardBody className="space-y-5">
            <Input
              label="Category Name"
              required
              placeholder="e.g. Solar Panels"
              error={errors.name?.message}
              {...register('name')}
            />

            {/* Slug — read-only info in edit mode */}
            {mode === 'edit' && category?.slug && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-500">Slug (auto-generated)</span>
                <code className="inline-block rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-600 font-mono">
                  {category.slug}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
                <span className="ml-1 text-xs font-normal text-gray-400">(optional, max 500 chars)</span>
              </label>
              <textarea
                id="description"
                rows={3}
                placeholder="Brief description of this category"
                className={cn(
                  'block w-full rounded-md border px-3 py-2 text-sm shadow-sm resize-none',
                  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0',
                  errors.description
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-300'
                    : 'border-gray-300 focus:border-amber-400 focus:ring-amber-300',
                )}
                aria-invalid={!!errors.description}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-red-600" role="alert">{errors.description.message}</p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* ── Image ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Category Image
              <span className="ml-1 font-normal text-gray-400 normal-case">(optional)</span>
            </h2>
          </CardHeader>
          <CardBody>
            {displayImage ? (
              /* ── Preview ─────────────────────────────────────────────── */
              <div className="relative inline-block">
                <img
                  src={newPreview ? displayImage : imageUrl(displayImage)}
                  alt="Category preview"
                  className="h-40 w-40 rounded-lg object-cover border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newPreview) clearNewFile();
                    else clearExistingImage();
                  }}
                  aria-label="Remove image"
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                {/* Replace button */}
                <label
                  htmlFor="cat-image-replace"
                  className="mt-3 flex cursor-pointer items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Replace image
                  <input
                    ref={fileInputRef}
                    id="cat-image-replace"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileInput}
                  />
                </label>
              </div>
            ) : (
              /* ── Drop zone ────────────────────────────────────────────── */
              <label
                htmlFor="cat-image-upload"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors',
                  dragOver
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50/30',
                )}
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" aria-hidden="true" />
                <p className="text-sm text-gray-600 text-center">
                  <span className="font-medium text-amber-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP</p>
                <input
                  id="cat-image-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </label>
            )}
          </CardBody>
        </Card>

        {/* ── Submit bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 py-4 border-t border-gray-200 bg-white sticky bottom-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.adminCategories)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="min-w-36">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {mode === 'create' ? 'Creating…' : 'Saving…'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                {mode === 'create' ? 'Create Category' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

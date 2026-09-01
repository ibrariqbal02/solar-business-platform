import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Upload, X, Star, ArrowLeft, Save, Loader2,
} from 'lucide-react';
import { productsApi } from '../../../api/products.api';
import { useCategories } from '../../../hooks/useCategories';
import { QUERY_KEYS, ROUTES } from '../../../lib/constants';
import { cn } from '../../../lib/utils';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import type { Product } from '../../../types/product.types';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const specSchema = z.object({
  label: z.string().min(1, 'Label required'),
  value: z.string().min(1, 'Value required'),
});

const productSchema = z.object({
  name:                z.string().min(1, 'Name is required'),
  category:            z.string().min(1, 'Category is required'),
  shortDescription:    z.string().optional(),
  detailedDescription: z.string().optional(),
  price:               z.coerce.number({ invalid_type_error: 'Must be a number' }).positive('Price must be > 0'),
  discountedPrice:     z.coerce.number().nonnegative().optional().or(z.literal('')),
  unit:                z.string().min(1, 'Unit is required'),
  stock:               z.coerce.number({ invalid_type_error: 'Must be a number' }).nonnegative('Stock must be ≥ 0'),
  tags:                z.string().optional(),   // comma-separated in form, split before submit
  isAvailable:         z.boolean(),
  isFeatured:          z.boolean(),
  specifications:      z.array(specSchema),
  features:            z.array(z.object({ value: z.string().min(1, 'Cannot be empty') })),
  applications:        z.array(z.object({ value: z.string().min(1, 'Cannot be empty') })),
});

type ProductFormValues = z.infer<typeof productSchema>;

// ─── Image state ──────────────────────────────────────────────────────────────

interface ExistingImage {
  kind: 'existing';
  url: string;
  publicId: string;
  isPrimary: boolean;
}

interface NewImage {
  kind: 'new';
  file: File;
  preview: string;
  isPrimary: boolean;
}

type ImageEntry = ExistingImage | NewImage;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductFormProps {
  mode: 'create' | 'edit';
  product?: Product;    // populated in edit mode
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductForm({ mode, product }: ProductFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading: catsLoading } = useCategories();

  const [images, setImages] = useState<ImageEntry[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [imageDragOver, setImageDragOver] = useState(false);

  // ── Form setup ─────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      category: '',
      shortDescription: '',
      detailedDescription: '',
      price: 0,
      discountedPrice: '',
      unit: 'piece',
      stock: 0,
      tags: '',
      isAvailable: true,
      isFeatured: false,
      specifications: [],
      features: [],
      applications: [],
    },
  });

  const { fields: specFields, append: appendSpec, remove: removeSpec } =
    useFieldArray({ control, name: 'specifications' });
  const { fields: featureFields, append: appendFeature, remove: removeFeature } =
    useFieldArray({ control, name: 'features' });
  const { fields: appFields, append: appendApp, remove: removeApp } =
    useFieldArray({ control, name: 'applications' });

  // ── Prefill in edit mode ───────────────────────────────────────────────────

  useEffect(() => {
    if (mode === 'edit' && product) {
      reset({
        name:                product.name,
        category:            typeof product.category === 'string' ? product.category : product.category._id,
        shortDescription:    product.shortDescription ?? '',
        detailedDescription: product.detailedDescription ?? '',
        price:               product.price,
        discountedPrice:     product.discountedPrice ?? '',
        unit:                product.unit,
        stock:               product.stock,
        tags:                product.tags.join(', '),
        isAvailable:         product.isAvailable,
        isFeatured:          product.isFeatured,
        specifications:      product.specifications ?? [],
        features:            product.features.map((v) => ({ value: v })),
        applications:        product.applications.map((v) => ({ value: v })),
      });

      // Populate existing images
      setImages(
        product.images.map((img) => ({
          kind: 'existing',
          url: img.url,
          publicId: img.publicId,
          isPrimary: img.isPrimary,
        })),
      );
    }
  }, [mode, product, reset]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.kind === 'new') URL.revokeObjectURL(img.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Image helpers ──────────────────────────────────────────────────────────

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const slots = 10 - images.length;
    if (slots <= 0) return;
    const accepted = Array.from(files).slice(0, slots);
    setImages((prev) => {
      const hasPrimary = prev.some((i) => i.isPrimary);
      return [
        ...prev,
        ...accepted.map((file, idx) => ({
          kind: 'new' as const,
          file,
          preview: URL.createObjectURL(file),
          isPrimary: !hasPrimary && idx === 0,
        })),
      ];
    });
  }, [images.length]);

  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed.kind === 'new') URL.revokeObjectURL(removed.preview);
      // If the removed image was primary, promote the first remaining image
      if (removed.isPrimary && next.length > 0) next[0] = { ...next[0], isPrimary: true };
      return next;
    });
  };

  const setPrimary = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, isPrimary: i === index })),
    );
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (values: ProductFormValues) => {
    setServerError(null);
    try {
      const fd = new FormData();

      fd.append('name', values.name);
      fd.append('category', values.category);
      if (values.shortDescription)    fd.append('shortDescription', values.shortDescription);
      if (values.detailedDescription) fd.append('detailedDescription', values.detailedDescription);
      fd.append('price', String(values.price));
      if (values.discountedPrice !== '' && values.discountedPrice !== undefined) {
        fd.append('discountedPrice', String(values.discountedPrice));
      }
      fd.append('unit', values.unit);
      fd.append('stock', String(values.stock));
      fd.append('isAvailable', String(values.isAvailable));
      fd.append('isFeatured', String(values.isFeatured));

      // Tags: split comma-separated string
      const tagsArr = values.tags
        ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      fd.append('tags', JSON.stringify(tagsArr));

      fd.append('features',      JSON.stringify(values.features.map((f) => f.value)));
      fd.append('applications',  JSON.stringify(values.applications.map((a) => a.value)));
      fd.append('specifications', JSON.stringify(values.specifications));

      if (mode === 'edit') {
        // Tell the backend which existing images to delete
        const removedPublicIds = (product?.images ?? [])
          .filter((img) => !images.some((i) => i.kind === 'existing' && i.publicId === img.publicId))
          .map((img) => img.publicId);
        if (removedPublicIds.length > 0) {
          fd.append('removeImageIds', JSON.stringify(removedPublicIds));
        }
      }

      // Append new file blobs
      images.forEach((img) => {
        if (img.kind === 'new') fd.append('images', img.file);
      });

      if (mode === 'create') {
        await productsApi.create(fd);
      } else {
        await productsApi.update(product!._id, fd);
      }

      // Invalidate queries so list refreshes
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.products] });

      navigate(ROUTES.adminProducts);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'An error occurred. Please try again.');
      setServerError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.adminProducts)}
          aria-label="Back to products list"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Add New Product' : 'Edit Product'}
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
        {/* ── Basic Info ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Basic Information
            </h2>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Product Name"
                  required
                  placeholder="e.g. 400W Monocrystalline Solar Panel"
                  error={errors.name?.message}
                  {...register('name')}
                />
              </div>

              {/* Category dropdown */}
              <div className="flex flex-col gap-1">
                <label htmlFor="category" className="text-sm font-medium text-gray-700">
                  Category <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                </label>
                <select
                  id="category"
                  className={cn(
                    'block w-full rounded-md border px-3 py-2 text-sm shadow-sm',
                    'focus:outline-none focus:ring-2 focus:ring-offset-0',
                    errors.category
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-300'
                      : 'border-gray-300 focus:border-amber-400 focus:ring-amber-300',
                    'disabled:cursor-not-allowed disabled:bg-gray-50',
                  )}
                  disabled={catsLoading}
                  aria-invalid={!!errors.category}
                  {...register('category')}
                >
                  <option value="">
                    {catsLoading ? 'Loading categories…' : 'Select a category'}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-xs text-red-600" role="alert">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <Input
                label="Unit"
                required
                placeholder="piece / set / kW"
                error={errors.unit?.message}
                {...register('unit')}
              />

              <Input
                label="Price (PKR)"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0"
                error={errors.price?.message}
                {...register('price')}
              />

              <Input
                label="Discounted Price (optional)"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                error={errors.discountedPrice?.message}
                {...register('discountedPrice')}
              />

              <Input
                label="Stock"
                type="number"
                min="0"
                required
                placeholder="0"
                error={errors.stock?.message}
                {...register('stock')}
              />

              <Input
                label="Tags (comma separated)"
                placeholder="solar, panel, monocrystalline"
                error={errors.tags?.message}
                {...register('tags')}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="shortDescription" className="text-sm font-medium text-gray-700">
                Short Description
              </label>
              <textarea
                id="shortDescription"
                rows={2}
                placeholder="Brief one-liner shown in product cards"
                className={cn(
                  'block w-full rounded-md border px-3 py-2 text-sm shadow-sm resize-none',
                  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0',
                  'border-gray-300 focus:border-amber-400 focus:ring-amber-300',
                )}
                {...register('shortDescription')}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="detailedDescription" className="text-sm font-medium text-gray-700">
                Detailed Description
              </label>
              <textarea
                id="detailedDescription"
                rows={5}
                placeholder="Full product description (supports markdown)"
                className={cn(
                  'block w-full rounded-md border px-3 py-2 text-sm shadow-sm resize-y',
                  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0',
                  'border-gray-300 focus:border-amber-400 focus:ring-amber-300',
                )}
                {...register('detailedDescription')}
              />
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-8 pt-1">
              <Controller
                control={control}
                name="isAvailable"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-3 select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={field.value}
                      onClick={() => field.onChange(!field.value)}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1',
                        field.value ? 'bg-amber-500' : 'bg-gray-300',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                          field.value ? 'translate-x-6' : 'translate-x-1',
                        )}
                      />
                    </button>
                    <span className="text-sm font-medium text-gray-700">Available for purchase</span>
                  </label>
                )}
              />
              <Controller
                control={control}
                name="isFeatured"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-3 select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={field.value}
                      onClick={() => field.onChange(!field.value)}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1',
                        field.value ? 'bg-amber-500' : 'bg-gray-300',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                          field.value ? 'translate-x-6' : 'translate-x-1',
                        )}
                      />
                    </button>
                    <span className="text-sm font-medium text-gray-700">Featured product</span>
                  </label>
                )}
              />
            </div>
          </CardBody>
        </Card>

        {/* ── Images ──────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Images <span className="font-normal text-gray-400 normal-case">(up to 10)</span>
              </h2>
              <span className="text-xs text-gray-400">{images.length}/10</span>
            </div>
          </CardHeader>
          <CardBody>
            {/* Drop zone */}
            {images.length < 10 && (
              <label
                htmlFor="image-upload"
                onDragOver={(e) => { e.preventDefault(); setImageDragOver(true); }}
                onDragLeave={() => setImageDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setImageDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                  imageDragOver
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50/30',
                )}
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" aria-hidden="true" />
                <p className="text-sm text-gray-600 text-center">
                  <span className="font-medium text-amber-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — max 10 images</p>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
            )}

            {/* Thumbnails */}
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'group relative aspect-square overflow-hidden rounded-lg border-2 transition-colors',
                      img.isPrimary ? 'border-amber-400 ring-2 ring-amber-300' : 'border-gray-200',
                    )}
                  >
                    <img
                      src={img.kind === 'existing' ? img.url : img.preview}
                      alt={`Product image ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />

                    {/* Overlay actions */}
                    <div className="absolute inset-0 flex items-start justify-between p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <button
                        type="button"
                        onClick={() => setPrimary(idx)}
                        title="Set as primary"
                        aria-label={img.isPrimary ? 'Primary image' : 'Set as primary image'}
                        className={cn(
                          'rounded p-1 transition-colors',
                          img.isPrimary
                            ? 'bg-amber-500 text-white'
                            : 'bg-white/80 text-gray-600 hover:bg-amber-500 hover:text-white',
                        )}
                      >
                        <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        title="Remove image"
                        aria-label="Remove this image"
                        className="rounded bg-white/80 p-1 text-gray-600 hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Primary badge */}
                    {img.isPrimary && (
                      <div className="absolute bottom-0 inset-x-0 bg-amber-500 py-0.5 text-center text-xs font-medium text-white">
                        Primary
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Specifications ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Specifications
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendSpec({ label: '', value: '' })}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Row
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {specFields.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No specifications added yet.</p>
            ) : (
              <div className="space-y-3">
                {specFields.map((field, idx) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Label (e.g. Wattage)"
                        error={errors.specifications?.[idx]?.label?.message}
                        {...register(`specifications.${idx}.label`)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Value (e.g. 400W)"
                        error={errors.specifications?.[idx]?.value?.message}
                        {...register(`specifications.${idx}.value`)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSpec(idx)}
                      aria-label="Remove specification"
                      className="mt-1 rounded p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Features
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendFeature({ value: '' })}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Feature
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {featureFields.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No features added yet.</p>
            ) : (
              <div className="space-y-2">
                {featureFields.map((field, idx) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="e.g. High efficiency mono PERC cells"
                        error={errors.features?.[idx]?.value?.message}
                        {...register(`features.${idx}.value`)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFeature(idx)}
                      aria-label="Remove feature"
                      className="mt-1 rounded p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Applications ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Applications
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendApp({ value: '' })}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Application
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {appFields.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No applications added yet.</p>
            ) : (
              <div className="space-y-2">
                {appFields.map((field, idx) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="e.g. Residential rooftop installations"
                        error={errors.applications?.[idx]?.value?.message}
                        {...register(`applications.${idx}.value`)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeApp(idx)}
                      aria-label="Remove application"
                      className="mt-1 rounded p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Submit bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 py-4 border-t border-gray-200 bg-white sticky bottom-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.adminProducts)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="min-w-32">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {mode === 'create' ? 'Creating…' : 'Saving…'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                {mode === 'create' ? 'Create Product' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Upload, X, Save, Loader2, Plus, Trash2,
} from 'lucide-react';
import { servicesApi } from '../../../api/services.api';
import { QUERY_KEYS, ROUTES } from '../../../lib/constants';
import { cn, imageUrl } from '../../../lib/utils';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import type { Service } from '../../../types/service.types';

// ─── Validation schema ────────────────────────────────────────────────────────

const serviceSchema = z.object({
  name:             z.string().min(1, 'Service name is required').max(150, 'Max 150 characters'),
  shortDescription: z.string().min(1, 'Short description is required').max(300, 'Max 300 characters'),
  description:      z.string().optional(),
  order:            z.coerce.number().int().min(0, 'Must be ≥ 0'),
  areas:            z.array(z.object({ value: z.string().min(1, 'Cannot be empty') })),
  features:         z.array(z.object({ value: z.string().min(1, 'Cannot be empty') })),
  ctaLabel:         z.string().min(1, 'CTA label is required'),
  ctaUrl:           z.string().optional(),
  ctaType:          z.enum(['link', 'whatsapp', 'modal']),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ServiceFormProps {
  mode: 'create' | 'edit';
  service?: Service;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServiceForm({ mode, service }: ServiceFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Image state ────────────────────────────────────────────────────────────
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>();
  const [newFile, setNewFile]       = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // ── Form ──────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      shortDescription: '',
      description: '',
      order: 0,
      areas: [],
      features: [],
      ctaLabel: 'Enquire Now',
      ctaUrl: '',
      ctaType: 'whatsapp',
    },
  });

  const { fields: areaFields,    append: appendArea,    remove: removeArea    } =
    useFieldArray({ control, name: 'areas' });
  const { fields: featureFields, append: appendFeature, remove: removeFeature } =
    useFieldArray({ control, name: 'features' });

  const ctaType = watch('ctaType');

  // ── Prefill in edit mode ──────────────────────────────────────────────────

  useEffect(() => {
    if (mode === 'edit' && service) {
      reset({
        name:             service.name,
        shortDescription: service.shortDescription ?? '',
        description:      service.description ?? '',
        order:            service.order,
        areas:            service.areas.map((v) => ({ value: v })),
        features:         service.features.map((v) => ({ value: v })),
        ctaLabel:         service.cta?.label ?? 'Enquire Now',
        ctaUrl:           service.cta?.url ?? '',
        ctaType:          service.cta?.type ?? 'whatsapp',
      });
      setExistingImageUrl(service.image);
    }
  }, [mode, service, reset]);

  // Revoke preview URL on unmount
  useEffect(() => {
    return () => { if (newPreview) URL.revokeObjectURL(newPreview); };
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
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) pickFile(file);
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

  const displayImage = newPreview ?? (removeExisting ? null : (existingImageUrl ?? null));

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (values: ServiceFormValues) => {
    setServerError(null);
    try {
      const fd = new FormData();

      fd.append('name', values.name);
      fd.append('shortDescription', values.shortDescription);
      if (values.description) fd.append('description', values.description);
      fd.append('order', String(values.order));

      fd.append('areas',    JSON.stringify(values.areas.map((a) => a.value)));
      fd.append('features', JSON.stringify(values.features.map((f) => f.value)));

      const ctaPayload = {
        label: values.ctaLabel,
        type:  values.ctaType,
        ...(values.ctaUrl ? { url: values.ctaUrl } : {}),
      };
      fd.append('cta', JSON.stringify(ctaPayload));

      if (newFile) {
        fd.append('image', newFile);
      } else if (removeExisting) {
        fd.append('removeImage', 'true');
      }

      if (mode === 'create') {
        await servicesApi.create(fd);
      } else {
        await servicesApi.update(service!._id, fd);
      }

      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.services] });

      navigate(ROUTES.adminServices);
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
    <div className="py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.adminServices)}
          aria-label="Back to services list"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Add New Service' : 'Edit Service'}
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
        {/* ── Basic Info ───────────────────────────────────────────────── */}
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
                  label="Service Name"
                  required
                  placeholder="e.g. Solar Panel Installation"
                  error={errors.name?.message}
                  {...register('name')}
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Short Description"
                  required
                  placeholder="One-liner shown in cards and listings"
                  error={errors.shortDescription?.message}
                  {...register('shortDescription')}
                />
              </div>

              <Input
                label="Display Order"
                type="number"
                min="0"
                helperText="Lower numbers appear first on the public page"
                error={errors.order?.message}
                {...register('order')}
              />

              {/* Slug — read-only in edit mode */}
              {mode === 'edit' && service?.slug && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-500">Slug (auto-generated)</span>
                  <code className="inline-block rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-600 font-mono">
                    {service.slug}
                  </code>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="description" className="text-sm font-medium text-gray-700">
                Full Description
                <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="description"
                rows={5}
                placeholder="Detailed service description shown on the service detail page"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm resize-y placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                {...register('description')}
              />
            </div>
          </CardBody>
        </Card>

        {/* ── Image ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Service Image
              <span className="ml-1 font-normal text-gray-400 normal-case">(optional)</span>
            </h2>
          </CardHeader>
          <CardBody>
            {displayImage ? (
              <div className="inline-block">
                <div className="relative">
                  <img
                    src={newPreview ? displayImage : imageUrl(displayImage)}
                    alt="Service preview"
                    className="h-44 w-64 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => newPreview ? clearNewFile() : clearExistingImage()}
                    aria-label="Remove image"
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <label
                  htmlFor="svc-image-replace"
                  className="mt-3 flex cursor-pointer items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Replace image
                  <input
                    id="svc-image-replace"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileInput}
                  />
                </label>
              </div>
            ) : (
              <label
                htmlFor="svc-image-upload"
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
                  id="svc-image-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </label>
            )}
          </CardBody>
        </Card>

        {/* ── Coverage Areas ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Coverage Areas
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendArea({ value: '' })}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Area
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {areaFields.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No coverage areas added yet.</p>
            ) : (
              <div className="space-y-2">
                {areaFields.map((field, idx) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="e.g. Lahore"
                        error={errors.areas?.[idx]?.value?.message}
                        {...register(`areas.${idx}.value`)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeArea(idx)}
                      aria-label="Remove area"
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
                Key Features
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
                        placeholder="e.g. Free site assessment included"
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

        {/* ── CTA Config ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Call-to-Action (CTA)
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="CTA Button Label"
                required
                placeholder="e.g. Get a Free Quote"
                error={errors.ctaLabel?.message}
                {...register('ctaLabel')}
              />

              <div className="flex flex-col gap-1">
                <label htmlFor="ctaType" className="text-sm font-medium text-gray-700">
                  CTA Type <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <select
                  id="ctaType"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                  {...register('ctaType')}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="link">External Link</option>
                  <option value="modal">Contact Modal</option>
                </select>
                <p className="text-xs text-gray-400">
                  {ctaType === 'whatsapp' && 'Opens a WhatsApp chat. URL field is ignored.'}
                  {ctaType === 'link'     && 'Navigates to the URL you specify below.'}
                  {ctaType === 'modal'    && 'Opens an enquiry modal form.'}
                </p>
              </div>
            </div>

            {ctaType === 'link' && (
              <Input
                label="CTA URL"
                type="url"
                placeholder="https://example.com/contact"
                helperText="Required when type is 'link'"
                error={errors.ctaUrl?.message}
                {...register('ctaUrl')}
              />
            )}
          </CardBody>
        </Card>

        {/* ── Submit bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 py-4 border-t border-gray-200 bg-white sticky bottom-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.adminServices)}
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
                {mode === 'create' ? 'Create Service' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

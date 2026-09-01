import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Upload, X, Save, Loader2, Plus, Trash2,
  ExternalLink, BookOpen,
} from 'lucide-react';
import { articlesApi, articleCategoriesApi } from '../../../api/articles.api';
import { productsApi } from '../../../api/products.api';
import { videosApi } from '../../../api/videos.api';
import { QUERY_KEYS, ROUTES } from '../../../lib/constants';
import { cn, imageUrl } from '../../../lib/utils';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import type { Article } from '../../../types/article.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Estimate reading time from combined text (200 wpm) */
function estimateReadTime(texts: (string | undefined)[]): number {
  const words = texts
    .filter(Boolean)
    .join(' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const articleSchema = z.object({
  title:                z.string().min(1, 'Title is required').max(300, 'Max 300 chars'),
  category:             z.string().min(1, 'Category is required'),
  excerpt:              z.string().max(500, 'Max 500 chars').optional(),
  description:          z.string().optional(),
  technicalExplanation: z.string().optional(),
  troubleshootingSteps: z.array(z.object({ value: z.string().min(1, 'Cannot be empty') })),
  safetyInformation:    z.string().optional(),
  tags:                 z.string().optional(),
  readTimeMinutes:      z.coerce.number().int().min(1).optional(),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ArticleFormProps {
  mode: 'create' | 'edit';
  article?: Article;
  onSuccess: () => void;
  onCancel: () => void;
}

// ─── Multi-select picker (reusable for videos + products) ─────────────────────

interface PickerItem { _id: string; label: string; thumb?: string }

interface MultiPickerProps {
  items: PickerItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
}

function MultiPicker({ items, selected, onChange, placeholder = 'Search…', isLoading }: MultiPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, search]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-md border border-gray-300 py-1.5 px-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-300"
      />
      {isLoading ? (
        <p className="text-xs text-gray-400 py-2">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-gray-400 py-2 italic">No items found</p>
      ) : (
        <div className="max-h-44 overflow-y-auto rounded-md border border-gray-200 divide-y divide-gray-100">
          {filtered.map((item) => {
            const checked = selected.includes(item._id);
            return (
              <label
                key={item._id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors',
                  checked && 'bg-amber-50',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item._id)}
                  className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-400"
                />
                {item.thumb && (
                  <img src={item.thumb} alt="" className="h-8 w-12 rounded object-cover flex-shrink-0" />
                )}
                <span className="text-sm text-gray-700 min-w-0 truncate">{item.label}</span>
              </label>
            );
          })}
        </div>
      )}
      {selected.length > 0 && (
        <p className="text-xs text-amber-600">{selected.length} selected</p>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArticleForm({ mode, article, onSuccess, onCancel }: ArticleFormProps) {
  const queryClient = useQueryClient();

  // ── Image state ────────────────────────────────────────────────────────────
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>();
  const [newFile, setNewFile]       = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [dragOver, setDragOver]     = useState(false);

  // ── Related content selections ────────────────────────────────────────────
  const [selectedVideos,   setSelectedVideos]   = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // ── Submit state ──────────────────────────────────────────────────────────
  const [serverError, setServerError]   = useState<string | null>(null);
  const [submittingAs, setSubmittingAs] = useState<'draft' | 'publish' | null>(null);

  // ── Published slug (for preview link) ─────────────────────────────────────
  const publishedSlug = mode === 'edit' && article?.status === 'published' ? article.slug : null;

  // ── Form ──────────────────────────────────────────────────────────────────
  const {
    register, handleSubmit, control, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: '', category: '', excerpt: '', description: '',
      technicalExplanation: '', troubleshootingSteps: [],
      safetyInformation: '', tags: '', readTimeMinutes: 1,
    },
  });

  const { fields: stepFields, append: appendStep, remove: removeStep } =
    useFieldArray({ control, name: 'troubleshootingSteps' });

  const descriptionVal   = watch('description');
  const techExplanation  = watch('technicalExplanation');
  const safetyInfo       = watch('safetyInformation');

  // Auto-estimate read time whenever text fields change
  const estimatedReadTime = estimateReadTime([descriptionVal, techExplanation, safetyInfo]);

  // ── Load article categories ────────────────────────────────────────────────
  const { data: artCategories = [], isLoading: catLoading } = useQuery({
    queryKey: ['article-categories', 'dropdown'],
    queryFn: async () => {
      const res = await articleCategoriesApi.getAll({ active: true, limit: 100 });
      return res.data.data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // ── Load videos for picker ─────────────────────────────────────────────────
  const { data: allVideos = [], isLoading: videosLoading } = useQuery({
    queryKey: [QUERY_KEYS.videos, 'picker'],
    queryFn: async () => {
      const res = await videosApi.adminGetAll({ isVisible: 'true', limit: 200 });
      return res.data.data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // ── Load products for picker ───────────────────────────────────────────────
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: [QUERY_KEYS.products, 'picker'],
    queryFn: async () => {
      const res = await productsApi.adminGetAll({ active: 'true', limit: 200 });
      return res.data.data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // ── Prefill in edit mode ──────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'edit' && article) {
      reset({
        title:                article.title,
        category:             typeof article.category === 'string' ? article.category : article.category._id,
        excerpt:              article.excerpt ?? '',
        description:          article.description ?? '',
        technicalExplanation: article.technicalExplanation ?? '',
        troubleshootingSteps: article.troubleshootingSteps.map((v) => ({ value: v })),
        safetyInformation:    article.safetyInformation ?? '',
        tags:                 article.tags.join(', '),
        readTimeMinutes:      article.readTimeMinutes ?? 1,
      });
      setExistingImageUrl(article.featuredImage);
      setSelectedVideos(article.relatedVideos.map((v) => v._id));
      setSelectedProducts(article.relatedProducts.map((p) => p._id));
    }
  }, [mode, article, reset]);

  // Revoke preview on unmount
  useEffect(() => {
    return () => { if (newPreview) URL.revokeObjectURL(newPreview); };
  }, [newPreview]);

  // ── Image handlers ────────────────────────────────────────────────────────
  const pickFile = (file: File) => {
    if (newPreview) URL.revokeObjectURL(newPreview);
    setNewFile(file); setNewPreview(URL.createObjectURL(file)); setRemoveExisting(false);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) pickFile(file); e.target.value = '';
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0]; if (file?.type.startsWith('image/')) pickFile(file);
  };
  const clearNewFile      = () => { if (newPreview) URL.revokeObjectURL(newPreview); setNewFile(null); setNewPreview(null); };
  const clearExisting     = () => { setExistingImageUrl(undefined); setRemoveExisting(true); };
  const displayImage      = newPreview ?? (removeExisting ? null : (existingImageUrl ?? null));

  // ── Build FormData and submit ──────────────────────────────────────────────
  const buildAndSubmit = async (values: ArticleFormValues, publishAfter: boolean) => {
    setServerError(null);
    setSubmittingAs(publishAfter ? 'publish' : 'draft');

    try {
      const fd = new FormData();
      fd.append('title',    values.title);
      fd.append('category', values.category);
      if (values.excerpt)              fd.append('excerpt',              values.excerpt);
      if (values.description)          fd.append('description',          values.description);
      if (values.technicalExplanation) fd.append('technicalExplanation', values.technicalExplanation);
      if (values.safetyInformation)    fd.append('safetyInformation',    values.safetyInformation);

      fd.append('troubleshootingSteps', JSON.stringify(values.troubleshootingSteps.map((s) => s.value)));

      const tagsArr = values.tags
        ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      fd.append('tags', JSON.stringify(tagsArr));

      const rt = values.readTimeMinutes && values.readTimeMinutes > 0
        ? values.readTimeMinutes
        : estimatedReadTime;
      fd.append('readTimeMinutes', String(rt));

      fd.append('relatedVideos',   JSON.stringify(selectedVideos));
      fd.append('relatedProducts', JSON.stringify(selectedProducts));
      fd.append('status', 'draft');   // always save as draft first

      if (newFile) {
        fd.append('featuredImage', newFile);
      } else if (removeExisting) {
        fd.append('removeFeaturedImage', 'true');
      }

      let savedId = article?._id;

      if (mode === 'create') {
        const res = await articlesApi.create(fd);
        savedId = res.data.data?._id;
      } else {
        await articlesApi.update(article!._id, fd);
      }

      // If user clicked "Publish", call the publish endpoint after saving
      if (publishAfter && savedId) {
        await articlesApi.publish(savedId);
      }

      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.articles] });
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'An error occurred. Please try again.');
      setServerError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmittingAs(null);
    }
  };

  const onSaveDraft   = handleSubmit((v) => buildAndSubmit(v, false));
  const onPublish     = handleSubmit((v) => buildAndSubmit(v, true));

  // ── Picker data preparation ────────────────────────────────────────────────
  const videoPickers: PickerItem[] = allVideos.map((v) => ({
    _id: v._id,
    label: v.title,
    thumb: v.thumbnail || `https://img.youtube.com/vi/${v.youtubeVideoId}/default.jpg`,
  }));
  const productPickers: PickerItem[] = allProducts.map((p) => {
    const thumb = p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url;
    return { _id: p._id, label: p.name, thumb };
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'New Article' : 'Edit Article'}
            </h1>
            {mode === 'edit' && article && (
              <span className={cn(
                'mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                article.status === 'published'   ? 'bg-green-100 text-green-700'  :
                article.status === 'draft'        ? 'bg-amber-100 text-amber-700'  :
                                                    'bg-gray-100  text-gray-500',
              )}>
                {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
              </span>
            )}
          </div>
        </div>
        {/* Preview link for published articles */}
        {publishedSlug && (
          <a
            href={ROUTES.articleDetail(publishedSlug)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Preview on site
          </a>
        )}
      </div>

      {serverError && (
        <div role="alert" className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="space-y-6">
        {/* ── Core Info ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Article Details</h2>
          </CardHeader>
          <CardBody className="space-y-5">
            <Input
              label="Title"
              required
              placeholder="e.g. How to Choose the Right Solar Panel for Your Home"
              error={errors.title?.message}
              {...register('title')}
            />

            {/* Category */}
            <div className="flex flex-col gap-1">
              <label htmlFor="art-cat" className="text-sm font-medium text-gray-700">
                Category <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <select
                id="art-cat"
                disabled={catLoading}
                className={cn(
                  'block w-full rounded-md border px-3 py-2 text-sm shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-offset-0',
                  errors.category
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-gray-300 focus:border-amber-400 focus:ring-amber-300',
                  'disabled:cursor-not-allowed disabled:bg-gray-50',
                )}
                aria-invalid={!!errors.category}
                {...register('category')}
              >
                <option value="">{catLoading ? 'Loading…' : 'Select a category'}</option>
                {artCategories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-600" role="alert">{errors.category.message}</p>}
            </div>

            {/* Excerpt */}
            <div className="flex flex-col gap-1">
              <label htmlFor="art-excerpt" className="text-sm font-medium text-gray-700">
                Excerpt <span className="ml-1 text-xs font-normal text-gray-400">(max 500 chars)</span>
              </label>
              <textarea
                id="art-excerpt"
                rows={2}
                placeholder="Brief summary shown in article cards and search results"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm resize-none placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                {...register('excerpt')}
              />
              {errors.excerpt && <p className="text-xs text-red-600" role="alert">{errors.excerpt.message}</p>}
            </div>

            {/* Tags + read time */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="Tags (comma separated)"
                placeholder="solar, installation, tips"
                {...register('tags')}
              />
              <Input
                label="Read Time (minutes)"
                type="number"
                min="1"
                helperText={`Auto-estimated: ~${estimatedReadTime} min based on word count`}
                error={errors.readTimeMinutes?.message}
                {...register('readTimeMinutes')}
              />
            </div>

            {/* Slug in edit mode */}
            {mode === 'edit' && article?.slug && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Slug:</span>
                <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-mono">{article.slug}</code>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Featured Image ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Featured Image <span className="font-normal text-gray-400 normal-case">(optional)</span>
            </h2>
          </CardHeader>
          <CardBody>
            {displayImage ? (
              <div className="inline-block">
                <div className="relative">
                  <img
                    src={newPreview ? displayImage : imageUrl(displayImage)}
                    alt="Featured image preview"
                    className="h-40 w-64 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => newPreview ? clearNewFile() : clearExisting()}
                    aria-label="Remove image"
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <label htmlFor="art-img-replace" className="mt-3 flex cursor-pointer items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" /> Replace image
                  <input id="art-img-replace" type="file" accept="image/*" className="sr-only" onChange={handleFileInput} />
                </label>
              </div>
            ) : (
              <label
                htmlFor="art-img-upload"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                  dragOver ? 'border-amber-400 bg-amber-50' : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50/30',
                )}
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" aria-hidden="true" />
                <p className="text-sm text-gray-600 text-center">
                  <span className="font-medium text-amber-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP</p>
                <input id="art-img-upload" type="file" accept="image/*" className="sr-only" onChange={handleFileInput} />
              </label>
            )}
          </CardBody>
        </Card>

        {/* ── Content sections ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Content</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="flex flex-col gap-1">
              <label htmlFor="art-desc" className="text-sm font-medium text-gray-700">Main Description</label>
              <textarea id="art-desc" rows={8} placeholder="Main article body — supports plain text or HTML"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm resize-y placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                {...register('description')}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="art-tech" className="text-sm font-medium text-gray-700">Technical Explanation</label>
              <textarea id="art-tech" rows={5} placeholder="In-depth technical explanation (optional)"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm resize-y placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                {...register('technicalExplanation')}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="art-safety" className="text-sm font-medium text-gray-700">Safety Information</label>
              <textarea id="art-safety" rows={3} placeholder="Safety notes and warnings (optional)"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm resize-y placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                {...register('safetyInformation')}
              />
            </div>
          </CardBody>
        </Card>

        {/* ── Troubleshooting Steps ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Troubleshooting Steps</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => appendStep({ value: '' })}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add Step
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {stepFields.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No troubleshooting steps added.</p>
            ) : (
              <div className="space-y-2">
                {stepFields.map((field, idx) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <span className="mt-2 min-w-[20px] text-xs font-medium text-gray-400 tabular-nums">{idx + 1}.</span>
                    <div className="flex-1">
                      <Input
                        placeholder="e.g. Check inverter LED status lights"
                        error={errors.troubleshootingSteps?.[idx]?.value?.message}
                        {...register(`troubleshootingSteps.${idx}.value`)}
                      />
                    </div>
                    <button type="button" onClick={() => removeStep(idx)} aria-label="Remove step"
                      className="mt-1 rounded p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Related Content ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Related Videos</h2>
            </CardHeader>
            <CardBody>
              <MultiPicker
                items={videoPickers}
                selected={selectedVideos}
                onChange={setSelectedVideos}
                placeholder="Search videos…"
                isLoading={videosLoading}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Related Products</h2>
            </CardHeader>
            <CardBody>
              <MultiPicker
                items={productPickers}
                selected={selectedProducts}
                onChange={setSelectedProducts}
                placeholder="Search products…"
                isLoading={productsLoading}
              />
            </CardBody>
          </Card>
        </div>

        {/* ── Submit bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 py-4 border-t border-gray-200 bg-white sticky bottom-0 flex-wrap">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {/* Save as Draft */}
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveDraft}
              disabled={isSubmitting}
              isLoading={submittingAs === 'draft'}
            >
              {submittingAs === 'draft' ? (
                <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…</>
              ) : (
                <><Save className="h-4 w-4" aria-hidden="true" /> Save as Draft</>
              )}
            </Button>

            {/* Publish */}
            <Button
              type="button"
              variant="primary"
              onClick={onPublish}
              disabled={isSubmitting}
              isLoading={submittingAs === 'publish'}
              className="min-w-28"
            >
              {submittingAs === 'publish' ? (
                <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Publishing…</>
              ) : (
                mode === 'edit' && article?.status === 'published'
                  ? 'Save & Keep Published'
                  : 'Publish'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

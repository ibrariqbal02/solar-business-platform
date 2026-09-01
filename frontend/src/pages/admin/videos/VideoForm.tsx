import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Youtube } from 'lucide-react';
import { videosApi, videoCategoriesApi } from '../../../api/videos.api';
import { QUERY_KEYS } from '../../../lib/constants';
import { cn } from '../../../lib/utils';
import { youtubeThumbnail } from '../../../types/video.types';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import type { Video } from '../../../types/video.types';

// ─── YouTube ID extractor (client-side, for live preview only) ───────────────

function extractYoutubeId(input: string): string | null {
  const bare = /^[a-zA-Z0-9_-]{11}$/.test(input.trim());
  if (bare) return input.trim();
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = input.match(re);
    if (m) return m[1];
  }
  return null;
}

function isYoutubeUrl(value: string): boolean {
  return (
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(value) ||
    /^[a-zA-Z0-9_-]{11}$/.test(value.trim())
  );
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const videoSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(300, 'Max 300 characters'),
  youtubeUrl:  z.string()
    .min(1, 'YouTube URL is required')
    .refine(isYoutubeUrl, 'Must be a valid YouTube URL or video ID'),
  category:    z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  thumbnail:   z.string().url('Must be a valid URL').optional().or(z.literal('')),
  duration:    z.string().optional(),
  tags:        z.string().optional(),
  isVisible:   z.boolean(),
  isFeatured:  z.boolean(),
});

type VideoFormValues = z.infer<typeof videoSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface VideoFormProps {
  mode: 'create' | 'edit';
  video?: Video;
  onSuccess: () => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VideoForm({ mode, video, onSuccess, onCancel }: VideoFormProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [previewId, setPreviewId]     = useState<string | null>(null);

  // ── Load video categories for dropdown ────────────────────────────────────
  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['video-categories', 'dropdown'],
    queryFn: async () => {
      const res = await videoCategoriesApi.getAll({ active: true, limit: 100 });
      return res.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Form ──────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title:       '',
      youtubeUrl:  '',
      category:    '',
      description: '',
      thumbnail:   '',
      duration:    '',
      tags:        '',
      isVisible:   true,
      isFeatured:  false,
    },
  });

  // ── Prefill in edit mode ──────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'edit' && video) {
      reset({
        title:       video.title,
        youtubeUrl:  video.youtubeUrl,
        category:    typeof video.category === 'string' ? video.category : video.category._id,
        description: video.description ?? '',
        thumbnail:   video.thumbnail ?? '',
        duration:    video.duration ?? '',
        tags:        video.tags.join(', '),
        isVisible:   video.isVisible,
        isFeatured:  video.isFeatured,
      });
      setPreviewId(video.youtubeVideoId);
    }
  }, [mode, video, reset]);

  // ── Live thumbnail preview from URL input ─────────────────────────────────
  const youtubeUrlValue = watch('youtubeUrl');
  useEffect(() => {
    const id = extractYoutubeId(youtubeUrlValue ?? '');
    setPreviewId(id);
  }, [youtubeUrlValue]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: VideoFormValues) => {
    setServerError(null);
    try {
      const tagsArr = values.tags
        ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const payload: Record<string, unknown> = {
        title:          values.title,
        youtubeVideoId: values.youtubeUrl,   // backend extracts ID from any format
        category:       values.category,
        description:    values.description || undefined,
        duration:       values.duration    || undefined,
        tags:           tagsArr,
        isVisible:      values.isVisible,
        isFeatured:     values.isFeatured,
      };

      // Only send custom thumbnail if non-empty
      if (values.thumbnail?.trim()) {
        payload.thumbnail = values.thumbnail.trim();
      }

      if (mode === 'create') {
        await videosApi.create(payload);
      } else {
        await videosApi.update(video!._id, payload);
      }

      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.videos] });
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'An error occurred. Please try again.');
      setServerError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── Toggle helper ─────────────────────────────────────────────────────────
  const ToggleSwitch = ({
    name,
    label,
  }: {
    name: 'isVisible' | 'isFeatured';
    label: string;
  }) => {
    const value = watch(name);
    return (
      <label className="flex cursor-pointer items-center gap-3 select-none">
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => {
            const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
            if (el) el.click();
          }}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1',
            value ? 'bg-amber-500' : 'bg-gray-300',
          )}
        >
          <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            value ? 'translate-x-6' : 'translate-x-1')} />
        </button>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <input type="checkbox" className="sr-only" {...register(name)} />
      </label>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Add New Video' : 'Edit Video'}
        </h1>
      </div>

      {serverError && (
        <div role="alert" className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* ── Core Info ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Video Details</h2>
          </CardHeader>
          <CardBody className="space-y-5">
            <Input
              label="Title"
              required
              placeholder="e.g. How Solar Panels Work — Full Installation Guide"
              error={errors.title?.message}
              {...register('title')}
            />

            {/* YouTube URL + live preview */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Input
                  label="YouTube URL"
                  required
                  placeholder="https://www.youtube.com/watch?v=…"
                  helperText="Paste the full YouTube URL or bare video ID"
                  error={errors.youtubeUrl?.message}
                  {...register('youtubeUrl')}
                />
              </div>

              {/* Live thumbnail preview */}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-500">Thumbnail Preview</span>
                {previewId ? (
                  <div className="relative overflow-hidden rounded-lg border border-gray-200 aspect-video bg-gray-100">
                    <img
                      src={youtubeThumbnail(previewId, 'hqdefault')}
                      alt="YouTube thumbnail preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = youtubeThumbnail(previewId, 'default');
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex h-10 w-14 items-center justify-center rounded-xl bg-black/60">
                        <Youtube className="h-5 w-5 text-red-500" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 aspect-video bg-gray-50">
                    <div className="text-center">
                      <Youtube className="h-8 w-8 text-gray-300 mx-auto mb-1" aria-hidden="true" />
                      <p className="text-xs text-gray-400">Preview appears after entering URL</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1">
              <label htmlFor="video-category" className="text-sm font-medium text-gray-700">
                Category <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <select
                id="video-category"
                disabled={catsLoading}
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
                <option value="">{catsLoading ? 'Loading…' : 'Select a category'}</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-red-600" role="alert">{errors.category.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label htmlFor="video-desc" className="text-sm font-medium text-gray-700">
                Description <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="video-desc"
                rows={4}
                placeholder="Brief description of the video content"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm resize-none placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="Duration"
                placeholder="e.g. 5:34"
                helperText="Optional display duration"
                error={errors.duration?.message}
                {...register('duration')}
              />
              <Input
                label="Tags (comma separated)"
                placeholder="solar, installation, DIY"
                error={errors.tags?.message}
                {...register('tags')}
              />
            </div>

            <Input
              label="Custom Thumbnail URL"
              type="url"
              placeholder="https://… (leave blank to use YouTube auto-thumbnail)"
              helperText="Overrides the auto-generated YouTube thumbnail"
              error={errors.thumbnail?.message}
              {...register('thumbnail')}
            />

            {/* Toggles */}
            <div className="flex flex-wrap gap-8 pt-1">
              <ToggleSwitch name="isVisible" label="Visible on public gallery" />
              <ToggleSwitch name="isFeatured" label="Featured video" />
            </div>
          </CardBody>
        </Card>

        {/* ── Submit bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 py-4 border-t border-gray-200 bg-white sticky bottom-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="min-w-36">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {mode === 'create' ? 'Adding…' : 'Saving…'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                {mode === 'create' ? 'Add Video' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

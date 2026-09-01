import { useState, useCallback, useEffect } from 'react';
import {
  Play, X, Clock, Tag, ServerCrash, VideoOff,
} from 'lucide-react';
import { useVideos } from '../../hooks/useVideos';
import { useVideoCategories } from '../../hooks/useVideos';
import { Skeleton } from '../../components/ui/Skeleton';
import { youtubeThumbnail, youtubeEmbedUrl } from '../../types/video.types';
import { trackEvent } from '../../lib/analytics';
import type { VideoListItem, VideosQuery, VideoSortKey } from '../../types/video.types';

// ── Video card skeleton ────────────────────────────────────────────────────────

function VideoCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// ── Embed modal ────────────────────────────────────────────────────────────────

interface EmbedModalProps {
  video: VideoListItem;
  onClose: () => void;
}

function EmbedModal({ video, onClose }: EmbedModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Playing: ${video.title}`}
    >
      <div
        className="relative w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
          aria-label="Close video"
        >
          <X className="h-7 w-7" />
        </button>

        {/* 16:9 iframe wrapper */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
          <iframe
            src={youtubeEmbedUrl(video.youtubeVideoId)}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>

        {/* Title */}
        <p className="mt-3 text-white font-semibold text-sm text-center px-2 truncate">
          {video.title}
        </p>
      </div>
    </div>
  );
}

// ── Video card ────────────────────────────────────────────────────────────────

interface VideoCardProps {
  video: VideoListItem;
  onPlay: (video: VideoListItem) => void;
}

function VideoCard({ video, onPlay }: VideoCardProps) {
  const thumb =
    video.thumbnail && video.thumbnail.startsWith('http')
      ? video.thumbnail
      : youtubeThumbnail(video.youtubeVideoId, 'hqdefault');

  return (
    <article className="group flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail with play overlay */}
      <button
        onClick={() => onPlay(video)}
        className="relative block overflow-hidden bg-gray-900 aspect-video w-full"
        aria-label={`Play video: ${video.title}`}
      >
        <img
          src={thumb}
          alt={video.title}
          className="w-full h-full object-cover opacity-90 group-hover:opacity-70 transition-opacity duration-300"
          loading="lazy"
        />
        {/* Play button */}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="bg-amber-600 group-hover:bg-amber-700 rounded-full p-3 shadow-lg
                           transition-colors ring-4 ring-white/20">
            <Play className="h-6 w-6 text-white fill-white" />
          </span>
        </span>
        {/* Duration badge */}
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs
                           rounded px-1.5 py-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {video.duration}
          </span>
        )}
        {/* Featured badge */}
        {video.isFeatured && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-xs
                           font-semibold rounded-full px-2 py-0.5">
            Featured
          </span>
        )}
      </button>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Category */}
        {video.category && (
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            {video.category.name}
          </span>
        )}

        <h2 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
          <button
            onClick={() => onPlay(video)}
            className="hover:text-amber-600 transition-colors text-left"
          >
            {video.title}
          </button>
        </h2>

        {/* Tags */}
        {video.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-auto pt-1">
            <Tag className="h-3 w-3 text-gray-400 shrink-0" />
            {video.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: VideoSortKey; label: string }[] = [
  { value: 'newest',   label: 'Newest' },
  { value: 'oldest',   label: 'Oldest' },
  { value: 'featured', label: 'Featured' },
  { value: 'views',    label: 'Most Viewed' },
];

const LIMIT = 12;

export default function Videos() {
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [sort, setSort]                     = useState<VideoSortKey>('newest');
  const [playingVideo, setPlayingVideo]     = useState<VideoListItem | null>(null);

  const query: VideosQuery = {
    isVisible: true,
    category:  activeCategory || undefined,
    sort,
    limit: LIMIT,
  };

  const { data, isLoading, isError } = useVideos(query);
  const { data: categories }         = useVideoCategories();

  const videos = data?.videos ?? [];

  const handlePlay   = useCallback((v: VideoListItem) => {
    trackEvent({ eventType: 'youtube_video_clicked', metadata: { videoId: v.youtubeVideoId, title: v.title } });
    setPlayingVideo(v);
  }, []);
  const handleClose  = useCallback(() => setPlayingVideo(null), []);
  const handleCatTab = useCallback((id: string) => setActiveCategory(id), []);

  return (
    <div className="py-8">

      {/* Heading */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Video Gallery</h1>
        <p className="mt-2 text-gray-500">
          Watch our solar energy guides, installation walkthroughs, and more.
        </p>
      </div>

      {/* Category tabs + sort */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        {/* Category tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleCatTab('')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
                        ${activeCategory === ''
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400 hover:text-amber-600'}`}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat._id}
              onClick={() => handleCatTab(cat._id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
                          ${activeCategory === cat._id
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400 hover:text-amber-600'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as VideoSortKey)}
          aria-label="Sort videos"
          className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white
                     focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 shrink-0"
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
          <ServerCrash className="h-10 w-10 text-red-300 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Failed to load videos.</p>
          <p className="text-sm text-red-500 mt-1">Make sure the backend is running.</p>
        </div>
      )}

      {/* Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: LIMIT }).map((_, i) => <VideoCardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && videos.length === 0 && (
        <div className="py-24 flex flex-col items-center text-center">
          <VideoOff className="h-14 w-14 text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">No videos found</p>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory('')}
              className="mt-3 text-sm text-amber-600 hover:underline"
            >
              Show all categories
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} onPlay={handlePlay} />
          ))}
        </div>
      )}

      {/* Embed modal */}
      {playingVideo && (
        <EmbedModal video={playingVideo} onClose={handleClose} />
      )}
    </div>
  );
}

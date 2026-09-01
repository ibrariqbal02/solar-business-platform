/** Join class names, filtering out falsy values */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Format a date string to a readable format */
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(dateString).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

/** Format a number as currency (AUD) */
export function formatCurrency(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Truncate a string to a max length */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
}

/** Build a full Cloudinary/backend image URL from a stored path */
export function imageUrl(path: string | undefined | null): string {
  if (!path) return '/placeholder.svg';
  if (path.startsWith('http')) return path;
  return `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ?? ''}${path}`;
}

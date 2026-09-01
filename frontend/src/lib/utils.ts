/** Join class names, filtering out falsy values */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Format a date string to a readable format */
export function formatDate(
  dateString: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(dateString).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format a number as currency.
 * Default is PKR to match the backend default.
 * Pass settings.currency at call-site for dynamic formatting.
 */
export function formatCurrency(amount: number, currency = 'PKR'): string {
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback for unknown currency codes
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/** Truncate a string to a max length, appending ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
}

/**
 * Resolve an image path/URL to a displayable src.
 * - Absolute http/https URLs (Cloudinary, etc.) returned as-is.
 * - Relative paths prefixed with the backend origin.
 * - Null / undefined returns the fallback placeholder.
 */
export function imageUrl(
  path: string | undefined | null,
  fallback = '/placeholder.svg',
): string {
  if (!path) return fallback;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base =
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
      /\/api\/?$/,
      '',
    ) ?? '';
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Calculate percentage discount between two prices */
export function discountPercent(original: number, discounted: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - discounted) / original) * 100);
}

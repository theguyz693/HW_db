// ──────────────────────────────────────────────
// Formatting utilities
// ──────────────────────────────────────────────

/** Format a number as currency */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a large number with commas */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/** Truncate a string to a max length with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/** Generate initials from a display name (e.g., "John Doe" → "JD") */
export function getInitials(name: string, maxChars = 2): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxChars)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

/** Convert a slug to a human-readable title */
export function slugToTitle(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Pluralize a word based on count */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural ?? `${singular}s`;
}

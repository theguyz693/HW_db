// ──────────────────────────────────────────────
// Slugify — URL-safe string conversion
// ──────────────────────────────────────────────

/**
 * Convert a string to a URL-friendly slug.
 * "Hot Wheels Collection" → "hot-wheels-collection"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // Remove non-word chars (except spaces and hyphens)
    .replace(/[\s_]+/g, '-')    // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-')        // Collapse multiple hyphens
    .replace(/^-|-$/g, '');     // Trim hyphens from edges
}

/**
 * Generate a unique slug by appending a suffix if needed.
 * Used when creating collections to ensure slug uniqueness per user.
 */
export function generateUniqueSlug(text: string, existingSlugs: string[]): string {
  let slug = slugify(text);
  if (!existingSlugs.includes(slug)) return slug;

  let counter = 1;
  while (existingSlugs.includes(`${slug}-${counter}`)) {
    counter++;
  }
  return `${slug}-${counter}`;
}

// ──────────────────────────────────────────────
// Pagination helpers
// ──────────────────────────────────────────────

import type { PaginationMeta } from '@collectorhub/shared-types';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/** Parse and sanitize pagination query params */
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query['page'] || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query['limit'] || '20'), 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/** Build pagination metadata for response */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/** Parse sort string (e.g., "-createdAt" → { createdAt: -1 }) */
export function parseSort(sortStr?: string): Record<string, 1 | -1> {
  if (!sortStr) return { createdAt: -1 };

  const result: Record<string, 1 | -1> = {};
  const fields = sortStr.split(',');

  for (const field of fields) {
    const trimmed = field.trim();
    if (trimmed.startsWith('-')) {
      result[trimmed.slice(1)] = -1;
    } else {
      result[trimmed] = 1;
    }
  }

  return result;
}

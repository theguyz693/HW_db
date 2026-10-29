// ──────────────────────────────────────────────
// Common types shared across the entire platform
// ──────────────────────────────────────────────

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

/** Error response from the API */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Cursor-based pagination for infinite scroll */
export interface CursorPaginationMeta {
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  limit: number;
}

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Generic sort option */
export interface SortOption {
  field: string;
  direction: SortDirection;
}

/** Generic filter with operator support */
export interface FilterOption {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
}

/** Timestamp fields present on all documents */
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

/** Base entity with ID and timestamps */
export interface BaseEntity extends Timestamps {
  _id: string;
}

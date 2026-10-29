// ──────────────────────────────────────────────
// Item types — the core collectible entity
// ──────────────────────────────────────────────

import type { BaseEntity } from './common.js';

/** Ownership status of an item */
export type OwnershipStatus = 'owned' | 'wishlist' | 'sold' | 'traded';

/** Physical condition of an item */
export type ItemCondition = 'mint' | 'near-mint' | 'good' | 'fair' | 'poor' | 'sealed';

/** An image attached to an item */
export interface ItemImage {
  url: string;
  thumbnail: string;
  caption: string;
  isPrimary: boolean;
  uploadedAt: string;
}

/** Purchase details */
export interface PurchaseDetails {
  price: number | null;
  currency: string;
  date: string | null;
  seller: string;
  marketplace: string;
  receiptImage: string | null;
}

/** Ownership information */
export interface ItemOwnership {
  status: OwnershipStatus;
  condition: ItemCondition;
  duplicateCount: number;
  acquiredDate: string | null;
  purchase: PurchaseDetails;
  estimatedValue: number | null;
  valueCurrency: string;
  valueLastUpdated: string | null;
}

/** Physical location of an item */
export interface ItemLocation {
  type: string;
  name: string;
  position: string;
}

/** Personal metadata */
export interface ItemPersonal {
  notes: string;
  isFavorite: boolean;
  isDisplayed: boolean;
  isGrail: boolean;
  isHolyGrail: boolean;
  isNeverSell: boolean;
  isPinned: boolean;
  rating: number | null;
  categories: string[];
}

/** History log entry */
export interface ItemHistoryEntry {
  action: string;
  timestamp: string;
  details: Record<string, unknown>;
}

/** Timeline / tracking metadata */
export interface ItemTimeline {
  dateAdded: string;
  lastViewed: string | null;
  timesViewed: number;
  history: ItemHistoryEntry[];
}

/** Data source information for auto-imported data */
export interface ItemDataSource {
  provider: string;
  sourceUrl: string;
  lastSynced: string | null;
  confidence: number;
}

/** The full Item entity */
export interface Item extends BaseEntity {
  userId: string;
  collectionId: string;

  // Core identity
  name: string;
  brand: string;
  series: string;
  releaseYear: number | null;
  modelNumber: string;
  collectorNumber: string;
  category: string;
  description: string;

  // Physical details
  scale: string;
  color: string[];
  material: string[];
  manufacturer: string;

  // Codes
  barcode: string;
  qrCode: string;

  // Media
  images: ItemImage[];

  // Classification
  tags: string[];

  // Type-specific fields (from Collection.metadataSchema)
  customMetadata: Record<string, unknown>;

  // Ownership & valuation
  ownership: ItemOwnership;

  // Location
  location: ItemLocation;

  // Personal
  personal: ItemPersonal;

  // Timeline
  timeline: ItemTimeline;

  // Data source
  dataSource: ItemDataSource;

  // System
  isArchived: boolean;
}

/** Create item DTO */
export interface CreateItemDTO {
  name: string;
  brand?: string;
  series?: string;
  releaseYear?: number;
  modelNumber?: string;
  collectorNumber?: string;
  category?: string;
  description?: string;
  scale?: string;
  color?: string[];
  material?: string[];
  manufacturer?: string;
  barcode?: string;
  qrCode?: string;
  tags?: string[];
  customMetadata?: Record<string, unknown>;
  ownership?: Partial<ItemOwnership>;
  location?: Partial<ItemLocation>;
  personal?: Partial<ItemPersonal>;
}

/** Update item DTO — all fields optional */
export type UpdateItemDTO = Partial<CreateItemDTO>;

/** Item filters for list queries */
export interface ItemFilters {
  search?: string;
  ownershipStatus?: OwnershipStatus;
  condition?: ItemCondition;
  isFavorite?: boolean;
  isGrail?: boolean;
  brand?: string;
  series?: string;
  category?: string;
  tags?: string[];
  releaseYear?: number;
  sort?: string;
  page?: number;
  limit?: number;
  cursor?: string;
}

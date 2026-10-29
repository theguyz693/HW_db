// ──────────────────────────────────────────────
// Collection types
// ──────────────────────────────────────────────

import type { BaseEntity } from './common.js';

/** Supported field types for custom metadata */
export type MetadataFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'url';

/** Definition of a custom metadata field within a collection */
export interface MetadataFieldSchema {
  fieldName: string;
  fieldLabel: string;
  fieldType: MetadataFieldType;
  required: boolean;
  options: string[];
  group: string;
  sortOrder: number;
}

/** Collection privacy levels */
export type CollectionPrivacy = 'private' | 'public' | 'friends';

/** Cached collection statistics */
export interface CollectionStats {
  totalItems: number;
  totalValue: number;
  wishlistCount: number;
  completionPercentage: number;
}

/** A user's collection */
export interface Collection extends BaseEntity {
  userId: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string | null;
  icon: string;
  color: string;
  collectibleType: string;
  metadataSchema: MetadataFieldSchema[];
  privacy: CollectionPrivacy;
  stats: CollectionStats;
  sortOrder: number;
  isPinned: boolean;
  isArchived: boolean;
  tags: string[];
}

/** Create collection DTO */
export interface CreateCollectionDTO {
  name: string;
  description?: string;
  coverImage?: string;
  icon?: string;
  color?: string;
  collectibleType: string;
  metadataSchema?: MetadataFieldSchema[];
  privacy?: CollectionPrivacy;
  tags?: string[];
}

/** Update collection DTO */
export interface UpdateCollectionDTO {
  name?: string;
  description?: string;
  coverImage?: string;
  icon?: string;
  color?: string;
  metadataSchema?: MetadataFieldSchema[];
  privacy?: CollectionPrivacy;
  isPinned?: boolean;
  isArchived?: boolean;
  tags?: string[];
  sortOrder?: number;
}

/** Collectible type template — defines defaults for a type of collectible */
export interface CollectibleTypeTemplate {
  type: string;
  name: string;
  icon: string;
  description: string;
  defaultMetadataSchema: MetadataFieldSchema[];
  defaultScraperProviders: string[];
}

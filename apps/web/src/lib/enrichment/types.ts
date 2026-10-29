// ──────────────────────────────────────────────
// Collectible Data Enrichment — Core Types
// ──────────────────────────────────────────────

import type { ItemCondition, OwnershipStatus } from '@collectorhub/shared-types';

export interface EnrichmentMatch {
  id: string;
  title: string;
  url: string;
  description?: string;
  thumbnailUrl?: string;
  provider: string;
}

export interface EnrichedImage {
  url: string;
  thumbnail: string;
  caption: string;
  isPrimary: boolean;
  uploadedAt: string;
}

export interface EnrichedItemData {
  name: string;
  brand?: string;
  series?: string;
  releaseYear?: number | null;
  modelNumber?: string;
  collectorNumber?: string;
  category?: string;
  description?: string;
  scale?: string;
  color?: string[];
  material?: string[];
  manufacturer?: string;
  barcode?: string;
  asin?: string;
  productId?: string;
  sourceUrl?: string;
  images?: EnrichedImage[];
  tags?: string[];
  customMetadata?: Record<string, unknown>;
  ownership?: {
    status?: OwnershipStatus;
    condition?: ItemCondition;
    duplicateCount?: number;
    estimatedValue?: number;
    purchase?: {
      price?: number | null;
      currency?: string;
      seller?: string;
      marketplace?: string;
    };
  };
}

export interface ExtractedFieldsReport {
  name: boolean;
  brand: boolean;
  imagesCount: number;
  price: boolean;
  productId: boolean;
  description: boolean;
  category: boolean;
  missingFields: string[];
}

export interface EnrichmentResult {
  success: boolean;
  provider: string;
  sourceUrl: string;
  data: EnrichedItemData;
  availableVersions?: {
    year?: string;
    series?: string;
    color?: string;
    tampo?: string;
    wheelType?: string;
    toyNumber?: string;
    photoUrl?: string;
    notes?: string;
  }[];
  extractedReport?: ExtractedFieldsReport;
  rawSummary?: string;
  confidence: number;
}

export interface EnrichmentProvider {
  id: string;
  name: string;
  supportedTypes: string[]; // e.g. ['Hot Wheels', 'hot_wheels', 'Generic', '*']
  canHandleUrl?(url: string): boolean;
  importFromUrl?(url: string): Promise<EnrichmentResult | null>;
  search(query: string): Promise<EnrichmentMatch[]>;
  getDetails(matchOrId: string | EnrichmentMatch): Promise<EnrichmentResult | null>;
}

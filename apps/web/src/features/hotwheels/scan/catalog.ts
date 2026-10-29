// ──────────────────────────────────────────────
// Catalogue sources for Scan to Collect.
// 1. Local: the user's own garage + the curated reference catalogue.
// 2. Optional fallback: the existing Hot Wheels Wiki enrichment provider,
//    only when the user asks for it.
// ──────────────────────────────────────────────

import type { Item } from '@collectorhub/shared-types';
import { PRESET_COLLECTIBLES } from '@/lib/mockScraper.ts';
import { enrichmentService, type EnrichmentMatch, type EnrichmentResult } from '@/lib/enrichment/index.ts';
import type { CatalogEntry } from './matcher.ts';

export function referenceCatalog(): CatalogEntry[] {
  return Object.values(PRESET_COLLECTIBLES).map(({ data, sourceUrl }) => {
    const img = data.images?.find((i) => i.isPrimary) ?? data.images?.[0];
    return {
      key: `ref:${data.modelNumber || data.name}`,
      source: 'reference' as const,
      name: data.name,
      brand: data.brand,
      series: data.series,
      releaseYear: data.releaseYear ?? null,
      modelNumber: data.modelNumber,
      collectorNumber: data.collectorNumber,
      barcode: data.barcode,
      color: data.color,
      imageUrl: img?.url,
      imageCaption: img?.caption,
      description: data.description,
      sourceUrl,
    };
  });
}

export function garageCatalog(items: Item[]): CatalogEntry[] {
  return items.map((it) => {
    const img = it.images?.find((i) => i.isPrimary) ?? it.images?.[0];
    return {
      key: it._id,
      source: 'garage' as const,
      name: it.name,
      brand: it.brand,
      series: it.series,
      releaseYear: it.releaseYear,
      modelNumber: it.modelNumber,
      collectorNumber: it.collectorNumber,
      barcode: it.barcode,
      color: it.color,
      imageUrl: img?.url,
      imageCaption: img?.caption,
      description: it.description,
      sourceUrl: it.dataSource?.sourceUrl,
      variant: typeof it.customMetadata?.variant === 'string' ? it.customMetadata.variant : undefined,
      seriesNumber: typeof it.customMetadata?.seriesNumber === 'string' ? it.customMetadata.seriesNumber : undefined,
      ownedCount: it.ownership?.status === 'owned' ? it.ownership.duplicateCount ?? 1 : 0,
      ownedItemId: it._id,
    };
  });
}

/**
 * Garage first (so owned cars win de-duplication), then the Hot Wheels catalogue.
 * The small demo reference set is only used if the catalogue couldn't load.
 */
export function buildLocalCatalog(myItems: Item[], hwCatalog?: CatalogEntry[] | null): CatalogEntry[] {
  return [...garageCatalog(myItems), ...(hwCatalog?.length ? hwCatalog : referenceCatalog())];
}

/** Search the Hot Wheels Wiki (existing provider). Network call — user-initiated only. */
export async function searchWiki(query: string): Promise<EnrichmentMatch[]> {
  const matches = await enrichmentService.search(query, 'Hot Wheels');
  return matches.slice(0, 6);
}

/**
 * Expand a wiki page into one entry per listed release version, so the user
 * confirms the exact colour/year variant rather than just the casting.
 */
export function wikiResultToEntries(result: EnrichmentResult): CatalogEntry[] {
  const d = result.data;
  const baseImg = d.images?.find((i) => i.isPrimary) ?? d.images?.[0];
  const base: CatalogEntry = {
    key: `wiki:${result.sourceUrl || d.name}`,
    source: 'wiki',
    name: d.name,
    brand: d.brand || 'Hot Wheels',
    series: d.series,
    releaseYear: d.releaseYear ?? null,
    modelNumber: d.modelNumber,
    collectorNumber: d.collectorNumber,
    barcode: d.barcode,
    color: d.color,
    imageUrl: baseImg?.url,
    imageCaption: baseImg?.caption,
    description: d.description,
    sourceUrl: result.sourceUrl,
  };
  const versions = (result.availableVersions ?? []).slice(0, 24);
  if (!versions.length) return [base];
  return versions.map((v, i) => ({
    ...base,
    key: `${base.key}#${i}`,
    series: v.series || base.series,
    releaseYear: v.year && /^\d{4}$/.test(v.year) ? Number(v.year) : base.releaseYear,
    modelNumber: v.toyNumber || base.modelNumber,
    color: v.color ? [v.color] : base.color,
    imageUrl: v.photoUrl || base.imageUrl,
    imageCaption: [v.color, v.tampo].filter(Boolean).join(' — ') || base.imageCaption,
  }));
}

export async function wikiDetails(match: EnrichmentMatch): Promise<CatalogEntry[]> {
  const res = await enrichmentService.getDetails(match, 'Hot Wheels');
  return res?.success ? wikiResultToEntries(res) : [];
}

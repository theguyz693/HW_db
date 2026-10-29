// ──────────────────────────────────────────────
// Add a confirmed scan candidate to the user's collection via the
// existing items/collections services (Supabase RLS or local demo DB).
// ──────────────────────────────────────────────

import type { Collection, Item, ItemCondition } from '@collectorhub/shared-types';
import { itemsService } from '@/lib/services/itemsService.ts';
import { collectionsService } from '@/lib/services/collectionsService.ts';
import { normalise } from './evidence.ts';
import type { MatchCandidate } from './matcher.ts';

export function isHotWheelsCollection(c: Collection): boolean {
  return /hot.?wheels/i.test(`${c.collectibleType} ${c.name}`);
}

/** Same product code + name, or (no code) same name/series/year. */
export function findDuplicate(items: Item[], cand: MatchCandidate): Item | undefined {
  const e = cand.entry;
  if (e.ownedItemId) return items.find((it) => it._id === e.ownedItemId);
  const code = (e.modelNumber || '').toUpperCase();
  const name = normalise(e.name);
  return items.find((it) => {
    if (normalise(it.name) !== name) return false;
    const itCode = (it.modelNumber || '').toUpperCase();
    if (code && itCode) return code === itCode;
    return normalise(it.series || '') === normalise(e.series || '') && (it.releaseYear ?? null) === (e.releaseYear ?? null);
  });
}

const clip = (s: string | undefined, n: number) => (s || '').trim().slice(0, n);

export async function ensureCollection(collectionId: string | null): Promise<string> {
  if (collectionId) return collectionId;
  const created = await collectionsService.saveCollection({
    name: 'My Hot Wheels',
    slug: 'my-hot-wheels',
    description: 'Cars added with Scan to Collect.',
    collectibleType: 'Hot Wheels',
    privacy: 'private',
  });
  return created._id;
}

export async function incrementCopy(existing: Item): Promise<Item> {
  const now = new Date().toISOString();
  return itemsService.saveItem({
    ...existing,
    ownership: {
      ...existing.ownership,
      status: 'owned',
      duplicateCount: (existing.ownership?.duplicateCount ?? 1) + 1,
    },
    timeline: {
      ...existing.timeline,
      history: [...(existing.timeline?.history ?? []), { action: 'Added copy via scan', timestamp: now, details: {} }],
    },
  });
}

export async function addCandidate(
  cand: MatchCandidate,
  collectionId: string,
  condition: ItemCondition,
): Promise<Item> {
  const e = cand.entry;
  const now = new Date().toISOString();
  const name = clip(e.name, 200);
  if (!name) throw new Error('Candidate has no name');

  const imageUrl = e.imageUrl && /^https:\/\//.test(e.imageUrl) ? e.imageUrl : null;
  const provider = {
    garage: 'Your garage',
    catalog: 'Hot Wheels Wiki catalogue',
    reference: 'Reference catalogue',
    wiki: 'Hot Wheels Wiki',
  }[e.source];

  return itemsService.saveItem({
    collectionId,
    name,
    brand: clip(e.brand, 80) || 'Hot Wheels',
    series: clip(e.series, 120),
    releaseYear: e.releaseYear && e.releaseYear > 1967 && e.releaseYear < 2100 ? e.releaseYear : null,
    modelNumber: clip(e.modelNumber, 20).toUpperCase(),
    collectorNumber: clip(e.collectorNumber, 12),
    description: clip(e.description, 2000),
    scale: '1:64',
    color: (e.color ?? []).map((c) => clip(c, 40)).slice(0, 6),
    manufacturer: 'Mattel',
    barcode: /^\d{8,14}$/.test(e.barcode || '') ? e.barcode : '',
    images: imageUrl
      ? [{ url: imageUrl, thumbnail: imageUrl, caption: clip(e.imageCaption || e.name, 200), isPrimary: true, uploadedAt: now }]
      : [],
    tags: ['Scanned'],
    customMetadata: {
      ...(e.variant ? { variant: clip(e.variant, 60) } : {}),
      ...(e.seriesNumber ? { seriesNumber: clip(e.seriesNumber, 12) } : {}),
      scanMatch: { score: cand.score, reasons: cand.reasons.map((r) => r.label).slice(0, 8) },
    },
    ownership: {
      status: 'owned',
      condition,
      duplicateCount: 1,
      acquiredDate: now.slice(0, 10),
      estimatedValue: null,
      valueCurrency: 'USD',
      valueLastUpdated: null,
      purchase: { price: null, currency: 'USD', date: null, seller: '', marketplace: '', receiptImage: null },
    },
    timeline: {
      dateAdded: now,
      lastViewed: null,
      timesViewed: 0,
      history: [{ action: 'Added via Scan to Collect', timestamp: now, details: {} }],
    },
    dataSource: {
      provider: `Scan to Collect · ${provider}`,
      sourceUrl: e.sourceUrl || '',
      lastSynced: now,
      confidence: Math.round(cand.score) / 100,
    },
  });
}

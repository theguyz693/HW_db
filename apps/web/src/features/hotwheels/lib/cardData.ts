// ──────────────────────────────────────────────
// Card data — the minimal product shape the BlisterCard renders.
// Decoupled from Item so scan candidates / wiki results can reuse it.
// ──────────────────────────────────────────────

import type { Item } from '@collectorhub/shared-types';

export interface BlisterCardData {
  id: string;
  name: string;
  brand?: string;
  series?: string;
  releaseYear?: number | null;
  modelNumber?: string;
  collectorNumber?: string;
  color?: string[];
  imageUrl?: string | null;
  imageCaption?: string;
  /** How to present the photo; 'auto' runs pixel analysis. */
  imageKind?: ImageKind;
  /** Per-image nudge when automatic fitting isn't enough. */
  imageFit?: ImageFit;
}

/**
 * auto    — analyse pixels: transparent → cutout, uniform backdrop → remove it, else scene
 * cutout  — already has a transparent background
 * plain   — plain backdrop; try removing it, fall back to scene
 * package — the photo IS the full retail package (shown whole, never re-packaged)
 * scene   — busy background; shown as a photo insert inside the blister
 */
export type ImageKind = 'auto' | 'cutout' | 'plain' | 'package' | 'scene';
export const IMAGE_KINDS: ImageKind[] = ['auto', 'cutout', 'plain', 'package', 'scene'];

export interface ImageFit {
  /** 0.6–1.6, multiplies the automatic fit */
  scale: number;
  /** -30..30, percent of the blister width/height */
  x: number;
  y: number;
}

const clampNum = (v: unknown, min: number, max: number, dflt: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : dflt;

export function readImageKind(v: unknown): ImageKind {
  if (v === 'packaged') return 'package'; // legacy values from the first version
  if (v === 'loose') return 'auto';
  return IMAGE_KINDS.includes(v as ImageKind) ? (v as ImageKind) : 'auto';
}

export function readImageFit(v: unknown): ImageFit | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  return { scale: clampNum(o.scale, 0.6, 1.6, 1), x: clampNum(o.x, -30, 30, 0), y: clampNum(o.y, -30, 30, 0) };
}

export function itemToCardData(item: Item): BlisterCardData {
  const primary = item.images?.find((img) => img.isPrimary) ?? item.images?.[0];
  return {
    id: item._id,
    name: item.name,
    brand: item.brand,
    series: item.series,
    releaseYear: item.releaseYear,
    modelNumber: item.modelNumber,
    collectorNumber: item.collectorNumber,
    color: item.color,
    imageUrl: primary?.url || primary?.thumbnail || null,
    imageCaption: primary?.caption,
    imageKind: readImageKind(item.customMetadata?.imageKind),
    imageFit: readImageFit(item.customMetadata?.imageFit),
  };
}

// Curated card palettes; series → palette is a stable hash so a series always looks the same.
const PALETTES: { base: string; deep: string; stripe: string }[] = [
  { base: '#1d4ed8', deep: '#0b1f5c', stripe: '#f97316' }, // mainline blue / orange
  { base: '#b91c1c', deep: '#450a0a', stripe: '#facc15' }, // red / yellow
  { base: '#6d28d9', deep: '#1e0b45', stripe: '#22d3ee' }, // violet / cyan
  { base: '#0f766e', deep: '#042f2e', stripe: '#fde047' }, // teal / yellow
  { base: '#27272a', deep: '#09090b', stripe: '#ef4444' }, // premium black / red
  { base: '#c2410c', deep: '#431407', stripe: '#38bdf8' }, // orange / sky
];

const KNOWN_SERIES: Record<string, number> = {
  boulevard: 4,
  'car culture': 4,
  premium: 4,
  mainline: 0,
  exotics: 1,
  'hw exotics': 1,
  'factory fresh': 3,
  'then and now': 5,
  'treasure hunt': 2,
  'super treasure hunt': 2,
};

export function paletteForSeries(series?: string) {
  const key = (series || '').trim().toLowerCase();
  if (key in KNOWN_SERIES) return PALETTES[KNOWN_SERIES[key]!]!;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length]!;
}

// ──────────────────────────────────────────────
// Catalogue matcher — scores catalogue entries against scan evidence
// and explains *why* each candidate matched.
// ──────────────────────────────────────────────

import { normalise, tokenise, type ScanEvidence } from './evidence.ts';

export interface CatalogEntry {
  /** Stable key: item id for owned cars, `ref:<code|name>` for reference entries */
  key: string;
  source: 'garage' | 'catalog' | 'reference' | 'wiki';
  name: string;
  /** e.g. "2nd Color", "Treasure Hunt" */
  variant?: string;
  brand?: string;
  series?: string;
  releaseYear?: number | null;
  modelNumber?: string;
  collectorNumber?: string;
  /** Position in its sub-series, e.g. "3/5" */
  seriesNumber?: string;
  barcode?: string;
  color?: string[];
  imageUrl?: string | null;
  imageCaption?: string;
  description?: string;
  sourceUrl?: string;
  /** How many copies the user already owns (garage entries) */
  ownedCount?: number;
  ownedItemId?: string;
}

export type Confidence = 'high' | 'medium' | 'low';

export interface MatchReason {
  label: string;
  points: number;
}

export interface MatchCandidate {
  entry: CatalogEntry;
  score: number;
  confidence: Confidence;
  reasons: MatchReason[];
}

/** UPC-A (12) and EAN-13 with a leading 0 are the same code. */
export function canonicalBarcode(code?: string): string {
  const digits = (code || '').replace(/\D/g, '');
  return digits.length === 12 ? `0${digits}` : digits;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

function tokenHit(nameToken: string, evidenceTokens: Set<string>, evidenceList: string[]): boolean {
  if (evidenceTokens.has(nameToken)) return true;
  // Tolerate single OCR slips on longer words ("Skylme" → "skyline").
  if (nameToken.length >= 5) return evidenceList.some((t) => levenshtein(t, nameToken) <= 1);
  return false;
}

export function confidenceFor(score: number): Confidence {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function scoreEntry(entry: CatalogEntry, ev: ScanEvidence): MatchCandidate {
  const reasons: MatchReason[] = [];
  const add = (label: string, points: number) => reasons.push({ label, points });

  // Barcode — strong, but a barcode identifies a retail SKU/assortment, not necessarily the colour variant.
  const entryBarcode = canonicalBarcode(entry.barcode);
  if (entryBarcode.length >= 8 && ev.barcodes.some((b) => canonicalBarcode(b) === entryBarcode)) {
    add(`Barcode ${entry.barcode} matches (may cover several variants)`, 40);
  }

  // Mattel product code — the most specific printed identifier.
  const code = (entry.modelNumber || '').toUpperCase();
  if (code && ev.modelCodes.includes(code)) add(`Product code ${code} found`, 45);

  // Name tokens
  const nameTokens = tokenise(entry.name);
  if (nameTokens.length) {
    const evSet = new Set(ev.tokens);
    const hits = nameTokens.filter((t) => tokenHit(t, evSet, ev.tokens));
    const frac = hits.length / nameTokens.length;
    if (hits.length) {
      add(`Name words matched: ${hits.join(', ')}`, Math.round(35 * frac));
      if (frac === 1 && ev.text.includes(normalise(entry.name))) add('Full name found in text', 10);
    }
  }

  // Series
  if (entry.series) {
    const s = normalise(entry.series);
    if (ev.series.some((x) => normalise(x) === s)) add(`Series "${entry.series}"`, 10);
  }

  // Collector number ("78/250" on the card) — ignore small "x/5" clues, those are series positions.
  if (entry.collectorNumber) {
    const n = String(Number(entry.collectorNumber));
    if (ev.collectorNumbers.some((c) => c.number === n && (!c.of || Number(c.of) >= 50))) add(`Collector # ${n}`, 8);
  }

  // Sub-series position ("3/5")
  if (entry.seriesNumber) {
    const [n, of] = entry.seriesNumber.split('/');
    if (ev.collectorNumbers.some((c) => c.number === n && c.of === of)) add(`Series # ${entry.seriesNumber}`, 6);
  }

  // Year
  if (entry.releaseYear && ev.years.includes(entry.releaseYear)) add(`Year ${entry.releaseYear}`, 6);

  const score = Math.min(100, reasons.reduce((n, r) => n + r.points, 0));
  return { entry, score, confidence: confidenceFor(score), reasons };
}

/** Collapse entries that describe the same casting+variant, preferring garage entries. */
export function dedupeEntries(entries: CatalogEntry[]): CatalogEntry[] {
  const out = new Map<string, CatalogEntry>();
  for (const e of entries) {
    // Toy codes are unique per release, so they're the best identity when present.
    const code = (e.modelNumber || '').toUpperCase();
    const id = code ? `code:${code}` : `name:${normalise(e.name)}|${normalise(e.series || '')}|${e.releaseYear ?? ''}`;
    const existing = out.get(id);
    if (!existing) out.set(id, e);
    else if (e.source === 'garage' && existing.source !== 'garage') {
      out.set(id, { ...existing, ...e, imageUrl: e.imageUrl || existing.imageUrl });
    } else if (existing.source === 'garage' && e.source !== 'garage') {
      // keep garage entry, but fill gaps from reference
      out.set(id, { ...e, ...existing, imageUrl: existing.imageUrl || e.imageUrl });
    }
  }
  return [...out.values()];
}

export function rankCandidates(
  entries: CatalogEntry[],
  ev: ScanEvidence,
  { minScore = 15, limit = 12 } = {},
): MatchCandidate[] {
  return dedupeEntries(entries)
    .map((e) => scoreEntry(e, ev))
    .filter((c) => c.score >= minScore)
    // Ties: newer releases first (more likely to be on the pegs), then name.
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.entry.releaseYear ?? 0) - (a.entry.releaseYear ?? 0) ||
        a.entry.name.localeCompare(b.entry.name),
    )
    .slice(0, limit);
}

/**
 * Is the top candidate clearly ahead? Even then the UI still asks for confirmation —
 * this only decides whether to pre-select it.
 */
export function hasClearWinner(candidates: MatchCandidate[]): boolean {
  const [a, b] = candidates;
  if (!a || a.confidence !== 'high') return false;
  return !b || a.score - b.score >= 20;
}

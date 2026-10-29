// ──────────────────────────────────────────────
// Pixel-level image analysis for package presentation (pure, testable).
//
// classify():  cutout  — the border is mostly transparent (PNG cut-outs)
//              plain   — the border is one uniform colour (studio/white backdrop)
//              scene   — anything else (busy/real-world background)
// removeBackground(): flood-fills the uniform backdrop from the edges to alpha.
// This is a heuristic, not segmentation — callers must check isUsableCutout()
// and fall back to the original photo, and owners can override the type.
// ──────────────────────────────────────────────

export type DetectedKind = 'cutout' | 'plain' | 'scene';

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ALPHA_EMPTY = 24;

function forEachBorderPixel(img: Pixels, band: number, fn: (i: number) => void) {
  const { width: w, height: h } = img;
  for (let y = 0; y < h; y++) {
    const edgeRow = y < band || y >= h - band;
    for (let x = 0; x < w; x++) {
      if (edgeRow || x < band || x >= w - band) fn((y * w + x) * 4);
    }
  }
}

export interface BorderStats {
  transparentFrac: number;
  mean: [number, number, number];
  /** RMS colour distance of opaque border pixels from their mean (0 = perfectly uniform) */
  spread: number;
}

export function borderStats(img: Pixels, band = 3): BorderStats {
  const d = img.data;
  let total = 0;
  let transparent = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  forEachBorderPixel(img, band, (i) => {
    total++;
    if (d[i + 3]! < ALPHA_EMPTY) {
      transparent++;
      return;
    }
    r += d[i]!;
    g += d[i + 1]!;
    b += d[i + 2]!;
    n++;
  });
  const mean: [number, number, number] = n ? [r / n, g / n, b / n] : [0, 0, 0];
  let sq = 0;
  forEachBorderPixel(img, band, (i) => {
    if (d[i + 3]! < ALPHA_EMPTY) return;
    sq += (d[i]! - mean[0]) ** 2 + (d[i + 1]! - mean[1]) ** 2 + (d[i + 2]! - mean[2]) ** 2;
  });
  return { transparentFrac: total ? transparent / total : 0, mean, spread: n ? Math.sqrt(sq / n) : 0 };
}

export function classify(img: Pixels): DetectedKind {
  const s = borderStats(img);
  if (s.transparentFrac > 0.6) return 'cutout';
  if (s.spread < 22) return 'plain';
  return 'scene';
}

export function alphaBBox(img: Pixels, threshold = ALPHA_EMPTY): BBox | null {
  const { data: d, width: w, height: h } = img;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3]! > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Flood-fill from every border pixel that matches the backdrop colour, clearing alpha.
 * Pixels just outside the tolerance get partial alpha for a soft edge (shadows, anti-aliasing).
 * Mutates `img`. Returns the fraction of pixels removed.
 */
export function removeBackground(img: Pixels, tolerance = 42, soft = 26): number {
  const { data: d, width: w, height: h } = img;
  const { mean } = borderStats(img);
  const dist = (p: number) =>
    Math.sqrt((d[p]! - mean[0]) ** 2 + (d[p + 1]! - mean[1]) ** 2 + (d[p + 2]! - mean[2]) ** 2);

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const seed = (idx: number) => {
    if (visited[idx]) return;
    visited[idx] = 1;
    if (dist(idx * 4) < tolerance) queue[tail++] = idx;
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }

  let removed = 0;
  while (head < tail) {
    const idx = queue[head++]!;
    d[idx * 4 + 3] = 0;
    removed++;
    const x = idx % w;
    const y = (idx - x) / w;
    const neighbours = [x > 0 ? idx - 1 : -1, x < w - 1 ? idx + 1 : -1, y > 0 ? idx - w : -1, y < h - 1 ? idx + w : -1];
    for (const nb of neighbours) {
      if (nb < 0 || visited[nb]) continue;
      visited[nb] = 1;
      const dd = dist(nb * 4);
      if (dd < tolerance) queue[tail++] = nb;
      else if (dd < tolerance + soft) d[nb * 4 + 3] = Math.round((d[nb * 4 + 3]! * (dd - tolerance)) / soft);
    }
  }
  return removed / (w * h);
}

/** Reject removals that ate almost everything, almost nothing, or left a speck. */
export function isUsableCutout(removedFrac: number, bbox: BBox | null, w: number, h: number): boolean {
  if (!bbox) return false;
  if (removedFrac < 0.12 || removedFrac > 0.93) return false;
  return (bbox.w * bbox.h) / (w * h) > 0.04 && bbox.w > w * 0.2;
}

// ──────────────────────────────────────────────
// Prepares a product photo for the package frame, in the browser.
// Runs the pixel analysis on a ≤640px canvas, removes plain backdrops,
// and crops cut-outs tightly so every car scales the same inside the blister.
// Results are cached for the session (blob URLs; nothing is uploaded or stored).
// ──────────────────────────────────────────────

import { alphaBBox, classify, isUsableCutout, removeBackground, type Pixels } from './imageAnalysis.ts';
import type { ImageKind } from './cardData.ts';

export interface PreparedImage {
  /** How the frame should present it */
  mode: 'cutout' | 'scene';
  src: string;
  /** What the analysis concluded, for diagnostics/UI */
  detected: 'cutout' | 'plain' | 'scene' | 'unreadable';
}

const MAX = 640;
const cache = new Map<string, Promise<PreparedImage>>();
let active = 0;
const waiting: (() => void)[] = [];

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 2) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load failed'));
    img.src = url;
  });
}

function toBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('encode failed'))), 'image/png'),
  );
}

async function cropToContent(px: ImageData): Promise<string | null> {
  const box = alphaBBox(px);
  if (!box) return null;
  const pad = Math.round(Math.max(box.w, box.h) * 0.03);
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const w = Math.min(px.width - x, box.w + pad * 2);
  const h = Math.min(px.height - y, box.h + pad * 2);
  const src = document.createElement('canvas');
  src.width = px.width;
  src.height = px.height;
  src.getContext('2d')!.putImageData(px, 0, 0);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d')!.drawImage(src, x, y, w, h, 0, 0, w, h);
  return toBlobUrl(out);
}

async function analyse(url: string, requested: ImageKind): Promise<PreparedImage> {
  const scene: PreparedImage = { mode: 'scene', src: url, detected: 'scene' };
  if (requested === 'scene') return scene;
  try {
    const img = await load(url);
    const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const raw = ctx.getImageData(0, 0, canvas.width, canvas.height); // throws if the server forbids CORS
    const px: Pixels = raw; // ImageData satisfies Pixels; analysis mutates raw.data in place

    const detected = classify(px);
    const kind = requested === 'auto' ? detected : requested;

    if (kind === 'cutout') {
      const src = await cropToContent(raw);
      return src ? { mode: 'cutout', src, detected } : { ...scene, detected };
    }
    if (kind === 'plain') {
      const removed = removeBackground(px);
      if (isUsableCutout(removed, alphaBBox(px), px.width, px.height)) {
        const src = await cropToContent(raw);
        if (src) return { mode: 'cutout', src, detected };
      }
    }
    return { ...scene, detected };
  } catch {
    return { ...scene, detected: 'unreadable' };
  }
}

export function prepareImage(url: string, requested: ImageKind = 'auto'): Promise<PreparedImage> {
  const key = `${requested}|${url}`;
  let p = cache.get(key);
  if (!p) {
    p = slot(() => analyse(url, requested));
    cache.set(key, p);
  }
  return p;
}

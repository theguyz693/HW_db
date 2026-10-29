// ──────────────────────────────────────────────
// The owner-supplied Hot Wheels logo, cleaned once per session.
// The source PNG has a checkerboard painted into its pixels; cleanLogo()
// removes it and redraws an even white outline. Shared by the home hero and
// the collection covers. Hot Wheels is a trademark of Mattel, Inc.
// ──────────────────────────────────────────────

const LOGO_URL = '/brand/hw-logo-src.png';
const OUTLINE_PX = 8;

export interface CleanLogo {
  face: HTMLCanvasElement;
  edge: HTMLCanvasElement;
  aspect: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function buildCleanLogo(url: string): Promise<CleanLogo> {
  const img = await loadImage(url);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const src = g.getImageData(0, 0, w, h);
  const d = src.data;

  // 1. Backdrop = light, unsaturated pixels connected to the border (checkerboard + old outline).
  const isBackdrop = (p: number) => {
    const r = d[p * 4]!, gg = d[p * 4 + 1]!, b = d[p * 4 + 2]!;
    return Math.max(r, gg, b) - Math.min(r, gg, b) < 22 && Math.min(r, gg, b) > 190;
  };
  const bg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const seed = (p: number) => {
    if (!bg[p] && isBackdrop(p)) {
      bg[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (head < tail) {
    const p = queue[head++]!;
    const x = p % w;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (p >= w) seed(p - w);
    if (p < w * (h - 1)) seed(p + w);
  }

  // 2. Chamfer distance (3/4 weights) from the logo body, to redraw an even outline.
  const INF = 1e9;
  const dist = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) dist[p] = bg[p] ? INF : 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!dist[p]) continue;
      let v = dist[p]!;
      if (x > 0) v = Math.min(v, dist[p - 1]! + 3);
      if (y > 0) {
        v = Math.min(v, dist[p - w]! + 3);
        if (x > 0) v = Math.min(v, dist[p - w - 1]! + 4);
        if (x < w - 1) v = Math.min(v, dist[p - w + 1]! + 4);
      }
      dist[p] = v;
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const p = y * w + x;
      if (!dist[p]) continue;
      let v = dist[p]!;
      if (x < w - 1) v = Math.min(v, dist[p + 1]! + 3);
      if (y < h - 1) {
        v = Math.min(v, dist[p + w]! + 3);
        if (x < w - 1) v = Math.min(v, dist[p + w + 1]! + 4);
        if (x > 0) v = Math.min(v, dist[p + w - 1]! + 4);
      }
      dist[p] = v;
    }

  const face = new ImageData(w, h);
  const edge = new ImageData(w, h);
  const R = OUTLINE_PX * 3;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let p = 0; p < w * h; p++) {
    const dd = dist[p]!;
    let a = 0;
    if (dd === 0) a = 255;
    else if (dd <= R + 3) a = Math.round(255 * Math.min(1, (R + 3 - dd) / 3)); // anti-aliased rim
    if (!a) continue;
    const x = p % w;
    const y = (p - x) / w;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    const i = p * 4;
    if (dd === 0) {
      face.data.set([d[i]!, d[i + 1]!, d[i + 2]!, 255], i);
      edge.data.set([122, 11, 17, 255], i); // deep red sides
    } else {
      face.data.set([255, 255, 255, a], i);
      edge.data.set([196, 196, 204, a], i); // grey sides for the white rim
    }
  }

  const crop = (data: ImageData) => {
    const pad = 4;
    const cw = maxX - minX + 1 + pad * 2;
    const ch = maxY - minY + 1 + pad * 2;
    const full = document.createElement('canvas');
    full.width = w;
    full.height = h;
    full.getContext('2d')!.putImageData(data, 0, 0);
    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    out.getContext('2d')!.drawImage(full, minX - pad, minY - pad, cw, ch, 0, 0, cw, ch);
    return out;
  };
  const faceC = crop(face);
  return { face: faceC, edge: crop(edge), aspect: faceC.width / faceC.height };
}


let cached: Promise<CleanLogo> | null = null;
export function cleanLogo(): Promise<CleanLogo> {
  if (!cached) {
    cached = buildCleanLogo(LOGO_URL);
    cached.catch(() => (cached = null));
  }
  return cached;
}

let urlCache: Promise<string> | null = null;
/** PNG data URL of the cleaned logo, for plain <img> use. */
export function cleanLogoUrl(): Promise<string> {
  if (!urlCache) {
    urlCache = cleanLogo().then((l) => l.face.toDataURL('image/png'));
    urlCache.catch(() => (urlCache = null));
  }
  return urlCache;
}

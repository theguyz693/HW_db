// ──────────────────────────────────────────────
// Finds a real photo of the exact carded release on the Hot Wheels Wiki,
// keyed by Mattel toy code (e.g. HRY93). Wiki carded shots are portrait and
// carry the toy code in the filename; loose/back shots are excluded.
// Results (including "none") are cached per browser; photos are linked, not copied.
// ──────────────────────────────────────────────

const API = 'https://hotwheels.fandom.com/api.php';
const CACHE_PREFIX = 'hw-carded:v2:';
const MAX_CONCURRENT = 3;

const inflight = new Map<string, Promise<string | null>>();
let active = 0;
const queue: (() => void)[] = [];

function readCache(code: string): string | null | undefined {
  try {
    const v = localStorage.getItem(CACHE_PREFIX + code);
    return v === null ? undefined : v || null;
  } catch {
    return undefined;
  }
}

function writeCache(code: string, url: string | null) {
  try {
    localStorage.setItem(CACHE_PREFIX + code, url ?? '');
  } catch {
    /* storage full or blocked — just skip caching */
  }
}

async function throttled<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => queue.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

interface WikiFile {
  title: string;
  imageinfo?: { width: number; height: number; thumburl?: string; url: string }[];
}

export function pickCardedFile(code: string, files: WikiFile[]): string | null {
  const best = files
    .map((f) => {
      const info = f.imageinfo?.[0];
      const name = f.title.toUpperCase();
      if (!info || !name.includes(code)) return null;
      if (/LOOSE|BACK|BASE/.test(name)) return null;
      const ratio = info.height / info.width;
      const keyword = /CARD|MOC|BLISTER|PACKAG/.test(name);
      if (ratio < 1.3 && !keyword) return null;
      return { url: info.thumburl || info.url, score: (keyword ? 2 : 0) + (ratio >= 1.3 ? 2 : 0) + info.height / 10000 };
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score)[0];
  if (!best) return null;
  return best.url + (best.url.includes('?') ? '&' : '?') + 'v=2';
}

export function findCardedImage(toyCode?: string | null): Promise<string | null> {
  const code = (toyCode || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,6}$/.test(code)) return Promise.resolve(null);
  const cached = readCache(code);
  if (cached !== undefined) return Promise.resolve(cached);
  const existing = inflight.get(code);
  if (existing) return existing;

  const p = throttled(async () => {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrnamespace: '6',
      gsrsearch: code,
      gsrlimit: '10',
      prop: 'imageinfo',
      iiprop: 'url|size',
      iiurlwidth: '700',
      format: 'json',
      formatversion: '2',
      origin: '*',
    });
    const res = await fetch(`${API}?${params}`);
    if (!res.ok) throw new Error(`wiki ${res.status}`);
    const data = await res.json();
    return pickCardedFile(code, data.query?.pages ?? []);
  })
    .then((url) => {
      writeCache(code, url);
      return url;
    })
    .catch(() => null) // network failure: don't cache, try again next visit
    .finally(() => inflight.delete(code));

  inflight.set(code, p);
  return p;
}

// ──────────────────────────────────────────────
// Hot Wheels catalogue importer
//
// Builds public/catalog/hotwheels.json from the Hot Wheels Wiki's yearly
// mainline lists ("List of YYYY Hot Wheels") via the public MediaWiki API.
//
// • Text content: Hot Wheels Wiki contributors, CC BY-SA 3.0 — attribution is
//   stored in the output and shown in the app.
// • Photos are NOT copied: we store links to the wiki's own image CDN.
// • Polite: one request at a time, identifiable User-Agent, small delay.
//
// Usage:  node scripts/import-hw-catalog.mjs [fromYear] [toYear]
//         pnpm --filter @collectorhub/web catalog:import 2019 2025
// ──────────────────────────────────────────────

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://hotwheels.fandom.com/api.php';
const UA = 'CollectorHub-catalog-import/1.0 (personal collection app; contact via repo owner)';
const DELAY_MS = 350;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/catalog/hotwheels.json');

const thisYear = new Date().getFullYear();
const fromYear = Number(process.argv[2] ?? 2018);
const toYear = Number(process.argv[3] ?? thisYear);

// Image URLs are stored compactly as "<hash path>|<cb>"; the app rebuilds the CDN URL.
const IMG_RE = /^https:\/\/static\.wikia\.nocookie\.net\/hotwheels\/images\/([^/]+\/[^/]+\/[^/]+)\/revision\/latest(?:\/scale-to-width-down\/\d+)?(?:\?cb=(\d+))?/;
function compactImage(url) {
  const m = url && url.match(IMG_RE);
  return m ? `${m[1]}|${m[2] ?? ''}` : url || '';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.ok) {
      await sleep(DELAY_MS);
      return res.json();
    }
    console.warn(`  HTTP ${res.status} (attempt ${attempt})`);
    await sleep(1500 * attempt);
  }
  throw new Error(`Failed: ${url}`);
}

// ── Wikitext helpers ──

/** Split on `sep` only at depth 0 of [[ ]] / {{ }}. */
function splitTopLevel(s, sep) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === '[[' || two === '{{') {
      depth++;
      cur += two;
      i++;
      continue;
    }
    if ((two === ']]' || two === '}}') && depth > 0) {
      depth--;
      cur += two;
      i++;
      continue;
    }
    if (depth === 0 && s.startsWith(sep, i)) {
      out.push(cur);
      cur = '';
      i += sep.length - 1;
      continue;
    }
    cur += s[i];
  }
  out.push(cur);
  return out;
}

/** Drop a leading `attr="x" |` cell-attribute prefix. */
function stripCellAttrs(cell) {
  const parts = splitTopLevel(cell, '|');
  if (parts.length > 1 && /^\s*[a-z-]+\s*=/.test(parts[0])) return parts.slice(1).join('|');
  return cell;
}

function clean(s) {
  return s
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function fileName(cell) {
  const m = cell.match(/\[\[(?:File|Image):([^|\]]+)/i);
  return m ? m[1].trim() : null;
}

const COLS = {
  toy: /toy\s*#/i,
  col: /^col\.?\s*#|collector/i,
  name: /model\s*name|casting|^name/i,
  series: /^series$/i,
  seriesNum: /series\s*#/i,
  photo: /photo|image/i,
};

export function parseTables(wikitext, year) {
  const rows = [];
  const tables = wikitext.split(/\n\{\|/).slice(1).map((t) => t.split(/\n\|\}/)[0]);
  for (const table of tables) {
    const chunks = table.split(/\n\|-[^\n]*/);
    // Header
    const headerChunk = chunks.find((c) => /\n!/.test(`\n${c}`));
    if (!headerChunk) continue;
    const headers = headerChunk
      .split('\n')
      .filter((l) => l.startsWith('!'))
      .flatMap((l) => splitTopLevel(l.slice(1), '!!'))
      // Header attrs are often malformed (unclosed quotes), so take the text after the last top-level pipe.
      .map((h) => clean(splitTopLevel(h, '|').pop() ?? ''));
    const idx = Object.fromEntries(Object.entries(COLS).map(([k, re]) => [k, headers.findIndex((h) => re.test(h))]));
    if (idx.name < 0 || idx.toy < 0) continue;

    for (const chunk of chunks) {
      if (chunk === headerChunk) continue;
      const cells = chunk
        .split('\n')
        .filter((l) => l.startsWith('|') && !l.startsWith('|}') && !l.startsWith('|+'))
        .flatMap((l) => splitTopLevel(l.slice(1), '||'))
        .map(stripCellAttrs);
      if (cells.length < headers.length - 1) continue;
      const get = (k) => (idx[k] >= 0 ? cells[idx[k]] ?? '' : '');

      const toy = clean(get('toy')).toUpperCase().replace(/\s+/g, '');
      if (!/^[A-Z0-9]{4,6}$/.test(toy)) continue;
      const rawName = clean(get('name')).split('\n')[0];
      const variantMatch = rawName.match(/\s*\(([^)]*)\)\s*$/);
      const name = (variantMatch ? rawName.slice(0, variantMatch.index) : rawName).trim();
      if (!name) continue;
      const seriesLines = clean(get('series')).split('\n').map((s) => s.trim()).filter(Boolean);
      const series = seriesLines.find((s) => !/new for \d{4}/i.test(s)) ?? '';
      const tags = seriesLines.filter((s) => s !== series);

      rows.push({
        toy,
        col: clean(get('col')).replace(/^0+(?=\d)/, ''),
        name,
        variant: variantMatch ? variantMatch[1].trim() : '',
        series,
        seriesNum: clean(get('seriesNum')),
        year,
        isNew: tags.some((t) => /new for/i.test(t)),
        file: fileName(get('photo')),
      });
    }
  }
  return rows;
}

async function resolveImages(files) {
  const urls = new Map();
  const list = [...new Set(files.filter(Boolean))];
  for (let i = 0; i < list.length; i += 50) {
    const batch = list.slice(i, i + 50);
    const data = await api({
      action: 'query',
      titles: batch.map((f) => `File:${f}`).join('|'),
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: '480',
    });
    const normal = new Map((data.query?.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of data.query?.pages ?? []) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const original = (normal.get(page.title) ?? page.title).replace(/^File:/, '');
      urls.set(original, info.thumburl || info.url);
    }
    process.stdout.write(`\r  images ${Math.min(i + 50, list.length)}/${list.length}`);
  }
  process.stdout.write('\n');
  return urls;
}

async function main() {
  const all = [];
  for (let year = fromYear; year <= toYear; year++) {
    const page = `List of ${year} Hot Wheels`;
    try {
      const data = await api({ action: 'parse', page, prop: 'wikitext' });
      if (!data.parse) {
        console.warn(`${year}: page not found, skipping`);
        continue;
      }
      const rows = parseTables(data.parse.wikitext, year);
      console.log(`${year}: ${rows.length} releases`);
      all.push(...rows);
    } catch (err) {
      console.warn(`${year}: ${err.message}`);
    }
  }
  if (!all.length) throw new Error('Nothing imported — leaving the existing catalogue untouched.');

  console.log('Resolving photo links…');
  const urls = await resolveImages(all.map((r) => r.file));

  // De-duplicate identical toy codes within a year (some lists repeat rows).
  const seen = new Set();
  const rows = [];
  for (const r of all) {
    const key = `${r.year}|${r.toy}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([r.toy, r.col, r.name, r.variant, r.series, r.seriesNum, r.year, r.isNew ? 1 : 0, compactImage(r.file && urls.get(r.file))]);
  }

  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    years: [fromYear, toYear],
    source: 'Hot Wheels Wiki (hotwheels.fandom.com), "List of YYYY Hot Wheels" pages',
    license: 'Text: CC BY-SA 3.0, Hot Wheels Wiki contributors. Photos are linked, not copied; rights remain with their uploaders.',
    imageBase: 'https://static.wikia.nocookie.net/hotwheels/images/',
    fields: ['toyNumber', 'collectorNumber', 'name', 'variant', 'series', 'seriesNumber', 'year', 'isNew', 'imageUrl'],
    rows,
  };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  console.log(`Wrote ${rows.length} releases → ${path.relative(process.cwd(), OUT)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

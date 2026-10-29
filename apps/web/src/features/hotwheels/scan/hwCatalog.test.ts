import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCatalog } from './hwCatalog.ts';
import { extractEvidence } from './evidence.ts';
import { hasClearWinner, rankCandidates } from './matcher.ts';

// Runs against the real generated catalogue, so it also guards the data file's shape.
const file = JSON.parse(readFileSync(path.resolve(__dirname, '../../../../public/catalog/hotwheels.json'), 'utf8'));
const catalog = parseCatalog(file);
const byCode = (code: string) => catalog.entries.find((e) => e.modelNumber === code)!;

describe('generated Hot Wheels catalogue', () => {
  it('is large and well-formed', () => {
    expect(catalog.entries.length).toBeGreaterThan(3000);
    expect(catalog.entries.every((e) => /^[A-Z0-9]{4,6}$/.test(e.modelNumber!))).toBe(true);
    const withImages = catalog.entries.filter((e) => e.imageUrl?.startsWith('https://static.wikia.nocookie.net/')).length;
    expect(withImages / catalog.entries.length).toBeGreaterThan(0.9);
  });
});

describe('matching against the real catalogue', () => {
  it('pins a carded car from its printed text', () => {
    const target = byCode('HRY93'); // 2024 Ford Mustang Dark Horse, Then and Now
    const ev = extractEvidence(`HOT WHEELS\nTHEN AND NOW 10/10\n${target.name.toUpperCase()}\n250/250\nHRY93`);
    const ranked = rankCandidates(catalog.entries, ev);
    expect(ranked[0]!.entry.modelNumber).toBe('HRY93');
    expect(hasClearWinner(ranked)).toBe(true);
  });

  it('offers every colour variant for a name-only read, without auto-picking', () => {
    const ranked = rankCandidates(catalog.entries, extractEvidence('Mazda Autozam'));
    const codes = ranked.map((c) => c.entry.modelNumber);
    expect(codes).toEqual(expect.arrayContaining(['HRY51', 'HTC86']));
    expect(hasClearWinner(ranked)).toBe(false);
  });

  it('survives noisy OCR around the name', () => {
    const ev = extractEvidence('WARNING CHOKING HAZARD ~~ Mazda Autozarn ## AGES 3+ HW DREAM GARAGE 3/5');
    const ranked = rankCandidates(catalog.entries, ev);
    expect(ranked.slice(0, 3).map((c) => c.entry.name)).toContain('Mazda Autozam');
  });

  it('ranks the whole catalogue quickly', () => {
    const ev = extractEvidence('porsche 911 gt3 rs nissan skyline datsun 510 wagon boulevard 2024');
    const t0 = performance.now();
    rankCandidates(catalog.entries, ev);
    expect(performance.now() - t0).toBeLessThan(300);
  });
});

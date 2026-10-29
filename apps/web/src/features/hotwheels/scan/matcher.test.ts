import { describe, expect, it } from 'vitest';
import { extractEvidence, isValidRetailBarcode } from './evidence.ts';
import { canonicalBarcode, hasClearWinner, rankCandidates, type CatalogEntry } from './matcher.ts';

const catalog: CatalogEntry[] = [
  { key: 'a', source: 'reference', name: 'Datsun Bluebird 510 Wagon', series: 'Boulevard', releaseYear: 2023, modelNumber: 'HKF15', collectorNumber: '78', barcode: '074299057854' },
  { key: 'b', source: 'reference', name: 'Porsche 911 Turbo (930)', series: 'Boulevard', releaseYear: 2024, modelNumber: 'HRT65', collectorNumber: '96' },
  { key: 'c', source: 'reference', name: 'Nissan Skyline GT-R (R34)', series: 'Boulevard', releaseYear: 2022, modelNumber: 'GJP84' },
  { key: 'd', source: 'reference', name: 'Lamborghini Countach LPI 800-4', series: 'Factory Fresh', modelNumber: 'HKG42' },
  { key: 'e', source: 'reference', name: 'Porsche 911 GT3', series: 'HW Exotics', modelNumber: 'HCT11' },
];

describe('extractEvidence', () => {
  it('pulls product codes, collector numbers, series and years from noisy OCR', () => {
    const ev = extractEvidence('HOT WHEELS BOULEVARD\nDatsun Bluebird 510 Wagon\n78/250  HKF1S  ©2023 Mattel');
    expect(ev.modelCodes).toContain('HKF15'); // S → 5 repair
    expect(ev.collectorNumbers[0]).toEqual({ number: '78', of: '250' });
    expect(ev.series).toContain('Boulevard');
    expect(ev.years).toContain(2023);
    expect(ev.tokens).toEqual(expect.arrayContaining(['datsun', 'bluebird', 'wagon']));
    expect(ev.tokens).not.toContain('mattel');
  });

  it('ignores common card words that look like codes', () => {
    expect(extractEvidence('AGES 3+ AGE55 THE10').modelCodes).toEqual([]);
  });

  it('only keeps checksum-valid barcodes', () => {
    expect(isValidRetailBarcode('036000291452')).toBe(true);
    expect(isValidRetailBarcode('036000291453')).toBe(false);
    expect(extractEvidence('', ['036000291452', '12345']).barcodes).toEqual(['036000291452']);
  });
});

describe('rankCandidates', () => {
  it('ranks a product-code + name match as a clear high-confidence winner', () => {
    const ev = extractEvidence('Datsun Bluebird 510 Wagon HKF15 Boulevard 78/250');
    const ranked = rankCandidates(catalog, ev);
    expect(ranked[0]!.entry.key).toBe('a');
    expect(ranked[0]!.confidence).toBe('high');
    expect(ranked[0]!.reasons.map((r) => r.label).join(' ')).toMatch(/Product code HKF15/);
    expect(hasClearWinner(ranked)).toBe(true);
  });

  it('returns several candidates and no clear winner when evidence is ambiguous', () => {
    const ev = extractEvidence('PORSCHE 911');
    const ranked = rankCandidates(catalog, ev);
    expect(ranked.map((c) => c.entry.key)).toEqual(expect.arrayContaining(['b', 'e']));
    expect(hasClearWinner(ranked)).toBe(false);
  });

  it('tolerates a one-letter OCR slip in long name words', () => {
    const ranked = rankCandidates(catalog, extractEvidence('Nissan Skylme GT-R'));
    expect(ranked[0]!.entry.key).toBe('c');
  });

  it('treats UPC-A and EAN-13 forms of a barcode as equal', () => {
    expect(canonicalBarcode('074299057854')).toBe(canonicalBarcode('0074299057854'));
  });

  it('returns nothing for unrelated text', () => {
    expect(rankCandidates(catalog, extractEvidence('warning choking hazard small parts'))).toEqual([]);
  });

  it('prefers the garage copy when the same car exists in garage and reference', () => {
    const merged = rankCandidates(
      [...catalog, { key: 'item-1', source: 'garage', name: 'Datsun Bluebird 510 Wagon', modelNumber: 'HKF15', ownedCount: 2 }],
      extractEvidence('HKF15'),
    );
    expect(merged[0]!.entry.source).toBe('garage');
    expect(merged[0]!.entry.ownedCount).toBe(2);
    expect(merged[0]!.entry.series).toBe('Boulevard');
  });
});

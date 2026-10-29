// ──────────────────────────────────────────────
// Evidence extraction — turns noisy OCR text + barcode reads into
// structured, *uncertain* clues. Nothing here is treated as truth;
// the matcher weighs each clue against the catalogue.
// ──────────────────────────────────────────────

export interface CollectorNumberClue {
  number: string;
  of?: string;
}

export interface ScanEvidence {
  barcodes: string[];
  modelCodes: string[];
  collectorNumbers: CollectorNumberClue[];
  series: string[];
  years: number[];
  /** Normalised meaningful words from the text (for name matching) */
  tokens: string[];
  /** The text the evidence came from, normalised */
  text: string;
}

/** Series names printed on Hot Wheels cards (extended at runtime with catalogue series). */
export const KNOWN_SERIES = [
  'Boulevard',
  'Car Culture',
  'Premium',
  'Team Transport',
  'Pop Culture',
  'Fast & Furious',
  'Then and Now',
  'Factory Fresh',
  'HW Exotics',
  'Exotics',
  'HW Dream Garage',
  'Nightburnerz',
  'Retro Racers',
  'Mud Studs',
  'Muscle Mania',
  'HW J-Imports',
  'Rod Squad',
  'HW Race Day',
  'HW Turbo',
  'HW Art Cars',
  'HW Hot Trucks',
  'HW Drift',
  'Treasure Hunt',
  'Super Treasure Hunt',
  'Hot Wheels id',
  'Red Line Club',
  'Elite 64',
];

// Printed on nearly every card; useless for identifying a casting.
const STOP_WORDS = new Set([
  'hot', 'wheels', 'mattel', 'the', 'and', 'for', 'with', 'ages', 'age', 'warning', 'choking', 'hazard',
  'small', 'parts', 'not', 'children', 'under', 'years', 'toy', 'made', 'china', 'malaysia', 'thailand',
  'inc', 'reserved', 'rights', 'all', 'collect', 'them', 'new', 'model', 'models', 'car', 'cars',
  'die', 'cast', 'diecast', 'metal', 'scale', 'www', 'com', 'hotwheels', 'series', 'mainline',
  'contents', 'may', 'vary', 'from', 'colors', 'decorations', 'shown', 'retain', 'this', 'information',
]);

export function normalise(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenise(s: string): string[] {
  return normalise(s)
    .split(/[\s/]+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

// OCR commonly swaps these in the numeric tail of a product code.
const DIGIT_FIXES: Record<string, string> = { O: '0', Q: '0', D: '0', I: '1', L: '1', S: '5', B: '8', Z: '2', G: '6' };

function repairCode(code: string): string {
  const head = code.slice(0, 3);
  const tail = code
    .slice(3)
    .split('')
    .map((c) => DIGIT_FIXES[c] ?? c)
    .join('');
  return head + tail;
}

/** EAN-13 / UPC-A / EAN-8 checksum. */
export function isValidRetailBarcode(code: string): boolean {
  if (!/^\d{8}$|^\d{12,13}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function extractEvidence(
  rawText: string,
  barcodes: string[] = [],
  extraSeries: string[] = [],
): ScanEvidence {
  const upper = rawText.toUpperCase();
  const text = normalise(rawText);

  // Mattel product codes: 3 letters + 2 digits (e.g. HKF15, GJP84). Allow OCR slips in the digits.
  const modelCodes = uniq(
    [...upper.matchAll(/\b([A-Z]{3}[0-9OQDILSBZG]{2})\b/g)]
      .map((m) => repairCode(m[1]!))
      .filter((c) => /^[A-Z]{3}\d{2}$/.test(c))
      // Avoid words that happen to fit after repair, e.g. "TOYS" → no, but "AGES" → "AGE5"
      .filter((c) => !['AGE', 'THE', 'AND', 'FOR', 'NOT', 'TOY', 'CAR'].includes(c.slice(0, 3))),
  );

  // Collector numbers like "78/250" or "5/10" (series position).
  const collectorNumbers: CollectorNumberClue[] = [];
  for (const m of rawText.matchAll(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/g)) {
    const n = Number(m[1]);
    const of = Number(m[2]);
    if (n > 0 && of >= n && of <= 400) collectorNumbers.push({ number: String(n), of: String(of) });
  }
  // A lone "#78" also counts.
  for (const m of rawText.matchAll(/#\s?(\d{1,3})\b/g)) {
    collectorNumbers.push({ number: String(Number(m[1])) });
  }

  const seriesPool = uniq([...KNOWN_SERIES, ...extraSeries].filter(Boolean));
  const series = seriesPool.filter((s) => {
    const n = normalise(s);
    return n.length >= 3 && new RegExp(`(^| )${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(text);
  });

  const years = uniq(
    [...rawText.matchAll(/\b(19[6-9]\d|20[0-3]\d)\b/g)].map((m) => Number(m[1])),
  );

  // Barcodes: decoded ones plus any 12/13-digit runs OCR picked up under the bars.
  const ocrBarcodes = [...rawText.replace(/[\s-]/g, '').matchAll(/\d{12,13}/g)].map((m) => m[0]);
  const allBarcodes = uniq([...barcodes, ...ocrBarcodes].map((b) => b.trim()).filter(isValidRetailBarcode));

  return {
    barcodes: allBarcodes,
    modelCodes,
    collectorNumbers,
    series,
    years,
    tokens: uniq(tokenise(rawText)),
    text,
  };
}

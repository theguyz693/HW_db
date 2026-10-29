// ──────────────────────────────────────────────
// Hot Wheels Fandom Wiki Data Provider
// Reference: https://hotwheels.fandom.com/wiki/Hot_Wheels
// ──────────────────────────────────────────────

import type {
  EnrichmentProvider,
  EnrichmentMatch,
  EnrichmentResult,
  EnrichedItemData,
} from '../types.ts';

const FANDOM_API_BASE = 'https://hotwheels.fandom.com/api.php';

export const hotwheelsFandomProvider: EnrichmentProvider = {
  id: 'hotwheels_fandom',
  name: 'Hot Wheels Fandom Wiki',
  supportedTypes: ['Hot Wheels', 'hot_wheels', 'Die-cast Cars'],

  /**
   * Search Fandom MediaWiki for Hot Wheels castings & models
   */
  async search(query: string): Promise<EnrichmentMatch[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      const url = `${FANDOM_API_BASE}?action=opensearch&search=${encodeURIComponent(trimmed)}&limit=8&format=json&origin=*`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        console.warn(`Fandom opensearch failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      // Format: [searchTerm, [titles...], [descriptions...], [urls...]]
      const titles: string[] = data[1] || [];
      const urls: string[] = data[3] || [];

      return titles.map((title, idx) => ({
        id: title,
        title: title,
        url: urls[idx] || `https://hotwheels.fandom.com/wiki/${encodeURIComponent(title)}`,
        provider: 'hotwheels_fandom',
      }));
    } catch (err) {
      console.warn('Fandom API search network error:', err);
      return [];
    }
  },

  /**
   * Fetch full article details, parse casting infobox, versions, and image
   */
  async getDetails(matchOrTitle: string | EnrichmentMatch): Promise<EnrichmentResult | null> {
    const title = typeof matchOrTitle === 'string' ? matchOrTitle : matchOrTitle.title;
    if (!title) return null;

    try {
      const parseUrl = `${FANDOM_API_BASE}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext|images&format=json&origin=*`;
      const response = await fetch(parseUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        console.warn(`Fandom parse error for "${title}": ${response.status}`);
        return null;
      }

      const parsedData = await response.json();
      if (!parsedData.parse || !parsedData.parse.wikitext) {
        return null;
      }

      const wikitext: string = parsedData.parse.wikitext['*'] || '';
      const imagesList: string[] = parsedData.parse.images || [];

      // 1. Extract Casting Infobox Attributes (if present)
      const infobox = extractCastingInfobox(wikitext);

      // 2. Extract Description paragraph
      const description = extractDescription(wikitext);

      // 3. Extract Versions table
      const versions = extractVersionsTable(wikitext);

      // 4. Resolve Main Image URL
      let mainImageUrl = '';
      const primaryImageFile = infobox.image || (imagesList.length > 0 ? imagesList[0] : null);

      if (primaryImageFile && !primaryImageFile.toLowerCase().includes('not_available')) {
        mainImageUrl = await resolveFandomImageUrl(primaryImageFile);
      }

      // Default version details from the newest release if available
      const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;

      // Extract Year
      let releaseYear: number | null = null;
      if (infobox.years) {
        const yearMatch = infobox.years.match(/\b(19\d\d|20\d\d)\b/);
        if (yearMatch && yearMatch[1]) releaseYear = parseInt(yearMatch[1], 10);
      } else if (latestVersion?.year) {
        const yearMatch = latestVersion.year.match(/\b(19\d\d|20\d\d)\b/);
        if (yearMatch && yearMatch[1]) releaseYear = parseInt(yearMatch[1], 10);
      }

      // Extract color array
      const colorSet: string[] = [];
      if (latestVersion?.color) {
        const cleanColor = latestVersion.color.replace(/\[\[|\]\]/g, '').trim();
        if (cleanColor) colorSet.push(cleanColor);
      }

      // Extract materials
      const materials = ['Metal'];
      if (latestVersion?.baseColor?.toLowerCase().includes('plastic')) {
        materials.push('Plastic');
      } else if (latestVersion?.baseColor?.toLowerCase().includes('metal') || latestVersion?.baseColor?.toLowerCase().includes('zamac')) {
        materials.push('Metal');
      }

      // Extract Hot Wheels specific custom metadata
      const customMetadata: Record<string, unknown> = {};
      if (infobox.designer) customMetadata['designer'] = infobox.designer;
      if (infobox.number) customMetadata['castingNumber'] = infobox.number;
      if (latestVersion?.wheelType) customMetadata['wheelType'] = latestVersion.wheelType.replace(/\[\[|\]\]/g, '');
      if (latestVersion?.toyNumber) customMetadata['toyNumber'] = latestVersion.toyNumber;
      if (latestVersion?.tampo) customMetadata['tampo'] = latestVersion.tampo;
      if (latestVersion?.baseColor) customMetadata['baseColor'] = latestVersion.baseColor.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (latestVersion?.windowColor) customMetadata['windowColor'] = latestVersion.windowColor;
      if (latestVersion?.interiorColor) customMetadata['interiorColor'] = latestVersion.interiorColor;
      if (latestVersion?.country) customMetadata['countryOfOrigin'] = latestVersion.country;

      const itemData: EnrichedItemData = {
        name: infobox.name || title,
        brand: 'Hot Wheels',
        series: latestVersion?.series || infobox.series || 'Mainline',
        releaseYear: releaseYear || new Date().getFullYear(),
        modelNumber: latestVersion?.toyNumber || infobox.number || '',
        collectorNumber: latestVersion?.colNumber || '',
        category: 'Die-cast Car',
        description: description || `Hot Wheels ${title} casting model.`,
        scale: '1:64',
        color: colorSet,
        material: materials,
        manufacturer: 'Mattel',
        barcode: '',
        images: mainImageUrl ? [
          {
            url: mainImageUrl,
            thumbnail: mainImageUrl,
            caption: `${title} Official Photo`,
            isPrimary: true,
            uploadedAt: new Date().toISOString(),
          }
        ] : [],
        tags: ['Hot Wheels', infobox.series, latestVersion?.series].filter(Boolean) as string[],
        customMetadata,
        ownership: {
          status: 'owned',
          condition: 'mint',
          duplicateCount: 1,
        },
      };

      return {
        success: true,
        provider: 'Hot Wheels Fandom Wiki',
        sourceUrl: `https://hotwheels.fandom.com/wiki/${encodeURIComponent(title)}`,
        data: itemData,
        availableVersions: versions.map(v => ({
          year: v.year,
          series: v.series,
          color: v.color,
          tampo: v.tampo,
          wheelType: v.wheelType,
          toyNumber: v.toyNumber,
          notes: v.notes,
        })),
        rawSummary: description,
        confidence: 0.95,
      };
    } catch (err) {
      console.warn(`Error resolving details for "${title}":`, err);
      return null;
    }
  },
};

// ──────────────────────────────────────────────
// Helpers for Parsing Fandom Wikitext
// ──────────────────────────────────────────────

function extractCastingInfobox(wikitext: string): Record<string, string> {
  const info: Record<string, string> = {};
  const infoboxMatch = wikitext.match(/\{\{casting\s*\|([^}]+)\}\}/i);
  if (!infoboxMatch || !infoboxMatch[1]) return info;

  const pairs = infoboxMatch[1].split('|');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx !== -1) {
      const key = pair.slice(0, eqIdx).trim().toLowerCase();
      const val = pair.slice(eqIdx + 1).trim().replace(/\[\[|\]\]/g, '');
      info[key] = val;
    }
  }
  return info;
}

function extractDescription(wikitext: string): string {
  // Find Description section or first paragraph
  const descMatch = wikitext.match(/==\s*Description\s*==\s*\n+([^=]+)/i);
  if (descMatch && descMatch[1]) {
    return cleanWikitext(descMatch[1].trim());
  }

  // Fallback: take first paragraph after template
  const textWithoutTemplates = wikitext.replace(/\{\{[^}]+\}\}/g, '').trim();
  const firstPara = textWithoutTemplates.split('\n\n')[0] || '';
  return cleanWikitext(firstPara.trim());
}

function cleanWikitext(text: string): string {
  return text
    .replace(/'''?/g, '') // remove bold / italic quotes
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, '$2') // wikilinks: [[Page|Label]] -> Label
    .replace(/<ref[^>]*>.*?<\/ref>/gi, '') // remove ref tags
    .replace(/<[^>]+>/g, '') // remove html tags
    .replace(/\s+/g, ' ')
    .trim();
}

interface ParsedVersionRow {
  colNumber?: string;
  year?: string;
  series?: string;
  color?: string;
  tampo?: string;
  baseColor?: string;
  windowColor?: string;
  interiorColor?: string;
  wheelType?: string;
  toyNumber?: string;
  country?: string;
  notes?: string;
}

function extractVersionsTable(wikitext: string): ParsedVersionRow[] {
  const versions: ParsedVersionRow[] = [];
  const tableMatch = wikitext.match(/\{\|\s*class="[^"]*wikitable[^"]*"([\s\S]*?)\|\}/i);
  if (!tableMatch || !tableMatch[1]) return versions;

  const rows = tableMatch[1].split('\n|-');
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    // Split cells by | or ||
    const rawCells = row.split(/\n\||\|\|/).map(c => c.trim()).filter(c => c && !c.startsWith('!'));
    if (rawCells.length >= 6) {
      const cleanCell = (c: string | undefined) => c ? cleanWikitext(c) : '';
      versions.push({
        colNumber: cleanCell(rawCells[0]),
        year: cleanCell(rawCells[1]),
        series: cleanCell(rawCells[2]),
        color: cleanCell(rawCells[3]),
        tampo: cleanCell(rawCells[4]),
        baseColor: cleanCell(rawCells[5]),
        windowColor: cleanCell(rawCells[6]),
        interiorColor: cleanCell(rawCells[7]),
        wheelType: cleanCell(rawCells[8]),
        toyNumber: cleanCell(rawCells[9]),
        country: cleanCell(rawCells[10]),
        notes: cleanCell(rawCells[11]),
      });
    }
  }

  return versions;
}

/**
 * Resolves full CDN image URL from MediaWiki File title
 */
async function resolveFandomImageUrl(filename: string): Promise<string> {
  try {
    const cleanFilename = filename.replace(/^File:/i, '').trim();
    const url = `${FANDOM_API_BASE}?action=query&titles=File:${encodeURIComponent(cleanFilename)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return '';

    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return '';

    const pageKey = Object.keys(pages)[0];
    if (!pageKey) return '';

    const imageInfo = pages[pageKey]?.imageinfo;
    if (Array.isArray(imageInfo) && imageInfo[0]?.url) {
      return imageInfo[0].url;
    }
    return '';
  } catch (err) {
    console.warn('Failed to resolve Fandom image URL:', err);
    return '';
  }
}

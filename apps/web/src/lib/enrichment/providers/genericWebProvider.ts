// ──────────────────────────────────────────────
// Generic Web URL Metadata Provider
// Extracts real product data using JSON-LD, OpenGraph, and standard metadata.
// Strictly NEVER fabricates brands, placeholder images, or invented values.
// ──────────────────────────────────────────────

import type {
  EnrichmentProvider,
  EnrichmentMatch,
  EnrichmentResult,
  EnrichedItemData,
  EnrichedImage,
  ExtractedFieldsReport,
} from '../types.ts';

// Restricted hostnames to prevent SSRF / internal scanning
const FORBIDDEN_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '10.', '192.168.', '172.16.', '.internal', '.local'];

export const genericWebProvider: EnrichmentProvider = {
  id: 'generic_web',
  name: 'Structured Web Product Importer',
  supportedTypes: ['*'],

  /**
   * Validates if URL is a supported external HTTP / HTTPS web link
   */
  canHandleUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;

    try {
      const urlObj = new URL(trimmed);
      const host = urlObj.hostname.toLowerCase();
      if (FORBIDDEN_HOSTS.some(fh => host.includes(fh))) return false;
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Import product metadata from any retail / hobby web page
   */
  async importFromUrl(url: string): Promise<EnrichmentResult | null> {
    const trimmed = url.trim();
    if (!genericWebProvider.canHandleUrl!(trimmed)) {
      return null;
    }

    try {
      const urlObj = new URL(trimmed);
      const domain = urlObj.hostname.replace(/^www\./, '');

      // 1. Fetch HTML content with timeout
      let html = '';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(trimmed, {
          signal: controller.signal,
          headers: { 'Accept': 'text/html,application/xhtml+xml,application/json' },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          html = await response.text();
        }
      } catch (fetchErr) {
        // Direct browser fetch blocked by CORS or network timeout.
        // Fallback: If site is a known platform and has clean slug, parse slug structure strictly without fabricating data.
      }

      // 2. Parse structured metadata
      const meta = html ? parseProductMetadataFromHtml(html, trimmed) : null;

      // 3. Extract title strictly
      let productName = meta?.title?.trim() || '';
      if (!productName && !html) {
        // Only use slug if it has meaningful product tokens
        const slug = extractCleanSlug(urlObj);
        if (slug && slug.length > 3) {
          productName = slug;
        }
      }

      // If no authentic product title could be extracted, FAIL honestly.
      if (!productName) {
        return null;
      }

      // 4. Clean product title (strip site branding suffixes like "| Flipkart.com", "- FirstCry")
      productName = cleanProductTitle(productName, domain);

      // 5. Gather real images (NEVER insert demo/placeholder images)
      const images: EnrichedImage[] = [];
      if (meta?.images && meta.images.length > 0) {
        meta.images.forEach((imgUrl, index) => {
          images.push({
            url: imgUrl,
            thumbnail: imgUrl,
            caption: `${productName} (Image ${index + 1})`,
            isPrimary: index === 0,
            uploadedAt: new Date().toISOString(),
          });
        });
      }

      // 6. Build Extracted Fields Report (Honest display of what was found vs missing)
      const report: ExtractedFieldsReport = {
        name: Boolean(productName),
        brand: Boolean(meta?.brand),
        imagesCount: images.length,
        price: meta?.price !== null && meta?.price !== undefined,
        productId: Boolean(meta?.productId),
        description: Boolean(meta?.description),
        category: Boolean(meta?.category),
        missingFields: [
          !meta?.brand ? 'Brand' : '',
          images.length === 0 ? 'Product Image' : '',
          !meta?.price ? 'Price' : '',
          !meta?.productId ? 'Product ID / SKU' : '',
          !meta?.description ? 'Description' : '',
          'Release year',
          'Series',
          'Collector number',
          'Scale',
        ].filter(Boolean),
      };

      const itemData: EnrichedItemData = {
        name: productName,
        brand: meta?.brand || '', // NEVER use domain as brand
        series: '',
        releaseYear: meta?.year || null,
        modelNumber: meta?.productId || '',
        collectorNumber: '',
        category: meta?.category || 'Collectible',
        description: meta?.description || '', // NEVER fabricate description
        scale: '',
        color: [],
        material: [],
        manufacturer: meta?.brand || '',
        productId: meta?.productId || '',
        sourceUrl: trimmed,
        images: images,
        tags: [meta?.brand, 'URL Import'].filter(Boolean) as string[],
        customMetadata: {
          importSource: 'Web URL Import',
          sourceDomain: domain,
          ...(meta?.productId ? { productId: meta.productId } : {}),
          ...(meta?.sku ? { sku: meta.sku } : {}),
        },
        ownership: {
          status: 'owned',
          condition: 'mint',
          duplicateCount: 1,
          estimatedValue: meta?.price || 0,
          purchase: {
            price: meta?.price || null,
            currency: meta?.currency || 'USD',
            seller: domain,
            marketplace: domain,
          }
        },
      };

      return {
        success: true,
        provider: `Web Page (${domain})`,
        sourceUrl: trimmed,
        data: itemData,
        extractedReport: report,
        rawSummary: `Extracted ${images.length} image(s)${meta?.price ? `, Price: ${meta.currency || ''} ${meta.price}` : ''}`,
        confidence: meta?.jsonLdFound ? 0.95 : (meta?.ogFound ? 0.8 : 0.5),
      };
    } catch (err) {
      console.warn('Generic web import error:', err);
      return null;
    }
  },

  async search(_query: string): Promise<EnrichmentMatch[]> {
    return [];
  },

  async getDetails(matchOrId: string | EnrichmentMatch): Promise<EnrichmentResult | null> {
    const url = typeof matchOrId === 'string' ? matchOrId : matchOrId.url;
    return genericWebProvider.importFromUrl!(url);
  },
};

// ──────────────────────────────────────────────
// Helpers for Parsing Structured Product Metadata
// ──────────────────────────────────────────────

interface ParsedProductData {
  title?: string;
  brand?: string;
  description?: string;
  images: string[];
  price?: number | null;
  currency?: string;
  productId?: string;
  sku?: string;
  category?: string;
  year?: number | null;
  jsonLdFound?: boolean;
  ogFound?: boolean;
}

function parseProductMetadataFromHtml(html: string, pageUrl: string): ParsedProductData {
  const result: ParsedProductData = {
    images: [],
    price: null,
  };

  const imageSet = new Set<string>();

  // ── 1. Priority: JSON-LD Product Structured Data ──
  try {
    const jsonLdMatches = html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      if (!match[1]) continue;
      try {
        let parsed = JSON.parse(match[1].trim());
        // Handle @graph array
        if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          parsed = parsed['@graph'].find((item: any) => isProductType(item['@type'])) || parsed;
        } else if (Array.isArray(parsed)) {
          parsed = parsed.find((item: any) => isProductType(item['@type'])) || parsed[0];
        }

        if (isProductType(parsed?.['@type'])) {
          result.jsonLdFound = true;
          if (parsed.name && !result.title) result.title = decodeHtmlEntities(parsed.name);
          
          // Brand
          if (parsed.brand) {
            const b = typeof parsed.brand === 'object' ? parsed.brand.name : parsed.brand;
            if (b && typeof b === 'string') result.brand = decodeHtmlEntities(b);
          }

          // Description
          if (parsed.description && !result.description) {
            result.description = decodeHtmlEntities(stripHtml(parsed.description));
          }

          // Images
          if (parsed.image) {
            const imgArr = Array.isArray(parsed.image) ? parsed.image : [parsed.image];
            for (const img of imgArr) {
              const url = typeof img === 'object' ? (img.url || img.contentUrl) : img;
              if (url && typeof url === 'string' && isValidImageUrl(url)) {
                imageSet.add(resolveAbsoluteUrl(url, pageUrl));
              }
            }
          }

          // Price & Currency from Offers
          const offers = Array.isArray(parsed.offers) ? parsed.offers[0] : parsed.offers;
          if (offers) {
            const p = parseFloat(offers.price || offers.lowPrice);
            if (!isNaN(p) && p > 0) result.price = p;
            if (offers.priceCurrency) result.currency = offers.priceCurrency;
          }

          // Product ID / SKU / GTIN
          if (parsed.sku) result.sku = parsed.sku;
          if (parsed.gtin13 || parsed.gtin || parsed.productID) {
            result.productId = parsed.gtin13 || parsed.gtin || parsed.productID;
          }

          // Category
          if (parsed.category) result.category = parsed.category;
        }
      } catch {
        // Ignore invalid JSON block
      }
    }
  } catch {
    // Ignore JSON-LD parse errors
  }

  // ── 2. OpenGraph & Meta Tags ──
  try {
    const ogTitle = extractMetaContent(html, ['og:title', 'twitter:title']);
    if (ogTitle && !result.title) {
      result.title = decodeHtmlEntities(ogTitle);
      result.ogFound = true;
    }

    const ogBrand = extractMetaContent(html, ['og:brand', 'product:brand', 'brand']);
    if (ogBrand && !result.brand) {
      result.brand = decodeHtmlEntities(ogBrand);
    }

    const ogDesc = extractMetaContent(html, ['og:description', 'twitter:description', 'description']);
    if (ogDesc && !result.description) {
      result.description = decodeHtmlEntities(stripHtml(ogDesc));
    }

    // OpenGraph Images
    const ogImages = extractAllMetaContents(html, ['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image']);
    for (const img of ogImages) {
      if (isValidImageUrl(img)) {
        imageSet.add(resolveAbsoluteUrl(img, pageUrl));
      }
    }

    // OpenGraph Prices
    if (!result.price) {
      const ogPrice = extractMetaContent(html, ['product:price:amount', 'price', 'og:price:amount']);
      if (ogPrice) {
        const p = parseFloat(ogPrice.replace(/[^0-9.]/g, ''));
        if (!isNaN(p) && p > 0) result.price = p;
      }
    }
    if (!result.currency) {
      const ogCurrency = extractMetaContent(html, ['product:price:currency', 'og:price:currency', 'priceCurrency']);
      if (ogCurrency) result.currency = ogCurrency;
    }
  } catch {
    // Ignore meta errors
  }

  // ── 3. HTML Standard <title> Fallback ──
  if (!result.title) {
    const htmlTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    if (htmlTitle) {
      result.title = decodeHtmlEntities(htmlTitle);
    }
  }

  result.images = Array.from(imageSet);
  return result;
}

function isProductType(type: any): boolean {
  if (!type) return false;
  if (typeof type === 'string') {
    return type === 'Product' || type === 'IndividualProduct' || type.includes('Product');
  }
  if (Array.isArray(type)) {
    return type.some(t => isProductType(t));
  }
  return false;
}

function extractMetaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    // property="..." content="..."
    const propMatch = html.match(new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["']`, 'i'));
    if (propMatch && propMatch[1]) return propMatch[1];

    // name="..." content="..."
    const nameMatch = html.match(new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, 'i'));
    if (nameMatch && nameMatch[1]) return nameMatch[1];
  }
  return null;
}

function extractAllMetaContents(html: string, names: string[]): string[] {
  const values: string[] = [];
  for (const name of names) {
    const regex = new RegExp(`<meta\\s+[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'gi');
    const matches = html.matchAll(regex);
    for (const m of matches) {
      if (m[1]) values.push(m[1]);
    }
  }
  return values;
}

function cleanProductTitle(rawTitle: string, _domain: string): string {
  let cleaned = rawTitle;
  const brandSuffixes = [
    /\|\s*flipkart\.com/i,
    /-\s*buy\s+online\s+at\s+flipkart\.com/i,
    /\|\s*firstcry\.com/i,
    /\|\s*amazon\.[a-z.]+/i,
    /\|\s*myntra/i,
    /\|\s*walmart/i,
    /\|\s*ebay/i,
    /\|\s*target/i,
    /-\s*buy\s+at\s+.*$/i,
  ];

  for (const suffix of brandSuffixes) {
    cleaned = cleaned.replace(suffix, '');
  }

  // Remove common marketing fluff
  cleaned = cleaned.replace(/^Buy\s+/i, '').replace(/:\s*Buy\s+.*$/i, '');

  return cleaned.replace(/\s+/g, ' ').trim();
}

function extractCleanSlug(urlObj: URL): string | null {
  const parts = urlObj.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  // Filter out system segments (/p/, /dp/, /itm/, /product/, etc.)
  const candidate = parts.find(p => p.length > 5 && !/^(p|dp|itm|gp|product|products|item|items)$/i.test(p));
  if (!candidate) return null;

  const cleaned = decodeURIComponent(candidate)
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[-_+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Ensure it's not purely a numeric ID or junk
  if (cleaned.length > 3 && !/^[0-9a-f]{16,}$/i.test(cleaned) && !/^\d+$/.test(cleaned)) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return null;
}

function resolveAbsoluteUrl(url: string, base: string): string {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  // Filter out tiny icons, spacers, tracking pixels, logos
  if (lower.includes('tracking') || lower.includes('pixel') || lower.includes('spacer') || lower.includes('favicon')) {
    return false;
  }
  return lower.startsWith('http://') || lower.startsWith('https://');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '').trim();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

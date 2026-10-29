// ──────────────────────────────────────────────
// Collectible Data Enrichment Service
// Multi-provider extensible architecture (Fandom, Amazon, Generic Web)
// ──────────────────────────────────────────────

import type {
  EnrichmentProvider,
  EnrichmentMatch,
  EnrichmentResult,
} from './types.ts';
import { hotwheelsFandomProvider } from './providers/hotwheelsFandomProvider.ts';
import { amazonProvider } from './providers/amazonProvider.ts';
import { genericWebProvider } from './providers/genericWebProvider.ts';
import { mockScraper } from '../mockScraper.ts';

class EnrichmentService {
  private providers: Map<string, EnrichmentProvider> = new Map();

  constructor() {
    this.registerProvider(hotwheelsFandomProvider);
    this.registerProvider(amazonProvider);
    this.registerProvider(genericWebProvider);
  }

  /**
   * Register a new enrichment provider (e.g. for future Pokemon, Coin, LEGO, marketplace providers)
   */
  registerProvider(provider: EnrichmentProvider) {
    this.providers.set(provider.id, provider);
  }

  /**
   * Get appropriate provider for a given collectible type
   */
  getProviderForType(collectibleType = 'Hot Wheels'): EnrichmentProvider {
    const normalized = collectibleType.toLowerCase().replace(/[\s-_]/g, '');

    for (const provider of this.providers.values()) {
      const match = provider.supportedTypes.some(
        t => t === '*' || t.toLowerCase().replace(/[\s-_]/g, '') === normalized
      );
      if (match && provider.id === 'hotwheels_fandom') return provider;
    }

    return hotwheelsFandomProvider;
  }

  /**
   * Universal Product / Item Import from URL
   * Selects provider based on domain/URL patterns (Amazon, Fandom Wiki, or Generic Web)
   */
  async importFromUrl(url: string): Promise<EnrichmentResult | null> {
    const trimmed = url.trim();
    if (!trimmed) return null;

    try {
      // 1. Check Amazon Provider
      if (amazonProvider.canHandleUrl && amazonProvider.canHandleUrl(trimmed)) {
        return await amazonProvider.importFromUrl!(trimmed);
      }

      // 2. Check Fandom Wiki URL
      if (trimmed.includes('hotwheels.fandom.com/wiki/')) {
        const titleMatch = trimmed.match(/hotwheels\.fandom\.com\/wiki\/([^?#]+)/i);
        if (titleMatch && titleMatch[1]) {
          const rawTitle = decodeURIComponent(titleMatch[1].replace(/_/g, ' '));
          return await hotwheelsFandomProvider.getDetails(rawTitle);
        }
      }

      // 3. Fallback to Generic Web OpenGraph / Metadata Provider
      if (genericWebProvider.canHandleUrl && genericWebProvider.canHandleUrl(trimmed)) {
        return await genericWebProvider.importFromUrl!(trimmed);
      }
    } catch (err) {
      console.warn('URL Import execution error:', err);
    }

    return null;
  }

  /**
   * Search external data source for a given query (casting name, model, or barcode)
   */
  async search(query: string, collectibleType = 'Hot Wheels'): Promise<EnrichmentMatch[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // If query is an URL, treat search as URL match
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const urlResult = await this.importFromUrl(trimmed);
      if (urlResult) {
        return [{
          id: trimmed,
          title: urlResult.data.name,
          url: trimmed,
          description: urlResult.data.description,
          thumbnailUrl: urlResult.data.images?.[0]?.thumbnail,
          provider: urlResult.provider,
        }];
      }
    }

    const provider = this.getProviderForType(collectibleType);

    try {
      // 1. Query the live provider (Fandom Wiki)
      const liveMatches = await provider.search(trimmed);
      if (liveMatches.length > 0) {
        return liveMatches;
      }
    } catch (err) {
      console.warn(`Live search failed for provider ${provider.name}:`, err);
    }

    // 2. Fallback: check curated preset database (handles offline / specific demo barcodes)
    return this.getFallbackMatches(trimmed);
  }

  /**
   * Fetch full enriched details for a chosen match
   */
  async getDetails(
    matchOrTitle: string | EnrichmentMatch,
    collectibleType = 'Hot Wheels',
  ): Promise<EnrichmentResult | null> {
    // If it's a URL match
    const urlStr = typeof matchOrTitle === 'object' ? matchOrTitle.url : (matchOrTitle.startsWith('http') ? matchOrTitle : '');
    if (urlStr) {
      const res = await this.importFromUrl(urlStr);
      if (res) return res;
    }

    const provider = this.getProviderForType(collectibleType);

    try {
      // 1. Fetch live details from provider
      const result = await provider.getDetails(matchOrTitle);
      if (result) {
        return result;
      }
    } catch (err) {
      console.warn(`Failed to fetch live details via ${provider.name}:`, err);
    }

    // 2. Fallback to curated preset database
    const query = typeof matchOrTitle === 'string' ? matchOrTitle : matchOrTitle.title;
    return this.getFallbackDetails(query);
  }

  /**
   * Internal Fallback Helpers
   */
  private getFallbackMatches(query: string): EnrichmentMatch[] {
    const presets = [
      { code: '074299057854', title: 'Datsun Bluebird 510 Wagon' },
      { code: '887961803748', title: 'Porsche 911 Turbo (930)' },
      { code: '12345', title: 'Nissan Skyline GT-R (R34)' },
      { code: '22222', title: 'Bugatti Chiron' },
      { code: '33333', title: 'Lamborghini Countach LP500' },
    ];

    const q = query.toLowerCase();
    const matched = presets.filter(p => p.code.includes(q) || p.title.toLowerCase().includes(q));

    return matched.map(m => ({
      id: m.code,
      title: m.title,
      url: `https://hotwheels.fandom.com/wiki/${encodeURIComponent(m.title.replace(/\s+/g, '_'))}`,
      provider: 'Curated Reference Database',
    }));
  }

  private async getFallbackDetails(query: string): Promise<EnrichmentResult | null> {
    try {
      const scraped = await mockScraper.scrapeItem(query);
      if (scraped?.data) {
        return {
          success: true,
          provider: 'Curated Hot Wheels Database',
          sourceUrl: scraped.sourceUrl,
          data: {
            name: scraped.data.name,
            brand: scraped.data.brand || 'Hot Wheels',
            series: scraped.data.series || 'Boulevard',
            releaseYear: scraped.data.releaseYear,
            modelNumber: scraped.data.modelNumber,
            collectorNumber: scraped.data.collectorNumber,
            category: scraped.data.category,
            description: scraped.data.description,
            scale: scraped.data.scale || '1:64',
            color: scraped.data.color,
            material: scraped.data.material,
            manufacturer: 'Mattel',
            barcode: scraped.data.barcode || query,
            images: scraped.data.images,
            tags: scraped.data.tags,
            customMetadata: scraped.data.customMetadata,
            ownership: {
              status: scraped.data.ownership?.status,
              condition: scraped.data.ownership?.condition,
              duplicateCount: 1,
              estimatedValue: scraped.data.ownership?.estimatedValue || 0,
            },
          },
          confidence: 1,
        };
      }
    } catch {
      // Ignore
    }
    return null;
  }
}

export const enrichmentService = new EnrichmentService();

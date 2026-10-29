import type { CreateItemDTO } from '@collectorhub/shared-types';

export interface ScrapedResult {
  data: CreateItemDTO & { images: { url: string; thumbnail: string; caption: string; isPrimary: boolean; uploadedAt: string }[] };
  sourceUrl: string;
  provider: string;
}

export const PRESET_COLLECTIBLES: Record<string, ScrapedResult> = {
  // Barcode 074299057854 - Datsun 510
  '074299057854': {
    provider: 'Hot Wheels Wiki Scraper',
    sourceUrl: 'https://hotwheels.fandom.com/wiki/Datsun_Bluebird_510_Wagon',
    data: {
      name: 'Datsun Bluebird 510 Wagon',
      brand: 'Hot Wheels',
      series: 'Boulevard',
      releaseYear: 2023,
      modelNumber: 'HKF15',
      collectorNumber: '78',
      category: 'Wagon',
      description: 'Highly detailed classic Datsun 510 wagon with yellow and blue stripe deco and Real Riders tires.',
      scale: '1:64',
      color: ['Yellow', 'Blue'],
      material: ['Metal', 'Metal'],
      manufacturer: 'Mattel',
      barcode: '074299057854',
      tags: ['Datsun', 'Boulevard', 'Classic', 'Premium'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?q=80&w=600&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?q=80&w=200&auto=format&fit=crop',
          caption: 'Datsun 510 Front View',
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      customMetadata: {
        collectorNumber: 78,
        wheelType: 'Real Riders',
      },
      ownership: {
        status: 'owned',
        condition: 'mint',
        duplicateCount: 1,
        acquiredDate: new Date().toISOString().split('T')[0] ?? null,
        estimatedValue: 35.00,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
        purchase: {
          price: 6.99,
          currency: 'USD',
          date: new Date().toISOString().split('T')[0] ?? null,
          seller: 'Target',
          marketplace: 'Retail Store',
          receiptImage: null,
        }
      }
    }
  },
  // Barcode 887961803748 - Porsche 911
  '887961803748': {
    provider: 'Hot Wheels Wiki Scraper',
    sourceUrl: 'https://hotwheels.fandom.com/wiki/Porsche_911_Turbo',
    data: {
      name: 'Porsche 911 Turbo (930)',
      brand: 'Hot Wheels',
      series: 'Boulevard',
      releaseYear: 2024,
      modelNumber: 'HRT65',
      collectorNumber: '96',
      category: 'Sports',
      description: 'Iconic classic Porsche 911 Turbo 930 finished in Oak Green Metallic with custom Fuchs wheels.',
      scale: '1:64',
      color: ['Green'],
      material: ['Metal', 'Metal'],
      manufacturer: 'Mattel',
      barcode: '887961803748',
      tags: ['Porsche', 'Boulevard', 'Supercars', 'Premium'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=600&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=200&auto=format&fit=crop',
          caption: 'Oak Green Porsche 911',
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      customMetadata: {
        collectorNumber: 96,
        wheelType: 'Real Riders',
      },
      ownership: {
        status: 'owned',
        condition: 'mint',
        duplicateCount: 1,
        acquiredDate: new Date().toISOString().split('T')[0] ?? null,
        estimatedValue: 45.00,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
        purchase: {
          price: 6.99,
          currency: 'USD',
          date: new Date().toISOString().split('T')[0] ?? null,
          seller: 'Walmart',
          marketplace: 'Retail Store',
          receiptImage: null,
        }
      }
    }
  },
  // Barcode 12345 - Skyline
  '12345': {
    provider: 'Hot Wheels Wiki Scraper',
    sourceUrl: 'https://hotwheels.fandom.com/wiki/Nissan_Skyline_GT-R_(R34)',
    data: {
      name: 'Nissan Skyline GT-R (R34)',
      brand: 'Hot Wheels',
      series: 'Boulevard',
      releaseYear: 2020,
      modelNumber: 'GJP84',
      collectorNumber: '11',
      category: 'Sports',
      description: 'Stunning R34 GT-R finished in Bayside Blue with silver Advan racing wheels and full tampos.',
      scale: '1:64',
      color: ['Blue'],
      material: ['Metal', 'Metal'],
      manufacturer: 'Mattel',
      barcode: '12345',
      tags: ['Nissan', 'Skyline', 'JDM', 'Premium'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1605558202076-168223c98393?q=80&w=600&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1605558202076-168223c98393?q=80&w=200&auto=format&fit=crop',
          caption: 'Bayside Blue Skyline R34',
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      customMetadata: {
        collectorNumber: 11,
        wheelType: 'Real Riders',
      },
      ownership: {
        status: 'owned',
        condition: 'mint',
        duplicateCount: 1,
        acquiredDate: new Date().toISOString().split('T')[0] ?? null,
        estimatedValue: 45.00,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
        purchase: {
          price: 5.49,
          currency: 'USD',
          date: new Date().toISOString().split('T')[0] ?? null,
          seller: 'Target',
          marketplace: 'Retail Store',
          receiptImage: null,
        }
      }
    }
  },
  // Barcode 99999 - Corvette
  '99999': {
    provider: 'Hot Wheels Wiki Scraper',
    sourceUrl: 'https://hotwheels.fandom.com/wiki/Corvette_C8.R',
    data: {
      name: 'Corvette C8.R',
      brand: 'Hot Wheels',
      series: 'Boulevard',
      releaseYear: 2021,
      modelNumber: 'GRM17',
      collectorNumber: '28',
      category: 'Racing',
      description: 'Stunning yellow GT racing Corvette C8.R with Michelin graphics and race wheels.',
      scale: '1:64',
      color: ['Yellow'],
      material: ['Metal', 'Metal'],
      manufacturer: 'Mattel',
      barcode: '99999',
      tags: ['Corvette', 'Racing', 'Muscle', 'Premium'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=200&auto=format&fit=crop',
          caption: 'Yellow Racing Corvette',
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      customMetadata: {
        collectorNumber: 28,
        wheelType: 'Real Riders',
      },
      ownership: {
        status: 'owned',
        condition: 'mint',
        duplicateCount: 1,
        acquiredDate: new Date().toISOString().split('T')[0] ?? null,
        estimatedValue: 8.00,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
        purchase: {
          price: 5.49,
          currency: 'USD',
          date: new Date().toISOString().split('T')[0] ?? null,
          seller: 'Walmart',
          marketplace: 'Retail Store',
          receiptImage: null,
        }
      }
    }
  },
  // Barcode 11111 - Shelby Cobra
  '11111': {
    provider: 'Hot Wheels Wiki Scraper',
    sourceUrl: 'https://hotwheels.fandom.com/wiki/Shelby_Cobra_427_S/C',
    data: {
      name: 'Shelby Cobra 427 S/C',
      brand: 'Hot Wheels',
      series: 'Then and Now',
      releaseYear: 2021,
      modelNumber: 'GHG25',
      collectorNumber: '112',
      category: 'Classic',
      description: 'Classic Shelby Cobra finished in race red with dual white racing stripes.',
      scale: '1:64',
      color: ['Red', 'White'],
      material: ['Metal', 'Plastic'],
      manufacturer: 'Mattel',
      barcode: '11111',
      tags: ['Shelby', 'Cobra', 'Classic', 'Muscle'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?q=80&w=600&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?q=80&w=200&auto=format&fit=crop',
          caption: 'Classic Red Shelby Cobra',
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      ownership: {
        status: 'owned',
        condition: 'near-mint',
        duplicateCount: 1,
        acquiredDate: new Date().toISOString().split('T')[0] ?? null,
        estimatedValue: 12.00,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
        purchase: {
          price: 1.25,
          currency: 'USD',
          date: new Date().toISOString().split('T')[0] ?? null,
          seller: 'Target',
          marketplace: 'Retail Store',
          receiptImage: null,
        }
      }
    }
  },
  // Barcode 22222 - Bugatti Chiron
  '22222': {
    provider: 'Hot Wheels Wiki Scraper',
    sourceUrl: 'https://hotwheels.fandom.com/wiki/Bugatti_Chiron',
    data: {
      name: 'Bugatti Chiron',
      brand: 'Hot Wheels',
      series: 'Exotics',
      releaseYear: 2022,
      modelNumber: 'HCX39',
      collectorNumber: '224',
      category: 'Hypercar',
      description: 'French hypercar finished in dual Bayside Blue and Carbon colorway with black mesh rims.',
      scale: '1:64',
      color: ['Blue', 'Black'],
      material: ['Metal', 'Plastic'],
      manufacturer: 'Mattel',
      barcode: '22222',
      tags: ['Bugatti', 'Chiron', 'Hypercar', 'Exotics'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=200&auto=format&fit=crop',
          caption: 'Bugatti Chiron Bayside Blue',
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      ownership: {
        status: 'owned',
        condition: 'mint',
        duplicateCount: 1,
        acquiredDate: new Date().toISOString().split('T')[0] ?? null,
        estimatedValue: 15.00,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
        purchase: {
          price: 1.25,
          currency: 'USD',
          date: new Date().toISOString().split('T')[0] ?? null,
          seller: 'Kroger',
          marketplace: 'Grocery Store',
          receiptImage: null,
        }
      }
    }
  },
  // Barcode 33333 - Lamborghini Countach
  '33333': {
    provider: 'Hot Wheels Wiki Scraper',
    sourceUrl: 'https://hotwheels.fandom.com/wiki/Lamborghini_Countach_LPI_800-4',
    data: {
      name: 'Lamborghini Countach LPI 800-4',
      brand: 'Hot Wheels',
      series: 'Factory Fresh',
      releaseYear: 2023,
      modelNumber: 'HKG42',
      collectorNumber: '154',
      category: 'Sports',
      description: 'Modernized Countach sports car finished in Pearl White with gold wheels.',
      scale: '1:64',
      color: ['White'],
      material: ['Metal', 'Plastic'],
      manufacturer: 'Mattel',
      barcode: '33333',
      tags: ['Lamborghini', 'Countach', 'Supercar', 'Exotics'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=600&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=200&auto=format&fit=crop',
          caption: 'Lamborghini Countach LPI 800-4 White',
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      ownership: {
        status: 'owned',
        condition: 'mint',
        duplicateCount: 1,
        acquiredDate: new Date().toISOString().split('T')[0] ?? null,
        estimatedValue: 14.00,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
        purchase: {
          price: 1.25,
          currency: 'USD',
          date: new Date().toISOString().split('T')[0] ?? null,
          seller: 'Walmart',
          marketplace: 'Retail Store',
          receiptImage: null,
        }
      }
    }
  }
};

const RANDOM_UNSPLASH_CAR_IMAGES = [
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542282088-fe8426682b8f?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1616422285623-13ff0162193c?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?q=80&w=600&auto=format&fit=crop',
];

const COLORS = ['Red', 'Blue', 'Yellow', 'Black', 'White', 'Silver', 'Green', 'Orange'];
const BRANDS = ['Hot Wheels', 'Matchbox', 'Majorette', 'Tomy Tomica', 'Greenlight'];
const SERIES = ['Factory Fresh', 'Boulevard', 'Car Culture', 'Exotics', 'Speed Graphics', 'Retro Racers'];
const CATEGORY = ['Sports Car', 'Supercar', 'Racing', 'Wagon', 'Offroad', 'Muscle Car', 'Concept'];

// Synthesize dynamic scraped data if no exact barcode matches
function generateDynamicMockCollectible(queryOrBarcode: string): ScrapedResult {
  // Clean query
  const query = queryOrBarcode.trim();
  const isBarcode = /^\d+$/.test(query);

  let carName = isBarcode ? 'Classic Muscle Car' : query;
  // Format title case
  carName = carName.replace(/\b\w/g, c => c.toUpperCase());

  // Determine brand based on query or pick random
  let brand = 'Hot Wheels';
  for (const b of BRANDS) {
    if (query.toLowerCase().includes(b.toLowerCase())) {
      brand = b;
      break;
    }
  }

  // Pick stable random indices based on string hashing
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = query.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const releaseYear = 2018 + (hash % 8); // 2018 - 2025
  const colorName = COLORS[hash % COLORS.length]!;
  const seriesName = SERIES[hash % SERIES.length]!;
  const categoryName = CATEGORY[hash % CATEGORY.length]!;
  const imageUrl = RANDOM_UNSPLASH_CAR_IMAGES[hash % RANDOM_UNSPLASH_CAR_IMAGES.length]!;
  const estValue = 5.00 + (hash % 45); // $5 - $50
  const modelNo = 'H' + (hash % 900 + 100);
  const collectorNo = String(hash % 250 + 1);

  return {
    provider: 'Dynamic Catalog Engine',
    sourceUrl: `https://collectors.wiki/wiki/${encodeURIComponent(carName.replace(/\s+/g, '_'))}`,
    data: {
      name: carName,
      brand,
      series: seriesName,
      releaseYear,
      modelNumber: modelNo,
      collectorNumber: collectorNo,
      category: categoryName,
      description: `A beautiful representation of the ${carName}. This scale model features realistic design details, premium finish, and custom wheels.`,
      scale: '1:64',
      color: [colorName],
      material: ['Metal', 'Plastic'],
      manufacturer: brand === 'Hot Wheels' ? 'Mattel' : 'Hasbro/Takara Tomy',
      barcode: isBarcode ? query : String(hash % 9000000000 + 1000000000),
      tags: [brand, colorName, seriesName, 'Scale 1:64'],
      images: [
        {
          url: imageUrl,
          thumbnail: imageUrl,
          caption: `${colorName} ${carName} view`,
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      ownership: {
        status: 'owned',
        condition: 'mint',
        duplicateCount: 1,
        acquiredDate: new Date().toISOString().split('T')[0] ?? null,
        estimatedValue: estValue,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
        purchase: {
          price: 1.49,
          currency: 'USD',
          date: new Date().toISOString().split('T')[0] ?? null,
          seller: 'Local Hobby Shop',
          marketplace: 'Local Shop',
          receiptImage: null,
        }
      }
    }
  };
}

// Scraper simulation service
export const mockScraper = {
  /**
   * Search database or barcode for details
   */
  async scrapeItem(queryOrBarcode: string, onProgress?: (msg: string) => void): Promise<ScrapedResult> {
    const triggerProgress = (msg: string) => {
      if (onProgress) onProgress(msg);
    };

    // Step 1: Connecting
    triggerProgress('Connecting to Collector Wiki server...');
    await new Promise(r => setTimeout(r, 400));

    // Step 2: Querying
    triggerProgress(`Searching catalog archives for "${queryOrBarcode}"...`);
    await new Promise(r => setTimeout(r, 600));

    // Step 3: Parsing details
    triggerProgress('Extracting specifications and wheel materials...');
    await new Promise(r => setTimeout(r, 300));

    // Step 4: Loading image
    triggerProgress('Fetching high-resolution toy photography links...');
    await new Promise(r => setTimeout(r, 200));

    // Check presets first
    const key = queryOrBarcode.trim();
    if (PRESET_COLLECTIBLES[key]) {
      triggerProgress('Item successfully resolved from Premium Hot Wheels Database!');
      return PRESET_COLLECTIBLES[key]!;
    }

    // Fuzzy search in presets
    for (const presetKey of Object.keys(PRESET_COLLECTIBLES)) {
      const preset = PRESET_COLLECTIBLES[presetKey]!;
      if (preset.data.name.toLowerCase().includes(key.toLowerCase()) || 
          preset.data.brand?.toLowerCase().includes(key.toLowerCase()) ||
          preset.data.series?.toLowerCase().includes(key.toLowerCase())) {
        triggerProgress(`Matched keyword to preset: ${preset.data.name}`);
        return preset;
      }
    }

    // Dynamic generation fallback
    triggerProgress('Catalog match not found. Synthesizing item specifications using AI collector models...');
    const result = generateDynamicMockCollectible(queryOrBarcode);
    await new Promise(r => setTimeout(r, 200));
    triggerProgress('Item details generated and pre-filled!');
    return result;
  }
};

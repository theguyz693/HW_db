import type { Collection, Item, User, AuthUser } from '@collectorhub/shared-types';

// Demo cars mapped to real mainline releases (Hot Wheels Wiki catalogue), so the
// garage can show each car's actual card photo, looked up by toy code.
const WIKI = 'https://static.wikia.nocookie.net/hotwheels/images/';
const REAL_DEMO_RELEASES: Record<string, Partial<Item>> = {
  'item-datsun-510': {
    name: 'Datsun Bluebird Wagon (510)', series: 'HW Speed Graphics', releaseYear: 2020, modelNumber: 'GHC90', collectorNumber: '146',
    color: [], // the seed's colours belonged to the old fictional cars
    images: [{ url: `${WIKI}6/6c/GHC90-01.jpg/revision/latest/scale-to-width-down/480?cb=20200408103440&v=2`, thumbnail: `${WIKI}6/6c/GHC90-01.jpg/revision/latest/scale-to-width-down/480?cb=20200408103440&v=2`, caption: 'Datsun Bluebird Wagon (510)', isPrimary: true, uploadedAt: '2020-04-08T00:00:00.000Z' }],
  },
  'item-porsche-911': {
    name: 'Porsche 911 Turbo 3.6 (964)', series: 'Tooned', releaseYear: 2024, modelNumber: 'HTB41', collectorNumber: '199',
    color: [], // the seed's colours belonged to the old fictional cars
    images: [{ url: `${WIKI}7/79/1993PorscheTurbo.jpg/revision/latest/scale-to-width-down/480?cb=20240609124713&v=2`, thumbnail: `${WIKI}7/79/1993PorscheTurbo.jpg/revision/latest/scale-to-width-down/480?cb=20240609124713&v=2`, caption: 'Porsche 911 Turbo 3.6 (964)', isPrimary: true, uploadedAt: '2024-06-09T00:00:00.000Z' }],
  },
  'item-skyline-gtr': {
    name: 'Nissan Skyline GT-R (BNR34)', series: 'HW J-Imports', releaseYear: 2026, modelNumber: 'JJL88', collectorNumber: '199',
    color: [], // the seed's colours belonged to the old fictional cars
    images: [{ url: `${WIKI}1/18/2026BlackR34FrontDetail.jpg/revision/latest/scale-to-width-down/480?cb=20260811175118&v=2`, thumbnail: `${WIKI}1/18/2026BlackR34FrontDetail.jpg/revision/latest/scale-to-width-down/480?cb=20260811175118&v=2`, caption: 'Nissan Skyline GT-R (BNR34)', isPrimary: true, uploadedAt: '2026-08-11T00:00:00.000Z' }],
  },
  'item-corvette-c8': {
    name: 'Corvette C8.R', series: 'HW Race Day', releaseYear: 2021, modelNumber: 'GRX31', collectorNumber: '105',
    color: [], // the seed's colours belonged to the old fictional cars
    images: [{ url: `${WIKI}f/f4/2021NM15_%28Large%29.JPG/revision/latest/scale-to-width-down/480?cb=20210307034604&v=2`, thumbnail: `${WIKI}f/f4/2021NM15_%28Large%29.JPG/revision/latest/scale-to-width-down/480?cb=20210307034604&v=2`, caption: 'Corvette C8.R', isPrimary: true, uploadedAt: '2021-03-07T00:00:00.000Z' }],
  },
};

function applyRealDemoReleases(items: Item[]): Item[] {
  return items.map((it) => {
    const patch = REAL_DEMO_RELEASES[it._id];
    return patch ? { ...it, ...patch, dataSource: { ...it.dataSource, provider: 'Hot Wheels Wiki catalogue', sourceUrl: `https://hotwheels.fandom.com/wiki/List_of_${patch.releaseYear}_Hot_Wheels` } } : it;
  });
}

// Ten more real mainline releases (toy code, numbers, series and photo link come from
// the Hot Wheels Wiki catalogue) so the demo garage has enough to browse.
// No prices are invented: estimated value is left empty.
type DemoRow = [toy: string, col: string, name: string, series: string, seriesNumber: string, year: number, url: string, favourite: boolean, rating: number | null];
const EXTRA_DEMO: DemoRow[] = [
  ["HYW80", "27", "Twin Mill Gen-E", "HW Celebration Racers", "1/10", 2025, "https://static.wikia.nocookie.net/hotwheels/images/0/0a/GenE2025.jpeg/revision/latest/scale-to-width-down/480?cb=20250208034938&v=2", true, 5],
  ["HKH21", "60", "Bone Shaker", "HW Dream Garage", "3/5", 2023, "https://static.wikia.nocookie.net/hotwheels/images/7/72/HW-2023-060-1-HKxxx-Bone_Shaker.png/revision/latest/scale-to-width-down/480?cb=20221116111808&v=2", false, null],
  ["HKG87", "167", "'82 Toyota Supra", "HW: The '80s", "10/10", 2023, "https://static.wikia.nocookie.net/hotwheels/images/8/87/%2782ToyotaSupra.jpg/revision/latest/scale-to-width-down/480?cb=20230518114238&v=2", false, null],
  ["HKJ16", "96", "'90 Honda Civic EF", "HW J-Imports", "7/10", 2023, "https://static.wikia.nocookie.net/hotwheels/images/7/79/HW-2023-096-1-HKJ16-90_Honda_Civic_EF.png/revision/latest/scale-to-width-down/480?cb=20221201092455&v=2", false, null],
  ["HTC65", "191", "Nissan Skyline 2000GT-R LBWK", "Then and Now", "1/10", 2024, "https://static.wikia.nocookie.net/hotwheels/images/4/4c/2024_Nissan_Skyline_2000GT-R_LBWK.jpg/revision/latest/scale-to-width-down/480?cb=20250203020351&v=2", true, 5],
  ["HTC46", "170", "'95 Mazda RX-7", "HW J-Imports", "9/10", 2024, "https://static.wikia.nocookie.net/hotwheels/images/c/c5/MuRX-7.jpg/revision/latest/scale-to-width-down/480?cb=20240528123811&v=2", true, 4],
  ["HKG70", "250", "McLaren Solus GT", "HW Exotics", "10/10", 2023, "https://static.wikia.nocookie.net/hotwheels/images/8/88/McLarenSolusGT.jpg/revision/latest/scale-to-width-down/480?cb=20230830102218&v=2", false, null],
  ["HKH93", "163", "Lamborghini Sián FKP 37", "HW Exotics", "1/10", 2023, "https://static.wikia.nocookie.net/hotwheels/images/0/0a/HKH93-LOOSE.jpg/revision/latest/scale-to-width-down/480?cb=20230925203849&v=2", false, null],
  ["HKJ33", "49", "Kool Kombi", "Surf's Up", "2/5", 2023, "https://static.wikia.nocookie.net/hotwheels/images/0/0d/HW_Volkswagen_Kool_Kombi_%282023_-_HKJ33%29.jpg/revision/latest/scale-to-width-down/480?cb=20221021091011&v=2", true, 4],
  ["HTC68", "208", "Deora II", "Then and Now", "4/10", 2024, "https://static.wikia.nocookie.net/hotwheels/images/0/00/TekuDeoraII.jpeg/revision/latest/scale-to-width-down/480?cb=20240613151157&v=2", false, null],
];

function demoItem([toy, col, name, series, seriesNumber, year, url, favourite, rating]: DemoRow, collectionId: string, i: number): Item {
  const added = new Date(Date.now() - (i + 2) * 20 * 60 * 60 * 1000).toISOString();
  return {
    _id: `item-demo-${toy.toLowerCase()}`,
    userId: 'default-user-id',
    collectionId,
    name,
    brand: 'Hot Wheels',
    series,
    releaseYear: year,
    modelNumber: toy,
    collectorNumber: col,
    category: '',
    description: '',
    scale: '1:64',
    color: [],
    material: [],
    manufacturer: 'Mattel',
    barcode: '',
    qrCode: '',
    images: [{ url, thumbnail: url, caption: name, isPrimary: true, uploadedAt: added }],
    tags: ['Mainline'],
    customMetadata: { seriesNumber },
    ownership: {
      status: 'owned',
      condition: 'sealed',
      duplicateCount: 1,
      acquiredDate: added,
      purchase: { price: null, currency: 'USD', date: null, seller: '', marketplace: '', receiptImage: null },
      estimatedValue: null,
      valueCurrency: 'USD',
      valueLastUpdated: null,
    },
    location: { type: 'Display Case', name: '', position: '' },
    personal: {
      notes: '',
      isFavorite: favourite,
      isDisplayed: true,
      isGrail: false,
      isHolyGrail: false,
      isNeverSell: false,
      isPinned: false,
      rating,
      categories: [],
    },
    timeline: { dateAdded: added, lastViewed: null, timesViewed: 0, history: [{ action: 'Created', timestamp: added, details: {} }] },
    dataSource: {
      provider: 'Hot Wheels Wiki catalogue',
      sourceUrl: `https://hotwheels.fandom.com/wiki/List_of_${year}_Hot_Wheels`,
      lastSynced: added,
      confidence: 1,
    },
    isArchived: false,
    createdAt: added,
    updatedAt: added,
  };
}

const extraDemoItems = (collectionId: string) => EXTRA_DEMO.map((r, i) => demoItem(r, collectionId, i));

// Seed Initial Data Helper
function seedInitialData() {
  const defaultUser: User = {
    _id: 'default-user-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    email: 'collector@example.com',
    username: 'collector',
    displayName: 'Demo Collector',
    avatar: null,
    bio: 'Avid Hot Wheels and Lego enthusiast. Collecting the coolest models since 2018.',
    preferences: {
      theme: 'dark',
      defaultView: 'gallery',
      language: 'en',
      dashboardWidgets: [],
    },
    privacy: {
      profilePublic: true,
      collectionsPublicByDefault: false,
    },
    stats: {
      totalItems: 4,
      totalCollections: 1,
      totalValue: 125.00,
      memberSince: new Date().toISOString(),
    },
    role: 'user',
    isActive: true,
    lastLoginAt: new Date().toISOString(),
  };

  const defaultCollections: Collection[] = [
    {
      _id: 'coll-hw-boulevard',
      userId: 'default-user-id',
      name: 'Hot Wheels Boulevard',
      slug: 'hot-wheels-boulevard',
      description: 'Premium Hot Wheels cars released in the Boulevard series, featuring metal bodies and real riders tires.',
      coverImage: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?q=80&w=600&auto=format&fit=crop',
      icon: 'Library',
      color: 'violet',
      collectibleType: 'Hot Wheels',
      metadataSchema: [
        { fieldName: 'collectorNumber', fieldLabel: 'Boulevard Number', fieldType: 'number', required: true, options: [], group: 'details', sortOrder: 1 },
        { fieldName: 'wheelType', fieldLabel: 'Wheels', fieldType: 'select', required: false, options: ['Real Riders', 'Standard plastic', '5-spoke', 'Co-mold'], group: 'details', sortOrder: 2 },
      ],
      privacy: 'public',
      stats: {
        totalItems: 4,
        totalValue: 125.00,
        wishlistCount: 1,
        completionPercentage: 80,
      },
      sortOrder: 1,
      isPinned: true,
      isArchived: false,
      tags: ['Premium', 'Real Riders', 'Metal/Metal'],
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      updatedAt: new Date().toISOString(),
    }
  ];

  const defaultItems: Item[] = [
    {
      _id: 'item-datsun-510',
      userId: 'default-user-id',
      collectionId: 'coll-hw-boulevard',
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
      qrCode: '',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?q=80&w=600&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?q=80&w=200&auto=format&fit=crop',
          caption: 'Datsun 510 Front View',
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      tags: ['Datsun', 'Boulevard', 'Classic'],
      customMetadata: {
        collectorNumber: 78,
        wheelType: 'Real Riders',
      },
      ownership: {
        status: 'owned',
        condition: 'mint',
        duplicateCount: 1,
        acquiredDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        purchase: {
          price: 6.99,
          currency: 'USD',
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          seller: 'Target',
          marketplace: 'Retail Store',
          receiptImage: null,
        },
        estimatedValue: 35.00,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
      },
      location: {
        type: 'Display Case',
        name: 'Living Room Case 1',
        position: 'Row A, Slot 3',
      },
      personal: {
        notes: 'Found on the pegs at Target! Extremely lucky find.',
        isFavorite: true,
        isDisplayed: true,
        isGrail: true,
        isHolyGrail: false,
        isNeverSell: true,
        isPinned: false,
        rating: 5,
        categories: ['JDM', 'Wagons'],
      },
      timeline: {
        dateAdded: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        lastViewed: new Date().toISOString(),
        timesViewed: 12,
        history: [
          { action: 'Created', timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), details: {} }
        ],
      },
      dataSource: {
        provider: 'Hot Wheels Wiki Scraper',
        sourceUrl: 'https://hotwheels.fandom.com/wiki/Datsun_Bluebird_510',
        lastSynced: new Date().toISOString(),
        confidence: 0.98,
      },
      isArchived: false,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'item-porsche-911',
      userId: 'default-user-id',
      collectionId: 'coll-hw-boulevard',
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
      qrCode: '',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=600&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=200&auto=format&fit=crop',
          caption: 'Oak Green Porsche 911',
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      tags: ['Porsche', 'JDM-Classic-Alternative', 'Euro'],
      customMetadata: {
        collectorNumber: 96,
        wheelType: 'Real Riders',
      },
      ownership: {
        status: 'owned',
        condition: 'mint',
        duplicateCount: 1,
        acquiredDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        purchase: {
          price: 6.99,
          currency: 'USD',
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          seller: 'Walmart',
          marketplace: 'Retail Store',
          receiptImage: null,
        },
        estimatedValue: 45.00,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
      },
      location: {
        type: 'Display Shelf',
        name: 'Desk Tier 1',
        position: 'Slot 1',
      },
      personal: {
        notes: 'Oak green metallic finish is incredibly premium.',
        isFavorite: true,
        isDisplayed: true,
        isGrail: true,
        isHolyGrail: false,
        isNeverSell: false,
        isPinned: true,
        rating: 5,
        categories: ['Porsche', 'Supercars'],
      },
      timeline: {
        dateAdded: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastViewed: new Date().toISOString(),
        timesViewed: 24,
        history: [
          { action: 'Created', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), details: {} }
        ],
      },
      dataSource: {
        provider: 'Hot Wheels Wiki Scraper',
        sourceUrl: 'https://hotwheels.fandom.com/wiki/Porsche_911_Turbo',
        lastSynced: new Date().toISOString(),
        confidence: 0.95,
      },
      isArchived: false,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'item-skyline-gtr',
      userId: 'default-user-id',
      collectionId: 'coll-hw-boulevard',
      name: 'Nissan Skyline GT-R (R34)',
      brand: 'Hot Wheels',
      series: 'Boulevard',
      releaseYear: 2020,
      modelNumber: 'GJP84',
      collectorNumber: '11',
      category: 'Sports',
      description: 'Stunning R34 GT-R finished in Bayside Blue with silver Advan racing wheels and full headlight/taillight tampos.',
      scale: '1:64',
      color: ['Blue'],
      material: ['Metal', 'Metal'],
      manufacturer: 'Mattel',
      barcode: '12345',
      qrCode: '',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1605558202076-168223c98393?q=80&w=600&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1605558202076-168223c98393?q=80&w=200&auto=format&fit=crop',
          caption: 'Bayside Blue Skyline R34',
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      tags: ['Nissan', 'Skyline', 'JDM'],
      customMetadata: {
        collectorNumber: 11,
        wheelType: 'Real Riders',
      },
      ownership: {
        status: 'owned',
        condition: 'near-mint',
        duplicateCount: 1,
        acquiredDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        purchase: {
          price: 5.49,
          currency: 'USD',
          date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          seller: 'Kroger',
          marketplace: 'Grocery Store',
          receiptImage: null,
        },
        estimatedValue: 45.00,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
      },
      location: {
        type: 'Display Box',
        name: 'JDM Box',
        position: 'Row 1',
      },
      personal: {
        notes: 'Classic Boulevard release. Card is slightly creased but car is mint.',
        isFavorite: false,
        isDisplayed: true,
        isGrail: false,
        isHolyGrail: false,
        isNeverSell: false,
        isPinned: false,
        rating: 4,
        categories: ['JDM', 'Skyline'],
      },
      timeline: {
        dateAdded: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        lastViewed: new Date().toISOString(),
        timesViewed: 8,
        history: [
          { action: 'Created', timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), details: {} }
        ],
      },
      dataSource: {
        provider: 'Hot Wheels Wiki Scraper',
        sourceUrl: 'https://hotwheels.fandom.com/wiki/Nissan_Skyline_GT-R_(R34)',
        lastSynced: new Date().toISOString(),
        confidence: 0.99,
      },
      isArchived: false,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'item-corvette-c8',
      userId: 'default-user-id',
      collectionId: 'coll-hw-boulevard',
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
      qrCode: '',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=200&auto=format&fit=crop',
          caption: 'Yellow Racing Corvette',
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ],
      tags: ['Corvette', 'Racing', 'US-Muscle'],
      customMetadata: {
        collectorNumber: 28,
        wheelType: 'Real Riders',
      },
      ownership: {
        status: 'wishlist',
        condition: 'sealed',
        duplicateCount: 0,
        acquiredDate: null,
        purchase: {
          price: null,
          currency: 'USD',
          date: null,
          seller: '',
          marketplace: '',
          receiptImage: null,
        },
        estimatedValue: 8.00,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
      },
      location: {
        type: 'Wishlist',
        name: 'Peg Hunt List',
        position: 'Unacquired',
      },
      personal: {
        notes: 'Wishlist item! Need to find this to complete the set.',
        isFavorite: false,
        isDisplayed: false,
        isGrail: false,
        isHolyGrail: false,
        isNeverSell: false,
        isPinned: false,
        rating: 3,
        categories: ['Racing', 'American'],
      },
      timeline: {
        dateAdded: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        lastViewed: new Date().toISOString(),
        timesViewed: 3,
        history: [
          { action: 'Created', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), details: {} }
        ],
      },
      dataSource: {
        provider: 'Hot Wheels Wiki Scraper',
        sourceUrl: 'https://hotwheels.fandom.com/wiki/Corvette_C8.R',
        lastSynced: new Date().toISOString(),
        confidence: 0.95,
      },
      isArchived: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  localStorage.setItem('collectorhub_user', JSON.stringify(defaultUser));
  localStorage.setItem('collectorhub_collections', JSON.stringify(defaultCollections));
  localStorage.setItem('collectorhub_items', JSON.stringify([...applyRealDemoReleases(defaultItems), ...extraDemoItems('coll-hw-boulevard')]));
  localStorage.setItem('collectorhub_demo_extra_v1', '1');
  localStorage.setItem('collectorhub_demo_real_releases_v2', '1');
  localStorage.setItem('accessToken', 'mock-access-token');
  localStorage.setItem('refreshToken', 'mock-refresh-token');
}

// Ensure database is initialized
export function initMockDb() {
  if (!localStorage.getItem('collectorhub_collections')) {
    seedInitialData();
    return;
  }
  // One-time upgrade of demo data seeded before the real catalogue existed.
  if (!localStorage.getItem('collectorhub_demo_real_releases_v2')) {
    try {
      const items = JSON.parse(localStorage.getItem('collectorhub_items') || '[]') as Item[];
      localStorage.setItem('collectorhub_items', JSON.stringify(applyRealDemoReleases(items)));
    } catch {
      /* corrupt demo data — leave it */
    }
    localStorage.setItem('collectorhub_demo_real_releases_v2', '1');
  }
  // One-time: add the extra demo cars — only for the demo account, never real users' data.
  if (!localStorage.getItem('collectorhub_demo_extra_v1')) {
    try {
      const user = JSON.parse(localStorage.getItem('collectorhub_user') || 'null') as User | null;
      const collections = JSON.parse(localStorage.getItem('collectorhub_collections') || '[]') as Collection[];
      const target = collections.find((c) => c._id === 'coll-hw-boulevard') ?? collections[0];
      if (user?.email === 'collector@example.com' && target) {
        const items = JSON.parse(localStorage.getItem('collectorhub_items') || '[]') as Item[];
        const have = new Set(items.map((it) => it._id));
        const add = extraDemoItems(target._id).filter((it) => !have.has(it._id));
        localStorage.setItem('collectorhub_items', JSON.stringify([...items, ...add]));
      }
    } catch {
      /* corrupt demo data — leave it */
    }
    localStorage.setItem('collectorhub_demo_extra_v1', '1');
  }
}

// Achievements helper list
export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: string | null;
  icon: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export function getAchievements(items: Item[]): Achievement[] {
  const totalValue = items.reduce((acc, it) => acc + (it.ownership?.estimatedValue ?? 0), 0);
  const totalItems = items.filter(it => it.ownership?.status === 'owned').length;
  const wishlistCount = items.filter(it => it.ownership?.status === 'wishlist').length;
  const favoritesCount = items.filter(it => it.personal?.isFavorite).length;

  return [
    {
      id: 'first-pegs',
      title: 'Peg Hunter',
      description: 'Add your first collectible item to a collection.',
      unlockedAt: totalItems > 0 ? new Date().toISOString() : null,
      icon: 'Sparkles',
      rarity: 'Common',
    },
    {
      id: 'hoarder',
      title: 'Fleet Commander',
      description: 'Amass a total of 5 or more owned collectibles.',
      unlockedAt: totalItems >= 5 ? new Date().toISOString() : null,
      icon: 'Library',
      rarity: 'Common',
    },
    {
      id: 'gold-mine',
      title: 'Golden Garage',
      description: 'Unlock a total collection value of over $100.',
      unlockedAt: totalValue >= 100 ? new Date().toISOString() : null,
      icon: 'TrendingUp',
      rarity: 'Rare',
    },
    {
      id: 'dreamer',
      title: 'Big Dreamer',
      description: 'Add 3 or more items to your wishlist.',
      unlockedAt: wishlistCount >= 3 ? new Date().toISOString() : null,
      icon: 'Heart',
      rarity: 'Rare',
    },
    {
      id: 'super-fan',
      title: 'Grail Collector',
      description: 'Favorite 3 or more collectibles in your collection.',
      unlockedAt: favoritesCount >= 3 ? new Date().toISOString() : null,
      icon: 'Star',
      rarity: 'Epic',
    },
  ];
}

// Database Actions
export const mockDb = {
  // --- AUTH SERVICES ---
  getUser(): User | null {
    initMockDb();
    const userStr = localStorage.getItem('collectorhub_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  updateUserProfile(data: Partial<User>): User {
    initMockDb();
    const currentUser = this.getUser();
    if (!currentUser) throw new Error('Not logged in');

    const updatedUser = {
      ...currentUser,
      ...data,
      displayName: data.displayName ?? currentUser.displayName,
      bio: data.bio ?? currentUser.bio,
      avatar: data.avatar ?? currentUser.avatar,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('collectorhub_user', JSON.stringify(updatedUser));
    return updatedUser;
  },

  updatePreferences(theme?: 'light' | 'dark' | 'system', defaultView?: 'gallery' | 'compact' | 'shelf'): User {
    initMockDb();
    const currentUser = this.getUser();
    if (!currentUser) throw new Error('Not logged in');

    const updatedUser = {
      ...currentUser,
      preferences: {
        ...currentUser.preferences,
        theme: theme ?? currentUser.preferences.theme,
        defaultView: defaultView ?? currentUser.preferences.defaultView,
      },
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('collectorhub_user', JSON.stringify(updatedUser));
    return updatedUser;
  },

  login(email: string): AuthUser {
    initMockDb();
    const username = email.split('@')[0] || 'collector';
    const user: User = {
      _id: 'default-user-id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      email: email.toLowerCase(),
      username,
      displayName: username.charAt(0).toUpperCase() + username.slice(1) || 'Collector',
      avatar: null,
      bio: 'Collector of premium items.',
      preferences: { theme: 'dark', defaultView: 'gallery', language: 'en', dashboardWidgets: [] },
      privacy: { profilePublic: true, collectionsPublicByDefault: false },
      stats: { totalItems: 0, totalCollections: 0, totalValue: 0, memberSince: new Date().toISOString() },
      role: 'user',
      isActive: true,
      lastLoginAt: new Date().toISOString(),
    };

    localStorage.setItem('collectorhub_user', JSON.stringify(user));
    localStorage.setItem('accessToken', 'mock-access-token');
    localStorage.setItem('refreshToken', 'mock-refresh-token');

    // Make sure we have initialized lists
    if (!localStorage.getItem('collectorhub_collections')) {
      localStorage.setItem('collectorhub_collections', JSON.stringify([]));
      localStorage.setItem('collectorhub_items', JSON.stringify([]));
    }

    return {
      _id: user._id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role,
    };
  },

  register(email: string, username: string, displayName: string): AuthUser {
    initMockDb();
    const user: User = {
      _id: 'user-' + Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      displayName,
      avatar: null,
      bio: 'Welcome to my new collection space!',
      preferences: { theme: 'dark', defaultView: 'gallery', language: 'en', dashboardWidgets: [] },
      privacy: { profilePublic: true, collectionsPublicByDefault: false },
      stats: { totalItems: 0, totalCollections: 0, totalValue: 0, memberSince: new Date().toISOString() },
      role: 'user',
      isActive: true,
      lastLoginAt: new Date().toISOString(),
    };

    localStorage.setItem('collectorhub_user', JSON.stringify(user));
    localStorage.setItem('accessToken', 'mock-access-token');
    localStorage.setItem('refreshToken', 'mock-refresh-token');
    localStorage.setItem('collectorhub_collections', JSON.stringify([]));
    localStorage.setItem('collectorhub_items', JSON.stringify([]));

    return {
      _id: user._id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role,
    };
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('collectorhub_user');
  },

  // --- COLLECTIONS CRUD ---
  getCollections(): Collection[] {
    initMockDb();
    const colls = localStorage.getItem('collectorhub_collections');
    const collectionsList: Collection[] = colls ? JSON.parse(colls) : [];
    
    // Dynamically recalculate statistics based on items
    const items = this.getAllItems();
    return collectionsList.map(c => {
      const collItems = items.filter(it => it.collectionId === c._id);
      const totalItems = collItems.length;
      const wishlistCount = collItems.filter(it => it.ownership?.status === 'wishlist').length;
      const totalValue = collItems.reduce((acc, it) => acc + (it.ownership?.estimatedValue ?? 0), 0);
      
      return {
        ...c,
        stats: {
          totalItems,
          totalValue,
          wishlistCount,
          completionPercentage: totalItems > 0 ? Math.round(((totalItems - wishlistCount) / totalItems) * 100) : 0,
        }
      };
    });
  },

  getCollectionBySlug(slug: string): Collection | undefined {
    return this.getCollections().find(c => c.slug === slug);
  },

  saveCollection(collectionData: Omit<Collection, 'userId' | 'stats' | 'createdAt' | 'updatedAt' | '_id'> & { _id?: string }): Collection {
    initMockDb();
    const collections = this.getCollections();
    const user = this.getUser();

    const timestamp = new Date().toISOString();
    let finalCollection: Collection;

    if (collectionData._id) {
      // Update
      const index = collections.findIndex(c => c._id === collectionData._id);
      if (index === -1) throw new Error('Collection not found');

      finalCollection = {
        ...collections[index]!,
        ...collectionData,
        updatedAt: timestamp,
      };
      collections[index] = finalCollection;
    } else {
      // Create
      const newId = 'coll-' + Math.random().toString(36).substring(2, 11);
      finalCollection = {
        ...collectionData,
        _id: newId,
        userId: user?._id || 'default-user-id',
        stats: { totalItems: 0, totalValue: 0, wishlistCount: 0, completionPercentage: 0 },
        isPinned: collectionData.isPinned ?? false,
        isArchived: false,
        sortOrder: collections.length + 1,
        tags: collectionData.tags || [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      collections.push(finalCollection);
    }

    localStorage.setItem('collectorhub_collections', JSON.stringify(collections));
    this.recalculateUserStats();
    return finalCollection;
  },

  deleteCollection(id: string): void {
    initMockDb();
    let collections = this.getCollections();
    collections = collections.filter(c => c._id !== id);
    localStorage.setItem('collectorhub_collections', JSON.stringify(collections));

    // Also delete all items associated with this collection
    let items = this.getAllItems();
    items = items.filter(it => it.collectionId !== id);
    localStorage.setItem('collectorhub_items', JSON.stringify(items));

    this.recalculateUserStats();
  },

  // --- ITEMS CRUD ---
  getAllItems(): Item[] {
    initMockDb();
    const itemsStr = localStorage.getItem('collectorhub_items');
    return itemsStr ? JSON.parse(itemsStr) : [];
  },

  getItemsByCollectionId(collectionId: string): Item[] {
    return this.getAllItems().filter(it => it.collectionId === collectionId);
  },

  saveItem(itemData: Partial<Item> & { name: string; collectionId: string }): Item {
    initMockDb();
    const items = this.getAllItems();
    const user = this.getUser();

    const timestamp = new Date().toISOString();
    let finalItem: Item;

    if (itemData._id) {
      // Update
      const index = items.findIndex(it => it._id === itemData._id);
      if (index === -1) throw new Error('Item not found');

      finalItem = {
        ...items[index]!,
        ...itemData,
        updatedAt: timestamp,
        personal: {
          ...items[index]!.personal,
          ...itemData.personal,
        },
        ownership: {
          ...items[index]!.ownership,
          ...itemData.ownership,
          purchase: {
            ...items[index]!.ownership.purchase,
            ...itemData.ownership?.purchase,
          }
        },
        location: {
          ...items[index]!.location,
          ...itemData.location,
        },
        timeline: {
          ...items[index]!.timeline,
          lastViewed: timestamp,
          timesViewed: (items[index]!.timeline.timesViewed ?? 0) + 1,
          history: [
            ...items[index]!.timeline.history,
            { action: 'Updated details', timestamp, details: {} }
          ]
        }
      };
      items[index] = finalItem;
    } else {
      // Create
      const newId = 'item-' + Math.random().toString(36).substring(2, 11);
      finalItem = {
        _id: newId,
        userId: user?._id || 'default-user-id',
        collectionId: itemData.collectionId,
        name: itemData.name,
        brand: itemData.brand || 'Generic',
        series: itemData.series || 'Mainline',
        releaseYear: itemData.releaseYear || new Date().getFullYear(),
        modelNumber: itemData.modelNumber || '',
        collectorNumber: itemData.collectorNumber || '',
        category: itemData.category || 'Custom',
        description: itemData.description || '',
        scale: itemData.scale || '1:64',
        color: itemData.color || [],
        material: itemData.material || ['Plastic', 'Diecast'],
        manufacturer: itemData.manufacturer || 'Unknown',
        barcode: itemData.barcode || '',
        qrCode: '',
        images: itemData.images || [
          {
            url: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?q=80&w=600&auto=format&fit=crop',
            thumbnail: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?q=80&w=200&auto=format&fit=crop',
            caption: 'Default Image',
            isPrimary: true,
            uploadedAt: timestamp,
          }
        ],
        tags: itemData.tags || [],
        customMetadata: itemData.customMetadata || {},
        ownership: {
          status: itemData.ownership?.status || 'owned',
          condition: itemData.ownership?.condition || 'mint',
          duplicateCount: itemData.ownership?.duplicateCount ?? 1,
          acquiredDate: itemData.ownership?.acquiredDate || timestamp,
          purchase: {
            price: itemData.ownership?.purchase?.price ?? null,
            currency: itemData.ownership?.purchase?.currency || 'USD',
            date: itemData.ownership?.purchase?.date || timestamp,
            seller: itemData.ownership?.purchase?.seller || '',
            marketplace: itemData.ownership?.purchase?.marketplace || '',
            receiptImage: null,
          },
          estimatedValue: itemData.ownership?.estimatedValue ?? 0,
          valueCurrency: itemData.ownership?.purchase?.currency || 'USD',
          valueLastUpdated: timestamp,
        },
        location: {
          type: itemData.location?.type || 'Storage Box',
          name: itemData.location?.name || 'Box 1',
          position: itemData.location?.position || '',
        },
        personal: {
          notes: itemData.personal?.notes || '',
          isFavorite: itemData.personal?.isFavorite || false,
          isDisplayed: itemData.personal?.isDisplayed || false,
          isGrail: itemData.personal?.isGrail || false,
          isHolyGrail: itemData.personal?.isHolyGrail || false,
          isNeverSell: itemData.personal?.isNeverSell || false,
          isPinned: itemData.personal?.isPinned || false,
          rating: itemData.personal?.rating ?? null,
          categories: itemData.personal?.categories || [],
        },
        timeline: {
          dateAdded: timestamp,
          lastViewed: timestamp,
          timesViewed: 1,
          history: [{ action: 'Created', timestamp, details: {} }],
        },
        dataSource: itemData.dataSource || {
          provider: 'Manual Entry',
          sourceUrl: '',
          lastSynced: null,
          confidence: 1,
        },
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      items.push(finalItem);
    }

    localStorage.setItem('collectorhub_items', JSON.stringify(items));
    this.recalculateUserStats();
    return finalItem;
  },

  deleteItem(id: string): void {
    initMockDb();
    let items = this.getAllItems();
    items = items.filter(it => it._id !== id);
    localStorage.setItem('collectorhub_items', JSON.stringify(items));
    this.recalculateUserStats();
  },

  toggleItemFavorite(id: string): Item {
    const items = this.getAllItems();
    const index = items.findIndex(it => it._id === id);
    if (index === -1) throw new Error('Item not found');

    const item = items[index]!;
    item.personal.isFavorite = !item.personal.isFavorite;
    item.updatedAt = new Date().toISOString();
    
    items[index] = item;
    localStorage.setItem('collectorhub_items', JSON.stringify(items));
    return item;
  },

  // --- STATS RECALCULATION ---
  recalculateUserStats(): void {
    const collections = this.getCollections();
    const items = this.getAllItems();
    const user = this.getUser();

    if (!user) return;

    const totalCollections = collections.length;
    const totalItems = items.filter(it => it.ownership?.status === 'owned').length;
    const totalValue = items.reduce((acc, it) => acc + (it.ownership?.estimatedValue ?? 0), 0);

    const updatedUser = {
      ...user,
      stats: {
        ...user.stats,
        totalCollections,
        totalItems,
        totalValue,
      }
    };

    localStorage.setItem('collectorhub_user', JSON.stringify(updatedUser));
  },

  // Reset database completely
  resetDb(): void {
    localStorage.removeItem('collectorhub_collections');
    localStorage.removeItem('collectorhub_items');
    localStorage.removeItem('collectorhub_user');
    initMockDb();
  }
};

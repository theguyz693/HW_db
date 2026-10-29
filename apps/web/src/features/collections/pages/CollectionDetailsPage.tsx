import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  Edit2,
  Heart,
  Sparkles,
  X,
  Check,
  Loader2,
  ChevronRight,
  Bookmark,
  Upload,
  LayoutGrid,
  List,
  Flame,
  Globe2,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  ShoppingCart,
  Image as ImageIcon,
} from 'lucide-react';
import { collectionsService } from '@/lib/services/collectionsService.ts';
import { itemsService } from '@/lib/services/itemsService.ts';
import { storageService } from '@/lib/services/storageService.ts';
import { enrichmentService, type EnrichmentMatch, type EnrichmentResult } from '@/lib/enrichment/index.ts';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { formatCurrency } from '@collectorhub/utilities';
import type { Collection, Item, OwnershipStatus, ItemCondition } from '@collectorhub/shared-types';
import { BlisterCard } from '@/features/hotwheels/components/BlisterCard.tsx';
import { itemToCardData } from '@/features/hotwheels/lib/cardData.ts';

export function CollectionDetailsPage() {
  const { slug } = useParams<{ slug: string }>();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: 'detailed' (catalog grid), 'images' (visual photo gallery), 'list' (table)
  const [viewMode, setViewMode] = useState<'detailed' | 'images' | 'list'>('detailed');
  
  // Filtering & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyGrails, setOnlyGrails] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  // Drawer / Side Panel Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formTab, setFormTab] = useState<'enrichment' | 'url_import' | 'manual'>('enrichment');

  // Real Enrichment (Wiki Search) State
  const [enrichmentQuery, setEnrichmentQuery] = useState('');
  const [isSearchingEnrichment, setIsSearchingEnrichment] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [enrichmentMatches, setEnrichmentMatches] = useState<EnrichmentMatch[]>([]);
  const [selectedEnrichmentResult, setSelectedEnrichmentResult] = useState<EnrichmentResult | null>(null);
  const [enrichmentError, setEnrichmentError] = useState('');

  // URL Import State
  const [importUrlInput, setImportUrlInput] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [urlImportResult, setUrlImportResult] = useState<EnrichmentResult | null>(null);
  const [urlImportError, setUrlImportError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Image Upload State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Hot Wheels');
  const [series, setSeries] = useState('');
  const [releaseYear, setReleaseYear] = useState<string>('');
  const [modelNumber, setModelNumber] = useState('');
  const [collectorNumber, setCollectorNumber] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [scale, setScale] = useState('1:64');
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('Metal/Metal');
  const [barcode, setBarcode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<OwnershipStatus>('owned');
  const [condition, setCondition] = useState<ItemCondition>('mint');
  const [price, setPrice] = useState<string>('');
  const [estimatedValue, setEstimatedValue] = useState<string>('');
  const [locationType, setLocationType] = useState('Display Case');
  const [locationName, setLocationName] = useState('Living Room Case 1');
  const [locationPosition, setLocationPosition] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isGrail, setIsGrail] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(1);
  const [customMetadata, setCustomMetadata] = useState<Record<string, unknown>>({});

  useEffect(() => {
    loadData();
  }, [slug]);

  const loadData = async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const col = await collectionsService.getCollectionBySlug(slug);
      if (col) {
        setCollection(col);
        const colItems = await itemsService.getItemsByCollectionId(col._id);
        setItems(colItems);
      } else {
        setCollection(null);
      }
    } catch (err) {
      console.error('Error loading collection data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-44 rounded-3xl bg-bg-elevated/50 border border-border animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-3.5">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="h-80 rounded-2xl bg-bg-elevated/50 border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-sm mx-auto">
        <h2 className="text-2xl font-bold mb-2">Collection Not Found</h2>
        <p className="text-text-secondary mb-6">The collection you are trying to view does not exist or has been deleted.</p>
        <Link to="/collections">
          <Button variant="secondary" leftIcon={<ArrowLeft size={16} />}>Back to Collections</Button>
        </Link>
      </div>
    );
  }

  const handleOpenAddDrawer = () => {
    setEditingItem(null);
    setFormTab('enrichment');
    setEnrichmentQuery('');
    setEnrichmentMatches([]);
    setSelectedEnrichmentResult(null);
    setEnrichmentError('');
    setImportUrlInput('');
    setUrlImportResult(null);
    setUrlImportError('');
    setSelectedImageIndex(0);
    
    // Clear manual inputs
    setName('');
    setBrand(collection.collectibleType === 'Hot Wheels' ? 'Hot Wheels' : '');
    setSeries('');
    setReleaseYear('');
    setModelNumber('');
    setCollectorNumber('');
    setCategory(collection.collectibleType === 'Hot Wheels' ? 'Die-cast Car' : 'Collectible');
    setDescription('');
    setScale(collection.collectibleType === 'Hot Wheels' ? '1:64' : '');
    setColor('');
    setMaterial(collection.collectibleType === 'Hot Wheels' ? 'Metal/Metal' : '');
    setBarcode('');
    setImageUrl('');
    setStatus('owned');
    setCondition('mint');
    setPrice('');
    setEstimatedValue('');
    setLocationType('Display Case');
    setLocationName('');
    setLocationPosition('');
    setNotes('');
    setIsFavorite(false);
    setIsGrail(false);
    setDuplicateCount(1);
    setCustomMetadata({});

    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (item: Item) => {
    setEditingItem(item);
    setFormTab('manual');
    setEnrichmentQuery('');
    setEnrichmentMatches([]);
    setSelectedEnrichmentResult(null);
    setUrlImportResult(null);

    setName(item.name);
    setBrand(item.brand);
    setSeries(item.series);
    setReleaseYear(item.releaseYear ? String(item.releaseYear) : '');
    setModelNumber(item.modelNumber);
    setCollectorNumber(item.collectorNumber);
    setCategory(item.category);
    setDescription(item.description);
    setScale(item.scale);
    setColor(item.color.join(', '));
    setMaterial(item.material.join('/'));
    setBarcode(item.barcode);
    setImageUrl(item.images[0]?.url || '');
    setStatus(item.ownership.status);
    setCondition(item.ownership.condition);
    setPrice(item.ownership.purchase.price ? String(item.ownership.purchase.price) : '');
    setEstimatedValue(item.ownership.estimatedValue ? String(item.ownership.estimatedValue) : '');
    setLocationType(item.location.type);
    setLocationName(item.location.name);
    setLocationPosition(item.location.position);
    setNotes(item.personal.notes);
    setIsFavorite(item.personal.isFavorite);
    setIsGrail(item.personal.isGrail);
    setDuplicateCount(item.ownership.duplicateCount);
    setCustomMetadata(item.customMetadata || {});

    setIsDrawerOpen(true);
  };

  // 1. Hot Wheels Fandom Wiki Enrichment Search
  const handleEnrichmentSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery || enrichmentQuery).trim();
    if (!query) return;

    setIsSearchingEnrichment(true);
    setEnrichmentError('');
    setSelectedEnrichmentResult(null);

    try {
      const matches = await enrichmentService.search(query, collection.collectibleType);
      setEnrichmentMatches(matches);

      if (matches.length === 0) {
        setEnrichmentError(`No matches found for "${query}". You can enter details manually or try another keyword.`);
      } else if (matches.length === 1) {
        await handleSelectMatch(matches[0]!);
      }
    } catch {
      setEnrichmentError('Unable to connect to Hot Wheels reference wiki. You can enter details manually.');
    } finally {
      setIsSearchingEnrichment(false);
    }
  };

  const handleSelectMatch = async (match: EnrichmentMatch) => {
    setIsFetchingDetails(true);
    setEnrichmentError('');

    try {
      const result = await enrichmentService.getDetails(match, collection.collectibleType);
      if (result && result.success) {
        setSelectedEnrichmentResult(result);
      } else {
        setEnrichmentError(`Could not extract structured data for "${match.title}".`);
      }
    } catch {
      setEnrichmentError('Failed to fetch details for this model.');
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // 2. Generic Shopping Site & Multi-Marketplace URL Import
  const handleUrlImport = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    const url = (customUrl || importUrlInput).trim();
    if (!url) return;

    setIsImportingUrl(true);
    setUrlImportError('');
    setUrlImportResult(null);
    setSelectedImageIndex(0);

    try {
      const result = await enrichmentService.importFromUrl(url);
      if (result && result.success && result.data.name) {
        setUrlImportResult(result);
      } else {
        setUrlImportError("Couldn't extract reliable product information from this page.");
      }
    } catch {
      setUrlImportError("Couldn't extract reliable product information from this page.");
    } finally {
      setIsImportingUrl(false);
    }
  };

  // User Confirms Enriched / Imported Data -> Prefills Manual Form
  const applyImportedData = (result: EnrichmentResult, chosenImageIndex = 0) => {
    const data = result.data;
    const chosenImage = data.images?.[chosenImageIndex]?.url || data.images?.[0]?.url || '';

    setName(data.name || '');
    setBrand(data.brand || (collection.collectibleType === 'Hot Wheels' ? 'Hot Wheels' : ''));
    setSeries(data.series || '');
    setReleaseYear(data.releaseYear ? String(data.releaseYear) : '');
    setModelNumber(data.modelNumber || data.asin || data.productId || '');
    setCollectorNumber(data.collectorNumber || '');
    setCategory(data.category || (collection.collectibleType === 'Hot Wheels' ? 'Die-cast Car' : 'Collectible'));
    setDescription(data.description || '');
    setScale(data.scale || '');
    setColor(data.color?.join(', ') || '');
    setMaterial(data.material?.join('/') || '');
    setBarcode(data.barcode || barcode);
    setImageUrl(chosenImage);
    if (data.ownership?.purchase?.price) {
      setPrice(String(data.ownership.purchase.price));
      setEstimatedValue(String(data.ownership.purchase.price));
    } else if (data.ownership?.estimatedValue) {
      setEstimatedValue(String(data.ownership.estimatedValue));
    }
    if (data.customMetadata) {
      setCustomMetadata(data.customMetadata);
    }

    setFormTab('manual');
  };

  // Upload local image to Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const result = await storageService.uploadItemImage(file);
      setImageUrl(result.url);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !collection) return;

    const colorsArray = color ? color.split(',').map(s => s.trim()).filter(Boolean) : [];
    const materialsArray = material ? material.split('/').map(s => s.trim()).filter(Boolean) : [];

    await itemsService.saveItem({
      _id: editingItem?._id,
      collectionId: collection._id,
      name,
      brand,
      series,
      releaseYear: releaseYear ? Number(releaseYear) : null,
      modelNumber,
      collectorNumber,
      category,
      description,
      scale,
      color: colorsArray,
      material: materialsArray,
      manufacturer: brand,
      barcode,
      images: imageUrl.trim() ? [
        {
          url: imageUrl.trim(),
          thumbnail: imageUrl.trim(),
          caption: name,
          isPrimary: true,
          uploadedAt: new Date().toISOString(),
        }
      ] : [],
      tags: [brand, series, category].filter(Boolean),
      customMetadata,
      ownership: {
        status,
        condition,
        duplicateCount: Number(duplicateCount) || 1,
        acquiredDate: status === 'wishlist' ? null : (new Date().toISOString().split('T')[0] ?? null),
        estimatedValue: Number(estimatedValue) || 0,
        valueCurrency: 'USD',
        valueLastUpdated: new Date().toISOString(),
        purchase: {
          price: price ? Number(price) : null,
          currency: 'USD',
          date: status === 'wishlist' ? null : (new Date().toISOString().split('T')[0] ?? null),
          seller: status === 'wishlist' ? '' : 'Retailer',
          marketplace: status === 'wishlist' ? '' : 'Store',
          receiptImage: null,
        }
      },
      location: {
        type: locationType,
        name: locationName,
        position: locationPosition,
      },
      personal: {
        notes,
        isFavorite,
        isDisplayed: locationType !== 'Storage Box',
        isGrail,
        // Preserve flags this form doesn't edit (previously reset rating to 5 on every save).
        isHolyGrail: editingItem?.personal?.isHolyGrail ?? false,
        isNeverSell: editingItem?.personal?.isNeverSell ?? false,
        isPinned: editingItem?.personal?.isPinned ?? false,
        rating: editingItem?.personal?.rating ?? null,
        categories: [category].filter(Boolean),
      }
    });

    await loadData();
    setIsDrawerOpen(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Delete this item from your collection?')) {
      await itemsService.deleteItem(id);
      await loadData();
    }
  };

  const handleToggleFavorite = async (item: Item) => {
    await itemsService.toggleFavorite(item);
    await loadData();
  };

  // Brands for filter
  const brandsList = ['All', ...Array.from(new Set(items.map(it => it.brand))).filter(Boolean)];

  // Filtering & Sorting
  const filteredItems = items
    .filter(it => {
      const matchSearch = it.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          it.series.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          it.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          it.barcode.includes(searchTerm);
      const matchBrand = selectedBrand === 'All' || it.brand === selectedBrand;
      const matchStatus = selectedStatus === 'All' || it.ownership.status === selectedStatus;
      const matchFav = !onlyFavorites || it.personal.isFavorite;
      const matchGrail = !onlyGrails || it.personal.isGrail;

      return matchSearch && matchBrand && matchStatus && matchFav && matchGrail;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'value-desc':
          return (b.ownership.estimatedValue ?? 0) - (a.ownership.estimatedValue ?? 0);
        case 'value-asc':
          return (a.ownership.estimatedValue ?? 0) - (b.ownership.estimatedValue ?? 0);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Calculate totals
  const totalValue = filteredItems.reduce((acc, it) => acc + (it.ownership.estimatedValue ?? 0), 0);
  const totalOwned = filteredItems.filter(it => it.ownership.status === 'owned').length;
  const totalWishlist = filteredItems.filter(it => it.ownership.status === 'wishlist').length;

  const conditionColorMap: Record<ItemCondition, string> = {
    mint: 'bg-emerald/10 text-emerald border-emerald/20',
    'near-mint': 'bg-cyan/10 text-cyan border-cyan/20',
    good: 'bg-amber/10 text-amber border-amber/20',
    fair: 'bg-orange/10 text-orange border-orange/20',
    poor: 'bg-rose/10 text-rose border-rose/20',
    sealed: 'bg-violet/10 text-violet border-violet/20',
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* --- Breadcrumb & Back --- */}
      <div className="flex items-center gap-3">
        <Link
          to="/collections"
          className="p-2 rounded-xl bg-bg-elevated hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </Link>
        <span className="text-text-muted text-sm">Collections</span>
        <ChevronRight size={14} className="text-text-muted" />
        <span className="text-text-primary text-sm font-semibold">{collection.name}</span>
      </div>

      {/* --- Collection Header Banner --- */}
      <div className="relative rounded-3xl bg-gradient-to-r from-bg-elevated to-bg-secondary border border-border p-5 lg:p-7 overflow-hidden shadow-lg">
        <div className={`absolute -right-24 -top-24 w-72 h-72 rounded-full blur-3xl opacity-20 bg-${collection.color}`} />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className={`w-13 h-13 rounded-2xl bg-bg-surface border border-${collection.color}/20 flex items-center justify-center text-${collection.color} shadow-lg flex-shrink-0`}>
              <Bookmark size={26} className={`fill-${collection.color}/10`} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold">{collection.name}</h1>
              <p className="text-text-secondary text-xs mt-1 max-w-xl">{collection.description || 'Catalog and manage your collectibles.'}</p>
              <div className="flex gap-2 mt-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-bg-surface border border-border capitalize text-text-secondary">
                  {collection.collectibleType}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-bg-surface border border-border capitalize text-text-secondary">
                  {collection.privacy}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              leftIcon={<Plus size={18} />}
              onClick={handleOpenAddDrawer}
            >
              Add Item
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border/60">
          <div className="p-3 bg-bg-surface/30 rounded-2xl border border-border/40">
            <p className="text-xs text-text-muted">Filtered Items</p>
            <p className="text-xl font-bold mt-0.5">{filteredItems.length}</p>
          </div>
          <div className="p-3 bg-bg-surface/30 rounded-2xl border border-border/40">
            <p className="text-xs text-text-muted">Owned</p>
            <p className="text-xl font-bold mt-0.5 text-success">{totalOwned}</p>
          </div>
          <div className="p-3 bg-bg-surface/30 rounded-2xl border border-border/40">
            <p className="text-xs text-text-muted">Wishlist</p>
            <p className="text-xl font-bold mt-0.5 text-rose">{totalWishlist}</p>
          </div>
          <div className="p-3 bg-bg-surface/30 rounded-2xl border border-border/40">
            <p className="text-xs text-text-muted">Estimated Value</p>
            <p className="text-xl font-bold mt-0.5 text-accent">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </div>

      {/* --- Filter / Controls Section --- */}
      <div className="p-3.5 rounded-2xl bg-bg-elevated border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search models, series, brands, barcodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9.5 pl-9 pr-4 rounded-xl text-xs bg-bg-surface border border-border hover:border-border-hover focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>

        {/* Filters & View Modes */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Brand */}
          <div className="flex items-center gap-1 bg-bg-surface px-2.5 h-9.5 rounded-xl border border-border">
            <span className="text-[11px] text-text-muted">Brand:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none pr-1"
            >
              {brandsList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1 bg-bg-surface px-2.5 h-9.5 rounded-xl border border-border">
            <span className="text-[11px] text-text-muted">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none pr-1"
            >
              <option value="All">All</option>
              <option value="owned">Owned</option>
              <option value="wishlist">Wishlist</option>
              <option value="sold">Sold</option>
              <option value="traded">Traded</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 bg-bg-surface px-2.5 h-9.5 rounded-xl border border-border">
            <span className="text-[11px] text-text-muted">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none pr-1"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="value-desc">Value (High-Low)</option>
              <option value="value-asc">Value (Low-High)</option>
            </select>
          </div>

          {/* Favorite Toggle */}
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`h-9.5 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-semibold cursor-pointer transition-all duration-200 ${onlyFavorites ? 'bg-rose/10 text-rose border-rose/30 shadow-glow' : 'bg-bg-surface text-text-secondary border-border hover:border-border-hover'}`}
          >
            <Heart size={13} className={onlyFavorites ? 'fill-rose text-rose' : ''} />
            Favs
          </button>

          {/* Grail Toggle */}
          <button
            onClick={() => setOnlyGrails(!onlyGrails)}
            className={`h-9.5 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-semibold cursor-pointer transition-all duration-200 ${onlyGrails ? 'bg-amber/10 text-amber border-amber/30 shadow-glow' : 'bg-bg-surface text-text-secondary border-border hover:border-border-hover'}`}
          >
            <Flame size={13} className={onlyGrails ? 'fill-amber text-amber' : ''} />
            Grails
          </button>

          {/* View Mode Toggle: Detailed | Images | List */}
          <div className="flex bg-bg-surface p-0.5 rounded-xl border border-border gap-0.5">
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${viewMode === 'detailed' ? 'bg-bg-elevated text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              title="Detailed Cards (Info + Image)"
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Detailed</span>
            </button>
            <button
              onClick={() => setViewMode('images')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${viewMode === 'images' ? 'bg-bg-elevated text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              title="Carded display view"
            >
              <ImageIcon size={13} />
              <span className="hidden sm:inline">Carded</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-bg-elevated text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              title="Dense List Table"
            >
              <List size={13} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- CONTENT VIEWS --- */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-bg-elevated/40 border border-border border-dashed">
          <p className="text-text-secondary font-medium">No items found matching your filters</p>
          <p className="text-text-muted text-xs mt-1">Try clearing query selections or add a new item.</p>
          <Button variant="accent" size="sm" className="mt-4" onClick={handleOpenAddDrawer}>
            Add First Item
          </Button>
        </div>
      ) : viewMode === 'detailed' ? (
        /* ── VIEW 1: DETAILED CATALOG GRID ── */
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-3.5"
        >
          <AnimatePresence>
            {filteredItems.map((item) => {
              const mainImg = item.images.find(img => img.isPrimary) || item.images[0];
              const isWish = item.ownership.status === 'wishlist';

              return (
                <motion.div
                  key={item._id}
                  layoutId={item._id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="group relative rounded-2xl bg-bg-elevated border border-border/80 hover:border-accent/40 overflow-hidden shadow-sm hover:shadow-xl flex flex-col hover:-translate-y-1 transition-all duration-300 min-h-[330px] sm:min-h-[350px]"
                >
                  {/* Top Overlay Indicators */}
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
                    {item.ownership.duplicateCount > 1 && (
                      <div className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-black text-white shadow-md">
                        x{item.ownership.duplicateCount}
                      </div>
                    )}
                    {item.personal.isGrail && (
                      <div className="p-1 rounded bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber shadow-sm">
                        <Flame size={11} className="fill-amber" />
                      </div>
                    )}
                  </div>

                  {/* Hover Action Buttons */}
                  <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item); }}
                      className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/10 text-white/80 hover:text-rose cursor-pointer shadow-md transition-colors"
                      title="Favorite"
                    >
                      <Heart size={11} className={item.personal.isFavorite ? 'fill-rose text-rose' : ''} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenEditDrawer(item); }}
                      className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/10 text-white/80 hover:text-white cursor-pointer shadow-md transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item._id); }}
                      className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/10 text-white/80 hover:text-error cursor-pointer shadow-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* PROMINENT PRODUCT IMAGE (Catalog Style - 12-15% larger area) */}
                  <div className="relative w-full aspect-[1/1.14] sm:aspect-[1/1.18] bg-gradient-to-b from-bg-surface to-bg-primary overflow-hidden flex items-center justify-center p-2 border-b border-border/40">
                    {mainImg?.url ? (
                      <img
                        src={mainImg.url}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500 shadow-sm"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-bg-surface/50 border border-border/40 flex items-center justify-center text-text-muted">
                        <Bookmark size={28} className="opacity-40" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-bg-elevated/70 via-transparent to-transparent pointer-events-none" />

                    {/* Status & Condition Pills */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase border shadow-md backdrop-blur-md ${isWish ? 'bg-rose-500/20 text-rose border-rose/40' : 'bg-emerald-500/20 text-emerald border-emerald/40'}`}>
                        {item.ownership.status}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold border capitalize shadow-md backdrop-blur-md ${conditionColorMap[item.ownership.condition] || 'bg-bg-surface text-text-secondary border-border'}`}>
                        {item.ownership.condition}
                      </span>
                    </div>
                  </div>

                  {/* COMPACT PRODUCT INFO SECTION */}
                  <div className="p-3 flex-1 flex flex-col justify-between bg-bg-elevated">
                    <div>
                      <div className="flex items-center justify-between text-[9.5px] uppercase font-bold tracking-wider text-text-muted">
                        <span className="text-accent truncate max-w-[65%]">{item.brand || 'Hot Wheels'}</span>
                        <span>{item.releaseYear || '—'}</span>
                      </div>

                      <h4 className="font-bold text-xs text-text-primary mt-1 line-clamp-2 group-hover:text-accent transition-colors leading-snug">
                        {item.name}
                      </h4>

                      <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                        {item.series || 'Mainline'} {item.collectorNumber ? `#${item.collectorNumber}` : ''}
                      </p>

                      {item.customMetadata && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {typeof item.customMetadata.wheelType === 'string' && item.customMetadata.wheelType && (
                            <span className="px-1 py-0.5 rounded bg-bg-surface text-[8.5px] font-medium text-text-muted border border-border/50 truncate max-w-full">
                              {item.customMetadata.wheelType}
                            </span>
                          )}
                          {typeof item.customMetadata.asin === 'string' && item.customMetadata.asin && (
                            <span className="px-1 py-0.5 rounded bg-bg-surface text-[8.5px] font-medium text-text-muted border border-border/50 truncate">
                              ASIN: {item.customMetadata.asin}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50">
                      <span className="text-[9.5px] text-text-muted font-medium">
                        {item.scale || '1:64'}
                      </span>
                      <span className="text-xs font-black text-emerald">
                        {item.ownership.estimatedValue ? formatCurrency(item.ownership.estimatedValue) : '—'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : viewMode === 'images' ? (
        /* ── VIEW 2: CARDED GALLERY (2.5D blister cards → product detail page) ── */
        <ul role="list" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {filteredItems.map((item) => (
            <li key={item._id}>
              <BlisterCard
                data={itemToCardData(item)}
                href={`/items/${item._id}`}
                size="fluid"
                badge={(item.ownership?.duplicateCount ?? 1) > 1 ? `×${item.ownership.duplicateCount}` : undefined}
              />
            </li>
          ))}
        </ul>
      ) : (
        /* ── VIEW 3: DENSE LIST TABLE ── */
        <div className="rounded-2xl bg-bg-elevated border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-surface text-xs text-text-muted uppercase border-b border-border">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4">Brand / Series</th>
                <th className="p-4">Year</th>
                <th className="p-4">Condition</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Est. Value</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item) => {
                const mainImg = item.images.find(img => img.isPrimary) || item.images[0];
                return (
                  <tr key={item._id} className="hover:bg-bg-surface/50 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-bg-surface border border-border overflow-hidden flex-shrink-0">
                        {mainImg?.url ? (
                          <img src={mainImg.url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted">
                            <Bookmark size={14} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-text-primary flex items-center gap-1.5">
                          {item.name}
                          {item.personal.isGrail && <Flame size={13} className="text-amber fill-amber" />}
                        </div>
                        <div className="text-xs text-text-muted">
                          {item.modelNumber ? `Model ${item.modelNumber}` : item.barcode ? `UPC ${item.barcode}` : ''}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-text-secondary">{item.brand}</div>
                      <div className="text-xs text-text-muted">{item.series || '—'}</div>
                    </td>
                    <td className="p-4 text-text-secondary">{item.releaseYear || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border capitalize ${conditionColorMap[item.ownership.condition] || ''}`}>
                        {item.ownership.condition}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase ${item.ownership.status === 'owned' ? 'text-success' : 'text-rose'}`}>
                        {item.ownership.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-accent">
                      {item.ownership.estimatedValue ? formatCurrency(item.ownership.estimatedValue) : '—'}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleFavorite(item)}
                          className="p-1.5 rounded-lg hover:bg-bg-surface text-text-muted hover:text-rose cursor-pointer"
                        >
                          <Heart size={14} className={item.personal.isFavorite ? 'fill-rose text-rose' : ''} />
                        </button>
                        <button
                          onClick={() => handleOpenEditDrawer(item)}
                          className="p-1.5 rounded-lg hover:bg-bg-surface text-text-muted hover:text-text-primary cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id)}
                          className="p-1.5 rounded-lg hover:bg-bg-surface text-text-muted hover:text-error cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- ADD / EDIT SIDE PANEL DRAWER --- */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-xl bg-bg-secondary border-l border-border shadow-2xl relative z-10 flex flex-col h-full"
            >
              {/* Header */}
              <div className="p-5 border-b border-border flex items-center justify-between bg-bg-elevated">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    {editingItem ? 'Edit Item Details' : 'Add Item to Collection'}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {editingItem ? 'Review and update collectible attributes.' : 'Choose search enrichment, import from URL, or enter manually.'}
                  </p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 3 Add Item Tabs */}
              {!editingItem && (
                <div className="flex border-b border-border bg-bg-elevated/40 p-1 gap-1">
                  <button
                    onClick={() => setFormTab('enrichment')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${formTab === 'enrichment' ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    <Sparkles size={13} /> Enrich / Search
                  </button>
                  <button
                    onClick={() => setFormTab('url_import')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${formTab === 'url_import' ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    <LinkIcon size={13} /> Import from URL
                  </button>
                  <button
                    onClick={() => setFormTab('manual')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${formTab === 'manual' ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    Manual Entry
                  </button>
                </div>
              )}

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* TAB 1: HOT WHEELS FANDOM WIKI ENRICHMENT */}
                {formTab === 'enrichment' && !editingItem && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10 text-xs text-text-secondary leading-relaxed">
                      <div className="flex items-center gap-1.5 text-accent font-bold mb-1">
                        <Globe2 size={15} /> Hot Wheels Reference Wiki Search
                      </div>
                      Search Hot Wheels castings (e.g. <span className="text-text-primary font-semibold">Datsun 510</span>, <span className="text-text-primary font-semibold">Porsche 911</span>, <span className="text-text-primary font-semibold">Skyline R34</span>) or UPC barcodes. Discovered specs and official images will be previewed for confirmation.
                    </div>

                    <form onSubmit={(e) => handleEnrichmentSearch(e)} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search casting model or UPC barcode..."
                        value={enrichmentQuery}
                        onChange={(e) => setEnrichmentQuery(e.target.value)}
                        disabled={isSearchingEnrichment}
                        className="flex-1 h-11 px-4 rounded-xl text-sm bg-bg-surface border border-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                      />
                      <Button
                        type="submit"
                        variant="accent"
                        isLoading={isSearchingEnrichment}
                        disabled={!enrichmentQuery.trim()}
                      >
                        Search
                      </Button>
                    </form>

                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {['Datsun 510', 'Porsche 911', 'Nissan Skyline', 'Bugatti Chiron', 'Lamborghini Countach'].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setEnrichmentQuery(preset);
                            handleEnrichmentSearch(undefined, preset);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs bg-bg-surface hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border cursor-pointer transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    {enrichmentError && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber space-y-2">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <AlertCircle size={14} /> {enrichmentError}
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setFormTab('manual')}>
                          Switch to Manual Form
                        </Button>
                      </div>
                    )}

                    {isFetchingDetails && (
                      <div className="p-8 rounded-2xl bg-bg-surface border border-border flex flex-col items-center justify-center text-center gap-3">
                        <Loader2 size={24} className="animate-spin text-accent" />
                        <p className="text-xs text-text-secondary">Extracting casting details and photos from Hot Wheels Wiki...</p>
                      </div>
                    )}

                    {selectedEnrichmentResult && !isFetchingDetails && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-2xl bg-bg-surface border border-accent/30 space-y-4 shadow-lg"
                      >
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald" />
                            <span className="text-sm font-bold text-text-primary">Discovered Data Preview</span>
                          </div>
                          <span className="text-[10px] text-text-muted px-2 py-0.5 rounded bg-bg-elevated border border-border">
                            {selectedEnrichmentResult.provider}
                          </span>
                        </div>

                        <div className="flex gap-4">
                          {selectedEnrichmentResult.data.images?.[0]?.url && (
                            <div className="w-24 h-24 rounded-xl bg-bg-elevated border border-border overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                              <img
                                src={selectedEnrichmentResult.data.images[0].url}
                                alt="Preview"
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                              {selectedEnrichmentResult.data.brand}
                            </span>
                            <h4 className="text-base font-bold text-text-primary truncate">
                              {selectedEnrichmentResult.data.name}
                            </h4>
                            <p className="text-xs text-text-secondary mt-0.5">
                              {selectedEnrichmentResult.data.series || 'Series'} • {selectedEnrichmentResult.data.releaseYear || 'Year'}
                            </p>
                            <div className="flex flex-wrap gap-2 text-[11px] text-text-muted mt-2">
                              <span>Scale: <strong className="text-text-primary">{selectedEnrichmentResult.data.scale || '1:64'}</strong></span>
                              {selectedEnrichmentResult.data.modelNumber && (
                                <span>Toy #: <strong className="text-text-primary">{selectedEnrichmentResult.data.modelNumber}</strong></span>
                              )}
                            </div>
                          </div>
                        </div>

                        {selectedEnrichmentResult.data.description && (
                          <p className="text-xs text-text-secondary bg-bg-elevated p-3 rounded-xl border border-border/50 line-clamp-3">
                            {selectedEnrichmentResult.data.description}
                          </p>
                        )}

                        <div className="pt-2">
                          <Button
                            type="button"
                            variant="accent"
                            fullWidth
                            leftIcon={<Check size={16} />}
                            onClick={() => applyImportedData(selectedEnrichmentResult)}
                          >
                            Use Information & Prefill Form
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {enrichmentMatches.length > 1 && !selectedEnrichmentResult && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-secondary">Matching Castings on Wiki:</label>
                        <div className="space-y-1.5">
                          {enrichmentMatches.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectMatch(m)}
                              className="w-full p-3 rounded-xl bg-bg-surface hover:bg-bg-hover border border-border flex items-center justify-between text-left text-xs transition-colors cursor-pointer group"
                            >
                              <div>
                                <h5 className="font-bold text-text-primary group-hover:text-accent transition-colors">{m.title}</h5>
                                <span className="text-[10px] text-text-muted">Click to preview & extract data</span>
                              </div>
                              <ChevronRight size={16} className="text-text-muted group-hover:text-accent" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: UNIVERSAL PRODUCT IMPORT FROM URL */}
                {formTab === 'url_import' && !editingItem && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-violet/5 border border-violet/10 text-xs text-text-secondary leading-relaxed">
                      <div className="flex items-center gap-1.5 text-violet font-bold mb-1">
                        <ShoppingCart size={15} /> Import from URL
                      </div>
                      Paste a product link from Amazon, Flipkart, FirstCry, or any retail website. Structured metadata (JSON-LD & OpenGraph) will be extracted.
                    </div>

                    {/* URL Input */}
                    <form onSubmit={(e) => handleUrlImport(e)} className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Paste product link (https://...)"
                        value={importUrlInput}
                        onChange={(e) => setImportUrlInput(e.target.value)}
                        disabled={isImportingUrl}
                        className="flex-1 h-11 px-4 rounded-xl text-sm bg-bg-surface border border-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                      />
                      <Button
                        type="submit"
                        variant="accent"
                        isLoading={isImportingUrl}
                        disabled={!importUrlInput.trim()}
                        leftIcon={<LinkIcon size={15} />}
                      >
                        Import
                      </Button>
                    </form>

                    {/* Sample URLs */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-semibold text-text-muted">Try sample product links:</p>
                      <div className="space-y-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            const url = 'https://www.amazon.in/Hot-Wheels-Skyline-Diecast-Collection/dp/B0B8TKQQ6W';
                            setImportUrlInput(url);
                            handleUrlImport(undefined, url);
                          }}
                          className="w-full text-left p-2 rounded-lg bg-bg-surface hover:bg-bg-hover border border-border text-[11px] text-text-secondary hover:text-text-primary flex items-center justify-between cursor-pointer truncate"
                        >
                          <span className="truncate">Amazon India: Hot Wheels Skyline (amazon.in - INR)</span>
                          <ChevronRight size={13} className="text-text-muted flex-shrink-0" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const url = 'https://hotwheels.fandom.com/wiki/Porsche_911_Turbo_(930)';
                            setImportUrlInput(url);
                            handleUrlImport(undefined, url);
                          }}
                          className="w-full text-left p-2 rounded-lg bg-bg-surface hover:bg-bg-hover border border-border text-[11px] text-text-secondary hover:text-text-primary flex items-center justify-between cursor-pointer truncate"
                        >
                          <span className="truncate">Wiki: Porsche 911 Turbo (930)</span>
                          <ChevronRight size={13} className="text-text-muted flex-shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* URL Import Error (Strict Failure) */}
                    {urlImportError && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber space-y-2.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertCircle size={15} /> {urlImportError}
                        </div>
                        <p className="text-[11px] text-text-secondary">
                          The target site did not expose accessible JSON-LD or OpenGraph product metadata. You can enter the item details manually.
                        </p>
                        <Button variant="secondary" size="sm" onClick={() => setFormTab('manual')}>
                          Enter Manually
                        </Button>
                      </div>
                    )}

                    {/* Discovered URL Metadata Preview with Source Confidence */}
                    {urlImportResult && !isImportingUrl && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-2xl bg-bg-surface border border-accent/30 space-y-4 shadow-lg"
                      >
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald" />
                            <span className="text-sm font-bold text-text-primary">Discovered Product Data</span>
                          </div>
                          <span className="text-[10px] text-accent font-bold px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                            {urlImportResult.provider}
                          </span>
                        </div>

                        {/* Image Preview & Multi-Image Selector */}
                        <div className="space-y-2">
                          <div className="flex gap-4 items-start">
                            {urlImportResult.data.images && urlImportResult.data.images.length > 0 ? (
                              <div className="w-24 h-24 rounded-xl bg-bg-elevated border border-border overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                                <img
                                  src={urlImportResult.data.images[selectedImageIndex]?.url || urlImportResult.data.images[0]?.url}
                                  alt="Product"
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              </div>
                            ) : (
                              <div className="w-24 h-24 rounded-xl bg-bg-elevated border border-border/50 flex flex-col items-center justify-center text-text-muted flex-shrink-0 text-center p-2">
                                <ImageIcon size={20} className="opacity-40" />
                                <span className="text-[9px] mt-1">No image found</span>
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              {urlImportResult.data.brand && (
                                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                                  {urlImportResult.data.brand}
                                </span>
                              )}
                              <h4 className="text-sm font-bold text-text-primary line-clamp-2">
                                {urlImportResult.data.name}
                              </h4>
                              {urlImportResult.data.ownership?.purchase?.price && (
                                <p className="text-xs font-black text-emerald mt-1">
                                  {urlImportResult.data.ownership.purchase.currency || '$'} {urlImportResult.data.ownership.purchase.price}
                                </p>
                              )}
                              {urlImportResult.data.asin && (
                                <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                                  ASIN: <strong className="text-text-primary">{urlImportResult.data.asin}</strong>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Multi-image thumbnail selection */}
                          {urlImportResult.data.images && urlImportResult.data.images.length > 1 && (
                            <div className="space-y-1 pt-1">
                              <label className="text-[10px] font-bold text-text-muted">Select Primary Photo ({urlImportResult.data.images.length} found):</label>
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {urlImportResult.data.images.map((img, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedImageIndex(idx)}
                                    className={`w-12 h-12 rounded-lg border overflow-hidden flex-shrink-0 cursor-pointer p-0.5 transition-all ${selectedImageIndex === idx ? 'ring-2 ring-accent border-accent' : 'opacity-60 hover:opacity-100 border-border'}`}
                                  >
                                    <img src={img.url} alt="" className="w-full h-full object-cover rounded" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SOURCE CONFIDENCE REPORT (Found vs Not Found) */}
                        {urlImportResult.extractedReport && (
                          <div className="p-3 rounded-xl bg-bg-elevated border border-border/50 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-text-primary text-[11px] uppercase tracking-wider">Source Extraction Report:</span>
                              <span className="text-[10px] text-emerald font-semibold flex items-center gap-1">
                                <CheckCircle2 size={11} /> Real Source Data
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                              <div className="flex items-center gap-1.5 text-text-secondary">
                                <span className={urlImportResult.extractedReport.name ? 'text-emerald font-bold' : 'text-text-muted'}>
                                  {urlImportResult.extractedReport.name ? '✓' : '—'} Product Name
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-text-secondary">
                                <span className={urlImportResult.extractedReport.brand ? 'text-emerald font-bold' : 'text-text-muted'}>
                                  {urlImportResult.extractedReport.brand ? '✓ Brand' : '— Brand (Not in page)'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-text-secondary">
                                <span className={urlImportResult.extractedReport.imagesCount > 0 ? 'text-emerald font-bold' : 'text-text-muted'}>
                                  {urlImportResult.extractedReport.imagesCount > 0 ? `✓ Images (${urlImportResult.extractedReport.imagesCount})` : '— Image (Not in page)'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-text-secondary">
                                <span className={urlImportResult.extractedReport.price ? 'text-emerald font-bold' : 'text-text-muted'}>
                                  {urlImportResult.extractedReport.price ? '✓ Price' : '— Price (Not in page)'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-text-secondary">
                                <span className={urlImportResult.extractedReport.productId ? 'text-emerald font-bold' : 'text-text-muted'}>
                                  {urlImportResult.extractedReport.productId ? '✓ Product ID' : '— Product ID (Not in page)'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="pt-2">
                          <Button
                            type="button"
                            variant="accent"
                            fullWidth
                            leftIcon={<Check size={16} />}
                            onClick={() => applyImportedData(urlImportResult, selectedImageIndex)}
                          >
                            Use Information & Prefill Form
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* TAB 3: MANUAL ENTRY & REVIEW FORM */}
                {(formTab === 'manual' || editingItem) && (
                  <form onSubmit={handleSaveItem} className="space-y-4">
                    <Input
                      label="Collectible Name / Model"
                      id="item-name"
                      placeholder="e.g. Datsun Bluebird 510 Wagon"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Brand"
                        id="item-brand"
                        placeholder="e.g. Hot Wheels, Matchbox"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                      />
                      <Input
                        label="Series"
                        id="item-series"
                        placeholder="e.g. Boulevard, Mainline"
                        value={series}
                        onChange={(e) => setSeries(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Release Year"
                        id="item-year"
                        placeholder="e.g. 2024"
                        value={releaseYear}
                        onChange={(e) => setReleaseYear(e.target.value)}
                      />
                      <Input
                        label="Model / Toy / ASIN #"
                        id="item-modelNo"
                        placeholder="e.g. HKF15"
                        value={modelNumber}
                        onChange={(e) => setModelNumber(e.target.value)}
                      />
                      <Input
                        label="Collector #"
                        id="item-collNo"
                        placeholder="e.g. 78"
                        value={collectorNumber}
                        onChange={(e) => setCollectorNumber(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Category"
                        id="item-cat"
                        placeholder="e.g. Die-cast Car"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      />
                      <Input
                        label="Scale"
                        id="item-scale"
                        placeholder="e.g. 1:64"
                        value={scale}
                        onChange={(e) => setScale(e.target.value)}
                      />
                      <Input
                        label="Barcode / UPC / EAN"
                        id="item-barcode"
                        placeholder="e.g. 074299057854"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Color(s)"
                        id="item-color"
                        placeholder="e.g. Blue, Yellow"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                      />
                      <Input
                        label="Material"
                        id="item-material"
                        placeholder="e.g. Metal/Metal"
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                      />
                    </div>

                    {/* Image Upload / URL */}
                    <div className="space-y-2 border-t border-border pt-4">
                      <label className="text-xs font-semibold text-text-secondary flex items-center justify-between">
                        <span>Item Photo / Image</span>
                        {isUploadingImage && <span className="text-accent flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Uploading to Storage...</span>}
                      </label>

                      <div className="flex gap-2">
                        <Input
                          id="item-image"
                          placeholder="Image URL or upload file below..."
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-11 px-4 rounded-xl bg-bg-surface hover:bg-bg-hover text-text-primary border border-border flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
                          title="Upload Image File"
                        >
                          <Upload size={14} /> Upload
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>

                      {imageUrl && (
                        <div className="rounded-xl overflow-hidden h-32 border border-border bg-bg-primary flex items-center justify-center relative group">
                          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-rose transition-colors cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary">Description</label>
                      <textarea
                        placeholder="Brief item features..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="w-full p-3 rounded-xl text-sm bg-bg-surface border border-border focus:border-accent focus:outline-none transition-all resize-none"
                      />
                    </div>

                    {/* Status & Condition */}
                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Ownership Status</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as OwnershipStatus)}
                          className="w-full h-11 px-4 rounded-xl text-sm bg-bg-surface border border-border focus:outline-none focus:border-accent transition-all"
                        >
                          <option value="owned">Owned</option>
                          <option value="wishlist">Wishlist</option>
                          <option value="sold">Sold</option>
                          <option value="traded">Traded</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Condition</label>
                        <select
                          value={condition}
                          onChange={(e) => setCondition(e.target.value as ItemCondition)}
                          className="w-full h-11 px-4 rounded-xl text-sm bg-bg-surface border border-border focus:outline-none focus:border-accent transition-all"
                        >
                          <option value="mint">Mint</option>
                          <option value="near-mint">Near Mint</option>
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="poor">Poor</option>
                          <option value="sealed">Sealed</option>
                        </select>
                      </div>
                    </div>

                    {/* Values */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Purchase Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 6.99"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl text-sm bg-bg-surface border border-border focus:border-accent focus:outline-none transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Estimated Value ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 35.00"
                          value={estimatedValue}
                          onChange={(e) => setEstimatedValue(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl text-sm bg-bg-surface border border-border focus:border-accent focus:outline-none transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Duplicates count</label>
                        <input
                          type="number"
                          value={duplicateCount}
                          onChange={(e) => setDuplicateCount(Number(e.target.value))}
                          className="w-full h-11 px-4 rounded-xl text-sm bg-bg-surface border border-border focus:border-accent focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Storage Type</label>
                        <select
                          value={locationType}
                          onChange={(e) => setLocationType(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl text-sm bg-bg-surface border border-border focus:outline-none focus:border-accent transition-all"
                        >
                          <option value="Display Case">Display Case</option>
                          <option value="Storage Box">Storage Box</option>
                          <option value="Binder/Folder">Binder/Folder</option>
                          <option value="Wishlist">Wishlist (Unacquired)</option>
                        </select>
                      </div>
                      <Input
                        label="Location Name"
                        id="loc-name"
                        placeholder="e.g. Living Room Shelf"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                      />
                    </div>

                    {/* Personal switches */}
                    <div className="flex flex-wrap items-center gap-6 border-t border-border pt-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFavorite}
                          onChange={(e) => setIsFavorite(e.target.checked)}
                          className="w-4 h-4 rounded border-border bg-bg-surface accent-accent"
                        />
                        Mark as Favorite
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isGrail}
                          onChange={(e) => setIsGrail(e.target.checked)}
                          className="w-4 h-4 rounded border-border bg-bg-surface accent-accent"
                        />
                        Is "Grail" Item
                      </label>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary">Personal Notes</label>
                      <textarea
                        placeholder="Store condition notes, purchase history, or trade info..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full p-3 rounded-xl text-sm bg-bg-surface border border-border focus:border-accent focus:outline-none transition-all resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-border">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setIsDrawerOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="accent"
                        className="flex-1"
                      >
                        {editingItem ? 'Save Item' : 'Add to Collection'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

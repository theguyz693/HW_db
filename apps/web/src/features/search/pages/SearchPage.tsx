import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Heart,
  Trash2,
  Bookmark,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { itemsService } from '@/lib/services/itemsService.ts';
import { collectionsService } from '@/lib/services/collectionsService.ts';
import { formatCurrency } from '@collectorhub/utilities';
import type { Item, Collection, ItemCondition } from '@collectorhub/shared-types';

export function SearchPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search/Filters
  // The header search sends ?q=…; keep the field in sync when it changes.
  const [params] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => params.get('q') ?? '');
  useEffect(() => {
    setSearchTerm(params.get('q') ?? '');
  }, [params]);
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCollectionId, setSelectedCollectionId] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allItems, allCols] = await Promise.all([
        itemsService.getAllItems(),
        collectionsService.getCollections(),
      ]);
      setItems(allItems);
      setCollections(allCols);
    } catch (err) {
      console.error('Error loading search items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (item: Item) => {
    await itemsService.toggleFavorite(item);
    await loadData();
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Delete this item from your collection?')) {
      await itemsService.deleteItem(id);
      await loadData();
    }
  };

  // Unique list of Brands for filter
  const brandsList = ['All', ...Array.from(new Set(items.map(it => it.brand))).filter(Boolean)];

  const filteredItems = items.filter(it => {
    const matchSearch = it.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        it.series.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        it.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        it.barcode.includes(searchTerm);
    const matchBrand = selectedBrand === 'All' || it.brand === selectedBrand;
    const matchCollection = selectedCollectionId === 'All' || it.collectionId === selectedCollectionId;
    const matchCondition = selectedCondition === 'All' || it.ownership.condition === selectedCondition;
    const matchFav = !onlyFavorites || it.personal.isFavorite;

    return matchSearch && matchBrand && matchCollection && matchCondition && matchFav;
  });

  const getCollectionName = (id: string) => {
    return collections.find(c => c._id === id)?.name || 'Unknown Collection';
  };

  const getCollectionSlug = (id: string) => {
    return collections.find(c => c._id === id)?.slug || '';
  };

  const conditionColorMap: Record<ItemCondition, string> = {
    mint: 'bg-emerald/10 text-emerald border-emerald/20',
    'near-mint': 'bg-cyan/10 text-cyan border-cyan/20',
    good: 'bg-amber/10 text-amber border-amber/20',
    fair: 'bg-orange/10 text-orange border-orange/20',
    poor: 'bg-rose/10 text-rose border-rose/20',
    sealed: 'bg-violet/10 text-violet border-violet/20',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Global Search & Inventory</h1>
        <p className="text-text-secondary mt-1">Search, filter, and discover collectibles across all your libraries</p>
      </div>

      {/* Control Panel */}
      <div className="p-5 rounded-3xl bg-bg-elevated border border-border space-y-4 shadow-sm">
        {/* Search Input */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Type model name, brand, series or UPC barcode..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-2xl text-sm bg-bg-surface border border-border hover:border-border-hover focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Collection Filter */}
          <div className="flex items-center gap-1.5 bg-bg-surface px-3.5 h-10 rounded-xl border border-border">
            <span className="text-xs text-text-muted font-medium">Collection:</span>
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none pr-2"
            >
              <option value="All">All Libraries</option>
              {collections.map(col => (
                <option key={col._id} value={col._id}>{col.name}</option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div className="flex items-center gap-1.5 bg-bg-surface px-3.5 h-10 rounded-xl border border-border">
            <span className="text-xs text-text-muted font-medium">Brand:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none pr-2"
            >
              {brandsList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div className="flex items-center gap-1.5 bg-bg-surface px-3.5 h-10 rounded-xl border border-border">
            <span className="text-xs text-text-muted font-medium">Condition:</span>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none pr-2"
            >
              <option value="All">All Conditions</option>
              <option value="mint">Mint</option>
              <option value="near-mint">Near Mint</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="sealed">Sealed</option>
            </select>
          </div>

          {/* Favorites Filter */}
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`h-10 px-3.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all duration-200 ${onlyFavorites ? 'bg-rose/10 text-rose border-rose/30 shadow-glow' : 'bg-bg-surface text-text-secondary border-border hover:border-border-hover'}`}
          >
            <Heart size={14} className={onlyFavorites ? 'fill-rose text-rose' : ''} />
            Favorites Only
          </button>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-text-muted px-1">
        <span>Found <strong className="text-text-primary">{filteredItems.length}</strong> matching items</span>
        <span>Total est. value: <strong className="text-accent font-bold">{formatCurrency(filteredItems.reduce((acc, it) => acc + (it.ownership.estimatedValue ?? 0), 0))}</strong></span>
      </div>

      {/* Items Results Table / Grid */}
      {isLoading ? (
        <div className="h-64 rounded-2xl bg-bg-elevated/50 border border-border animate-pulse" />
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 rounded-3xl bg-bg-elevated border border-border border-dashed">
          <p className="text-text-secondary font-medium">No collectibles found matching your filters</p>
          <p className="text-text-muted text-xs mt-1">Try broadening your search query or collection selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredItems.map((item) => {
              const mainImg = item.images.find(img => img.isPrimary) || item.images[0];
              const colSlug = getCollectionSlug(item.collectionId);
              const colName = getCollectionName(item.collectionId);

              return (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl bg-bg-elevated border border-border hover:border-border-hover overflow-hidden shadow-sm flex flex-col p-4 relative group hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-xl bg-bg-surface border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {mainImg?.url ? (
                        <img src={mainImg.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <Bookmark size={22} className="text-text-muted" />
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{item.brand}</span>
                        <div className="flex items-center gap-1.5">
                          {item.personal.isGrail && <Flame size={13} className="text-amber fill-amber" />}
                          <button
                            onClick={() => handleToggleFavorite(item)}
                            className="text-text-muted hover:text-rose cursor-pointer"
                            title="Favorite"
                          >
                            <Heart size={14} className={item.personal.isFavorite ? 'fill-rose text-rose' : ''} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="text-text-muted hover:text-error cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-text-primary mt-0.5 truncate group-hover:text-accent transition-colors">
                        <Link to={`/items/${item._id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-accent rounded">
                          {item.name}
                        </Link>
                      </h4>

                      <p className="text-xs text-text-secondary mt-0.5 truncate">
                        {item.series} {item.collectorNumber ? `#${item.collectorNumber}` : ''}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border capitalize ${conditionColorMap[item.ownership.condition] || 'bg-bg-surface text-text-secondary'}`}>
                          {item.ownership.condition}
                        </span>
                        <span className="text-xs font-bold text-emerald">
                          {item.ownership.estimatedValue ? formatCurrency(item.ownership.estimatedValue) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Collection reference footer */}
                  <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-text-muted truncate max-w-[180px]">In: <strong className="text-text-primary">{colName}</strong></span>
                    {colSlug && (
                      <Link
                        to={`/collections/${colSlug}`}
                        className="text-accent hover:underline flex items-center gap-1 font-semibold text-[11px]"
                      >
                        View in Collection <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

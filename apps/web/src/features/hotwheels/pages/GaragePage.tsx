// ──────────────────────────────────────────────
// My Garage — the whole collection in three views:
//   Shelf    — the lit display rack
//   Showcase — one car at a time on the floating 3D package
//   Grid     — top favourites first, then everything; as a list or as cards
// One set of filters drives all three.
// ──────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ScanBarcode, Search, LayoutGrid, Warehouse, RefreshCw, CarFront, Library, Box, List, Rows3 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { formatCurrency } from '@collectorhub/utilities';
import type { Item } from '@collectorhub/shared-types';
import { itemsService } from '@/lib/services/itemsService.ts';
import { Button } from '@/components/ui/Button.tsx';
import { GarageRack, GarageRackSkeleton } from '../components/GarageRack.tsx';
import { ShowcaseView } from '../components/ShowcaseView.tsx';
import { BlisterCard } from '../components/BlisterCard.tsx';
import { itemToCardData } from '../lib/cardData.ts';

type View = 'shelf' | 'showcase' | 'grid';
type GridStyle = 'list' | 'cards';
type SortKey = 'newest' | 'name' | 'series' | 'year';
type StatusFilter = 'owned' | 'wishlist' | 'all';
type LineFilter = 'all' | 'mainline' | 'premium';

const VIEW_KEY = 'collectorhub_garage_view';
const GRID_KEY = 'collectorhub_garage_grid';
const TOP_FAVOURITES = 9;

// There's no "product line" field, so it's derived from the series name. Mattel's
// premium ranges have recognisable series names; everything else counts as mainline.
const PREMIUM_SERIES = /boulevard|car culture|premium|team transport|pop culture|elite 64|red line club|\brlc\b|replica entertainment/i;
const isPremium = (it: Item) => PREMIUM_SERIES.test(it.series || '');

const VIEWS: { id: View; label: string; Icon: typeof Warehouse }[] = [
  { id: 'shelf', label: 'Shelf', Icon: Rows3 },
  { id: 'showcase', label: 'Showcase', Icon: Box },
  { id: 'grid', label: 'Grid', Icon: LayoutGrid },
];

function stored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (v === 'rack') return 'shelf' as T; // earlier name
    return allowed.includes(v as T) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* per-viewer convenience only */
  }
}

const selectClass =
  'px-3 py-2.5 rounded-xl bg-bg-elevated border border-border text-sm text-text-primary focus:outline-2 focus:outline-accent';

export function GaragePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const highlightId = params.get('added');

  const [items, setItems] = useState<Item[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const urlView = params.get('view') as View | null;
  const [view, setView] = useState<View>(() =>
    urlView && VIEWS.some((v) => v.id === urlView) ? urlView : stored(VIEW_KEY, ['shelf', 'showcase', 'grid'] as const, 'shelf'),
  );
  const [gridStyle, setGridStyle] = useState<GridStyle>(() => stored(GRID_KEY, ['list', 'cards'] as const, 'cards'));
  const [query, setQuery] = useState('');
  const [series, setSeries] = useState('all');
  const [line, setLine] = useState<LineFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('owned');
  const [sort, setSort] = useState<SortKey>('newest');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      setItems(await itemsService.getMyItems());
      setState('ready');
    } catch (err) {
      console.warn('Garage load failed:', err);
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeView = (v: View) => {
    setView(v);
    remember(VIEW_KEY, v);
    const next = new URLSearchParams(params);
    next.set('view', v);
    setParams(next, { replace: true });
  };

  const changeGridStyle = (g: GridStyle) => {
    setGridStyle(g);
    remember(GRID_KEY, g);
  };

  const seriesOptions = useMemo(
    () => [...new Set(items.map((it) => it.series).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((it) => {
      if (status !== 'all' && it.ownership?.status !== status) return false;
      if (series !== 'all' && it.series !== series) return false;
      if (line === 'premium' && !isPremium(it)) return false;
      if (line === 'mainline' && isPremium(it)) return false;
      if (!q) return true;
      return [it.name, it.series, it.modelNumber, it.releaseYear, ...(it.color ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
    const by: Record<SortKey, (a: Item, b: Item) => number> = {
      newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      name: (a, b) => a.name.localeCompare(b.name),
      series: (a, b) => (a.series || '').localeCompare(b.series || '') || a.name.localeCompare(b.name),
      year: (a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0),
    };
    return [...list].sort(by[sort]);
  }, [items, query, series, line, status, sort]);

  // Grid: best-rated favourites first (max 9), then everything else in the chosen order.
  const { topFavourites, rest } = useMemo(() => {
    const favs = visible
      .filter((it) => it.personal?.isFavorite)
      .sort((a, b) => (b.personal?.rating ?? 0) - (a.personal?.rating ?? 0) || +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, TOP_FAVOURITES);
    const ids = new Set(favs.map((f) => f._id));
    return { topFavourites: favs, rest: visible.filter((it) => !ids.has(it._id)) };
  }, [visible]);

  const rate = async (item: Item, rating: number | null) => {
    const before = item.personal?.rating ?? null;
    const patch = (r: number | null) =>
      setItems((list) => list.map((it) => (it._id === item._id ? { ...it, personal: { ...it.personal, rating: r } } : it)));
    patch(rating); // optimistic, keyed by id
    setSavingId(item._id);
    try {
      const saved = await itemsService.saveItem({ ...item, personal: { ...item.personal, rating } });
      patch(saved.personal?.rating ?? rating);
    } catch {
      patch(before);
      toast.error('Could not save your rating');
    } finally {
      setSavingId(null);
    }
  };

  const owned = items.filter((it) => it.ownership?.status === 'owned');
  const carCount = owned.reduce((n, it) => n + (it.ownership?.duplicateCount ?? 1), 0);
  const value = owned.reduce((n, it) => n + (it.ownership?.estimatedValue ?? 0), 0);
  const filtersActive = query || series !== 'all' || line !== 'all' || status !== 'owned';

  const clearFilters = () => {
    setQuery('');
    setSeries('all');
    setLine('all');
    setStatus('owned');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Header + view switcher */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-text-primary">My Garage</h1>
          {state === 'ready' && (
            <p className="text-sm text-text-secondary mt-1">
              {carCount} car{carCount === 1 ? '' : 's'}
              {value > 0 && <> · est. {formatCurrency(value)}</>}
            </p>
          )}
        </div>
        <div role="tablist" aria-label="Garage view" className="flex rounded-xl border border-border bg-bg-elevated p-1 self-start md:self-auto">
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              onClick={() => changeView(id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-accent',
                view === id ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary',
              )}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </header>

      {/* Filters — apply to every view */}
      <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search by name</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, code, colour…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-2 focus:outline-accent"
          />
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          <label>
            <span className="sr-only">Series</span>
            <select value={series} onChange={(e) => setSeries(e.target.value)} className={selectClass}>
              <option value="all">All series</option>
              {seriesOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Line</span>
            <select value={line} onChange={(e) => setLine(e.target.value as LineFilter)} className={selectClass}>
              <option value="all">Mainline + premium</option>
              <option value="mainline">Mainline</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={selectClass}>
              <option value="owned">Owned</option>
              <option value="wishlist">Wishlist</option>
              <option value="all">Owned + wishlist</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass}>
              <option value="newest">Newest first</option>
              <option value="name">Name A–Z</option>
              <option value="series">Series</option>
              <option value="year">Year</option>
            </select>
          </label>
          {filtersActive && (
            <button onClick={clearFilters} className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary cursor-pointer">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {state === 'loading' && <GarageRackSkeleton />}

      {state === 'error' && (
        <div className="rounded-2xl border border-border bg-bg-elevated p-10 text-center space-y-3" role="alert">
          <p className="font-semibold text-text-primary">We couldn't load your garage.</p>
          <p className="text-sm text-text-secondary">Check your connection and try again.</p>
          <Button variant="secondary" leftIcon={<RefreshCw size={16} />} onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {state === 'ready' && items.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border bg-bg-elevated/60 p-10 sm:p-16 text-center space-y-4">
          <CarFront size={44} className="mx-auto text-accent" strokeWidth={1.25} />
          <h2 className="text-xl font-bold text-text-primary">Your garage is empty</h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Snap a photo of a carded or loose Hot Wheels car and we'll find it in the catalogue — or add one from a collection.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" leftIcon={<ScanBarcode size={16} />} onClick={() => navigate('/scan')}>
              Scan your first car
            </Button>
            <Button variant="secondary" leftIcon={<Library size={16} />} onClick={() => navigate('/collections')}>
              Go to collections
            </Button>
          </div>
        </div>
      )}

      {state === 'ready' && items.length > 0 && view === 'showcase' && (
        <ShowcaseView items={visible} onRate={rate} savingId={savingId} />
      )}

      {state === 'ready' && items.length > 0 && view !== 'showcase' && visible.length === 0 && (
        <p className="text-center text-text-secondary py-12">No cars match those filters.</p>
      )}

      {state === 'ready' && view === 'shelf' && visible.length > 0 && <GarageRack items={visible} highlightId={highlightId} />}

      {state === 'ready' && view === 'grid' && visible.length > 0 && (
        <div className="space-y-8">
          <div className="flex justify-end">
            <div role="radiogroup" aria-label="Grid style" className="flex rounded-lg border border-border bg-bg-elevated p-0.5 text-xs">
              {(
                [
                  ['cards', 'Cards', LayoutGrid],
                  ['list', 'List', List],
                ] as const
              ).map(([g, label, Icon]) => (
                <button
                  key={g}
                  role="radio"
                  aria-checked={gridStyle === g}
                  onClick={() => changeGridStyle(g)}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-accent',
                    gridStyle === g ? 'bg-bg-hover text-text-primary' : 'text-text-muted hover:text-text-primary',
                  )}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>
          {topFavourites.length > 0 && (
            <GridSection title="Top favourites" items={topFavourites} style={gridStyle} highlightId={highlightId} />
          )}
          {rest.length > 0 && (
            <GridSection title={topFavourites.length ? 'Everything else' : 'All cars'} items={rest} style={gridStyle} highlightId={highlightId} />
          )}
        </div>
      )}
    </div>
  );
}

function GridSection({ title, items, style, highlightId }: { title: string; items: Item[]; style: GridStyle; highlightId: string | null }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-text-secondary">
        {title} <span className="text-text-muted font-normal">· {items.length}</span>
      </h2>
      {style === 'cards' ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" role="list">
          {items.map((it) => (
            <li key={it._id} className={clsx(it._id === highlightId && 'ring-2 ring-accent rounded-2xl')}>
              <BlisterCard data={itemToCardData(it)} href={`/items/${it._id}`} size="fluid" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" role="list">
          {items.map((it) => {
            const img = it.images?.find((i) => i.isPrimary) ?? it.images?.[0];
            return (
              <li key={it._id}>
                <Link
                  to={`/items/${it._id}`}
                  className={clsx(
                    'flex gap-3 p-3 rounded-2xl bg-bg-elevated border border-border hover:border-border-hover focus-visible:outline-2 focus-visible:outline-accent',
                    it._id === highlightId && 'ring-2 ring-accent',
                  )}
                >
                  <div className="w-20 h-16 shrink-0 rounded-xl bg-bg-surface overflow-hidden grid place-items-center">
                    {img ? (
                      <img src={img.thumbnail || img.url} referrerPolicy="no-referrer" alt="" loading="lazy" className="w-full h-full object-contain" />
                    ) : (
                      <CarFront className="text-text-muted" size={24} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary truncate">{it.name}</p>
                    <p className="text-xs text-text-secondary truncate">
                      {[it.series, it.releaseYear, it.modelNumber].filter(Boolean).join(' · ')}
                    </p>
                    {(it.ownership?.duplicateCount ?? 1) > 1 && (
                      <p className="text-xs text-accent mt-1">×{it.ownership.duplicateCount} copies</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

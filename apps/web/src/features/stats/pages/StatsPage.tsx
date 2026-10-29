// ──────────────────────────────────────────────
// Statistics — a calm bento of facts about the collection.
// Big numbers, short labels, simple bars with their values written out
// (never colour alone). Everything is computed from the user's own cars.
// ──────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Star, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@collectorhub/utilities';
import type { Collection, Item } from '@collectorhub/shared-types';
import { itemsService } from '@/lib/services/itemsService.ts';
import { collectionsService } from '@/lib/services/collectionsService.ts';
import { BrandLogo } from '@/components/ui/BrandLogo.tsx';

/** Counts up to `value` once (≈900ms, ease-out); static under reduced motion. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? value : 0,
  );
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setShown(value);
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 900);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // Frames can be throttled (background tabs); never leave a wrong number on screen.
    const done = window.setTimeout(() => setShown(value), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [value]);
  return <>{shown}</>;
}

function Thumb({ item }: { item: Item }) {
  const img = item.images?.find((i) => i.isPrimary) ?? item.images?.[0];
  return (
    <span className="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-bg-surface ring-1 ring-border">
      {img && <img src={img.thumbnail || img.url} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover" />}
    </span>
  );
}

function Tile({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={`relative rounded-[28px] bg-bg-elevated border border-border shadow-card p-6 sm:p-7 overflow-hidden before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent ${className}`}
    >
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] font-medium text-text-muted">{children}</h2>;
}

function daysAgo(iso: string) {
  const d = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

export function StatsPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    itemsService.getMyItems().then(setItems).catch(() => setItems([]));
    collectionsService.getCollections().then(setCollections).catch(() => setCollections([]));
  }, []);

  const s = useMemo(() => {
    const owned = (items ?? []).filter((it) => it.ownership?.status === 'owned');
    const cars = owned.reduce((n, it) => n + (it.ownership?.duplicateCount ?? 1), 0);
    const bySeries = new Map<string, number>();
    const byYear = new Map<number, number>();
    for (const it of owned) {
      const k = it.series || 'Unknown series';
      bySeries.set(k, (bySeries.get(k) ?? 0) + 1);
      if (it.releaseYear) byYear.set(it.releaseYear, (byYear.get(it.releaseYear) ?? 0) + 1);
    }
    const series = [...bySeries.entries()].sort((a, b) => b[1] - a[1]);
    const years = [...byYear.entries()].sort((a, b) => a[0] - b[0]);
    const rated = owned.filter((it) => it.personal?.rating);
    const avgRating = rated.length ? rated.reduce((n, it) => n + (it.personal!.rating ?? 0), 0) / rated.length : null;
    const carded = owned.filter((it) => it.ownership?.condition === 'sealed').length;
    const valued = owned.filter((it) => (it.ownership?.estimatedValue ?? 0) > 0);
    return {
      owned,
      cars,
      wishlist: (items ?? []).filter((it) => it.ownership?.status === 'wishlist').length,
      series,
      years,
      favourites: owned.filter((it) => it.personal?.isFavorite).length,
      avgRating,
      ratedCount: rated.length,
      topRated: [...rated].sort((a, b) => (b.personal!.rating ?? 0) - (a.personal!.rating ?? 0)).slice(0, 3),
      carded,
      loose: owned.length - carded,
      value: valued.reduce((n, it) => n + (it.ownership?.estimatedValue ?? 0), 0),
      valuedCount: valued.length,
      newest: [...owned].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0],
    };
  }, [items]);

  if (items === null) {
    return (
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-6 gap-4" aria-busy="true">
        {['md:col-span-4', 'md:col-span-2', 'md:col-span-2', 'md:col-span-2', 'md:col-span-2', 'md:col-span-6'].map((span, i) => (
          <div key={i} className={`h-44 rounded-[28px] bg-bg-elevated animate-pulse ${span}`} />
        ))}
      </div>
    );
  }

  if (!s.owned.length) {
    return (
      <div className="max-w-xl mx-auto text-center py-24 space-y-3">
        <h1 className="text-4xl font-bold text-text-primary">Nothing to count yet</h1>
        <p className="text-text-secondary">Add a few cars and your collection's story shows up here.</p>
        <Link to="/scan" className="inline-flex items-center gap-1 text-accent font-semibold">
          Scan a car <ArrowUpRight size={16} />
        </Link>
      </div>
    );
  }

  const maxSeries = s.series[0]?.[1] ?? 1;
  const maxYear = Math.max(1, ...s.years.map(([, n]) => n));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">Statistics</h1>
        <p className="text-lg text-text-secondary mt-2">Your collection, by the numbers.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Headline: a dark showpiece in either theme */}
        <section className="relative md:col-span-4 min-h-[260px] rounded-[28px] overflow-hidden p-7 sm:p-8 flex flex-col justify-between text-white bg-[radial-gradient(120%_120%_at_100%_0%,#5b0f16_0%,#24070b_40%,#0b0b0d_75%)] shadow-[0_30px_60px_-30px_rgba(91,15,22,0.65)] ring-1 ring-white/10">
          <BrandLogo className="pointer-events-none absolute -right-10 -bottom-6 w-[70%] max-w-[420px] opacity-[0.13] rotate-[-6deg]" />
          <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <h2 className="relative text-[13px] font-medium text-white/60">In your garage</h2>
          <div className="relative">
            <p className="text-8xl sm:text-9xl font-bold tracking-tighter tabular-nums leading-none bg-gradient-to-b from-white via-white to-zinc-400 bg-clip-text text-transparent">
              <CountUp value={s.cars} />
            </p>
            <p className="text-white/70 mt-4 text-[15px]">
              cars across {s.series.length} series and {collections.length} collection{collections.length === 1 ? '' : 's'}
              {s.wishlist > 0 && <> · {s.wishlist} on the wishlist</>}
            </p>
          </div>
        </section>

        {/* Favourites & rating */}
        <Tile className="md:col-span-2 flex flex-col justify-between">
          <Label>Favourites</Label>
          <div>
            <p className="text-6xl font-bold tracking-tight tabular-nums text-text-primary">
              <CountUp value={s.favourites} />
            </p>
            <p className="text-sm text-text-secondary mt-2 flex items-center gap-1.5">
              {s.avgRating !== null ? (
                <>
                  <Star size={14} className="fill-accent text-accent" />
                  {s.avgRating.toFixed(1)} average from {s.ratedCount} rated
                </>
              ) : (
                'No ratings yet'
              )}
            </p>
          </div>
        </Tile>

        {/* Carded vs loose */}
        <Tile className="md:col-span-2">
          <Label>Carded vs loose</Label>
          <p className="text-3xl font-bold tabular-nums text-text-primary mt-4">
            {s.carded} <span className="text-text-muted font-medium">/ {s.loose}</span>
          </p>
          <div className="mt-4 h-2.5 rounded-full bg-bg-surface overflow-hidden flex" aria-hidden="true">
            <div className="bg-gradient-to-r from-accent-muted to-accent rounded-full" style={{ width: `${(s.carded / s.owned.length) * 100}%` }} />
          </div>
          <p className="text-xs text-text-muted mt-2">
            {Math.round((s.carded / s.owned.length) * 100)}% still on the card
          </p>
        </Tile>

        {/* Value */}
        <Tile className="md:col-span-2">
          <Label>Estimated value</Label>
          {s.valuedCount ? (
            <>
              <p className="text-3xl font-bold tabular-nums text-text-primary mt-4">{formatCurrency(s.value)}</p>
              <p className="text-xs text-text-muted mt-2">
                from {s.valuedCount} of {s.owned.length} cars with a value set
              </p>
            </>
          ) : (
            <p className="text-sm text-text-secondary mt-4">Add values on a car's details to see a total.</p>
          )}
        </Tile>

        {/* Newest */}
        <Tile className="md:col-span-2">
          <Label>Newest addition</Label>
          {s.newest && (
            <Link to={`/items/${s.newest._id}`} className="group flex items-start gap-3 mt-4">
              <Thumb item={s.newest} />
              <span className="min-w-0">
                <span className="block text-lg font-semibold leading-snug text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                  {s.newest.name}
                </span>
                <span className="block text-sm text-text-secondary mt-1">
                  {[s.newest.series, s.newest.releaseYear].filter(Boolean).join(' · ')} · added {daysAgo(s.newest.createdAt)}
                </span>
              </span>
            </Link>
          )}
        </Tile>

        {/* Series breakdown */}
        <Tile className="md:col-span-4">
          <Label>By series</Label>
          <ul className="mt-5 space-y-3">
            {s.series.slice(0, 8).map(([name, n]) => (
              <li key={name} className="grid grid-cols-[minmax(0,10rem)_1fr_2rem] items-center gap-3 text-sm">
                <span className="truncate text-text-secondary">{name}</span>
                <span className="h-2 rounded-full bg-bg-surface overflow-hidden" aria-hidden="true">
                  <span className="block h-full rounded-full bg-gradient-to-r from-accent-muted to-accent" style={{ width: `${(n / maxSeries) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums text-text-primary font-medium">{n}</span>
              </li>
            ))}
          </ul>
          {s.series.length > 8 && <p className="text-xs text-text-muted mt-4">+ {s.series.length - 8} more series</p>}
        </Tile>

        {/* Top rated */}
        <Tile className="md:col-span-2">
          <Label>Top rated</Label>
          {s.topRated.length ? (
            <ol className="mt-4 space-y-3">
              {s.topRated.map((it) => (
                <li key={it._id}>
                  <Link to={`/items/${it._id}`} className="group flex items-center gap-3">
                    <Thumb item={it} />
                    <span className="flex-1 min-w-0 text-sm font-medium text-text-primary group-hover:text-accent transition-colors line-clamp-2">{it.name}</span>
                    <span className="shrink-0 flex items-center gap-1 text-sm tabular-nums text-text-secondary">
                      <Star size={13} className="fill-accent text-accent" /> {it.personal?.rating}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-text-secondary mt-4">Rate cars in the showcase to see them here.</p>
          )}
        </Tile>

        {/* Release years */}
        {s.years.length > 0 && (
          <Tile className="md:col-span-6">
            <Label>By release year</Label>
            <div className="mt-6 flex items-end gap-3 h-40" role="list">
              {s.years.map(([year, n]) => (
                <div key={year} role="listitem" className="flex-1 min-w-0 flex flex-col items-center justify-end gap-2 h-full">
                  <span className="text-xs tabular-nums text-text-primary font-medium">{n}</span>
                  <span
                    className="w-full max-w-14 rounded-t-xl bg-gradient-to-t from-accent-muted to-accent shadow-[0_-8px_20px_-8px_var(--color-accent-glow)]"
                    style={{ height: `${Math.max(6, (n / maxYear) * 100)}%` }}
                    aria-hidden="true"
                  />
                  <span className="text-xs tabular-nums text-text-muted">{year}</span>
                </div>
              ))}
            </div>
          </Tile>
        )}
      </div>
    </div>
  );
}

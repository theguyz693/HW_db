// ──────────────────────────────────────────────
// ShowcaseView — the garage's selection-screen view: one car at a time on the
// floating 3D package, with specs and rating beside it.
//
// It receives the garage's already-filtered list, so search/series/line filters
// apply here too. Selection is tracked by item id (not index), so filtering can
// never pair one car's package with another car's details.
// ──────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import clsx from 'clsx';
import type { Item } from '@collectorhub/shared-types';
import { PackageHero3D } from './PackageHero3D.tsx';
import { itemToCardData } from '../lib/cardData.ts';
import { findCardedImage } from '../lib/cardedImage.ts';
import './showcase.css';

function specsFor(item: Item): [string, string][] {
  const meta = item.customMetadata ?? {};
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const rows: [string, string][] = [
    ['Year', item.releaseYear ? String(item.releaseYear) : ''],
    ['Toy code', item.modelNumber || ''],
    ['Collector #', item.collectorNumber || ''],
    ['Variant', str(meta.variant)],
    ['Colour', (item.color ?? []).join(' / ')],
    ['Scale', item.scale || ''],
    ['Line', [item.manufacturer, item.brand].filter((v, i, a) => v && a.indexOf(v) === i).join(' · ')],
  ];
  return rows.filter(([, v]) => v);
}

function StarRating({ value, onChange, disabled }: { value: number | null; onChange: (v: number | null) => void; disabled?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label="Your rating" className="flex" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            disabled={disabled}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="p-1 rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--sc-red)] disabled:cursor-wait"
          >
            <Star size={22} className={n <= shown ? 'fill-[var(--sc-red)] text-[var(--sc-red)]' : 'text-white/25'} />
          </button>
        ))}
      </div>
      {value ? (
        <button type="button" onClick={() => onChange(null)} disabled={disabled} className="text-xs text-white/45 hover:text-white/80 underline-offset-2 hover:underline cursor-pointer">
          Clear
        </button>
      ) : (
        <span className="text-xs text-white/40">Not rated</span>
      )}
    </div>
  );
}

/** Graded night-garage environment; stable while cars change. Gentle pointer parallax only. */
function Stage({ children, center }: { children: React.ReactNode; center?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const reduced = useReducedMotion();

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType === 'touch' || !ref.current) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--px', `${(-px * 14).toFixed(1)}px`);
      el.style.setProperty('--py', `${(-py * 10).toFixed(1)}px`);
    });
  };

  return (
    <div ref={ref} className={clsx('sc-stage', center && 'grid place-items-center text-center px-6')} onPointerMove={onPointerMove}>
      <div className="sc-env" aria-hidden="true">
        <div className="sc-env-photo" />
        <div className="sc-env-light" />
        <div className="sc-env-vignette" />
      </div>
      <div className="sc-content">{children}</div>
    </div>
  );
}

interface ShowcaseViewProps {
  items: Item[];
  onRate: (item: Item, rating: number | null) => void;
  savingId?: string | null;
}

export function ShowcaseView({ items, onRate, savingId }: ShowcaseViewProps) {
  const reduced = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dir, setDir] = useState(1);
  const stripRef = useRef<HTMLUListElement>(null);

  const count = items.length;
  const found = useMemo(() => items.findIndex((it) => it._id === selectedId), [items, selectedId]);
  const index = found >= 0 ? found : 0;
  const car = items[index];

  // Wraps at both ends.
  const go = useCallback(
    (step: number) => {
      if (count < 2) return;
      setDir(step);
      setSelectedId(items[(((index + step) % count) + count) % count]!._id);
    },
    [count, index, items],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest('input, textarea, select, [contenteditable="true"], [role="radiogroup"]')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // Warm neighbours' card lookups; keep the active thumbnail in view.
  useEffect(() => {
    if (count < 2) return;
    findCardedImage(items[(index + 1) % count]?.modelNumber);
    findCardedImage(items[(index - 1 + count) % count]?.modelNumber);
    // Scroll only the strip sideways — scrollIntoView would also jump the page vertically.
    const strip = stripRef.current;
    const thumb = strip?.querySelector<HTMLElement>('[aria-current="true"]');
    if (strip && thumb) {
      const left = thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2;
      strip.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [index, count, items, reduced]);

  const cardData = useMemo(() => (car ? itemToCardData(car) : undefined), [car]);

  if (!car) {
    return (
      <Stage center>
        <div className="max-w-sm space-y-3 py-24">
          <p className="sc-eyebrow">Showcase</p>
          <p className="text-2xl font-black text-white tracking-tight">No cars match these filters</p>
          <p className="text-white/55 text-sm">Clear a filter to bring cars back onto the stage.</p>
        </div>
      </Stage>
    );
  }

  const specs = specsFor(car);
  const seriesLine = [car.series, typeof car.customMetadata?.seriesNumber === 'string' ? car.customMetadata.seriesNumber : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <Stage>
      <div className="sc-inner">
        <section className="sc-layout" aria-roledescription="slide" aria-label={`${index + 1} of ${count}: ${car.name}`}>
          {/* One persistent 3D scene: switching cars repaints the card behind a quick flip. */}
          <Link to={`/items/${car._id}`} className="sc-hero" aria-label={`Open details for ${car.name}`}>
            <PackageHero3D car={cardData} direction={dir} />
            <span className="sc-floor" aria-hidden="true" />
          </Link>

          {/* Keyed on the car with no exit phase: the panel always shows the selected car. */}
          <motion.div
            key={car._id}
            className="sc-panel"
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.24, ease: 'easeOut' }}
          >
            {seriesLine && <p className="sc-eyebrow">{seriesLine}</p>}
            <h2 className="sc-name">{car.name}</h2>
            <StarRating value={car.personal?.rating ?? null} onChange={(v) => onRate(car, v)} disabled={savingId === car._id} />
            {specs.length > 0 && (
              <dl className="sc-specs">
                {specs.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {car.personal?.notes && <p className="sc-notes">“{car.personal.notes}”</p>}
            <Link to={`/items/${car._id}`} className="sc-link">
              Full details <ChevronRight size={15} />
            </Link>
          </motion.div>
        </section>

        {count > 1 && (
          <nav className="sc-nav" aria-label="Choose car">
            <button type="button" className="sc-arrow" onClick={() => go(-1)} aria-label="Previous car">
              <ChevronLeft size={22} />
            </button>
            <span className="sc-count" aria-live="polite">
              {String(index + 1).padStart(2, '0')} <span>/ {String(count).padStart(2, '0')}</span>
            </span>
            <button type="button" className="sc-arrow" onClick={() => go(1)} aria-label="Next car">
              <ChevronRight size={22} />
            </button>
          </nav>
        )}

        {count > 1 && (
          <ul ref={stripRef} className="sc-strip" role="list" aria-label="All cars in this view">
            {items.map((it, i) => {
              const img = it.images?.find((x) => x.isPrimary) ?? it.images?.[0];
              return (
                <li key={it._id}>
                  <button
                    type="button"
                    aria-label={it.name}
                    aria-current={i === index}
                    onClick={() => {
                      setDir(i >= index ? 1 : -1);
                      setSelectedId(it._id);
                    }}
                    className={clsx('sc-thumb', i === index && 'is-active')}
                  >
                    {img ? <img src={img.thumbnail || img.url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>{it.name.slice(0, 2)}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Stage>
  );
}

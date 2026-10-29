// ──────────────────────────────────────────────
// BlisterCard — the standard package frame used everywhere (catalogue, rack,
// showcase, scan results, detail page).
//
// One silhouette for every product: an acrylic protector case holding either
//  • package — a real photo of the retail card (owner-marked, or found on the
//              Hot Wheels Wiki by toy code). Shown whole; never re-packaged.
//  • cutout  — a transparent/backdrop-removed car, scaled to the blister.
//  • scene   — a busy photo, shown as an insert inside the blister.
//  • empty   — no usable image.
// For the last three the backing is CollectorHub display art, labelled as such.
// Layers: case → backing (tab, art) → blister tray → product → blister gloss →
//         plate → case gloss → pointer glare.
// ──────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { CarFront } from 'lucide-react';
import clsx from 'clsx';
import { paletteForSeries, type BlisterCardData } from '../lib/cardData.ts';
import { findCardedImage } from '../lib/cardedImage.ts';
import { prepareImage } from '../lib/imagePrep.ts';
import './package-frame.css';

export type BlisterCardSize = 'sm' | 'md' | 'lg' | 'fluid';

interface BlisterCardProps {
  data: BlisterCardData;
  /** Destination for the open animation. Omit to render a non-link card. */
  href?: string;
  /** Called instead of navigating (e.g. selecting a scan candidate). */
  onSelect?: (data: BlisterCardData) => void;
  selected?: boolean;
  size?: BlisterCardSize;
  /** Disable pointer tilt (e.g. dense grids). */
  static?: boolean;
  className?: string;
  /** Small overlay badge, e.g. "×3" or "Grail". */
  badge?: string;
}

type View =
  | { mode: 'pending' }
  | { mode: 'empty' }
  | { mode: 'package' | 'cutout' | 'scene'; src: string };

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

async function resolveView(data: BlisterCardData): Promise<View> {
  const kind = data.imageKind ?? 'auto';
  const url = data.imageUrl || null;
  if (kind === 'package' && url) return { mode: 'package', src: url };
  if (kind === 'auto') {
    const carded = await findCardedImage(data.modelNumber);
    if (carded) return { mode: 'package', src: carded };
  }
  if (!url) return { mode: 'empty' };
  const prepared = await prepareImage(url, kind === 'package' ? 'scene' : kind);
  return { mode: prepared.mode, src: prepared.src };
}

export function BlisterCard({
  data,
  href,
  onSelect,
  selected,
  size = 'md',
  static: isStatic,
  className,
  badge,
}: BlisterCardProps) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [view, setView] = useState<View>({ mode: 'pending' });
  const [loaded, setLoaded] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let alive = true;
    setView({ mode: 'pending' });
    setLoaded(false);
    resolveView(data).then((v) => alive && setView(v));
    return () => {
      alive = false;
    };
    // Re-resolve only when the inputs that decide the view change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.imageUrl, data.modelNumber, data.imageKind]);

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
  }, []);

  // A failed layer degrades one step: card photo → original photo → empty.
  const handleImgError = () => {
    setLoaded(false);
    setView((v) =>
      'src' in v && data.imageUrl && v.src !== data.imageUrl ? { mode: 'scene', src: data.imageUrl } : { mode: 'empty' },
    );
  };

  const palette = paletteForSeries(data.series);
  const fit = data.imageFit ?? { scale: 1, x: 0, y: 0 };

  // ── Pointer tilt (mouse/pen only; touch gets a press state instead) ──
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isStatic || e.pointerType === 'touch' || prefersReducedMotion()) return;
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.setProperty('--ry', `${(px - 0.5) * 12}deg`);
        el.style.setProperty('--rx', `${(0.5 - py) * 10}deg`);
        el.style.setProperty('--gx', `${px * 100}%`);
        el.style.setProperty('--gy', `${py * 100}%`);
      });
    },
    [isStatic],
  );

  const resetTilt = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  const handleActivate = (e: MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(data);
      return;
    }
    if (!href) return;
    // Let the browser handle new-tab / modified clicks.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (prefersReducedMotion()) {
      navigate(href);
      return;
    }
    setOpening(true);
    window.setTimeout(() => navigate(href), 320);
  };

  const meta = [data.releaseYear, data.modelNumber].filter(Boolean).join(' · ');
  const label = [data.name, data.series, data.releaseYear].filter(Boolean).join(', ');
  const imgProps = {
    alt: '',
    loading: 'lazy' as const,
    decoding: 'async' as const,
    referrerPolicy: 'no-referrer' as const,
    onLoad: () => setLoaded(true),
    onError: handleImgError,
  };

  const inner = (
    <div
      ref={cardRef}
      className={clsx('bc-card', `bc-card--${view.mode}`, opening && 'is-opening')}
      style={
        {
          '--pk-base': palette.base,
          '--pk-deep': palette.deep,
          '--pk-accent': palette.stripe,
        } as CSSProperties
      }
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      <div className={clsx('bc-case', (view.mode === 'pending' || ('src' in view && !loaded)) && 'is-waiting')}>
        {view.mode === 'package' ? (
          <img src={view.src} className={clsx('pk-full', loaded && 'is-loaded')} {...imgProps} />
        ) : view.mode !== 'pending' ? (
          <div className="pk" aria-hidden="true">
            <div className="pk-backing">
              <div className="pk-tab">
                <span className="pk-hole" />
              </div>
              <div className="pk-body">
                <div className="pk-band" />
                <div className="pk-head">
                  <span className="pk-brand">{data.brand || 'Hot Wheels'}</span>
                  {data.collectorNumber && <span className="pk-num">{data.collectorNumber}</span>}
                </div>
                {data.series && <div className="pk-series">{data.series}</div>}
              </div>
            </div>

            <div className="pk-blister">
              <div className="pk-tray" />
              {view.mode === 'cutout' && (
                <img
                  src={view.src}
                  className={clsx('pk-car', loaded && 'is-loaded')}
                  style={{ '--fx': `${fit.x}%`, '--fy': `${fit.y}%`, '--fs': fit.scale } as CSSProperties}
                  {...imgProps}
                />
              )}
              {view.mode === 'scene' && (
                <img
                  src={view.src}
                  className={clsx('pk-photo', loaded && 'is-loaded')}
                  style={{ objectPosition: `${50 + fit.x}% ${50 + fit.y}%`, '--fs': fit.scale } as CSSProperties}
                  {...imgProps}
                />
              )}
              {view.mode === 'empty' && (
                <div className="pk-empty">
                  <CarFront size={36} strokeWidth={1.1} />
                </div>
              )}
              <div className="pk-gloss" />
            </div>

            <div className="pk-plate">
              <div className="pk-name">{data.name || 'Unknown casting'}</div>
              {meta && <div className="pk-meta">{meta}</div>}
            </div>
            <div className="pk-label">Display card</div>
          </div>
        ) : null}
        <div className="bc-case-gloss" aria-hidden="true" />
      </div>

      <div className="bc-glare" aria-hidden="true" />
      {badge && <span className="bc-badge">{badge}</span>}
    </div>
  );

  const wrapperClass = clsx('bc-scene', `bc-size-${size}`, selected && 'is-selected', className);

  if (href) {
    return (
      <Link to={href} className={wrapperClass} aria-label={label} onClick={handleActivate}>
        {inner}
      </Link>
    );
  }
  if (onSelect) {
    return (
      <button type="button" className={wrapperClass} aria-label={label} aria-pressed={selected} onClick={handleActivate}>
        {inner}
      </button>
    );
  }
  return (
    <div className={wrapperClass} role="img" aria-label={label}>
      {inner}
    </div>
  );
}

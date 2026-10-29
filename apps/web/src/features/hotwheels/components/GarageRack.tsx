// ──────────────────────────────────────────────
// GarageRack — wall-mounted display rack of BlisterCards.
// Pure CSS depth: pegboard back plane, LED strip, shelf lip, cast shadows.
// Rows are computed from the container width so every row gets a shelf.
// ──────────────────────────────────────────────

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Item } from '@collectorhub/shared-types';
import { BlisterCard } from './BlisterCard.tsx';
import { itemToCardData } from '../lib/cardData.ts';
import './garage.css';

const ROWS_PER_PAGE = 6;

interface GarageRackProps {
  items: Item[];
  highlightId?: string | null;
}

function useColumns(ref: React.RefObject<HTMLElement | null>) {
  const [cols, setCols] = useState(4);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const card = w < 520 ? 136 : w < 900 ? 156 : 172;
      const gap = w < 520 ? 16 : 28;
      setCols(Math.max(2, Math.floor((w - 32 + gap) / (card + gap))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return cols;
}

export function GarageRack({ items, highlightId }: GarageRackProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cols = useColumns(wrapRef);
  const [visibleRows, setVisibleRows] = useState(ROWS_PER_PAGE);

  const rows = useMemo(() => {
    const out: Item[][] = [];
    for (let i = 0; i < items.length; i += cols) out.push(items.slice(i, i + cols));
    return out;
  }, [items, cols]);

  // Make sure a freshly added car is on a visible row.
  useEffect(() => {
    if (!highlightId) return;
    const idx = items.findIndex((it) => it._id === highlightId);
    if (idx >= 0) {
      const row = Math.floor(idx / cols);
      if (row >= visibleRows) setVisibleRows(row + 1);
      requestAnimationFrame(() =>
        document.getElementById(`rack-${highlightId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, items, cols]);

  const shown = rows.slice(0, visibleRows);

  return (
    <div ref={wrapRef} className="rack" style={{ '--rack-cols': cols } as React.CSSProperties}>
      <div className="rack-cabinet">
        {shown.map((row, r) => (
          <section key={r} className="rack-row" aria-label={`Shelf ${r + 1}`} style={{ '--row-i': r % ROWS_PER_PAGE } as React.CSSProperties}>
            <div className="rack-led" aria-hidden="true" />
            <ul className="rack-slots" role="list">
              {row.map((item) => {
                const count = item.ownership?.duplicateCount ?? 1;
                return (
                  <li
                    key={item._id}
                    id={`rack-${item._id}`}
                    className={item._id === highlightId ? 'rack-slot is-new' : 'rack-slot'}
                  >
                    <span className="rack-peg" aria-hidden="true" />
                    <BlisterCard
                      data={itemToCardData(item)}
                      href={`/items/${item._id}`}
                      size="fluid"
                      badge={count > 1 ? `×${count}` : item.personal?.isGrail ? 'Grail' : undefined}
                    />
                    <span className="rack-shadow" aria-hidden="true" />
                  </li>
                );
              })}
            </ul>
            <div className="rack-shelf" aria-hidden="true" />
          </section>
        ))}
      </div>

      {rows.length > visibleRows && (
        <div className="flex justify-center pt-6">
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-bg-elevated border border-border text-sm font-semibold text-text-primary hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
            onClick={() => setVisibleRows((v) => v + ROWS_PER_PAGE)}
          >
            Show more shelves ({items.length - visibleRows * cols} more cars)
          </button>
        </div>
      )}
    </div>
  );
}

export function GarageRackSkeleton() {
  return (
    <div className="rack" aria-busy="true" aria-label="Loading your garage">
      <div className="rack-cabinet">
        {[0, 1].map((r) => (
          <div key={r} className="rack-row">
            <div className="rack-led" />
            <div className="rack-slots" style={{ '--rack-cols': 5 } as React.CSSProperties}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rack-slot">
                  <div className="rack-skeleton" />
                </div>
              ))}
            </div>
            <div className="rack-shelf" />
          </div>
        ))}
      </div>
    </div>
  );
}

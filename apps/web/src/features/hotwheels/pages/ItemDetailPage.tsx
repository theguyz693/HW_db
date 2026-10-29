// ──────────────────────────────────────────────
// Item Detail Page — the canonical product view for a collected car
// ──────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Heart, Trash2, Pencil, ExternalLink, Warehouse, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@collectorhub/utilities';
import type { Collection, Item } from '@collectorhub/shared-types';
import { itemsService } from '@/lib/services/itemsService.ts';
import { collectionsService } from '@/lib/services/collectionsService.ts';
import { useAuth } from '@/providers/AuthProvider.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { BlisterCard } from '../components/BlisterCard.tsx';
import { itemToCardData, type ImageFit, type ImageKind } from '../lib/cardData.ts';

const KIND_LABELS: Record<ImageKind, string> = {
  auto: 'Automatic',
  cutout: 'Car on transparent background',
  plain: 'Car on plain background',
  package: 'Full retail package',
  scene: 'Car on busy background',
};
const DEFAULT_FIT: ImageFit = { scale: 1, x: 0, y: 0 };

export function ItemDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  // Unsaved presentation tweaks, previewed live on the package.
  const [draft, setDraft] = useState<{ kind: ImageKind; fit: ImageFit } | null>(null);

  useEffect(() => {
    let alive = true;
    setState('loading');
    itemsService
      .getItemById(id)
      .then(async (found) => {
        if (!alive) return;
        if (!found) return setState('missing');
        setItem(found);
        setState('ready');
        const col = await collectionsService.getCollectionById(found.collectionId);
        if (alive) setCollection(col);
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [id]);

  if (state === 'loading') {
    return (
      <div className="max-w-5xl mx-auto grid md:grid-cols-[320px_1fr] gap-8" aria-busy="true">
        <div className="aspect-[9/14] rounded-3xl bg-bg-elevated animate-pulse" />
        <div className="space-y-4">
          <div className="h-10 w-2/3 rounded-xl bg-bg-elevated animate-pulse" />
          <div className="h-48 rounded-2xl bg-bg-elevated animate-pulse" />
        </div>
      </div>
    );
  }

  if (state !== 'ready' || !item) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <AlertCircle className="mx-auto text-text-muted" size={40} />
        <h1 className="text-xl font-bold">{state === 'error' ? 'Could not load this car' : 'Car not found'}</h1>
        <p className="text-text-secondary text-sm">
          {state === 'error'
            ? 'Something went wrong talking to the database. Try again in a moment.'
            : 'It may have been removed, or it belongs to a private collection.'}
        </p>
        <Button variant="secondary" onClick={() => navigate('/garage')} leftIcon={<Warehouse size={16} />}>
          Back to my garage
        </Button>
      </div>
    );
  }

  // Only the owner gets management actions; RLS enforces this server-side too.
  const isOwner = !user || item.userId === user._id || item._id.startsWith('item-');

  const toggleFavorite = async () => {
    setBusy(true);
    try {
      setItem(await itemsService.toggleFavorite(item));
    } catch {
      toast.error('Could not update favourite');
    } finally {
      setBusy(false);
    }
  };

  const card = itemToCardData(item);
  const presentation = draft ?? { kind: card.imageKind ?? 'auto', fit: card.imageFit ?? DEFAULT_FIT };
  const editDraft = (patch: Partial<{ kind: ImageKind; fit: Partial<ImageFit> }>) =>
    setDraft({ kind: patch.kind ?? presentation.kind, fit: { ...presentation.fit, ...patch.fit } });

  const savePresentation = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      setItem(
        await itemsService.saveItem({
          ...item,
          customMetadata: { ...item.customMetadata, imageKind: draft.kind, imageFit: draft.fit },
        }),
      );
      setDraft(null);
      toast.success('Presentation saved');
    } catch {
      toast.error('Could not save the presentation');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove "${item.name}" from your collection?`)) return;
    setBusy(true);
    try {
      await itemsService.deleteItem(item._id);
      toast.success('Removed from your garage');
      navigate('/garage');
    } catch {
      toast.error('Could not remove this car');
      setBusy(false);
    }
  };

  const specs: [string, string | number | null | undefined][] = [
    ['Series', [item.series, item.customMetadata?.seriesNumber].filter(Boolean).join(' ')],
    ['Variant', typeof item.customMetadata?.variant === 'string' ? item.customMetadata.variant : null],
    ['Year', item.releaseYear],
    ['Model code', item.modelNumber],
    ['Collector #', item.collectorNumber],
    ['Colour', item.color?.join(', ')],
    ['Scale', item.scale],
    ['Barcode', item.barcode],
    ['Condition', item.ownership?.condition],
    ['Status', item.ownership?.status],
    ['Copies', item.ownership?.duplicateCount > 1 ? item.ownership.duplicateCount : null],
    ['Location', [item.location?.name, item.location?.position].filter(Boolean).join(' — ')],
  ];

  const value = item.ownership?.estimatedValue;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <button
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/garage'))}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary rounded-lg focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid md:grid-cols-[minmax(0,340px)_1fr] gap-8 items-start">
        <div className="flex justify-center md:sticky md:top-24">
          <BlisterCard data={{ ...card, imageKind: presentation.kind, imageFit: presentation.fit }} size="lg" />
        </div>

        <div className="space-y-6 min-w-0">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              {[item.brand, item.series].filter(Boolean).join(' · ') || 'Hot Wheels'}
            </p>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-text-primary">{item.name}</h1>
            {collection && (
              <p className="text-sm text-text-secondary">
                In{' '}
                <Link to={`/collections/${collection.slug}`} className="text-accent hover:underline">
                  {collection.name}
                </Link>
              </p>
            )}
          </header>

          {isOwner && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={item.personal?.isFavorite ? 'primary' : 'secondary'}
                size="sm"
                leftIcon={<Heart size={16} fill={item.personal?.isFavorite ? 'currentColor' : 'none'} />}
                onClick={toggleFavorite}
                disabled={busy}
                aria-pressed={item.personal?.isFavorite}
              >
                {item.personal?.isFavorite ? 'Favourite' : 'Add to favourites'}
              </Button>
              {collection && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Pencil size={16} />}
                  onClick={() => navigate(`/collections/${collection.slug}`)}
                >
                  Edit in collection
                </Button>
              )}
              <Button variant="ghost" size="sm" leftIcon={<Trash2 size={16} />} onClick={remove} disabled={busy}>
                Remove
              </Button>
            </div>
          )}

          {isOwner && item.images?.length > 0 && (
            <details className="rounded-2xl border border-border bg-bg-elevated px-4 py-3 text-sm" open={Boolean(draft)}>
              <summary className="cursor-pointer font-semibold text-text-primary">Package presentation</summary>
              <div className="mt-3 space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs text-text-muted">This photo shows</span>
                  <select
                    value={presentation.kind}
                    onChange={(e) => editDraft({ kind: e.target.value as ImageKind })}
                    className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border text-text-primary focus:outline-2 focus:outline-accent"
                  >
                    {(Object.keys(KIND_LABELS) as ImageKind[]).map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
                {presentation.kind !== 'package' &&
                  (
                    [
                      ['scale', 'Size', 0.6, 1.6, 0.05],
                      ['x', 'Horizontal', -30, 30, 1],
                      ['y', 'Vertical', -30, 30, 1],
                    ] as const
                  ).map(([key, label, min, max, step]) => (
                    <label key={key} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-text-muted">{label}</span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={presentation.fit[key]}
                        onChange={(e) => editDraft({ fit: { [key]: Number(e.target.value) } })}
                        className="flex-1 accent-[var(--color-accent)]"
                      />
                    </label>
                  ))}
                {draft && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="primary" onClick={savePresentation} isLoading={busy}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDraft({ kind: 'auto', fit: DEFAULT_FIT })} disabled={busy}>
                      Reset to automatic
                    </Button>
                  </div>
                )}
              </div>
            </details>
          )}

          {value ? (
            <div className="rounded-2xl border border-border bg-bg-elevated p-4 flex items-baseline gap-3">
              <span className="text-xs uppercase tracking-wider text-text-muted">Est. value</span>
              <span className="text-2xl font-bold text-text-primary">
                {formatCurrency(value, item.ownership.valueCurrency || 'USD')}
              </span>
            </div>
          ) : null}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px rounded-2xl overflow-hidden border border-border bg-border">
            {specs
              .filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([k, v]) => (
                <div key={k} className="bg-bg-elevated px-4 py-3">
                  <dt className="text-[11px] uppercase tracking-wider text-text-muted">{k}</dt>
                  <dd className="text-sm font-medium text-text-primary break-words">{String(v)}</dd>
                </div>
              ))}
          </dl>

          {item.description && <p className="text-text-secondary leading-relaxed">{item.description}</p>}

          {item.personal?.notes && (
            <blockquote className="border-l-2 border-accent pl-4 text-sm text-text-secondary italic">
              {item.personal.notes}
            </blockquote>
          )}

          <p className="text-xs text-text-muted flex flex-wrap items-center gap-1">
            Data source: {item.dataSource?.provider || 'Manual entry'}
            {typeof item.dataSource?.confidence === 'number' && item.dataSource.confidence < 1 && (
              <> · match confidence {Math.round(item.dataSource.confidence * 100)}%</>
            )}
            {item.dataSource?.sourceUrl && (
              <a
                href={item.dataSource.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline ml-1"
              >
                reference <ExternalLink size={12} />
              </a>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

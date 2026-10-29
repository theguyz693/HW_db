// ──────────────────────────────────────────────
// Scan to Collect — photo/camera → barcode + OCR → ranked catalogue
// candidates → user confirms variant → added to their garage.
// Nothing is ever added without explicit confirmation.
// ──────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Camera,
  ImageUp,
  ScanBarcode,
  Search,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Globe2,
  ArrowLeft,
  Warehouse,
  RotateCcw,
  Info,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import type { IScannerControls } from '@zxing/browser';
import type { Collection, Item, ItemCondition } from '@collectorhub/shared-types';
import { collectionsService } from '@/lib/services/collectionsService.ts';
import { itemsService } from '@/lib/services/itemsService.ts';
import type { EnrichmentMatch } from '@/lib/enrichment/index.ts';
import { Button } from '@/components/ui/Button.tsx';
import { BlisterCard } from '../components/BlisterCard.tsx';
import type { BlisterCardData } from '../lib/cardData.ts';
import { loadHotWheelsCatalog, type HotWheelsCatalog } from '../scan/hwCatalog.ts';
import { extractEvidence, type ScanEvidence } from '../scan/evidence.ts';
import { hasClearWinner, rankCandidates, scoreEntry, type CatalogEntry, type MatchCandidate } from '../scan/matcher.ts';
import { buildLocalCatalog, searchWiki, wikiDetails } from '../scan/catalog.ts';
import {
  ACCEPTED_TYPES,
  decodeBarcodes,
  describeCameraError,
  disposeOcr,
  fileToCanvas,
  recognizeText,
  startLiveBarcode,
  validateImageFile,
  videoFrameToCanvas,
} from '../scan/imagePipeline.ts';
import { addCandidate, ensureCollection, findDuplicate, incrementCopy, isHotWheelsCollection } from '../scan/addToGarage.ts';

type Step = 'input' | 'camera' | 'processing' | 'results' | 'confirm' | 'done';

interface Progress {
  barcode: 'pending' | 'running' | 'done';
  ocr: 'pending' | 'running' | 'done' | 'failed';
  ocrPct: number;
  match: 'pending' | 'running' | 'done';
}

const INITIAL_PROGRESS: Progress = { barcode: 'pending', ocr: 'pending', ocrPct: 0, match: 'pending' };

function toCardData(e: CatalogEntry): BlisterCardData {
  return {
    id: e.key,
    name: e.name,
    brand: e.brand,
    series: e.series,
    releaseYear: e.releaseYear,
    modelNumber: e.modelNumber,
    collectorNumber: e.collectorNumber,
    color: e.color,
    imageUrl: e.imageUrl,
    imageCaption: e.imageCaption,
  };
}

const CONFIDENCE_STYLE = {
  high: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export function ScanToCollectPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>(INITIAL_PROGRESS);
  const [evidence, setEvidence] = useState<ScanEvidence | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [selected, setSelected] = useState<MatchCandidate | null>(null);
  const [manualQuery, setManualQuery] = useState('');

  const [myItems, setMyItems] = useState<Item[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string>('');
  const [condition, setCondition] = useState<ItemCondition>('sealed');
  const [saving, setSaving] = useState(false);
  const [savedItem, setSavedItem] = useState<Item | null>(null);

  const [hwCatalog, setHwCatalog] = useState<HotWheelsCatalog | null>(null);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'failed'>('loading');

  const [wikiMatches, setWikiMatches] = useState<EnrichmentMatch[] | null>(null);
  const [wikiBusy, setWikiBusy] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const liveCodeRef = useRef<string | null>(null);
  const [liveCode, setLiveCode] = useState<string | null>(null);
  const takePhotoRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const runId = useRef(0);

  // ── Data needed for matching & saving ──
  const loadUserData = useCallback(async () => {
    const [items, cols] = await Promise.all([
      itemsService.getMyItems().catch(() => [] as Item[]),
      collectionsService.getCollections().catch(() => [] as Collection[]),
    ]);
    setMyItems(items);
    const hw = cols.filter(isHotWheelsCollection);
    const list = hw.length ? hw : cols;
    setCollections(list);
    setCollectionId((cur) => cur || list[0]?._id || '');
    return items;
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  useEffect(() => {
    let alive = true;
    loadHotWheelsCatalog()
      .then((c) => {
        if (!alive) return;
        setHwCatalog(c);
        setCatalogState('ready');
      })
      .catch((err) => {
        console.warn('Catalogue load failed:', err);
        if (alive) setCatalogState('failed');
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (step !== 'results') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const catalog = useMemo(() => buildLocalCatalog(myItems, hwCatalog?.entries), [myItems, hwCatalog]);
  const extraSeries = useMemo(() => [...new Set(catalog.map((c) => c.series).filter(Boolean) as string[])], [catalog]);

  // ── Cleanup: camera, OCR worker, preview URL ──
  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  useEffect(
    () => () => {
      stopCamera();
      disposeOcr();
    },
    [stopCamera],
  );

  useEffect(
    () => () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const reset = () => {
    runId.current++;
    stopCamera();
    setStep('input');
    setError('');
    setPreview(null);
    setProgress(INITIAL_PROGRESS);
    setEvidence(null);
    setOcrText('');
    setCandidates([]);
    setSelected(null);
    setWikiMatches(null);
    setSavedItem(null);
    setLiveCode(null);
    liveCodeRef.current = null;
  };

  const showResults = (ranked: MatchCandidate[]) => {
    setCandidates(ranked);
    setSelected(hasClearWinner(ranked) ? ranked[0]! : null);
    setWikiMatches(null);
    setStep('results');
  };

  // ── Core analysis ──
  const analyse = async (canvas: HTMLCanvasElement, knownBarcode?: string | null) => {
    const id = ++runId.current;
    setStep('processing');
    setError('');
    setProgress({ ...INITIAL_PROGRESS, barcode: 'running' });

    const barcodes = knownBarcode ? [knownBarcode] : await decodeBarcodes(canvas).catch(() => []);
    if (id !== runId.current) return;
    setProgress((p) => ({ ...p, barcode: 'done', ocr: 'running' }));

    let text = '';
    try {
      const ocr = await recognizeText(canvas, (pct) => id === runId.current && setProgress((p) => ({ ...p, ocrPct: pct })));
      text = ocr.text;
      if (id !== runId.current) return;
      setProgress((p) => ({ ...p, ocr: 'done', ocrPct: 1, match: 'running' }));
    } catch (err) {
      console.warn('OCR failed:', err);
      if (id !== runId.current) return;
      setProgress((p) => ({ ...p, ocr: 'failed', match: 'running' }));
    }

    setOcrText(text);
    const ev = extractEvidence(text, barcodes, extraSeries);
    setEvidence(ev);
    const ranked = rankCandidates(catalog, ev);
    setProgress((p) => ({ ...p, match: 'done' }));
    showResults(ranked);
  };

  // ── Input handlers ──
  const handleFile = async (file: File | undefined) => {
    if (!file) return; // user cancelled the picker
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setPreview(URL.createObjectURL(file));
    try {
      const canvas = await fileToCanvas(file);
      await analyse(canvas);
    } catch (err) {
      console.warn('Image decode failed:', err);
      setError('We could not read that image. Try another photo, or search manually below.');
      setStep('input');
    }
  };

  const openCamera = async () => {
    setError('');
    setLiveCode(null);
    liveCodeRef.current = null;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(describeCameraError(null));
      return;
    }
    setStep('camera');
    // Wait for the <video> to mount
    await new Promise((r) => requestAnimationFrame(r));
    const video = videoRef.current;
    if (!video) return;
    try {
      controlsRef.current = await startLiveBarcode(video, (code) => {
        if (liveCodeRef.current === code) return;
        liveCodeRef.current = code;
        setLiveCode(code);
        navigator.vibrate?.(40);
      });
    } catch (err) {
      stopCamera();
      setError(describeCameraError(err));
      setStep('input');
    }
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = videoFrameToCanvas(video);
    setPreview(canvas.toDataURL('image/jpeg', 0.8));
    stopCamera();
    await analyse(canvas, liveCodeRef.current);
  };

  const runManualSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = manualQuery.trim();
    if (!q) return;
    stopCamera();
    const ev = extractEvidence(q, [], extraSeries);
    // Typed barcodes may be any length, so match them literally too.
    if (/^\d{8,14}$/.test(q) && !ev.barcodes.includes(q)) ev.barcodes.push(q);
    setEvidence(ev);
    setOcrText('');
    setPreview(null);
    showResults(rankCandidates(catalog, ev, { minScore: 10 }));
  };

  const searchTheWiki = async () => {
    const q =
      manualQuery.trim() ||
      [evidence?.modelCodes[0], ...(evidence?.tokens.slice(0, 4) ?? [])].filter(Boolean).join(' ');
    if (!q) {
      setError('Type a casting name to search the Hot Wheels Wiki.');
      return;
    }
    setWikiBusy('search');
    try {
      setWikiMatches(await searchWiki(q));
    } catch {
      setWikiMatches([]);
    } finally {
      setWikiBusy(null);
    }
  };

  const pickWikiMatch = async (m: EnrichmentMatch) => {
    setWikiBusy(m.id);
    try {
      const entries = await wikiDetails(m);
      if (!entries.length) {
        toast.error('No details found on that page');
        return;
      }
      const ev = evidence ?? extractEvidence(manualQuery);
      const ranked = entries
        .map((e) => scoreEntry(e, ev))
        .sort((a, b) => b.score - a.score);
      setCandidates(ranked);
      setSelected(null);
      setWikiMatches(null);
    } catch {
      toast.error('Could not reach the Hot Wheels Wiki');
    } finally {
      setWikiBusy(null);
    }
  };

  // ── Confirm & save ──
  const duplicate = useMemo(() => (selected ? findDuplicate(myItems, selected) : undefined), [myItems, selected]);

  const confirmAdd = async (mode: 'new' | 'copy') => {
    if (!selected) return;
    setSaving(true);
    try {
      // Re-read ownership state so a stale tab can't create duplicates.
      const fresh = await loadUserData();
      const dup = findDuplicate(fresh, selected);
      let saved: Item;
      if (dup && mode === 'copy') {
        saved = await incrementCopy(dup);
      } else if (dup) {
        toast('Already in your garage — choose “Add another copy” if you have two.');
        setSaving(false);
        return;
      } else {
        const colId = await ensureCollection(collectionId || null);
        saved = await addCandidate(selected, colId, condition);
      }
      setSavedItem(saved);
      setStep('done');
      loadUserData();
    } catch (err) {
      console.warn('Add to garage failed:', err);
      toast.error('Could not add this car. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──
  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Scan to collect</p>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-text-primary">Identify a car</h1>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Photograph a carded or loose Hot Wheels car. We read the barcode and printed text, then match it against the
            catalogue. You confirm before anything is added.
          </p>
        </div>
        {step !== 'input' && (
          <Button variant="secondary" size="sm" leftIcon={<RotateCcw size={16} />} onClick={reset}>
            Start over
          </Button>
        )}
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss" className="cursor-pointer text-amber-300 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={takePhotoRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={uploadRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {/* STEP: input */}
      {step === 'input' && (
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
          <div className="rounded-3xl border border-border bg-gradient-to-br from-bg-elevated to-bg-secondary p-6 sm:p-8 space-y-5">
            <div className="grid sm:grid-cols-3 gap-3">
              <InputTile icon={<ScanBarcode size={26} />} title="Live camera" hint="Barcode reads instantly" onClick={openCamera} />
              <InputTile icon={<Camera size={26} />} title="Take a photo" hint="Uses your phone camera" onClick={() => takePhotoRef.current?.click()} />
              <InputTile icon={<ImageUp size={26} />} title="Upload photo" hint="JPEG, PNG, WebP · 10 MB" onClick={() => uploadRef.current?.click()} />
            </div>
            <ul className="text-xs text-text-secondary space-y-1.5">
              <li>• For carded cars, include the front name and the barcode on the back if you can.</li>
              <li>• For loose cars, the base usually shows the casting name and year.</li>
              <li>• Photos are processed on this device and never uploaded or stored.</li>
            </ul>
          </div>
          <ManualSearch value={manualQuery} onChange={setManualQuery} onSubmit={runManualSearch} />
        </div>
      )}

      {/* STEP: camera */}
      {step === 'camera' && (
        <div className="rounded-3xl overflow-hidden border border-border bg-black relative max-w-3xl mx-auto">
          <video ref={videoRef} className="w-full aspect-[3/4] sm:aspect-video object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
            <span
              aria-live="polite"
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur',
                liveCode ? 'bg-emerald-500/80 text-white' : 'bg-black/60 text-white/80',
              )}
            >
              {liveCode ? `Barcode ${liveCode}` : 'Looking for a barcode…'}
            </span>
            <button
              onClick={() => {
                stopCamera();
                setStep('input');
              }}
              className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
              aria-label="Close camera"
            >
              <X size={18} />
            </button>
          </div>
          <div className="absolute bottom-4 inset-x-0 flex justify-center">
            <button
              onClick={captureFrame}
              className="px-6 py-3 rounded-full bg-white text-black font-bold shadow-xl flex items-center gap-2 cursor-pointer focus-visible:outline-4 focus-visible:outline-accent"
            >
              <Camera size={18} /> Capture &amp; identify
            </button>
          </div>
        </div>
      )}

      {/* STEP: processing */}
      {step === 'processing' && (
        <div className="grid md:grid-cols-[280px_1fr] gap-6 items-start" aria-busy="true">
          {preview && <img src={preview} alt="Your photo" className="rounded-2xl border border-border w-full object-contain max-h-80 bg-black" />}
          <ol className="space-y-3" aria-live="polite">
            <ProgressRow label="Reading barcode" state={progress.barcode} />
            <ProgressRow
              label={progress.ocr === 'running' ? `Reading printed text ${Math.round(progress.ocrPct * 100)}%` : 'Reading printed text'}
              state={progress.ocr}
              note={progress.ocr === 'running' && progress.ocrPct === 0 ? 'First run downloads the text model (~10 MB)…' : undefined}
            />
            <ProgressRow label="Matching the catalogue" state={progress.match} />
          </ol>
        </div>
      )}

      {/* STEP: results */}
      {step === 'results' && (
        <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
          <aside className="space-y-4 lg:sticky lg:top-24">
            {preview && <img src={preview} alt="Your photo" className="rounded-2xl border border-border w-full object-contain max-h-64 bg-black" />}
            {evidence && <EvidencePanel ev={evidence} ocrText={ocrText} ocrFailed={progress.ocr === 'failed'} />}
            <ManualSearch value={manualQuery} onChange={setManualQuery} onSubmit={runManualSearch} compact />
          </aside>

          <section className="space-y-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-text-primary">
                {candidates.length
                  ? hasClearWinner(candidates)
                    ? 'Strong match — please confirm'
                    : `${candidates.length} possible match${candidates.length === 1 ? '' : 'es'}`
                  : 'No confident match'}
              </h2>
              <Button variant="secondary" size="sm" leftIcon={wikiBusy === 'search' ? <Loader2 size={16} className="animate-spin" /> : <Globe2 size={16} />} onClick={searchTheWiki} disabled={Boolean(wikiBusy)}>
                Search Hot Wheels Wiki
              </Button>
            </div>

            {wikiMatches && (
              <div className="rounded-2xl border border-border bg-bg-elevated p-3 space-y-2">
                <p className="text-xs text-text-muted px-1">Wiki results — pick a casting to see its release variants</p>
                {wikiMatches.length === 0 && <p className="text-sm text-text-secondary px-1">Nothing found on the wiki.</p>}
                {wikiMatches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => pickWikiMatch(m)}
                    disabled={Boolean(wikiBusy)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-bg-hover text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
                  >
                    {m.thumbnailUrl ? (
                      <img src={m.thumbnailUrl} referrerPolicy="no-referrer" alt="" className="w-12 h-9 object-contain rounded bg-bg-surface" />
                    ) : (
                      <div className="w-12 h-9 rounded bg-bg-surface" />
                    )}
                    <span className="flex-1 text-sm font-medium text-text-primary">{m.title}</span>
                    {wikiBusy === m.id && <Loader2 size={16} className="animate-spin text-accent" />}
                  </button>
                ))}
              </div>
            )}

            {candidates.length === 0 && !wikiMatches && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-text-secondary space-y-2">
                <p>We couldn't match this photo to a car in the catalogue.</p>
                <p>Try a sharper photo of the card front, type the name on the left, or search the Hot Wheels Wiki.</p>
              </div>
            )}

            <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4" role="list">
              {candidates.map((c) => (
                <li key={c.entry.key} className="space-y-2">
                  <BlisterCard
                    data={toCardData(c.entry)}
                    size="fluid"
                    onSelect={() => setSelected(c)}
                    selected={selected?.entry.key === c.entry.key}
                    badge={c.entry.ownedCount ? `Owned ×${c.entry.ownedCount}` : undefined}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-semibold border', CONFIDENCE_STYLE[c.confidence])}>
                      {c.confidence} · {c.score}
                    </span>
                    {(c.entry.variant || c.entry.color?.[0]) && (
                      <span className="text-[11px] text-text-muted">{c.entry.variant || c.entry.color!.join(' / ')}</span>
                    )}
                  </div>
                  {c.reasons.length > 0 && (
                    <ul className="text-[11px] text-text-secondary leading-snug space-y-0.5">
                      {c.reasons.slice(0, 3).map((r) => (
                        <li key={r.label}>✓ {r.label}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>

            {candidates.length > 0 && (
              <div className="sticky bottom-20 lg:bottom-4 z-10 flex justify-end">
                <Button
                  variant="primary"
                  disabled={!selected}
                  onClick={() => setStep('confirm')}
                  leftIcon={<CheckCircle2 size={16} />}
                  className="shadow-xl"
                >
                  {selected ? `Continue with ${selected.entry.name}` : 'Select the matching car'}
                </Button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* STEP: confirm */}
      {step === 'confirm' && selected && (
        <div className="grid md:grid-cols-[minmax(0,320px)_1fr] gap-8 items-start">
          <div className="flex justify-center">
            <BlisterCard data={toCardData(selected.entry)} size="lg" />
          </div>
          <div className="space-y-5">
            <button onClick={() => setStep('results')} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary cursor-pointer">
              <ArrowLeft size={15} /> Back to candidates
            </button>
            <div>
              <p className="text-xs uppercase tracking-widest text-accent font-semibold">{selected.entry.series || 'Hot Wheels'}</p>
              <h2 className="text-2xl font-black text-text-primary">{selected.entry.name}</h2>
              <p className="text-sm text-text-secondary">
                {[
                  selected.entry.releaseYear,
                  selected.entry.modelNumber,
                  selected.entry.variant,
                  selected.entry.seriesNumber && `${selected.entry.series} ${selected.entry.seriesNumber}`,
                  selected.entry.color?.join(' / '),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>

            <div className="flex items-start gap-2 text-xs text-text-secondary rounded-xl bg-bg-elevated border border-border p-3">
              <Info size={14} className="shrink-0 mt-0.5 text-accent" />
              <span>
                Compare the photo's colour and wheels with your car. Barcodes and names are often shared by several variants, so
                this is your call — match confidence {selected.score}%.
              </span>
            </div>

            {duplicate ? (
              <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 space-y-3">
                <p className="text-sm text-text-primary">
                  <strong>Already in your garage</strong> ({duplicate.ownership?.duplicateCount ?? 1}{' '}
                  {(duplicate.ownership?.duplicateCount ?? 1) === 1 ? 'copy' : 'copies'}).
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => confirmAdd('copy')} isLoading={saving}>
                    Add another copy
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(`/items/${duplicate._id}`)}>
                    View it
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-text-primary mb-1">Condition</legend>
                  <div className="flex gap-2">
                    {(
                      [
                        ['sealed', 'Carded / sealed'],
                        ['mint', 'Loose'],
                      ] as const
                    ).map(([v, label]) => (
                      <label
                        key={v}
                        className={clsx(
                          'px-4 py-2 rounded-xl border text-sm cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
                          condition === v ? 'border-accent bg-accent/15 text-text-primary' : 'border-border text-text-secondary',
                        )}
                      >
                        <input type="radio" name="condition" value={v} checked={condition === v} onChange={() => setCondition(v)} className="sr-only" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-text-primary">Add to collection</span>
                  {collections.length ? (
                    <select
                      value={collectionId}
                      onChange={(e) => setCollectionId(e.target.value)}
                      className="w-full sm:w-80 px-3 py-2.5 rounded-xl bg-bg-elevated border border-border text-text-primary focus:outline-2 focus:outline-accent"
                    >
                      {collections.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-text-secondary">A “My Hot Wheels” collection will be created for you.</p>
                  )}
                </label>

                <Button variant="primary" size="lg" onClick={() => confirmAdd('new')} isLoading={saving} leftIcon={<Warehouse size={18} />}>
                  Add to my garage
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <CatalogStatus state={catalogState} catalog={hwCatalog} />

      {/* STEP: done */}
      {step === 'done' && savedItem && (
        <div className="max-w-xl mx-auto text-center space-y-5 py-6">
          <div className="flex justify-center">
            <BlisterCard data={toCardData({ ...selected!.entry, key: savedItem._id })} size="md" static />
          </div>
          <h2 className="text-2xl font-black text-text-primary flex items-center justify-center gap-2">
            <CheckCircle2 className="text-emerald-400" /> On the rack!
          </h2>
          <p className="text-text-secondary text-sm">
            {savedItem.name} is in your garage
            {(savedItem.ownership?.duplicateCount ?? 1) > 1 && ` (×${savedItem.ownership.duplicateCount})`}.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" leftIcon={<Warehouse size={16} />} onClick={() => navigate(`/garage?added=${savedItem._id}`)}>
              See it in my garage
            </Button>
            <Button variant="secondary" leftIcon={<ScanBarcode size={16} />} onClick={reset}>
              Scan another
            </Button>
          </div>
          <Link to={`/items/${savedItem._id}`} className="text-sm text-accent hover:underline">
            Open details
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function CatalogStatus({ state, catalog }: { state: 'loading' | 'ready' | 'failed'; catalog: HotWheelsCatalog | null }) {
  return (
    <p className="text-[11px] text-text-muted leading-relaxed pt-4 border-t border-border" aria-live="polite">
      {state === 'loading' && 'Loading the Hot Wheels catalogue…'}
      {state === 'failed' && 'The full catalogue could not load — matching against your garage and a small demo set only.'}
      {state === 'ready' && catalog && (
        <>
          Matching against {catalog.entries.length.toLocaleString()} mainline releases ({catalog.years[0]}–{catalog.years[1]}) and
          your garage. Catalogue data from the{' '}
          <a href="https://hotwheels.fandom.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-secondary">
            Hot Wheels Wiki
          </a>{' '}
          (contributors, CC BY-SA); photos are linked from the wiki, not copied.
        </>
      )}
    </p>
  );
}

function InputTile({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-3 p-4 rounded-2xl bg-bg-primary/60 border border-border hover:border-accent hover:bg-bg-hover text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="w-11 h-11 rounded-xl bg-accent/15 text-accent grid place-items-center group-hover:bg-accent group-hover:text-white transition-colors">
        {icon}
      </span>
      <span>
        <span className="block font-semibold text-text-primary">{title}</span>
        <span className="block text-xs text-text-muted">{hint}</span>
      </span>
    </button>
  );
}

function ManualSearch({
  value,
  onChange,
  onSubmit,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  compact?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className={clsx('rounded-3xl border border-border bg-bg-elevated space-y-3', compact ? 'p-4' : 'p-6 sm:p-8')}>
      <label htmlFor="manual-search" className="block">
        <span className="font-semibold text-text-primary">{compact ? 'Not right? Search manually' : 'Or search manually'}</span>
        {!compact && <span className="block text-xs text-text-muted mt-1">Casting name, product code (e.g. HKF15) or barcode</span>}
      </label>
      <div className="flex gap-2">
        <input
          id="manual-search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Datsun 510 Wagon"
          autoComplete="off"
          maxLength={120}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-bg-primary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-2 focus:outline-accent"
        />
        <Button type="submit" variant="primary" leftIcon={<Search size={16} />} disabled={!value.trim()}>
          Search
        </Button>
      </div>
    </form>
  );
}

function ProgressRow({ label, state, note }: { label: string; state: string; note?: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
      <span className="mt-0.5">
        {state === 'done' ? (
          <CheckCircle2 size={18} className="text-emerald-400" />
        ) : state === 'running' ? (
          <Loader2 size={18} className="animate-spin text-accent" />
        ) : state === 'failed' ? (
          <AlertTriangle size={18} className="text-amber-400" />
        ) : (
          <span className="block w-[18px] h-[18px] rounded-full border-2 border-border" />
        )}
      </span>
      <span>
        <span className="text-sm text-text-primary">{label}</span>
        {state === 'failed' && <span className="block text-xs text-text-muted">Text reading failed — matching on what we have.</span>}
        {note && <span className="block text-xs text-text-muted">{note}</span>}
      </span>
    </li>
  );
}

function EvidencePanel({ ev, ocrText, ocrFailed }: { ev: ScanEvidence; ocrText: string; ocrFailed: boolean }) {
  const chips: [string, string[]][] = [
    ['Barcode', ev.barcodes],
    ['Product code', ev.modelCodes],
    ['Series', ev.series],
    ['Collector #', ev.collectorNumbers.map((c) => (c.of ? `${c.number}/${c.of}` : c.number))],
    ['Year', ev.years.map(String)],
  ];
  const any = chips.some(([, v]) => v.length) || ev.tokens.length;
  return (
    <div className="rounded-2xl border border-border bg-bg-elevated p-4 space-y-3 text-sm">
      <p className="font-semibold text-text-primary">What we read</p>
      {!any && <p className="text-text-secondary text-xs">{ocrFailed ? 'Text reading failed.' : 'No readable text or barcode found.'}</p>}
      <dl className="space-y-1.5">
        {chips
          .filter(([, v]) => v.length)
          .map(([k, v]) => (
            <div key={k} className="flex gap-2 items-baseline">
              <dt className="text-[11px] uppercase tracking-wider text-text-muted w-24 shrink-0">{k}</dt>
              <dd className="font-mono text-xs text-text-primary break-all">{v.join(', ')}</dd>
            </div>
          ))}
        {ev.tokens.length > 0 && (
          <div className="flex gap-2 items-baseline">
            <dt className="text-[11px] uppercase tracking-wider text-text-muted w-24 shrink-0">Words</dt>
            <dd className="text-xs text-text-secondary break-words">{ev.tokens.slice(0, 14).join(' ')}</dd>
          </div>
        )}
      </dl>
      <p className="text-[11px] text-text-muted">Text recognition is a best guess, not a fact — always check the car.</p>
      {ocrText && (
        <details className="text-xs">
          <summary className="cursor-pointer text-text-secondary">Raw text</summary>
          <pre className="mt-2 whitespace-pre-wrap text-text-muted max-h-40 overflow-auto">{ocrText}</pre>
        </details>
      )}
    </div>
  );
}

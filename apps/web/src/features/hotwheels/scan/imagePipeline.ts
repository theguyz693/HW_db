// ──────────────────────────────────────────────
// Browser-side image pipeline: validation, decoding, barcode, OCR.
// Photos never leave the device and are never persisted — they live
// in memory only for the duration of the scan.
// Heavy libraries (ZXing, Tesseract) are lazy-loaded on first use.
// ──────────────────────────────────────────────

import type { IScannerControls } from '@zxing/browser';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 10 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Please choose a JPEG, PNG or WebP photo.';
  }
  if (file.size > MAX_BYTES) {
    return `That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 10 MB.`;
  }
  if (file.size === 0) return 'That file is empty.';
  return null;
}

/** Decode into a canvas, downscaled so OCR stays fast on phones. */
export async function fileToCanvas(file: Blob, maxDim = 1600): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

export function videoFrameToCanvas(video: HTMLVideoElement, maxDim = 1600): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// ── Barcode ──

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

async function zxingHints() {
  const { BarcodeFormat, DecodeHintType } = await import('@zxing/library');
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
}

export async function decodeBarcodes(canvas: HTMLCanvasElement): Promise<string[]> {
  // Prefer the native detector where available (Chrome/Android) — faster and better at angles.
  const Native = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => { detect(s: CanvasImageSource): Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  if (Native) {
    try {
      const found = await new Native({ formats: NATIVE_FORMATS }).detect(canvas);
      if (found.length) return [...new Set(found.map((f) => f.rawValue))];
    } catch {
      /* fall through to ZXing */
    }
  }
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader(await zxingHints());
    const result = reader.decodeFromCanvas(canvas);
    return [result.getText()];
  } catch {
    return []; // NotFoundException — no barcode visible, which is normal for loose cars
  }
}

/** Continuous barcode scanning from the rear camera. Resolves to controls for stopping. */
export async function startLiveBarcode(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
): Promise<IScannerControls> {
  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const reader = new BrowserMultiFormatReader(await zxingHints(), { delayBetweenScanAttempts: 250 });
  return reader.decodeFromConstraints(
    { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
    video,
    (result) => {
      if (result) onCode(result.getText());
    },
  );
}

export function describeCameraError(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (!window.isSecureContext || !navigator.mediaDevices) {
    return 'Camera needs a secure (https) connection. You can still upload a photo.';
  }
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera permission was blocked. Allow it in your browser settings, or upload a photo instead.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device. Upload a photo instead.';
    case 'NotReadableError':
      return 'The camera is in use by another app. Close it and try again, or upload a photo.';
    case 'AbortError':
      return 'Camera start was cancelled.';
    default:
      return 'Could not start the camera. Upload a photo instead.';
  }
}

// ── OCR ──

type TesseractWorker = import('tesseract.js').Worker;
let workerPromise: Promise<TesseractWorker> | null = null;
let progressListener: ((p: number) => void) | null = null;

function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) =>
      createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') progressListener?.(m.progress);
        },
      }),
    );
    workerPromise.catch(() => {
      workerPromise = null;
    });
  }
  return workerPromise;
}

/** Greyscale + contrast stretch: helps on glossy blister plastic. */
function preprocess(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    d[i] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    const v = ((d[i]! - min) / range) * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export interface OcrResult {
  text: string;
  confidence: number;
}

export async function recognizeText(canvas: HTMLCanvasElement, onProgress?: (p: number) => void): Promise<OcrResult> {
  const worker = await getWorker();
  progressListener = onProgress ?? null;
  try {
    const { data } = await worker.recognize(preprocess(canvas));
    return { text: data.text, confidence: data.confidence };
  } finally {
    progressListener = null;
  }
}

export async function disposeOcr() {
  const p = workerPromise;
  workerPromise = null;
  if (p) {
    try {
      await (await p).terminate();
    } catch {
      /* already gone */
    }
  }
}

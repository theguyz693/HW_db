import { describe, expect, it } from 'vitest';
import { alphaBBox, classify, isUsableCutout, removeBackground, type Pixels } from './imageAnalysis.ts';

function make(w: number, h: number, fill: (x: number, y: number) => [number, number, number, number]): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(fill(x, y), (y * w + x) * 4);
  return { data, width: w, height: h };
}

// A "car": dark red rectangle with wheels, in the middle of the frame.
const inCar = (x: number, y: number) => x >= 20 && x < 80 && y >= 35 && y < 60;
const CAR: [number, number, number, number] = [170, 20, 25, 255];

describe('image analysis', () => {
  it('detects a transparent cut-out and its bounding box', () => {
    const img = make(100, 80, (x, y) => (inCar(x, y) ? CAR : [0, 0, 0, 0]));
    expect(classify(img)).toBe('cutout');
    expect(alphaBBox(img)).toEqual({ x: 20, y: 35, w: 60, h: 25 });
  });

  it('removes a plain studio backdrop and keeps the car', () => {
    const img = make(100, 80, (x, y) => (inCar(x, y) ? CAR : [244 + ((x + y) % 3), 244, 246, 255]));
    expect(classify(img)).toBe('plain');
    const removed = removeBackground(img);
    const box = alphaBBox(img);
    expect(box).toEqual({ x: 20, y: 35, w: 60, h: 25 });
    expect(isUsableCutout(removed, box, 100, 80)).toBe(true);
  });

  it('treats a busy background as a scene', () => {
    const img = make(100, 80, (x, y) => (inCar(x, y) ? CAR : [(x * 37) % 256, (y * 53) % 256, ((x + y) * 29) % 256, 255]));
    expect(classify(img)).toBe('scene');
  });

  it('rejects a removal that eats the whole image', () => {
    const img = make(100, 80, () => [250, 250, 250, 255]); // white car on white: nothing to keep
    const removed = removeBackground(img);
    expect(isUsableCutout(removed, alphaBBox(img), 100, 80)).toBe(false);
  });
});

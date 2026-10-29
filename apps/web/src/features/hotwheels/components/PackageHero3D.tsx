// ──────────────────────────────────────────────
// PackageHero3D — a real blister-pack model that floats and turns gently,
// wearing the selected car's card on its face.
//
// The scene (renderer, model, lights) is built ONCE, with the model in two
// "slots". Changing `car` paints the new face onto the idle slot and runs a
// card-carousel move: the current package slides out (back, slightly smaller)
// and the next slides in from the other side to the same resting pose. No spin.
//
// Face art, in order of preference:
//   1. real photo of this exact release on its card (owner-marked or wiki lookup)
//   2. CollectorHub display art with the analysed cut-out (or photo) in the blister
//
// Model: "HOT WHEELS PACKAGE SMALL" by manish.konda99 (Sketchfab, Sketchfab Standard licence).
// Falls back to the CSS package frame when WebGL isn't available.
// ──────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BlisterCard } from '../components/BlisterCard.tsx';
import { paletteForSeries, type BlisterCardData } from '../lib/cardData.ts';
import { findCardedImage } from '../lib/cardedImage.ts';
import { prepareImage } from '../lib/imagePrep.ts';

const MODEL_URL = '/models/hw-package.glb';

// Card-face extents in the model's local space (from the GLB accessors).
const FACE = { minX: 22.48, maxX: 214.83, minY: 12.71, maxY: 307.29 };
// Blister window, as a fraction of the face (u →, v ↑).
const BLISTER = { u0: 0.07, u1: 0.93, v0: 0.05, v1: 0.29 };
const SLIDE_MS = 460;
const SLIDE_X = 4.4; // far enough to leave the canvas, whose edges fade out in CSS
const SLIDE_Z = -1.3;
const SLIDE_SCALE = 0.9;
const SLIDE_TILT = 0.12; // ~7 degrees of lean while moving, 0 at rest

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function coverDraw(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, biasY = 0.5) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) * biasY, sw, sh, x, y, w, h);
}

async function paintCardArt(car: BlisterCardData | undefined): Promise<HTMLCanvasElement> {
  const W = 1024;
  const H = Math.round(W * ((FACE.maxY - FACE.minY) / (FACE.maxX - FACE.minX)));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;

  // 1. A real card photo covers the whole face.
  const kind = car?.imageKind ?? 'auto';
  const fullUrl =
    kind === 'package' ? car?.imageUrl : kind === 'auto' ? await findCardedImage(car?.modelNumber) : null;
  const full = fullUrl ? await loadImage(fullUrl) : null;
  if (full) {
    coverDraw(g, full, 0, 0, W, H, 0.3);
    return c;
  }

  // 2. Display art.
  const pal = paletteForSeries(car?.series);
  const bg = g.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, pal.base);
  bg.addColorStop(1, pal.deep);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-0.42);
  g.fillStyle = pal.stripe;
  g.globalAlpha = 0.5;
  g.fillRect(-W, -40, W * 2, 60);
  g.restore();

  // (The model has its own hanger cut-out across the top ~14%, so art starts below it.)
  g.fillStyle = '#fff';
  g.textAlign = 'left';
  g.font = 'italic 900 104px Inter, Arial, sans-serif';
  g.save();
  g.transform(1, 0, -0.12, 1, 0, 0);
  g.shadowColor = pal.deep;
  g.shadowOffsetY = 8;
  g.fillText((car?.brand || 'Hot Wheels').toUpperCase(), 90, 360);
  g.restore();
  g.font = '800 44px Inter, Arial, sans-serif';
  g.fillStyle = pal.stripe;
  g.fillText((car?.series || 'Garage Edition').toUpperCase(), 84, 440);

  if (car?.collectorNumber) {
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(W - 130, 540, 70, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = pal.deep;
    g.font = '900 58px Inter, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(car.collectorNumber, W - 130, 560);
    g.textAlign = 'left';
  }

  const plateY = H * (1 - BLISTER.v1) - 190;
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.beginPath();
  g.roundRect(70, plateY, W - 140, 150, 24);
  g.fill();
  g.fillStyle = '#fff';
  g.font = '900 58px Inter, Arial, sans-serif';
  const name = car?.name || 'Your next grail';
  g.fillText(name.length > 26 ? `${name.slice(0, 25)}…` : name, 100, plateY + 72);
  g.font = '500 36px "JetBrains Mono", monospace';
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.fillText([car?.releaseYear, car?.modelNumber].filter(Boolean).join(' · '), 100, plateY + 124);

  const bx = W * BLISTER.u0;
  const bw = W * (BLISTER.u1 - BLISTER.u0);
  const by = H * (1 - BLISTER.v1);
  const bh = H * (BLISTER.v1 - BLISTER.v0);
  const tray = g.createRadialGradient(W / 2, by + bh * 0.6, 10, W / 2, by + bh * 0.6, bw * 0.6);
  tray.addColorStop(0, 'rgba(255,255,255,0.25)');
  tray.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = tray;
  g.beginPath();
  g.roundRect(bx, by, bw, bh, 40);
  g.fill();

  if (car?.imageUrl) {
    const prepared = await prepareImage(car.imageUrl, kind === 'package' ? 'scene' : kind);
    const img = await loadImage(prepared.src);
    if (img && prepared.mode === 'cutout') {
      // Tight-cropped car: contain-fit, so every car sits at the same scale.
      const s = Math.min((bw * 0.86) / img.width, (bh * 0.8) / img.height);
      const w = img.width * s;
      const h = img.height * s;
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.5)';
      g.shadowBlur = 24;
      g.shadowOffsetY = 14;
      g.drawImage(img, W / 2 - w / 2, by + bh / 2 - h / 2, w, h);
      g.restore();
    } else if (img) {
      g.save();
      g.beginPath();
      g.roundRect(bx + 18, by + 18, bw - 36, bh - 36, 28);
      g.clip();
      coverDraw(g, img, bx + 18, by + 18, bw - 36, bh - 36);
      g.restore();
    }
  }

  g.font = '600 24px Inter, Arial, sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.textAlign = 'right';
  g.fillText('COLLECTORHUB DISPLAY CARD', W - 50, H - 22);
  return c;
}

/** Planar UVs across the card face so our art lands exactly where we drew it. */
function applyFaceUVs(geo: THREE.BufferGeometry) {
  const pos = geo.attributes.position!;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - FACE.minX) / (FACE.maxX - FACE.minX);
    uv[i * 2 + 1] = (pos.getY(i) - FACE.minY) / (FACE.maxY - FACE.minY);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function makeTexture(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

interface Slot {
  group: THREE.Group; // carousel position / depth / scale
  tilt: THREE.Group; // shared idle sway + transition lean
  face: THREE.MeshPhysicalMaterial;
}

interface Move {
  start: number;
  dir: number;
  from: number;
  to: number;
}

const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

export function PackageHero3D({ car, direction = 1 }: { car?: BlisterCardData; direction?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(() => typeof window !== 'undefined' && !webglAvailable());
  const [ready, setReady] = useState(false);

  // Shared between the one-time scene effect and the per-car texture effect.
  const slots = useRef<Slot[]>([]);
  const active = useRef(0);
  const move = useRef<Move | null>(null);
  // Latest selection waiting for the running move (rapid clicks collapse into one move).
  const queued = useRef<{ tex: THREE.Texture; dir: number } | null>(null);
  const pendingInitial = useRef<{ tex: THREE.Texture; dir: number } | null>(null);
  const reducedRef = useRef(false);

  const setFace = (slot: Slot, tex: THREE.Texture) => {
    if (slot.face.map && slot.face.map !== tex) slot.face.map.dispose();
    slot.face.map = tex;
    slot.face.color.set(0xffffff);
    slot.face.needsUpdate = true;
  };

  // Start a carousel move to `tex`, or show it at once when there's nothing to animate.
  const present = (tex: THREE.Texture, dir: number) => {
    const s = slots.current;
    const cur = s[active.current];
    if (!cur) return;
    if (!cur.face.map || reducedRef.current) {
      setFace(cur, tex);
      return;
    }
    if (move.current) {
      queued.current?.tex.dispose();
      queued.current = { tex, dir };
      return;
    }
    const nextIdx = 1 - active.current;
    const next = s[nextIdx]!;
    setFace(next, tex);
    next.group.visible = true;
    move.current = { start: performance.now(), dir: dir >= 0 ? 1 : -1, from: active.current, to: nextIdx };
  };

  // ── Scene: built once ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || failed) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reducedRef.current = reduced;

    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping; // keeps printed card colours true
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 4, 6);
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.35));

    const disposables: { dispose(): void }[] = [envTex, pmrem];

    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        const glass = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.16,
          roughness: 0.05,
          clearcoat: 1,
          clearcoatRoughness: 0.03,
          envMapIntensity: 2.2,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const plastic = new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: 0.6, side: THREE.DoubleSide });
        disposables.push(glass, plastic);
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          disposables.push(mesh.geometry);
          const parentName = mesh.parent?.name || '';
          if (parentName.startsWith('FRONT')) {
            applyFaceUVs(mesh.geometry);
            mesh.userData.face = true;
          } else if (parentName.startsWith('GLASS')) {
            mesh.material = glass;
            mesh.renderOrder = 2;
          } else {
            mesh.material = plastic;
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());
        model.position.sub(centre);
        const unit = 4.2 / Math.max(size.x, size.y, size.z);

        // Two slots share geometry; each has its own face material/texture.
        slots.current = [0, 1].map((i) => {
          const copy = i === 0 ? model : model.clone(true);
          const face = new THREE.MeshPhysicalMaterial({
            color: 0x1a1a20,
            roughness: 0.45,
            clearcoat: 0.6,
            clearcoatRoughness: 0.15,
            side: THREE.DoubleSide,
          });
          disposables.push(face);
          copy.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh && mesh.userData.face) mesh.material = face;
          });
          const tilt = new THREE.Group();
          tilt.scale.setScalar(unit);
          tilt.add(copy);
          const group = new THREE.Group();
          group.add(tilt);
          group.visible = i === 0;
          scene.add(group);
          return { group, tilt, face };
        });
        active.current = 0;

        // A texture may have been painted while the model loaded.
        if (pendingInitial.current) {
          present(pendingInitial.current.tex, pendingInitial.current.dir);
          pendingInitial.current = null;
        }
        setReady(true);
      },
      undefined,
      () => !disposed && setFailed(true),
    );

    const pointer = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
    });
    io.observe(mount);

    const place = (slot: Slot, x: number, z: number, scale: number) => {
      slot.group.position.x = x;
      slot.group.position.z = z;
      slot.group.scale.setScalar(scale);
    };

    const clock = new THREE.Clock();
    let swayY = -0.35;
    let swayX = 0.05;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const s = slots.current;
      if (s.length < 2) {
        renderer.render(scene, camera);
        return;
      }
      const t = clock.getElapsedTime();

      // Idle: slow sway, pointer parallax, gentle float — identical for both slots.
      const targetY = reduced ? -0.35 : -0.35 + Math.sin(t * 0.45) * 0.22 + pointer.x * 0.3;
      const targetX = reduced ? 0.05 : 0.05 + pointer.y * 0.1;
      swayY += (targetY - swayY) * 0.06;
      swayX += (targetX - swayX) * 0.06;
      const floatY = reduced ? 0 : Math.sin(t * 0.9) * 0.06;

      let lean = 0;
      const m = move.current;
      if (m) {
        const p = Math.min(1, (performance.now() - m.start) / SLIDE_MS);
        const e = easeInOut(p);
        const out = s[m.from]!;
        const inn = s[m.to]!;
        // Outgoing slides away against the travel direction, back in depth and a touch smaller.
        place(out, -m.dir * SLIDE_X * e, SLIDE_Z * e, 1 - (1 - SLIDE_SCALE) * e);
        // Incoming arrives from the travel side, starting back and smaller, settling at rest.
        place(inn, m.dir * SLIDE_X * (1 - e), SLIDE_Z * (1 - e), SLIDE_SCALE + (1 - SLIDE_SCALE) * e);
        lean = -m.dir * SLIDE_TILT * Math.sin(Math.PI * p); // a few degrees mid-move, 0 at both ends
        if (p >= 1) {
          out.group.visible = false;
          place(out, 0, 0, 1);
          place(inn, 0, 0, 1);
          active.current = m.to;
          move.current = null;
          lean = 0;
          const q = queued.current;
          queued.current = null;
          if (q) present(q.tex, q.dir);
        }
      }

      for (const slot of s) {
        slot.tilt.rotation.set(swayX, swayY + lean, 0);
        slot.group.position.y = floatY;
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      ro.disconnect();
      io.disconnect();
      slots.current.forEach((sl) => sl.face.map?.dispose());
      queued.current?.tex.dispose();
      pendingInitial.current?.tex.dispose();
      slots.current = [];
      move.current = null;
      queued.current = null;
      pendingInitial.current = null;
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
    // `present` only touches refs, so it's safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  // ── Face texture: painted per car, then presented through the carousel ──
  useEffect(() => {
    if (failed) return;
    let alive = true;
    paintCardArt(car).then((canvas) => {
      if (!alive) return;
      const tex = makeTexture(canvas);
      if (!slots.current.length) {
        pendingInitial.current?.tex.dispose();
        pendingInitial.current = { tex, dir: direction }; // model still loading
        return;
      }
      present(tex, direction);
    });
    return () => {
      alive = false;
    };
    // Repaint only when the car's visual inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car?.id, car?.imageUrl, car?.imageKind, car?.modelNumber, failed]);

  if (failed) {
    return (
      <div className="flex items-center justify-center h-full">
        {car && <BlisterCard data={car} size="lg" />}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Edges fade so packages glide in and out instead of being cut off by the canvas. */}
      <div
        ref={mountRef}
        className="absolute inset-0 [mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)]"
      />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <div className="w-40 aspect-[9/14] rounded-2xl bg-white/5 animate-pulse" />
        </div>
      )}
    </div>
  );
}

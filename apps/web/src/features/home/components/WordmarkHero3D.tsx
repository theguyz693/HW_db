// ──────────────────────────────────────────────
// WordmarkHero3D — the Hot Wheels logo (owner-supplied image) as a solid,
// floating 3D badge for the home page.
//
// The supplied PNG has a checkerboard painted into its pixels, so on load we:
//   1. flood-fill the grey/white backdrop from the edges,
//   2. rebuild the white outline with a distance field (crisp and even),
// then extrude the silhouette by stacking alpha-tested layers (dark-red edge,
// full-colour face). Transparent canvas, so it works on either theme.
// ──────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { cleanLogo } from '@/lib/brandLogo.ts';

const LAYERS = 30;
const DEPTH = 0.34;

export function WordmarkHero3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let cleanup = () => {};

    cleanLogo()
      .then((logo) => {
        if (disposed) return;
        let renderer: THREE.WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        } catch {
          setFallback(logo.face.toDataURL('image/png'));
          return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping; // logo colours must stay exact
        renderer.domElement.setAttribute('aria-hidden', 'true');
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = env;
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
        camera.position.set(0, 0, 10);
        const key = new THREE.DirectionalLight(0xffffff, 1.1);
        key.position.set(-3, 4, 6);
        scene.add(key, new THREE.AmbientLight(0xffffff, 0.45));

        const tex = (cv: HTMLCanvasElement) => {
          const t = new THREE.CanvasTexture(cv);
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          return t;
        };
        const faceTex = tex(logo.face);
        const edgeTex = tex(logo.edge);
        const W = 6.4;
        const H = W / logo.aspect;
        const plane = new THREE.PlaneGeometry(W, H);
        // Low reflection keeps the printed red/yellow true instead of washing to pink.
        const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, alphaTest: 0.5, roughness: 0.55, envMapIntensity: 0.45 });
        const edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, alphaTest: 0.5, roughness: 0.6, envMapIntensity: 0.5, side: THREE.DoubleSide });
        const pivot = new THREE.Group();
        // Back-to-front stack: edge layers form the solid sides, the last layer is the face.
        for (let i = 0; i < LAYERS; i++) {
          const m = new THREE.Mesh(plane, i === LAYERS - 1 ? faceMat : edgeMat);
          m.position.z = -DEPTH / 2 + (DEPTH * i) / (LAYERS - 1);
          pivot.add(m);
        }
        pivot.rotation.z = 0.04;
        scene.add(pivot);

        const pointer = { x: 0, y: 0 };
        const onPointer = (e: PointerEvent) => {
          pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
          pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
        };
        if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

        const resize = () => {
          const cw = mount.clientWidth;
          const ch = mount.clientHeight;
          renderer.setSize(cw, ch, false);
          renderer.domElement.style.width = '100%';
          renderer.domElement.style.height = '100%';
          camera.aspect = cw / Math.max(1, ch);
          // Keep the whole badge in frame on narrow screens.
          camera.position.z = Math.max(10, (W * 1.15) / (2 * Math.tan((15 * Math.PI) / 180) * camera.aspect));
          camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(resize);
        ro.observe(mount);
        resize();

        let visible = true;
        const io = new IntersectionObserver(([e]) => (visible = Boolean(e?.isIntersecting)));
        io.observe(mount);

        const clock = new THREE.Clock();
        let raf = 0;
        const tick = () => {
          raf = requestAnimationFrame(tick);
          if (!visible || document.hidden) return;
          const t = clock.getElapsedTime();
          const ty = reduced ? -0.3 : -0.3 + Math.sin(t * 0.5) * 0.22 + pointer.x * 0.28;
          const tx = reduced ? 0.15 : 0.15 + pointer.y * 0.14;
          pivot.rotation.y += (ty - pivot.rotation.y) * 0.05;
          pivot.rotation.x += (tx - pivot.rotation.x) * 0.05;
          pivot.position.y = reduced ? 0 : Math.sin(t * 0.9) * 0.09;
          renderer.render(scene, camera);
        };
        tick();

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.removeEventListener('pointermove', onPointer);
          ro.disconnect();
          io.disconnect();
          [faceTex, edgeTex, plane, faceMat, edgeMat, env, pmrem].forEach((x) => x.dispose());
          renderer.dispose();
          renderer.domElement.remove();
        };
      })
      .catch(() => !disposed && setFailed(true));

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  if (fallback) {
    return (
      <div className="h-full grid place-items-center">
        <img src={fallback} alt="Hot Wheels" className="max-w-full max-h-full object-contain" />
      </div>
    );
  }
  if (failed) return <div className="h-full" aria-hidden="true" />;
  return <div ref={mountRef} className="h-full w-full" role="img" aria-label="Hot Wheels logo" />;
}

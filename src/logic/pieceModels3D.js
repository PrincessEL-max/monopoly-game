import * as THREE from 'three';
import { createPawnFactory } from './pawnFactory3D';

const PIECE_TYPES = {
  '🚀': 'pesawat',
  '🚗': 'mobil',
  '⚓': 'kapal',
  '🎩': 'topi',
  '🐶': 'anjing',
  '💎': 'pion',
};

const pawnFactory = createPawnFactory(THREE, { quality: 0.8 });

const createModel = (piece, tokenColor) => pawnFactory.make(
  PIECE_TYPES[piece] ?? 'pion',
  { color: tokenColor, scale: 0.5 }
);

let rendererPromise;

export const startPieceRenderer = () => {
  if (rendererPromise) return rendererPromise;

  rendererPromise = new Promise((resolve, reject) => {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.setClearColor(0x000000, 0);
      renderer.autoClear = false;
      renderer.domElement.className = 'piece-model-renderer';
      renderer.domElement.setAttribute('aria-hidden', 'true');

      let renderRoot = null;
      let resizeObserver;
      const updateRenderRoot = () => {
        const stage = document.querySelector('.game-stage');
        const nextRoot = stage || document.body;
        if (nextRoot === renderRoot) return;

        renderRoot = nextRoot;
        renderRoot.appendChild(renderer.domElement);
        renderer.domElement.classList.toggle('piece-model-renderer--stage', !!stage);
        resizeObserver.disconnect();
        if (stage) resizeObserver.observe(stage);
        resize();
      };

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
      camera.position.set(2, 2.3, 3);
      camera.lookAt(0, 0.68, 0);
      scene.add(new THREE.AmbientLight('#ffffff', 1.35));
      const keyLight = new THREE.DirectionalLight('#fff0c8', 3.3);
      keyLight.position.set(-3, 6, 5);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight('#8bbcff', 1.7);
      fillLight.position.set(4, 2, -4);
      scene.add(fillLight);

      const models = new Map();

      const resize = () => {
        if (!renderRoot) return;
        const width = renderRoot === document.body ? window.innerWidth : renderRoot.clientWidth;
        const height = renderRoot === document.body ? window.innerHeight : renderRoot.clientHeight;
        renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      };
      resizeObserver = new ResizeObserver(resize);
      updateRenderRoot();
      window.addEventListener('resize', resize);

      // ── Loop gambar terkontrol ───────────────────────────────
      // Dulu: rAF berjalan selamanya dan TIAP frame memanggil querySelectorAll,
      // getBoundingClientRect, serta getComputedStyle untuk semua leluhur semua
      // bidak (ratusan kalkulasi style per detik di main thread).
      // Sekarang: daftar bidak di-cache (di-refresh lewat MutationObserver),
      // style leluhur di-cache 1 detik, dan loop berhenti saat tab tersembunyi
      // atau tidak ada bidak. Resolusi, kualitas, dan ~30 fps tetap sama.
      const FRAME_MS = 33;
      const CLIP_REFRESH_MS = 1000;
      let frameId = null;
      let previousFrame = 0;
      let elements = [];
      let listDirty = true;
      const clipCache = new WeakMap();

      // Leluhur yang memotong (overflow ≠ visible) — jarang berubah, cukup dicek 1×/detik
      const getClipAncestors = (element, now) => {
        const cached = clipCache.get(element);
        if (cached && cached.root === renderRoot && now - cached.at < CLIP_REFRESH_MS) {
          return cached.ancestors;
        }
        const ancestors = [];
        for (
          let ancestor = element.parentElement;
          ancestor && ancestor !== renderRoot;
          ancestor = ancestor.parentElement
        ) {
          const style = window.getComputedStyle(ancestor);
          const clipX = style.overflowX !== 'visible';
          const clipY = style.overflowY !== 'visible';
          if (clipX || clipY) ancestors.push({ node: ancestor, clipX, clipY });
        }
        clipCache.set(element, { ancestors, root: renderRoot, at: now });
        return ancestors;
      };

      const renderFrame = (timestamp) => {
        const rootWidth = renderRoot === document.body ? window.innerWidth : renderRoot.clientWidth;
        const rootHeight = renderRoot === document.body ? window.innerHeight : renderRoot.clientHeight;
        const rootBounds = renderRoot === document.body
          ? {
              left: 0,
              top: 0,
              right: rootWidth,
              bottom: rootHeight,
              width: rootWidth,
              height: rootHeight,
            }
          : renderRoot.getBoundingClientRect();
        const scaleX = rootBounds.width / Math.max(1, rootWidth);
        const scaleY = rootBounds.height / Math.max(1, rootHeight);
        const frameRects = new Map(); // rect leluhur dibagi antar bidak dalam 1 frame
        const rectOf = (node) => {
          let rect = frameRects.get(node);
          if (!rect) {
            rect = node.getBoundingClientRect();
            frameRects.set(node, rect);
          }
          return rect;
        };
        renderer.setScissorTest(false);
        renderer.clear(true, true, true);
        renderer.setScissorTest(true);

        elements.forEach((element, index) => {
          if (!renderRoot.contains(element)) return;

          const elementRect = element.getBoundingClientRect();
          const visibleRect = {
            left: Math.max(rootBounds.left, elementRect.left),
            top: Math.max(rootBounds.top, elementRect.top),
            right: Math.min(rootBounds.right, elementRect.right),
            bottom: Math.min(rootBounds.bottom, elementRect.bottom),
          };
          getClipAncestors(element, timestamp).forEach(({ node, clipX, clipY }) => {
            const clip = rectOf(node);
            if (clipX) {
              visibleRect.left = Math.max(visibleRect.left, clip.left);
              visibleRect.right = Math.min(visibleRect.right, clip.right);
            }
            if (clipY) {
              visibleRect.top = Math.max(visibleRect.top, clip.top);
              visibleRect.bottom = Math.min(visibleRect.bottom, clip.bottom);
            }
          });
          if (
            visibleRect.right <= visibleRect.left ||
            visibleRect.bottom <= visibleRect.top ||
            elementRect.width <= 0 ||
            elementRect.height <= 0
          ) return;

          const left = (visibleRect.left - rootBounds.left) / scaleX;
          const right = (visibleRect.right - rootBounds.left) / scaleX;
          const top = (visibleRect.top - rootBounds.top) / scaleY;
          const bottom = (visibleRect.bottom - rootBounds.top) / scaleY;
          const width = right - left;
          const height = bottom - top;

          const piece = element.dataset.piece;
          const color = element.dataset.color || '#f0c84b';
          const modelKey = `${piece}-${color}`;
          if (!models.has(modelKey)) {
            const createdModel = createModel(piece, color);
            createdModel.visible = false;
            scene.add(createdModel);
            models.set(modelKey, createdModel);
          }
          const model = models.get(modelKey);
          if (!model) return;
          models.forEach((candidate) => { candidate.visible = false; });
          model.visible = true;
          model.rotation.y = timestamp * 0.00045 + index * 0.38;
          model.rotation.x = -0.08;

          renderer.setViewport(left, rootHeight - bottom, width, height);
          renderer.setScissor(left, rootHeight - bottom, width, height);
          renderer.clear(true, true, true);
          renderer.render(scene, camera);
        });
        renderer.setScissorTest(false);
      };

      const schedule = () => {
        if (frameId === null) frameId = requestAnimationFrame(tick);
      };

      function tick(timestamp) {
        frameId = null;
        if (document.hidden) return; // dilanjutkan oleh 'visibilitychange'
        if (listDirty) {
          updateRenderRoot();
          elements = Array.from(document.querySelectorAll('.piece-model[data-piece]'));
          listDirty = false;
        }
        if (elements.length === 0) {
          // Tidak ada bidak di layar: bersihkan canvas lalu diam sampai ada yang muncul
          renderer.setScissorTest(false);
          renderer.clear(true, true, true);
          return;
        }
        schedule();
        if (timestamp - previousFrame < FRAME_MS) return;
        previousFrame = timestamp;
        renderFrame(timestamp);
      }

      new MutationObserver(() => {
        listDirty = true;
        schedule();
      }).observe(document.body, { childList: true, subtree: true });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) schedule();
      });
      schedule();
      resolve();
    } catch (error) {
      renderer?.dispose();
      renderer?.domElement.remove();
      rendererPromise = null;
      reject(error);
    }
  });

  return rendererPromise;
};

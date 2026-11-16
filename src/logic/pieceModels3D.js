import * as THREE from 'three';

const PIECE_TYPES = {
  '🚀': 'rocket',
  '🚗': 'car',
  '⚓': 'anchor',
  '🎩': 'hat',
  '🐶': 'dog',
  '💎': 'gem',
};

const gold = new THREE.MeshStandardMaterial({ color: '#f0bd4b', metalness: 0.72, roughness: 0.24 });
const lightGold = new THREE.MeshStandardMaterial({ color: '#ffe6a0', metalness: 0.62, roughness: 0.2 });
const darkGold = new THREE.MeshStandardMaterial({ color: '#a76b16', metalness: 0.7, roughness: 0.3 });
const glass = new THREE.MeshStandardMaterial({ color: '#71d5ed', metalness: 0.35, roughness: 0.12 });
const black = new THREE.MeshStandardMaterial({ color: '#202738', metalness: 0.25, roughness: 0.38 });

const mesh = (geometry, material, position, parent) => {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
};

const makeRocket = (group) => {
  mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.78, 24), gold, [0, 0.72, 0], group);
  mesh(new THREE.ConeGeometry(0.2, 0.42, 24), lightGold, [0, 1.32, 0], group);
  mesh(new THREE.SphereGeometry(0.105, 20, 16), glass, [0, 0.91, 0.22], group);
  [-1, 1].forEach((side) => {
    const fin = new THREE.Shape();
    fin.moveTo(0, 0);
    fin.lineTo(side * 0.38, -0.22);
    fin.lineTo(side * 0.23, 0.25);
    fin.closePath();
    const geometry = new THREE.ExtrudeGeometry(fin, { depth: 0.08, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 2 });
    mesh(geometry, darkGold, [0, 0.35, -0.04], group);
  });
};

const makeCar = (group) => {
  mesh(new THREE.BoxGeometry(0.78, 0.26, 1.05), gold, [0, 0.39, 0], group);
  mesh(new THREE.BoxGeometry(0.54, 0.3, 0.56), lightGold, [0, 0.65, -0.04], group);
  mesh(new THREE.BoxGeometry(0.42, 0.2, 0.035), glass, [0, 0.68, 0.25], group);
  mesh(new THREE.BoxGeometry(0.42, 0.2, 0.035), glass, [0, 0.68, -0.33], group);
  [-1, 1].forEach((side) => [-1, 1].forEach((front) => {
    const wheel = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 20), black, [side * 0.39, 0.25, front * 0.32], group);
    wheel.rotation.z = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.126, 16), lightGold, [side * 0.4, 0.25, front * 0.32], group).rotation.z = Math.PI / 2;
  }));
};

const makeAnchor = (group) => {
  mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.05, 20), gold, [0, 0.67, 0], group);
  const ring = mesh(new THREE.TorusGeometry(0.19, 0.07, 12, 32), lightGold, [0, 1.28, 0], group);
  ring.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.8, 16), lightGold, [0, 0.95, 0], group).rotation.z = Math.PI / 2;
  [-1, 1].forEach((side) => {
    const arm = mesh(new THREE.TorusGeometry(0.38, 0.065, 10, 20, Math.PI / 2), gold, [0, 0.28, 0], group);
    arm.rotation.z = side === -1 ? Math.PI * 0.9 : Math.PI * 0.1;
    const tip = mesh(new THREE.ConeGeometry(0.13, 0.3, 16), lightGold, [side * 0.34, 0.16, 0], group);
    tip.rotation.z = side * Math.PI / 4;
  });
};

const makeHat = (group) => {
  mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.13, 40), darkGold, [0, 0.22, 0], group);
  mesh(new THREE.CylinderGeometry(0.31, 0.34, 0.68, 32), gold, [0, 0.61, 0], group);
  mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.13, 32), lightGold, [0, 0.39, 0], group);
};

const makeDog = (group) => {
  mesh(new THREE.SphereGeometry(0.38, 24, 18), gold, [0, 0.49, -0.05], group).scale.set(1.25, 0.82, 0.78);
  mesh(new THREE.SphereGeometry(0.29, 24, 18), lightGold, [0, 0.81, 0.28], group);
  [-1, 1].forEach((side) => {
    const ear = mesh(new THREE.SphereGeometry(0.14, 18, 14), darkGold, [side * 0.2, 0.95, 0.2], group);
    ear.scale.set(0.7, 1.25, 0.55);
    const leg = mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.34, 16), gold, [side * 0.23, 0.2, 0.02], group);
    leg.rotation.z = side * -0.08;
  });
  mesh(new THREE.SphereGeometry(0.085, 16, 12), black, [0, 0.78, 0.54], group);
  const tail = mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.42, 14), lightGold, [0, 0.65, -0.49], group);
  tail.rotation.x = Math.PI / 3;
};

const makeGem = (group) => {
  const gemMaterial = new THREE.MeshPhysicalMaterial({
    color: '#67d8ef',
    metalness: 0.28,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    emissive: '#075577',
    emissiveIntensity: 0.16,
  });
  const gem = mesh(new THREE.OctahedronGeometry(0.55, 0), gemMaterial, [0, 0.76, 0], group);
  gem.scale.set(0.82, 1.18, 0.82);
};

const createModel = (piece, tokenColor) => {
  const group = new THREE.Group();
  const makers = {
    rocket: makeRocket,
    car: makeCar,
    anchor: makeAnchor,
    hat: makeHat,
    dog: makeDog,
    gem: makeGem,
  };
  (makers[PIECE_TYPES[piece]] ?? makeGem)(group);
  const color = new THREE.Color(tokenColor);
  const baseMaterial = new THREE.MeshStandardMaterial({ color, metalness: 0.72, roughness: 0.25 });
  mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.16, 40), baseMaterial, [0, 0.08, 0], group);
  const rimMaterial = new THREE.MeshStandardMaterial({ color: '#f3e5c1', metalness: 0.74, roughness: 0.22 });
  const rim = mesh(new THREE.TorusGeometry(0.43, 0.025, 10, 40), rimMaterial, [0, 0.16, 0], group);
  rim.rotation.x = Math.PI / 2;

  group.traverse((object) => {
    if (!object.isMesh || object.material === glass || object.material === black) return;
    const material = object.material.clone();
    if (object.material === gold) material.color.copy(color);
    else if (object.material === lightGold) material.color.copy(color).lerp(new THREE.Color('#ffffff'), 0.48);
    else if (object.material === darkGold) material.color.copy(color).lerp(new THREE.Color('#10192d'), 0.48);
    else if (material.isMeshPhysicalMaterial) material.color.copy(color).lerp(new THREE.Color('#75edff'), 0.55);
    object.material = material;
  });
  return group;
};

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

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let rendererPromise;

const createBuildingModel = (source) => {
  const model = source.clone(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 1.65 / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  return model;
};

export const startHouseRenderer = () => {
  if (rendererPromise) return rendererPromise;

  rendererPromise = (async () => {
    let renderer;
    try {
      const loader = new GLTFLoader();
      const [house, hotel] = await Promise.all([
        loader.loadAsync('/millionaire-game/assets/house/rumah_1drawcall.glb'),
        loader.loadAsync('/millionaire-game/assets/house/hotel_1drawcall.glb'),
      ]);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      renderer.autoClear = false;
      renderer.domElement.className = 'building-model-renderer';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      document.body.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(18, 1, 0.1, 20);
      camera.position.set(0.8, 2.4, 5.5);
      camera.lookAt(0, 0.55, 0);
      scene.add(new THREE.AmbientLight('#ffffff', 1.8));
      const keyLight = new THREE.DirectionalLight('#fff0c8', 2.8);
      keyLight.position.set(-3, 5, 4);
      scene.add(keyLight);

      const models = new Map([
        ['house', createBuildingModel(house.scene)],
        ['hotel', createBuildingModel(hotel.scene)],
      ]);
      models.forEach((model) => {
        model.visible = false;
        scene.add(model);
      });

      const TICK_MS = 100;
      const SWAY_AMPLITUDE = 0.12;
      const SWAY_STEP = 0.005;
      let timerId = null;
      let lastSignature = '';
      let elements = [];
      let listDirty = true;

      const schedule = (delay = 0) => {
        if (timerId === null) timerId = window.setTimeout(tick, delay);
      };

      const clearCanvas = () => {
        renderer.setScissorTest(false);
        renderer.clear(true, true, true);
      };

      const draw = (timestamp) => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const sway = Math.round(
          (Math.sin(timestamp * 0.00025) * SWAY_AMPLITUDE) / SWAY_STEP
        ) * SWAY_STEP;
        const items = [];

        elements.forEach((element) => {
          if (!element.isConnected || element.dataset.modelReady !== 'true') return;
          const rect = element.getBoundingClientRect();
          const left = Math.max(0, rect.left);
          const right = Math.min(width, rect.right);
          const top = Math.max(0, rect.top);
          const bottom = Math.min(height, rect.bottom);
          if (right <= left || bottom <= top || rect.width <= 0 || rect.height <= 0) return;
          items.push({ element, rect, left, right, top, bottom });
        });

        const round = (value) => Math.round(value * 10);
        const signature = `${width}x${height}|${sway.toFixed(3)}|` + items
          .map(({ element, rect, left, right, top, bottom }) => [
            element.dataset.building,
            round(rect.left), round(rect.top), round(rect.width), round(rect.height),
            round(left), round(right), round(top), round(bottom),
          ].join(','))
          .join(';');
        if (signature === lastSignature) return;
        lastSignature = signature;

        clearCanvas();
        renderer.setScissorTest(true);
        items.forEach(({ element, rect, left, right, top, bottom }) => {
          const model = models.get(element.dataset.building);
          if (!model) return;
          models.forEach((candidate) => { candidate.visible = false; });
          model.visible = true;
          model.rotation.y = sway;
          camera.aspect = rect.width / rect.height;
          camera.updateProjectionMatrix();
          renderer.setViewport(rect.left, height - rect.bottom, rect.width, rect.height);
          renderer.setScissor(
            left,
            height - bottom,
            right - left,
            bottom - top
          );
          renderer.clear(true, true, true);
          renderer.render(scene, camera);
        });
        renderer.setScissorTest(false);
      };

      function tick() {
        timerId = null;
        if (document.hidden) return;
        if (listDirty) {
          elements = Array.from(document.querySelectorAll('.bld-model'));
          listDirty = false;
        }
        if (!elements.some((element) => element.dataset.modelReady === 'true')) {
          if (lastSignature !== '') {
            clearCanvas();
            lastSignature = '';
          }
          return;
        }
        schedule(TICK_MS);
        draw(performance.now());
      }

      const resize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        lastSignature = '';
        schedule();
      };
      resize();
      window.addEventListener('resize', resize);

      new MutationObserver(() => {
        listDirty = true;
        schedule();
      }).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-model-ready'],
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          lastSignature = '';
          schedule();
        }
      });
    } catch (error) {
      renderer?.dispose();
      renderer?.domElement.remove();
      rendererPromise = null;
      throw error;
    }
  })();

  return rendererPromise;
};

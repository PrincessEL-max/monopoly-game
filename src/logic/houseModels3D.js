import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let rendererPromise;

const createBuildingModel = (source) => {
  const model = source.clone(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 1.35 / Math.max(size.x, size.y, size.z);
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

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      renderer.autoClear = false;
      renderer.domElement.className = 'building-model-renderer';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      document.body.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
      camera.position.set(2.2, 2, 3.2);
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

      const resize = () => renderer.setSize(window.innerWidth, window.innerHeight, false);
      resize();
      window.addEventListener('resize', resize);

      let previousFrame = 0;
      const draw = (timestamp) => {
        requestAnimationFrame(draw);
        if (timestamp - previousFrame < 33) return;
        previousFrame = timestamp;

        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setScissorTest(false);
        renderer.clear(true, true, true);
        renderer.setScissorTest(true);

        document.querySelectorAll('.bld-model[data-model-ready="true"]').forEach((element) => {
          const rect = element.getBoundingClientRect();
          const left = Math.max(0, rect.left);
          const right = Math.min(width, rect.right);
          const top = Math.max(0, rect.top);
          const bottom = Math.min(height, rect.bottom);
          if (right <= left || bottom <= top || rect.width <= 0 || rect.height <= 0) return;

          const model = models.get(element.dataset.building);
          if (!model) return;
          models.forEach((candidate) => { candidate.visible = false; });
          model.visible = true;
          model.rotation.y = Math.sin(timestamp * 0.00025) * 0.12;
          renderer.setViewport(rect.left, height - rect.bottom, rect.width, rect.height);
          renderer.setScissor(left, height - bottom, right - left, bottom - top);
          renderer.clear(true, true, true);
          renderer.render(scene, camera);
        });

        renderer.setScissorTest(false);
      };
      requestAnimationFrame(draw);
    } catch (error) {
      renderer?.dispose();
      renderer?.domElement.remove();
      rendererPromise = null;
      throw error;
    }
  })();

  return rendererPromise;
};

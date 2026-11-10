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
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.setClearColor(0x000000, 0);
      renderer.autoClear = false;
      renderer.domElement.className = 'piece-model-renderer';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      document.body.appendChild(renderer.domElement);

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
        const elements = document.querySelectorAll('.piece-model[data-piece]');
        renderer.setScissorTest(false);
        renderer.clear(true, true, true);
        renderer.setScissorTest(true);

        elements.forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          const left = Math.max(0, rect.left);
          const right = Math.min(width, rect.right);
          const top = Math.max(0, rect.top);
          const bottom = Math.min(height, rect.bottom);
          if (right <= left || bottom <= top || rect.width <= 0 || rect.height <= 0) return;

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

          renderer.setViewport(rect.left, height - rect.bottom, rect.width, rect.height);
          renderer.setScissor(left, height - bottom, right - left, bottom - top);
          renderer.clear(true, true, true);
          renderer.render(scene, camera);
        });
        renderer.setScissorTest(false);
      };
      requestAnimationFrame(draw);
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

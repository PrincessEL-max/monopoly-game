import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const FACE_LAYOUTS = [
  { value: 1, normal: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] },
  { value: 6, normal: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] },
  { value: 2, normal: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] },
  { value: 5, normal: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] },
  { value: 3, normal: [0, 1, 0], right: [1, 0, 0], up: [0, 0, -1] },
  { value: 4, normal: [0, -1, 0], right: [1, 0, 0], up: [0, 0, 1] },
];

const DIE_SIZE = 0.94;
const DIE_HALF_SIZE = DIE_SIZE / 2;
const DIE_BASE_Y = DIE_HALF_SIZE + 0.012;

function createDie() {
  const group = new THREE.Group();
  const bodyGeometry = new RoundedBoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE, 5, 0.12);
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: '#fff8e9',
    roughness: 0.24,
    metalness: 0.02,
    clearcoat: 0.45,
    clearcoatRoughness: 0.18,
  });
  group.add(new THREE.Mesh(bodyGeometry, bodyMaterial));

  const pipGeometry = new THREE.CylinderGeometry(0.078, 0.078, 0.018, 20);
  const pipMaterial = new THREE.MeshStandardMaterial({
    color: '#18202b',
    roughness: 0.42,
    metalness: 0.04,
  });
  const localUp = new THREE.Vector3(0, 1, 0);

  FACE_LAYOUTS.forEach((face) => {
    const normal = new THREE.Vector3(...face.normal);
    const right = new THREE.Vector3(...face.right);
    const up = new THREE.Vector3(...face.up);
    PIPS[face.value].forEach((index) => {
      const column = (index % 3) - 1;
      const row = 1 - Math.floor(index / 3);
      const pip = new THREE.Mesh(pipGeometry, pipMaterial);
      pip.position
        .copy(normal).multiplyScalar(DIE_HALF_SIZE + 0.006)
        .addScaledVector(right, column * 0.205)
        .addScaledVector(up, row * 0.205);
      pip.quaternion.setFromUnitVectors(localUp, normal);
      group.add(pip);
    });
  });

  return group;
}

function createShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(24, 18, 12, 0.42)');
  gradient.addColorStop(0.45, 'rgba(24, 18, 12, 0.2)');
  gradient.addColorStop(1, 'rgba(24, 18, 12, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function createShadow(texture) {
  const material = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    map: texture,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    toneMapped: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.006;
  return shadow;
}

function getTargetOrientation(value, index) {
  const face = FACE_LAYOUTS.find((candidate) => candidate.value === value);
  const alignTop = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(...face.normal),
    new THREE.Vector3(0, 1, 0)
  );
  const yaw = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    value * 0.39 + index * 0.73
  );
  return yaw.multiply(alignTop);
}

function createMotion(roll, duration) {
  return {
    roll,
    duration,
    startedAt: performance.now(),
    dice: [roll.d1, roll.d2].map((value, index) => {
      const endX = index === 0 ? -0.56 : 0.56;
      return {
        endPosition: new THREE.Vector3(endX, DIE_BASE_Y, index === 0 ? 0.08 : -0.08),
        startPosition: new THREE.Vector3(
          endX + (index === 0 ? -1.35 : 1.35),
          0,
          index === 0 ? -0.72 : 0.72
        ),
        targetOrientation: getTargetOrientation(value, index),
        spin: new THREE.Vector3(
          Math.PI * (4.4 + index * 0.7),
          Math.PI * (5.2 + index * 0.8),
          Math.PI * (3.6 + index * 0.9)
        ),
      };
    }),
  };
}

function updateMotion(sceneData, motion, now) {
  const progress = Math.min(1, (now - motion.startedAt) / motion.duration);
  const travelProgress = Math.min(1, progress / 0.72);
  const travel = 1 - Math.pow(1 - travelProgress, 3);

  motion.dice.forEach((dieMotion, index) => {
    const die = sceneData.dice[index];
    const shadow = sceneData.shadows[index];
    die.position.x = THREE.MathUtils.lerp(
      dieMotion.startPosition.x,
      dieMotion.endPosition.x,
      travel
    );
    die.position.z = THREE.MathUtils.lerp(
      dieMotion.startPosition.z,
      dieMotion.endPosition.z,
      travel
    );

    if (progress < 0.72) {
      const flight = progress / 0.72;
      die.position.y = DIE_BASE_Y + 1.5 * (1 - flight) + 0.9 * Math.sin(Math.PI * flight);
    } else {
      const settle = (progress - 0.72) / 0.28;
      const bounce = Math.abs(Math.sin(settle * Math.PI * 2.5)) * 0.16 * (1 - settle) ** 2;
      die.position.y = DIE_BASE_Y + bounce;
    }

    const spinAmount = Math.pow(1 - progress, 1.15);
    const spin = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      dieMotion.spin.x * spinAmount,
      dieMotion.spin.y * spinAmount,
      dieMotion.spin.z * spinAmount,
      'XYZ'
    ));
    die.quaternion.copy(dieMotion.targetOrientation).multiply(spin);

    shadow.position.x = die.position.x;
    shadow.position.z = die.position.z;
    shadow.scale.set(1 + die.position.y * 0.16, 1 + die.position.y * 0.16, 1);
    shadow.material.opacity = Math.max(0.1, 0.34 - (die.position.y - DIE_BASE_Y) * 0.1);
  });

  return progress >= 1;
}

export function createDiceRenderer(canvas) {
  let renderer;
  let resizeObserver;
  let frameId = null;
  let active = true;
  let motion = null;
  let shadowTexture;
  let scene;
  let camera;
  let dice;
  let shadows;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
    camera.position.set(0, 3.25, 4.5);
    camera.lookAt(0, 0.45, 0);
    scene.add(new THREE.HemisphereLight('#fff8e9', '#50403b', 2.1));

    const keyLight = new THREE.DirectionalLight('#fff1d2', 3.2);
    keyLight.position.set(-3, 6, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#a9c5ff', 1.6);
    fillLight.position.set(4, 2, -3);
    scene.add(fillLight);

    shadowTexture = createShadowTexture();
    dice = [createDie(), createDie()];
    shadows = [createShadow(shadowTexture), createShadow(shadowTexture)];
    dice.forEach((die, index) => {
      die.position.set(index === 0 ? -0.56 : 0.56, DIE_BASE_Y, 0);
      die.rotation.set(-0.2, 0.3 + index * 0.35, 0.12);
      scene.add(die);
      scene.add(shadows[index]);
    });
  } catch (error) {
    renderer?.dispose();
    throw error;
  }

  const sceneData = { scene, camera, dice, shadows };
  const draw = (timestamp) => {
    frameId = null;
    if (!active) return;
    if (motion && updateMotion(sceneData, motion, timestamp)) motion = null;
    renderer.render(scene, camera);
    if (motion) frameId = requestAnimationFrame(draw);
  };
  const invalidate = () => {
    if (active && frameId === null) frameId = requestAnimationFrame(draw);
  };
  const resize = () => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    invalidate();
  };

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const settle = (roll) => {
    [roll.d1, roll.d2].forEach((value, index) => {
      dice[index].position.set(index === 0 ? -0.56 : 0.56, DIE_BASE_Y, index === 0 ? 0.08 : -0.08);
      dice[index].quaternion.copy(getTargetOrientation(value, index));
      shadows[index].position.x = dice[index].position.x;
      shadows[index].position.z = dice[index].position.z;
      shadows[index].material.opacity = 0.34;
      shadows[index].scale.set(1, 1, 1);
    });
    invalidate();
  };

  return {
    roll(rollResult, duration) {
      motion = createMotion(rollResult, duration);
      invalidate();
    },
    settle,
    dispose() {
      active = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.dispose();

      const geometries = new Set();
      const materials = new Set();
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material));
        else if (object.material) materials.add(object.material);
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      shadowTexture.dispose();
    },
  };
}

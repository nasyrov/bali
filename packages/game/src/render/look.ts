// The golden-hour look: the palette, the flat-shaded materials, the warm haze that doubles as
// the mechanism hiding chunk pop-in, a static sky, and the sea. Time of day and the real sun
// arrive with the day/night ticket; for now the scene is fixed at the day keyframe.

import * as THREE from 'three';

/** Palette from the art-direction decision. */
export const PALETTE = {
  grass: 0x8fae5a,
  roadLine: 0xe8dcb5,
  sea: 0x6fa1b8,
  /** The far end of the sea's slow shimmer, a shade greener than the sea itself. */
  seaShimmer: 0x63a3ab,
  water: 0x9fb8b0,
  stone: 0x9a8e7c,
  skyZenith: 0x6d9fd0,
  skyHorizon: 0xf0d9b0,
  sun: 0xffe6c0,
  scooter: 0xd0552f,
  seat: 0x352f2a,
  tyre: 0x22201e,
  rider: 0xe4d9c4,
} as const;

/**
 * Haze density. The prototype used 0.0016 over a 6.6 km box; at world scale the horizon has
 * to sit far enough out that a chunk fades in rather than appearing.
 */
const FOG_DENSITY = 0.00035;

/** How far the camera can see, in metres. */
export const VIEW_DISTANCE = 12_000;

/** How long the sea takes to breathe once through its colour shimmer, in seconds. */
const SEA_SHIMMER_PERIOD = 14;

export interface Look {
  scene: THREE.Scene;
  /** One material for every road surface; colour comes from the baked vertex colours. */
  roadMaterial: THREE.Material;
  /** One material for every marking. */
  markingMaterial: THREE.Material;
  /** One material for all the ground; colour comes from the baked land cover colours. */
  terrainMaterial: THREE.Material;
  /** Rivers, channels and lakes. */
  waterMaterial: THREE.Material;
  /** Terrace walls. */
  wallMaterial: THREE.Material;
  /** The flat sea plane, at height zero; move it under the camera and shimmer it each frame. */
  sea: THREE.Mesh;
  /** Advance the sea's slow colour shimmer. */
  shimmer: (elapsed: number) => void;
}

function flatMaterial(options: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.95, metalness: 0, ...options });
}

/** Build the scene, its lighting and the sea the island sits in. */
export function createLook(): Look {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyHorizon);
  scene.fog = new THREE.FogExp2(PALETTE.skyHorizon, FOG_DENSITY);

  const sun = new THREE.DirectionalLight(PALETTE.sun, 3);
  sun.position.set(-300, 220, -200);
  scene.add(sun, new THREE.HemisphereLight(PALETTE.skyHorizon, PALETTE.grass, 1.1));

  // The sea is one flat plane at height zero, wherever the terrain was clipped away at the
  // coastline. It belongs to no chunk, so it hangs off the scene and follows the camera.
  const seaMaterial = flatMaterial({ color: PALETTE.sea, roughness: 0.4 });
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(VIEW_DISTANCE * 2, VIEW_DISTANCE * 2).rotateX(-Math.PI / 2),
    seaMaterial,
  );
  sea.name = 'sea';
  scene.add(sea);

  const calm = new THREE.Color(PALETTE.sea);
  const swell = new THREE.Color(PALETTE.seaShimmer);

  return {
    scene,
    sea,
    shimmer(elapsed: number) {
      const phase = 0.5 - 0.5 * Math.cos((elapsed / SEA_SHIMMER_PERIOD) * Math.PI * 2);
      seaMaterial.color.copy(calm).lerp(swell, phase);
    },
    roadMaterial: flatMaterial({ vertexColors: true }),
    markingMaterial: flatMaterial({ color: PALETTE.roadLine, roughness: 0.9 }),
    terrainMaterial: flatMaterial({ vertexColors: true }),
    waterMaterial: flatMaterial({ color: PALETTE.water, roughness: 0.5 }),
    wallMaterial: flatMaterial({ color: PALETTE.stone }),
  };
}

/** Configure the renderer for the golden-hour grade. */
export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  return renderer;
}

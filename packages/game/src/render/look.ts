// The golden-hour look: the palette, the flat-shaded material, the warm haze that doubles as
// the mechanism hiding chunk pop-in, and a static sky. Time of day and the real sun arrive
// with the day/night ticket; for now the scene is fixed at the day keyframe.

import * as THREE from 'three';

/** Palette from the art-direction decision. */
export const PALETTE = {
  grass: 0x8fae5a,
  roadLine: 0xe8dcb5,
  skyZenith: 0x6d9fd0,
  skyHorizon: 0xf0d9b0,
  sun: 0xffe6c0,
} as const;

/**
 * Haze density. The prototype used 0.0016 over a 6.6 km box; at world scale the horizon has
 * to sit far enough out that a chunk fades in rather than appearing.
 */
const FOG_DENSITY = 0.00035;

/** How far the camera can see, in metres. */
export const VIEW_DISTANCE = 12_000;

export interface Look {
  scene: THREE.Scene;
  /** One material for every road surface; colour comes from the baked vertex colours. */
  roadMaterial: THREE.Material;
  /** One material for every marking. */
  markingMaterial: THREE.Material;
}

/** Build the scene, its lighting and the ground the roads sit on. */
export function createLook(): Look {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyHorizon);
  scene.fog = new THREE.FogExp2(PALETTE.skyHorizon, FOG_DENSITY);

  const sun = new THREE.DirectionalLight(PALETTE.sun, 3);
  sun.position.set(-300, 220, -200);
  scene.add(sun, new THREE.HemisphereLight(PALETTE.skyHorizon, PALETTE.grass, 1.1));

  // A flat ground plane stands in until the terrain ticket; it is not part of any chunk, so
  // it is parented to the scene rather than the world root and simply follows the camera.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(VIEW_DISTANCE * 2, VIEW_DISTANCE * 2).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: PALETTE.grass, flatShading: true, roughness: 0.95, metalness: 0 }),
  );
  ground.name = 'ground';
  ground.position.y = -0.05;
  scene.add(ground);

  return {
    scene,
    roadMaterial: new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.95,
      metalness: 0,
    }),
    markingMaterial: new THREE.MeshStandardMaterial({
      color: PALETTE.roadLine,
      flatShading: true,
      roughness: 0.9,
      metalness: 0,
    }),
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

// The runtime's entry point. For now it stands up an empty three.js scene at the world
// position the first Ride starts from; roads, terrain and the World itself arrive with the
// tickets that follow.

import * as THREE from 'three';
import { chunkCentre, chunkKey, lonLatToWorld, worldToChunk } from '@bali-moto/shared';

/** Jalan Raya Canggu, where the first Ride starts. */
const START_LON_LAT = { lon: 115.1389, lat: -8.6478 };

/** Horizon colour of the day sky from the art-direction decision. */
const SKY_HORIZON = 0xf0d9b0;
const SKY_ZENITH = 0x6d9fd0;

const start = lonLatToWorld(START_LON_LAT.lon, START_LON_LAT.lat);
const startChunk = worldToChunk(start.x, start.z);
const startCentre = chunkCentre(startChunk);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_HORIZON);
scene.fog = new THREE.FogExp2(SKY_HORIZON, 0.007);
scene.add(new THREE.HemisphereLight(SKY_ZENITH, 0x8fae5a, 1.2));

// Geometry is stored relative to its chunk centre, so the camera works in chunk-local metres.
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 12_000);
camera.position.set(start.x - startCentre.x, 12, start.z - startCentre.z);
camera.lookAt(camera.position.x, 0, camera.position.z - 50);

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

renderer.setAnimationLoop(() => renderer.render(scene, camera));

console.info(`Bali Moto: empty scene at ${chunkKey(startChunk)} (x ${start.x.toFixed(1)}, z ${start.z.toFixed(1)})`);

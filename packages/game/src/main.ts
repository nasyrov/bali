// The runtime's entry point. A fly camera over the Canggu road network, with chunks
// streaming in and out around it. The bike, the World and the HUD arrive with later tickets;
// what this proves is the world data contract from the pipeline through to the screen.

import { MANIFEST_FILE, WORLD_FORMAT_VERSION, chunkKey, lonLatToWorld, worldToChunk } from '@bali-moto/shared';
import type { WorldManifest } from '@bali-moto/shared';
import * as THREE from 'three';
import { FlyCamera } from './render/flyCamera.ts';
import { VIEW_DISTANCE, createLook, createRenderer } from './render/look.ts';
import { createChunkView } from './render/roads.ts';
import { ChunkLoader } from './world/chunkLoader.ts';
import { ChunkStream } from './world/streaming.ts';
import { WorldRoot } from './world/worldRoot.ts';

/** Where the pipeline's output is served, both in development and in production. */
const WORLD_ROOT = '/world';

/** Jalan Raya Canggu, where the first Ride starts. The camera opens above it, facing north. */
const START = { lon: 115.1580183, lat: -8.64443 };
const START_ALTITUDE = 90;
const START_PITCH = -0.3;

/** Tier 0: the three by three block of chunks around the camera. */
const STREAM_RING = 1;
const BYTE_BUDGET = 300_000_000;

const manifestResponse = await fetch(`${WORLD_ROOT}/${MANIFEST_FILE}`);
if (!manifestResponse.ok) {
  throw new Error(
    `No world data at ${WORLD_ROOT}/${MANIFEST_FILE} (${manifestResponse.status}). Build it with \`npm run world\`.`,
  );
}

const manifest: WorldManifest = await manifestResponse.json();
if (manifest.formatVersion !== WORLD_FORMAT_VERSION) {
  throw new Error(
    `World data is format version ${manifest.formatVersion}, but this build reads version ${WORLD_FORMAT_VERSION}. Rebuild it with \`npm run world\`.`,
  );
}

const look = createLook();
const renderer = createRenderer();
document.body.append(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, 1, 0.5, VIEW_DISTANCE);
const ground = look.scene.getObjectByName('ground')!;

const fly = new FlyCamera({
  start: lonLatToWorld(START.lon, START.lat),
  altitude: START_ALTITUDE,
  pitch: START_PITCH,
});
fly.attach(renderer.domElement);

const world = new WorldRoot(fly.position);
look.scene.add(world.group);

const stream = new ChunkStream(manifest, { loadRing: STREAM_RING, byteBudget: BYTE_BUDGET });
const loader = new ChunkLoader(WORLD_ROOT, (parsed) => {
  world.add(createChunkView(parsed, look, world.origin));
});

const hud = document.createElement('div');
hud.id = 'hud';
document.body.append(hud);

function resize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
addEventListener('resize', resize);
resize();

let lastFrame = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const seconds = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  fly.update(seconds);
  world.follow(fly.position);

  const plan = stream.update(fly.position, fly.yaw);
  for (const chunk of plan.load) loader.request(chunk);
  for (const chunk of plan.unload) {
    loader.cancel(chunk);
    world.remove(chunkKey(chunk));
  }

  const rendered = world.toRenderSpace(fly.position);
  camera.position.set(rendered.x, fly.position.y, rendered.z);
  camera.rotation.set(fly.pitch, Math.PI - fly.yaw, 0, 'YXZ');
  // The ground plane stands in for terrain, so it simply follows the camera.
  ground.position.set(camera.position.x, ground.position.y, camera.position.z);

  renderer.render(look.scene, camera);

  const chunk = worldToChunk(fly.position.x, fly.position.z);
  hud.textContent =
    `${chunkKey(chunk)} · x ${fly.position.x.toFixed(0)} z ${fly.position.z.toFixed(0)} · ${fly.position.y.toFixed(0)} m up\n` +
    `${world.size} chunks · ${(world.triangles / 1000).toFixed(0)}k triangles · ${renderer.info.render.calls} draw calls\n` +
    'WASD fly · Q/E down and up · Shift faster · click to look around';
});

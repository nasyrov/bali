// The runtime's entry point: a thin view over the headless World. The World owns the ride —
// the bike, the chase camera, which Road is underneath and which chunks are wanted — and
// everything here reads that state and draws it, or feeds it what the network brought back.

import { MANIFEST_FILE, WORLD_FORMAT_VERSION, chunkKey, worldToChunk } from '@bali-moto/shared';
import type { WorldManifest } from '@bali-moto/shared';
import * as THREE from 'three';
import { createBikeMesh } from './render/bike.ts';
import { Controls } from './render/controls.ts';
import { VIEW_DISTANCE, createLook, createRenderer } from './render/look.ts';
import { createChunkView } from './render/chunk.ts';
import { World } from './ride/world.ts';
import { ChunkLoader } from './world/chunkLoader.ts';
import { WorldRoot } from './world/worldRoot.ts';

/** Where the pipeline's output is served, both in development and in production. */
const WORLD_ROOT = '/world';

/** The longest step the simulation takes, so a stalled tab does not teleport the bike. */
const MAX_TICK = 0.05;

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
const sea = look.sea;

const world = new World({ manifest, clock: Date });

const controls = new Controls();
controls.attach(renderer.domElement);

const root = new WorldRoot(world.bike);
look.scene.add(root.group);

const bikeMesh = createBikeMesh();
look.scene.add(bikeMesh);

const loader = new ChunkLoader(WORLD_ROOT, (parsed) => {
  // The view is built first, because it is what takes the terrain's buffers off the worker's
  // transfer; the World then keeps the same arrays for its own height lookups.
  root.add(createChunkView(parsed, look, root.origin));
  world.addTerrain(parsed.terrain);
  world.addGraph(parsed.graph);
});

const hud = document.createElement('div');
hud.id = 'hud';
const roadLabel = document.createElement('div');
roadLabel.id = 'road';
document.body.append(hud, roadLabel);

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
  const seconds = Math.min((now - lastFrame) / 1000, MAX_TICK);
  lastFrame = now;

  const plan = world.tick(controls.read(), seconds);
  for (const chunk of plan.load) loader.request(chunk);
  for (const chunk of plan.unload) {
    loader.cancel(chunk);
    world.dropGraph(chunk);
    world.dropTerrain(chunk);
    root.remove(chunkKey(chunk));
  }

  const pose = world.camera.pose;
  root.follow(pose);

  const rendered = root.toRenderSpace(pose);
  camera.position.set(rendered.x, pose.y, rendered.z);
  // Headings are measured from north, clockwise, and a camera looks down its own -z.
  camera.rotation.set(pose.pitch, -pose.heading, pose.roll, 'YXZ');
  if (camera.fov !== pose.fov) {
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
  }

  const ridden = root.toRenderSpace(world.bike);
  bikeMesh.position.set(ridden.x, world.bike.y, ridden.z);
  bikeMesh.rotation.set(0, -world.bike.heading, -world.bike.lean, 'YXZ');

  // The sea is one plane at height zero for the whole world, so it follows the camera and
  // shows wherever the terrain was clipped away at the coastline.
  sea.position.set(camera.position.x, 0, camera.position.z);
  look.shimmer(now / 1000);

  renderer.render(look.scene, camera);

  const chunk = worldToChunk(world.bike.x, world.bike.z);
  hud.hidden = controls.freeLooking;
  hud.textContent =
    `${(world.bike.speed * 3.6).toFixed(0)} km/h\n` +
    `${chunkKey(chunk)} · x ${world.bike.x.toFixed(0)} z ${world.bike.z.toFixed(0)}\n` +
    `${root.size} chunks · ${(root.triangles / 1000).toFixed(0)}k triangles · ${renderer.info.render.calls} draw calls\n` +
    'W/S ride · A/D steer · Shift brake · R back to the road · drag to look around';
  roadLabel.hidden = controls.freeLooking;
  roadLabel.textContent = world.roadName ?? '';
});

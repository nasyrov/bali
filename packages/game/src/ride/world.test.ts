// Seam 2, the headless World: a Ride scripted with plain input against fixture world data
// and a fake clock, with no renderer, DOM or audio in sight.

import {
  RIDE_START,
  RIDE_START_HEADING,
  WORLD_FORMAT_VERSION,
  chunkCentre,
  chunkKey,
  worldToChunk,
} from '@bali-moto/shared';
import type {
  ChunkId,
  GraphBlob,
  GraphEdge,
  RoadClass,
  WorldManifest,
  WorldPoint,
} from '@bali-moto/shared';
import { describe, expect, it } from 'vitest';
import { IDLE, type RideInput } from './input.ts';
import { ASPHALT_TOP_SPEED, surfaceOf, topSpeedOn } from './surfaces.ts';
import { World } from './world.ts';

/** A clock that never moves, because nothing in a Ride's handling depends on the hour yet. */
const FIXED_CLOCK = { now: () => Date.parse('2026-09-08T17:30:00+08:00') };

/** One tick of a 60 Hz ride. */
const TICK = 1 / 60;

function manifestOf(chunks: ChunkId[]): WorldManifest {
  return {
    formatVersion: WORLD_FORMAT_VERSION,
    extractTimestamp: '2026-09-07T20:21:20Z',
    chunkSize: 1000,
    chunks: Object.fromEntries(chunks.map((chunk) => [chunkKey(chunk), { 'graph.bin': 1000 }])),
  };
}

/**
 * A chunk holding one straight Road running the full height of it through the centre. Laid
 * in a column of chunks these join end to end into a road long enough to ride flat out on.
 */
function straightRoad(
  chunk: ChunkId,
  options: { name?: string; surface?: string; cls?: RoadClass; width?: number } = {},
): GraphBlob {
  const edge: GraphEdge = {
    nodes: [0, 1],
    points: [
      { x: 0, z: 500 },
      { x: 0, z: -500 },
    ],
    cls: options.cls ?? 'secondary',
    width: options.width ?? 5,
    surface: options.surface ?? 'asphalt',
    oneway: 0,
    lanes: 2,
    name: options.name ?? 'Jalan Raya Canggu',
    bridge: false,
    layer: 0,
  };

  return {
    header: { formatVersion: WORLD_FORMAT_VERSION, chunk, counts: [] },
    chunk,
    nodes: [
      { id: 1, x: 0, z: 500 },
      { id: 2, x: 0, z: -500 },
    ],
    edges: [edge],
  };
}

/**
 * A World on a road running north through three chunks, the bike parked on it in the middle
 * one facing north, which is far enough to hold the throttle down for half a minute.
 */
function worldOnARoad(
  options: Parameters<typeof straightRoad>[1] = {},
  landCoverAt?: (point: WorldPoint) => string,
) {
  const middle = worldToChunk(RIDE_START.x, RIDE_START.z);
  const column = [-1, 0, 1].map((step) => ({ i: middle.i, j: middle.j + step }));
  const world = new World({
    manifest: manifestOf(column),
    clock: FIXED_CLOCK,
    start: { position: chunkCentre(middle), heading: 0 },
    landCoverAt,
  });
  for (const chunk of column) world.addGraph(straightRoad(chunk, options));
  return world;
}

/** Ride for a while on one held input, at the frame rate the browser runs at. */
function ride(world: World, seconds: number, input: Partial<RideInput> = {}): void {
  for (let tick = 0; tick < Math.round(seconds / TICK); tick++) {
    world.tick({ ...IDLE, ...input }, TICK);
  }
}

describe('the first Ride', () => {
  it('starts on Jalan Raya Canggu facing north', () => {
    const world = worldOnARoad();
    // A Ride opened at the default start is on the real road; this one is the fixture's.
    expect(new World({ manifest: manifestOf([]), clock: FIXED_CLOCK }).bike).toMatchObject({
      x: RIDE_START.x,
      z: RIDE_START.z,
      heading: RIDE_START_HEADING,
      speed: 0,
    });

    world.tick(IDLE, TICK);
    expect(world.roadName).toBe('Jalan Raya Canggu');
  });

  it('opens with the camera behind the bike, not somewhere it has to catch up from', () => {
    const world = worldOnARoad();
    // Facing north, so the camera sits a boom's length south of the bike.
    expect(world.camera.pose.z).toBeGreaterThan(world.bike.z);
    expect(world.camera.pose.x).toBeCloseTo(world.bike.x, 6);
  });
});

describe('the throttle', () => {
  it('approaches the asphalt cap and holds there', () => {
    const world = worldOnARoad();
    ride(world, 30, { throttle: 1 });

    expect(world.bike.speed).toBeGreaterThan(ASPHALT_TOP_SPEED - 0.5);
    expect(world.bike.speed).toBeLessThanOrEqual(ASPHALT_TOP_SPEED);
  });

  it('is punchy: past 50 km/h in about four seconds', () => {
    const world = worldOnARoad();
    ride(world, 4, { throttle: 1 });
    expect(world.bike.speed * 3.6).toBeGreaterThan(48);
    expect(world.bike.speed * 3.6).toBeLessThan(56);
  });

  it('approaches the sand cap out on the sand, a quarter of the asphalt one', () => {
    const world = worldOnARoad({}, () => 'sand');
    world.bike.x += 30;
    ride(world, 30, { throttle: 1 });

    expect(world.road).toBeUndefined();
    expect(world.bike.speed).toBeCloseTo(topSpeedOn('sand'), 1);
    expect(topSpeedOn('sand')).toBeCloseTo(ASPHALT_TOP_SPEED * 0.25, 6);
  });

  it('caps a gang of paving stones below the main road', () => {
    const gang = worldOnARoad({ cls: 'living_street', surface: 'paving_stones' });
    ride(gang, 30, { throttle: 1 });
    expect(gang.bike.speed).toBeCloseTo(topSpeedOn('paving_stones'), 1);
  });

  it('falls back to the land cover once the Ride leaves the Roads', () => {
    const world = worldOnARoad();
    // Off the shoulder of a 5 m road and into the grass beside it.
    world.bike.x += 30;
    ride(world, 30, { throttle: 1 });

    expect(world.road).toBeUndefined();
    expect(world.roadName).toBeUndefined();
    expect(world.bike.speed).toBeCloseTo(topSpeedOn('grass'), 1);
  });
});

describe('the brakes', () => {
  it('stops the bike sooner on Shift than on the brake alone', () => {
    const braked = worldOnARoad();
    const hard = worldOnARoad();
    for (const world of [braked, hard]) ride(world, 10, { throttle: 1 });

    ride(braked, 1, { throttle: -1 });
    ride(hard, 1, { throttle: -1, hardBrake: true });

    expect(hard.bike.speed).toBeLessThan(braked.bike.speed);
    expect(braked.bike.speed).toBeLessThan(ASPHALT_TOP_SPEED);
  });

  it('reverses slowly out of a dead end once the bike has stopped', () => {
    const world = worldOnARoad();
    ride(world, 6, { throttle: -1 });

    expect(world.bike.speed).toBeLessThan(0);
    expect(world.bike.speed).toBeGreaterThan(-2);
  });
});

describe('steering', () => {
  it('turns the bike and leans it into the corner', () => {
    const world = worldOnARoad();
    ride(world, 6, { throttle: 1 });
    ride(world, 2, { throttle: 1, steer: 1 });

    expect(world.bike.heading).toBeGreaterThan(0);
    expect(world.bike.lean).toBeGreaterThan(0);
  });

  it('does not spin on the spot', () => {
    const world = worldOnARoad();
    ride(world, 2, { steer: 1 });
    expect(world.bike.heading).toBe(0);
  });
});

describe('the reset', () => {
  it('puts the bike back on a graph Road facing along it', () => {
    const world = worldOnARoad();
    world.bike.x += 120;
    world.bike.z += 40;
    world.bike.heading = 2.6;

    world.tick({ ...IDLE, reset: true }, TICK);

    expect(world.road).toBeDefined();
    expect(world.roadName).toBe('Jalan Raya Canggu');
    expect(world.bike.speed).toBe(0);
    // The Road runs north and south here, and the bike was pointing south.
    expect(world.bike.heading).toBeCloseTo(Math.PI, 3);
  });

  it('faces the way the Ride was already going when that is along the Road', () => {
    const world = worldOnARoad();
    world.bike.x += 120;
    world.bike.heading = 0.2;

    world.tick({ ...IDLE, reset: true }, TICK);
    expect(world.bike.heading).toBeCloseTo(0, 3);
  });

  it('reports the Road it just put the bike on, not the one it was hunting from', () => {
    const world = worldOnARoad();
    world.bike.x += 120;

    // No tick to tidy up after it: the reset alone has to leave the World consistent.
    expect(world.resetToNearestRoad()).toBe(true);
    expect(world.road).toBeDefined();
    expect(world.roadName).toBe('Jalan Raya Canggu');
    expect(world.surface).toEqual(surfaceOf('asphalt'));
  });

  it('leaves the bike where it is when there is no Road within reach', () => {
    const world = worldOnARoad();
    world.bike.x += 5000;
    const { x, z } = world.bike;

    expect(world.resetToNearestRoad()).toBe(false);
    expect(world.bike).toMatchObject({ x, z });
  });
});

describe('the chase camera', () => {
  it('pulls back and widens as the Ride speeds up', () => {
    const world = worldOnARoad();
    world.tick(IDLE, TICK);
    const parked = { fov: world.camera.pose.fov, boom: Math.hypot(world.camera.pose.x - world.bike.x, world.camera.pose.z - world.bike.z) };

    ride(world, 20, { throttle: 1 });
    const flying = { fov: world.camera.pose.fov, boom: Math.hypot(world.camera.pose.x - world.bike.x, world.camera.pose.z - world.bike.z) };

    expect(flying.fov).toBeGreaterThan(parked.fov);
    expect(flying.boom).toBeGreaterThan(parked.boom);
  });

  it('rolls with the lean, the other way, so the horizon tips into the corner', () => {
    const world = worldOnARoad();
    ride(world, 6, { throttle: 1 });
    ride(world, 2, { throttle: 1, steer: 1 });

    expect(world.camera.pose.roll).toBeLessThan(0);
  });

  it('swings the free look round while the mouse is held', () => {
    const world = worldOnARoad();
    ride(world, 0.5, { look: { yaw: 1.2, pitch: 0.2 } });

    expect(world.camera.look.yaw).toBeCloseTo(1.2, 6);
    expect(world.camera.pose.heading).toBeCloseTo(world.bike.heading + 1.2, 3);
  });

  it('snaps back behind the bike once the mouse is released', () => {
    const world = worldOnARoad();
    ride(world, 0.5, { look: { yaw: 1.2, pitch: 0.2 } });
    ride(world, 3);

    expect(Math.abs(world.camera.look.yaw)).toBeLessThan(0.01);
    expect(world.camera.pose.heading).toBeCloseTo(world.bike.heading, 2);
  });

  it('winds the free look at most half a turn, so it never has far to swing back', () => {
    const world = worldOnARoad();
    ride(world, 0.5, { look: { yaw: 12, pitch: 0 } });

    expect(world.camera.look.yaw).toBeCloseTo(Math.PI, 6);
  });

  it('stops shaking when the Ride is reset out of whatever it hit', () => {
    const world = worldOnARoad();
    world.camera.shake(1);
    world.tick({ ...IDLE, reset: true }, TICK);

    expect(world.camera.pose.roll).toBe(0);
  });

  it('shakes on an impact and settles again', () => {
    const world = worldOnARoad();
    world.camera.shake(1);
    ride(world, 0.1);
    const shaken = Math.abs(world.camera.pose.roll);

    ride(world, 3);
    expect(shaken).toBeGreaterThan(0);
    expect(Math.abs(world.camera.pose.roll)).toBeLessThan(shaken);
  });
});

describe('the streaming set', () => {
  it('is the block of chunks around the bike, and moves with the Ride', () => {
    const chunk = worldToChunk(RIDE_START.x, RIDE_START.z);
    const neighbours = [-1, 0, 1].flatMap((i) => [-1, 0, 1].map((j) => ({ i: chunk.i + i, j: chunk.j + j })));
    const world = new World({
      manifest: manifestOf(neighbours),
      clock: FIXED_CLOCK,
      start: { position: chunkCentre(chunk), heading: 0 },
    });

    const plan = world.tick(IDLE, TICK);
    expect(plan.load.map(chunkKey).sort()).toEqual(neighbours.map(chunkKey).sort());
    expect(world.streamingSet).toHaveLength(9);
  });

  it('stops answering with a Road once its chunk has gone', () => {
    const world = worldOnARoad();
    world.tick(IDLE, TICK);
    expect(world.roadName).toBe('Jalan Raya Canggu');

    world.dropGraph(worldToChunk(world.bike.x, world.bike.z));
    world.tick(IDLE, TICK);
    expect(world.road).toBeUndefined();
  });
});

// Seam 2, the headless World: a Ride scripted with plain input against fixture world data
// and a fake clock, with no renderer, DOM or audio in sight.

import {
  RIDE_START,
  RIDE_START_HEADING,
  TERRAIN_GRID,
  TERRAIN_VERTICES,
  WALL_STRIDE,
  WORLD_FORMAT_VERSION,
  chunkCentre,
  chunkKey,
  landCoverIndex,
  terrainVertexOffset,
  worldToChunk,
} from '@bali-moto/shared';
import type {
  ChunkId,
  GraphBlob,
  GraphEdge,
  LandCover,
  RoadClass,
  TerraceWall,
  TerrainBlob,
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
    tunnel: false,
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

/**
 * A chunk of ground, given a rule for its height in the chunk's own local metres. Everything
 * is dry grass unless the test says otherwise.
 */
function terrainChunk(
  chunk: ChunkId,
  options: {
    heightAt?: (x: number, z: number) => number;
    waterAt?: (x: number, z: number) => number | undefined;
    cover?: LandCover;
    walls?: TerraceWall[];
  } = {},
): TerrainBlob {
  const heights = new Float32Array(TERRAIN_VERTICES);
  const waterLevels = new Float32Array(TERRAIN_VERTICES);
  const covers = new Uint8Array(TERRAIN_VERTICES).fill(landCoverIndex(options.cover ?? 'grass'));

  for (let row = 0; row < TERRAIN_GRID; row++) {
    for (let col = 0; col < TERRAIN_GRID; col++) {
      const vertex = row * TERRAIN_GRID + col;
      const [x, z] = [terrainVertexOffset(col), terrainVertexOffset(row)];
      heights[vertex] = options.heightAt?.(x, z) ?? 0;
      waterLevels[vertex] = options.waterAt?.(x, z) ?? heights[vertex]!;
    }
  }

  const walls = new Float32Array((options.walls ?? []).length * WALL_STRIDE);
  for (const [index, wall] of (options.walls ?? []).entries()) {
    walls.set([wall.x1, wall.z1, wall.x2, wall.z2, wall.base, wall.top], index * WALL_STRIDE);
  }

  return {
    header: { formatVersion: WORLD_FORMAT_VERSION, chunk, counts: [] },
    chunk,
    heights,
    waterLevels,
    covers,
    colours: new Uint8Array(TERRAIN_VERTICES * 3),
    indices: new Uint32Array(0),
    walls,
  };
}

/** Lay the same ground under every chunk of a World built by worldOnARoad. */
function layGround(world: World, options: Parameters<typeof terrainChunk>[1]): void {
  const middle = worldToChunk(RIDE_START.x, RIDE_START.z);
  for (const step of [-1, 0, 1]) {
    world.addTerrain(terrainChunk({ i: middle.i, j: middle.j + step }, options));
  }
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

describe('the ground under the Ride', () => {
  // Chunk-local z runs south, so a height that falls as z rises is a hill to the north, and
  // the Ride opens facing north.
  const climb = (grade: number) => (_x: number, z: number) => 100 - z * grade;

  it('puts the bike on the terrain under it as soon as the chunk arrives', () => {
    const world = worldOnARoad();
    expect(world.bike.y).toBe(0);

    layGround(world, { heightAt: climb(0.15) });
    expect(world.bike.y).toBeCloseTo(100, 3);

    // The camera rides up with it, still a boom's height above the bike.
    world.tick(IDLE, TICK);
    expect(world.camera.pose.y).toBeGreaterThan(100);
  });

  it('bleeds speed on a climb held at full throttle', () => {
    const level = worldOnARoad();
    const hill = worldOnARoad();
    layGround(level, {});
    layGround(hill, { heightAt: climb(0.15) });

    for (const world of [level, hill]) ride(world, 30, { throttle: 1 });

    expect(hill.bike.speed).toBeLessThan(level.bike.speed - 1);
    expect(hill.bike.speed).toBeGreaterThan(0);
    expect(level.bike.speed).toBeCloseTo(ASPHALT_TOP_SPEED, 0);
  });

  it('rolls the bike down a descent with no throttle at all', () => {
    const level = worldOnARoad();
    const descent = worldOnARoad();
    layGround(level, {});
    layGround(descent, { heightAt: climb(-0.2) });

    for (const world of [level, descent]) ride(world, 10);

    expect(level.bike.speed).toBe(0);
    expect(descent.bike.speed).toBeGreaterThan(5);
    expect(descent.bike.z).toBeLessThan(descent.camera.pose.z);
  });

  it('takes its surface from the land cover the ground carries', () => {
    const world = worldOnARoad();
    layGround(world, { cover: 'paddy' });
    world.bike.x += 30;

    ride(world, 30, { throttle: 1 });
    expect(world.road).toBeUndefined();
    expect(world.bike.speed).toBeCloseTo(topSpeedOn('paddy'), 1);
  });

  it('wades through shallow water at a crawl, but not on a Road', () => {
    const onTheRoad = worldOnARoad();
    layGround(onTheRoad, { waterAt: () => 0.4 });
    onTheRoad.tick(IDLE, TICK);
    expect(onTheRoad.surface).toEqual(surfaceOf('asphalt'));

    const world = worldOnARoad();
    layGround(world, { waterAt: () => 0.4 });
    world.bike.x += 30;

    ride(world, 20, { throttle: 1 });
    expect(world.surface).toEqual(surfaceOf('shallow_water'));
    expect(world.bike.speed).toBeCloseTo(topSpeedOn('shallow_water'), 1);
  });

  /** How far south of where worldOnARoad opens a Ride got, in metres. */
  function ridden(world: World): number {
    return world.bike.z - chunkCentre(worldToChunk(RIDE_START.x, RIDE_START.z)).z;
  }

  it('halts in deep water and nudges the bike back the way it came', () => {
    const water = worldOnARoad();
    const dry = worldOnARoad();
    // Dry north of the middle of the chunk, and water too deep to ride south of it.
    layGround(water, { waterAt: (_x, z) => (z > 0 ? 3 : undefined) });
    layGround(dry, {});

    // Off the road and into the paddies, since a Road is a Road however deep the ford on it.
    for (const world of [water, dry]) {
      world.bike.x += 30;
      world.bike.heading = Math.PI;
      ride(world, 10, { throttle: 1 });
    }

    // Nudged back out onto the dry side and never able to get going, while the dry Ride is
    // long gone down the road.
    expect(ridden(water)).toBeLessThan(1);
    expect(water.bike.speed).toBeLessThan(dry.bike.speed / 5);
    expect(ridden(dry)).toBeGreaterThan(60);
  });

  it('will not ride through the face of a terrace wall', () => {
    const terraced = worldOnARoad();
    const open = worldOnARoad();
    // A wall across the road 20 m ahead of the bike, standing on the step above it.
    layGround(terraced, { walls: [{ x1: -50, z1: 20, x2: 50, z2: 20, base: 0, top: 1.5 }] });
    layGround(open, {});

    for (const world of [terraced, open]) {
      world.bike.x += 30;
      world.bike.heading = Math.PI;
      ride(world, 10, { throttle: 1 });
    }

    expect(ridden(terraced)).toBeLessThan(20);
    expect(terraced.bike.speed).toBeLessThan(open.bike.speed / 5);
    expect(ridden(open)).toBeGreaterThan(60);
  });

  it('lets the ground go again when its chunk unloads', () => {
    const world = worldOnARoad();
    layGround(world, { heightAt: () => 40 });
    world.tick(IDLE, TICK);
    expect(world.bike.y).toBe(40);

    world.dropTerrain(worldToChunk(world.bike.x, world.bike.z));
    world.tick(IDLE, TICK);
    // Nothing left to stand on, so the bike keeps the last height it was given.
    expect(world.bike.y).toBe(40);
  });
});

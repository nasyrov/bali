// Shaping the ground: each stage on ground built to order, since Canggu is flat farmland by
// the sea and has no terraced hillside, no lake and no volcano to prove them on.

import {
  DEEP_WATER_DEPTH,
  TERRAIN_GRID,
  TERRAIN_SPACING,
  landCoverOf,
  worldToLonLat,
  type LandCover,
  type WorldPoint,
} from '@bali-moto/shared';
import { describe, expect, it } from 'vitest';
import type { DemGrid, WorldBounds } from './elevation.ts';
import type { RoadWay } from './graph.ts';
import { LandMask } from './land.ts';
import { Ground } from './landcover.ts';
import type { GroundFeature } from './osm.ts';
import { chunkTerrain, shapeTerrain, type TerrainField } from './terrain.ts';

/** One chunk at the world origin, which is the patch every one of these tests shapes. */
const BOUNDS: WorldBounds = { x0: 0, z0: 0, x1: 1000, z1: 1000 };

const CHUNK = { i: 0, j: 0 };

/**
 * Where a lattice vertex sits, counting from the patch's north-west corner. Features are laid
 * on these lines rather than on round numbers, because a 30 m grid only knows what is
 * happening where its vertices are.
 */
function line(step: number): number {
  return step * TERRAIN_SPACING;
}

/** The middle of the patch, on a lattice line. */
const MIDDLE = line(17);

/** An elevation raster over the patch, filled by a rule in world metres. */
function dem(heightAt: (x: number, z: number) => number): DemGrid {
  const cellSize = 30;
  const width = 40;
  const heights = new Float32Array(width * width);
  for (let row = 0; row < width; row++) {
    for (let col = 0; col < width; col++) {
      heights[row * width + col] = heightAt((col + 0.5) * cellSize, (row + 0.5) * cellSize);
    }
  }
  return { originX: 0, originZ: 0, cellSize, width, height: width, heights };
}

/** The whole patch, as a ring in world metres. */
const WHOLE_PATCH: WorldPoint[] = [
  { x: -100, z: -100 },
  { x: 1100, z: -100 },
  { x: 1100, z: 1100 },
  { x: -100, z: 1100 },
];

function asLonLat(ring: readonly WorldPoint[]) {
  return ring.map((point) => worldToLonLat(point.x, point.z));
}

/** An OpenStreetMap area with these tags covering a ring given in world metres. */
function area(tags: Record<string, string>, ring: readonly WorldPoint[]): GroundFeature {
  return { tags, polygons: [[asLonLat([...ring, ring[0]!])]], lines: [] };
}

/** An OpenStreetMap waterway running along a line given in world metres. */
function waterway(kind: string, line: readonly WorldPoint[]): GroundFeature {
  return { tags: { waterway: kind }, polygons: [], lines: [asLonLat(line)] };
}

function shape(options: {
  dem: DemGrid;
  ground?: GroundFeature[];
  land?: WorldPoint[][];
  ways?: RoadWay[];
}): TerrainField {
  return shapeTerrain(
    {
      dem: options.dem,
      ground: new Ground(options.ground ?? []),
      land: new LandMask((options.land ?? []).map((ring) => [ring])),
      bounds: BOUNDS,
    },
    options.ways ?? [],
  );
}

/** The lattice vertex nearest a point, and everything the shaping decided about it. */
function vertexAt(field: TerrainField, x: number, z: number) {
  const col = Math.round(x / TERRAIN_SPACING) - field.gi0;
  const row = Math.round(z / TERRAIN_SPACING) - field.gj0;
  const index = row * field.cols + col;
  return {
    height: field.heights[index]!,
    waterLevel: field.waterLevels[index]!,
    cover: landCoverOf(field.covers[index]!) as LandCover,
    depth: field.waterLevels[index]! - field.heights[index]!,
  };
}

/** A Road running west to east across the middle of the patch. */
function roadAcross(options: Partial<RoadWay> = {}): RoadWay {
  return {
    wayId: 1,
    cls: 'secondary',
    width: 6,
    colour: 0x5a5651,
    surface: 'asphalt',
    oneway: 0,
    lanes: 2,
    name: 'Test Road',
    bridge: false,
    tunnel: false,
    layer: 0,
    path: false,
    nodeIds: [1, 2],
    points: [
      { x: 0, z: MIDDLE },
      { x: 1000, z: MIDDLE },
    ],
    ...options,
  };
}

describe('terraces', () => {
  // A fifth is well past the ~8° the terrain decision terraces above.
  const slope = dem((x) => x * 0.2);

  it('steps sloped farmland into steps of about a metre and a half', () => {
    const field = shape({ dem: slope, ground: [area({ landuse: 'farmland' }, WHOLE_PATCH)] });

    for (const step of [10, 17, 24]) {
      const height = vertexAt(field, line(step), MIDDLE).height;
      expect(height / 1.5).toBeCloseTo(Math.round(height / 1.5), 5);
    }
  });

  it('stands a wall at every step, so a terrace reads as one', () => {
    const field = shape({ dem: slope, ground: [area({ landuse: 'farmland' }, WHOLE_PATCH)] });
    const walls = field.walls.get('x0_z0') ?? [];

    expect(walls.length).toBeGreaterThan(100);
    for (const wall of walls) {
      expect(wall.top - wall.base).toBeGreaterThanOrEqual(1.5);
      expect(Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1)).toBeCloseTo(TERRAIN_SPACING, 6);
    }
  });

  it('leaves flat farmland flat, and a slope that is not farmland alone', () => {
    const flat = shape({ dem: dem(() => 12), ground: [area({ landuse: 'farmland' }, WHOLE_PATCH)] });
    expect(vertexAt(flat, MIDDLE, MIDDLE).height).toBeCloseTo(12, 4);
    expect(flat.walls.size).toBe(0);

    const wooded = shape({ dem: slope, ground: [area({ natural: 'wood' }, WHOLE_PATCH)] });
    expect(vertexAt(wooded, MIDDLE, MIDDLE).height).toBeCloseTo(MIDDLE * 0.2, 1);
    expect(wooded.walls.size).toBe(0);
  });
});

describe('water', () => {
  it('cuts a channel under a waterway, deep enough to stop a Ride', () => {
    const field = shape({
      dem: dem(() => 20),
      ground: [waterway('river', [{ x: 0, z: MIDDLE }, { x: 1000, z: MIDDLE }])],
    });

    const inIt = vertexAt(field, MIDDLE, MIDDLE);
    expect(inIt.cover).toBe('water');
    expect(inIt.height).toBeLessThan(19);
    expect(inIt.depth).toBeGreaterThan(DEEP_WATER_DEPTH);

    // The bank a little away from the line is dry ground at the height it always was.
    const beside = vertexAt(field, MIDDLE, MIDDLE - 3 * TERRAIN_SPACING);
    expect(beside.height).toBeCloseTo(20, 4);
    expect(beside.depth).toBe(0);
  });

  it('sinks a lake below the surface the elevation model gives it', () => {
    const field = shape({
      dem: dem(() => 30),
      ground: [
        area({ natural: 'water' }, [
          { x: 300, z: 300 },
          { x: 700, z: 300 },
          { x: 700, z: 700 },
          { x: 300, z: 700 },
        ]),
      ],
    });

    const lake = vertexAt(field, MIDDLE, MIDDLE);
    expect(lake.cover).toBe('water');
    expect(lake.waterLevel).toBeCloseTo(30, 4);
    expect(lake.depth).toBeGreaterThan(DEEP_WATER_DEPTH);
    expect(vertexAt(field, line(3), line(3)).depth).toBe(0);
  });

  it('leaves dry ground carrying its own height, so no depth is ever negative', () => {
    const field = shape({ dem: dem((x) => x * 0.05) });
    for (let index = 0; index < field.heights.length; index++) {
      expect(field.waterLevels[index]).toBe(field.heights[index]);
    }
  });
});

describe('the coast', () => {
  /** The coast runs north to south a few metres west of a lattice line, so the line is beach. */
  const coast = MIDDLE - 4;
  const eastern: WorldPoint[] = [
    { x: coast, z: -100 },
    { x: 1100, z: -100 },
    { x: 1100, z: 1100 },
    { x: coast, z: 1100 },
  ];

  it('leaves the sea out of the terrain and sets it deep below the flat sea plane', () => {
    const field = shape({ dem: dem(() => 8), land: [eastern] });

    const offshore = vertexAt(field, line(6), MIDDLE);
    expect(offshore.cover).toBe('sea');
    expect(offshore.waterLevel).toBe(0);
    expect(offshore.depth).toBeGreaterThan(DEEP_WATER_DEPTH);
    expect(vertexAt(field, line(26), MIDDLE).cover).not.toBe('sea');
  });

  it('draws no terrain over the open sea, and all of it over the land', () => {
    const half = chunkTerrain(shape({ dem: dem(() => 8), land: [eastern] }), CHUNK);
    const whole = chunkTerrain(shape({ dem: dem(() => 8) }), CHUNK);

    expect(whole.indices.length).toBe((TERRAIN_GRID - 1) ** 2 * 6);
    expect(half.indices.length).toBeGreaterThan(0);
    expect(half.indices.length).toBeLessThan(whole.indices.length * 0.6);
  });

  it('synthesises a sand strip along coast the map has drawn no beach on', () => {
    const field = shape({ dem: dem(() => 8), land: [eastern] });

    expect(vertexAt(field, MIDDLE, MIDDLE).cover).toBe('beach');
    expect(vertexAt(field, line(26), MIDDLE).cover).toBe('grass');
  });

  it('uses a mapped beach where the map has drawn one', () => {
    const field = shape({
      dem: dem(() => 8),
      land: [eastern],
      ground: [
        area({ natural: 'beach' }, [
          { x: coast, z: 300 },
          { x: line(26), z: 300 },
          { x: line(26), z: 700 },
          { x: coast, z: 700 },
        ]),
      ],
    });

    expect(vertexAt(field, line(24), MIDDLE).cover).toBe('beach');
    expect(vertexAt(field, line(30), MIDDLE).cover).toBe('grass');
  });
});

describe('flattening under Roads', () => {
  const slope = dem((_x, z) => z * 0.2);

  /** The height of the hillside at a lattice line, before any Road touched it. */
  const hillside = (z: number) => z * 0.2;

  it('pulls the ground under a Road all the way onto it', () => {
    const field = shape({ dem: slope, ways: [roadAcross()] });
    expect(vertexAt(field, MIDDLE, MIDDLE).height).toBeCloseTo(hillside(MIDDLE), 1);
    expect(vertexAt(field, MIDDLE, MIDDLE).height).not.toBeCloseTo(hillside(MIDDLE) + 1, 1);
  });

  it('feathers the pull out over the margin, and lets go past it', () => {
    // A 6 m Road half a dozen metres off the lattice line: the vertex is out in the margin,
    // so it comes part of the way toward the Road and no further.
    const inMargin = shape({
      dem: slope,
      ways: [roadAcross({ points: [{ x: 0, z: MIDDLE - 7 }, { x: 1000, z: MIDDLE - 7 }] })],
    });
    const pulled = vertexAt(inMargin, MIDDLE, MIDDLE).height;
    expect(pulled).toBeLessThan(hillside(MIDDLE));
    expect(pulled).toBeGreaterThan(hillside(MIDDLE - 7));

    // Past the width and the margin together, the hillside is left exactly as it was.
    const beyond = shape({
      dem: slope,
      ways: [roadAcross({ points: [{ x: 0, z: MIDDLE - 12 }, { x: 1000, z: MIDDLE - 12 }] })],
    });
    expect(vertexAt(beyond, MIDDLE, MIDDLE).height).toBe(vertexAt(shape({ dem: slope }), MIDDLE, MIDDLE).height);
  });

  it('leaves the ground under a bridge and a tunnel exactly as it found it', () => {
    const untouched = shape({ dem: slope });
    for (const way of [roadAcross({ bridge: true, layer: 1 }), roadAcross({ tunnel: true })]) {
      const field = shape({ dem: slope, ways: [way] });
      expect(vertexAt(field, MIDDLE, MIDDLE).height).toBe(vertexAt(untouched, MIDDLE, MIDDLE).height);
    }
  });

  it('drapes a Path over the ground rather than cutting the ground to it', () => {
    const untouched = shape({ dem: slope });
    const path = shape({ dem: slope, ways: [roadAcross({ cls: 'footway', width: 1.2, path: true })] });
    expect(vertexAt(path, MIDDLE, MIDDLE).height).toBe(vertexAt(untouched, MIDDLE, MIDDLE).height);
  });
});

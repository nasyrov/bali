// Shaping the ground, once for the whole build, before a single chunk is baked.
//
// The stages run in this order and the order is the point:
//
//   1. sample the reprojected elevation model onto the terrain lattice
//   2. paint the land cover on it and cut it off at the coastline
//   3. synthesise a beach along coast the map has drawn none on
//   4. step sloped farmland into terraces, remembering the walls between the steps
//   5. sink lakes and cut river channels, with the water surface just under the bank
//   6. flatten the ground under every Road, feathered over a margin either side
//   7. settle the water surface, which is simply the ground wherever nothing is wet
//
// Roads are flattened last so that they win over everything: a Road across a terraced
// hillside cuts through the steps rather than riding over them. Only after that does the bake
// sample road heights back off this grid, which is why a Road can never float or sink.
//
// The lattice is global rather than per chunk. Chunk borders fall exactly on lattice lines,
// so two neighbouring chunks read the same vertices along the border they share and their
// terrain meets without a seam.

import {
  CHUNK_SIZE,
  SEA_LEVEL,
  TERRAIN_GRID,
  TERRAIN_SPACING,
  chunkCentre,
  chunkKey,
  heightOnCell,
  landCoverColour,
  landCoverIndex,
  landCoverOf,
  worldToChunk,
  type ChunkId,
  type LandCover,
  type TerraceWall,
  type TerrainGrid,
  type WorldPoint,
} from '@bali-moto/shared';
import { sampleDem, type DemGrid, type WorldBounds } from './elevation.ts';
import { CellIndex, boundsOf, distanceToSegment } from './geometry.ts';
import type { Ground } from './landcover.ts';
import type { LandMask } from './land.ts';
import type { RoadWay } from './graph.ts';

/** Lattice cells across one chunk; 33 of them put the edge vertices on the chunk borders. */
const CELLS_PER_CHUNK = TERRAIN_GRID - 1;

/** How far below sea level the sea floor is set, so that riding into the sea is deep. */
const SEA_FLOOR = -4;

/** Farmland steeper than this is terraced; tan of the ~8° the terrain decision names. */
const TERRACE_SLOPE = Math.tan((8 * Math.PI) / 180);

/** Height of one terrace step, in metres. */
const TERRACE_STEP = 1.5;

/** Classes that are farmland, and so terrace when the ground under them tilts. */
const FARMLAND: ReadonlySet<LandCover> = new Set<LandCover>(['paddy', 'orchard']);

/** Classes a synthesised beach will not paint over. */
const NOT_BEACH: ReadonlySet<LandCover> = new Set<LandCover>(['water', 'sea', 'built', 'beach']);

/** How deep a river channel is cut at its line, and how far its surface sits below the bank. */
const CHANNEL_DEPTH = 2;
const CHANNEL_FREEBOARD = 0.3;

/** How deep a lake or a pond is below the surface the elevation model gives it. */
const LAKE_DEPTH = 2;

/** How far into a channel the ground stops being a bank and starts being the river. */
const CHANNEL_WATER_SHARE = 0.5;

/** The margin either side of a Road over which the flattening feathers out, in metres. */
const ROAD_MARGIN = 6;

/** Points either side of a centreline point that its smoothed height averages over. */
const CENTRELINE_SMOOTHING = 2;

/** Cell edge of the road index used by the flattening, in metres. */
const ROAD_INDEX_CELL = 100;

export interface TerrainSources {
  dem: DemGrid;
  ground: Ground;
  land: LandMask;
  /** The rectangle to shape, snapped out to whole chunks. */
  bounds: WorldBounds;
}

/**
 * The shaped ground of a whole build, on one lattice. Vertex (gi, gj) sits at world
 * (gi * TERRAIN_SPACING, gj * TERRAIN_SPACING), so chunk (i, j) owns gi from i * 33 to
 * i * 33 + 33 inclusive.
 */
export interface TerrainField {
  gi0: number;
  gj0: number;
  cols: number;
  rows: number;
  heights: Float32Array;
  waterLevels: Float32Array;
  covers: Uint8Array;
  /** Terrace walls in world metres, grouped by the chunk their midpoint falls in. */
  walls: Map<string, TerraceWall[]>;
}

/** What one chunk's terrain blob is built from. */
export interface ChunkTerrain {
  grid: TerrainGrid;
  colours: Uint8Array;
  indices: Uint32Array;
  walls: TerraceWall[];
}

function latticeIndexOf(worldValue: number): number {
  return Math.round((worldValue / CHUNK_SIZE) * CELLS_PER_CHUNK);
}

/** One straight piece of a Road, with the smoothed height of the ground it defines. */
interface RoadPiece {
  a: WorldPoint;
  b: WorldPoint;
  heightA: number;
  heightB: number;
  half: number;
}

/**
 * The smoothed height profile of a centreline: a moving average of the ground under it, so a
 * Road laid over noisy 30 m elevation does not inherit every wobble of it.
 */
function smoothedProfile(sampled: readonly number[]): number[] {
  return sampled.map((_unused, index) => {
    let total = 0;
    let count = 0;
    for (let step = -CENTRELINE_SMOOTHING; step <= CENTRELINE_SMOOTHING; step++) {
      const height = sampled[index + step];
      if (height === undefined) continue;
      total += height;
      count++;
    }
    return total / count;
  });
}

/** Walk every vertex of the lattice, with where in the world it sits. */
function eachVertex(field: TerrainField, visit: (index: number, x: number, z: number) => void): void {
  for (let row = 0; row < field.rows; row++) {
    for (let col = 0; col < field.cols; col++) {
      visit(
        row * field.cols + col,
        (field.gi0 + col) * TERRAIN_SPACING,
        (field.gj0 + row) * TERRAIN_SPACING,
      );
    }
  }
}

/** Stages 1 and 2: the elevation model, the land cover painted on it, and the coastline. */
function sampleGround(field: TerrainField, sources: TerrainSources, wet: Uint8Array): void {
  const { dem, ground, land } = sources;

  eachVertex(field, (index, x, z) => {
    if (!land.isLand(x, z)) {
      field.heights[index] = SEA_FLOOR;
      field.waterLevels[index] = SEA_LEVEL;
      field.covers[index] = landCoverIndex('sea');
      wet[index] = 1;
      return;
    }

    field.heights[index] = sampleDem(dem, x, z);
    field.covers[index] = landCoverIndex(ground.coverAt(x, z) ?? 'grass');
  });
}

/** Stage 3: the sand strip along coast the map has drawn no beach polygon on. */
function synthesiseBeaches(field: TerrainField, land: LandMask): void {
  eachVertex(field, (index, x, z) => {
    if (NOT_BEACH.has(landCoverOf(field.covers[index]!))) return;
    if (land.nearCoast(x, z)) field.covers[index] = landCoverIndex('beach');
  });
}

/**
 * Stage 4: step sloped farmland into terraces and stand a wall at every step. The slope is
 * read off the unterraced ground, so a hillside is judged once and every step on it comes out
 * of the same decision.
 */
function terraceFarmland(field: TerrainField): void {
  const { cols, rows } = field;
  const before = Float32Array.from(field.heights);
  const terraced = new Uint8Array(cols * rows);
  const heightAt = (col: number, row: number) =>
    before[Math.min(rows - 1, Math.max(0, row)) * cols + Math.min(cols - 1, Math.max(0, col))]!;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      if (!FARMLAND.has(landCoverOf(field.covers[index]!))) continue;

      const slope = Math.hypot(
        (heightAt(col + 1, row) - heightAt(col - 1, row)) / (2 * TERRAIN_SPACING),
        (heightAt(col, row + 1) - heightAt(col, row - 1)) / (2 * TERRAIN_SPACING),
      );
      if (slope < TERRACE_SLOPE) continue;

      field.heights[index] = Math.round(before[index]! / TERRACE_STEP) * TERRACE_STEP;
      terraced[index] = 1;
    }
  }

  // A wall stands wherever two neighbouring steps differ, across the line between them.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      if (!terraced[index]) continue;

      for (const [dcol, drow] of [[1, 0], [0, 1]] as const) {
        const next = index + drow * cols + dcol;
        if (col + dcol >= cols || row + drow >= rows || !terraced[next]) continue;

        const low = Math.min(field.heights[index]!, field.heights[next]!);
        const high = Math.max(field.heights[index]!, field.heights[next]!);
        if (high - low < TERRACE_STEP / 2) continue;

        // The wall crosses the line between the two steps, half a cell either side of it.
        const midX = (field.gi0 + col + dcol / 2) * TERRAIN_SPACING;
        const midZ = (field.gj0 + row + drow / 2) * TERRAIN_SPACING;
        const alongX = (drow * TERRAIN_SPACING) / 2;
        const alongZ = (dcol * TERRAIN_SPACING) / 2;

        const key = chunkKey(worldToChunk(midX, midZ));
        const inChunk = field.walls.get(key) ?? [];
        inChunk.push({
          x1: midX - alongX,
          z1: midZ - alongZ,
          x2: midX + alongX,
          z2: midZ + alongZ,
          base: low,
          top: high,
        });
        field.walls.set(key, inChunk);
      }
    }
  }
}

/** Stage 5: lakes sink below the surface the model gives them, rivers cut a feathered channel. */
function cutWaterways(field: TerrainField, ground: Ground, wet: Uint8Array): void {
  eachVertex(field, (index, x, z) => {
    if (landCoverOf(field.covers[index]!) === 'water') {
      field.waterLevels[index] = field.heights[index]!;
      field.heights[index] = field.heights[index]! - LAKE_DEPTH;
      wet[index] = 1;
    }

    const channel = ground.channelDepthAt(x, z);
    if (channel <= 0) return;

    const bank = field.heights[index]!;
    field.heights[index] = bank - CHANNEL_DEPTH * channel;
    field.waterLevels[index] = bank - CHANNEL_FREEBOARD * channel;
    wet[index] = 1;
    if (channel > CHANNEL_WATER_SHARE) field.covers[index] = landCoverIndex('water');
  });
}

/**
 * Stage 7: dry ground carries its own height as its water level, so a depth is never negative
 * and the water fades out at its edge rather than stepping off it.
 */
function settleWaterLevels(field: TerrainField, wet: Uint8Array): void {
  for (let index = 0; index < field.heights.length; index++) {
    field.waterLevels[index] = wet[index]
      ? Math.max(field.waterLevels[index]!, field.heights[index]!)
      : field.heights[index]!;
  }
}

export function shapeTerrain(sources: TerrainSources, ways: readonly RoadWay[]): TerrainField {
  const gi0 = latticeIndexOf(sources.bounds.x0);
  const gj0 = latticeIndexOf(sources.bounds.z0);
  const cols = latticeIndexOf(sources.bounds.x1) - gi0 + 1;
  const rows = latticeIndexOf(sources.bounds.z1) - gj0 + 1;

  const field: TerrainField = {
    gi0,
    gj0,
    cols,
    rows,
    heights: new Float32Array(cols * rows),
    waterLevels: new Float32Array(cols * rows),
    covers: new Uint8Array(cols * rows),
    walls: new Map(),
  };

  /** Which vertices carry water over them, and so keep a water level of their own. */
  const wet = new Uint8Array(cols * rows);

  sampleGround(field, sources, wet);
  synthesiseBeaches(field, sources.land);
  terraceFarmland(field);
  cutWaterways(field, sources.ground, wet);
  flattenUnderRoads(field, ways);
  settleWaterLevels(field, wet);

  return field;
}

/** The ground height on the lattice, on the surface a chunk draws, in world metres. */
function fieldHeightAt(field: TerrainField, x: number, z: number): number {
  const clamp = (value: number, high: number) => Math.min(high, Math.max(0, value));
  const col = clamp(x / TERRAIN_SPACING - field.gi0, field.cols - 1);
  const row = clamp(z / TERRAIN_SPACING - field.gj0, field.rows - 1);
  const col0 = Math.min(field.cols - 2, Math.floor(col));
  const row0 = Math.min(field.rows - 2, Math.floor(row));

  const at = (c: number, r: number) => field.heights[r * field.cols + c] ?? 0;
  return heightOnCell(
    at(col0, row0),
    at(col0 + 1, row0),
    at(col0, row0 + 1),
    at(col0 + 1, row0 + 1),
    col - col0,
    row - row0,
  );
}

/**
 * Pull every vertex within a Road's width plus the margin toward the Road's smoothed height,
 * at full weight under the Road itself and feathering to nothing at the edge of the margin.
 *
 * The lattice is far coarser than a Road is wide, so most Roads have no vertex close enough to
 * pull at all and the ground under them keeps its own shape. The bake works with that rather
 * than against it: it walks the Road in short steps and lays it on the ground it finds. Forcing
 * the ground flat over whole cells instead was tried and stands cliffs beside every Road.
 *
 * Bridges and tunnels are left out: a bridge stands above the ground it crosses and a tunnel
 * runs under the hill, so neither should gouge it. Paths are left out too — a footway drapes
 * over the terrain rather than defining it.
 */
function flattenUnderRoads(field: TerrainField, ways: readonly RoadWay[]): void {
  const index = new CellIndex<RoadPiece>(ROAD_INDEX_CELL);
  let anyRoad = false;

  for (const way of ways) {
    if (way.path || way.bridge || way.tunnel) continue;
    const profile = smoothedProfile(way.points.map((point) => fieldHeightAt(field, point.x, point.z)));
    const half = way.width / 2;

    for (let step = 1; step < way.points.length; step++) {
      const piece: RoadPiece = {
        a: way.points[step - 1]!,
        b: way.points[step]!,
        heightA: profile[step - 1]!,
        heightB: profile[step]!,
        half,
      };
      index.add(piece, boundsOf([piece.a, piece.b]), half + ROAD_MARGIN);
      anyRoad = true;
    }
  }

  if (!anyRoad) return;

  for (let row = 0; row < field.rows; row++) {
    for (let col = 0; col < field.cols; col++) {
      const x = (field.gi0 + col) * TERRAIN_SPACING;
      const z = (field.gj0 + row) * TERRAIN_SPACING;

      let weight = 0;
      let target = 0;
      for (const piece of index.near(x, z)) {
        const distance = distanceToSegment(x, z, piece.a, piece.b);
        const reach = piece.half + ROAD_MARGIN;
        if (distance >= reach) continue;

        const pull = distance <= piece.half ? 1 : 1 - (distance - piece.half) / ROAD_MARGIN;
        if (pull <= weight) continue;
        weight = pull;
        target = heightAlong(piece, x, z);
      }

      if (weight === 0) continue;
      const at = row * field.cols + col;
      field.heights[at] = field.heights[at]! * (1 - weight) + target * weight;
    }
  }
}

/** The Road's own height at the point of it nearest a vertex. */
function heightAlong(piece: RoadPiece, x: number, z: number): number {
  const dx = piece.b.x - piece.a.x;
  const dz = piece.b.z - piece.a.z;
  const lengthSquared = dx * dx + dz * dz;
  const along =
    lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - piece.a.x) * dx + (z - piece.a.z) * dz) / lengthSquared));
  return piece.heightA + (piece.heightB - piece.heightA) * along;
}

/** Cut one chunk's terrain out of the shaped field, ready to be packed into its blob. */
export function chunkTerrain(field: TerrainField, chunk: ChunkId): ChunkTerrain {
  const heights = new Float32Array(TERRAIN_GRID * TERRAIN_GRID);
  const waterLevels = new Float32Array(TERRAIN_GRID * TERRAIN_GRID);
  const covers = new Uint8Array(TERRAIN_GRID * TERRAIN_GRID);
  const colours = new Uint8Array(TERRAIN_GRID * TERRAIN_GRID * 3);

  const baseCol = chunk.i * CELLS_PER_CHUNK - field.gi0;
  const baseRow = chunk.j * CELLS_PER_CHUNK - field.gj0;

  for (let row = 0; row < TERRAIN_GRID; row++) {
    for (let col = 0; col < TERRAIN_GRID; col++) {
      const to = row * TERRAIN_GRID + col;
      const from = Math.min(field.rows - 1, Math.max(0, baseRow + row)) * field.cols +
        Math.min(field.cols - 1, Math.max(0, baseCol + col));

      heights[to] = field.heights[from]!;
      waterLevels[to] = field.waterLevels[from]!;
      covers[to] = field.covers[from]!;
      const colour = landCoverColour(landCoverOf(field.covers[from]!));
      colours.set([(colour >> 16) & 0xff, (colour >> 8) & 0xff, colour & 0xff], to * 3);
    }
  }

  // Terrain exists only on the island: a cell with all four corners at sea is not drawn, and
  // the flat sea plane the runtime lays at height zero shows through instead.
  const seaIndex = landCoverIndex('sea');
  const indices: number[] = [];
  for (let row = 0; row < TERRAIN_GRID - 1; row++) {
    for (let col = 0; col < TERRAIN_GRID - 1; col++) {
      const northWest = row * TERRAIN_GRID + col;
      const northEast = northWest + 1;
      const southWest = northWest + TERRAIN_GRID;
      const southEast = southWest + 1;
      const corners = [northWest, northEast, southWest, southEast];
      if (corners.every((corner) => covers[corner] === seaIndex)) continue;
      indices.push(northWest, southWest, northEast, northEast, southWest, southEast);
    }
  }

  const centre = chunkCentre(chunk);
  const walls = (field.walls.get(chunkKey(chunk)) ?? []).map((wall) => ({
    x1: wall.x1 - centre.x,
    z1: wall.z1 - centre.z,
    x2: wall.x2 - centre.x,
    z2: wall.z2 - centre.z,
    base: wall.base,
    top: wall.top,
  }));

  return { grid: { heights, waterLevels, covers }, colours, indices: Uint32Array.from(indices), walls };
}

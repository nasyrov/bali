// The terrain contract: the height grid a chunk carries, the land cover painted on it, and
// how a height, a slope or a water depth is read back out of it.
//
// A chunk holds a 34 by 34 vertex grid, so 33 cells across a 1 km chunk: 30.3 m apart, which
// is the ~30 m the Copernicus model carries. Because 33 cells span the chunk exactly, the
// edge vertices sit on the chunk borders and two neighbouring chunks sample the same world
// points there, so their terrain meets without a seam and without skirts.
//
// The pipeline shapes the grid and the runtime reads it; both go through the lookups here,
// so a Road baked onto the ground and a bike riding over it can never disagree about where
// the ground is.
//
// A height is read off the two triangles each cell is drawn as, not off the bilinear surface
// through its four corners. The two differ by most of a metre on a twisted 30 m cell, and it
// is the triangles that are on screen: reading the bilinear surface instead sinks a Road under
// the ground it was baked onto and floats the bike over the ground it is looking at.

import { CHUNK_SIZE } from './chunks.ts';

/** Vertices along one edge of a chunk's height grid. */
export const TERRAIN_GRID = 34;

/** Metres between grid vertices. */
export const TERRAIN_SPACING = CHUNK_SIZE / (TERRAIN_GRID - 1);

/** Vertices in one chunk's grid. */
export const TERRAIN_VERTICES = TERRAIN_GRID * TERRAIN_GRID;

/** Sea level, in world metres. The sea is one flat plane and never moves. */
export const SEA_LEVEL = 0;

/**
 * How deep water has to be before it stops the bike rather than slowing it. A river channel
 * is cut about 2 m and the sea floor sits well below this, so both stop a Ride; the feathered
 * rim of a channel and the wash at the top of a beach are a crawl instead.
 */
export const DEEP_WATER_DEPTH = 0.8;

/** What the ground is made of, in the order the blob stores them. Appending is safe. */
export const LAND_COVERS = [
  'grass',
  'paddy',
  'forest',
  'scrub',
  'orchard',
  'built',
  'mangrove',
  'beach',
  'water',
  'sea',
] as const;

export type LandCover = (typeof LAND_COVERS)[number];

/** The golden-hour palette colour and the ride surface of each class. */
const LAND_COVER_LOOK: Record<LandCover, { colour: number; surface: string }> = {
  // The unmapped countryside, and what a vertex falls back to when no polygon covers it.
  grass: { colour: 0x8fae5a, surface: 'grass' },
  paddy: { colour: 0xb3c96a, surface: 'paddy' },
  forest: { colour: 0x5f8f4a, surface: 'grass' },
  scrub: { colour: 0x93a55e, surface: 'grass' },
  orchard: { colour: 0x7d9b4e, surface: 'grass' },
  built: { colour: 0xa89f8b, surface: 'ground' },
  mangrove: { colour: 0x4f7a54, surface: 'paddy' },
  beach: { colour: 0xdfc9a0, surface: 'sand' },
  water: { colour: 0x9fb8b0, surface: 'shallow_water' },
  sea: { colour: 0x6fa1b8, surface: 'shallow_water' },
};

/** The class the blob's byte names. An unknown byte reads as the countryside fallback. */
export function landCoverOf(index: number): LandCover {
  return LAND_COVERS[index] ?? 'grass';
}

/** Where a class sits in the blob. */
export function landCoverIndex(cover: LandCover): number {
  return LAND_COVERS.indexOf(cover);
}

/** The palette colour a class is drawn in. */
export function landCoverColour(cover: LandCover): number {
  return LAND_COVER_LOOK[cover].colour;
}

/** The named ride surface a class puts under the wheels. */
export function landCoverSurface(cover: LandCover): string {
  return LAND_COVER_LOOK[cover].surface;
}

/**
 * A chunk's terrain as the runtime holds it: the shaped height grid, the water surface above
 * each vertex (equal to the ground where it is dry, so a depth is always height minus ground)
 * and the land cover class of each vertex.
 */
export interface TerrainGrid {
  heights: Float32Array;
  waterLevels: Float32Array;
  covers: Uint8Array;
}

/** Where grid column and row sit in a chunk's local metres. */
export function terrainVertexOffset(step: number): number {
  return -CHUNK_SIZE / 2 + step * TERRAIN_SPACING;
}

/** A point's place on the grid: the cell it falls in and how far across that cell it is. */
interface GridCell {
  col: number;
  row: number;
  u: number;
  v: number;
}

function cellAt(localX: number, localZ: number): GridCell {
  const cell = (value: number) => Math.min(TERRAIN_GRID - 2, Math.max(0, Math.floor(value)));
  const within = (value: number) => Math.min(1, Math.max(0, value));
  const gx = (localX + CHUNK_SIZE / 2) / TERRAIN_SPACING;
  const gz = (localZ + CHUNK_SIZE / 2) / TERRAIN_SPACING;
  const col = cell(gx);
  const row = cell(gz);

  // Held inside the cell rather than run on past it, so a point off the edge of the chunk —
  // the cap of a Road that reaches over the border — reads the edge and not a wild
  // extrapolation of the slope there.
  return { col, row, u: within(gx - col), v: within(gz - row) };
}

/**
 * Height within one cell, on the two triangles it is drawn as: north-west, south-west and
 * north-east, then north-east, south-west and south-east. `u` runs east across the cell and
 * `v` south down it, both from zero to one.
 */
export function heightOnCell(
  northWest: number,
  northEast: number,
  southWest: number,
  southEast: number,
  u: number,
  v: number,
): number {
  return u + v <= 1
    ? northWest + (northEast - northWest) * u + (southWest - northWest) * v
    : southEast + (southWest - southEast) * (1 - u) + (northEast - southEast) * (1 - v);
}

function onSurface(values: Float32Array, cell: GridCell): number {
  const at = (col: number, row: number) => values[row * TERRAIN_GRID + col] ?? 0;
  return heightOnCell(
    at(cell.col, cell.row),
    at(cell.col + 1, cell.row),
    at(cell.col, cell.row + 1),
    at(cell.col + 1, cell.row + 1),
    cell.u,
    cell.v,
  );
}

/** Ground height at a point in a chunk's local metres, on the surface the chunk draws. */
export function terrainHeightAt(heights: Float32Array, localX: number, localZ: number): number {
  return onSurface(heights, cellAt(localX, localZ));
}

/** Ground gradient at a point: metres of rise per metre east and per metre south. */
export function terrainSlopeAt(
  heights: Float32Array,
  localX: number,
  localZ: number,
): { dx: number; dz: number } {
  const step = TERRAIN_SPACING / 2;
  return {
    dx:
      (terrainHeightAt(heights, localX + step, localZ) -
        terrainHeightAt(heights, localX - step, localZ)) /
      (2 * step),
    dz:
      (terrainHeightAt(heights, localX, localZ + step) -
        terrainHeightAt(heights, localX, localZ - step)) /
      (2 * step),
  };
}

/**
 * How deep the water is over a point, in metres; zero on dry ground. Dry vertices carry the
 * ground as their water level, so the depth fades to nothing at the water's edge instead of
 * stepping off it.
 */
export function waterDepthAt(grid: TerrainGrid, localX: number, localZ: number): number {
  const cell = cellAt(localX, localZ);
  return Math.max(0, onSurface(grid.waterLevels, cell) - onSurface(grid.heights, cell));
}

/** The land cover at a point: the class of the nearest vertex, since classes do not blend. */
export function landCoverAt(covers: Uint8Array, localX: number, localZ: number): LandCover {
  const cell = cellAt(localX, localZ);
  const col = cell.col + (cell.u >= 0.5 ? 1 : 0);
  const row = cell.row + (cell.v >= 0.5 ? 1 : 0);
  return landCoverOf(covers[row * TERRAIN_GRID + col] ?? 0);
}

/** Floats per terrace wall: x and z of each end, then the foot and the top of the face. */
export const WALL_STRIDE = 6;

/**
 * One terrace wall: the short vertical face between two steps of a terraced hillside. The
 * renderer stands a quad on it and the bike cannot ride over it.
 */
export interface TerraceWall {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  base: number;
  top: number;
}

/** One wall out of a terrain blob's packed wall data. */
export function readWall(walls: Float32Array, index: number): TerraceWall {
  const at = index * WALL_STRIDE;
  return {
    x1: walls[at]!,
    z1: walls[at + 1]!,
    x2: walls[at + 2]!,
    z2: walls[at + 3]!,
    base: walls[at + 4]!,
    top: walls[at + 5]!,
  };
}

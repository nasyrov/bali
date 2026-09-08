// The ground under the Ride: the height grids of the loaded chunks, and the questions the
// bike asks of them.
//
// Every question is a bilinear lookup on one chunk's grid — no raycasting and no geometry —
// which is what makes it cheap enough to ask every tick. Where no chunk is loaded there is no
// answer, and the caller carries on as it did before the terrain arrived.

import {
  CHUNK_SIZE,
  WALL_STRIDE,
  chunkKey,
  landCoverAt,
  landCoverSurface,
  readWall,
  terrainHeightAt,
  terrainSlopeAt,
  waterDepthAt,
  worldToChunk,
} from '@bali-moto/shared';
import type { ChunkId, TerrainBlob, TerraceWall, TerrainGrid, WorldPoint } from '@bali-moto/shared';

/** One chunk's ground, in the chunk's own local metres. */
interface LoadedChunk {
  grid: TerrainGrid;
  centre: WorldPoint;
  walls: TerraceWall[];
}

/** A terrace wall this far below the bike is one it is riding along the top of, not into. */
const WALL_CLEARANCE = 0.2;

/** Whether two segments in the plane cross each other. */
function segmentsCross(a: WorldPoint, b: WorldPoint, c: WorldPoint, d: WorldPoint): boolean {
  const side = (p: WorldPoint, q: WorldPoint, r: WorldPoint) =>
    Math.sign((q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x));
  return side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
}

export class TerrainIndex {
  private readonly chunks = new Map<string, LoadedChunk>();

  /** Take a chunk's ground, so the Ride rides over it. */
  add(blob: TerrainBlob): void {
    const walls: TerraceWall[] = [];
    for (let index = 0; index < blob.walls.length / WALL_STRIDE; index++) {
      walls.push(readWall(blob.walls, index));
    }

    this.chunks.set(chunkKey(blob.chunk), {
      grid: { heights: blob.heights, waterLevels: blob.waterLevels, covers: blob.covers },
      centre: { x: (blob.chunk.i + 0.5) * CHUNK_SIZE, z: (blob.chunk.j + 0.5) * CHUNK_SIZE },
      walls,
    });
  }

  /** Forget a chunk's ground as it unloads. */
  remove(chunk: ChunkId | string): void {
    this.chunks.delete(typeof chunk === 'string' ? chunk : chunkKey(chunk));
  }

  /** Ground height at a point, or undefined where the chunk has not arrived. */
  heightAt(point: WorldPoint): number | undefined {
    const found = this.at(point);
    if (!found) return undefined;
    return terrainHeightAt(found.chunk.grid.heights, found.x, found.z);
  }

  /**
   * How steeply the ground rises along a heading, as metres of rise per metre travelled:
   * positive up the hill, negative down it.
   */
  slopeAlong(point: WorldPoint, heading: number): number {
    const found = this.at(point);
    if (!found) return 0;

    const slope = terrainSlopeAt(found.chunk.grid.heights, found.x, found.z);
    // Headings are measured from north, clockwise, and north is -z.
    return slope.dx * Math.sin(heading) - slope.dz * Math.cos(heading);
  }

  /** How deep the water over a point is, in metres; zero on dry ground. */
  waterDepthAt(point: WorldPoint): number {
    const found = this.at(point);
    if (!found) return 0;
    return waterDepthAt(found.chunk.grid, found.x, found.z);
  }

  /** The ride surface the ground puts under the wheels, or undefined with no chunk loaded. */
  surfaceAt(point: WorldPoint): string | undefined {
    const found = this.at(point);
    if (!found) return undefined;
    return landCoverSurface(landCoverAt(found.chunk.grid.covers, found.x, found.z));
  }

  /**
   * Whether a step from one point to another rides into the face of a terrace wall. Coming
   * at it from the step below it is solid; from the step above, the bike rides off the top.
   */
  crossesWall(from: WorldPoint, to: WorldPoint): boolean {
    const height = this.heightAt(from);
    if (height === undefined) return false;

    // A step near a border is in two chunks and the wall it hits may be filed under either.
    const touched = [this.at(from)?.chunk, this.at(to)?.chunk];

    for (const [index, chunk] of touched.entries()) {
      if (!chunk || touched.indexOf(chunk) !== index) continue;

      const start = { x: from.x - chunk.centre.x, z: from.z - chunk.centre.z };
      const end = { x: to.x - chunk.centre.x, z: to.z - chunk.centre.z };
      for (const wall of chunk.walls) {
        if (height >= wall.top - WALL_CLEARANCE) continue;
        if (segmentsCross(start, end, { x: wall.x1, z: wall.z1 }, { x: wall.x2, z: wall.z2 })) return true;
      }
    }

    return false;
  }

  /** The chunk a point is in and where in it the point lies, in the chunk's local metres. */
  private at(point: WorldPoint): { chunk: LoadedChunk; x: number; z: number } | undefined {
    const chunk = this.chunks.get(chunkKey(worldToChunk(point.x, point.z)));
    if (!chunk) return undefined;
    return { chunk, x: point.x - chunk.centre.x, z: point.z - chunk.centre.z };
  }
}

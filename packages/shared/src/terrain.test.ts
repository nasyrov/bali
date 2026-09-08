import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from './chunks.ts';
import {
  LAND_COVERS,
  TERRAIN_GRID,
  TERRAIN_SPACING,
  landCoverAt,
  landCoverColour,
  landCoverIndex,
  landCoverOf,
  landCoverSurface,
  terrainHeightAt,
  terrainSlopeAt,
  terrainVertexOffset,
  waterDepthAt,
  type TerrainGrid,
} from './terrain.ts';

/** A grid whose height at each vertex is given by a rule in the chunk's local metres. */
function gridOf(heightAt: (x: number, z: number) => number): Float32Array {
  const heights = new Float32Array(TERRAIN_GRID * TERRAIN_GRID);
  for (let row = 0; row < TERRAIN_GRID; row++) {
    for (let col = 0; col < TERRAIN_GRID; col++) {
      heights[row * TERRAIN_GRID + col] = heightAt(terrainVertexOffset(col), terrainVertexOffset(row));
    }
  }
  return heights;
}

describe('the terrain grid', () => {
  it('spans the chunk exactly, so two neighbours share the vertices on their border', () => {
    expect(terrainVertexOffset(0)).toBe(-CHUNK_SIZE / 2);
    expect(terrainVertexOffset(TERRAIN_GRID - 1)).toBe(CHUNK_SIZE / 2);
    expect(TERRAIN_SPACING).toBeCloseTo(30.3, 1);
  });
});

describe('reading a height', () => {
  it('gives back the height at a vertex it was built from', () => {
    const heights = gridOf((x, z) => x / 10 + z / 20);
    for (const step of [0, 7, TERRAIN_GRID - 1]) {
      const at = terrainVertexOffset(step);
      expect(terrainHeightAt(heights, at, at)).toBeCloseTo(at / 10 + at / 20, 3);
    }
  });

  it('interpolates between them, so the ground never steps under a wheel', () => {
    const heights = gridOf((x) => x / 10);
    const between = terrainVertexOffset(4) + TERRAIN_SPACING / 2;
    expect(terrainHeightAt(heights, between, 0)).toBeCloseTo(between / 10, 3);
  });

  // The cap of a Road at a chunk border reaches over it, so the lookup has to answer there.
  // Running the slope on past the last vertex instead would put the Road metres in the air.
  it('holds the edge height outside the chunk rather than running the slope on past it', () => {
    const slope = gridOf((x) => x / 10);
    const edge = terrainHeightAt(slope, CHUNK_SIZE / 2, 0);

    expect(edge).toBeCloseTo(CHUNK_SIZE / 20, 3);
    expect(terrainHeightAt(slope, CHUNK_SIZE / 2 + 8, 0)).toBeCloseTo(edge, 6);
    expect(terrainHeightAt(slope, CHUNK_SIZE, 0)).toBeCloseTo(edge, 6);
    expect(terrainHeightAt(slope, -CHUNK_SIZE, -CHUNK_SIZE)).toBeCloseTo(-CHUNK_SIZE / 20, 3);
  });
});

describe('reading a slope', () => {
  it('measures the rise per metre east and per metre south', () => {
    const slope = terrainSlopeAt(gridOf((x, z) => x * 0.1 - z * 0.05), 0, 0);
    expect(slope.dx).toBeCloseTo(0.1, 4);
    expect(slope.dz).toBeCloseTo(-0.05, 4);
  });

  it('reads level ground as level', () => {
    const slope = terrainSlopeAt(gridOf(() => 4), 100, -200);
    expect(slope.dx).toBeCloseTo(0, 6);
    expect(slope.dz).toBeCloseTo(0, 6);
  });
});

describe('reading a water depth', () => {
  /** A pond two metres deep over the western half of the chunk. */
  function pond(): TerrainGrid {
    const heights = gridOf((x) => (x < 0 ? 8 : 10));
    const waterLevels = gridOf(() => 10);
    return { heights, waterLevels, covers: new Uint8Array(TERRAIN_GRID * TERRAIN_GRID) };
  }

  it('is the water surface above the bed', () => {
    expect(waterDepthAt(pond(), -400, 0)).toBeCloseTo(2, 3);
  });

  it('is nothing on dry ground, however the two are interpolated', () => {
    expect(waterDepthAt(pond(), 400, 0)).toBe(0);
  });
});

describe('land cover', () => {
  it('round-trips every class through the byte the blob stores', () => {
    for (const cover of LAND_COVERS) expect(landCoverOf(landCoverIndex(cover))).toBe(cover);
  });

  it('falls back to the countryside for a byte it does not know', () => {
    expect(landCoverOf(200)).toBe('grass');
  });

  it('gives every class a palette colour and a surface the bike knows how to ride', () => {
    for (const cover of LAND_COVERS) {
      expect(landCoverColour(cover)).toBeGreaterThan(0);
      expect(landCoverSurface(cover)).toMatch(/^[a-z_]+$/);
    }
  });

  it('reads the class of the vertex a point is nearest, since classes do not blend', () => {
    const covers = new Uint8Array(TERRAIN_GRID * TERRAIN_GRID).fill(landCoverIndex('paddy'));
    covers[0] = landCoverIndex('beach');

    expect(landCoverAt(covers, -CHUNK_SIZE / 2, -CHUNK_SIZE / 2)).toBe('beach');
    expect(landCoverAt(covers, 0, 0)).toBe('paddy');
  });
});

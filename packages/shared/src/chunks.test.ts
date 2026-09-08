import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, chunkCentre, chunkKey, parseChunkKey, worldToChunk } from './chunks.ts';

describe('worldToChunk', () => {
  it('puts the world origin in chunk 0, 0', () => {
    expect(worldToChunk(0, 0)).toEqual({ i: 0, j: 0 });
  });

  it('covers x in [i km, i+1 km) and z in [j km, j+1 km)', () => {
    expect(worldToChunk(999.999, 999.999)).toEqual({ i: 0, j: 0 });
    expect(worldToChunk(1000, 1000)).toEqual({ i: 1, j: 1 });
    expect(worldToChunk(2500, 1500)).toEqual({ i: 2, j: 1 });
  });

  it('continues the grid west and north of the origin', () => {
    expect(worldToChunk(-0.001, -0.001)).toEqual({ i: -1, j: -1 });
    expect(worldToChunk(-1000, -1000)).toEqual({ i: -1, j: -1 });
    expect(worldToChunk(-1000.001, -1000.001)).toEqual({ i: -2, j: -2 });
  });

  it('reaches the far ends of the island without gaps or overlaps', () => {
    expect(worldToChunk(-69_995, -37_324)).toEqual({ i: -70, j: -38 });
    expect(worldToChunk(64_426, 41_999)).toEqual({ i: 64, j: 41 });
  });
});

describe('chunkCentre', () => {
  it('is half a chunk in from the chunk corner', () => {
    expect(chunkCentre({ i: 0, j: 0 })).toEqual({ x: 500, z: 500 });
    expect(chunkCentre({ i: -1, j: -1 })).toEqual({ x: -500, z: -500 });
    expect(chunkCentre({ i: 12, j: -3 })).toEqual({ x: 12_500, z: -2_500 });
  });

  it('lies inside the chunk it belongs to', () => {
    for (const chunk of [{ i: 0, j: 0 }, { i: -70, j: -38 }, { i: 64, j: 41 }]) {
      expect(worldToChunk(chunkCentre(chunk).x, chunkCentre(chunk).z)).toEqual(chunk);
    }
  });

  it('never sits more than half a chunk diagonal from a point in the chunk', () => {
    const point = { x: 7_710.44, z: 21_914.53 };
    const centre = chunkCentre(worldToChunk(point.x, point.z));
    expect(Math.hypot(point.x - centre.x, point.z - centre.z)).toBeLessThanOrEqual(
      (CHUNK_SIZE * Math.SQRT2) / 2,
    );
  });
});

describe('chunkKey', () => {
  it('round-trips chunk ids including negative ones', () => {
    for (const chunk of [{ i: 0, j: 0 }, { i: -70, j: -38 }, { i: 64, j: 41 }, { i: 7, j: -3 }]) {
      expect(parseChunkKey(chunkKey(chunk))).toEqual(chunk);
    }
  });

  it('is safe to use as a directory name', () => {
    expect(chunkKey({ i: -70, j: -38 })).toMatch(/^[a-z0-9_-]+$/);
  });

  it('rejects text that is not a chunk key', () => {
    expect(() => parseChunkKey('12')).toThrow();
    expect(() => parseChunkKey('x1_y2_z3')).toThrow();
    expect(() => parseChunkKey('x1.5_y2')).toThrow();
  });

  it('gives a chunk exactly one spelling, so manifest keys compare as strings', () => {
    for (const key of ['x007_z1', 'x-0_z0', 'x7_z01']) {
      expect(() => parseChunkKey(key)).toThrow();
    }
  });
});

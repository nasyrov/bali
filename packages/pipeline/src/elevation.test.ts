// The elevation stage without GDAL: which tiles a build needs, how its extent is snapped to
// the chunk grid, the format the fixture's raster is kept in, and how a height is read out of
// one. The reprojection itself is GDAL's and is exercised by `npm run fixture`.

import { CHUNK_SIZE, lonLatToWorld } from '@bali-moto/shared';
import { describe, expect, it } from 'vitest';
import {
  DEM_CELL_SIZE,
  chunkAlignedBounds,
  decodeDemGrid,
  encodeDemGrid,
  sampleDem,
  tilesCovering,
  type DemGrid,
} from './elevation.ts';

/** A raster over a kilometre of Canggu whose height rises eastward. */
function ramp(): DemGrid {
  const width = 40;
  const heights = new Float32Array(width * width);
  for (let row = 0; row < width; row++) {
    for (let col = 0; col < width; col++) heights[row * width + col] = col * 2;
  }
  return { originX: 9000, originZ: 21000, cellSize: DEM_CELL_SIZE, width, height: width, heights };
}

describe('the extent a build covers', () => {
  it('snaps out to whole chunks, so a chunk always samples the same cells', () => {
    const snapped = chunkAlignedBounds({ x0: 9100, z0: 21300, x1: 10800, z1: 22400 }, 0);
    expect(snapped).toEqual({ x0: 9000, z0: 21000, x1: 11000, z1: 23000 });
    for (const edge of Object.values(snapped)) expect(edge % CHUNK_SIZE).toBe(0);
  });

  it('grows by the margin first, so a way at the very edge still has ground under it', () => {
    expect(chunkAlignedBounds({ x0: 9000, z0: 21000, x1: 10000, z1: 22000 }, CHUNK_SIZE)).toEqual({
      x0: 8000,
      z0: 20000,
      x1: 11000,
      z1: 23000,
    });
  });
});

describe('the Copernicus tiles a build needs', () => {
  it('names the one degree tile Canggu sits in', () => {
    const canggu = lonLatToWorld(115.158, -8.644);
    expect(tilesCovering({ x0: canggu.x, z0: canggu.z, x1: canggu.x + 100, z1: canggu.z + 100 })).toEqual([
      'Copernicus_DSM_COG_10_S09_00_E115_00_DEM',
    ]);
  });

  it('names every tile an extent reaches into', () => {
    const west = lonLatToWorld(114.5, -8.5);
    const east = lonLatToWorld(115.5, -8.5);
    expect(tilesCovering({ x0: west.x, z0: east.z, x1: east.x, z1: west.z })).toEqual([
      'Copernicus_DSM_COG_10_S09_00_E114_00_DEM',
      'Copernicus_DSM_COG_10_S09_00_E115_00_DEM',
    ]);
  });
});

describe('the raster the fixture carries', () => {
  it('round-trips through the pipeline format', () => {
    const decoded = decodeDemGrid(encodeDemGrid(ramp()));
    expect(decoded.originX).toBe(9000);
    expect(decoded.originZ).toBe(21000);
    expect(decoded.cellSize).toBe(DEM_CELL_SIZE);
    expect(decoded.width).toBe(40);
    expect(decoded.heights).toEqual(ramp().heights);
  });

  it('refuses a file that is not one', () => {
    expect(() => decodeDemGrid(new Uint8Array(64))).toThrow(/BMDE/);
  });
});

describe('reading a height off the raster', () => {
  it('gives back the height at the centre of a cell', () => {
    expect(sampleDem(ramp(), 9000 + DEM_CELL_SIZE * 1.5, 21000 + DEM_CELL_SIZE * 0.5)).toBeCloseTo(2, 5);
  });

  it('interpolates between cell centres', () => {
    expect(sampleDem(ramp(), 9000 + DEM_CELL_SIZE * 2, 21000 + DEM_CELL_SIZE * 0.5)).toBeCloseTo(3, 5);
  });

  it('holds the edge value for a point off the raster rather than falling to nothing', () => {
    expect(sampleDem(ramp(), 0, 0)).toBeCloseTo(0, 5);
    expect(sampleDem(ramp(), 99_999, 99_999)).toBeCloseTo(78, 5);
  });
});

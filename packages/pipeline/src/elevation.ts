// The elevation stage: Copernicus DEM GLO-30 in, one reprojected height raster out.
//
// The tiles arrive from the public AWS bucket as 1° COGs on WGS84. GDAL reprojects them into
// the game's own UTM zone 50S at 30 m — the resolution the model actually carries, so nothing
// is invented — over an extent snapped to the chunk grid. Snapping matters: it makes the
// raster's cell positions a function of the world origin alone, so the same chunk samples the
// same cells however large the build around it was, and two builds agree byte for byte.
//
// The result is kept in the pipeline's own small format rather than a GeoTIFF, because the
// checked-in fixture ships one and the contract test must run without GDAL or a network.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  CHUNK_SIZE,
  ISLAND_ORIGIN_EASTING,
  ISLAND_ORIGIN_NORTHING,
  worldToLonLat,
} from '@bali-moto/shared';

/** Metres per cell of the reprojected raster, which is what GLO-30 carries. */
export const DEM_CELL_SIZE = 30;

/** Where the public Copernicus bucket serves the tiles from. */
const DEM_BUCKET = 'https://copernicus-dem-30m.s3.amazonaws.com';

const MAGIC = [0x42, 0x4d, 0x44, 0x45]; // 'BMDE'
const DEM_HEADER_BYTES = 40;

/** A rectangle of the world, in world metres. */
export interface WorldBounds {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/**
 * A reprojected height raster. Cell (col, row) covers a cellSize square whose north-west
 * corner is at (originX + col * cellSize, originZ + row * cellSize) in world metres, so row
 * zero is the northernmost and heights are metres above the geoid, the same as world y.
 */
export interface DemGrid {
  originX: number;
  originZ: number;
  cellSize: number;
  width: number;
  height: number;
  heights: Float32Array;
}

/** Grow a rectangle by a margin and snap it out to whole chunks. */
export function chunkAlignedBounds(bounds: WorldBounds, margin: number): WorldBounds {
  const snap = (value: number, direction: -1 | 1) =>
    (direction < 0 ? Math.floor((value - margin) / CHUNK_SIZE) : Math.ceil((value + margin) / CHUNK_SIZE)) *
    CHUNK_SIZE;
  return {
    x0: snap(bounds.x0, -1),
    z0: snap(bounds.z0, -1),
    x1: snap(bounds.x1, 1),
    z1: snap(bounds.z1, 1),
  };
}

/** The name of the Copernicus tile whose south-west corner is at this whole degree. */
function tileName(lonDegree: number, latDegree: number): string {
  const lat = `${latDegree < 0 ? 'S' : 'N'}${String(Math.abs(latDegree)).padStart(2, '0')}`;
  const lon = `${lonDegree < 0 ? 'W' : 'E'}${String(Math.abs(lonDegree)).padStart(3, '0')}`;
  return `Copernicus_DSM_COG_10_${lat}_00_${lon}_00_DEM`;
}

/** The tiles covering a rectangle of the world, one per whole degree it reaches into. */
export function tilesCovering(bounds: WorldBounds): string[] {
  const corners = [
    worldToLonLat(bounds.x0, bounds.z0),
    worldToLonLat(bounds.x1, bounds.z0),
    worldToLonLat(bounds.x0, bounds.z1),
    worldToLonLat(bounds.x1, bounds.z1),
  ];
  const lons = corners.map((corner) => Math.floor(corner.lon));
  const lats = corners.map((corner) => Math.floor(corner.lat));

  const names: string[] = [];
  for (let lat = Math.min(...lats); lat <= Math.max(...lats); lat++) {
    for (let lon = Math.min(...lons); lon <= Math.max(...lons); lon++) {
      names.push(tileName(lon, lat));
    }
  }
  return names;
}

/** Download the tiles that are not already on disk, and return their paths. */
export async function ensureDemTiles(names: readonly string[], rawDir: string): Promise<string[]> {
  const paths: string[] = [];

  for (const name of names) {
    const path = join(rawDir, `${name}.tif`);
    paths.push(path);
    if (existsSync(path)) continue;

    const url = `${DEM_BUCKET}/${name}/${name}.tif`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetching ${url} failed with ${response.status} ${response.statusText}`);
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, new Uint8Array(await response.arrayBuffer()));
  }

  return paths;
}

/** How many whole cells of the raster a span of world metres needs. */
function cellsAcross(span: number): number {
  return Math.ceil(span / DEM_CELL_SIZE);
}

/**
 * Reproject the tiles into the world's own frame over the given bounds, with GDAL. The output
 * is ENVI: a flat float32 raster with a text header beside it, which is the plainest thing GDAL
 * writes and needs no reader beyond a typed-array view. GDAL writes it in the machine's own
 * byte order and a typed array reads it back in the same, so the two always agree; the fixture
 * format below is the one that crosses machines, and that one is explicitly little-endian.
 */
export function reprojectDem(
  tiles: readonly string[],
  bounds: WorldBounds,
  workDir: string,
): DemGrid {
  const width = cellsAcross(bounds.x1 - bounds.x0);
  const height = cellsAcross(bounds.z1 - bounds.z0);

  // The world's z runs south while UTM's northing runs north, so the raster's south edge is
  // the larger z and its extent has to be given to GDAL the other way up.
  const west = bounds.x0 + ISLAND_ORIGIN_EASTING;
  const north = ISLAND_ORIGIN_NORTHING - bounds.z0;
  const raster = join(workDir, 'elevation.img');

  execFileSync(
    'gdalwarp',
    [
      '-t_srs', 'EPSG:32750',
      '-te',
      String(west),
      String(north - height * DEM_CELL_SIZE),
      String(west + width * DEM_CELL_SIZE),
      String(north),
      '-tr', String(DEM_CELL_SIZE), String(DEM_CELL_SIZE),
      '-r', 'bilinear',
      '-ot', 'Float32',
      '-of', 'ENVI',
      '-overwrite',
      ...tiles,
      raster,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );

  const bytes = readFileSync(raster);
  const heights = new Float32Array(width * height);
  new Uint8Array(heights.buffer).set(bytes.subarray(0, heights.byteLength));

  return { originX: bounds.x0, originZ: bounds.z0, cellSize: DEM_CELL_SIZE, width, height, heights };
}

/**
 * Pack a raster into the pipeline's own format, so a fixture can carry one. Little-endian
 * throughout, like every other binary this repository writes, so the checked-in fixture reads
 * the same on any machine.
 */
export function encodeDemGrid(dem: DemGrid): Uint8Array {
  const buffer = new ArrayBuffer(DEM_HEADER_BYTES + dem.heights.byteLength);
  const view = new DataView(buffer);
  new Uint8Array(buffer).set(MAGIC, 0);
  view.setUint16(4, 1, true);
  view.setUint32(8, dem.width, true);
  view.setUint32(12, dem.height, true);
  view.setFloat64(16, dem.originX, true);
  view.setFloat64(24, dem.originZ, true);
  view.setFloat64(32, dem.cellSize, true);
  for (const [index, height] of dem.heights.entries()) {
    view.setFloat32(DEM_HEADER_BYTES + index * 4, height, true);
  }
  return new Uint8Array(buffer);
}

export function decodeDemGrid(bytes: Uint8Array): DemGrid {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  if (MAGIC.some((byte, index) => new Uint8Array(buffer)[index] !== byte)) {
    throw new Error('Not an elevation raster: the file does not start with BMDE');
  }

  const view = new DataView(buffer);
  const width = view.getUint32(8, true);
  const height = view.getUint32(12, true);
  const heights = new Float32Array(width * height);
  for (let index = 0; index < heights.length; index++) {
    heights[index] = view.getFloat32(DEM_HEADER_BYTES + index * 4, true);
  }

  return {
    originX: view.getFloat64(16, true),
    originZ: view.getFloat64(24, true),
    cellSize: view.getFloat64(32, true),
    width,
    height,
    heights,
  };
}

/** Write a raster where the fixture or a build keeps it. */
export function writeDemGrid(path: string, dem: DemGrid): void {
  writeFileSync(path, encodeDemGrid(dem));
}

/** Read a raster back. */
export function readDemGrid(path: string): DemGrid {
  return decodeDemGrid(readFileSync(path));
}

/**
 * Height at a point in world metres, by bilinear interpolation between cell centres. Points
 * outside the raster take the nearest edge, which is what a build whose extent was snapped
 * out to whole chunks only ever meets at its very corners.
 */
export function sampleDem(dem: DemGrid, x: number, z: number): number {
  const clamp = (value: number, high: number) => Math.min(high, Math.max(0, value));
  const col = (x - dem.originX) / dem.cellSize - 0.5;
  const row = (z - dem.originZ) / dem.cellSize - 0.5;

  const col0 = clamp(Math.floor(col), dem.width - 1);
  const row0 = clamp(Math.floor(row), dem.height - 1);
  const col1 = clamp(col0 + 1, dem.width - 1);
  const row1 = clamp(row0 + 1, dem.height - 1);
  const u = clamp(col - col0, 1);
  const v = clamp(row - row0, 1);

  const at = (c: number, r: number) => dem.heights[r * dem.width + c]!;
  const north = at(col0, row0) * (1 - u) + at(col1, row0) * u;
  const south = at(col0, row1) * (1 - u) + at(col1, row1) * u;
  return north * (1 - v) + south * v;
}

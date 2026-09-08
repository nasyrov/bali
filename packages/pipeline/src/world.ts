// The world build: one command that turns an OpenStreetMap extract and an elevation model
// into the versioned world data the runtime streams. A chunk whose bytes are unchanged is not
// rewritten, so a rebuild after an unrelated edit leaves the world data alone.
//
// Stages, in order: fetch the extract if it is missing, clip and filter it with osmium, build
// the road graph, reproject the elevation model with GDAL over the extent the build covers,
// shape the terrain once for the whole build, cut the roads at chunk borders, bake each
// chunk onto that terrain, then write the blobs and the manifest.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  GRAPH_BLOB_FILE,
  MANIFEST_FILE,
  ROAD_BLOB_FILE,
  TERRAIN_BLOB_FILE,
  WORLD_FORMAT_VERSION,
  CHUNK_SIZE,
  chunkKey,
  type WorldManifest,
} from '@bali-moto/shared';
import { bakeChunks } from './bake.ts';
import {
  chunkAlignedBounds,
  ensureDemTiles,
  readDemGrid,
  reprojectDem,
  tilesCovering,
  type DemGrid,
  type WorldBounds,
} from './elevation.ts';
import { boundsOf } from './geometry.ts';
import { buildRoadWays, type RoadWay } from './graph.ts';
import { LandMask, readLandPolygons } from './land.ts';
import { Ground } from './landcover.ts';
import { clipAndFilter, ensureSource, extractTimestamp, readGroundFeatures, readWays, type OsmSource } from './osm.ts';
import { shapeTerrain } from './terrain.ts';

/**
 * Where the heights come from: a raster already reprojected into the world's frame, which is
 * what the checked-in fixture carries so the contract test needs neither GDAL nor a network,
 * or the Copernicus tiles, downloaded into a directory and reprojected by GDAL.
 */
export type ElevationSource = { raster: string } | { tileDir: string };

export interface WorldBuildConfig {
  source: OsmSource;
  elevation: ElevationSource;
  /** GeoJSON land polygons; a build given none is all land, with no coast and no sea. */
  landPolygons?: string;
  /** Where the manifest and one directory of blobs per chunk are written. */
  outDir: string;
  /** Scratch directory for the intermediate osmium and GDAL files. */
  workDir: string;
}

export interface WorldBuildResult {
  manifest: WorldManifest;
  /** Chunk keys in the build, in a stable order. */
  chunks: string[];
  /** Paths of the chunk files this run actually wrote, relative to the output directory. */
  written: string[];
}

/** Write a file only when its bytes differ from what is already there. */
function writeIfChanged(path: string, bytes: Uint8Array): boolean {
  try {
    const existing = readFileSync(path);
    if (existing.length === bytes.length && existing.every((byte, index) => byte === bytes[index])) {
      return false;
    }
  } catch {
    // No file yet, so it certainly changed.
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return true;
}

/** The rectangle the build covers: everything the ways touch, snapped out to whole chunks. */
function boundsOfWays(ways: readonly RoadWay[]): WorldBounds {
  return chunkAlignedBounds(boundsOf(ways.flatMap((way) => way.points)), CHUNK_SIZE);
}

async function elevationFor(
  elevation: ElevationSource,
  bounds: WorldBounds,
  workDir: string,
): Promise<DemGrid> {
  if ('raster' in elevation) return readDemGrid(elevation.raster);
  const tiles = await ensureDemTiles(tilesCovering(bounds), elevation.tileDir);
  return reprojectDem(tiles, bounds, workDir);
}

export async function buildWorld(config: WorldBuildConfig): Promise<WorldBuildResult> {
  await ensureSource(config.source);

  rmSync(config.workDir, { recursive: true, force: true });
  mkdirSync(config.workDir, { recursive: true });

  const layers = clipAndFilter(config.source, config.workDir);
  const ways = buildRoadWays(await readWays(layers.roads));
  const bounds = boundsOfWays(ways);

  const field = shapeTerrain(
    {
      dem: await elevationFor(config.elevation, bounds, config.workDir),
      ground: new Ground(await readGroundFeatures(layers.ground)),
      land: new LandMask(config.landPolygons ? readLandPolygons(config.landPolygons) : []),
      bounds,
    },
    ways,
  );

  const builds = bakeChunks(ways, field);

  const chunks: WorldManifest['chunks'] = {};
  const written: string[] = [];

  for (const build of builds) {
    const key = chunkKey(build.chunk);
    const files: Record<string, number> = {};

    for (const [name, blob] of [
      [TERRAIN_BLOB_FILE, build.terrain],
      [ROAD_BLOB_FILE, build.roads],
      [GRAPH_BLOB_FILE, build.graph],
    ] as const) {
      const bytes = new Uint8Array(blob);
      files[name] = bytes.byteLength;
      if (writeIfChanged(join(config.outDir, key, name), bytes)) written.push(`${key}/${name}`);
    }

    chunks[key] = files;
  }

  const manifest: WorldManifest = {
    formatVersion: WORLD_FORMAT_VERSION,
    extractTimestamp: extractTimestamp(config.source.pbf),
    chunkSize: CHUNK_SIZE,
    chunks,
  };

  mkdirSync(config.outDir, { recursive: true });
  writeFileSync(join(config.outDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);

  return { manifest, chunks: Object.keys(chunks), written };
}

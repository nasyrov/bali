// The world build: one command that turns an OpenStreetMap extract into the versioned world
// data the runtime streams. Roads only so far; terrain, buildings and props follow.
//
// Stages, in order: fetch the extract if it is missing, clip and filter it with osmium, build
// the road graph, cut it at chunk borders, bake each chunk, then write the blobs and the
// manifest. A chunk whose bytes are unchanged is not rewritten, so a rebuild after an
// unrelated edit leaves the world data alone.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  GRAPH_BLOB_FILE,
  MANIFEST_FILE,
  ROAD_BLOB_FILE,
  WORLD_FORMAT_VERSION,
  CHUNK_SIZE,
  chunkKey,
  type WorldManifest,
} from '@bali-moto/shared';
import { bakeChunks } from './bake.ts';
import { buildRoadWays } from './graph.ts';
import { clipAndFilterRoads, ensureSource, extractTimestamp, readWays, type OsmSource } from './osm.ts';

export interface WorldBuildConfig {
  source: OsmSource;
  /** Where the manifest and one directory of blobs per chunk are written. */
  outDir: string;
  /** Scratch directory for the intermediate osmium files. */
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

export async function buildWorld(config: WorldBuildConfig): Promise<WorldBuildResult> {
  await ensureSource(config.source);

  rmSync(config.workDir, { recursive: true, force: true });
  mkdirSync(config.workDir, { recursive: true });

  const exported = clipAndFilterRoads(config.source, config.workDir);
  const ways = buildRoadWays(await readWays(exported));
  const builds = bakeChunks(ways);

  const chunks: WorldManifest['chunks'] = {};
  const written: string[] = [];

  for (const build of builds) {
    const key = chunkKey(build.chunk);
    const files: Record<string, number> = {};

    for (const [name, blob] of [
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

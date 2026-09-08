// The chunk grid: a fixed 1 km grid aligned to the world origin, in which roads, terrain,
// buildings and props are built, streamed and unloaded. Chunk (i, j) covers x in
// [i km, i+1 km) and z in [j km, j+1 km); everything inside a chunk is stored relative to
// its centre so that world-scale coordinates never reach a float.

import type { WorldPoint } from './projection.ts';

/** Chunk edge length in metres. */
export const CHUNK_SIZE = 1000;

/** A chunk's position on the grid: i eastward, j southward. */
export interface ChunkId {
  i: number;
  j: number;
}

/** The chunk containing a point in world metres. */
export function worldToChunk(x: number, z: number): ChunkId {
  return { i: Math.floor(x / CHUNK_SIZE), j: Math.floor(z / CHUNK_SIZE) };
}

/** The world-metre point at the centre of a chunk, the origin of its stored geometry. */
export function chunkCentre(chunk: ChunkId): WorldPoint {
  return { x: (chunk.i + 0.5) * CHUNK_SIZE, z: (chunk.j + 0.5) * CHUNK_SIZE };
}

/** A chunk's stable identifier, used in the manifest and as its directory name. */
export function chunkKey(chunk: ChunkId): string {
  return `x${chunk.i}_z${chunk.j}`;
}

const KEY_PATTERN = /^x(-?\d+)_z(-?\d+)$/;

/** The chunk a key names. Throws when the key is malformed. */
export function parseChunkKey(key: string): ChunkId {
  const match = KEY_PATTERN.exec(key);
  if (!match) throw new Error(`Malformed chunk key: ${JSON.stringify(key)}`);
  return { i: Number(match[1]), j: Number(match[2]) };
}

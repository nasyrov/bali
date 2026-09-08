// Which chunks a ride needs loaded, and in what order.
//
// Tier 0 is the three by three block of chunks around the rider, which is the 1.5 km the
// spec asks for however the rider sits within their own chunk. A chunk stays loaded until
// the rider is a further chunk away again, so crossing a border does not thrash it in and
// out. Loading goes nearest first and ahead of the heading first, because a chunk that
// has not arrived is only noticed when it is ridden into. A byte budget evicts the chunks
// left longest ago, never one the rider still needs.

import { CHUNK_SIZE, chunkKey, parseChunkKey, worldToChunk } from '@bali-moto/shared';
import type { ChunkId, WorldManifest, WorldPoint } from '@bali-moto/shared';

export interface StreamingConfig {
  /** Chunks either side of the rider's own that are wanted; 1 is the three by three block. */
  loadRing: number;
  /** Bytes of chunk data to hold in memory before evicting. */
  byteBudget: number;
}

export interface StreamingPlan {
  load: ChunkId[];
  unload: ChunkId[];
}

/** How many chunks away a chunk is from the one the rider is in, along the longer axis. */
function ringDistance(chunk: ChunkId, from: WorldPoint): number {
  const here = worldToChunk(from.x, from.z);
  return Math.max(Math.abs(chunk.i - here.i), Math.abs(chunk.j - here.j));
}

/** Straight-line distance to the nearest point of a chunk, for ordering the loads. */
function distanceToChunk(chunk: ChunkId, from: WorldPoint): number {
  const west = chunk.i * CHUNK_SIZE;
  const north = chunk.j * CHUNK_SIZE;
  const dx = Math.max(west - from.x, 0, from.x - (west + CHUNK_SIZE));
  const dz = Math.max(north - from.z, 0, from.z - (north + CHUNK_SIZE));
  return Math.hypot(dx, dz);
}

/**
 * How far off the heading a chunk lies, from 0 straight ahead to 2 straight behind. Headings
 * are measured from north, clockwise, so north is -z.
 */
function offHeading(chunk: ChunkId, from: WorldPoint, heading: number): number {
  const toX = (chunk.i + 0.5) * CHUNK_SIZE - from.x;
  const toZ = (chunk.j + 0.5) * CHUNK_SIZE - from.z;
  const length = Math.hypot(toX, toZ);
  if (length === 0) return 0;
  return 1 - (Math.sin(heading) * toX - Math.cos(heading) * toZ) / length;
}

export class ChunkStream {
  /** Chunk key to its byte size, in the order the chunks were last wanted. */
  private readonly loaded = new Map<string, number>();
  private readonly sizes = new Map<string, number>();

  constructor(
    manifest: WorldManifest,
    private readonly config: StreamingConfig,
  ) {
    for (const [key, files] of Object.entries(manifest.chunks)) {
      this.sizes.set(key, Object.values(files).reduce((total, size) => total + size, 0));
    }
  }

  /** Chunks currently held, most recently wanted last. */
  loadedKeys(): string[] {
    return [...this.loaded.keys()];
  }

  loadedBytes(): number {
    return [...this.loaded.values()].reduce((total, bytes) => total + bytes, 0);
  }

  /** What to fetch and what to drop, given where the rider is and which way they face. */
  update(position: WorldPoint, heading: number): StreamingPlan {
    const wanted = this.wantedChunks(position, heading);
    const wantedKeys = new Set(wanted.map(chunkKey));

    const load = wanted.filter((chunk) => !this.loaded.has(chunkKey(chunk)));
    for (const chunk of load) this.loaded.set(chunkKey(chunk), this.sizes.get(chunkKey(chunk)) ?? 0);

    // Refresh the order of the chunks still wanted, so eviction takes the ones left longest.
    for (const key of wantedKeys) {
      const bytes = this.loaded.get(key);
      if (bytes === undefined) continue;
      this.loaded.delete(key);
      this.loaded.set(key, bytes);
    }

    // Drop what is out of range first, then check the budget, so a chunk is never listed
    // twice and the budget is not made to evict more than it needs to.
    const unload = this.beyondUnloadRing(position, wantedKeys);
    for (const chunk of unload) this.loaded.delete(chunkKey(chunk));

    for (const chunk of this.overBudget(wantedKeys)) {
      this.loaded.delete(chunkKey(chunk));
      unload.push(chunk);
    }

    return { load, unload };
  }

  /** Chunks in the load ring, nearest first and ahead of the heading first. */
  private wantedChunks(position: WorldPoint, heading: number): ChunkId[] {
    const centre = worldToChunk(position.x, position.z);
    const reach = this.config.loadRing;
    const wanted: { chunk: ChunkId; distance: number; off: number }[] = [];

    for (let i = centre.i - reach; i <= centre.i + reach; i++) {
      for (let j = centre.j - reach; j <= centre.j + reach; j++) {
        const chunk = { i, j };
        if (!this.sizes.has(chunkKey(chunk))) continue;

        wanted.push({
          chunk,
          distance: distanceToChunk(chunk, position),
          off: offHeading(chunk, position, heading),
        });
      }
    }

    return wanted
      .sort((a, b) => a.distance - b.distance || a.off - b.off)
      .map((entry) => entry.chunk);
  }

  /** Loaded chunks a full chunk beyond the load ring, which is the hysteresis. */
  private beyondUnloadRing(position: WorldPoint, wanted: Set<string>): ChunkId[] {
    return this.loadedKeys()
      .filter((key) => !wanted.has(key))
      .map(parseChunkKey)
      .filter((chunk) => ringDistance(chunk, position) > this.config.loadRing + 1);
  }

  /** Chunks to drop to get back inside the byte budget, longest-unwanted first. */
  private overBudget(wanted: Set<string>): ChunkId[] {
    let bytes = this.loadedBytes();
    const evicted: ChunkId[] = [];

    for (const [key, size] of this.loaded) {
      if (bytes <= this.config.byteBudget) break;
      if (wanted.has(key)) continue;
      evicted.push(parseChunkKey(key));
      bytes -= size;
    }

    return evicted;
  }
}

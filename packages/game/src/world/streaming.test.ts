import { chunkKey } from '@bali-moto/shared';
import type { WorldManifest } from '@bali-moto/shared';
import { describe, expect, it } from 'vitest';
import { ChunkStream } from './streaming.ts';

/** A manifest covering chunks i and j from -4 to 4, each blob a round megabyte. */
function manifestOf(bytesPerChunk = 1_000_000): WorldManifest {
  const chunks: WorldManifest['chunks'] = {};
  for (let i = -4; i <= 4; i++) {
    for (let j = -4; j <= 4; j++) chunks[chunkKey({ i, j })] = { 'roads.t0.bin': bytesPerChunk };
  }
  return { formatVersion: 1, extractTimestamp: '2026-09-07T20:21:20Z', chunkSize: 1000, chunks };
}

/** Heading north, which is where the first Ride starts. */
const NORTH = 0;

function streamAt(x: number, z: number, options: Partial<ConstructorParameters<typeof ChunkStream>[1]> = {}) {
  const stream = new ChunkStream(manifestOf(), { loadRing: 1, byteBudget: 300_000_000, ...options });
  return { stream, plan: stream.update({ x, z }, NORTH) };
}

describe('the chunks a ride needs', () => {
  it('loads the three by three block around the rider', () => {
    const { plan } = streamAt(500, 500);
    expect(plan.load.map(chunkKey).sort()).toEqual(
      [
        { i: -1, j: -1 }, { i: -1, j: 0 }, { i: -1, j: 1 },
        { i: 0, j: -1 }, { i: 0, j: 0 }, { i: 0, j: 1 },
        { i: 1, j: -1 }, { i: 1, j: 0 }, { i: 1, j: 1 },
      ].map(chunkKey).sort(),
    );
  });

  it('asks for nothing twice', () => {
    const { stream } = streamAt(500, 500);
    expect(stream.update({ x: 500, z: 500 }, NORTH).load).toEqual([]);
  });

  it('never asks for a chunk the world was not built with', () => {
    const { plan } = streamAt(4500, 4500);
    for (const chunk of plan.load) {
      expect(chunk.i).toBeLessThanOrEqual(4);
      expect(chunk.j).toBeLessThanOrEqual(4);
    }
  });

  it('loads the nearest chunk first, so the road under the rider appears first', () => {
    const { plan } = streamAt(500, 500);
    expect(plan.load[0]).toEqual({ i: 0, j: 0 });
  });

  // Riding into a chunk that has not arrived yet is what a rider notices, so what is ahead
  // is fetched before what is behind at the same distance.
  it('loads what is ahead of the heading before what is behind it', () => {
    const stream = new ChunkStream(manifestOf(), { loadRing: 1, byteBudget: 300_000_000 });
    const load = stream.update({ x: 500, z: 500 }, NORTH).load;

    const ahead = load.findIndex((chunk) => chunk.i === 0 && chunk.j === -1);
    const behind = load.findIndex((chunk) => chunk.i === 0 && chunk.j === 1);
    expect(ahead).toBeLessThan(behind);
  });
});

describe('unloading', () => {
  it('keeps a chunk loaded until the rider is a chunk past the load ring', () => {
    const stream = new ChunkStream(manifestOf(), { loadRing: 1, byteBudget: 300_000_000 });
    stream.update({ x: 500, z: 500 }, NORTH);

    // Chunk (-1, 0) is two chunks behind: outside the load ring, inside the unload ring.
    const nudged = stream.update({ x: 1500, z: 500 }, NORTH);
    expect(nudged.unload).toEqual([]);
    expect(stream.loadedKeys()).toContain(chunkKey({ i: -1, j: 0 }));
  });

  it('unloads a chunk once the rider is well past it', () => {
    const stream = new ChunkStream(manifestOf(), { loadRing: 1, byteBudget: 300_000_000 });
    stream.update({ x: 500, z: 500 }, NORTH);

    const far = stream.update({ x: 4500, z: 500 }, NORTH);
    expect(far.unload.map(chunkKey)).toContain(chunkKey({ i: -1, j: 0 }));
    expect(stream.loadedKeys()).not.toContain(chunkKey({ i: -1, j: 0 }));
  });

  it('does not thrash a chunk in and out as the rider crosses a border', () => {
    const stream = new ChunkStream(manifestOf(), { loadRing: 1, byteBudget: 300_000_000 });
    stream.update({ x: 1900, z: 500 }, NORTH);
    stream.update({ x: 2100, z: 500 }, NORTH);

    for (const x of [2000, 1990, 2010, 2000]) {
      const plan = stream.update({ x, z: 500 }, NORTH);
      expect(plan.load).toEqual([]);
      expect(plan.unload).toEqual([]);
    }
  });
});

describe('the byte budget', () => {
  it('evicts the chunks left longest ago when the budget is exceeded', () => {
    const stream = new ChunkStream(manifestOf(), { loadRing: 1, byteBudget: 12_000_000 });
    stream.update({ x: 500, z: 500 }, NORTH);
    stream.update({ x: 2500, z: 500 }, NORTH);

    const plan = stream.update({ x: 4500, z: 500 }, NORTH);
    expect(stream.loadedBytes()).toBeLessThanOrEqual(12_000_000);
    expect([...plan.unload, ...stream.loadedKeys().map(() => '')].length).toBeGreaterThan(0);
  });

  it('never evicts a chunk the rider is standing on to stay inside the budget', () => {
    const stream = new ChunkStream(manifestOf(), { loadRing: 1, byteBudget: 1 });
    stream.update({ x: 500, z: 500 }, NORTH);
    stream.update({ x: 2500, z: 500 }, NORTH);

    expect(stream.loadedKeys()).toContain(chunkKey({ i: 2, j: 0 }));
  });

  it('counts every file of a chunk against the budget', () => {
    const stream = new ChunkStream(manifestOf(2_000_000), { loadRing: 1, byteBudget: 300_000_000 });
    stream.update({ x: 500, z: 500 }, NORTH);
    expect(stream.loadedBytes()).toBe(9 * 2_000_000);
  });
});

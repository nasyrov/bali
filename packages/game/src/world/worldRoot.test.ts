import { chunkCentre, chunkKey, parseChunkKey } from '@bali-moto/shared';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { ChunkView } from '../render/chunk.ts';
import { REBASE_DISTANCE } from './rebasing.ts';
import { WorldRoot } from './worldRoot.ts';

function viewOf(key: string): ChunkView {
  return {
    key,
    group: new THREE.Group(),
    centre: chunkCentre(parseChunkKey(key)),
    triangles: 1000,
    dispose: vi.fn(),
  };
}

/** Somewhere in Canggu, far enough from the world origin that a float would show it. */
const CANGGU = { x: 9813, z: 21532 };

describe('the world root', () => {
  it('places a chunk relative to the render origin, not the world origin', () => {
    const root = new WorldRoot(CANGGU);
    const view = viewOf(chunkKey({ i: 9, j: 21 }));
    root.add(view);

    expect(view.group.position.x).toBeCloseTo(9500 - CANGGU.x, 6);
    expect(view.group.position.z).toBeCloseTo(21500 - CANGGU.z, 6);
    expect(view.group.parent).toBe(root.group);
  });

  // Chunk positions must stay small however far across the island the ride has gone; at
  // Canggu's true coordinates a float would already have lost centimetres.
  it('keeps every chunk within a chunk or two of the render origin', () => {
    const root = new WorldRoot(CANGGU);
    for (const chunk of [{ i: 8, j: 20 }, { i: 9, j: 21 }, { i: 10, j: 22 }]) {
      root.add(viewOf(chunkKey(chunk)));
    }

    for (const child of root.group.children) {
      expect(Math.abs(child.position.x)).toBeLessThan(2000);
      expect(Math.abs(child.position.z)).toBeLessThan(2000);
    }
  });

  it('leaves the origin alone while the camera is near it', () => {
    const root = new WorldRoot(CANGGU);
    expect(root.follow({ x: CANGGU.x + 500, z: CANGGU.z })).toBe(false);
    expect(root.origin).toEqual(CANGGU);
  });

  it('rebases onto the camera once it has drifted, and places every chunk again', () => {
    const root = new WorldRoot(CANGGU);
    const view = viewOf(chunkKey({ i: 9, j: 21 }));
    root.add(view);

    const flownTo = { x: CANGGU.x + REBASE_DISTANCE, z: CANGGU.z };
    expect(root.follow(flownTo)).toBe(true);
    expect(root.origin).toEqual(flownTo);
    expect(view.group.position.x).toBeCloseTo(9500 - flownTo.x, 6);
  });

  // The camera moves by the same amount the world does, so a rebase is invisible.
  it('leaves the camera in the same place relative to a chunk after a rebase', () => {
    const root = new WorldRoot(CANGGU);
    const view = viewOf(chunkKey({ i: 9, j: 21 }));
    root.add(view);

    const camera = { x: CANGGU.x + 3000, z: CANGGU.z + 100 };
    const before = root.toRenderSpace(camera);
    const offsetBefore = { x: before.x - view.group.position.x, z: before.z - view.group.position.z };

    root.follow(camera);
    const after = root.toRenderSpace(camera);

    expect(after.x - view.group.position.x).toBeCloseTo(offsetBefore.x, 6);
    expect(after.z - view.group.position.z).toBeCloseTo(offsetBefore.z, 6);
  });

  it('frees a chunk it drops', () => {
    const root = new WorldRoot(CANGGU);
    const view = viewOf(chunkKey({ i: 9, j: 21 }));
    root.add(view);
    root.remove(view.key);

    expect(view.dispose).toHaveBeenCalledOnce();
    expect(root.group.children).toEqual([]);
    expect(root.size).toBe(0);
  });

  it('replaces a chunk that arrives twice rather than drawing it over itself', () => {
    const root = new WorldRoot(CANGGU);
    const first = viewOf(chunkKey({ i: 9, j: 21 }));
    root.add(first);
    root.add(viewOf(chunkKey({ i: 9, j: 21 })));

    expect(first.dispose).toHaveBeenCalledOnce();
    expect(root.group.children).toHaveLength(1);
    expect(root.triangles).toBe(1000);
  });
});

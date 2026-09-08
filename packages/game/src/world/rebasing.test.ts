import { describe, expect, it } from 'vitest';
import { REBASE_DISTANCE, nextRenderOrigin } from './rebasing.ts';

describe('the render origin', () => {
  const origin = { x: 9500, z: 21500 };

  it('stays put while the camera is near it', () => {
    expect(nextRenderOrigin(origin, { x: 9600, z: 21400 })).toBeUndefined();
    expect(nextRenderOrigin(origin, { x: origin.x + REBASE_DISTANCE - 1, z: origin.z })).toBeUndefined();
  });

  it('follows the camera once it has drifted two kilometres', () => {
    const camera = { x: origin.x + REBASE_DISTANCE, z: origin.z };
    expect(nextRenderOrigin(origin, camera)).toEqual(camera);
  });

  it('measures the drift in both directions at once', () => {
    const diagonal = { x: origin.x + 1500, z: origin.z + 1500 };
    expect(nextRenderOrigin(origin, diagonal)).toEqual(diagonal);
  });

  it('rebases onto the camera exactly, so the drift starts again from nothing', () => {
    const camera = { x: 20000, z: 30000 };
    const rebased = nextRenderOrigin(origin, camera)!;
    expect(nextRenderOrigin(rebased, camera)).toBeUndefined();
  });
});

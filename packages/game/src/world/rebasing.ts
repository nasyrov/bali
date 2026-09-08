// The floating origin. Geometry is chunk-local and chunk groups are positioned relative to a
// render origin, so the numbers three.js works with stay small however far across the island
// the ride has gone. The origin follows the camera whenever it drifts too far.

import type { WorldPoint } from '@bali-moto/shared';

/** How far the camera may drift from the render origin before the world is rebased. */
export const REBASE_DISTANCE = 2000;

/** The origin to rebase onto, or undefined while the current one is still close enough. */
export function nextRenderOrigin(
  origin: WorldPoint,
  camera: WorldPoint,
  threshold = REBASE_DISTANCE,
): WorldPoint | undefined {
  const drift = Math.hypot(camera.x - origin.x, camera.z - origin.z);
  return drift < threshold ? undefined : { x: camera.x, z: camera.z };
}

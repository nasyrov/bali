// The world root: the group every loaded chunk hangs off, and the render origin it is
// measured from. Chunk geometry is stored relative to its chunk centre and the group is
// placed relative to the origin, so the numbers three.js sees stay small. When the camera
// drifts too far the origin moves onto it and every group is placed again, which is what
// keeps a ride jitter-free at world scale.

import * as THREE from 'three';
import type { WorldPoint } from '@bali-moto/shared';
import type { ChunkView } from '../render/roads.ts';
import { nextRenderOrigin } from './rebasing.ts';

export class WorldRoot {
  readonly group = new THREE.Group();
  private readonly views = new Map<string, ChunkView>();
  private renderOrigin: WorldPoint;

  constructor(origin: WorldPoint) {
    this.renderOrigin = { ...origin };
  }

  get origin(): WorldPoint {
    return this.renderOrigin;
  }

  get size(): number {
    return this.views.size;
  }

  get triangles(): number {
    return [...this.views.values()].reduce((total, view) => total + view.triangles, 0);
  }

  /** Add a chunk, replacing any view of the same chunk that is already there. */
  add(view: ChunkView): void {
    this.remove(view.key);
    this.views.set(view.key, view);
    this.place(view);
    this.group.add(view.group);
  }

  remove(key: string): void {
    const view = this.views.get(key);
    if (!view) return;
    this.group.remove(view.group);
    view.dispose();
    this.views.delete(key);
  }

  /** Move the origin onto the camera if it has drifted far enough. Returns whether it moved. */
  follow(camera: WorldPoint): boolean {
    const rebased = nextRenderOrigin(this.renderOrigin, camera);
    if (!rebased) return false;

    this.renderOrigin = rebased;
    for (const view of this.views.values()) this.place(view);
    return true;
  }

  /** Where the camera sits in render space, given its true world position. */
  toRenderSpace(camera: WorldPoint): { x: number; z: number } {
    return { x: camera.x - this.renderOrigin.x, z: camera.z - this.renderOrigin.z };
  }

  private place(view: ChunkView): void {
    view.group.position.set(
      view.centre.x - this.renderOrigin.x,
      0,
      view.centre.z - this.renderOrigin.z,
    );
  }
}

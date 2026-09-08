// Turning a parsed chunk into what three.js draws: the ground it stands on, one mesh for the
// road surface carrying the colours baked into it, and one instanced mesh for the markings.
// A handful of draw calls per chunk. Everything hangs off a group positioned at the chunk's
// centre relative to the current render origin, so rebasing is a matter of moving the groups.

import { MARKING_STRIDE, chunkCentre, parseChunkKey, readMarking } from '@bali-moto/shared';
import type { WorldPoint } from '@bali-moto/shared';
import * as THREE from 'three';
import type { ParsedChunk } from '../world/chunkWorker.ts';
import type { Look } from './look.ts';
import { createTerrainParts } from './terrain.ts';

/** A unit quad lying flat, scaled per instance into a dash or a line. */
const MARKING_QUAD = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

export interface ChunkView {
  key: string;
  group: THREE.Group;
  /** World-metre position of the chunk centre, so a rebase can reposition the group. */
  centre: WorldPoint;
  triangles: number;
  dispose: () => void;
}

/** Build the drawable form of a parsed chunk, placed relative to the render origin. */
export function createChunkView(chunk: ParsedChunk, look: Look, origin: WorldPoint): ChunkView {
  const centre = chunkCentre(parseChunkKey(chunk.key));
  const group = new THREE.Group();
  group.name = chunk.key;
  group.position.set(centre.x - origin.x, 0, centre.z - origin.z);

  const terrain = createTerrainParts(chunk.terrain, look);
  group.add(...terrain.objects);

  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position', new THREE.BufferAttribute(chunk.positions, 3));
  surface.setAttribute('color', new THREE.BufferAttribute(chunk.colours, 3, true));
  surface.setIndex(new THREE.BufferAttribute(chunk.indices, 1));
  surface.computeVertexNormals();
  group.add(new THREE.Mesh(surface, look.roadMaterial));

  const markingCount = chunk.markings.length / MARKING_STRIDE;
  let markings: THREE.InstancedMesh | undefined;
  if (markingCount > 0) {
    markings = new THREE.InstancedMesh(MARKING_QUAD, look.markingMaterial, markingCount);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    for (let index = 0; index < markingCount; index++) {
      const mark = readMarking(chunk.markings, index);
      rotation.setFromAxisAngle(up, mark.angle);
      position.set(mark.x, mark.y, mark.z);
      scale.set(mark.width, 1, mark.length);
      markings.setMatrixAt(index, matrix.compose(position, rotation, scale));
    }
    markings.instanceMatrix.needsUpdate = true;
    group.add(markings);
  }

  return {
    key: chunk.key,
    group,
    centre,
    triangles: terrain.triangles + chunk.indices.length / 3 + markingCount * 2,
    dispose() {
      terrain.dispose();
      surface.dispose();
      markings?.dispose();
    },
  };
}

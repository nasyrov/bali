// Drawing a chunk's ground: the height grid as one flat-shaded mesh carrying the land cover
// colours baked into it, the inland water surfaces standing in the channels and lakes cut for
// them, and a quad on every terrace wall.
//
// The open sea is not here. It is one flat plane the whole world shares, laid at height zero
// and shown wherever the terrain was clipped away at the coastline.

import {
  TERRAIN_GRID,
  WALL_STRIDE,
  appendWall,
  createMeshBuilder,
  finishMesh,
  landCoverOf,
  readWall,
  terrainVertexOffset,
  type TerrainBlob,
} from '@bali-moto/shared';
import * as THREE from 'three';
import { PALETTE, type Look } from './look.ts';

/** Water is drawn a hair below its own level, so a shore never z-fights the ground. */
const WATER_SINK = 0.02;

export interface TerrainParts {
  objects: THREE.Object3D[];
  triangles: number;
  dispose: () => void;
}

/** The ground mesh: one vertex per grid point, coloured by what grows on it. */
function groundMesh(chunk: TerrainBlob): THREE.BufferGeometry {
  const positions = new Float32Array(chunk.heights.length * 3);
  for (let row = 0; row < TERRAIN_GRID; row++) {
    for (let col = 0; col < TERRAIN_GRID; col++) {
      const vertex = row * TERRAIN_GRID + col;
      positions.set(
        [terrainVertexOffset(col), chunk.heights[vertex]!, terrainVertexOffset(row)],
        vertex * 3,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(chunk.colours, 3, true));
  geometry.setIndex(new THREE.BufferAttribute(chunk.indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The surface of the inland water: a quad over every grid cell whose corners are all under
 * water, at the level the pipeline set for it.
 */
function waterMesh(chunk: TerrainBlob): THREE.BufferGeometry | undefined {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row < TERRAIN_GRID - 1; row++) {
    for (let col = 0; col < TERRAIN_GRID - 1; col++) {
      // North-west, north-east, south-west then south-east, the way the ground is wound.
      const corners = [
        { across: 0, down: 0 },
        { across: 1, down: 0 },
        { across: 0, down: 1 },
        { across: 1, down: 1 },
      ];
      const vertexOf = (corner: { across: number; down: number }) =>
        (row + corner.down) * TERRAIN_GRID + col + corner.across;
      if (!corners.every((corner) => landCoverOf(chunk.covers[vertexOf(corner)]!) === 'water')) continue;

      const base = positions.length / 3;
      for (const corner of corners) {
        positions.push(
          terrainVertexOffset(col + corner.across),
          chunk.waterLevels[vertexOf(corner)]! - WATER_SINK,
          terrainVertexOffset(row + corner.down),
        );
      }
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }

  if (indices.length === 0) return undefined;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** The short vertical faces between the steps of a terraced hillside. */
function wallMesh(chunk: TerrainBlob): THREE.BufferGeometry | undefined {
  const count = chunk.walls.length / WALL_STRIDE;
  if (count === 0) return undefined;

  const builder = createMeshBuilder();
  for (let index = 0; index < count; index++) {
    const wall = readWall(chunk.walls, index);
    appendWall(
      builder,
      [
        { x: wall.x1, z: wall.z1, base: wall.base, top: wall.top },
        { x: wall.x2, z: wall.z2, base: wall.base, top: wall.top },
      ],
      PALETTE.stone,
    );
  }

  const mesh = finishMesh(builder);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/** Build everything a chunk's ground draws as, ready to hang off the chunk's group. */
export function createTerrainParts(chunk: TerrainBlob, look: Look): TerrainParts {
  const ground = groundMesh(chunk);
  const water = waterMesh(chunk);
  const walls = wallMesh(chunk);

  const objects = [new THREE.Mesh(ground, look.terrainMaterial)];
  if (water) objects.push(new THREE.Mesh(water, look.waterMaterial));
  if (walls) objects.push(new THREE.Mesh(walls, look.wallMaterial));

  const triangles = [ground, water, walls].reduce(
    (total, geometry) => total + (geometry?.getIndex()?.count ?? 0) / 3,
    0,
  );

  return {
    objects,
    triangles,
    dispose() {
      for (const geometry of [ground, water, walls]) geometry?.dispose();
    },
  };
}

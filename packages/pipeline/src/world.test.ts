// Seam 1, the world data contract: the whole pipeline runs on the checked-in Canggu fixture
// and every assertion is on the packed output, the way the runtime reads it.

import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GRAPH_BLOB_FILE,
  MANIFEST_FILE,
  ROAD_BLOB_FILE,
  TERRAIN_BLOB_FILE,
  TERRAIN_GRID,
  TERRAIN_VERTICES,
  WORLD_FORMAT_VERSION,
  decodeGraphBlob,
  decodeRoadBlob,
  decodeTerrainBlob,
  landCoverColour,
  landCoverOf,
  MARKING_STRIDE,
  RIDE_START,
  RIDE_START_ROAD,
  chunkCentre,
  chunkKey,
  parseChunkKey,
  readMarking,
  roadHeight,
  roadWidth,
  terrainHeightAt,
  worldToChunk,
} from '@bali-moto/shared';
import type { GraphBlob, TerrainBlob, WorldManifest, WorldPoint } from '@bali-moto/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fixtureBuild } from './config.ts';
import { buildWorld, type WorldBuildResult } from './world.ts';

/** The chunks the fixture block covers; ways reaching out of it spill into its neighbours. */
const BLOCK_CHUNKS = ['x9_z21', 'x9_z22', 'x10_z21', 'x10_z22'];

/** How far from a bridge or tunnel its own extra geometry reaches, in metres. */
const BRIDGE_REACH = 20;

/**
 * How far a Road surface may stand over the ground under it, in metres. A Road lies flat
 * across its own width while the ground it crosses does not, so on a 30 m terrain grid the low
 * kerb of a Road cutting across a slope stands a little off the ground. What a Road may never
 * do is sink under it.
 */
const KERB_CLEARANCE = 0.8;

let root: string;
let build: WorldBuildResult;
let manifest: WorldManifest;

function readBlob(chunk: string, file: string): ArrayBuffer {
  const bytes = readFileSync(join(root, chunk, file));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function graphOf(chunk: string): GraphBlob {
  return decodeGraphBlob(readBlob(chunk, GRAPH_BLOB_FILE));
}

function terrainOf(chunk: string): TerrainBlob {
  return decodeTerrainBlob(readBlob(chunk, TERRAIN_BLOB_FILE));
}

/** How far a point lies from a road segment, both in the same chunk's local metres. */
function distanceToSegment(point: WorldPoint, from: WorldPoint, to: WorldPoint): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const lengthSquared = dx * dx + dz * dz;
  const along =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.z - from.z) * dz) / lengthSquared));
  return Math.hypot(point.x - (from.x + dx * along), point.z - (from.z + dz * along));
}

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'bali-world-'));
  build = await buildWorld(fixtureBuild(root, join(root, '.work')));
  manifest = JSON.parse(readFileSync(join(root, MANIFEST_FILE), 'utf8'));
}, 60_000);

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('the manifest', () => {
  it('carries the format version the runtime checks and the chunk size it assumes', () => {
    expect(manifest.formatVersion).toBe(WORLD_FORMAT_VERSION);
    expect(manifest.chunkSize).toBe(1000);
  });

  it('records when the extract it was built from was cut', () => {
    expect(new Date(manifest.extractTimestamp).getTime()).toBeGreaterThan(0);
  });

  it('lists the chunks of the fixture block', () => {
    for (const chunk of BLOCK_CHUNKS) expect(manifest.chunks).toHaveProperty(chunk);
  });

  it('lists only chunks that are real places on the grid', () => {
    for (const key of Object.keys(manifest.chunks)) {
      const chunk = parseChunkKey(key);
      expect(chunk.i).toBeGreaterThanOrEqual(8);
      expect(chunk.i).toBeLessThanOrEqual(11);
      expect(chunk.j).toBeGreaterThanOrEqual(20);
      expect(chunk.j).toBeLessThanOrEqual(23);
    }
  });

  it('gives every chunk its terrain, roads and graph with their sizes on disk', () => {
    for (const [key, files] of Object.entries(manifest.chunks)) {
      expect(Object.keys(files).sort()).toEqual([GRAPH_BLOB_FILE, ROAD_BLOB_FILE, TERRAIN_BLOB_FILE]);
      for (const [name, size] of Object.entries(files)) {
        expect(size).toBe(statSync(join(root, key, name)).size);
      }
    }
  });
});

describe('the road blobs', () => {
  it('names the chunk it belongs to, so a misplaced file cannot go unnoticed', () => {
    for (const key of BLOCK_CHUNKS) {
      expect(decodeRoadBlob(readBlob(key, ROAD_BLOB_FILE)).chunk).toEqual(parseChunkKey(key));
    }
  });

  it('holds a drawable surface for every chunk of the block', () => {
    for (const key of BLOCK_CHUNKS) {
      const roads = decodeRoadBlob(readBlob(key, ROAD_BLOB_FILE));
      expect(roads.indices.length).toBeGreaterThan(0);
      expect(roads.indices.length % 3).toBe(0);
      expect(roads.colours.length).toBe(roads.positions.length);
    }
  });

  // Geometry is chunk-local so that world-scale coordinates never reach a float; anything
  // beyond half a chunk plus the widest road's cap is in the wrong chunk.
  it('keeps every vertex within its own chunk', () => {
    for (const key of BLOCK_CHUNKS) {
      const { positions } = decodeRoadBlob(readBlob(key, ROAD_BLOB_FILE));
      for (let i = 0; i < positions.length; i += 3) {
        expect(Math.abs(positions[i]!)).toBeLessThan(510);
        expect(Math.abs(positions[i + 2]!)).toBeLessThan(510);
      }
    }
  });

  it('marks the centre of the roads that carry markings, in strokes narrower than a kerb', () => {
    let marks = 0;
    for (const key of BLOCK_CHUNKS) {
      const blob = decodeRoadBlob(readBlob(key, ROAD_BLOB_FILE));
      const count = blob.markings.length / MARKING_STRIDE;
      marks += count;
      for (let index = 0; index < count; index++) {
        expect(readMarking(blob.markings, index).width).toBeLessThan(0.2);
      }
    }
    expect(marks).toBeGreaterThan(0);
  });
});

describe('the terrain blobs', () => {
  it('carries a 34 by 34 height grid with a land cover class and a colour per vertex', () => {
    for (const key of BLOCK_CHUNKS) {
      const terrain = terrainOf(key);
      expect(terrain.chunk).toEqual(parseChunkKey(key));
      expect(terrain.heights).toHaveLength(TERRAIN_GRID * TERRAIN_GRID);
      expect(terrain.heights).toHaveLength(TERRAIN_VERTICES);
      expect(terrain.covers).toHaveLength(TERRAIN_VERTICES);
      expect(terrain.colours).toHaveLength(TERRAIN_VERTICES * 3);

      for (let vertex = 0; vertex < TERRAIN_VERTICES; vertex++) {
        const colour = landCoverColour(landCoverOf(terrain.covers[vertex]!));
        expect([
          terrain.colours[vertex * 3],
          terrain.colours[vertex * 3 + 1],
          terrain.colours[vertex * 3 + 2],
        ]).toEqual([(colour >> 16) & 0xff, (colour >> 8) & 0xff, colour & 0xff]);
      }
    }
  });

  it('draws the whole of an inland chunk, in triangles, at Canggu heights', () => {
    for (const key of BLOCK_CHUNKS) {
      const terrain = terrainOf(key);
      // Every cell of the grid is drawn where none of it is at sea, which inland is all of it.
      expect(terrain.indices.length).toBe((TERRAIN_GRID - 1) ** 2 * 6);
      for (const height of terrain.heights) {
        expect(height).toBeGreaterThan(0);
        expect(height).toBeLessThan(120);
      }
    }
  });

  it('paints the countryside Canggu is made of, and never the sea inland', () => {
    const covers = new Set(
      BLOCK_CHUNKS.flatMap((key) => [...terrainOf(key).covers].map((cover) => landCoverOf(cover))),
    );
    expect(covers).toContain('paddy');
    expect(covers).toContain('built');
    expect(covers).not.toContain('sea');
  });

  it('gives two neighbouring chunks the same heights along the border they share', () => {
    const west = terrainOf('x9_z21');
    const east = terrainOf('x10_z21');

    for (let row = 0; row < TERRAIN_GRID; row++) {
      expect(east.heights[row * TERRAIN_GRID]).toBe(west.heights[row * TERRAIN_GRID + TERRAIN_GRID - 1]);
    }
  });

  it('holds the ground dry inland, so nothing there reads as water', () => {
    for (const key of BLOCK_CHUNKS) {
      const terrain = terrainOf(key);
      for (let vertex = 0; vertex < TERRAIN_VERTICES; vertex++) {
        expect(terrain.waterLevels[vertex]).toBeGreaterThanOrEqual(terrain.heights[vertex]!);
      }
    }
  });
});

describe('roads on the terrain', () => {
  /** The vertices of a chunk's road surface, keyed by where they lie to the centimetre. */
  function surfaceHeights(key: string): Map<string, number[]> {
    const { positions } = decodeRoadBlob(readBlob(key, ROAD_BLOB_FILE));
    const at = new Map<string, number[]>();
    for (let index = 0; index < positions.length; index += 3) {
      const place = `${positions[index]!.toFixed(2)}:${positions[index + 2]!.toFixed(2)}`;
      const heights = at.get(place);
      if (heights) heights.push(positions[index + 1]!);
      else at.set(place, [positions[index + 1]!]);
    }
    return at;
  }

  // The whole point of flattening the ground under a Road before its heights are sampled: at
  // every node of every Road there is a surface vertex, and it sits on the terrain the runtime
  // will read there — at least the class's own few millimetres over it, and never far above.
  it('lays every Road node on the flattened terrain beneath it', () => {
    let checked = 0;

    for (const key of BLOCK_CHUNKS) {
      const terrain = terrainOf(key);
      const surface = surfaceHeights(key);

      for (const edge of graphOf(key).edges) {
        if (edge.bridge || edge.tunnel) continue;
        for (const point of edge.points) {
          const vertices = surface.get(`${point.x.toFixed(2)}:${point.z.toFixed(2)}`);
          if (!vertices) continue;

          // Roads of different classes meeting at a node each leave a vertex here, each at its
          // own class's lift; none of them is under the ground and none is far over it.
          const ground = terrainHeightAt(terrain.heights, point.x, point.z);
          const over = vertices.map((height) => height - ground);
          expect(Math.min(...over)).toBeGreaterThan(0);
          // Vertex positions are packed as 32-bit floats, so allow the last few microns of it.
          expect(over.some((height) => height >= roadHeight(edge.cls) - 1e-3)).toBe(true);
          expect(Math.max(...over)).toBeLessThan(KERB_CLEARANCE);
          checked++;
        }
      }
    }

    expect(checked).toBeGreaterThan(100);
  });

  // No part of a Road may sink under the ground, or the ground eats bites out of the Road the
  // shape of the triangles it is drawn as; nor may any of it float, bridges aside.
  it('keeps the whole road surface on the ground except where a bridge climbs off it', () => {
    // Bridges and tunnels are looked for across the whole block, in world metres: a bridge on
    // a chunk border leaves its slab in one chunk and its graph edge in the next.
    const raised = Object.keys(manifest.chunks).flatMap((key) => {
      const centre = chunkCentre(parseChunkKey(key));
      return graphOf(key)
        .edges.filter((edge) => edge.bridge || edge.tunnel)
        .map((edge) => edge.points.map((point) => ({ x: point.x + centre.x, z: point.z + centre.z })));
    });

    for (const key of BLOCK_CHUNKS) {
      const terrain = terrainOf(key);
      const centre = chunkCentre(parseChunkKey(key));
      const { positions } = decodeRoadBlob(readBlob(key, ROAD_BLOB_FILE));

      for (let index = 0; index < positions.length; index += 3) {
        const x = positions[index]!;
        const z = positions[index + 2]!;
        const above = positions[index + 1]! - terrainHeightAt(terrain.heights, x, z);
        if (above >= 0 && above < KERB_CLEARANCE) continue;

        // Whatever is left is a bridge deck, its slab and railings, or a tunnel portal.
        const point = { x: x + centre.x, z: z + centre.z };
        const near = raised.some((points) =>
          points.some((to, at) => at > 0 && distanceToSegment(point, points[at - 1]!, to) < BRIDGE_REACH),
        );
        expect(near).toBe(true);
      }
    }
  });

  it('raises a bridge clear of the ground it crosses', () => {
    const bridges = BLOCK_CHUNKS.flatMap((key) =>
      graphOf(key).edges.filter((edge) => edge.bridge).map((edge) => ({ key, edge })),
    );
    expect(bridges.length).toBeGreaterThan(0);

    for (const { key, edge } of bridges) {
      const terrain = terrainOf(key);
      const { positions } = decodeRoadBlob(readBlob(key, ROAD_BLOB_FILE));
      const middle = edge.points[Math.floor(edge.points.length / 2)]!;

      let highest = -Infinity;
      for (let index = 0; index < positions.length; index += 3) {
        if (Math.hypot(positions[index]! - middle.x, positions[index + 2]! - middle.z) > edge.width) continue;
        highest = Math.max(highest, positions[index + 1]!);
      }
      expect(highest).toBeGreaterThan(terrainHeightAt(terrain.heights, middle.x, middle.z));
    }
  });
});

describe('the road graph', () => {
  // OpenStreetMap tags Jalan Raya Canggu in pieces: most carry width=5 or width=4.5, a few
  // carry none. The tagged pieces must come out at their tag, not at the 5.5 m default the
  // secondary class would otherwise give them.
  it('gives Jalan Raya Canggu the width its OpenStreetMap tag states', () => {
    const named = BLOCK_CHUNKS.flatMap((key) => graphOf(key).edges).filter(
      (edge) => edge.name === 'Jalan Raya Canggu',
    );

    expect(named.length).toBeGreaterThan(0);
    for (const edge of named) {
      expect(edge.cls).toBe('secondary');
      expect(edge.surface).toBe('asphalt');
      expect([4.5, 5, 5.5]).toContain(Math.round(edge.width * 10) / 10);
    }

    const tagged = named.filter((edge) => edge.width < roadWidth('secondary', undefined));
    expect(tagged.length).toBeGreaterThan(named.length / 2);
    expect(tagged.some((edge) => edge.width === 5)).toBe(true);
  });

  // The runtime opens the first Ride on this exact point, so the road had better be there.
  it('lays Jalan Raya Canggu under the point the first Ride starts on', () => {
    const chunk = worldToChunk(RIDE_START.x, RIDE_START.z);
    const centre = chunkCentre(chunk);
    const start = { x: RIDE_START.x - centre.x, z: RIDE_START.z - centre.z };

    let nearest: { name: string | undefined; width: number; distance: number } | undefined;
    for (const edge of graphOf(chunkKey(chunk)).edges) {
      for (let index = 1; index < edge.points.length; index++) {
        const distance = distanceToSegment(start, edge.points[index - 1]!, edge.points[index]!);
        if (nearest && distance >= nearest.distance) continue;
        nearest = { name: edge.name, width: edge.width, distance };
      }
    }

    expect(nearest?.name).toBe(RIDE_START_ROAD);
    expect(nearest!.distance).toBeLessThan(nearest!.width / 2);
  });

  it('reaches every edge from its own nodes, so nothing is orphaned', () => {
    for (const key of BLOCK_CHUNKS) {
      const { nodes, edges } = graphOf(key);
      expect(edges.length).toBeGreaterThan(0);
      for (const edge of edges) {
        expect(nodes[edge.nodes[0]]).toBeDefined();
        expect(nodes[edge.nodes[1]]).toBeDefined();
        expect(edge.points.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('joins the two halves of a road split at a chunk border through a shared node id', () => {
    const west = graphOf('x9_z21');
    const east = graphOf('x10_z21');

    const shared = west.nodes
      .map((node) => node.id)
      .filter((id) => east.nodes.some((node) => node.id === id));

    expect(shared.length).toBeGreaterThan(0);
    for (const id of shared) {
      const inWest = west.edges.some((edge) => west.nodes[edge.nodes[0]]?.id === id || west.nodes[edge.nodes[1]]?.id === id);
      const inEast = east.edges.some((edge) => east.nodes[edge.nodes[0]]?.id === id || east.nodes[edge.nodes[1]]?.id === id);
      expect(inWest && inEast).toBe(true);
    }
  });

  it('puts a shared border node on the border in both chunks it belongs to', () => {
    const west = graphOf('x9_z21');
    const east = graphOf('x10_z21');

    for (const node of west.nodes) {
      const twin = east.nodes.find((other) => other.id === node.id);
      if (!twin) continue;
      // The border between chunk 9 and chunk 10 is +500 from one centre and -500 from the next.
      expect(node.x).toBeCloseTo(500, 2);
      expect(twin.x).toBeCloseTo(-500, 2);
      expect(node.z).toBeCloseTo(twin.z, 2);
    }
  });

  it('keeps Paths out of the graph while still drawing them', () => {
    const classes = new Set(BLOCK_CHUNKS.flatMap((key) => graphOf(key).edges.map((edge) => edge.cls)));
    for (const path of ['footway', 'path', 'steps', 'pedestrian', 'cycleway']) {
      expect(classes.has(path as never)).toBe(false);
    }
  });

  it('builds the graph from the classes Bali tags its roads with', () => {
    const classes = new Set(BLOCK_CHUNKS.flatMap((key) => graphOf(key).edges.map((edge) => edge.cls)));
    expect(classes).toContain('secondary');
    expect(classes).toContain('residential');
    expect(classes).toContain('living_street');
  });
});

describe('rebuilding', () => {
  it('writes no chunk files when nothing about the input has changed', async () => {
    const before = Object.keys(manifest.chunks).map((key) => statSync(join(root, key, ROAD_BLOB_FILE)).mtimeMs);
    const again = await buildWorld(fixtureBuild(root, join(root, '.work')));
    const after = Object.keys(manifest.chunks).map((key) => statSync(join(root, key, ROAD_BLOB_FILE)).mtimeMs);

    expect(again.written).toEqual([]);
    expect(after).toEqual(before);
  }, 60_000);

  it('produces the same chunks the first build did', async () => {
    const again = await buildWorld(fixtureBuild(root, join(root, '.work')));
    expect(again.chunks).toEqual(build.chunks);
  }, 60_000);
});

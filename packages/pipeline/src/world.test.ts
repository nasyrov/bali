// Seam 1, the world data contract: the whole pipeline runs on the checked-in Canggu fixture
// and every assertion is on the packed output, the way the runtime reads it.

import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GRAPH_BLOB_FILE,
  MANIFEST_FILE,
  ROAD_BLOB_FILE,
  WORLD_FORMAT_VERSION,
  decodeGraphBlob,
  decodeRoadBlob,
  MARKING_STRIDE,
  RIDE_START,
  RIDE_START_ROAD,
  chunkCentre,
  chunkKey,
  parseChunkKey,
  readMarking,
  roadWidth,
  worldToChunk,
} from '@bali-moto/shared';
import type { GraphBlob, WorldManifest, WorldPoint } from '@bali-moto/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fixtureBuild } from './config.ts';
import { buildWorld, type WorldBuildResult } from './world.ts';

/** The chunks the fixture block covers; ways reaching out of it spill into its neighbours. */
const BLOCK_CHUNKS = ['x9_z21', 'x9_z22', 'x10_z21', 'x10_z22'];

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

  it('gives every chunk a road blob and a graph blob with their sizes on disk', () => {
    for (const [key, files] of Object.entries(manifest.chunks)) {
      expect(Object.keys(files).sort()).toEqual([GRAPH_BLOB_FILE, ROAD_BLOB_FILE]);
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

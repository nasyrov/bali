import { WORLD_FORMAT_VERSION, chunkCentre } from '@bali-moto/shared';
import type { ChunkId, GraphBlob, GraphEdge, WorldPoint } from '@bali-moto/shared';
import { describe, expect, it } from 'vitest';
import { RoadIndex } from './roadIndex.ts';

const CHUNK: ChunkId = { i: 9, j: 21 };
const CENTRE = chunkCentre(CHUNK);

/** A chunk graph of straight Roads, each given chunk-local corner points. */
function graphOf(roads: { name?: string; points: WorldPoint[]; width?: number }[]): GraphBlob {
  const edges: GraphEdge[] = roads.map((road, index) => ({
    nodes: [index * 2, index * 2 + 1],
    points: road.points,
    cls: 'residential',
    width: road.width ?? 3.5,
    surface: undefined,
    oneway: 0,
    lanes: 2,
    name: road.name,
    bridge: false,
    layer: 0,
  }));

  return {
    header: { formatVersion: WORLD_FORMAT_VERSION, chunk: CHUNK, counts: [] },
    chunk: CHUNK,
    nodes: roads.flatMap((road, index) => [
      { id: index * 2, ...road.points[0]! },
      { id: index * 2 + 1, ...road.points.at(-1)! },
    ]),
    edges,
  };
}

/** A point given in chunk-local metres, the way the graph blob stores them. */
function at(x: number, z: number): WorldPoint {
  return { x: CENTRE.x + x, z: CENTRE.z + z };
}

describe('the nearest Road', () => {
  const index = new RoadIndex();
  index.add(
    graphOf([
      { name: 'Jalan Pantai', points: [{ x: -400, z: 0 }, { x: 400, z: 0 }], width: 6 },
      { name: 'Gang Sari', points: [{ x: 0, z: 60 }, { x: 0, z: 300 }] },
    ]),
  );

  it('finds the Road the bike is standing on and which way it runs', () => {
    const found = index.nearest(at(120, 1))!;
    expect(found.road.name).toBe('Jalan Pantai');
    expect(found.distance).toBeCloseTo(1, 6);
    expect(found.onRoad).toBe(true);
    // The road runs east, and headings are measured from north, clockwise.
    expect(found.heading).toBeCloseTo(Math.PI / 2, 6);
  });

  it('knows when the bike is beside the Road rather than on it', () => {
    expect(index.nearest(at(120, 8))!.onRoad).toBe(false);
  });

  it('picks the closer of two Roads even when they share a cell', () => {
    expect(index.nearest(at(0, 25))!.road.name).toBe('Jalan Pantai');
    expect(index.nearest(at(0, 200))!.road.name).toBe('Gang Sari');
  });

  it('reaches a Road many cells away, so a reset works from the middle of a paddy', () => {
    const found = index.nearest(at(0, 700))!;
    expect(found.road.name).toBe('Gang Sari');
    expect(found.distance).toBeCloseTo(400, 6);
  });

  it('gives up rather than answering with a Road on the far side of the island', () => {
    expect(index.nearest(at(0, 5000))).toBeUndefined();
    expect(index.nearest(at(0, 700), 100)).toBeUndefined();
  });
});

describe('chunks coming and going', () => {
  it('forgets a chunk\'s Roads when it unloads, and takes them back on reload', () => {
    const index = new RoadIndex();
    const graph = graphOf([{ name: 'Jalan Pantai', points: [{ x: -400, z: 0 }, { x: 400, z: 0 }] }]);

    index.add(graph);
    expect(index.nearest(at(0, 0))).toBeDefined();

    index.remove('x9_z21');
    expect(index.size).toBe(0);
    expect(index.nearest(at(0, 0))).toBeUndefined();

    index.add(graph);
    expect(index.nearest(at(0, 0))!.road.name).toBe('Jalan Pantai');
  });

  it('holds one copy of a chunk however often it arrives', () => {
    const index = new RoadIndex();
    const graph = graphOf([{ name: 'Jalan Pantai', points: [{ x: -400, z: 0 }, { x: 400, z: 0 }] }]);

    index.add(graph);
    index.add(graph);
    index.remove('x9_z21');

    expect(index.nearest(at(0, 0))).toBeUndefined();
  });
});

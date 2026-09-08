import { decodeGraphBlob, chunkKey } from '@bali-moto/shared';
import { describe, expect, it } from 'vitest';
import { bakeChunks } from './bake.ts';
import type { RoadWay } from './graph.ts';

/** A drivable way through the Canggu chunks, given directly in world metres. */
function roadWay(wayId: number, nodeIds: number[], points: [number, number][]): RoadWay {
  return {
    wayId,
    cls: 'residential',
    width: 3.5,
    colour: 0x8a8478,
    surface: undefined,
    oneway: 0,
    lanes: 1,
    name: undefined,
    bridge: false,
    layer: 0,
    path: false,
    nodeIds,
    points: points.map(([x, z]) => ({ x, z })),
  };
}

function nodesOf(builds: ReturnType<typeof bakeChunks>) {
  return builds.flatMap((build) => decodeGraphBlob(build.graph).nodes.map((node) => ({
    chunk: chunkKey(build.chunk),
    ...node,
  })));
}

describe('baking chunks', () => {
  // A way cut at a junction becomes several edges, and each of those may cross a border.
  // Every one of those border nodes is a different place and needs a different id, or two
  // unrelated points are silently merged into one junction of the road graph.
  it('gives every border node of a way its own id, however often the way is cut', () => {
    const crossing = roadWay(42, [1, 2, 3], [
      [9800, 21500],
      [10500, 21500],
      [11200, 21500],
    ]);
    // A second way meeting the middle node, so the way is cut there into two edges.
    const sideRoad = roadWay(43, [2, 4], [
      [10500, 21500],
      [10500, 22200],
    ]);

    const nodes = nodesOf(bakeChunks([crossing, sideRoad]));
    const borderNodes = nodes.filter((node) => node.id < 0);

    expect(borderNodes.length).toBeGreaterThanOrEqual(4);
    for (const node of borderNodes) {
      const twins = borderNodes.filter((other) => other.id === node.id);
      // A border node appears in the two chunks it joins, at mirrored positions.
      expect(twins).toHaveLength(2);
      expect(new Set(twins.map((twin) => twin.chunk)).size).toBe(2);
      expect(Math.abs(twins[0]!.x)).toBeCloseTo(Math.abs(twins[1]!.x), 3);
    }
  });

  it('never gives a border node the id of an OpenStreetMap node', () => {
    const nodes = nodesOf(
      bakeChunks([roadWay(7, [100, 101], [[9800, 21500], [10500, 21500]])]),
    );
    const ids = nodes.map((node) => node.id);
    expect(ids.filter((id) => id > 0).sort()).toEqual([100, 101]);
  });

  it('keeps a way that stays in one chunk out of the border-splitting entirely', () => {
    const builds = bakeChunks([roadWay(7, [100, 101], [[9100, 21100], [9800, 21800]])]);
    expect(builds).toHaveLength(1);
    expect(decodeGraphBlob(builds[0]!.graph).nodes.map((node) => node.id)).toEqual([100, 101]);
  });
});

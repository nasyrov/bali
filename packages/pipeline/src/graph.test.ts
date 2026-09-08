import { describe, expect, it } from 'vitest';
import { buildRoadWays, splitAtChunkBorders, splitAtJunctions } from './graph.ts';
import type { OsmWay } from './osm.ts';

/** A way through Canggu, with coordinates given as world metres for readability. */
function way(id: number, tags: Record<string, string>, nodes: number[]): OsmWay {
  return {
    id,
    tags,
    nodeIds: nodes,
    // Spread the points a few metres apart along a line; the exact place does not matter.
    points: nodes.map((_, index) => ({ lon: 115.14 + index * 0.0002, lat: -8.645 })),
  };
}

describe('buildRoadWays', () => {
  it('keeps the ways the island is built from', () => {
    const ways = buildRoadWays([
      way(1, { highway: 'secondary', name: 'Jalan Raya Canggu', width: '5', surface: 'asphalt' }, [10, 11]),
      way(2, { highway: 'living_street' }, [11, 12]),
    ]);

    expect(ways.map((road) => road.cls)).toEqual(['secondary', 'living_street']);
    expect(ways[0]!.name).toBe('Jalan Raya Canggu');
    expect(ways[0]!.width).toBe(5);
    expect(ways[0]!.surface).toBe('asphalt');
  });

  it('drops ways that are not a road today and never will be', () => {
    const ways = buildRoadWays([
      way(1, { highway: 'proposed' }, [1, 2]),
      way(2, { highway: 'construction' }, [3, 4]),
      way(3, { highway: 'raceway' }, [5, 6]),
      way(4, { highway: 'bus_stop' }, [7, 8]),
    ]);
    expect(ways).toEqual([]);
  });

  it('drops a way tagged as an area rather than rendering it as a ribbon', () => {
    expect(buildRoadWays([way(1, { highway: 'pedestrian', area: 'yes' }, [1, 2])])).toEqual([]);
  });

  it('drops a way with fewer than two points', () => {
    expect(buildRoadWays([way(1, { highway: 'residential' }, [1])])).toEqual([]);
  });

  it('marks paths so they are rendered but never join the graph', () => {
    const [road, path] = buildRoadWays([
      way(1, { highway: 'track' }, [1, 2]),
      way(2, { highway: 'footway' }, [3, 4]),
    ]);
    expect(road!.path).toBe(false);
    expect(path!.path).toBe(true);
  });

  it('reads the attributes Traffic and the HUD need', () => {
    const [road] = buildRoadWays([
      way(1, { highway: 'tertiary', oneway: 'yes', lanes: '2', bridge: 'yes', layer: '2' }, [1, 2]),
    ]);
    expect(road).toMatchObject({ oneway: 1, lanes: 2, bridge: true, layer: 2 });
  });

  it('reads a reversed one-way and defaults a bridge with no layer to one level up', () => {
    const [reversed, bridge] = buildRoadWays([
      way(1, { highway: 'residential', oneway: '-1' }, [1, 2]),
      way(2, { highway: 'residential', bridge: 'yes' }, [3, 4]),
    ]);
    expect(reversed!.oneway).toBe(-1);
    expect(bridge!.layer).toBe(1);
  });

  it('defaults a road with no oneway, lanes or layer tags to the plain case', () => {
    const [road] = buildRoadWays([way(1, { highway: 'residential' }, [1, 2])]);
    expect(road).toMatchObject({ oneway: 0, lanes: 1, bridge: false, layer: 0 });
  });
});

describe('splitAtJunctions', () => {
  const roads = buildRoadWays([
    way(1, { highway: 'secondary' }, [100, 101, 102, 103]),
    way(2, { highway: 'residential' }, [200, 102, 201]),
    way(3, { highway: 'footway' }, [300, 101, 301]),
  ]);

  it('cuts a road where another road meets it, keeping the shared node id', () => {
    const edges = splitAtJunctions(roads);
    const secondary = edges.filter((edge) => edge.wayId === 1);

    expect(secondary).toHaveLength(2);
    expect(secondary[0]!.fromId).toBe(100);
    expect(secondary[0]!.toId).toBe(102);
    expect(secondary[1]!.fromId).toBe(102);
    expect(secondary[1]!.toId).toBe(103);
  });

  it('does not cut a road where only a path touches it', () => {
    expect(splitAtJunctions(roads).filter((edge) => edge.wayId === 1).length).toBe(2);
  });

  it('leaves paths out of the graph entirely', () => {
    expect(splitAtJunctions(roads).some((edge) => edge.wayId === 3)).toBe(false);
  });

  it('keeps a road with no junction on it as one edge from end to end', () => {
    const [edge, ...rest] = splitAtJunctions(buildRoadWays([way(9, { highway: 'residential' }, [1, 2, 3])]));
    expect(rest).toEqual([]);
    expect([edge!.fromId, edge!.toId]).toEqual([1, 3]);
    expect(edge!.points).toHaveLength(3);
  });
});

describe('splitAtChunkBorders', () => {
  const attrs = { wayId: 42, fromId: 1, toId: 2 };

  it('leaves an edge inside one chunk alone', () => {
    const pieces = splitAtChunkBorders({
      ...attrs,
      points: [
        { x: 9100, z: 21100 },
        { x: 9800, z: 21300 },
      ],
    });

    expect(pieces).toHaveLength(1);
    expect(pieces[0]!.chunk).toEqual({ i: 9, j: 21 });
    expect(pieces[0]!.fromId).toBe(1);
    expect(pieces[0]!.toId).toBe(2);
  });

  it('cuts an edge at the border and gives both halves the same new node', () => {
    const pieces = splitAtChunkBorders({
      ...attrs,
      points: [
        { x: 9800, z: 21500 },
        { x: 10200, z: 21500 },
      ],
    });

    expect(pieces.map((piece) => piece.chunk)).toEqual([{ i: 9, j: 21 }, { i: 10, j: 21 }]);
    expect(pieces[0]!.toId).toBe(pieces[1]!.fromId);
    expect(pieces[0]!.toId).not.toBe(1);
    expect(pieces[0]!.toId).not.toBe(2);
  });

  it('puts the new node exactly on the border, in both halves', () => {
    const [west, east] = splitAtChunkBorders({
      ...attrs,
      points: [
        { x: 9800, z: 21500 },
        { x: 10200, z: 21700 },
      ],
    });

    expect(west!.points.at(-1)!.x).toBeCloseTo(10000, 6);
    expect(west!.points.at(-1)!.z).toBeCloseTo(21600, 6);
    expect(east!.points[0]).toEqual(west!.points.at(-1));
  });

  it('cuts an edge that crosses a corner into three pieces', () => {
    const pieces = splitAtChunkBorders({
      ...attrs,
      points: [
        { x: 9900, z: 21900 },
        { x: 10100, z: 22100 },
      ],
    });

    expect(pieces.map((piece) => piece.chunk)).toEqual([
      { i: 9, j: 21 },
      expect.objectContaining({}),
      { i: 10, j: 22 },
    ]);
    expect(pieces[0]!.toId).toBe(pieces[1]!.fromId);
    expect(pieces[1]!.toId).toBe(pieces[2]!.fromId);
  });

  it('gives the same border node id every time it rebuilds the same edge', () => {
    const edge = {
      ...attrs,
      points: [
        { x: 9800, z: 21500 },
        { x: 10200, z: 21500 },
      ],
    };
    expect(splitAtChunkBorders(edge)[0]!.toId).toBe(splitAtChunkBorders(edge)[0]!.toId);
  });

  it('gives border nodes on different ways different ids', () => {
    const points = [
      { x: 9800, z: 21500 },
      { x: 10200, z: 21500 },
    ];
    const first = splitAtChunkBorders({ wayId: 1, fromId: 1, toId: 2, points });
    const second = splitAtChunkBorders({ wayId: 2, fromId: 3, toId: 4, points });
    expect(first[0]!.toId).not.toBe(second[0]!.toId);
  });

  it('never mistakes a border node for an OpenStreetMap node', () => {
    const [west] = splitAtChunkBorders({
      ...attrs,
      points: [
        { x: 9800, z: 21500 },
        { x: 10200, z: 21500 },
      ],
    });
    expect(west!.toId).toBeLessThan(0);
  });

  it('keeps every point of an edge that runs along a border without crossing it', () => {
    const pieces = splitAtChunkBorders({
      ...attrs,
      points: [
        { x: 9000, z: 21100 },
        { x: 9500, z: 21100 },
        { x: 9900, z: 21100 },
      ],
    });
    expect(pieces).toHaveLength(1);
    expect(pieces[0]!.points).toHaveLength(3);
  });
});

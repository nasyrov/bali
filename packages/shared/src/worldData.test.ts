import { describe, expect, it } from 'vitest';
import { WORLD_FORMAT_VERSION } from './blob.ts';
import { decodeGraphBlob, decodeRoadBlob, encodeGraphBlob, encodeRoadBlob } from './worldData.ts';
import type { GraphEdge, GraphNode } from './worldData.ts';

const chunk = { i: 9, j: 21 };

describe('the road blob', () => {
  const mesh = {
    positions: Float32Array.from([0, 0.02, 0, 1, 0.02, 0, 1, 0.02, 1]),
    colours: Uint8Array.from([0x5a, 0x56, 0x51, 0x5a, 0x56, 0x51, 0x8a, 0x84, 0x78]),
    indices: Uint32Array.from([0, 1, 2]),
  };
  const markings = [{ x: 0.5, y: 0.03, z: 0.2, angle: 1.25, length: 1.5, width: 0.12 }];

  it('round-trips the surface and its markings', () => {
    const decoded = decodeRoadBlob(encodeRoadBlob(chunk, mesh, markings));

    expect(decoded.chunk).toEqual(chunk);
    expect(decoded.positions).toEqual(mesh.positions);
    expect(decoded.colours).toEqual(mesh.colours);
    expect(decoded.indices).toEqual(mesh.indices);
    expect(decoded.markings).toHaveLength(1);
    expect(decoded.markings[0]).toEqual(
      Object.fromEntries(Object.entries(markings[0]!).map(([key, value]) => [key, expect.closeTo(value, 5)])),
    );
  });

  it('states its counts in the header, so a reader can size buffers before parsing', () => {
    const decoded = decodeRoadBlob(encodeRoadBlob(chunk, mesh, markings));
    expect(decoded.header.counts).toEqual([3, 3, 1]);
    expect(decoded.header.formatVersion).toBe(WORLD_FORMAT_VERSION);
  });

  it('round-trips a chunk whose roads carry no markings', () => {
    const decoded = decodeRoadBlob(encodeRoadBlob(chunk, mesh, []));
    expect(decoded.markings).toEqual([]);
    expect(decoded.indices).toEqual(mesh.indices);
  });
});

describe('the graph blob', () => {
  const nodes: GraphNode[] = [
    { id: 273757118, x: 10, z: 20 },
    { id: 5641265002, x: 60, z: 20 },
    { id: 14142801887, x: 60, z: 90 },
  ];
  const edges: GraphEdge[] = [
    {
      nodes: [0, 1],
      points: [
        { x: 10, z: 20 },
        { x: 35, z: 22 },
        { x: 60, z: 20 },
      ],
      cls: 'secondary',
      width: 5,
      surface: 'asphalt',
      oneway: 0,
      lanes: 2,
      name: 'Jalan Raya Canggu',
      bridge: false,
      layer: 0,
    },
    {
      nodes: [1, 2],
      points: [
        { x: 60, z: 20 },
        { x: 60, z: 90 },
      ],
      cls: 'living_street',
      width: 2.2,
      surface: undefined,
      oneway: -1,
      lanes: 1,
      name: undefined,
      bridge: true,
      layer: 1,
    },
  ];

  it('round-trips nodes with their OpenStreetMap ids intact', () => {
    const decoded = decodeGraphBlob(encodeGraphBlob(chunk, nodes, edges));

    expect(decoded.chunk).toEqual(chunk);
    expect(decoded.nodes.map((node) => node.id)).toEqual(nodes.map((node) => node.id));
    for (const [index, node] of decoded.nodes.entries()) {
      expect(node.x).toBeCloseTo(nodes[index]!.x, 3);
      expect(node.z).toBeCloseTo(nodes[index]!.z, 3);
    }
  });

  // Node ids run past 14 billion, well beyond what a 32-bit field holds.
  it('keeps a node id larger than a 32-bit integer exactly', () => {
    const decoded = decodeGraphBlob(encodeGraphBlob(chunk, nodes, edges));
    expect(decoded.nodes[2]!.id).toBe(14142801887);
  });

  it('round-trips every edge attribute the runtime and Traffic read', () => {
    const decoded = decodeGraphBlob(encodeGraphBlob(chunk, nodes, edges));

    expect(decoded.edges).toHaveLength(2);
    for (const [index, edge] of decoded.edges.entries()) {
      const original = edges[index]!;
      expect(edge.nodes).toEqual(original.nodes);
      expect(edge.cls).toBe(original.cls);
      expect(edge.width).toBeCloseTo(original.width, 4);
      expect(edge.surface).toBe(original.surface);
      expect(edge.oneway).toBe(original.oneway);
      expect(edge.lanes).toBe(original.lanes);
      expect(edge.name).toBe(original.name);
      expect(edge.bridge).toBe(original.bridge);
      expect(edge.layer).toBe(original.layer);
      expect(edge.points).toHaveLength(original.points.length);
    }
  });

  it('round-trips the geometry of edges of different lengths', () => {
    const decoded = decodeGraphBlob(encodeGraphBlob(chunk, nodes, edges));
    expect(decoded.edges[0]!.points[1]!.x).toBeCloseTo(35, 3);
    expect(decoded.edges[1]!.points[1]!.z).toBeCloseTo(90, 3);
  });

  it('round-trips a chunk with no roads at all', () => {
    const decoded = decodeGraphBlob(encodeGraphBlob(chunk, [], []));
    expect(decoded.nodes).toEqual([]);
    expect(decoded.edges).toEqual([]);
  });
});

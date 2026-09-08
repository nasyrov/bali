// The world data contract: what the pipeline writes per chunk and the runtime reads back.
//
// Two blobs so far. The road blob is the drawable surface — positions, vertex colours,
// indices and marking instances — with positions relative to the chunk centre so that
// world-scale coordinates never reach a float. The graph blob is the road network the bike,
// Traffic and "which Road am I on" queries run on: nodes with their OpenStreetMap ids and
// edges with the attributes those readers need.

import { encodeSections, readSections, type BlobHeader } from './blob.ts';
import type { ChunkId } from './chunks.ts';
import type { WorldPoint } from './projection.ts';
import type { MarkingInstance, Mesh } from './ribbon.ts';
import type { RoadClass } from './roads.ts';

/** Floats per marking instance: x, y, z, angle, length, width. */
const MARKING_STRIDE = 6;

/** Surfaces an edge may carry, in blob order; index 0 means the way had no surface tag. */
const SURFACES = [
  undefined,
  'asphalt',
  'paved',
  'paving_stones',
  'concrete',
  'unpaved',
  'gravel',
  'dirt',
  'ground',
] as const;

/** Classes in blob order. Appending is safe; reordering is a format change. */
const CLASSES: RoadClass[] = [
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'primary',
  'primary_link',
  'secondary',
  'secondary_link',
  'tertiary',
  'tertiary_link',
  'unclassified',
  'residential',
  'living_street',
  'service',
  'track',
  'pedestrian',
  'cycleway',
  'path',
  'footway',
  'steps',
];

const BRIDGE_FLAG = 1;
const NO_NAME = 0xffffffff;

export interface RoadBlob {
  header: BlobHeader;
  chunk: ChunkId;
  positions: Float32Array;
  colours: Uint8Array;
  indices: Uint32Array;
  markings: MarkingInstance[];
}

export interface GraphNode {
  /** The OpenStreetMap node id, stable across rebuilds and shared across chunk borders. */
  id: number;
  x: number;
  z: number;
}

export interface GraphEdge {
  /** Indices into the chunk's node list, in the direction the way was drawn. */
  nodes: [number, number];
  /** The edge's geometry, chunk-local, starting and ending at its two nodes. */
  points: WorldPoint[];
  cls: RoadClass;
  width: number;
  surface: string | undefined;
  /** 0 both ways, 1 along the geometry, -1 against it. */
  oneway: number;
  lanes: number;
  name: string | undefined;
  bridge: boolean;
  layer: number;
}

export interface GraphBlob {
  header: BlobHeader;
  chunk: ChunkId;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Pack a chunk's road surface and markings. */
export function encodeRoadBlob(
  chunk: ChunkId,
  mesh: Mesh,
  markings: readonly MarkingInstance[],
): ArrayBuffer {
  const vertexCount = mesh.positions.length / 3;
  const packed = new Float32Array(markings.length * MARKING_STRIDE);
  for (const [index, mark] of markings.entries()) {
    packed.set([mark.x, mark.y, mark.z, mark.angle, mark.length, mark.width], index * MARKING_STRIDE);
  }

  return encodeSections({ chunk, counts: [vertexCount, mesh.indices.length, markings.length] }, [
    mesh.positions,
    mesh.colours,
    mesh.indices,
    packed,
  ]);
}

export function decodeRoadBlob(buffer: ArrayBuffer): RoadBlob {
  const blob = readSections(buffer);
  const [vertexCount = 0, indexCount = 0, markingCount = 0] = blob.header.counts;

  const positions = blob.read(Float32Array, vertexCount * 3);
  const colours = blob.read(Uint8Array, vertexCount * 3);
  const indices = blob.read(Uint32Array, indexCount);
  const packed = blob.read(Float32Array, markingCount * MARKING_STRIDE);

  const markings: MarkingInstance[] = [];
  for (let index = 0; index < markingCount; index++) {
    const at = index * MARKING_STRIDE;
    markings.push({
      x: packed[at]!,
      y: packed[at + 1]!,
      z: packed[at + 2]!,
      angle: packed[at + 3]!,
      length: packed[at + 4]!,
      width: packed[at + 5]!,
    });
  }

  return { header: blob.header, chunk: blob.header.chunk, positions, colours, indices, markings };
}

/** Pack a chunk's road graph. */
export function encodeGraphBlob(
  chunk: ChunkId,
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): ArrayBuffer {
  const names: string[] = [];
  const nameIndexOf = (name: string | undefined) => {
    if (name === undefined) return NO_NAME;
    const existing = names.indexOf(name);
    return existing >= 0 ? existing : names.push(name) - 1;
  };

  const nodeIds = Float64Array.from(nodes, (node) => node.id);
  const nodePositions = new Float32Array(nodes.length * 2);
  for (const [index, node] of nodes.entries()) nodePositions.set([node.x, node.z], index * 2);

  const edgeNodes = new Uint32Array(edges.length * 2);
  const pointStarts = new Uint32Array(edges.length + 1);
  const classes = new Uint8Array(edges.length);
  const widths = new Float32Array(edges.length);
  const surfaces = new Uint8Array(edges.length);
  const onewayAndLanes = new Int8Array(edges.length * 2);
  const flags = new Uint8Array(edges.length);
  const layers = new Int8Array(edges.length);
  const nameIndices = new Uint32Array(edges.length);

  let pointCount = 0;
  for (const [index, edge] of edges.entries()) {
    edgeNodes.set(edge.nodes, index * 2);
    pointStarts[index] = pointCount;
    pointCount += edge.points.length;
    classes[index] = CLASSES.indexOf(edge.cls);
    widths[index] = edge.width;
    surfaces[index] = Math.max(0, SURFACES.indexOf(edge.surface as (typeof SURFACES)[number]));
    onewayAndLanes.set([edge.oneway, edge.lanes], index * 2);
    flags[index] = edge.bridge ? BRIDGE_FLAG : 0;
    layers[index] = edge.layer;
    nameIndices[index] = nameIndexOf(edge.name);
  }
  pointStarts[edges.length] = pointCount;

  const points = new Float32Array(pointCount * 2);
  let at = 0;
  for (const edge of edges) {
    for (const point of edge.points) {
      points.set([point.x, point.z], at);
      at += 2;
    }
  }

  const strings = new TextEncoder().encode(JSON.stringify(names));

  return encodeSections(
    { chunk, counts: [nodes.length, edges.length, pointCount, strings.byteLength] },
    [
      nodeIds,
      nodePositions,
      edgeNodes,
      pointStarts,
      points,
      widths,
      nameIndices,
      classes,
      surfaces,
      onewayAndLanes,
      flags,
      layers,
      strings,
    ],
  );
}

export function decodeGraphBlob(buffer: ArrayBuffer): GraphBlob {
  const blob = readSections(buffer);
  const [nodeCount = 0, edgeCount = 0, pointCount = 0, stringBytes = 0] = blob.header.counts;

  const nodeIds = blob.read(Float64Array, nodeCount);
  const nodePositions = blob.read(Float32Array, nodeCount * 2);
  const edgeNodes = blob.read(Uint32Array, edgeCount * 2);
  const pointStarts = blob.read(Uint32Array, edgeCount + 1);
  const points = blob.read(Float32Array, pointCount * 2);
  const widths = blob.read(Float32Array, edgeCount);
  const nameIndices = blob.read(Uint32Array, edgeCount);
  const classes = blob.read(Uint8Array, edgeCount);
  const surfaces = blob.read(Uint8Array, edgeCount);
  const onewayAndLanes = blob.read(Int8Array, edgeCount * 2);
  const flags = blob.read(Uint8Array, edgeCount);
  const layers = blob.read(Int8Array, edgeCount);
  const names: string[] = stringBytes === 0 ? [] : JSON.parse(new TextDecoder().decode(blob.read(Uint8Array, stringBytes)));

  const nodes: GraphNode[] = Array.from({ length: nodeCount }, (_, index) => ({
    id: nodeIds[index]!,
    x: nodePositions[index * 2]!,
    z: nodePositions[index * 2 + 1]!,
  }));

  const edges: GraphEdge[] = Array.from({ length: edgeCount }, (_, index) => {
    const from = pointStarts[index]!;
    const to = pointStarts[index + 1]!;
    return {
      nodes: [edgeNodes[index * 2]!, edgeNodes[index * 2 + 1]!],
      points: Array.from({ length: to - from }, (_unused, step) => ({
        x: points[(from + step) * 2]!,
        z: points[(from + step) * 2 + 1]!,
      })),
      cls: CLASSES[classes[index]!]!,
      width: widths[index]!,
      surface: SURFACES[surfaces[index]!],
      oneway: onewayAndLanes[index * 2]!,
      lanes: onewayAndLanes[index * 2 + 1]!,
      name: nameIndices[index] === NO_NAME ? undefined : names[nameIndices[index]!],
      bridge: (flags[index]! & BRIDGE_FLAG) !== 0,
      layer: layers[index]!,
    };
  });

  return { header: blob.header, chunk: blob.header.chunk, nodes, edges };
}

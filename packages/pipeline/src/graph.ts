// Building the road graph from OpenStreetMap ways.
//
// A way becomes one or more edges: it is cut at every node another road also uses, so that
// junctions are nodes of the graph, and then at every chunk border, so that no edge spans
// two chunks. A border cut inserts a node both halves share, which is what lets Traffic and
// "which Road am I on" queries cross a chunk border. Paths are kept for rendering but never
// join the graph, because Traffic drives only on Roads.

import {
  CHUNK_SIZE,
  isDropped,
  isPath,
  lonLatToWorld,
  roadClassOf,
  roadColour,
  roadWidth,
  worldToChunk,
  type ChunkId,
  type RoadClass,
  type WorldPoint,
} from '@bali-moto/shared';
import type { OsmWay } from './osm.ts';

/**
 * Border nodes are numbered from the way they cut, so a rebuild produces the same id and
 * both chunks agree on it. Negative, so they can never collide with an OpenStreetMap id.
 */
const CROSSINGS_PER_WAY = 1024;

/** A crossing this close to an existing point is that point, not a new one. */
const BORDER_EPSILON = 1e-6;

export interface RoadWay {
  wayId: number;
  cls: RoadClass;
  width: number;
  colour: number;
  surface: string | undefined;
  oneway: number;
  lanes: number;
  name: string | undefined;
  bridge: boolean;
  layer: number;
  /** Whether this is a Path: rendered and rideable, but never part of the road graph. */
  path: boolean;
  nodeIds: number[];
  points: WorldPoint[];
}

export interface RoadEdge {
  wayId: number;
  fromId: number;
  toId: number;
  points: WorldPoint[];
}

export interface ChunkPiece extends RoadEdge {
  chunk: ChunkId;
}

function readOneway(tag: string | undefined): number {
  if (tag === 'yes' || tag === '1' || tag === 'true') return 1;
  if (tag === '-1' || tag === 'reverse') return -1;
  return 0;
}

/** Read the ways the world renders, dropping the rest and projecting them into world metres. */
export function buildRoadWays(ways: readonly OsmWay[]): RoadWay[] {
  const roads: RoadWay[] = [];

  for (const way of ways) {
    const highway = way.tags.highway;
    if (highway === undefined || isDropped(highway)) continue;
    if (way.tags.area === 'yes') continue;

    const cls = roadClassOf(highway);
    if (cls === undefined) continue;
    if (way.points.length < 2) continue;

    const bridge = way.tags.bridge !== undefined && way.tags.bridge !== 'no';
    const layer = Number.parseInt(way.tags.layer ?? '', 10);

    roads.push({
      wayId: way.id,
      cls,
      width: roadWidth(cls, way.tags.width),
      colour: roadColour(cls, way.tags.surface),
      surface: way.tags.surface,
      oneway: readOneway(way.tags.oneway),
      lanes: Number.parseInt(way.tags.lanes ?? '', 10) || 1,
      name: way.tags.name,
      bridge,
      layer: Number.isFinite(layer) ? layer : bridge ? 1 : 0,
      path: isPath(cls),
      nodeIds: way.nodeIds,
      points: way.points.map((point) => lonLatToWorld(point.lon, point.lat)),
    });
  }

  return roads;
}

/** Cut every Road where another Road shares a node, so junctions become graph nodes. */
export function splitAtJunctions(ways: readonly RoadWay[]): RoadEdge[] {
  const uses = new Map<number, number>();
  for (const way of ways) {
    if (way.path) continue;
    for (const nodeId of new Set(way.nodeIds)) uses.set(nodeId, (uses.get(nodeId) ?? 0) + 1);
  }

  const edges: RoadEdge[] = [];
  for (const way of ways) {
    if (way.path) continue;

    let start = 0;
    for (let index = 1; index < way.points.length; index++) {
      const isEnd = index === way.points.length - 1;
      const isJunction = (uses.get(way.nodeIds[index]!) ?? 0) > 1;
      if (!isEnd && !isJunction) continue;

      edges.push({
        wayId: way.wayId,
        fromId: way.nodeIds[start]!,
        toId: way.nodeIds[index]!,
        points: way.points.slice(start, index + 1),
      });
      start = index;
    }
  }

  return edges;
}

/** Where a segment crosses the chunk grid, as fractions along it, in order. */
function borderCrossings(a: WorldPoint, b: WorldPoint): number[] {
  const crossings: number[] = [];

  for (const axis of ['x', 'z'] as const) {
    const from = a[axis];
    const to = b[axis];
    if (from === to) continue;

    const step = to > from ? 1 : -1;
    const firstLine = step > 0 ? Math.floor(from / CHUNK_SIZE) + 1 : Math.ceil(from / CHUNK_SIZE) - 1;
    for (let line = firstLine; step > 0 ? line * CHUNK_SIZE < to : line * CHUNK_SIZE > to; line += step) {
      const t = (line * CHUNK_SIZE - from) / (to - from);
      if (t > BORDER_EPSILON && t < 1 - BORDER_EPSILON) crossings.push(t);
    }
  }

  return crossings.sort((first, second) => first - second);
}

/**
 * Cut an edge wherever it crosses a chunk border, so that each piece lies in one chunk and
 * the two pieces either side of a border share a node.
 *
 * Border node ids are numbered from the way, and a way is usually cut into several edges
 * first, so the caller passes the number of crossings the way's earlier edges already used.
 * Without that, two unrelated border nodes on one way would be given the same id and the
 * graph would treat two different places as one junction.
 */
export function splitAtChunkBorders(edge: RoadEdge, crossingsSoFar = 0): ChunkPiece[] {
  const pieces: ChunkPiece[] = [];
  let current: WorldPoint[] = [edge.points[0]!];
  let fromId = edge.fromId;
  let crossingCount = crossingsSoFar;

  const closePiece = (toId: number) => {
    const first = current[0]!;
    const second = current[1]!;
    pieces.push({
      wayId: edge.wayId,
      fromId,
      toId,
      points: current,
      // The midpoint of the first segment is inside the piece's chunk even when the piece
      // starts exactly on a border.
      chunk: worldToChunk((first.x + second.x) / 2, (first.z + second.z) / 2),
    });
    fromId = toId;
  };

  for (let index = 1; index < edge.points.length; index++) {
    const a = edge.points[index - 1]!;
    const b = edge.points[index]!;

    for (const t of borderCrossings(a, b)) {
      const crossing = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      current.push(crossing);
      const borderId = -(edge.wayId * CROSSINGS_PER_WAY + crossingCount++);
      closePiece(borderId);
      current = [crossing];
    }

    current.push(b);
  }

  closePiece(edge.toId);
  return pieces;
}

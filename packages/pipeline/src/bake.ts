// Baking a chunk: every Road and Path piece inside it becomes one merged flat-shaded mesh
// plus its marking instances, and every Road piece also becomes an edge of the chunk's road
// graph. All geometry is stored relative to the chunk centre.

import {
  appendCaps,
  appendRibbon,
  buildMarkings,
  chunkCentre,
  chunkKey,
  createMeshBuilder,
  encodeGraphBlob,
  encodeRoadBlob,
  finishMesh,
  markingStyleFor,
  roadHeight,
  type ChunkId,
  type GraphEdge,
  type GraphNode,
  type MarkingInstance,
  type WorldPoint,
} from '@bali-moto/shared';
import { splitAtChunkBorders, splitAtJunctions, type ChunkPiece, type RoadWay } from './graph.ts';

/** A node needs this many edge ends before it counts as a junction that stops dashes. */
const JUNCTION_DEGREE = 3;

export interface ChunkBuild {
  chunk: ChunkId;
  roads: ArrayBuffer;
  graph: ArrayBuffer;
}

/** A piece of one way lying in a single chunk, with the way's attributes attached. */
interface Placed {
  piece: ChunkPiece;
  way: RoadWay;
}

function localPoint(point: WorldPoint, centre: WorldPoint): WorldPoint {
  return { x: point.x - centre.x, z: point.z - centre.z };
}

function toLocal(points: readonly WorldPoint[], centre: WorldPoint): WorldPoint[] {
  return points.map((point) => localPoint(point, centre));
}

/** Cut every way into pieces that each lie in one chunk, and group them by chunk. */
function placePieces(ways: readonly RoadWay[]): Map<string, { chunk: ChunkId; placed: Placed[] }> {
  const byWay = new Map(ways.map((way) => [way.wayId, way]));
  const edges = splitAtJunctions(ways);

  // Paths never join the graph, so they are cut at chunk borders only, as one piece each.
  const pathEdges = ways
    .filter((way) => way.path)
    .map((way) => ({
      wayId: way.wayId,
      fromId: way.nodeIds[0]!,
      toId: way.nodeIds.at(-1)!,
      points: way.points,
    }));

  // Crossings are numbered per way, across all the edges the way was cut into, so that two
  // border nodes of one way can never be handed the same id.
  const crossingsPerWay = new Map<number, number>();

  const chunks = new Map<string, { chunk: ChunkId; placed: Placed[] }>();
  for (const edge of [...edges, ...pathEdges]) {
    const way = byWay.get(edge.wayId)!;
    const used = crossingsPerWay.get(edge.wayId) ?? 0;
    const pieces = splitAtChunkBorders(edge, used);
    crossingsPerWay.set(edge.wayId, used + pieces.length - 1);

    for (const piece of pieces) {
      const key = chunkKey(piece.chunk);
      const entry = chunks.get(key) ?? { chunk: piece.chunk, placed: [] };
      entry.placed.push({ piece, way });
      chunks.set(key, entry);
    }
  }

  return chunks;
}

/** Positions of the nodes where enough Roads meet that a centre dash would confuse them. */
function junctionPoints(placed: readonly Placed[], centre: WorldPoint): WorldPoint[] {
  const degree = new Map<number, number>();
  const position = new Map<number, WorldPoint>();

  for (const { piece, way } of placed) {
    if (way.path) continue;
    degree.set(piece.fromId, (degree.get(piece.fromId) ?? 0) + 1);
    degree.set(piece.toId, (degree.get(piece.toId) ?? 0) + 1);
    position.set(piece.fromId, piece.points[0]!);
    position.set(piece.toId, piece.points.at(-1)!);
  }

  return [...degree]
    .filter(([, count]) => count >= JUNCTION_DEGREE)
    .map(([id]) => localPoint(position.get(id)!, centre));
}

/** Bake one chunk's road surface, markings and graph. */
function bakeChunk(chunk: ChunkId, placed: readonly Placed[]): ChunkBuild {
  const centre = chunkCentre(chunk);
  const builder = createMeshBuilder();
  const markings: MarkingInstance[] = [];
  const junctions = junctionPoints(placed, centre);

  const nodes: GraphNode[] = [];
  const nodeIndex = new Map<number, number>();
  const edges: GraphEdge[] = [];

  const indexOfNode = (id: number, point: WorldPoint) => {
    const existing = nodeIndex.get(id);
    if (existing !== undefined) return existing;
    nodeIndex.set(id, nodes.push({ id, x: point.x, z: point.z }) - 1);
    return nodes.length - 1;
  };

  for (const { piece, way } of placed) {
    const points = toLocal(piece.points, centre);
    const height = roadHeight(way.cls);

    appendRibbon(builder, points, way.width, height, way.colour);
    appendCaps(builder, points, way.width, height, way.colour);
    markings.push(...buildMarkings(points, way.width, height, markingStyleFor(way.cls), junctions));

    if (way.path) continue;

    edges.push({
      nodes: [
        indexOfNode(piece.fromId, points[0]!),
        indexOfNode(piece.toId, points.at(-1)!),
      ],
      points,
      cls: way.cls,
      width: way.width,
      surface: way.surface,
      oneway: way.oneway,
      lanes: way.lanes,
      name: way.name,
      bridge: way.bridge,
      layer: way.layer,
    });
  }

  return {
    chunk,
    roads: encodeRoadBlob(chunk, finishMesh(builder), markings),
    graph: encodeGraphBlob(chunk, nodes, edges),
  };
}

/** Bake every chunk the ways reach into, in a stable order. */
export function bakeChunks(ways: readonly RoadWay[]): ChunkBuild[] {
  return [...placePieces(ways)]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, entry]) => bakeChunk(entry.chunk, entry.placed));
}

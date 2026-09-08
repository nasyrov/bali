// Baking a chunk: its terrain becomes one height grid, every Road and Path piece inside it
// becomes one merged flat-shaded mesh plus its marking instances, and every Road piece also
// becomes an edge of the chunk's road graph. All geometry is stored relative to the chunk
// centre.
//
// Road heights are read out of the already-flattened terrain grid, by the same lookup the
// runtime uses, so a Road sits exactly on the ground the bike will ride over. A centreline is
// densified to well under a terrain cell first: OpenStreetMap draws a straight kilometre as
// two nodes, and a ribbon drawn straight between them would cut through the ground where the
// ground curves between them and hang over it where it dips.
//
// Bridges are the exception: they rise off the ground on a ramp at each end and carry a slab
// and railings, and tunnels stay at ground level behind a darkened portal.

import {
  BRIDGE_RAMP_LENGTH,
  appendBridge,
  appendCaps,
  appendRibbon,
  appendTunnelPortal,
  bridgeLift,
  buildMarkings,
  chunkCentre,
  chunkKey,
  createMeshBuilder,
  encodeGraphBlob,
  encodeRoadBlob,
  encodeTerrainBlob,
  finishMesh,
  markingStyleFor,
  roadHeight,
  TERRAIN_SPACING,
  terrainHeightAt,
  type ChunkId,
  type GraphEdge,
  type GraphNode,
  type MarkingInstance,
  type RibbonPoint,
  type WorldPoint,
} from '@bali-moto/shared';
import { splitAtChunkBorders, splitAtJunctions, type ChunkPiece, type RoadWay } from './graph.ts';
import { chunkTerrain, type ChunkTerrain, type TerrainField } from './terrain.ts';

/** A node needs this many edge ends before it counts as a junction that stops dashes. */
const JUNCTION_DEGREE = 3;

/** Colours a bridge's concrete and its railings, and the shadow inside a tunnel mouth. */
const BRIDGE_SLAB_COLOUR = 0x9a8e7c;
const RAILING_COLOUR = 0xe9dcc2;
const PORTAL_COLOUR = 0x2a2724;

/** A piece end this close to a way's own end is that end, and so a tunnel mouth. */
const END_EPSILON = 0.01;

/**
 * The longest a ribbon segment may be, in metres. A quarter of a terrain cell keeps the
 * straight line between two ribbon points well inside the ground's own curvature.
 */
const MAX_RIBBON_SEGMENT = TERRAIN_SPACING / 4;

/** Steps either side of the centreline the ground is read at, to find the way's high side. */
const CROSS_SAMPLES = 2;

export interface ChunkBuild {
  chunk: ChunkId;
  terrain: ArrayBuffer;
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

/** Split every segment of a polyline until none of them is longer than the step. */
function densify(points: readonly WorldPoint[], step: number): WorldPoint[] {
  const dense: WorldPoint[] = [points[0]!];

  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1]!;
    const to = points[index]!;
    const parts = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / step));
    for (let part = 1; part <= parts; part++) {
      dense.push({
        x: from.x + (to.x - from.x) * (part / parts),
        z: from.z + (to.z - from.z) * (part / parts),
      });
    }
  }

  return dense;
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

/**
 * How far a bridge stands above the ground at a point on it: its full layer height in the
 * middle, ramping down to nothing over the last stretch before either end of the way.
 */
function bridgeLiftAt(way: RoadWay, point: WorldPoint): number {
  const start = way.points[0]!;
  const end = way.points.at(-1)!;
  const fromEnd = Math.min(
    Math.hypot(point.x - start.x, point.z - start.z),
    Math.hypot(point.x - end.x, point.z - end.z),
  );
  return bridgeLift(way.layer) * Math.min(1, fromEnd / BRIDGE_RAMP_LENGTH);
}

/**
 * How high a way's surface is over a point of the chunk: the flattened ground, the class's own
 * few millimetres above it, and a bridge's ramp where there is one.
 *
 * The ground is read across the way's whole width and the highest of it wins, because a Road
 * lies flat across itself: taking the centreline alone would bury the uphill kerb in the ground
 * every time a Road crosses a slope side-on.
 */
function surfaceOf(way: RoadWay, terrain: ChunkTerrain, centre: WorldPoint) {
  const lift = roadHeight(way.cls);
  const half = way.width / 2;

  return (x: number, z: number): number => {
    let ground = -Infinity;
    for (let step = -CROSS_SAMPLES; step <= CROSS_SAMPLES; step++) {
      const across = (half * step) / CROSS_SAMPLES;
      ground = Math.max(
        ground,
        terrainHeightAt(terrain.grid.heights, x + across, z),
        terrainHeightAt(terrain.grid.heights, x, z + across),
      );
    }
    return ground + lift + (way.bridge ? bridgeLiftAt(way, { x: x + centre.x, z: z + centre.z }) : 0);
  };
}

/** Lift a piece's plane points onto that surface. */
function onTerrain(
  local: readonly WorldPoint[],
  surfaceAt: (x: number, z: number) => number,
): RibbonPoint[] {
  return local.map((point) => ({ x: point.x, z: point.z, y: surfaceAt(point.x, point.z) }));
}

/** Whether a point is one of the way's own ends, and so a mouth rather than a chunk border. */
function isWayEnd(way: RoadWay, point: WorldPoint): boolean {
  return [way.points[0]!, way.points.at(-1)!].some(
    (end) => Math.hypot(point.x - end.x, point.z - end.z) < END_EPSILON,
  );
}

/** Bake one chunk's terrain, road surface, markings and graph. */
function bakeChunk(chunk: ChunkId, placed: readonly Placed[], field: TerrainField): ChunkBuild {
  const centre = chunkCentre(chunk);
  const terrain = chunkTerrain(field, chunk);
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
    const surfaceAt = surfaceOf(way, terrain, centre);
    const lifted = onTerrain(densify(points, MAX_RIBBON_SEGMENT), surfaceAt);
    const nodes = onTerrain(points, surfaceAt);

    appendRibbon(builder, lifted, way.width, way.colour);
    appendCaps(builder, nodes, way.width, way.colour, way.bridge ? undefined : surfaceAt);
    markings.push(...buildMarkings(lifted, way.width, markingStyleFor(way.cls), junctions));

    if (way.bridge) appendBridge(builder, lifted, way.width, BRIDGE_SLAB_COLOUR, RAILING_COLOUR);
    if (way.tunnel) {
      for (const [end, inward] of [
        [0, 1],
        [nodes.length - 1, nodes.length - 2],
      ] as const) {
        if (nodes.length < 2 || !isWayEnd(way, piece.points[end]!)) continue;
        appendTunnelPortal(builder, nodes[end]!, nodes[inward]!, way.width, PORTAL_COLOUR);
      }
    }

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
      tunnel: way.tunnel,
      layer: way.layer,
    });
  }

  return {
    chunk,
    terrain: encodeTerrainBlob(chunk, terrain.grid, terrain.colours, terrain.indices, terrain.walls),
    roads: encodeRoadBlob(chunk, finishMesh(builder), markings),
    graph: encodeGraphBlob(chunk, nodes, edges),
  };
}

/**
 * Bake every chunk the ways reach into. The order is by grid position rather than by key
 * text, so it does not depend on the machine's collation: the manifest a build writes has to
 * be byte-identical wherever it was built, or publishing by hash churns for no reason.
 */
export function bakeChunks(ways: readonly RoadWay[], field: TerrainField): ChunkBuild[] {
  return [...placePieces(ways).values()]
    .sort((a, b) => a.chunk.i - b.chunk.i || a.chunk.j - b.chunk.j)
    .map((entry) => bakeChunk(entry.chunk, entry.placed, field));
}

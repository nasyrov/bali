// Closing OpenStreetMap's coastline into land polygons.
//
// OpenStreetMap draws the coast as open ways with the land on the left of the way's
// direction; the polygons the terrain clips against are those ways chained together and
// closed around the edge of the area being built. That is all osmdata.openstreetmap.de does
// globally, and it is what the fixture's checked-in land polygon is made with.
//
// World metres, x east and z south, so the geographic left of a direction (dx, dz) is
// (dz, -dx).

import type { WorldPoint } from '@bali-moto/shared';
import { pointInRing, type Bounds, type Polygon } from './geometry.ts';

/** Endpoints closer than this are the same node, and the two ways chain there. */
const JOIN_EPSILON = 1e-6;

/** How far to the land side a probe steps when deciding which way round to close a ring. */
const PROBE = 0.5;

/**
 * A chain shorter than this is a scrap the extract's own cut left behind rather than a coast:
 * it cannot say which side of an area is sea, so it is dropped. Any real coast reaching into
 * a build is kilometres long.
 */
const MIN_COASTLINE_LENGTH = 1000;

function same(a: WorldPoint, b: WorldPoint): boolean {
  return Math.abs(a.x - b.x) < JOIN_EPSILON && Math.abs(a.z - b.z) < JOIN_EPSILON;
}

/** Chain coastline ways end to end, so a coast drawn in pieces becomes one path. */
function chainCoastline(ways: readonly WorldPoint[][]): WorldPoint[][] {
  const remaining = ways.filter((way) => way.length >= 2).map((way) => [...way]);
  const chains: WorldPoint[][] = [];

  while (remaining.length > 0) {
    const chain = remaining.pop()!;
    let joined = true;

    while (joined) {
      joined = false;
      for (let index = 0; index < remaining.length; index++) {
        const other = remaining[index]!;
        if (same(chain.at(-1)!, other[0]!)) chain.push(...other.slice(1));
        else if (same(other.at(-1)!, chain[0]!)) chain.unshift(...other.slice(0, -1));
        else continue;
        remaining.splice(index, 1);
        joined = true;
        break;
      }
    }

    chains.push(chain);
  }

  return chains;
}

/** How long a path is, end to end along itself. */
function lengthOf(path: readonly WorldPoint[]): number {
  let total = 0;
  for (let index = 1; index < path.length; index++) {
    total += Math.hypot(path[index]!.x - path[index - 1]!.x, path[index]!.z - path[index - 1]!.z);
  }
  return total;
}

function inside(point: WorldPoint, rect: Bounds): boolean {
  return point.x >= rect.x0 && point.x <= rect.x1 && point.z >= rect.z0 && point.z <= rect.z1;
}

/** Where a segment leaving the rectangle crosses its edge. */
function crossing(from: WorldPoint, to: WorldPoint, rect: Bounds): WorldPoint {
  let best = 1;
  for (const [value, at, other, low, high] of [
    [rect.x0, 'x', 'z', rect.z0, rect.z1],
    [rect.x1, 'x', 'z', rect.z0, rect.z1],
    [rect.z0, 'z', 'x', rect.x0, rect.x1],
    [rect.z1, 'z', 'x', rect.x0, rect.x1],
  ] as const) {
    const span = to[at] - from[at];
    if (span === 0) continue;
    const t = (value - from[at]) / span;
    if (t <= 0 || t > best) continue;
    const crossed = from[other] + (to[other] - from[other]) * t;
    if (crossed < low || crossed > high) continue;
    best = t;
  }
  return { x: from.x + (to.x - from.x) * best, z: from.z + (to.z - from.z) * best };
}

/** The parts of a path that lie inside the rectangle, cut at the edge where they leave it. */
function clipToRect(path: readonly WorldPoint[], rect: Bounds): WorldPoint[][] {
  const parts: WorldPoint[][] = [];
  let current: WorldPoint[] = [];

  for (const [index, point] of path.entries()) {
    const previous = path[index - 1];
    if (inside(point, rect)) {
      if (previous && !inside(previous, rect)) current.push(crossing(point, previous, rect));
      current.push(point);
    } else if (previous && inside(previous, rect)) {
      current.push(crossing(previous, point, rect));
      parts.push(current);
      current = [];
    }
  }

  if (current.length >= 2) parts.push(current);
  return parts;
}

/** How far round the rectangle's perimeter a point on it lies, from 0 to 4. */
function perimeterAt(point: WorldPoint, rect: Bounds): number {
  const width = rect.x1 - rect.x0;
  const depth = rect.z1 - rect.z0;
  const edges: [number, number][] = [
    [Math.abs(point.z - rect.z0), (point.x - rect.x0) / width],
    [Math.abs(point.x - rect.x1), 1 + (point.z - rect.z0) / depth],
    [Math.abs(point.z - rect.z1), 2 + (rect.x1 - point.x) / width],
    [Math.abs(point.x - rect.x0), 3 + (rect.z1 - point.z) / depth],
  ];
  return edges.reduce((best, edge) => (edge[0] < best[0] ? edge : best))[1] % 4;
}

const CORNERS = (rect: Bounds): WorldPoint[] => [
  { x: rect.x0, z: rect.z0 },
  { x: rect.x1, z: rect.z0 },
  { x: rect.x1, z: rect.z1 },
  { x: rect.x0, z: rect.z1 },
];

/** The corners passed walking the perimeter from one place to another, one way round. */
function cornersBetween(from: number, to: number, forward: boolean, rect: Bounds): WorldPoint[] {
  const corners = CORNERS(rect);
  const total = forward ? (to - from + 4) % 4 : (from - to + 4) % 4;
  const passed: WorldPoint[] = [];

  for (let count = 1; count <= 4; count++) {
    const at = forward ? Math.floor(from) + count : Math.ceil(from) - count;
    if ((forward ? at - from : from - at) > total) break;
    passed.push(corners[((at % 4) + 4) % 4]!);
  }

  return passed;
}

/** Carry a chain's two ends far enough out along their own direction to leave the rectangle. */
function extendBeyond(chain: readonly WorldPoint[], rect: Bounds): WorldPoint[] {
  const reach = Math.hypot(rect.x1 - rect.x0, rect.z1 - rect.z0) * 2;
  const outward = (from: WorldPoint, to: WorldPoint): WorldPoint => {
    const length = Math.hypot(to.x - from.x, to.z - from.z) || 1;
    return { x: to.x + ((to.x - from.x) / length) * reach, z: to.z + ((to.z - from.z) / length) * reach };
  };

  return [
    outward(chain[1]!, chain[0]!),
    ...chain,
    outward(chain.at(-2)!, chain.at(-1)!),
  ];
}

/**
 * Close each coastline into a land polygon. A coast that rings an island is already one; an
 * open coast is closed by walking the rectangle's edge from where it leaves back to where it
 * entered, whichever way round puts the land inside. Open ends are carried straight on out of
 * the rectangle first, so a coastline the extract happens to cut short still closes.
 */
export function landPolygonsFrom(
  coastline: readonly WorldPoint[][],
  rect: Bounds,
): Polygon[] {
  const polygons: Polygon[] = [];

  for (const chain of chainCoastline(coastline)) {
    if (lengthOf(chain) < MIN_COASTLINE_LENGTH) continue;
    if (same(chain[0]!, chain.at(-1)!)) {
      polygons.push([chain]);
      continue;
    }

    for (const part of clipToRect(extendBeyond(chain, rect), rect)) {
      if (part.length < 2) continue;

      const from = perimeterAt(part.at(-1)!, rect);
      const to = perimeterAt(part[0]!, rect);
      const rings = [true, false].map((forward) => [
        ...part,
        ...cornersBetween(from, to, forward, rect),
      ]);

      // The land is on the left of the way's direction: step a little that way from the
      // first segment and keep whichever ring contains the probe.
      const [a, b] = [part[0]!, part[1]!];
      const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const probe = {
        x: (a.x + b.x) / 2 + ((b.z - a.z) / length) * PROBE,
        z: (a.z + b.z) / 2 - ((b.x - a.x) / length) * PROBE,
      };

      const land = rings.find((ring) => pointInRing(ring, probe.x, probe.z));
      if (land) polygons.push([land]);
    }
  }

  return polygons;
}

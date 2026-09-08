// Plane geometry the terrain stages need: what a polygon covers, how far a point is from a
// polyline, and a coarse index so neither question is asked of every shape on the island.
//
// Everything here is in world metres and knows nothing about OpenStreetMap or terrain.

import type { WorldPoint } from '@bali-moto/shared';

/** A polygon as OpenStreetMap gives it: an outer ring first, then any holes. */
export type Polygon = WorldPoint[][];

export interface Bounds {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

const EMPTY_BOUNDS: Bounds = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity };

/** The smallest rectangle holding every point. */
export function boundsOf(points: readonly WorldPoint[]): Bounds {
  return points.reduce<Bounds>(
    (bounds, point) => ({
      x0: Math.min(bounds.x0, point.x),
      z0: Math.min(bounds.z0, point.z),
      x1: Math.max(bounds.x1, point.x),
      z1: Math.max(bounds.z1, point.z),
    }),
    EMPTY_BOUNDS,
  );
}

/** Twice the signed area of a ring, positive when it winds anticlockwise in x/z. */
export function ringArea(ring: readonly WorldPoint[]): number {
  let sum = 0;
  for (let index = 0; index < ring.length; index++) {
    const a = ring[index]!;
    const b = ring[(index + 1) % ring.length]!;
    sum += a.x * b.z - b.x * a.z;
  }
  return sum / 2;
}

/** Whether a point lies inside a ring, by the even-odd crossing rule. */
export function pointInRing(ring: readonly WorldPoint[], x: number, z: number): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const a = ring[index]!;
    const b = ring[previous]!;
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/** Whether a point lies inside a polygon: in the outer ring and in none of the holes. */
export function pointInPolygon(polygon: Polygon, x: number, z: number): boolean {
  const [outer, ...holes] = polygon;
  if (!outer || !pointInRing(outer, x, z)) return false;
  return !holes.some((hole) => pointInRing(hole, x, z));
}

/** How far a point lies from a line segment. */
export function distanceToSegment(
  x: number,
  z: number,
  a: WorldPoint,
  b: WorldPoint,
): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  const along =
    lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared));
  return Math.hypot(x - (a.x + dx * along), z - (a.z + dz * along));
}

/** One straight piece of a polyline, carried with whatever the polyline stands for. */
export interface Segment<T> {
  a: WorldPoint;
  b: WorldPoint;
  of: T;
}

/** Cut a polyline into segments, each tagged with what the line is. */
export function segmentsOf<T>(points: readonly WorldPoint[], of: T): Segment<T>[] {
  const segments: Segment<T>[] = [];
  for (let index = 1; index < points.length; index++) {
    segments.push({ a: points[index - 1]!, b: points[index]!, of });
  }
  return segments;
}

/**
 * A coarse grid over the world that answers "what might be near here". Items go into every
 * cell their bounding rectangle touches, so a lookup returns a superset the caller still has
 * to test exactly — which is the point: the exact test then runs a handful of times instead
 * of once per shape in the build.
 */
export class CellIndex<T> {
  private readonly cells = new Map<string, T[]>();
  private readonly cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private static key(i: number, j: number): string {
    return `${i}:${j}`;
  }

  private cell(value: number): number {
    return Math.floor(value / this.cellSize);
  }

  /** File an item under every cell its rectangle reaches, grown by an optional margin. */
  add(item: T, bounds: Bounds, margin = 0): void {
    for (let i = this.cell(bounds.x0 - margin); i <= this.cell(bounds.x1 + margin); i++) {
      for (let j = this.cell(bounds.z0 - margin); j <= this.cell(bounds.z1 + margin); j++) {
        const key = CellIndex.key(i, j);
        const cell = this.cells.get(key);
        if (cell) cell.push(item);
        else this.cells.set(key, [item]);
      }
    }
  }

  /** Every item filed near a point, in the order they were added. */
  near(x: number, z: number): readonly T[] {
    return this.cells.get(CellIndex.key(this.cell(x), this.cell(z))) ?? [];
  }
}

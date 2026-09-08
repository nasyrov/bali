// Which Road is under the bike.
//
// Every graph edge of every loaded chunk is cut into segments and dropped into a fixed grid
// of 40 m cells, so answering "which Road am I on" is a look at one cell and its neighbours
// rather than a walk over the island. The search widens ring by ring and stops as soon as no
// further ring could hold anything closer, which is also what finds a Road again from the
// middle of a paddy after a reset.

import { chunkCentre, chunkKey, roadSurface } from '@bali-moto/shared';
import type { GraphBlob, RoadClass, WorldPoint } from '@bali-moto/shared';

/** Grid cell edge in metres: a few road widths, so a cell holds a handful of segments. */
const CELL_SIZE = 40;

/** How far a reset will look for a Road before giving up, in metres. */
export const MAX_SEARCH_DISTANCE = 800;

/** One straight piece of a Road, in world metres. */
export interface RoadSegment {
  /** The chunk that brought it, so unloading takes it away again. */
  chunk: string;
  name: string | undefined;
  cls: RoadClass;
  /** The surface it is made of, resolved from the tag or the class. */
  surface: string;
  width: number;
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

export interface NearestRoad {
  road: RoadSegment;
  /** Distance from the query point to the centreline, in metres. */
  distance: number;
  /** The nearest point on the centreline. */
  point: WorldPoint;
  /** The direction the Road runs there, from north, clockwise. */
  heading: number;
  /** Whether the query point is on the Road rather than beside it. */
  onRoad: boolean;
}

/** How far off the tarmac still counts as riding the Road, in metres. */
const SHOULDER = 1.5;

function cellKey(i: number, j: number): string {
  return `${i}:${j}`;
}

/** Where a segment comes closest to a point, and how far that is. */
function closestOn(segment: RoadSegment, point: WorldPoint): { distance: number; at: WorldPoint } {
  const dx = segment.bx - segment.ax;
  const dz = segment.bz - segment.az;
  const lengthSquared = dx * dx + dz * dz;
  const along =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - segment.ax) * dx + (point.z - segment.az) * dz) / lengthSquared));

  const at = { x: segment.ax + dx * along, z: segment.az + dz * along };
  return { distance: Math.hypot(point.x - at.x, point.z - at.z), at };
}

export class RoadIndex {
  private readonly cells = new Map<string, RoadSegment[]>();
  /** The cells each chunk put a segment in, so unloading it does not sweep the whole grid. */
  private readonly chunkCells = new Map<string, Set<string>>();

  get size(): number {
    return this.chunkCells.size;
  }

  /** Take a chunk's road graph into the index, replacing any earlier copy of that chunk. */
  add(blob: GraphBlob): void {
    const key = chunkKey(blob.chunk);
    this.remove(key);

    const centre = chunkCentre(blob.chunk);
    const touched = new Set<string>();
    this.chunkCells.set(key, touched);

    for (const edge of blob.edges) {
      const surface = roadSurface(edge.cls, edge.surface);
      for (let index = 1; index < edge.points.length; index++) {
        const from = edge.points[index - 1]!;
        const to = edge.points[index]!;
        this.insert(
          {
            chunk: key,
            name: edge.name,
            cls: edge.cls,
            surface,
            width: edge.width,
            ax: centre.x + from.x,
            az: centre.z + from.z,
            bx: centre.x + to.x,
            bz: centre.z + to.z,
          },
          touched,
        );
      }
    }
  }

  /** Drop a chunk's Roads, so a query never answers with a chunk that is no longer there. */
  remove(chunk: string): void {
    const touched = this.chunkCells.get(chunk);
    if (!touched) return;

    for (const cell of touched) {
      const kept = this.cells.get(cell)?.filter((segment) => segment.chunk !== chunk) ?? [];
      if (kept.length === 0) this.cells.delete(cell);
      else this.cells.set(cell, kept);
    }
    this.chunkCells.delete(chunk);
  }

  /** The nearest Road to a point, or undefined when there is none within reach. */
  nearest(point: WorldPoint, maxDistance = MAX_SEARCH_DISTANCE): NearestRoad | undefined {
    const centreI = Math.floor(point.x / CELL_SIZE);
    const centreJ = Math.floor(point.z / CELL_SIZE);
    const maxRing = Math.ceil(maxDistance / CELL_SIZE);

    let best: NearestRoad | undefined;

    for (let ring = 0; ring <= maxRing; ring++) {
      // Anything still unseen lies a ring away at least, so a closer hit already wins.
      if (best && best.distance <= (ring - 1) * CELL_SIZE) break;

      for (const cell of ringCells(centreI, centreJ, ring)) {
        for (const segment of this.cells.get(cell) ?? []) {
          const { distance, at } = closestOn(segment, point);
          if (best && distance >= best.distance) continue;
          best = {
            road: segment,
            distance,
            point: at,
            heading: Math.atan2(segment.bx - segment.ax, -(segment.bz - segment.az)),
            onRoad: distance <= segment.width / 2 + SHOULDER,
          };
        }
      }
    }

    return best && best.distance <= maxDistance ? best : undefined;
  }

  private insert(segment: RoadSegment, touched: Set<string>): void {
    const fromI = Math.floor(Math.min(segment.ax, segment.bx) / CELL_SIZE);
    const toI = Math.floor(Math.max(segment.ax, segment.bx) / CELL_SIZE);
    const fromJ = Math.floor(Math.min(segment.az, segment.bz) / CELL_SIZE);
    const toJ = Math.floor(Math.max(segment.az, segment.bz) / CELL_SIZE);

    for (let i = fromI; i <= toI; i++) {
      for (let j = fromJ; j <= toJ; j++) {
        const cell = cellKey(i, j);
        touched.add(cell);
        const held = this.cells.get(cell);
        if (held) held.push(segment);
        else this.cells.set(cell, [segment]);
      }
    }
  }
}

/** The cell keys exactly this many cells out from a centre cell. */
function* ringCells(centreI: number, centreJ: number, ring: number): Generator<string> {
  if (ring === 0) {
    yield cellKey(centreI, centreJ);
    return;
  }

  for (let i = centreI - ring; i <= centreI + ring; i++) {
    yield cellKey(i, centreJ - ring);
    yield cellKey(i, centreJ + ring);
  }
  for (let j = centreJ - ring + 1; j <= centreJ + ring - 1; j++) {
    yield cellKey(centreI - ring, j);
    yield cellKey(centreI + ring, j);
  }
}

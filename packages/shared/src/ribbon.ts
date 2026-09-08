// The road ribbon: how a polyline centreline becomes the flat-shaded surface a rider sees.
//
// Each segment is a quad, each bend is filled by a bevel triangle, and every node carries a
// round cap disc. Junctions need no special geometry because the caps of the roads meeting
// there overlap. Mitre joins are not used: they spike on hairpins.
//
// Builders append into a shared accumulator because a chunk merges every road it holds into
// one mesh, and allocating per road would dominate the pipeline.

import type { WorldPoint } from './projection.ts';
import { roadRank, type RoadClass } from './roads.ts';

/** Vertices of a round cap disc; eight reads as round at the widths Bali's roads have. */
const CAP_SEGMENTS = 8;

/** Length of a centre dash and the gap after it, in metres. */
const DASH_LENGTH = 1.5;
const DASH_SPACING = 4;

/** Markings sit this far above the road surface. */
const MARKING_LIFT = 0.005;

/** An edge line sits this far in from the kerb, as a fraction of the road width. */
const EDGE_LINE_INSET = 0.12;

/** Points closer together than this are the same point as far as the geometry is concerned. */
const MIN_SEGMENT_LENGTH = 0.05;

export interface MeshBuilder {
  positions: number[];
  colours: number[];
  indices: number[];
}

export interface Mesh {
  positions: Float32Array;
  colours: Uint8Array;
  indices: Uint32Array;
}

/** One road marking, rendered as an instance of a unit quad. */
export interface MarkingInstance {
  x: number;
  y: number;
  z: number;
  /** Heading of the mark in the world plane, in radians. */
  angle: number;
  length: number;
  width: number;
}

export interface MarkingStyle {
  centre: 'none' | 'dashed' | 'solid';
  edges: boolean;
}

export function createMeshBuilder(): MeshBuilder {
  return { positions: [], colours: [], indices: [] };
}

export function finishMesh(builder: MeshBuilder): Mesh {
  return {
    positions: Float32Array.from(builder.positions),
    colours: Uint8Array.from(builder.colours),
    indices: Uint32Array.from(builder.indices),
  };
}

function pushVertex(out: MeshBuilder, x: number, y: number, z: number, colour: number): number {
  const index = out.positions.length / 3;
  out.positions.push(x, y, z);
  out.colours.push((colour >> 16) & 0xff, (colour >> 8) & 0xff, colour & 0xff);
  return index;
}

/** Drop points that repeat, so a zero-length segment never produces a zero-length normal. */
function distinct(points: readonly WorldPoint[]): WorldPoint[] {
  const kept: WorldPoint[] = [];
  for (const point of points) {
    const last = kept.at(-1);
    if (last && Math.hypot(point.x - last.x, point.z - last.z) < MIN_SEGMENT_LENGTH) continue;
    kept.push(point);
  }
  return kept;
}

/** Unit normal to the left of the segment from a to b. */
function normalOf(a: WorldPoint, b: WorldPoint): { x: number; z: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  return { x: -dz / length, z: dx / length };
}

/** Append the surface of one road: a quad per segment and a bevel triangle at each bend. */
export function appendRibbon(
  out: MeshBuilder,
  centreline: readonly WorldPoint[],
  width: number,
  height: number,
  colour: number,
): void {
  const points = distinct(centreline);
  if (points.length < 2) return;

  const half = width / 2;
  let previousLeft = -1;
  let previousRight = -1;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const normal = normalOf(a, b);

    const startLeft = pushVertex(out, a.x + normal.x * half, height, a.z + normal.z * half, colour);
    const startRight = pushVertex(out, a.x - normal.x * half, height, a.z - normal.z * half, colour);
    const endLeft = pushVertex(out, b.x + normal.x * half, height, b.z + normal.z * half, colour);
    const endRight = pushVertex(out, b.x - normal.x * half, height, b.z - normal.z * half, colour);
    out.indices.push(startLeft, endLeft, startRight, startRight, endLeft, endRight);

    // Bevel the bend: a triangle from the node to the two edges that part company there.
    // Both sides are filled; the one on the inside of the turn falls within the quads.
    if (previousLeft >= 0) {
      const node = pushVertex(out, a.x, height, a.z, colour);
      out.indices.push(node, previousLeft, startLeft, node, startRight, previousRight);
    }

    previousLeft = endLeft;
    previousRight = endRight;
  }
}

/** Append a round cap disc at every node of a road. */
export function appendCaps(
  out: MeshBuilder,
  centreline: readonly WorldPoint[],
  width: number,
  height: number,
  colour: number,
): void {
  const points = distinct(centreline);
  const radius = width / 2;

  for (const point of points) {
    const centre = pushVertex(out, point.x, height, point.z, colour);
    let previous = -1;
    let first = -1;

    for (let step = 0; step < CAP_SEGMENTS; step++) {
      const angle = (step / CAP_SEGMENTS) * Math.PI * 2;
      const rim = pushVertex(
        out,
        point.x + Math.cos(angle) * radius,
        height,
        point.z + Math.sin(angle) * radius,
        colour,
      );
      if (previous >= 0) out.indices.push(centre, previous, rim);
      else first = rim;
      previous = rim;
    }
    out.indices.push(centre, previous, first);
  }
}

/** Which markings a class carries: solid on motorway, dashed down to tertiary, none below. */
export function markingStyleFor(cls: RoadClass): MarkingStyle {
  const rank = roadRank(cls);
  if (rank > roadRank('tertiary')) return { centre: 'none', edges: false };
  return {
    centre: rank === roadRank('motorway') ? 'solid' : 'dashed',
    edges: rank <= roadRank('trunk'),
  };
}

/** Whether a point on the road is close enough to a junction that a dash would confuse it. */
function nearJunction(
  x: number,
  z: number,
  junctions: readonly WorldPoint[],
  clearance: number,
): boolean {
  return junctions.some((node) => Math.hypot(x - node.x, z - node.z) < clearance);
}

/**
 * The centre and edge marks of one road. Dashes stop within one road width of a junction,
 * so a road passing through one never looks like it crosses uninterrupted.
 */
export function buildMarkings(
  centreline: readonly WorldPoint[],
  width: number,
  height: number,
  style: MarkingStyle,
  junctions: readonly WorldPoint[],
): MarkingInstance[] {
  const points = distinct(centreline);
  if (points.length < 2) return [];

  const marks: MarkingInstance[] = [];
  const y = height + MARKING_LIFT;
  const lineWidth = Math.min(0.12, width * 0.05);

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const angle = Math.atan2(b.x - a.x, b.z - a.z);
    const normal = normalOf(a, b);

    if (style.centre === 'solid') {
      marks.push({ x: (a.x + b.x) / 2, y, z: (a.z + b.z) / 2, angle, length, width: lineWidth });
    }

    if (style.centre === 'dashed') {
      for (let along = DASH_LENGTH; along < length - DASH_LENGTH; along += DASH_SPACING) {
        const t = along / length;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        if (nearJunction(x, z, junctions, width + DASH_LENGTH / 2)) continue;
        marks.push({ x, y, z, angle, length: DASH_LENGTH, width: lineWidth });
      }
    }

    if (style.edges) {
      const offset = width / 2 - width * EDGE_LINE_INSET;
      for (const side of [1, -1]) {
        marks.push({
          x: (a.x + b.x) / 2 + normal.x * offset * side,
          y,
          z: (a.z + b.z) / 2 + normal.z * offset * side,
          angle,
          length,
          width: lineWidth,
        });
      }
    }
  }

  return marks;
}

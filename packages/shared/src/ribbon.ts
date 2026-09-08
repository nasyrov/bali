// The road ribbon: how a polyline centreline becomes the flat-shaded surface a rider sees.
//
// Each segment is a quad, each bend is filled by a bevel triangle, and every node carries a
// round cap disc. Junctions need no special geometry because the caps of the roads meeting
// there overlap. Mitre joins are not used: they spike on hairpins.
//
// A centreline carries a height at every point, because the ground under a Road is never
// level: the pipeline flattens the terrain under the Road and then hands the ribbon the
// heights it sampled back off that flattened ground, so the surface follows it exactly.
//
// Builders append into a shared accumulator because a chunk merges every road it holds into
// one mesh, and allocating per road would dominate the pipeline.

import type { WorldPoint } from './projection.ts';
import { roadRank, type RoadClass } from './roads.ts';

/** A point on a road centreline: where it lies on the plane and how high the surface is. */
export interface RibbonPoint extends WorldPoint {
  y: number;
}

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
function distinct(points: readonly RibbonPoint[]): RibbonPoint[] {
  const kept: RibbonPoint[] = [];
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
  centreline: readonly RibbonPoint[],
  width: number,
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

    const startLeft = pushVertex(out, a.x + normal.x * half, a.y, a.z + normal.z * half, colour);
    const startRight = pushVertex(out, a.x - normal.x * half, a.y, a.z - normal.z * half, colour);
    const endLeft = pushVertex(out, b.x + normal.x * half, b.y, b.z + normal.z * half, colour);
    const endRight = pushVertex(out, b.x - normal.x * half, b.y, b.z - normal.z * half, colour);
    out.indices.push(startLeft, endLeft, startRight, startRight, endLeft, endRight);

    // Bevel the bend: a triangle from the node to the two edges that part company there.
    // Both sides are filled; the one on the inside of the turn falls within the quads.
    if (previousLeft >= 0) {
      const node = pushVertex(out, a.x, a.y, a.z, colour);
      out.indices.push(node, previousLeft, startLeft, node, startRight, previousRight);
    }

    previousLeft = endLeft;
    previousRight = endRight;
  }
}

/**
 * Append a round cap disc at every node of a road. A disc is as wide as the road, so on a
 * slope a flat one would cut into the ground at one side and hang off it at the other; where
 * the caller can say how high the surface is at a point, the rim follows it.
 */
export function appendCaps(
  out: MeshBuilder,
  centreline: readonly RibbonPoint[],
  width: number,
  colour: number,
  surfaceAt?: (x: number, z: number) => number,
): void {
  const points = distinct(centreline);
  const radius = width / 2;

  for (const point of points) {
    const centre = pushVertex(out, point.x, point.y, point.z, colour);
    let previous = -1;
    let first = -1;

    for (let step = 0; step < CAP_SEGMENTS; step++) {
      const angle = (step / CAP_SEGMENTS) * Math.PI * 2;
      const x = point.x + Math.cos(angle) * radius;
      const z = point.z + Math.sin(angle) * radius;
      const rim = pushVertex(out, x, surfaceAt?.(x, z) ?? point.y, z, colour);
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
  centreline: readonly RibbonPoint[],
  width: number,
  style: MarkingStyle,
  junctions: readonly WorldPoint[],
): MarkingInstance[] {
  const points = distinct(centreline);
  if (points.length < 2) return [];

  const marks: MarkingInstance[] = [];
  const lineWidth = Math.min(0.12, width * 0.05);

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const angle = Math.atan2(b.x - a.x, b.z - a.z);
    const normal = normalOf(a, b);

    if (style.centre === 'solid') {
      marks.push({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2 + MARKING_LIFT,
        z: (a.z + b.z) / 2,
        angle,
        length,
        width: lineWidth,
      });
    }

    if (style.centre === 'dashed') {
      for (let along = DASH_LENGTH; along < length - DASH_LENGTH; along += DASH_SPACING) {
        const t = along / length;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        if (nearJunction(x, z, junctions, width + DASH_LENGTH / 2)) continue;
        marks.push({
          x,
          y: a.y + (b.y - a.y) * t + MARKING_LIFT,
          z,
          angle,
          length: DASH_LENGTH,
          width: lineWidth,
        });
      }
    }

    if (style.edges) {
      const offset = width / 2 - width * EDGE_LINE_INSET;
      for (const side of [1, -1]) {
        marks.push({
          x: (a.x + b.x) / 2 + normal.x * offset * side,
          y: (a.y + b.y) / 2 + MARKING_LIFT,
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

/** How deep a bridge slab hangs below the deck, and how far it overhangs the ribbon. */
const BRIDGE_SLAB_DEPTH = 0.8;
const BRIDGE_SLAB_OVERHANG = 0.3;

/** Railings stand this high above the deck, just inside the kerb. */
const RAILING_HEIGHT = 0.9;
const RAILING_LIFT = 0.05;

/** A tunnel portal's clear height under the lintel, its full height and the jamb's width. */
const PORTAL_CLEARANCE = 3.5;
const PORTAL_HEIGHT = 4.5;
const PORTAL_JAMB = 0.6;

/** One point of a vertical face: where it stands and how far up it reaches. */
export interface WallPoint extends WorldPoint {
  base: number;
  top: number;
}

/** Append a vertical face standing along a polyline, visible from either side. */
export function appendWall(
  out: MeshBuilder,
  profile: readonly WallPoint[],
  colour: number,
): void {
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i]!;
    const b = profile[i + 1]!;
    const foot = pushVertex(out, a.x, a.base, a.z, colour);
    const head = pushVertex(out, a.x, a.top, a.z, colour);
    const nextFoot = pushVertex(out, b.x, b.base, b.z, colour);
    const nextHead = pushVertex(out, b.x, b.top, b.z, colour);
    out.indices.push(
      foot, head, nextFoot, nextFoot, head, nextHead,
      nextFoot, head, foot, nextHead, head, nextFoot,
    );
  }
}

/** The polyline offset sideways, carried up from one lift above the deck to another. */
function offsetProfile(
  points: readonly RibbonPoint[],
  offset: number,
  base: number,
  top: number,
): WallPoint[] {
  return points.map((point, index) => {
    const [a, b] = index === 0 ? [points[0]!, points[1]!] : [points[index - 1]!, point];
    const normal = normalOf(a, b);
    return {
      x: point.x + normal.x * offset,
      z: point.z + normal.z * offset,
      base: point.y + base,
      top: point.y + top,
    };
  });
}

/**
 * Append what carries a bridge deck: the slab hanging under the ribbon and a railing along
 * each side. The deck itself is the road ribbon, already raised by the pipeline.
 */
export function appendBridge(
  out: MeshBuilder,
  centreline: readonly RibbonPoint[],
  width: number,
  slabColour: number,
  railingColour: number,
): void {
  const points = distinct(centreline);
  if (points.length < 2) return;
  const half = width / 2;
  const slabHalf = half + BRIDGE_SLAB_OVERHANG;

  // The underside of the slab, wound the other way round so it is seen from below.
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const normal = normalOf(a, b);
    const under = (point: RibbonPoint, side: number) =>
      pushVertex(
        out,
        point.x + normal.x * slabHalf * side,
        point.y - BRIDGE_SLAB_DEPTH,
        point.z + normal.z * slabHalf * side,
        slabColour,
      );
    const [startLeft, startRight, endLeft, endRight] = [under(a, 1), under(a, -1), under(b, 1), under(b, -1)];
    out.indices.push(startLeft, startRight, endLeft, endLeft, startRight, endRight);
  }

  for (const side of [1, -1]) {
    appendWall(out, offsetProfile(points, slabHalf * side, -BRIDGE_SLAB_DEPTH, 0), slabColour);
    appendWall(out, offsetProfile(points, half * side, RAILING_LIFT, RAILING_HEIGHT), railingColour);
  }
}

/**
 * Append the darkened frame at one mouth of a tunnel: a lintel across the road and a jamb
 * either side of it. The road itself stays at terrain level and simply runs under the hill.
 * `inward` is any point further along the tunnel, and only says which way the mouth faces.
 */
export function appendTunnelPortal(
  out: MeshBuilder,
  mouth: RibbonPoint,
  inward: WorldPoint,
  width: number,
  colour: number,
): void {
  const half = width / 2;
  const normal = normalOf(inward, mouth);
  const across = (offset: number, base: number, top: number): WallPoint => ({
    x: mouth.x + normal.x * offset,
    z: mouth.z + normal.z * offset,
    base: mouth.y + base,
    top: mouth.y + top,
  });

  appendWall(out, [across(-half, PORTAL_CLEARANCE, PORTAL_HEIGHT), across(half, PORTAL_CLEARANCE, PORTAL_HEIGHT)], colour);
  for (const side of [1, -1]) {
    appendWall(out, [across(half * side, 0, PORTAL_HEIGHT), across((half + PORTAL_JAMB) * side, 0, PORTAL_HEIGHT)], colour);
  }
}

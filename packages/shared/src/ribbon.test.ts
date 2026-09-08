import { describe, expect, it } from 'vitest';
import {
  appendCaps,
  appendRibbon,
  buildMarkings,
  createMeshBuilder,
  finishMesh,
  markingStyleFor,
} from './ribbon.ts';
import type { MeshBuilder } from './ribbon.ts';

const HEIGHT = 0.05;

/** Whether the built surface covers a point on the ground, by testing every triangle. */
function covers(builder: MeshBuilder, x: number, z: number): boolean {
  const { positions, indices } = finishMesh(builder);
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i]! * 3, indices[i + 1]! * 3, indices[i + 2]! * 3];
    const [ax, az] = [positions[a]!, positions[a + 2]!];
    const [bx, bz] = [positions[b]!, positions[b + 2]!];
    const [cx, cz] = [positions[c]!, positions[c + 2]!];
    const d1 = (x - bx) * (az - bz) - (ax - bx) * (z - bz);
    const d2 = (x - cx) * (bz - cz) - (bx - cx) * (z - cz);
    const d3 = (x - ax) * (cz - az) - (cx - ax) * (z - az);
    const negative = d1 < 0 || d2 < 0 || d3 < 0;
    const positive = d1 > 0 || d2 > 0 || d3 > 0;
    if (!(negative && positive)) return true;
  }
  return false;
}

function ribbonOf(points: [number, number][], width: number): MeshBuilder {
  const builder = createMeshBuilder();
  appendRibbon(builder, points.map(([x, z]) => ({ x, z })), width, HEIGHT, 0x5a5651);
  return builder;
}

describe('a road ribbon', () => {
  const straight: [number, number][] = [
    [0, 0],
    [100, 0],
  ];

  it('covers the road from edge to edge and no further', () => {
    const ribbon = ribbonOf(straight, 10);
    expect(covers(ribbon, 50, 0)).toBe(true);
    expect(covers(ribbon, 50, 4.9)).toBe(true);
    expect(covers(ribbon, 50, -4.9)).toBe(true);
    expect(covers(ribbon, 50, 6)).toBe(false);
    expect(covers(ribbon, 50, -6)).toBe(false);
  });

  it('lies flat at the height it was given', () => {
    const { positions } = finishMesh(ribbonOf(straight, 10));
    for (let i = 1; i < positions.length; i += 3) {
      expect(positions[i]).toBeCloseTo(HEIGHT, 6);
    }
  });

  it('carries the road colour on every vertex', () => {
    const builder = createMeshBuilder();
    appendRibbon(builder, [{ x: 0, z: 0 }, { x: 10, z: 0 }], 4, HEIGHT, 0x8a8478);
    const { colours, positions } = finishMesh(builder);
    expect(colours.length).toBe(positions.length);
    expect([colours[0], colours[1], colours[2]]).toEqual([0x8a, 0x84, 0x78]);
  });

  // Mitre joins spike on hairpins, so bends are bevelled: the outer corner is filled by a
  // triangle rather than by extending both edges until they meet.
  it('fills the outer corner of a bend without spiking past it', () => {
    const bend = ribbonOf(
      [
        [0, 0],
        [50, 0],
        [50, 50],
      ],
      10,
    );
    expect(covers(bend, 52, -1)).toBe(true);
    expect(covers(bend, 54, -4)).toBe(false);
    expect(covers(bend, 80, -30)).toBe(false);
  });

  it('ignores a repeated point rather than producing a hole', () => {
    const repeated = ribbonOf(
      [
        [0, 0],
        [50, 0],
        [50, 0],
        [100, 0],
      ],
      10,
    );
    const { positions } = finishMesh(repeated);
    expect(positions.every(Number.isFinite)).toBe(true);
    expect(covers(repeated, 75, 0)).toBe(true);
  });

  it('builds nothing from a polyline with no length', () => {
    expect(finishMesh(ribbonOf([[5, 5]], 10)).indices.length).toBe(0);
    expect(finishMesh(ribbonOf([[5, 5], [5, 5]], 10)).indices.length).toBe(0);
  });
});

describe('round caps', () => {
  it('round the road off half a width beyond its end node', () => {
    const builder = createMeshBuilder();
    const points = [{ x: 0, z: 0 }, { x: 100, z: 0 }];
    appendCaps(builder, points, 10, HEIGHT, 0x5a5651);

    expect(covers(builder, 103, 0)).toBe(true);
    expect(covers(builder, 100, 4)).toBe(true);
    expect(covers(builder, 106, 0)).toBe(false);
  });

  it('caps every node, so overlapping discs close the gaps where roads meet', () => {
    const builder = createMeshBuilder();
    appendCaps(builder, [{ x: 0, z: 0 }, { x: 50, z: 0 }, { x: 50, z: 50 }], 10, HEIGHT, 0x5a5651);
    expect(covers(builder, 52, -2)).toBe(true);
  });
});

describe('markingStyleFor', () => {
  it('gives motorways a solid centre line and edge lines', () => {
    expect(markingStyleFor('motorway')).toEqual({ centre: 'solid', edges: true });
  });

  it('dashes the centre from trunk down to tertiary, with edge lines only on trunk', () => {
    expect(markingStyleFor('trunk')).toEqual({ centre: 'dashed', edges: true });
    expect(markingStyleFor('primary')).toEqual({ centre: 'dashed', edges: false });
    expect(markingStyleFor('tertiary')).toEqual({ centre: 'dashed', edges: false });
  });

  it('leaves everything below tertiary unmarked', () => {
    expect(markingStyleFor('unclassified')).toEqual({ centre: 'none', edges: false });
    expect(markingStyleFor('residential')).toEqual({ centre: 'none', edges: false });
    expect(markingStyleFor('living_street')).toEqual({ centre: 'none', edges: false });
  });
});

describe('buildMarkings', () => {
  const long: { x: number; z: number }[] = [
    { x: 0, z: 0 },
    { x: 200, z: 0 },
  ];

  it('lays dashes along the centre of the road, above its surface', () => {
    const dashes = buildMarkings(long, 6, HEIGHT, { centre: 'dashed', edges: false }, []);
    expect(dashes.length).toBeGreaterThan(10);
    for (const dash of dashes) {
      expect(dash.z).toBeCloseTo(0, 6);
      expect(dash.y).toBeGreaterThan(HEIGHT);
      expect(dash.x).toBeGreaterThanOrEqual(0);
      expect(dash.x).toBeLessThanOrEqual(200);
    }
  });

  it('runs a solid centre line as one mark per segment', () => {
    const [line, ...rest] = buildMarkings(long, 6, HEIGHT, { centre: 'solid', edges: false }, []);
    expect(rest).toEqual([]);
    expect(line!.length).toBeCloseTo(200, 6);
  });

  // Dashes through a junction read as a road crossing another, so they stop short of one.
  it('stops the dashes within one road width of a junction', () => {
    const junction = { x: 100, z: 0 };
    const dashes = buildMarkings(long, 6, HEIGHT, { centre: 'dashed', edges: false }, [junction]);

    for (const dash of dashes) {
      expect(Math.abs(dash.x - junction.x)).toBeGreaterThan(6 - dash.length / 2);
    }
    expect(dashes.some((dash) => dash.x < 90)).toBe(true);
    expect(dashes.some((dash) => dash.x > 110)).toBe(true);
  });

  it('lays edge lines just inside both kerbs when the class has them', () => {
    const marks = buildMarkings(long, 6, HEIGHT, { centre: 'none', edges: true }, []);
    const offsets = marks.map((mark) => mark.z).sort((a, b) => a - b);

    expect(marks).toHaveLength(2);
    expect(offsets[0]).toBeCloseTo(-offsets[1]!, 6);
    expect(Math.abs(offsets[0]!)).toBeLessThan(3);
    expect(Math.abs(offsets[0]!)).toBeGreaterThan(2);
  });

  it('marks nothing on an unmarked class', () => {
    expect(buildMarkings(long, 6, HEIGHT, { centre: 'none', edges: false }, [])).toEqual([]);
  });
});

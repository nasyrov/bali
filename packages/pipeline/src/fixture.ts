// Rebuilds the checked-in Canggu fixture: the Canggu road sample clipped to a small block
// of whole chunks, small enough for the world data contract test to run the whole pipeline
// on it in seconds. Run with `npm run fixture` after the sample is re-exported.
//
// The block is chosen for what it contains: Jalan Raya Canggu with its width tag, a way
// crossing the x9/x10 chunk border, and a spread of gangs, service roads and paths.

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CHUNK_SIZE, worldToLonLat } from '@bali-moto/shared';
import { FIXTURE_BLOCK, FIXTURE_OSM, dataDir } from './paths.ts';

/** Samples per chunk edge; chunk edges are straight in UTM but curve slightly in lon/lat. */
const SAMPLES_PER_EDGE = 8;

/** The block boundary as a lon/lat ring, densified so the curve is followed closely. */
export function blockBoundary(block: typeof FIXTURE_BLOCK): [number, number][] {
  const west = block.i0 * CHUNK_SIZE;
  const east = (block.i1 + 1) * CHUNK_SIZE;
  const north = block.j0 * CHUNK_SIZE;
  const south = (block.j1 + 1) * CHUNK_SIZE;

  const corners: [number, number][] = [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ];

  const ring: [number, number][] = [];
  for (const [index, corner] of corners.entries()) {
    const next = corners[(index + 1) % corners.length]!;
    for (let step = 0; step < SAMPLES_PER_EDGE; step++) {
      const t = step / SAMPLES_PER_EDGE;
      const { lon, lat } = worldToLonLat(
        corner[0] + (next[0] - corner[0]) * t,
        corner[1] + (next[1] - corner[1]) * t,
      );
      ring.push([lon, lat]);
    }
  }
  ring.push(ring[0]!);
  return ring;
}

const sample = resolve(dataDir, 'processed/canggu-roads.osm.pbf');
const polygon = resolve(dataDir, 'fixtures/canggu-block.geojson');

mkdirSync(dirname(FIXTURE_OSM), { recursive: true });
writeFileSync(
  polygon,
  `${JSON.stringify(
    {
      type: 'Feature',
      properties: { name: `Canggu chunks x${FIXTURE_BLOCK.i0}-${FIXTURE_BLOCK.i1} z${FIXTURE_BLOCK.j0}-${FIXTURE_BLOCK.j1}` },
      geometry: { type: 'Polygon', coordinates: [blockBoundary(FIXTURE_BLOCK)] },
    },
    null,
    2,
  )}\n`,
);

// complete_ways keeps every node of a way that reaches into the block, so no way in the
// fixture has a dangling node reference; the pipeline splits them at the chunk borders.
rmSync(FIXTURE_OSM, { force: true });
execFileSync(
  'osmium',
  ['extract', '--polygon', polygon, '--strategy', 'complete_ways', sample, '--output', FIXTURE_OSM],
  { stdio: 'inherit' },
);

console.log(`Fixture written to ${FIXTURE_OSM}`);

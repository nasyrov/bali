// Rebuilds the checked-in Canggu fixture: the Canggu sample clipped to a small block of whole
// chunks, the elevation cells under it already reprojected, and the land polygons the coast
// there closes into. Together they are small enough for the world data contract test to run
// the whole pipeline in seconds, with neither GDAL nor the network in the way.
//
// Run with `npm run fixture` after the sample is re-exported. It needs osmium, GDAL and one
// download of the Copernicus tile the block sits on.
//
// The block is chosen for what it contains: Jalan Raya Canggu with its width tag, a way
// crossing the x9/x10 chunk border, and a spread of gangs, service roads and paths.

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CHUNK_SIZE, lonLatToWorld, worldToLonLat, type WorldPoint } from '@bali-moto/shared';
import { landPolygonsFrom } from './coastline.ts';
import {
  chunkAlignedBounds,
  ensureDemTiles,
  reprojectDem,
  tilesCovering,
  writeDemGrid,
} from './elevation.ts';
import { boundsOf } from './geometry.ts';
import { clipAndFilter, readGroundFeatures } from './osm.ts';
import {
  CANGGU_LAND,
  CANGGU_SAMPLE,
  FIXTURE_BLOCK,
  FIXTURE_DEM,
  FIXTURE_OSM,
  dataDir,
  rawDir,
  repoRoot,
} from './paths.ts';

/** Samples per chunk edge; chunk edges are straight in UTM but curve slightly in lon/lat. */
const SAMPLES_PER_EDGE = 8;

/** How far beyond the sample the land polygons and the elevation raster reach, in metres. */
const FIXTURE_MARGIN = 2 * CHUNK_SIZE;

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

const workDir = resolve(repoRoot, '.fixture-build');
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
  ['extract', '--polygon', polygon, '--strategy', 'complete_ways', CANGGU_SAMPLE, '--output', FIXTURE_OSM],
  { stdio: 'inherit' },
);

// The land polygons are the sample's own coastline, closed around a rectangle comfortably
// wider than anything either build covers, so no chunk of either falls outside it.
rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });
const layers = clipAndFilter({ pbf: CANGGU_SAMPLE }, workDir);
const ground = await readGroundFeatures(layers.ground);
const coastline = ground
  .filter((feature) => feature.tags.natural === 'coastline')
  .flatMap((feature) => feature.lines.map((line) => line.map((point) => lonLatToWorld(point.lon, point.lat))));

const groundPoints = ground.flatMap((feature) => [
  ...feature.lines.flat(),
  ...feature.polygons.flat().flat(),
]);
const sampleBounds = boundsOf(groundPoints.map((point) => lonLatToWorld(point.lon, point.lat)));
const landRect = {
  x0: sampleBounds.x0 - FIXTURE_MARGIN,
  z0: sampleBounds.z0 - FIXTURE_MARGIN,
  x1: sampleBounds.x1 + FIXTURE_MARGIN,
  z1: sampleBounds.z1 + FIXTURE_MARGIN,
};

/** A ring back in lon/lat, closed the way GeoJSON wants it. */
function asLonLat(ring: readonly WorldPoint[]): [number, number][] {
  const closed = ring.map((point) => {
    const { lon, lat } = worldToLonLat(point.x, point.z);
    return [lon, lat] as [number, number];
  });
  closed.push(closed[0]!);
  return closed;
}

writeFileSync(
  CANGGU_LAND,
  `${JSON.stringify(
    {
      type: 'FeatureCollection',
      features: landPolygonsFrom(coastline, landRect).map((land) => ({
        type: 'Feature',
        properties: { name: 'Canggu land' },
        geometry: {
          type: 'Polygon',
          coordinates: land.map(asLonLat),
        },
      })),
    },
    null,
    2,
  )}\n`,
);

// The elevation the fixture block sits on, reprojected once so the contract test never has
// to run GDAL or reach the network.
const demBounds = chunkAlignedBounds(
  {
    x0: FIXTURE_BLOCK.i0 * CHUNK_SIZE,
    z0: FIXTURE_BLOCK.j0 * CHUNK_SIZE,
    x1: (FIXTURE_BLOCK.i1 + 1) * CHUNK_SIZE,
    z1: (FIXTURE_BLOCK.j1 + 1) * CHUNK_SIZE,
  },
  FIXTURE_MARGIN,
);
const tiles = await ensureDemTiles(tilesCovering(demBounds), rawDir);
writeDemGrid(FIXTURE_DEM, reprojectDem(tiles, demBounds, workDir));
rmSync(workDir, { recursive: true, force: true });

console.log(`Fixture written to ${dirname(FIXTURE_OSM)} and land polygons to ${CANGGU_LAND}`);

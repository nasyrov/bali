import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD_DATA_DIR } from '@bali-moto/shared';

/** Repository root, from which sources and outputs are resolved. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Where the build writes the manifest and one directory of blobs per chunk. */
export const worldDir = resolve(repoRoot, WORLD_DATA_DIR);

/** Checked-in and downloaded OpenStreetMap and elevation sources. */
export const dataDir = resolve(repoRoot, 'data');

/** Where bulk downloads land: the Copernicus tiles and any OSM extract fetched by the build. */
export const rawDir = resolve(dataDir, 'raw');

/** The Canggu sample: roads, land cover and waterways for the 6.6 km box. */
export const CANGGU_SAMPLE = resolve(dataDir, 'processed/canggu.osm.pbf');

/**
 * Land polygons for the Canggu sample, closed from its coastline. Both the Canggu build and
 * the fixture clip their terrain against them, so there is one coastline and not two.
 */
export const CANGGU_LAND = resolve(dataDir, 'processed/canggu-land.geojson');

/** The chunk block the checked-in Canggu fixture covers. */
export const FIXTURE_BLOCK = { i0: 9, i1: 10, j0: 21, j1: 22 };

/** The checked-in fixture the world data contract test builds. */
export const FIXTURE_OSM = resolve(dataDir, 'fixtures/canggu.osm.pbf');

/** The elevation cells under the fixture block, already reprojected into the world's frame. */
export const FIXTURE_DEM = resolve(dataDir, 'fixtures/canggu-elevation.bin');

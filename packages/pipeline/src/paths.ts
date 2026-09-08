import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD_DATA_DIR } from '@bali-moto/shared';

/** Repository root, from which sources and outputs are resolved. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Where the build writes the manifest and one directory of blobs per chunk. */
export const worldDir = resolve(repoRoot, WORLD_DATA_DIR);

/** Checked-in and downloaded OpenStreetMap and elevation sources. */
export const dataDir = resolve(repoRoot, 'data');

/** The chunk block the checked-in Canggu fixture covers. */
export const FIXTURE_BLOCK = { i0: 9, i1: 10, j0: 21, j1: 22 };

/** The checked-in fixture the world data contract test builds. */
export const FIXTURE_OSM = resolve(dataDir, 'fixtures/canggu.osm.pbf');

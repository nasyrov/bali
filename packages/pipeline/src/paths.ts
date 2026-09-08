import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD_DATA_DIR } from '@bali-moto/shared';

/** Repository root, from which sources and outputs are resolved. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Where the build writes the manifest and one directory of blobs per chunk. */
export const worldDir = resolve(repoRoot, WORLD_DATA_DIR);

/** Checked-in and downloaded OpenStreetMap and elevation sources. */
export const dataDir = resolve(repoRoot, 'data');

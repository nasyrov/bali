// The world build: one command that turns OpenStreetMap and elevation sources into the
// versioned world data the runtime streams. The stages themselves arrive with the tickets
// that follow; for now the build only prepares the output directory.

import { mkdir } from 'node:fs/promises';
import { relative } from 'node:path';
import { repoRoot, worldDir } from './paths.ts';

await mkdir(worldDir, { recursive: true });

console.log(`World data directory ready at ${relative(repoRoot, worldDir)}/`);
console.log('No pipeline stages are implemented yet; the Canggu roads build lands next.');

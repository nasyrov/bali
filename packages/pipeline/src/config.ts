// The builds the pipeline knows how to run.

import { resolve } from 'node:path';
import { FIXTURE_OSM, dataDir, repoRoot, worldDir } from './paths.ts';
import type { WorldBuildConfig } from './world.ts';

/**
 * Canggu: the 6.6 km sample the roads prototype was measured on, and what `npm run world`
 * builds today. The whole island follows with the level-of-detail work.
 */
export const CANGGU_BUILD: WorldBuildConfig = {
  source: { pbf: resolve(dataDir, 'processed/canggu-roads.osm.pbf') },
  outDir: worldDir,
  workDir: resolve(repoRoot, '.world-build'),
};

/** The checked-in fixture, built into a caller-chosen directory by the contract test. */
export function fixtureBuild(outDir: string, workDir: string): WorldBuildConfig {
  return { source: { pbf: FIXTURE_OSM }, outDir, workDir };
}

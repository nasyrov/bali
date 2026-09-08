// The builds the pipeline knows how to run.

import { resolve } from 'node:path';
import {
  CANGGU_LAND,
  CANGGU_SAMPLE,
  FIXTURE_DEM,
  FIXTURE_OSM,
  rawDir,
  repoRoot,
  worldDir,
} from './paths.ts';
import type { WorldBuildConfig } from './world.ts';

/**
 * Canggu: the 6.6 km sample the roads prototype was measured on, and what `npm run world`
 * builds today. The whole island follows with the level-of-detail work.
 */
export const CANGGU_BUILD: WorldBuildConfig = {
  source: { pbf: CANGGU_SAMPLE },
  elevation: { tileDir: rawDir },
  landPolygons: CANGGU_LAND,
  outDir: worldDir,
  workDir: resolve(repoRoot, '.world-build'),
};

/**
 * The checked-in fixture, built into a caller-chosen directory by the contract test. Its
 * elevation is a raster reprojected once by `npm run fixture`, so the test runs without GDAL
 * and without reaching the network.
 */
export function fixtureBuild(outDir: string, workDir: string): WorldBuildConfig {
  return {
    source: { pbf: FIXTURE_OSM },
    elevation: { raster: FIXTURE_DEM },
    landPolygons: CANGGU_LAND,
    outDir,
    workDir,
  };
}

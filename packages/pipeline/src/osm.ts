// The OpenStreetMap stages: fetch the extract when it is missing, clip it to the region,
// filter it to highways, and read the result as ways with their node ids intact.
//
// osmium does the clipping and filtering; everything geometric is TypeScript.

import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';

/** Tags the road layer reads; everything else is dropped at export. */
const EXPORTED_TAGS = [
  'highway',
  'name',
  'surface',
  'oneway',
  'lanes',
  'width',
  'bridge',
  'tunnel',
  'layer',
  'junction',
  'area',
  'ref',
];

/** ASCII record separator, which osmium writes before each GeoJSON Text Sequence record. */
const RECORD_SEPARATOR = 0x1e;

/** One OpenStreetMap way as the pipeline reads it out of an extract. */
export interface OsmWay {
  id: number;
  tags: Record<string, string | undefined>;
  /** OpenStreetMap node ids, one per point, used as the graph's stable node ids. */
  nodeIds: number[];
  points: { lon: number; lat: number }[];
}

export interface OsmSource {
  /** The extract to build from. */
  pbf: string;
  /** Where to download it from when it is missing. */
  url?: string;
  /** A GeoJSON polygon to clip to; without one the whole extract is used. */
  clipPolygon?: string;
}

function osmium(args: string[]): void {
  execFileSync('osmium', args, { stdio: ['ignore', 'ignore', 'inherit'] });
}

/** Download the extract if it is not already on disk. */
export async function ensureSource(source: OsmSource): Promise<void> {
  if (existsSync(source.pbf)) return;
  if (source.url === undefined) {
    throw new Error(`Missing source extract ${source.pbf} and no url to fetch it from`);
  }

  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`Fetching ${source.url} failed with ${response.status} ${response.statusText}`);
  }

  await mkdir(dirname(source.pbf), { recursive: true });
  await writeFile(source.pbf, new Uint8Array(await response.arrayBuffer()));
}

/**
 * The moment the extract was cut, for the manifest. Geofabrik extracts carry a replication
 * timestamp; a clipped file has lost it, so its modification time stands in.
 */
export function extractTimestamp(pbf: string): string {
  const replication = execFileSync(
    'osmium',
    ['fileinfo', '-g', 'header.option.osmosis_replication_timestamp', pbf],
    { encoding: 'utf8' },
  ).trim();
  return replication === '' ? statSync(pbf).mtime.toISOString() : replication;
}

/** Clip the extract to the region and filter it to highway ways, returning a GeoJSONSeq file. */
export function clipAndFilterRoads(source: OsmSource, workDir: string): string {
  const clipped = join(workDir, 'clipped.osm.pbf');
  const roads = join(workDir, 'roads.osm.pbf');
  const exported = join(workDir, 'roads.geojsonseq');
  const exportConfig = join(workDir, 'export-config.json');

  if (source.clipPolygon === undefined) {
    osmium(['cat', source.pbf, '--overwrite', '-o', clipped]);
  } else {
    // complete_ways keeps every node of a way that reaches into the region, so no way in
    // the clip has a dangling node reference.
    osmium([
      'extract',
      '--polygon',
      source.clipPolygon,
      '--strategy',
      'complete_ways',
      source.pbf,
      '--overwrite',
      '-o',
      clipped,
    ]);
  }

  osmium(['tags-filter', clipped, 'w/highway', '--overwrite', '-o', roads]);

  writeFileSync(
    exportConfig,
    JSON.stringify({
      attributes: { type: false, id: true, way_nodes: true },
      linear_tags: true,
      area_tags: true,
      include_tags: EXPORTED_TAGS,
    }),
  );
  osmium(['export', roads, '-c', exportConfig, '-f', 'geojsonseq', '--overwrite', '-o', exported]);

  return exported;
}

/** Read the exported ways: linear highways with their node ids and whitelisted tags. */
export async function readWays(geojsonseq: string): Promise<OsmWay[]> {
  const ways: OsmWay[] = [];
  const lines = createInterface({ input: createReadStream(geojsonseq) });

  for await (const raw of lines) {
    const line = raw.charCodeAt(0) === RECORD_SEPARATOR ? raw.slice(1) : raw;
    if (line.trim() === '') continue;

    const feature = JSON.parse(line);
    if (feature.geometry?.type !== 'LineString') continue;

    const { '@id': id, '@way_nodes': nodeIds, ...tags } = feature.properties;
    if (!Array.isArray(nodeIds)) continue;

    ways.push({
      id,
      tags,
      nodeIds,
      points: feature.geometry.coordinates.map(([lon, lat]: [number, number]) => ({ lon, lat })),
    });
  }

  return ways;
}

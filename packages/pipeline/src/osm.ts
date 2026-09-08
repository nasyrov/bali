// The OpenStreetMap stages: fetch the extract when it is missing, clip it to the region,
// filter it into the two layers the build reads — highways, and the ground under them — and
// read each back as plain geometry with the tags the pipeline uses.
//
// osmium does the clipping, filtering and area assembly; everything geometric is TypeScript.

import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';

/** Tags the road layer reads; everything else is dropped at export. */
const ROAD_TAGS = [
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

/** Tags the ground layer reads: what covers the land, and what water runs over it. */
const GROUND_TAGS = ['landuse', 'natural', 'leisure', 'waterway', 'water', 'wetland', 'name'];

/** osmium filters that keep the ways and relations describing the ground. */
const GROUND_FILTERS = [
  'wr/landuse',
  'wr/natural',
  'wr/leisure',
  'wr/waterway',
];

/** ASCII record separator, which osmium writes before each GeoJSON Text Sequence record. */
const RECORD_SEPARATOR = 0x1e;

/** A polygon or line describing the ground, as the pipeline reads it out of an extract. */
export interface GroundFeature {
  tags: Record<string, string | undefined>;
  /** Rings for an area — outer first, then holes — and a single line for a waterway. */
  polygons: { lon: number; lat: number }[][][];
  lines: { lon: number; lat: number }[][];
}

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

/** Where osmium left each layer of the clipped extract, as GeoJSON Text Sequence files. */
export interface ExtractLayers {
  roads: string;
  ground: string;
}

function writeExportConfig(path: string, tags: readonly string[]): void {
  writeFileSync(
    path,
    JSON.stringify({
      attributes: { type: false, id: true, way_nodes: true },
      linear_tags: true,
      area_tags: true,
      include_tags: tags,
    }),
  );
}

/** Clip the extract to the region and split it into the road and ground layers. */
export function clipAndFilter(source: OsmSource, workDir: string): ExtractLayers {
  const clipped = join(workDir, 'clipped.osm.pbf');
  const roads = join(workDir, 'roads.osm.pbf');
  const ground = join(workDir, 'ground.osm.pbf');
  const exported = join(workDir, 'roads.geojsonseq');
  const groundExported = join(workDir, 'ground.geojsonseq');
  const roadConfig = join(workDir, 'road-export-config.json');
  const groundConfig = join(workDir, 'ground-export-config.json');

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
  osmium(['tags-filter', clipped, ...GROUND_FILTERS, '--overwrite', '-o', ground]);

  writeExportConfig(roadConfig, ROAD_TAGS);
  writeExportConfig(groundConfig, GROUND_TAGS);
  osmium(['export', roads, '-c', roadConfig, '-f', 'geojsonseq', '--overwrite', '-o', exported]);
  osmium(['export', ground, '-c', groundConfig, '-f', 'geojsonseq', '--overwrite', '-o', groundExported]);

  return { roads: exported, ground: groundExported };
}

/** Walk a GeoJSON Text Sequence file, handing back one parsed feature at a time. */
async function* features(geojsonseq: string): AsyncGenerator<{
  properties: Record<string, string | undefined>;
  geometry: { type: string; coordinates: unknown };
}> {
  for await (const raw of createInterface({ input: createReadStream(geojsonseq) })) {
    const line = raw.charCodeAt(0) === RECORD_SEPARATOR ? raw.slice(1) : raw;
    if (line.trim() === '') continue;
    const feature = JSON.parse(line);
    if (feature.geometry) yield feature;
  }
}

type Ring = { lon: number; lat: number }[];

function toRing(coordinates: [number, number][]): Ring {
  return coordinates.map(([lon, lat]) => ({ lon, lat }));
}

/**
 * Read the exported ground layer: land-cover areas as polygons and waterways as lines. A
 * closed way with an area tag comes out of osmium as a MultiPolygon and a multipolygon
 * relation as one too, so both arrive here in the same shape.
 */
export async function readGroundFeatures(geojsonseq: string): Promise<GroundFeature[]> {
  const ground: GroundFeature[] = [];

  for await (const feature of features(geojsonseq)) {
    const { '@id': _id, '@way_nodes': _nodes, ...tags } = feature.properties as Record<string, string>;
    const polygons: Ring[][] = [];
    const lines: Ring[] = [];

    if (feature.geometry.type === 'MultiPolygon') {
      polygons.push(...(feature.geometry.coordinates as [number, number][][][]).map((polygon) => polygon.map(toRing)));
    } else if (feature.geometry.type === 'Polygon') {
      polygons.push((feature.geometry.coordinates as [number, number][][]).map(toRing));
    } else if (feature.geometry.type === 'LineString') {
      lines.push(toRing(feature.geometry.coordinates as [number, number][]));
    } else {
      continue;
    }

    ground.push({ tags, polygons, lines });
  }

  return ground;
}

/** Read the exported ways: linear highways with their node ids and whitelisted tags. */
export async function readWays(geojsonseq: string): Promise<OsmWay[]> {
  const ways: OsmWay[] = [];

  for await (const feature of features(geojsonseq)) {
    if (feature.geometry.type !== 'LineString') continue;

    const { '@id': id, '@way_nodes': nodeIds, ...tags } = feature.properties as Record<string, unknown>;
    if (!Array.isArray(nodeIds)) continue;

    ways.push({
      id: id as number,
      tags: tags as Record<string, string | undefined>,
      nodeIds,
      points: toRing(feature.geometry.coordinates as [number, number][]),
    });
  }

  return ways;
}

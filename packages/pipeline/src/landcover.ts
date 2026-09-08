// What the ground is made of, read off OpenStreetMap's landuse, natural and leisure areas
// and its waterway lines.
//
// Every terrain vertex asks two questions here: which class covers me, and how close is the
// nearest waterway. Both go through a coarse cell index, so a vertex tests a handful of
// shapes rather than every polygon in the build. Where nothing covers a vertex it stays the
// unmapped countryside, which is the raster fallback the terrain decision asks for.

import { lonLatToWorld, type LandCover, type WorldPoint } from '@bali-moto/shared';
import {
  CellIndex,
  boundsOf,
  distanceToSegment,
  pointInPolygon,
  ringArea,
  segmentsOf,
  type Polygon,
  type Segment,
} from './geometry.ts';
import type { GroundFeature } from './osm.ts';

/** Cell edge of the lookup index, in metres: a couple of Bali's field sizes. */
const INDEX_CELL = 200;

/** How far from a waterway line the channel reaches, by what the waterway is. */
const CHANNEL_REACH: Record<string, number> = {
  river: 8,
  canal: 6,
  stream: 4,
  tidal_channel: 4,
  ditch: 3,
  drain: 3,
};

const LANDUSE_COVER: Record<string, LandCover> = {
  farmland: 'paddy',
  paddy: 'paddy',
  allotments: 'paddy',
  greenhouse_horticulture: 'paddy',
  orchard: 'orchard',
  vineyard: 'orchard',
  plantation: 'orchard',
  forest: 'forest',
  meadow: 'grass',
  grass: 'grass',
  greenfield: 'grass',
  village_green: 'grass',
  recreation_ground: 'grass',
  residential: 'built',
  commercial: 'built',
  retail: 'built',
  industrial: 'built',
  construction: 'built',
  brownfield: 'built',
  religious: 'built',
  education: 'built',
  government_office: 'built',
  parking: 'built',
  cemetery: 'built',
  military: 'built',
  quarry: 'built',
  reservoir: 'water',
  basin: 'water',
  salt_pond: 'water',
  aquaculture: 'water',
};

const NATURAL_COVER: Record<string, LandCover> = {
  wood: 'forest',
  tree_row: 'forest',
  scrub: 'scrub',
  heath: 'scrub',
  grassland: 'grass',
  water: 'water',
  bay: 'water',
  wetland: 'mangrove',
  beach: 'beach',
  sand: 'beach',
  shingle: 'beach',
  dune: 'beach',
};

const LEISURE_COVER: Record<string, LandCover> = {
  park: 'grass',
  garden: 'grass',
  pitch: 'grass',
  golf_course: 'grass',
  dog_park: 'grass',
  nature_reserve: 'forest',
  swimming_pool: 'water',
};

/** The class an area's tags name, or undefined when the world paints nothing for them. */
function coverOf(tags: Record<string, string | undefined>): LandCover | undefined {
  for (const [key, table] of [
    ['leisure', LEISURE_COVER],
    ['natural', NATURAL_COVER],
    ['landuse', LANDUSE_COVER],
  ] as const) {
    const value = tags[key];
    if (value !== undefined && value in table) return table[value];
  }
  return undefined;
}

/** One classified area, kept with its size so that a small shape paints over a large one. */
interface CoverArea {
  cover: LandCover;
  polygon: Polygon;
  size: number;
}

function toWorld(ring: readonly { lon: number; lat: number }[]): WorldPoint[] {
  return ring.map((point) => lonLatToWorld(point.lon, point.lat));
}

/**
 * The ground of a build: what covers each point and where the waterways run. Areas are
 * painted smallest last, so a swimming pool inside a residential block wins over the block
 * and a paddy inside a village wins over the village.
 */
export class Ground {
  private readonly areas = new CellIndex<CoverArea>(INDEX_CELL);
  private readonly channels = new CellIndex<Segment<number>>(INDEX_CELL);

  constructor(features: readonly GroundFeature[]) {
    const areas: CoverArea[] = [];

    for (const feature of features) {
      const cover = coverOf(feature.tags);
      if (cover !== undefined) {
        for (const rings of feature.polygons) {
          const polygon = rings.map(toWorld);
          const outer = polygon[0];
          if (!outer || outer.length < 4) continue;
          areas.push({ cover, polygon, size: Math.abs(ringArea(outer)) });
        }
      }

      const reach = CHANNEL_REACH[feature.tags.waterway ?? ''];
      if (reach === undefined) continue;
      for (const line of feature.lines) {
        const points = toWorld(line);
        for (const segment of segmentsOf(points, reach)) {
          this.channels.add(segment, boundsOf([segment.a, segment.b]), reach);
        }
      }
    }

    for (const area of areas.sort((first, second) => second.size - first.size)) {
      this.areas.add(area, boundsOf(area.polygon[0]!));
    }
  }

  /** The class covering a point, or undefined where the map says nothing about it. */
  coverAt(x: number, z: number): LandCover | undefined {
    let found: LandCover | undefined;
    for (const area of this.areas.near(x, z)) {
      if (pointInPolygon(area.polygon, x, z)) found = area.cover;
    }
    return found;
  }

  /**
   * How far into a waterway's channel a point lies, from 0 at its rim to 1 on the line
   * itself, so the channel can be cut with feathered banks rather than a trench.
   */
  channelDepthAt(x: number, z: number): number {
    let deepest = 0;
    for (const segment of this.channels.near(x, z)) {
      const reach = segment.of;
      const distance = distanceToSegment(x, z, segment.a, segment.b);
      if (distance < reach) deepest = Math.max(deepest, 1 - distance / reach);
    }
    return deepest;
  }
}

// Where the island is, and where the sea is.
//
// Land polygons are a GeoJSON file of the coastline already closed into areas, the same shape
// osmdata.openstreetmap.de publishes and the fixture ships a Canggu cut of. Terrain exists
// only inside them; everything else is sea, and the strip of land just inside the coast is
// where the beach is synthesised when the map has not drawn one.

import { lonLatToWorld, type WorldPoint } from '@bali-moto/shared';
import { readFileSync } from 'node:fs';
import { CellIndex, boundsOf, distanceToSegment, pointInPolygon, segmentsOf, type Polygon, type Segment } from './geometry.ts';

/** Cell edge of the lookup index, in metres. */
const INDEX_CELL = 500;

/** How wide a beach is synthesised along coast the map has drawn no beach on, in metres. */
export const BEACH_WIDTH = 8;

/** Read a GeoJSON file of land polygons and project them into world metres. */
export function readLandPolygons(path: string): Polygon[] {
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  const features = parsed.type === 'FeatureCollection' ? parsed.features : [parsed];
  const polygons: Polygon[] = [];

  const toWorld = (ring: [number, number][]): WorldPoint[] =>
    ring.map(([lon, lat]) => lonLatToWorld(lon, lat));

  for (const feature of features) {
    const geometry = feature.type === 'Feature' ? feature.geometry : feature;
    if (geometry?.type === 'Polygon') polygons.push(geometry.coordinates.map(toWorld));
    else if (geometry?.type === 'MultiPolygon') {
      for (const rings of geometry.coordinates) polygons.push(rings.map(toWorld));
    }
  }

  return polygons;
}

/** Which side of the coast a point is on, and how far from it. */
export class LandMask {
  private readonly polygons = new CellIndex<Polygon>(INDEX_CELL);
  private readonly coast = new CellIndex<Segment<undefined>>(INDEX_CELL);
  private readonly mapped: boolean;

  constructor(polygons: readonly Polygon[]) {
    this.mapped = polygons.length > 0;
    for (const polygon of polygons) {
      this.polygons.add(polygon, boundsOf(polygon.flat()));
      for (const ring of polygon) {
        for (const segment of segmentsOf([...ring, ring[0]!], undefined)) {
          this.coast.add(segment, boundsOf([segment.a, segment.b]), BEACH_WIDTH);
        }
      }
    }
  }

  /**
   * Whether a point is on the island. A build with no land polygons is all land, which is
   * what an inland extract with no coast in it wants.
   */
  isLand(x: number, z: number): boolean {
    if (!this.mapped) return true;
    return this.polygons.near(x, z).some((polygon) => pointInPolygon(polygon, x, z));
  }

  /** Whether a point is within a beach's width of the coastline. */
  nearCoast(x: number, z: number): boolean {
    return this.coast
      .near(x, z)
      .some((segment) => distanceToSegment(x, z, segment.a, segment.b) < BEACH_WIDTH);
  }
}

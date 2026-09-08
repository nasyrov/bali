import { describe, expect, it } from 'vitest';
import { ISLAND_ORIGIN_EASTING, ISLAND_ORIGIN_NORTHING, lonLatToWorld, worldToLonLat } from './projection.ts';

// Reference eastings and northings are EPSG:32750 (UTM zone 50S, WGS84) values produced by
// proj4 2.x, an independent implementation, for the longitudes and latitudes below.
// The island centre row is the datum quoted in the world-scale decision:
// lat -8.45, lon 115.07 projects to E 287,517, N 9,065,427.
const PLACES = [
  { name: 'island centre', lon: 115.07, lat: -8.45, easting: 287516.5959, northing: 9065427.3705 },
  { name: 'Gilimanuk', lon: 114.4363, lat: -8.1636, easting: 217505.0297, northing: 9096717.9358 },
  { name: 'Amed', lon: 115.6553, lat: -8.3364, easting: 351926.0527, northing: 9078260.3406 },
  { name: 'Uluwatu', lon: 115.0847, lat: -8.8291, easting: 289346.228, northing: 9023501.3979 },
  { name: 'Singaraja', lon: 115.088, lat: -8.112, easting: 289319.2569, northing: 9102824.1671 },
];

describe('lonLatToWorld', () => {
  it.each(PLACES)('projects $name onto UTM zone 50S offset by the island centre', (place) => {
    const { x, z } = lonLatToWorld(place.lon, place.lat);
    expect(x).toBeCloseTo(place.easting - ISLAND_ORIGIN_EASTING, 3);
    expect(z).toBeCloseTo(ISLAND_ORIGIN_NORTHING - place.northing, 3);
  });

  it('puts the island centre datum within a hundred metres of the world origin', () => {
    const { x, z } = lonLatToWorld(115.07, -8.45);
    expect(Math.hypot(x, z)).toBeLessThan(100);
  });

  // The world-scale decision states the island spans x from about -70 km (Gilimanuk)
  // to +63 km (Amed), and z from about -36 km (Singaraja) to +42 km (Uluwatu).
  it.each([
    { name: 'Gilimanuk', lon: 114.4363, lat: -8.1636, axis: 'x' as const, expected: -70_000 },
    { name: 'Amed', lon: 115.6553, lat: -8.3364, axis: 'x' as const, expected: 63_000 },
    { name: 'Singaraja', lon: 115.088, lat: -8.112, axis: 'z' as const, expected: -36_000 },
    { name: 'Uluwatu', lon: 115.0847, lat: -8.8291, axis: 'z' as const, expected: 42_000 },
  ])('places $name at the $axis extent of the island the decision describes', (extent) => {
    const world = lonLatToWorld(extent.lon, extent.lat);
    expect(Math.abs(world[extent.axis] - extent.expected)).toBeLessThan(2_000);
  });

  it('grows x to the east and z to the south', () => {
    const centre = lonLatToWorld(115.07, -8.45);
    expect(lonLatToWorld(115.08, -8.45).x).toBeGreaterThan(centre.x);
    expect(lonLatToWorld(115.07, -8.46).z).toBeGreaterThan(centre.z);
  });
});

describe('worldToLonLat', () => {
  it.each(PLACES)('recovers the longitude and latitude of $name', (place) => {
    const world = lonLatToWorld(place.lon, place.lat);
    const { lon, lat } = worldToLonLat(world.x, world.z);
    expect(lon).toBeCloseTo(place.lon, 9);
    expect(lat).toBeCloseTo(place.lat, 9);
  });

  it('round-trips world metres across the island to under a millimetre', () => {
    for (let x = -70_000; x <= 65_000; x += 5_000) {
      for (let z = -40_000; z <= 45_000; z += 5_000) {
        const { lon, lat } = worldToLonLat(x, z);
        const back = lonLatToWorld(lon, lat);
        expect(back.x).toBeCloseTo(x, 3);
        expect(back.z).toBeCloseTo(z, 3);
      }
    }
  });
});

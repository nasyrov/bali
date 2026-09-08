// Projection between longitude/latitude on WGS84 and game world metres.
//
// The world is UTM zone 50S (EPSG:32750) shifted so that the origin sits near the centre
// of Bali: x is easting minus 287,500 (east positive), z is 9,065,500 minus northing
// (south positive), keeping the three.js frame right-handed with y up. One unit is one metre.
//
// The transverse Mercator series is Krüger's to sixth order in the third flattening, which
// is accurate to well under a millimetre inside a zone — far tighter than the metre-level
// agreement the pipeline and the runtime need.

/** Easting of the world origin, in UTM zone 50S metres. */
export const ISLAND_ORIGIN_EASTING = 287_500;
/** Northing of the world origin, in UTM zone 50S metres. */
export const ISLAND_ORIGIN_NORTHING = 9_065_500;

/** A point on the world plane in metres: x east, z south. Height comes from the terrain. */
export interface WorldPoint {
  x: number;
  z: number;
}

/** A point on the WGS84 ellipsoid in degrees. */
export interface LonLat {
  lon: number;
  lat: number;
}

const SEMI_MAJOR_AXIS = 6_378_137;
const FLATTENING = 1 / 298.257223563;
const SCALE_FACTOR = 0.9996;
const FALSE_EASTING = 500_000;
const FALSE_NORTHING = 10_000_000; // southern hemisphere
const CENTRAL_MERIDIAN = 117; // zone 50 spans 114°E to 120°E

const DEG = Math.PI / 180;

const n = FLATTENING / (2 - FLATTENING);
const n2 = n * n;
const n3 = n2 * n;
const n4 = n3 * n;
const n5 = n4 * n;
const n6 = n5 * n;

/** Rectifying radius: the radius of a sphere with the same meridian length. */
const RECTIFYING_RADIUS =
  (SEMI_MAJOR_AXIS / (1 + n)) * (1 + n2 / 4 + n4 / 64 + n6 / 256);

/** Krüger series, geodetic to projected. */
const ALPHA = [
  n / 2 - (2 * n2) / 3 + (5 * n3) / 16 + (41 * n4) / 180 - (127 * n5) / 288 + (7891 * n6) / 37800,
  (13 * n2) / 48 - (3 * n3) / 5 + (557 * n4) / 1440 + (281 * n5) / 630 - (1983433 * n6) / 1935360,
  (61 * n3) / 240 - (103 * n4) / 140 + (15061 * n5) / 26880 + (167603 * n6) / 181440,
  (49561 * n4) / 161280 - (179 * n5) / 168 + (6601661 * n6) / 7257600,
  (34729 * n5) / 80640 - (3418889 * n6) / 1995840,
  (212378941 * n6) / 319334400,
];

/** Krüger series, projected to geodetic. */
const BETA = [
  n / 2 - (2 * n2) / 3 + (37 * n3) / 96 - n4 / 360 - (81 * n5) / 512 + (96199 * n6) / 604800,
  n2 / 48 + n3 / 15 - (437 * n4) / 1440 + (46 * n5) / 105 - (1118711 * n6) / 3870720,
  (17 * n3) / 480 - (37 * n4) / 840 - (209 * n5) / 4480 + (5569 * n6) / 90720,
  (4397 * n4) / 161280 - (11 * n5) / 504 - (830251 * n6) / 7257600,
  (4583 * n5) / 161280 - (108847 * n6) / 3991680,
  (20648693 * n6) / 638668800,
];

/** Conformal latitude to geodetic latitude. */
const DELTA = [
  2 * n - (2 * n2) / 3 - 2 * n3 + (116 * n4) / 45 + (26 * n5) / 45 - (2854 * n6) / 675,
  (7 * n2) / 3 - (8 * n3) / 5 - (227 * n4) / 45 + (2704 * n5) / 315 + (2323 * n6) / 945,
  (56 * n3) / 15 - (136 * n4) / 35 - (1262 * n5) / 105 + (73814 * n6) / 2835,
  (4279 * n4) / 630 - (332 * n5) / 35 - (399572 * n6) / 14175,
  (4174 * n5) / 315 - (144838 * n6) / 6237,
  (601676 * n6) / 22275,
];

const CONFORMAL_FACTOR = (2 * Math.sqrt(n)) / (1 + n);

/** Longitude and latitude in degrees to world metres. */
export function lonLatToWorld(lon: number, lat: number): WorldPoint {
  const phi = lat * DEG;
  const deltaLon = (lon - CENTRAL_MERIDIAN) * DEG;

  const sinPhi = Math.sin(phi);
  const tau = Math.sinh(Math.atanh(sinPhi) - CONFORMAL_FACTOR * Math.atanh(CONFORMAL_FACTOR * sinPhi));
  const xi = Math.atan2(tau, Math.cos(deltaLon));
  const eta = Math.asinh(Math.sin(deltaLon) / Math.hypot(tau, Math.cos(deltaLon)));

  let easting = eta;
  let northing = xi;
  for (const [index, alpha] of ALPHA.entries()) {
    const harmonic = 2 * (index + 1);
    easting += alpha * Math.cos(harmonic * xi) * Math.sinh(harmonic * eta);
    northing += alpha * Math.sin(harmonic * xi) * Math.cosh(harmonic * eta);
  }

  const scale = SCALE_FACTOR * RECTIFYING_RADIUS;
  return {
    x: FALSE_EASTING + scale * easting - ISLAND_ORIGIN_EASTING,
    z: ISLAND_ORIGIN_NORTHING - (FALSE_NORTHING + scale * northing),
  };
}

/** World metres back to longitude and latitude in degrees. */
export function worldToLonLat(x: number, z: number): LonLat {
  const scale = SCALE_FACTOR * RECTIFYING_RADIUS;
  const xi = (ISLAND_ORIGIN_NORTHING - z - FALSE_NORTHING) / scale;
  const eta = (x + ISLAND_ORIGIN_EASTING - FALSE_EASTING) / scale;

  let xiPrime = xi;
  let etaPrime = eta;
  for (const [index, beta] of BETA.entries()) {
    const harmonic = 2 * (index + 1);
    xiPrime -= beta * Math.sin(harmonic * xi) * Math.cosh(harmonic * eta);
    etaPrime -= beta * Math.cos(harmonic * xi) * Math.sinh(harmonic * eta);
  }

  const chi = Math.asin(Math.sin(xiPrime) / Math.cosh(etaPrime));
  let phi = chi;
  for (const [index, delta] of DELTA.entries()) {
    phi += delta * Math.sin(2 * (index + 1) * chi);
  }

  return {
    lon: CENTRAL_MERIDIAN + Math.atan2(Math.sinh(etaPrime), Math.cos(xiPrime)) / DEG,
    lat: phi / DEG,
  };
}

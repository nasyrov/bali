// What the ground does to the bike.
//
// Every surface the world can put under a wheel caps the speed at a fraction of the asphalt
// top speed and adds a little wobble to the heading. The numbers are the handling decision's:
// asphalt and concrete full, paving stones most of it, gravel and dirt well down, grass and
// paddy beds a third, sand a quarter with heavy wobble, steps and shallow water a crawl.
//
// Surfaces arrive from two places: the Road under the bike names its own, and off the Roads
// the land cover does. Land cover comes with the terrain, so until then the island off-road
// is grass.

/** Top speed on asphalt, in metres per second: the ~90 km/h the spec asks for. */
export const ASPHALT_TOP_SPEED = 25;

/** How a surface rides. */
export interface Surface {
  /** Share of the asphalt top speed this surface allows. */
  cap: number;
  /** Heading wobble it shakes into the bike, in radians per second at full speed. */
  wobble: number;
}

const SURFACES: Record<string, Surface> = {
  asphalt: { cap: 1, wobble: 0 },
  paved: { cap: 1, wobble: 0 },
  concrete: { cap: 1, wobble: 0 },
  paving_stones: { cap: 0.85, wobble: 0.05 },
  gravel: { cap: 0.6, wobble: 0.14 },
  unpaved: { cap: 0.6, wobble: 0.12 },
  dirt: { cap: 0.6, wobble: 0.12 },
  ground: { cap: 0.6, wobble: 0.12 },
  grass: { cap: 0.35, wobble: 0.1 },
  paddy: { cap: 0.35, wobble: 0.16 },
  sand: { cap: 0.25, wobble: 0.4 },
  steps: { cap: 0.06, wobble: 0.35 },
  shallow_water: { cap: 0.04, wobble: 0.08 },
};

/** The surface off the Roads until the terrain ticket brings real land cover. */
export const DEFAULT_LAND_COVER = 'grass';

/** How a named surface rides; an unmapped name rides like the unpaved countryside. */
export function surfaceOf(name: string): Surface {
  return SURFACES[name] ?? SURFACES.unpaved!;
}

/** Top speed on a named surface, in metres per second. */
export function topSpeedOn(name: string): number {
  return ASPHALT_TOP_SPEED * surfaceOf(name).cap;
}

// What a Road looks like: which OpenStreetMap highway values the island is built from, how
// wide each class is, what colour its surface is, and the order the classes stack in.
//
// Widths are the Bali-calibrated defaults; generic western tables measure about twice Bali's
// real widths and are not used. Link classes are not in that table, so they take the
// prototype's Bali values, each a little narrower than the road it leaves.

/** Classes that join the road graph and carry Traffic, widest first. */
const DRIVABLE_WIDTHS = {
  motorway: 12,
  motorway_link: 7,
  trunk: 8,
  trunk_link: 6,
  primary: 6,
  primary_link: 5,
  secondary: 5.5,
  secondary_link: 4.5,
  tertiary: 4.5,
  tertiary_link: 4,
  unclassified: 4,
  residential: 3.5,
  living_street: 2.2,
  service: 2.5,
  track: 2.5,
} as const;

/** Classes rendered as ribbons the rider may use but Traffic never does. */
const PATH_WIDTHS = {
  pedestrian: 3,
  cycleway: 1.5,
  path: 1.5,
  footway: 1.2,
  steps: 1.2,
} as const;

const WIDTHS = { ...DRIVABLE_WIDTHS, ...PATH_WIDTHS };

export type RoadClass = keyof typeof WIDTHS;

/** Highway values that are not a road today and are never rendered. */
const DROPPED = new Set(['proposed', 'construction', 'raceway']);

/** Stacking order, lowest number drawn highest, so a trunk covers the gang that meets it. */
const RANK: Record<RoadClass, number> = {
  motorway: 0,
  motorway_link: 0,
  trunk: 1,
  trunk_link: 1,
  primary: 2,
  primary_link: 2,
  secondary: 3,
  secondary_link: 3,
  tertiary: 4,
  tertiary_link: 4,
  unclassified: 5,
  residential: 6,
  living_street: 7,
  service: 8,
  track: 9,
  pedestrian: 10,
  cycleway: 11,
  path: 12,
  footway: 13,
  steps: 14,
};

const LOWEST_RANK = 14;

/** Surface colours from the art-direction palette. */
const SURFACE_COLOURS: Record<string, number> = {
  asphalt: 0x5a5651,
  paved: 0x6a6660,
  paving_stones: 0x8a8478,
  concrete: 0x8d8a82,
  unpaved: 0x9c8560,
  gravel: 0x9a9184,
  dirt: 0x8e7350,
  ground: 0x8e7350,
};

/** Height of the lowest class above the terrain, in metres. */
const BASE_HEIGHT = 0.02;
/** Height added per rank, so classes stack within a few millimetres of each other. */
const HEIGHT_PER_RANK = 0.004;

/** Narrowest and widest width tag believed to be a real measurement, in metres. */
const MIN_TAGGED_WIDTH = 1;
const MAX_TAGGED_WIDTH = 12;

/** The class an OSM highway value names, or undefined when the world does not render it. */
export function roadClassOf(highway: string | undefined): RoadClass | undefined {
  return highway !== undefined && highway in WIDTHS ? (highway as RoadClass) : undefined;
}

/** Whether a highway value names a way that is not a road today and never will be. */
export function isDropped(highway: string): boolean {
  return DROPPED.has(highway);
}

/** Whether a class is a Path: rendered and rideable, but never part of the road graph. */
export function isPath(cls: RoadClass): boolean {
  return cls in PATH_WIDTHS;
}

/** Whether a class joins the road graph and carries Traffic. */
export function isDrivable(cls: RoadClass): boolean {
  return cls in DRIVABLE_WIDTHS;
}

/** Width in metres: the OSM tag when it reads as a plausible measurement, else the class default. */
export function roadWidth(cls: RoadClass, widthTag: string | undefined): number {
  const tagged = Number.parseFloat(widthTag ?? '');
  if (tagged >= MIN_TAGGED_WIDTH && tagged <= MAX_TAGGED_WIDTH) return tagged;
  return WIDTHS[cls];
}

/**
 * What a Road is made of: the surface tag when it is one the world knows, else the class
 * fallback. Main classes are asphalt, gangs and service roads paving stones, tracks and
 * Paths unpaved. Both the colour it is drawn in and the speed the bike holds on it come
 * from here, so a road never looks like one surface and rides like another.
 */
export function roadSurface(cls: RoadClass, surfaceTag: string | undefined): string {
  if (surfaceTag !== undefined && surfaceTag in SURFACE_COLOURS) return surfaceTag;

  const rank = RANK[cls];
  if (rank <= RANK.unclassified) return 'asphalt';
  if (rank <= RANK.service) return 'paving_stones';
  return 'unpaved';
}

/** Surface colour: the tag when it is one the palette knows, else the class fallback. */
export function roadColour(cls: RoadClass, surfaceTag: string | undefined): number {
  return SURFACE_COLOURS[roadSurface(cls, surfaceTag)]!;
}

/** Height above the terrain in metres, so a higher class is drawn over a lower one. */
export function roadHeight(cls: RoadClass): number {
  return BASE_HEIGHT + (LOWEST_RANK - RANK[cls]) * HEIGHT_PER_RANK;
}

/** Stacking rank, exported so the pipeline can draw the island in class order. */
export function roadRank(cls: RoadClass): number {
  return RANK[cls];
}

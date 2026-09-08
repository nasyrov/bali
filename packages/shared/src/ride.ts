// Where a Ride begins.
//
// The runtime starts the bike here, and the world build's contract test proves the road is
// really under that point, so the two can never drift apart.

import { lonLatToWorld, type WorldPoint } from './projection.ts';

/** The stretch of Jalan Raya Canggu the first Ride opens on. */
export const RIDE_START_LON_LAT = { lon: 115.1580183, lat: -8.64443 };

/** The same place in world metres. */
export const RIDE_START: WorldPoint = lonLatToWorld(RIDE_START_LON_LAT.lon, RIDE_START_LON_LAT.lat);

/** Facing north: headings are measured from north, clockwise, and north is -z. */
export const RIDE_START_HEADING = 0;

/** The Road the first Ride starts on. */
export const RIDE_START_ROAD = 'Jalan Raya Canggu';

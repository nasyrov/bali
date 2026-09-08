// The chase camera: the only camera the game has.
//
// It sits on a boom about 6 m behind and 2.5 m above the scooter, riding up and down with the
// ground the bike is on, and is lagged exponentially on both position and heading, so a corner
// swings rather than snaps. Speed pulls the boom back and widens the field of view; the bike's
// lean rolls the horizon a few degrees; an impact shakes it briefly. Dragging the mouse orbits
// the boom for a look around, and letting go lets it swing back behind the bike.

import type { BikeState } from './bike.ts';
import type { FreeLook } from './input.ts';
import { ASPHALT_TOP_SPEED } from './surfaces.ts';

/** Where the boom sits at a standstill, in metres. */
const BOOM_DISTANCE = 6;
const BOOM_HEIGHT = 2.5;
/** How much further back the boom is at the asphalt top speed. */
const BOOM_PULL_BACK = 2.5;

/** Field of view in degrees, at a standstill and at the top speed. */
const BASE_FOV = 60;
const FOV_WIDENING = 14;

/** Looking a little down at the bike, in radians. */
const BASE_PITCH = -0.13;

/** How fast the camera catches up, per second. Heading lags more, so corners swing. */
const POSITION_LAG = 7;
const HEADING_LAG = 3.5;

/** Share of the bike's lean the horizon rolls by. */
const ROLL_FRACTION = 0.35;

/** How fast an impact shake dies away and how fast it rattles, per second. */
const SHAKE_DECAY = 4;
const SHAKE_RATE = 34;
/** Radians of roll and metres of lift at a shake of strength one. */
const SHAKE_ROLL = 0.09;
const SHAKE_LIFT = 0.25;

/** How fast the free look swings back behind the bike once the drag is released. */
const SNAP_BACK = 4;
/** How far the free look may be dragged, in radians: all the way round, either way. */
const MAX_LOOK_PITCH = 1;
const MAX_LOOK_YAW = Math.PI;

/** Everything the renderer needs; world metres and radians, never three.js types. */
export interface CameraPose {
  x: number;
  y: number;
  z: number;
  /** Where the camera looks, from north, clockwise. */
  heading: number;
  pitch: number;
  roll: number;
  /** Vertical field of view, in degrees. */
  fov: number;
}

function lag(from: number, to: number, rate: number, dt: number): number {
  return from + (to - from) * (1 - Math.exp(-rate * dt));
}

/** The shortest way round from one heading to another. */
function shortestTurn(from: number, to: number): number {
  return ((to - from + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
}

export class ChaseCamera {
  readonly pose: CameraPose;
  /** How far the look has swung off the boom; it decays back to nothing on release. */
  readonly look: FreeLook = { yaw: 0, pitch: 0 };

  /** The lagged heading of the boom itself, before the free look swings it round. */
  private boom: number;
  private shakeStrength = 0;
  private elapsed = 0;

  constructor(bike: BikeState) {
    this.boom = bike.heading;
    this.pose = { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0, fov: 0 };
    this.snapToBike(bike);
  }

  /** Rattle the camera; strength is the share of an impact at the top speed. */
  shake(strength: number): void {
    this.shakeStrength = Math.min(1, this.shakeStrength + strength);
  }

  /** Put the camera straight behind the bike, for the first frame and after a reset. */
  snapToBike(bike: BikeState): void {
    this.look.yaw = 0;
    this.look.pitch = 0;
    this.shakeStrength = 0;
    this.boom = bike.heading;
    this.pose.heading = bike.heading;
    this.pose.x = bike.x - Math.sin(bike.heading) * BOOM_DISTANCE;
    this.pose.z = bike.z + Math.cos(bike.heading) * BOOM_DISTANCE;
    this.pose.y = bike.y + BOOM_HEIGHT;
    this.pose.pitch = BASE_PITCH;
    this.pose.roll = 0;
    this.pose.fov = BASE_FOV;
  }

  /** Advance the camera by one tick, following the bike and whatever the mouse is doing. */
  follow(bike: BikeState, look: FreeLook | undefined, dt: number): void {
    this.elapsed += dt;

    if (look) {
      this.look.yaw = Math.max(-MAX_LOOK_YAW, Math.min(MAX_LOOK_YAW, look.yaw));
      this.look.pitch = Math.max(-MAX_LOOK_PITCH, Math.min(MAX_LOOK_PITCH, look.pitch));
    } else {
      const held = Math.exp(-SNAP_BACK * dt);
      this.look.yaw *= held;
      this.look.pitch *= held;
    }

    const pace = Math.min(1, Math.abs(bike.speed) / ASPHALT_TOP_SPEED);
    const distance = BOOM_DISTANCE + pace * BOOM_PULL_BACK;

    // The boom lags the bike's heading, which is what makes a corner swing; the free look
    // swings it further round, and the camera looks back down the boom either way.
    this.boom += shortestTurn(this.boom, bike.heading) * (1 - Math.exp(-HEADING_LAG * dt));
    this.pose.heading = this.boom + this.look.yaw;

    this.pose.x = lag(this.pose.x, bike.x - Math.sin(this.pose.heading) * distance, POSITION_LAG, dt);
    this.pose.z = lag(this.pose.z, bike.z + Math.cos(this.pose.heading) * distance, POSITION_LAG, dt);

    this.shakeStrength *= Math.exp(-SHAKE_DECAY * dt);
    const rattle = Math.sin(this.elapsed * SHAKE_RATE) * this.shakeStrength;

    this.pose.y = bike.y + BOOM_HEIGHT + rattle * SHAKE_LIFT;
    this.pose.pitch = BASE_PITCH + this.look.pitch;
    this.pose.roll = -bike.lean * ROLL_FRACTION + rattle * SHAKE_ROLL;
    this.pose.fov = BASE_FOV + pace * FOV_WIDENING;
  }
}

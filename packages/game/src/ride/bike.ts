// The scooter's motion: a hand-written kinematic model, not a rigid body, so it never falls
// over and the ride never ends.
//
// Throttle pushes, drag pulls back, and the surface under the wheels caps what the engine can
// drive to. Acceleration and drag are tuned together: on asphalt the pair
// asymptote to ~90 km/h and pass 50 km/h at about four seconds, which is the punchy-but-
// plausible scooter the handling decision asks for. Steering is a lean, so the yaw rate is the
// cornering acceleration divided by the speed, tightening as the bike slows and stopping short
// of a spin on the spot.
//
// The ground tilts too. Gravity along the heading bleeds speed up a climb and adds it down a
// descent, and a descent steep enough will roll the bike past the surface cap, because the cap
// is what the engine drives to rather than what a hill can carry it to. Collisions arrive with
// the buildings ticket; terrace walls and deep water are the World's business, since they are
// places rather than forces.

import { ASPHALT_TOP_SPEED, type Surface } from './surfaces.ts';
import type { RideInput } from './input.ts';

/** Metres per second per second under full throttle. */
const ACCELERATION = 5;
/** Drag per second, so that acceleration alone settles at the asphalt top speed. */
const DRAG = ACCELERATION / ASPHALT_TOP_SPEED;
/** Strong brakes, in metres per second per second, and stronger still on Shift. */
const BRAKE_DECELERATION = 12;
const HARD_BRAKE_DECELERATION = 20;
/** Reverse is a walking pace out of a dead end, and gentle to get into. */
const REVERSE_ACCELERATION = 2;
const REVERSE_TOP_SPEED = 1.5;

/** Below this the bike is manoeuvring rather than riding, and steers at the tightest rate. */
const WALKING_PACE = 1.5;
/** Lateral acceleration a scooter's tyres hold, in metres per second per second. */
const CORNERING_ACCELERATION = 6;
/** The tightest the bike turns, in radians per second: about a metre of radius at a walk. */
const MAX_YAW_RATE = 1.6;

const GRAVITY = 9.81;
/** How far the rider will hang the bike over, in radians. */
const MAX_LEAN = 0.6;
/** How fast the lean catches up with the corner, per second. */
const LEAN_LAG = 6;

/** How fast a rough surface shakes the bike, in radians per second. */
const WOBBLE_RATE = 9;

export interface BikeState {
  x: number;
  /** Height of the ground under the wheels, in metres; the terrain puts it there. */
  y: number;
  z: number;
  /** Heading from north, clockwise, in radians. */
  heading: number;
  /** Along the heading, in metres per second; negative is reverse. */
  speed: number;
  /** Lean, in radians, positive to the right. */
  lean: number;
  /** Seconds ridden, which is the phase the surface wobble runs on. */
  elapsed: number;
}

export function createBike(x: number, z: number, heading: number): BikeState {
  return { x, y: 0, z, heading, speed: 0, lean: 0, elapsed: 0 };
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** Shed speed toward a standstill without rolling past it. */
function easeToStop(speed: number, change: number): number {
  return speed > 0 ? Math.max(0, speed - change) : Math.min(0, speed + change);
}

/**
 * How hard the demanded direction pushes: asking for the way the bike is not already rolling
 * is braking, and asking for the way it is is drive, gentle in reverse.
 */
function pushOf(throttle: number, speed: number): number {
  const rollingTheOtherWay = throttle > 0 ? speed < 0 : speed > 0;
  if (rollingTheOtherWay) return BRAKE_DECELERATION;
  return throttle > 0 ? ACCELERATION : REVERSE_ACCELERATION;
}

/**
 * Advance the bike by one tick of held input over the surface it is riding on, up or down the
 * slope the ground has along the heading, in metres of rise per metre travelled.
 */
export function stepBike(
  bike: BikeState,
  input: RideInput,
  surface: Surface,
  slope: number,
  dt: number,
): void {
  bike.elapsed += dt;

  const topSpeed = ASPHALT_TOP_SPEED * surface.cap;
  const throttle = clamp(input.throttle, -1, 1);

  if (input.hardBrake) {
    bike.speed = easeToStop(bike.speed, HARD_BRAKE_DECELERATION * dt);
  } else if (throttle !== 0) {
    bike.speed += throttle * pushOf(throttle, bike.speed) * dt;
  }

  // Gravity along the heading: it bleeds speed up a climb and adds it down a descent.
  const pull = -GRAVITY * (slope / Math.hypot(1, slope));
  bike.speed += pull * dt;

  bike.speed -= bike.speed * DRAG * dt;

  // Two limits, and the higher wins: what the engine drives to on this surface, and what
  // gravity alone rolls the bike to against the drag on a slope this steep.
  const rolling = Math.max(topSpeed, Math.max(0, pull) / DRAG);
  bike.speed = clamp(bike.speed, -Math.min(REVERSE_TOP_SPEED, topSpeed), rolling);

  // A lean turns tighter the slower the bike goes, up to the point where it would spin on
  // the spot; below a walk there is not enough roll to steer with at all.
  const speed = Math.abs(bike.speed);
  const grip = Math.min(CORNERING_ACCELERATION / Math.max(speed, WALKING_PACE), MAX_YAW_RATE);
  const yawRate = clamp(input.steer, -1, 1) * grip * Math.min(1, speed / WALKING_PACE) * Math.sign(bike.speed);
  bike.heading += yawRate * dt;

  // The rougher the surface the more the front wheel wanders, and the faster the worse. A
  // surface that stops the bike outright shakes nothing, and never divides by its own cap.
  if (topSpeed > 0) {
    const pace = Math.min(1, speed / topSpeed);
    bike.heading += Math.sin(bike.elapsed * WOBBLE_RATE) * surface.wobble * pace * dt;
  }

  const lean = clamp(Math.atan2(yawRate * bike.speed, GRAVITY), -MAX_LEAN, MAX_LEAN);
  bike.lean += (lean - bike.lean) * (1 - Math.exp(-LEAN_LAG * dt));

  // Headings are measured from north, clockwise, and north is -z.
  bike.x += Math.sin(bike.heading) * bike.speed * dt;
  bike.z += -Math.cos(bike.heading) * bike.speed * dt;
}

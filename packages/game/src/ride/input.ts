// What the rider is asking for this tick, and the keyboard that says it.
//
// The World only ever sees this shape, so a test scripts a ride by handing it plain numbers
// and the browser is one thin reader of key codes away.

/** How far the free look has been dragged from behind the bike, in radians. */
export interface FreeLook {
  yaw: number;
  pitch: number;
}

export interface RideInput {
  /** 1 is full throttle, -1 brakes and then reverses. */
  throttle: number;
  /** -1 steers left, 1 steers right. */
  steer: number;
  /** Shift: the hard brake, whichever way the bike is rolling. */
  hardBrake: boolean;
  /** R: put the bike back on the nearest Road facing along it. */
  reset: boolean;
  /** Where the free look is held, or undefined once the drag is released. */
  look: FreeLook | undefined;
}

/** Hands off the controls. */
export const IDLE: RideInput = { throttle: 0, steer: 0, hardBrake: false, reset: false, look: undefined };

const THROTTLE_KEYS = ['KeyW', 'ArrowUp'];
const BRAKE_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const HARD_BRAKE_KEYS = ['ShiftLeft', 'ShiftRight'];
const RESET_KEYS = ['KeyR'];

function anyHeld(held: ReadonlySet<string>, keys: readonly string[]): boolean {
  return keys.some((key) => held.has(key));
}

/** Read the held keys as a rider's demand. The free look comes from the pointer, not here. */
export function rideInputFromKeys(held: ReadonlySet<string>): Omit<RideInput, 'look'> {
  return {
    throttle: Number(anyHeld(held, THROTTLE_KEYS)) - Number(anyHeld(held, BRAKE_KEYS)),
    steer: Number(anyHeld(held, RIGHT_KEYS)) - Number(anyHeld(held, LEFT_KEYS)),
    hardBrake: anyHeld(held, HARD_BRAKE_KEYS),
    reset: anyHeld(held, RESET_KEYS),
  };
}

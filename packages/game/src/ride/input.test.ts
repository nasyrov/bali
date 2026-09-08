import { describe, expect, it } from 'vitest';
import { rideInputFromKeys } from './input.ts';

const held = (...keys: string[]) => new Set(keys);

describe('the keyboard', () => {
  it('reads the arrows as well as WASD, so nobody has to learn a layout', () => {
    expect(rideInputFromKeys(held('KeyW'))).toEqual(rideInputFromKeys(held('ArrowUp')));
    expect(rideInputFromKeys(held('KeyS'))).toEqual(rideInputFromKeys(held('ArrowDown')));
    expect(rideInputFromKeys(held('KeyA'))).toEqual(rideInputFromKeys(held('ArrowLeft')));
    expect(rideInputFromKeys(held('KeyD'))).toEqual(rideInputFromKeys(held('ArrowRight')));
  });

  it('maps the throttle, the brake and the steering the way round the rider expects', () => {
    expect(rideInputFromKeys(held('KeyW')).throttle).toBe(1);
    expect(rideInputFromKeys(held('KeyS')).throttle).toBe(-1);
    expect(rideInputFromKeys(held('KeyD')).steer).toBe(1);
    expect(rideInputFromKeys(held('KeyA')).steer).toBe(-1);
  });

  it('cancels out when both ends of an axis are held', () => {
    expect(rideInputFromKeys(held('KeyW', 'KeyS')).throttle).toBe(0);
    expect(rideInputFromKeys(held('KeyA', 'KeyD')).steer).toBe(0);
  });

  it('takes Shift for the hard brake and R for the reset, on either Shift key', () => {
    expect(rideInputFromKeys(held('ShiftRight')).hardBrake).toBe(true);
    expect(rideInputFromKeys(held('ShiftLeft')).hardBrake).toBe(true);
    expect(rideInputFromKeys(held('KeyR')).reset).toBe(true);
    expect(rideInputFromKeys(held()).hardBrake).toBe(false);
  });
});

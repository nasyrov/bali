// The browser's half of the controls: held keys and a mouse drag, read once a frame into
// the plain RideInput the World takes. Nothing here decides anything, so nothing here is
// tested; what a key means lives in the ride package.

import { rideInputFromKeys, type FreeLook, type RideInput } from '../ride/input.ts';

/** Radians of free look per pixel dragged. */
const LOOK_SENSITIVITY = 0.004;

export class Controls {
  private readonly held = new Set<string>();
  private dragging = false;
  private look: FreeLook | undefined;

  /** Listen on the window, so a ride keeps its controls wherever the focus went. */
  attach(canvas: HTMLElement): void {
    addEventListener('keydown', (event) => {
      // The arrows and space scroll the page otherwise, which stutters the ride.
      if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
      this.held.add(event.code);
    });
    addEventListener('keyup', (event) => this.held.delete(event.code));
    addEventListener('blur', () => {
      this.held.clear();
      this.dragging = false;
      this.look = undefined;
    });

    canvas.addEventListener('pointerdown', (event) => {
      this.dragging = true;
      this.look = { yaw: 0, pitch: 0 };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointerup', () => {
      this.dragging = false;
      this.look = undefined;
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.dragging || !this.look) return;
      this.look = {
        yaw: this.look.yaw + event.movementX * LOOK_SENSITIVITY,
        pitch: this.look.pitch - event.movementY * LOOK_SENSITIVITY,
      };
    });
  }

  /** What the rider is asking for right now. */
  read(): RideInput {
    return { ...rideInputFromKeys(this.held), look: this.look };
  }

  /** Whether the rider is looking around, which is when the HUD steps out of the way. */
  get freeLooking(): boolean {
    return this.dragging;
  }
}

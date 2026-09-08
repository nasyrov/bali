// The fly camera: a free camera over the island for looking at what the pipeline built. The
// bike and its chase camera arrive with the riding ticket; this one exists so a developer can
// see the world data.
//
// Its position is kept in true world metres and handed to the renderer through the world
// root, so it stays exact however far the flight goes.

import type { WorldPoint } from '@bali-moto/shared';

const SPEED = 120;
const FAST_MULTIPLIER = 4;
const LOOK_SENSITIVITY = 0.0025;
const MIN_ALTITUDE = 2;
const MAX_PITCH = 1.5;

export interface FlyCameraOptions {
  start: WorldPoint;
  altitude: number;
  /** Heading from north, clockwise, in radians. */
  yaw?: number;
  pitch?: number;
}

export class FlyCamera {
  readonly position: WorldPoint & { y: number };
  yaw: number;
  pitch: number;

  private readonly held = new Set<string>();

  constructor(options: FlyCameraOptions) {
    this.position = { x: options.start.x, y: options.altitude, z: options.start.z };
    this.yaw = options.yaw ?? 0;
    this.pitch = options.pitch ?? 0;
  }

  /** Listen for the keys and pointer movement that drive the camera. */
  attach(canvas: HTMLElement): void {
    addEventListener('keydown', (event) => this.held.add(event.code));
    addEventListener('keyup', (event) => this.held.delete(event.code));
    addEventListener('blur', () => this.held.clear());

    canvas.addEventListener('pointerdown', () => canvas.requestPointerLock());
    addEventListener('mousemove', (event) => {
      if (document.pointerLockElement !== canvas) return;
      this.yaw += event.movementX * LOOK_SENSITIVITY;
      this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch - event.movementY * LOOK_SENSITIVITY));
    });
  }

  /** Advance the camera by one frame of held input. */
  update(seconds: number): void {
    const speed = SPEED * (this.held.has('ShiftLeft') ? FAST_MULTIPLIER : 1) * seconds;
    const forward = Number(this.held.has('KeyW')) - Number(this.held.has('KeyS'));
    const strafe = Number(this.held.has('KeyD')) - Number(this.held.has('KeyA'));
    const lift = Number(this.held.has('KeyE') || this.held.has('Space')) - Number(this.held.has('KeyQ'));

    // Headings are measured from north, clockwise, and north is -z.
    this.position.x += (Math.sin(this.yaw) * forward + Math.cos(this.yaw) * strafe) * speed;
    this.position.z += (-Math.cos(this.yaw) * forward + Math.sin(this.yaw) * strafe) * speed;
    this.position.y = Math.max(MIN_ALTITUDE, this.position.y + lift * speed);
  }
}

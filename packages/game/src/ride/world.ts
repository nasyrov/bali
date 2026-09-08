// The World: everything a Ride is, with no renderer, DOM or audio anywhere near it.
//
// It is built from world data and a clock and advanced by tick(input, dt). It owns the bike,
// the chase camera, the ground under them, the index of Roads under the bike and the set of
// chunks a Ride needs loaded; a host feeds it chunk terrain and graphs as they arrive and
// reads the pose back out to draw. Regions, Traffic, weather and the sky all land here in
// later tickets, which is why the tests script rides against this object rather than against
// the browser.

import { DEEP_WATER_DEPTH, RIDE_START, RIDE_START_HEADING, chunkKey } from '@bali-moto/shared';
import type { ChunkId, GraphBlob, TerrainBlob, WorldManifest, WorldPoint } from '@bali-moto/shared';
import { ChunkStream, type StreamingConfig, type StreamingPlan } from '../world/streaming.ts';
import { createBike, stepBike, type BikeState } from './bike.ts';
import { ChaseCamera } from './chaseCamera.ts';
import type { RideInput } from './input.ts';
import { MAX_SEARCH_DISTANCE, RoadIndex, type NearestRoad } from './roadIndex.ts';
import { DEFAULT_LAND_COVER, surfaceOf, type Surface } from './surfaces.ts';
import { TerrainIndex } from './terrain.ts';

/** Wall-clock time, real in the browser and fake in a test. */
export interface Clock {
  /** Milliseconds since the epoch. */
  now(): number;
}

export interface WorldOptions {
  manifest: WorldManifest;
  clock: Clock;
  /** Where the Ride opens; the first one is on Jalan Raya Canggu facing north. */
  start?: { position: WorldPoint; heading: number };
  streaming?: Partial<StreamingConfig>;
  /** The surface off the Roads where no terrain has been loaded to say what is there. */
  landCoverAt?: (point: WorldPoint) => string;
}

const DEFAULT_STREAMING: StreamingConfig = { loadRing: 1, byteBudget: 300_000_000 };

/**
 * How far the tick looks for the Road under the bike, in metres. The widest Road on the
 * island is 12 m, so anything past this is not under anybody; the wide search belongs to the
 * reset, which is the one query that has to reach across a paddy.
 */
const ROAD_UNDERFOOT_REACH = 40;

/** Water shallower than this is ridden through; deeper than this the bike will not go. */
const WADEABLE = 0.1;

/** How far back out of water too deep to ride the bike is nudged, in metres. */
const WATER_NUDGE = 0.6;

export class World {
  readonly bike: BikeState;
  readonly camera: ChaseCamera;

  private readonly roads = new RoadIndex();
  private readonly terrain = new TerrainIndex();
  private readonly stream: ChunkStream;
  private readonly clock: Clock;
  private readonly landCoverAt: (point: WorldPoint) => string;
  private nearest: NearestRoad | undefined;

  constructor(options: WorldOptions) {
    const start = options.start ?? { position: RIDE_START, heading: RIDE_START_HEADING };
    this.clock = options.clock;
    this.landCoverAt = options.landCoverAt ?? (() => DEFAULT_LAND_COVER);
    this.bike = createBike(start.position.x, start.position.z, start.heading);
    this.camera = new ChaseCamera(this.bike);
    this.stream = new ChunkStream(options.manifest, { ...DEFAULT_STREAMING, ...options.streaming });
  }

  /** Bali time, which the sky and the weather will read. */
  get time(): number {
    return this.clock.now();
  }

  /** The Road under the bike, or undefined when the Ride has left the Roads. */
  get road(): NearestRoad | undefined {
    return this.nearest?.onRoad === true ? this.nearest : undefined;
  }

  /** What the HUD shows bottom-left: blank off the Roads, and blank on an unnamed one. */
  get roadName(): string | undefined {
    return this.road?.road.name;
  }

  /**
   * What the bike is riding on: the Road's surface, the water it has waded into, or the land
   * cover of the ground beside the Road.
   *
   * A Road wins over the water, because a Road running along a river bank or fording it is
   * still a Road; the water is what the ground beside it is doing.
   */
  get surface(): Surface {
    if (this.road) return surfaceOf(this.road.road.surface);
    if (this.terrain.waterDepthAt(this.bike) > WADEABLE) return surfaceOf('shallow_water');
    return surfaceOf(this.terrain.surfaceAt(this.bike) ?? this.landCoverAt(this.bike));
  }

  /** How steeply the ground under the bike rises along its heading, per metre travelled. */
  get slope(): number {
    return this.terrain.slopeAlong(this.bike, this.bike.heading);
  }

  /** The chunks a Ride needs loaded right now, most recently wanted last. */
  get streamingSet(): string[] {
    return this.stream.loadedKeys();
  }

  /** Take a chunk's road graph, so the Roads in it answer queries. */
  addGraph(blob: GraphBlob): void {
    this.roads.add(blob);
  }

  /** Forget a chunk's road graph as it unloads. */
  dropGraph(chunk: ChunkId | string): void {
    this.roads.remove(typeof chunk === 'string' ? chunk : chunkKey(chunk));
  }

  /** Take a chunk's ground, so the Ride rides over it rather than over nothing. */
  addTerrain(blob: TerrainBlob): void {
    this.terrain.add(blob);
    this.settleOnTheGround();
  }

  /** Forget a chunk's ground as it unloads. */
  dropTerrain(chunk: ChunkId | string): void {
    this.terrain.remove(chunk);
  }

  /**
   * Put the bike on the nearest graph Road facing along it, which is how a Ride gets out of
   * a ditch. Faces whichever way along the Road is closer to the way it was already going.
   * Returns whether a Road was near enough to reach.
   */
  resetToNearestRoad(): boolean {
    const found = this.roads.nearest(this.bike, MAX_SEARCH_DISTANCE);
    if (!found) return false;

    const turn = Math.cos(found.heading - this.bike.heading);
    this.bike.x = found.point.x;
    this.bike.z = found.point.z;
    this.bike.heading = turn >= 0 ? found.heading : found.heading + Math.PI;
    this.bike.speed = 0;
    this.bike.lean = 0;
    // Found from where the bike was; ask again now it has moved, so the Road it reports is
    // the one it is standing on rather than the one it was hunting for.
    this.nearest = this.roads.nearest(this.bike, ROAD_UNDERFOOT_REACH);
    this.settleOnTheGround();
    this.camera.snapToBike(this.bike);
    return true;
  }

  /** Advance the Ride by one tick, and say which chunks to fetch and which to drop. */
  tick(input: RideInput, dt: number): StreamingPlan {
    if (input.reset) this.resetToNearestRoad();

    // The Road, the surface and the slope are read before the bike moves, so they are the
    // ground the bike rides over this tick rather than the ground it ends up on.
    this.nearest = this.roads.nearest(this.bike, ROAD_UNDERFOOT_REACH);
    const from = { x: this.bike.x, z: this.bike.z };
    stepBike(this.bike, input, this.surface, this.slope, dt);
    this.keepOutOfWhatItCannotRide(from);
    this.settleOnTheGround();
    this.camera.follow(this.bike, input.look, dt);

    return this.stream.update(this.bike, this.bike.heading);
  }

  /** Put the bike on the ground under it, once there is ground to put it on. */
  private settleOnTheGround(): void {
    this.bike.y = this.terrain.heightAt(this.bike) ?? this.bike.y;
  }

  /**
   * Terrace walls and deep water are the two places the island will not let a Ride go: the
   * bike stops where it was and, out of the water, is nudged back the way it came so that it
   * is not left sitting in the shallows waiting to drift in again.
   *
   * A Road is never deep water, however deep the channel it crosses: a Road with no bridge on
   * it is a ford, and the island does not fence a Ride off its own Roads.
   */
  private keepOutOfWhatItCannotRide(from: WorldPoint): void {
    const drowned = !this.road && this.terrain.waterDepthAt(this.bike) > DEEP_WATER_DEPTH;
    if (!drowned && !this.terrain.crossesWall(from, this.bike)) return;

    this.bike.x = from.x;
    this.bike.z = from.z;
    this.bike.speed = 0;

    if (drowned) {
      this.bike.x -= Math.sin(this.bike.heading) * WATER_NUDGE;
      this.bike.z += Math.cos(this.bike.heading) * WATER_NUDGE;
    }
  }
}

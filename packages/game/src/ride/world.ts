// The World: everything a Ride is, with no renderer, DOM or audio anywhere near it.
//
// It is built from world data and a clock and advanced by tick(input, dt). It owns the bike,
// the chase camera, the index of Roads under the bike and the set of chunks a Ride needs
// loaded; a host feeds it chunk graphs as they arrive and reads the pose back out to draw.
// Terrain, Regions, Traffic, weather and the sky all land here in later tickets, which is
// why the tests script rides against this object rather than against the browser.

import { RIDE_START, RIDE_START_HEADING, chunkKey } from '@bali-moto/shared';
import type { ChunkId, GraphBlob, WorldManifest, WorldPoint } from '@bali-moto/shared';
import { ChunkStream, type StreamingConfig, type StreamingPlan } from '../world/streaming.ts';
import { createBike, stepBike, type BikeState } from './bike.ts';
import { ChaseCamera } from './chaseCamera.ts';
import type { RideInput } from './input.ts';
import { MAX_SEARCH_DISTANCE, RoadIndex, type NearestRoad } from './roadIndex.ts';
import { DEFAULT_LAND_COVER, surfaceOf, type Surface } from './surfaces.ts';

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
  /** The surface where there is no Road. Real land cover arrives with the terrain. */
  landCoverAt?: (point: WorldPoint) => string;
}

const DEFAULT_STREAMING: StreamingConfig = { loadRing: 1, byteBudget: 300_000_000 };

/**
 * How far the tick looks for the Road under the bike, in metres. The widest Road on the
 * island is 12 m, so anything past this is not under anybody; the wide search belongs to the
 * reset, which is the one query that has to reach across a paddy.
 */
const ROAD_UNDERFOOT_REACH = 40;

export class World {
  readonly bike: BikeState;
  readonly camera: ChaseCamera;

  private readonly roads = new RoadIndex();
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

  /** What the bike is riding on: the Road's surface, or the land cover beside it. */
  get surface(): Surface {
    return surfaceOf(this.road?.road.surface ?? this.landCoverAt(this.bike));
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
    this.camera.snapToBike(this.bike);
    return true;
  }

  /** Advance the Ride by one tick, and say which chunks to fetch and which to drop. */
  tick(input: RideInput, dt: number): StreamingPlan {
    if (input.reset) this.resetToNearestRoad();

    // The Road is found before the bike moves, so it is the surface the bike rides this tick.
    this.nearest = this.roads.nearest(this.bike, ROAD_UNDERFOOT_REACH);
    stepBike(this.bike, input, this.surface, dt);
    this.camera.follow(this.bike, input.look, dt);

    return this.stream.update(this.bike, this.bike.heading);
  }
}

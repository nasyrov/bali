# 09 — Traffic

**What to build:** Canggu's roads carry scooters, cars, pickups, trucks and bemos driving on the left, filtering, yielding at junctions, stopping behind the player and honking when the player rides against a one-way; density follows road class, Region and the real clock.

**Blocked by:** 07

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Pipeline bakes a traffic base weight per graph edge and marks junction nodes with OSM traffic signals; lane centrelines derived from edges at load time honouring oneway and lanes
- [ ] Traffic worker stepping at 20 Hz: IDM car-following with per-class parameters, class priority with a ~3 s time-to-collision gap rule at a 20–50 m decision point, yield-to-right on equal class, roundabout yield, fixed-cycle signals with random phase where tagged, 15 s deadlock guard
- [ ] Scooter lateral offsets, filtering past slow vehicles, overtaking on gangs, two abreast on wide roads; cars centred; mix ~70/20/5/5; gangs scooters only, trucks and buses tertiary and above
- [ ] Spawn and despawn within ~400 m out of camera view, cap ~80, density times a rush-hour curve on the real clock
- [ ] The player bike is a vehicle in the model: traffic brakes behind it, yields to it, filters past it when slow, swerves and honks against one-way
- [ ] Rendering as one instanced mesh per vehicle type from the kit with wheel spin, riders on scooters, headlights and tail lights at night; Rapier box collider per vehicle following the sim
- [ ] World tests with the worker run inline: vehicles obey oneway, stop behind a stationary bike, no vehicle waits beyond the deadlock guard, count stays under the cap

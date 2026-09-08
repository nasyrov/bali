# 07 — Buildings, temples and collisions

**What to build:** Riding through Canggu the streets are lined with terracotta-roofed houses behind compound walls, shops with awnings on the main roads, and every temple has its split gate and meru towers; hitting a wall bumps and slows the bike and the ride continues.

**Blocked by:** 04

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Pipeline extrudes OSM footprints with heights from tags, else area and land use with deterministic jitter; hip and gable roofs on small rectangular footprints, flat with parapet on large ones; window colour bands per storey; doorway facing the nearest road
- [ ] Compound walls with gates along the road edge of residential footprints; awnings and sign boards on commercial ground floors facing tertiary and above
- [ ] Temple kit (candi bentar, wall, one to three meru, shrine) on every Hindu place of worship, deterministic by footprint size and id, generic extrusion suppressed inside; fixture includes at least one temple
- [ ] Microsoft footprint gap-fill logic in the pipeline for cells under the 0.8 ratio (exercised on a synthetic sparse cell in tests)
- [ ] Building blob per chunk (tier 0) and collider blob; Rapier integrated with the bike as a kinematic character body and chunk colliders created and destroyed with chunks
- [ ] Collision response: push-back, speed cut proportional to impact, camera shake; no fall or respawn; camera boom pulls in when a collider is between camera and bike
- [ ] Contract test: a known temple footprint yields a temple kit and no generic building; World test: riding into a wall stops and pushes back without ending the ride

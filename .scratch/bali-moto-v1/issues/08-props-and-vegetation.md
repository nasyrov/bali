# 08 — Props and vegetation

**What to build:** Canggu's roadsides fill with palms, banana plants, penjor poles, shrines, warungs, power poles, lamps, parked scooters and, on the coast, jukung boats and loungers; palm fronds sway with the wind.

**Blocked by:** 07

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Asset kit as glTF with a manifest entry per file (name, author, licence, URL): CC0 pack pieces recoloured to the palette plus hand-modelled Bali pieces; build fails when a kit file lacks an entry
- [ ] Deterministic rule-based scatter in the pipeline: density table per land-cover class, road-edge rules per class, hash of chunk id and cell, avoidance of ribbons, footprints, water, terrace walls and Landmark footprints, honouring mapped tree points
- [ ] Full density within ~80 m of roads and in tier 0; interiors at a third with merged instances
- [ ] Parked scooters along gangs and outside warungs, parked cars on residential streets, with colliders
- [ ] Props blob per chunk; runtime batches props per material with a simplified mesh beyond 60 m; simple colliders on trunks, walls, lamps, poles, parked vehicles, boats
- [ ] Vertex-shader wind on fronds, leaves and banners with an amplitude input (constant until the weather ticket)
- [ ] Contract test: scatter output for the fixture is identical across two builds and places nothing on road ribbons or inside footprints

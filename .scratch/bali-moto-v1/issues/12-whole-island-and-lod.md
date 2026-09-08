# 12 — Whole island and level of detail

**What to build:** One command builds the whole island's world data in under an hour and rebuilds only changed chunks afterwards; the player can ride from Canggu to Kintamani with roads, terrain, buildings and props streaming in three tiers under the haze, and the total data stays within budget.

**Blocked by:** 08, 11

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Full-island pipeline run from the Geofabrik extract clipped to the island relation; incremental rebuilds by content hash of each chunk's inputs (tested on the fixture: unchanged inputs write nothing)
- [ ] Three tiers baked per chunk: roads (full / 1 m simplified without gangs and Paths / tertiary-and-above at 5 m), terrain (30 / 60 / 120 m grids nesting), buildings (full / merged boxes / none but Landmarks), props (full / large vegetation billboards / none)
- [ ] Global bundle: manifest with Copernicus tile ids and extract timestamp, Region raster and table, Landmark table, weather sample points, tier-2 island silhouette, asset kit
- [ ] Streaming rings 1.5 / 4 / 9 km with unload one chunk further, nearest-and-ahead ordering, 300 MB byte budget with LRU eviction
- [ ] Size report from the build: total compressed under ~400 MB and global bundle plus the Canggu near ring under 15 MB, or the build warns
- [ ] World test: the streaming set for a position and heading is the expected tier-0, tier-1 and tier-2 chunk ids and unloads with hysteresis

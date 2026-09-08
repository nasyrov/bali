# 11 — Landmarks

**What to build:** Reaching Tanah Lot, Uluwatu temple, Ulun Danu Bratan, Besakih, the Handara gate, the Lempuyang gates or the airport, the player sees a recognisable bespoke model where generic buildings would otherwise stand.

**Blocked by:** 07

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Checked-in Landmarks file (name, OSM anchor id, model asset, yaw, optional label); pipeline places each on the terrain at its footprint, suppresses generic buildings inside, and fails loudly on a missing id
- [ ] Seven bespoke low-poly models in the kit with licence entries; the airport built from aeroway tags (runway, apron, terminal box) with parked planes as props
- [ ] Volcanoes, lakes and beaches as terrain plus label entries; Landmark table in the global bundle; Landmarks visible from all tiers
- [ ] World exposes Landmark proximity (within ~150 m) for the discovery ticket
- [ ] Contract test on a fixture Landmark: model placed at the footprint and no generic building inside it

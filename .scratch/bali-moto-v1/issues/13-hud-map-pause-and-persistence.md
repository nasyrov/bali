# 13 — HUD, map, pause and persistence

**What to build:** The ride screen shows the Region label and road name, the Bali clock, speed and a rotating minimap in the minimal editorial style; M opens a full-screen island map with visited Regions shaded; Esc opens a pause menu with discovery counts, a volume slider, credits and start fresh; closing the tab and reopening resumes the ride.

**Blocked by:** 05

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] HUD elements and style per the spec, fading during free look; minimap ~160 px rotating with heading showing graph roads within ~800 m, faint Region borders, Landmarks and the bike
- [ ] Full-screen map from the tier-2 network (or whatever tiers exist) and Region polygons with position, visited shading, Landmark marks, Region names at anchors, mouse pan and zoom, no teleport
- [ ] Pause menu: resume, map, "regions visited N of 45", "landmarks seen N of 7", master volume slider, quality override placeholder, credits placeholder, start fresh with confirmation
- [ ] Persistence: position, heading, visited Region and Landmark ids saved to localStorage on an interval and on page hide in a versioned format; Region visited on debounce commit, Landmark within ~150 m
- [ ] Loading screen with the island silhouette, near-ring progress, "press any key to ride" and the two mandatory attribution lines
- [ ] World tests: saved state round-trips; a version bump discards incompatible state; visited counts increment exactly once per Region

# Grilling: buildings and landmarks

Type: grilling
Status: resolved
Blocked by: 05, 07
Map: ../map.md

## Question

How are buildings and landmarks represented?

Decide extrusion rules for OSM footprints (height from tags or by area and land use), low-poly roof and colour treatment, what happens where OSM has no buildings, and the initial landmark list (Tanah Lot, Uluwatu temple, Tegallalang terraces, Mount Batur and Agung, Besakih, Ulun Danu Bratan, Kuta beach…) with how each is modelled: hand-made, procedural, or a simple marker.

## Answer

**Footprints**: OSM `building=*` polygons island-wide (about 1.64 M), gap-filled with Microsoft Global ML footprints in 0.25 degree cells where the OSM to Microsoft ratio is under 0.8 (Jembrana, Gilimanuk, interior Gianyar, Bangli and Kintamani), skipping any Microsoft footprint overlapping an OSM one. Both are ODbL-compatible and credited.

**Heights**: `height` and `building:levels` tags win when present (under 0.3% of footprints). Otherwise by footprint area and land use: under 60 m² one storey at 3 m; 60 to 200 m² one or two storeys; over 200 m² in commercial or retail land use two to three storeys; footprints with tourism or hotel tags up to four storeys. A hash of the OSM id jitters height by about ±15% and picks wall tint so streets are not uniform. Deterministic, so a chunk always rebuilds the same.

**Roofs**: footprints up to about 200 m² and roughly rectangular get a low-poly hip or gable roof in the terracotta palette colour, ridge along the footprint's longest edge; larger or irregular footprints get flat roofs with a parapet.

**Detail**: a darker colour band per storey suggests windows and becomes the emissive glow at night; a doorway faces the nearest road. Residential footprints get a low compound wall with a gate along their road edge, solid to the bike, which gives gangs their canyon feel. Ground floors of buildings in commercial or retail land use facing tertiary-or-above roads get a slab awning and a sign board.

**Temples**: every `amenity=place_of_worship` + `religion=hindu` feature (2,132) is built from a procedural kit: candi bentar split gate facing the road, compound wall, one to three meru towers and a shrine, assembled deterministically from footprint size and OSM id; bigger footprints get more towers. Generic building extrusion is suppressed inside temple footprints.

**Landmarks**: a checked-in landmarks file with name, OSM anchor id, model asset, yaw and optional label. Bespoke low-poly models for Tanah Lot, Uluwatu temple, Ulun Danu Bratan, Besakih, the Handara gate and the Lempuyang gates; Ngurah Rai airport from OSM aeroway tags (runway, apron, terminal box) with parked planes as props. Volcanoes, lakes and beaches are terrain plus a label. The pipeline places each model on the terrain at its footprint and suppresses generic buildings inside it.

**Level of detail**: tier 0 has roofs, colour bands, compound walls, awnings and colliders; tier 1 merges footprints into flat-roofed boxes with no colliders or walls; tier 2 has no buildings except landmark models. Landmarks are visible from all tiers.

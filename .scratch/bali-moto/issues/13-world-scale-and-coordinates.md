# Grilling: world scale and coordinate system

Type: grilling
Status: resolved
Blocked by: 03
Map: ../map.md

## Question

What is the game world's unit and origin, and is the island rendered at real-world scale?

Decide the metric projection (UTM zone 50S or a local transverse Mercator centred on Bali), whether distances are 1:1 or compressed (real Bali is about 150 km across, a 60 km/h ride from Kuta to Ubud is 45 minutes), the floating-origin strategy from the three.js research, and how latitude/longitude map to game coordinates in one function everything shares.

## Context from the bike handling ticket

Handling numbers (90 km/h top speed, region changes every minute or two in the south, Kuta to Ubud in about 25 minutes) were chosen assuming 1:1 scale. If this ticket compresses distances, the handling ticket's speeds must be revisited.

## Answer

**Scale**: 1:1. One game unit is one metre. No compression of distances; the handling, traffic and width decisions stand as made.

**Projection**: UTM zone 50S on WGS84 (EPSG:32750) for both the pipeline and the runtime. World coordinates are UTM easting and northing minus a fixed island-centre offset chosen as round numbers near the island centre (lat -8.45, lon 115.07 projects to E 287,517, N 9,065,427):

- `E0 = 287,500`, `N0 = 9,065,500`
- world x = easting - E0 (east positive)
- world z = N0 - northing (south positive, so the frame stays right-handed with y up)
- world y = elevation above the ellipsoid in metres from the DEM

The island then spans roughly x from -70 km (Gilimanuk) to +63 km (Amed) and z from -36 km (Singaraja) to +42 km (Uluwatu), all well inside the precision budget once geometry is chunk-local. Reprojection happens once in the pipeline (GDAL for the DEM, a projection library or the standard UTM series for OSM coordinates); the runtime never sees longitude and latitude except in the regions file and debug tools. One shared function `lonLatToWorld` and its inverse live in a small package used by both.

**Axes and units**: three.js default Y-up, right-handed. x east, y up, z south. Metres everywhere; headings measured from north, clockwise, converted at the edges.

**Chunks and floating origin**: a fixed 1 km grid aligned to the world origin. Chunk (i, j) covers x in [i·1000, (i+1)·1000) and z in [j·1000, (j+1)·1000), with all vertex, instance and collider data stored relative to the chunk centre, and the chunk group positioned in doubles. A `worldRoot` group is rebased whenever the camera drifts more than 2 km from the render origin; game logic keeps true world positions in doubles and converts with the current origin offset. Roughly 140 by 90 chunk cells cover the island's bounding box, of which about 5,700 contain land.

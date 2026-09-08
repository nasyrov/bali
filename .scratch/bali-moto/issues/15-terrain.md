# Grilling: terrain

Type: grilling
Status: resolved
Blocked by: 02, 13
Map: ../map.md

## Question

How does the island's terrain work?

Decide the elevation sampling resolution for the terrain mesh, how roads are draped onto terrain without floating or sinking (and whether the terrain is flattened under roads), how steep volcano slopes look in low-poly, ground colouring from land use, the sea level and coastline treatment, and how terrain is tiled alongside roads.

## Answer

**Source and resolution**: Copernicus DEM GLO-30 (decided in the elevation research), reprojected to UTM 50S by GDAL in the pipeline. Heights are 1:1, no vertical exaggeration.

**Mesh**: per chunk, a 34 by 34 vertex grid at 30 m spacing (about 2,200 flat-shaded triangles) for the near tier; 60 m for the middle tier and 120 m for the far tier, matching the three road tiers. Tier boundaries share edge vertices by construction (grids nest), so no skirts are needed between tiers of the same chunk; between neighbouring chunks at different tiers the coarser edge is used on both sides.

**Road draping**: the pipeline first smooths each road's centreline height along its length, then pulls every terrain vertex within the road's width plus a 6 m margin toward that height (full weight under the road, feathered over the margin), and only then samples road vertex heights from the flattened grid. Roads therefore define the ground: no floating, no sinking, no cross-slope lean.

**Ground colour**: one land-cover class per terrain vertex, rasterised from OSM landuse, natural and leisure polygons (farmland as paddy, wood and forest merged, scrub, orchard, residential and commercial as built ground, water, mangrove, beach) with a raster land-cover fallback for the unmapped countryside; the vertex colour is the golden-hour palette entry for that class, flat-shaded, one material, no textures. Blending between classes is per vertex only.

**Terraces**: where land cover is farmland and slope exceeds about 8 degrees, height is quantised into steps of about 1.5 m with a short vertical wall, so Tegallalang, Jatiluwih and the Sidemen valley read as terraces. Flat farmland stays flat. Terrace walls are solid to the bike (from the handling ticket); the props ticket decides how walls are dressed.

**Rivers**: OSM waterway lines (river, stream, canal) cut a channel about 2 m deep within roughly 4 m of the line, with a water-coloured ribbon at the bottom; bridges already span them from the road ticket. Lakes (Batur, Bratan, Buyan, Tamblingan) are water polygons at their DEM height.

**Sea and coast**: terrain exists only inside the OSM land polygons; the sea is one large flat plane at height 0 with a slow animated colour shimmer, no waves or depth model. A sand strip about 8 m wide is synthesised along the coastline where no beach polygon exists; mapped beaches use their polygons. Cliffs come straight from the DEM. Riding into water behaves as decided in the handling ticket.

**Runtime height query**: each loaded chunk keeps its post-flattening height grid in memory; height and slope at any point come from a bilinear lookup on that grid. No raycasting. The same grid drives the bike, prop placement and traffic.

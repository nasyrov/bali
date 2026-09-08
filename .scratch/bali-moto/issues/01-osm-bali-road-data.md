# Research: OpenStreetMap road data for Bali

Type: research
Status: resolved
Blocked by: 
Map: ../map.md

## Question

What is the best way to obtain the complete road network of Bali from OpenStreetMap, and what does that data look like?

Cover: which extract to use (Geofabrik Indonesia sub-region, BBBike custom extract, Overpass with a bounding box or the Bali admin relation) and its size; which `highway=*` classes exist in Bali and roughly in what proportion; which useful tags are present (lanes, width, surface, oneway, bridge, tunnel, maxspeed, name, lit); how to clip to the island and convert to GeoJSON or a compact binary (osmium, osmtogeojson, osm2geojson); update cadence; and the ODbL attribution obligations for a game. Cite primary sources. Write findings to `docs/research/osm-bali-road-data.md`.

## Answer

- Geofabrik has no Bali extract; Bali sits inside the `asia/indonesia/nusa-tenggara` sub-region (167 MB PBF, rebuilt daily, verified against the `.poly`). Use that, clipped offline with `osmium extract -p` to the province relation 1615621 (fetch `api/0.6/relation/1615621/full`); island-only relation is 2130352. SliceOSM is the fallback for a polygon PBF without the big download.
- Overpass (area id 3601615621) is fine for exploration only: fair use forbids app backends (~10k req / 1 GB per day) and the server dropped connections during research.
- Bali province has ~149k `highway` ways over ~1.21M nodes; 92.5% are drivable classes. Residential 53%, service 14%, living_street 13% (gang lanes, essential), path 4%, unclassified 4%, track 4%, tertiary 2%, trunk 1%, secondary <1%; motorway = the Mandara toll road only.
- Tag coverage is thin: surface 26% (asphalt / paving_stones / concrete dominate), name 16%, motorcycle 8.5% (mostly `yes` on paths), oneway 6%, width 6%, lanes 5%, bridge 2%, maxspeed/lit/tunnel <0.5%. Default lanes/width/speed/lit per class.
- Pipeline: `osmium extract` -> `osmium tags-filter w/highway` -> `osmium export` (geojsonseq, tag whitelist) -> custom typed-array binary (~10 MB raw, <5 MB gzipped) or FlatGeobuf for range-request streaming. Rebuild as a versioned artifact per release.
- ODbL: the game is a Produced Work; the road pack is a trivial transformation, so only attribution (`© OpenStreetMap contributors` linked to openstreetmap.org/copyright on the loading screen and in credits, plus a pointer to the source snapshot) is required, no publishing of the pack unless external or hand-edited data is merged in.

Findings: [../../../docs/research/osm-bali-road-data.md](../../../docs/research/osm-bali-road-data.md)

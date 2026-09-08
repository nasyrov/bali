# Research: OSM buildings, land use, and landmarks in Bali

Type: research
Status: resolved
Blocked by: 
Map: ../map.md

## Question

How complete is OpenStreetMap coverage of buildings, land use, coastline, and landmarks in Bali, and what can we derive from it for a low-poly world?

Cover: building footprint completeness across south Bali versus rural areas; `landuse`, `natural`, and `leisure` tags for rice paddies, forest, beaches, and water; the coastline data source; how temples, beaches, and viewpoints are tagged (amenity=place_of_worship with religion=hindu, natural=beach, tourism=*); and OSM `place=*` nodes and boundaries for named areas like Canggu, Seminyak, Ubud to seed the hand-curated region list. Cite primary sources. Write findings to `docs/research/osm-bali-buildings-landuse.md`.

## Answer

Findings: [docs/research/osm-bali-buildings-landuse.md](../../../docs/research/osm-bali-buildings-landuse.md).

- Buildings: OSM has 1.66M footprints in Bali, 99% `building=yes`. Against Microsoft's ML footprints the island-wide ratio is 0.98; south Bali, Denpasar, Tabanan, Singaraja and the east coast are at 0.9-1.7, but Jembrana/Negara (0.33), Gilimanuk (0.74), interior Gianyar/Bangli (0.71) and south Nusa Penida (0.69) have gaps. Use OSM everywhere and gap-fill those cells from Microsoft (ODbL) or Google Open Buildings.
- Land cover: only 213 of 4,032 `landuse=farmland` polygons carry `crop=rice`; treat all Bali farmland as paddy by default. Forest is `natural=wood` (2,084) far more than `landuse=forest` (147); merge the two. Beaches: 156 `natural=beach` (71 named), several famous ones node-only, so synthesise a beach strip along the coastline as fallback. Water: 597 `natural=water`, 2,858 villa pools.
- Coastline: take `land-polygons-split-4326.zip` from osmdata.openstreetmap.de (built from `natural=coastline`, land on the left) and derive the sea by complement.
- Landmarks: temples are `amenity=place_of_worship` + `religion=hindu` (2,132; `building=temple` appears only 40 times), viewpoints `tourism=viewpoint` (317), attractions `tourism=attraction` (351), three `natural=volcano` nodes (Agung, Batur, Batukaru) plus named peaks.
- Admin levels in Bali: 4 provinsi (rel 1615621), 5 kabupaten (9), 6 kecamatan (57), 7 desa/kelurahan (716, complete), nothing below.
- Regions: the 2025 `place=*` nodes mirror the desa hierarchy and miss Uluwatu, Nusa Dua, Lovina, Berawa, Bingin, Umalas, Petitenget; use desa/kecamatan relations as the geometric backbone and the seed list in the findings file (about 45 names with OSM ids) as anchors, hand-placing the missing tourist names.

# Task: download the Bali OSM extract and report what is in it

Type: task
Status: resolved
Blocked by: 01
Map: ../map.md

## Question

Download the Bali road network chosen in the OSM research ticket, clip it to the island, and report the facts later decisions need: file sizes at each stage, count of ways per `highway` class, total road length per class, how many ways carry lanes/width/surface/oneway tags, node count, and a sample GeoJSON of a Canggu bounding box for the road prototype. Store the raw and processed data under `data/` and the report under `docs/research/bali-osm-inventory.md`.

## Answer

Done. Installed osmium-tool 1.19.1 with Homebrew, downloaded the Geofabrik Nusa Tenggara extract (175.7 MB, replication timestamp 2026-09-07, md5 verified) into `data/raw/`, clipped it to the Bali **island** relation 2130352 (Nusa Penida excluded, per Out of scope) and filtered to highway ways in `data/processed/`. The whole clip-and-filter takes about five seconds.

Key facts: 146,707 road ways, 1,355,431 coordinates, 25,548 km of centreline. Residential is 54% of ways and 39% of km; residential, living_street and service together are 81% of ways. The main network (motorway to tertiary) is only 3,895 km, and Bali tags main roads mostly as trunk and tertiary, not primary. Path, track, footway and steps are 17% of km. Tags are sparse: surface 26%, name 16%, oneway 6%, width 6% (median 2 m, almost only on gangs), lanes 5%, maxspeed and lit under 0.5%. Surface values are asphalt, paving_stones, concrete, unpaved in that order. A Canggu sample (5,804 ways, 1.7 MB GeoJSON) is at `data/processed/canggu-roads.geojson` for the real-roads prototype. The island clip also contains 1.64 M building ways.

Full report with tables: [docs/research/bali-osm-inventory.md](../../../docs/research/bali-osm-inventory.md). Inventory script: `scripts/osm-inventory.mjs`. Export whitelist: `data/export-config.json`. Bulk data is gitignored.

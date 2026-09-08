# Bali OSM road inventory

Produced by the wayfinder task "download the Bali OSM extract and report what is in it" on 2026-09-08. Numbers are measured from the files below with `scripts/osm-inventory.mjs`, not cited from elsewhere. Pipeline follows the recommendation in [osm-bali-road-data.md](./osm-bali-road-data.md).

## Files

| Stage | File | Size |
|---|---|---:|
| Geofabrik extract, `asia/indonesia/nusa-tenggara-latest.osm.pbf`, replication timestamp 2026-09-07T20:21:20Z, md5 verified | `data/raw/nusa-tenggara-latest.osm.pbf` | 175.7 MB |
| Bali island boundary, relation 2130352 (`place=island`, multipolygon of 128 coastline ways), from `api/0.6/relation/2130352/full` | `data/raw/bali-island-2130352.osm` | 2.1 MB |
| Bali province boundary, relation 1615621 (not used for the clip; kept for reference) | `data/raw/bali-province-1615621.osm` | 16 KB |
| Island clip, `osmium extract -p <island> -s complete_ways` | `data/processed/bali-island.osm.pbf` | 52.7 MB |
| Highway ways only, `osmium tags-filter w/highway` | `data/processed/bali-roads.osm.pbf` | 11.7 MB |
| GeoJSONSeq export with tag whitelist (`data/export-config.json`) | `data/processed/bali-roads.geojsonseq` | 54.0 MB (11.6 MB gzipped) |
| Canggu sample, bbox 115.11,-8.68 to 115.17,-8.62, GeoJSON FeatureCollection | `data/processed/canggu-roads.geojson` | 1.7 MB |

The clip uses the **island** relation, not the province, because Nusa Penida, Lembongan and Ceningan are out of scope on the map. Clip and filter each take about two seconds on an M-series Mac; osmium-tool 1.19.1 was installed with Homebrew for this.

Island clip totals: 8,791,038 nodes, 1,819,403 ways, 2,426 relations. Of those ways, 1,635,483 carry a `building` tag (plus 205 building relations), which matches the near-complete building coverage found in [osm-bali-buildings-landuse.md](./osm-bali-buildings-landuse.md).

## Road network

**146,707 ways, 1,355,431 coordinates, 25,548 km of centreline.** Longest single segment between two nodes is 1,597 m (a straight rural stretch), so nothing needs subdividing for precision but long segments will need subdividing to follow terrain.

| highway | ways | share of ways | km | share of km | avg m per way |
|---|---:|---:|---:|---:|---:|
| residential | 78,443 | 53.5% | 10,068 | 39.4% | 128 |
| unclassified | 5,570 | 3.8% | 3,979 | 15.6% | 714 |
| tertiary | 3,320 | 2.3% | 2,380 | 9.3% | 717 |
| track | 5,318 | 3.6% | 2,209 | 8.6% | 415 |
| path | 6,279 | 4.3% | 1,656 | 6.5% | 264 |
| living_street | 18,890 | 12.9% | 1,651 | 6.5% | 87 |
| service | 21,061 | 14.4% | 1,604 | 6.3% | 76 |
| trunk | 1,584 | 1.1% | 721 | 2.8% | 455 |
| secondary | 1,136 | 0.8% | 660 | 2.6% | 581 |
| footway | 3,704 | 2.5% | 387 | 1.5% | 104 |
| primary | 236 | 0.2% | 101 | 0.4% | 429 |
| steps | 667 | 0.5% | 33 | 0.1% | 50 |
| motorway | 33 | 0.0% | 33 | 0.1% | 993 |
| proposed | 6 | 0.0% | 24 | 0.1% | 4,083 |
| pedestrian | 56 | 0.0% | 12 | 0.0% | 210 |
| trunk_link | 197 | 0.1% | 9 | 0.0% | 46 |
| cycleway | 21 | 0.0% | 6 | 0.0% | 268 |
| raceway | 10 | 0.0% | 4 | 0.0% | 421 |
| construction | 32 | 0.0% | 4 | 0.0% | 118 |
| motorway_link | 11 | 0.0% | 2 | 0.0% | 147 |
| secondary_link | 38 | 0.0% | 1 | 0.0% | 30 |
| corridor | 34 | 0.0% | 1 | 0.0% | 33 |
| tertiary_link | 40 | 0.0% | 1 | 0.0% | 19 |
| bridleway | 1 | 0.0% | 1 | 0.0% | 700 |
| rest_area | 1 | 0.0% | 0 | 0.0% | 379 |
| primary_link | 19 | 0.0% | 0 | 0.0% | 14 |

Reading this for the road-representation decision:

- **Residential alone is 40% of all kilometres and 54% of ways.** Together with living_street and service, the small stuff is 81% of ways and 52% of km. Rendering "all roads" means these, not the trunk network.
- **The through network is small.** Motorway, trunk, primary, secondary and tertiary together are 3,895 km, about 15% of the total, in 6,309 ways. Note Bali tags its main roads as `trunk` and `tertiary` far more than `primary`; `primary` is only 101 km.
- **Non-car classes are a real share**: path, track, footway, steps and pedestrian sum to 4,297 km (17%). Path and track are mostly rural and rideable on a scooter in practice; footway and steps are mostly beach and temple access.
- **Ways are short.** Median-ish 128 m for residential and 76 m for service means the road graph will have a very high node degree density in south Bali; the Canggu sample below has 5,804 ways in a 6.6 km by 6.6 km box.

## Tag coverage

| tag | ways with tag | share |
|---|---:|---:|
| surface | 38,806 | 26.5% |
| name | 23,497 | 16.0% |
| motorcycle | 12,654 | 8.6% |
| oneway | 9,406 | 6.4% |
| width | 9,331 | 6.4% |
| access | 7,719 | 5.3% |
| lanes | 7,063 | 4.8% |
| layer | 3,089 | 2.1% |
| bridge | 3,013 | 2.1% |
| smoothness | 1,680 | 1.1% |
| ref | 1,629 | 1.1% |
| motor_vehicle | 947 | 0.6% |
| maxspeed | 489 | 0.3% |
| lit | 434 | 0.3% |
| junction | 186 | 0.1% |
| tunnel | 116 | 0.1% |

Value distributions:

- `surface`: asphalt 15,706; paving_stones 12,068; concrete 4,491; unpaved 3,285; paved 1,197; dirt 605; ground 592; gravel 252. Paving stones are the classic Balinese gang surface and worth a distinct look.
- `oneway`: yes 5,436; no 3,968; one `-1`. Only 5,436 confirmed one-way ways on the whole island.
- `lanes`: 2 (4,768), 1 (1,997), 3 (169), 4 (116). Where tagged, the island is overwhelmingly one lane per direction.
- `width`: 9,331 values, 10th percentile 1 m, median 2 m, 90th percentile 3 m. Width is tagged almost exclusively on narrow gangs, so it cannot be used to size main roads.
- `maxspeed`: 489 values, mostly 20 to 60 km/h. Useless as a data source; speeds must be per class.
- `motorcycle`: 10,947 of the 18,890 living_street ways are explicitly `motorcycle=yes`; `service:no` (296) is mostly hotel and villa driveways; `path:yes` (225) and `track:yes` (27) confirm scooters use those.

## Canggu sample

`data/processed/canggu-roads.geojson`, bbox 115.11,-8.68 to 115.17,-8.62 (Pererenan and Tumbak Bayuh in the north-west to Petitenget and Batu Belig in the south-east). 5,804 features, 32,818 coordinates. Classes: residential 2,916; living_street 1,739; service 639; footway 166; tertiary 134; path 78; secondary 42; unclassified 38; track 33; steps 10; primary 6; single tertiary_link, pedestrian and primary_link. 1,640 features are named, including Jalan Raya Canggu, Jalan Pantai Berawa, Jalan Petitenget, Jalan Batu Belig and Jalan Nelayan. This is the input for the real-roads prototype.

## Facts later tickets depend on

- Road pack raw material is 146.7k ways and 1.36M coordinates for the island; the sub-5 MB gzipped binary estimate in the roads research stands, since GeoJSONSeq with only the whitelisted tags is already 11.6 MB gzipped.
- Rebuild is `curl` of one 176 MB file plus three osmium commands and one export; a `Makefile` or npm script can reproduce `data/processed/` in under a minute given the raw file.
- The raw and processed PBF and GeoJSONSeq files are ignored from version control via `.gitignore`; only the Canggu sample and the export config are meant to be committed.

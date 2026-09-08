# OpenStreetMap road data for Bali

Research for ticket `.scratch/bali-moto/issues/01-osm-bali-road-data.md`. Date: 2026-09-08. All counts below were measured on 2026-09-08 against the public Overpass instance (data timestamp `2026-09-08T16:17:51Z`, areas timestamp `2026-09-07T14:50:02Z`); they drift daily, so treat them as order-of-magnitude.

## 1. Identifiers for "Bali"

Two OSM objects matter (looked up via Nominatim, `https://nominatim.openstreetmap.org/search?q=Bali,%20Indonesia&format=json`):

| Object | Relation id | Overpass area id | Bounding box (S, W, N, E) | Notes |
|---|---|---|---|---|
| Province of Bali, `boundary=administrative` | **1615621** | **3601615621** | -9.0502, 114.4127, -7.4628, 115.8324 | Includes Nusa Penida, Lembongan, Ceningan and the maritime boundary (hence the bbox reaching -7.46 N). |
| Pulau Bali, `place=island` | 2130352 | 3602130352 (untested; the query failed on a server error) | -8.8500, 114.4316, -8.0616, 115.7115 | Main island only. |

The Overpass area id is the relation id + 3 600 000 000: "By convention the area id can be calculated from an existing OSM relation by adding 3600000000" (https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL). Areas are generated for relations with `admin_level`+`name` and `type=multipolygon`+`name`, and the area generator loops continuously, each run taking 4-12 hours (https://wiki.openstreetmap.org/wiki/Overpass_API/Areas). The province area id 3601615621 works today (all counts below use it).

The full province boundary geometry can be fetched from the main API with `GET https://www.openstreetmap.org/api/0.6/relation/1615621/full`, which returns the relation, its member ways and their nodes (https://wiki.openstreetmap.org/wiki/API_v0.6). That file is what you feed to `osmium extract -p` (see section 5).

## 2. Which extract to use

### 2.1 Geofabrik

- There is **no Bali extract** on Geofabrik: `https://download.geofabrik.de/asia/indonesia/bali.html` returns 404. The Indonesia page lists only seven sub-regions: Java (854 MB), Sumatra (269 MB), Nusa-Tenggara (167 MB), Sulawesi (150 MB), Kalimantan (140 MB), Papua (34.3 MB), Maluku (25.4 MB); the whole-Indonesia PBF is 1.6 GB (https://download.geofabrik.de/asia/indonesia.html).
- Bali lives inside the **Nusa-Tenggara** sub-region. The page does not say so, but I tested Denpasar, Singaraja, Gilimanuk, Amed and Nusa Penida against the clipping polygons: all five are inside `https://download.geofabrik.de/asia/indonesia/nusa-tenggara.poly` and outside `https://download.geofabrik.de/asia/indonesia/java.poly`.
- `nusa-tenggara-latest.osm.pbf` is **167 MB** (shp.zip 438 MB, gpkg.zip 444 MB), has a `.poly`, `.md5`, and a daily `.osc.gz` updates directory (https://download.geofabrik.de/asia/indonesia/nusa-tenggara.html).
- Cadence and caveats (https://download.geofabrik.de/technical.html): extracts are rebuilt daily at about 21:00 CET; the `user`, `uid` and `changeset` fields are stripped from the public files (since 2018-05-03, GDPR); a local copy can be kept current with `pyosmium-up-to-date myfile.osm.pbf`; daily diffs are kept for 100 days; features crossing a region border are kept complete, so extracts can contain more than the polygon.

### 2.2 BBBike

- No ready-made Bali or Denpasar city extract exists in the pre-built list (https://download.bbbike.org/osm/bbbike/).
- The custom extract service (https://extract.bbbike.org/, help at https://extract.bbbike.org/extract.html) takes a drawn rectangle or polygon, limits requests to 24 000 000 km² or 1500 MB, updates its planet daily, typically takes 2-7 minutes, delivers by email link, and offers PBF, OSM XML, Shapefile, GeoPackage, GeoJSON, SQLite, GeoParquet, MBTiles/PMTiles, Garmin and others. Commercial use is pushed to the paid "Extract Pro" (from EUR 120/month).
- Useful as a one-off convenience; not scriptable and not something to depend on for a pipeline.

### 2.3 SliceOSM (OpenStreetMap US, ex-Protomaps Extracts)

- https://slice.openstreetmap.us/ is "a free, open-source Web service for generating and downloading geographic extracts of OSM data in PBF Format", built on minutely-updated OSM data (https://wiki.openstreetmap.org/wiki/SliceOSM). Good alternative to Geofabrik when you want a polygon-shaped PBF without downloading Nusa-Tenggara first.

### 2.4 Overpass API

- Main public instance `https://overpass-api.de/api/interpreter`; mirrors `https://maps.mail.ru/osm/tools/overpass/api/interpreter` and `https://overpass.private.coffee/api/interpreter` (https://wiki.openstreetmap.org/wiki/Overpass_API).
- Fair use: "users are expected to send a maximum of about 10000 requests per day and keep their download volume below about 1 GB per day"; "Setting up an app for more than just OSM mappers and relying on the public instances as backend" is explicitly named as misuse (https://dev.overpass-api.de/overpass-doc/en/preface/commons.html). The wiki adds that a regular application should stay around 100 queries / 10 MB per day and back off 30 s on HTTP 429 (https://wiki.openstreetmap.org/wiki/Overpass_API).
- Defaults: `[timeout:]` 180 s, `[maxsize:]` 536 870 912 bytes (512 MB); `[bbox:south,west,north,east]` sets a global bbox; `out count;` returns only counts (https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL).
- Query by admin relation, roads only, with geometry attached to ways so no separate node download is needed:

  ```
  [out:json][timeout:300][maxsize:1073741824];
  area(3601615621)->.a;
  way(area.a)[highway];
  out geom;
  ```

  Or the classic form that osmtogeojson / osm2geojson expect: `way(area.a)[highway]; (._;>;); out meta;` ("`(._;>;)` takes the union of the element and its nodes", https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL).
- During this research the main instance twice returned dispatcher errors / dropped connections on cheap count queries, which is a reminder that Overpass is fine for an offline build step and unsuitable at runtime.

### 2.5 Sizes

Measured: the province contains **149 307 `highway=*` ways over 1 214 956 nodes** (138 076 ways / 1 124 966 nodes for the drivable classes, section 3). Size estimates derived from those counts, not measured downloads:

| Form | Rough size |
|---|---|
| Nusa-Tenggara PBF (input) | 167 MB (measured, Geofabrik) |
| Bali-only PBF, all tags | ~25-40 MB |
| Bali highways-only PBF | ~12-20 MB |
| Overpass JSON/XML of highways with nodes | ~150-250 MB |
| GeoJSON LineStrings, trimmed properties | ~40-60 MB (~8-12 MB gzipped) |
| Compact binary (FlatGeobuf/geobuf or a custom typed-array pack) | ~10-20 MB (~5-8 MB gzipped) |

## 3. Highway classes present in Bali (province, 2026-09-08)

Query: `area(3601615621)->.a; way(area.a)[highway]->.h;` then `way.h[highway=X]; out count;` per class on https://overpass-api.de/api/interpreter.

| `highway=` | ways | share of 149 307 |
|---|---|---|
| residential | 79 934 | 53.5 % |
| service | 21 207 | 14.2 % |
| living_street | 18 980 | 12.7 % |
| path | 6 483 | 4.3 % |
| unclassified | 5 799 | 3.9 % |
| track | 5 446 | 3.6 % |
| footway | 3 883 | 2.6 % |
| tertiary | 3 367 | 2.3 % |
| trunk | 1 584 | 1.1 % |
| secondary | 1 164 | 0.8 % |
| steps | 700 | 0.5 % |
| primary | 236 | 0.2 % |
| trunk_link | 197 | 0.1 % |
| pedestrian | 60 | |
| tertiary_link | 40 | |
| motorway | 38 | |
| secondary_link | 38 | |
| construction | 32 | |
| motorway_link | 27 | |
| cycleway | 21 | |
| primary_link | 19 | |
| raceway | 10 | |
| proposed | 6 | |
| road | 0 | |

Drivable classes (motorway…service, track, and their `_link`s): **138 076 ways (92.5 %)**, 1 124 966 nodes. Non-drivable (path, footway, steps, pedestrian, cycleway, construction, proposed, raceway): about 11 200 ways.

Reading the numbers against the Indonesian tagging guidelines (https://wiki.openstreetmap.org/wiki/Indonesian_Tagging_Guidelines, section "Roads"):

- `motorway` = toll roads (the Bali Mandara toll road is the only one, hence 38 segments). `trunk` = national roads (jalan nasional) with yellow centre-line markings; `primary`/`secondary` = provincial and regency collector roads; `tertiary` = jalan lokal between district centres and villages.
- `living_street` = "Jalan Lingkungan, occupies the lowest strata below Jalan Lokal" — this is why Bali has ~19 000 of them: village gang/alley lanes, which are exactly the scooter network. Do not drop this class.
- `unclassified` is a minor through road outside residential areas, ranking below tertiary; `road` is reserved for unknown classification (0 uses in Bali).
- `path` is "Foot tracks in rural areas or streets too small for cars in urban areas" — many Balinese `path`s are rideable by motorbike: 12 137 ways in the province carry `motorcycle=yes` (mostly paths/footways), versus 486 `motorcycle=no`.
- Generic value definitions: https://wiki.openstreetmap.org/wiki/Key:highway.

## 4. Useful tags and how often they appear

Same query family, `way.h[key]; out count;`. Percentages are of all 149 307 highway ways; the "drivable" column is of the 138 076 drivable ways.

| Tag | ways (all) | % all | ways (drivable) | Notes / value breakdown |
|---|---|---|---|---|
| `name` | 23 642 | 15.8 % | 23 318 | Named roads are mostly tertiary and up plus main residential streets. |
| `surface` | 39 448 | 26.4 % | 36 515 | asphalt 15 904, paving_stones 12 192, concrete 4 540, unpaved 3 407, paved 1 217, dirt 673, ground 603, gravel 271, compacted 124, sand 90. Paving stones are the typical gang surface. |
| `lanes` | 7 125 | 4.8 % | 7 100 | 1: 2 013, 2: 4 814, 3: 169, 4: 116. |
| `width` | 9 362 | 6.3 % | 8 500 | Free-text metres, needs parsing. |
| `oneway` | 9 495 | 6.4 % | 9 439 | `oneway=yes` 5 506 (rest mostly `no`). |
| `maxspeed` | 495 | 0.3 % | 490 | Effectively absent; derive speed from class. |
| `bridge` | 3 054 | 2.0 % | | With `layer` on 3 133 ways. |
| `tunnel` | 118 | 0.1 % | | |
| `lit` | 447 | 0.3 % | 324 | Effectively absent. |
| `smoothness` | 1 690 | 1.1 % | | |
| `access` | 7 760 | 5.2 % | | `private` 6 611, `no` 241 — mostly service ways/driveways. |
| `motorcycle` | 12 759 | 8.5 % | | `yes` 12 137, `no` 486, `designated` 16. |
| `motor_vehicle` | 986 | 0.7 % | | |
| `ref` | 1 653 | 1.1 % | | Road numbers on trunk/primary. |
| `junction` | 190 | | | roundabouts. |
| `toll` | 78 | | | toll road segments. |
| `incline` | 261 | | | |
| `sidewalk` | 864 | | | |
| `tracktype` | 425 | | | |
| `area=yes` | 25 | | | Must be excluded or treated as polygons. |

Practical consequence: the only attributes dense enough to drive rendering/physics directly are `highway`, `surface` (a quarter of ways, half of the important ones), `oneway`, `bridge`/`layer`, `name`, and `access`/`motorcycle`. `lanes`, `width`, `maxspeed`, `lit` must be defaulted per class.

## 5. Clipping and converting

### 5.1 Recommended offline pipeline (osmium)

Tool docs: https://osmcode.org/osmium-tool/manual.html, https://docs.osmcode.org/osmium/latest/osmium-extract.html, https://docs.osmcode.org/osmium/latest/osmium-export.html.

```sh
# 1. input: Geofabrik Nusa-Tenggara (167 MB) and the province boundary
curl -O https://download.geofabrik.de/asia/indonesia/nusa-tenggara-latest.osm.pbf
curl -o bali-boundary.osm "https://www.openstreetmap.org/api/0.6/relation/1615621/full"

# 2. clip to the province polygon (-p accepts GeoJSON, .poly or an OSM file with the boundary relation)
osmium extract -p bali-boundary.osm -s complete_ways nusa-tenggara-latest.osm.pbf -o bali.osm.pbf

# 3. keep only highway ways (+ their nodes)
osmium tags-filter bali.osm.pbf w/highway -o bali-roads.osm.pbf

# 4. GeoJSON (one FeatureCollection) or newline-delimited GeoJSONSeq for streaming
osmium export bali-roads.osm.pbf --geometry-types=linestring -c export-config.json -o bali-roads.geojsonseq
```

Notes from the docs:

- `osmium extract -p` "accepts three file formats: GeoJSON (single Feature or FeatureCollection with Polygon/MultiPolygon), .poly files, OSM files (multipolygon/boundary relations with supporting data)". Strategies: `simple` (one pass, "ways crossing the region boundary will not be reference-complete"), `complete_ways` (default, two passes, ways complete, relations not), `smart` (three passes, multipolygon relations complete too). `complete_ways` is what a road network needs; roads that cross the coast do not exist, so the only edge effect is bridges/ferry stubs at the boundary.
- `osmium tags-filter FILE w/highway` keeps ways with any `highway` tag and the nodes they reference; `-R/--omit-referenced` drops the referenced nodes if you only want the ways.
- `osmium export` writes `geojson` (default), `geojsonseq`, `pg`, or `text`; `--geometry-types=point,linestring,polygon` filters geometry types; `-c` takes a JSON config with `attributes`, `linear_tags`, `area_tags`, `exclude_tags`, `include_tags` (use `include_tags` to whitelist `highway,name,surface,oneway,lanes,width,maxspeed,bridge,tunnel,layer,lit,access,motorcycle,motor_vehicle,junction,ref,smoothness`); `-a/--attributes` can add `id`, `way_nodes` etc. Export keeps node locations in memory — trivial for Bali, and "several tens of GBytes" only for planet-scale inputs.
- Ways tagged `area=yes` (25 in Bali) become polygons; either exclude them in `tags-filter` (`w/highway w/area!=yes` is not a valid combined filter, so filter after export) or accept polygon geometries and drop them in the game importer.

### 5.2 Overpass-based pipeline (no 167 MB download)

```sh
curl -sG https://overpass-api.de/api/interpreter --data-urlencode 'data=[out:json][timeout:300][maxsize:1073741824];area(3601615621)->.a;way(area.a)[highway];(._;>;);out meta;' -o bali-roads.osm.json
npx osmtogeojson bali-roads.osm.json > bali-roads.geojson
```

- osmtogeojson accepts "XML DOM or in OSM JSON" from Overpass, has `osmtogeojson file.osm > file.geojson` CLI and a Node API, options `flatProperties`, `uninterestingTags`, `polygonFeatures`; for inputs over ~100 MB run node with `--max_old_space_size` because it needs "4-5 times the input file size in memory" (https://github.com/tyrasd/osmtogeojson). A Bali download of ~150-250 MB therefore needs ~1 GB heap.
- osm2geojson (Python) does the same: `json2geojson`, `xml2geojson`, `json2shapes`, with `filter_used_refs`, `area_keys`, `polygon_features`; requires Shapely (https://pypi.org/project/osm2geojson/).
- This is a valid one-shot build step, but every rebuild spends a sizeable chunk of the 1 GB/day fair-use budget and depends on server load; the osmium route is deterministic and re-runnable.

### 5.3 Compact binary for the browser

- GeoJSON is a build intermediate, not a shipping format. Two documented options:
  - FlatGeobuf: "a performant binary encoding for geographic data based on flatbuffers", optional packed Hilbert R-tree index, HTTP range-request streaming of bbox subsets, JS/TS reference implementation, written with `ogr2ogr -f FlatGeobuf -lco SPATIAL_INDEX=YES` or the JS API (https://flatgeobuf.org/). Suits streaming only the tiles near the rider.
  - geobuf: protobuf GeoJSON, "6-8x smaller than GeoJSON uncompressed, 2-2.5x smaller gzipped", `json2geobuf`/`geobuf2json` CLI, but its README warns the "encoding schema is not stable yet" (https://github.com/mapbox/geobuf).
- For a three.js game the most compact form is a purpose-built pack: one `Float32Array`/`Int32Array` of projected node coordinates (local metre grid around 115.2 E, -8.5 S), way offsets, and a small per-way attribute byte (class, oneway, bridge, surface class). Node/way counts above (1.2 M nodes, 149 k ways) put that around 10-12 MB raw, well under 5 MB gzipped. This is a trivial transformation under ODbL (section 7) and carries no extra obligation beyond attribution.

## 6. Update cadence

- OSM itself publishes minutely, hourly (2 min past the hour) and daily (00:05 UTC) replication diffs (https://wiki.openstreetmap.org/wiki/Planet.osm/diffs).
- Geofabrik: daily rebuild ~21:00 CET, daily `.osc.gz` diffs kept 100 days, `pyosmium-up-to-date` for incremental updates (https://download.geofabrik.de/technical.html; nusa-tenggara page confirms "contains all OSM data up to 2026-09-07T20:21:20Z").
- BBBike: "planet.osm data updated every day" (https://extract.bbbike.org/extract.html). SliceOSM: minutely (https://wiki.openstreetmap.org/wiki/SliceOSM). Overpass main instance: minutely (`timestamp_osm_base` in every response), areas lag by up to 4-12 hours.
- For a game, the road network should be a versioned build artifact regenerated on demand (monthly or per release), not something that tracks OSM live.

## 7. ODbL obligations for a game

Primary sources: https://www.openstreetmap.org/copyright, https://opendatacommons.org/licenses/odbl/1-0/, https://osmfoundation.org/wiki/Licence/Attribution_Guidelines, https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ, https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline, https://osmfoundation.org/wiki/Licence/Community_Guidelines/Trivial_Transformations_-_Guideline, https://osmfoundation.org/wiki/Licence/Community_Guidelines/Substantial_-_Guideline.

1. **Classification.** The game (rendered world, gameplay) is a Produced Work: "If the published result of your project is intended for the extraction of the original data, then it is a database and not a Produced Work. Otherwise it is a Produced Work" (Produced Work guideline). The Legal FAQ says outright that maps, games and applications are Produced Works and "You can license a Produced Work under any terms you like". The shipped road pack is a Derivative Database derived by trivial transformation.
2. **Attribution is mandatory** (ODbL 4.3: a notice "reasonably calculated to make any Person ... aware that Content was obtained from the Database" and its licence; example text "Contains information from [DATABASE NAME], which is made available here under the Open Database License (ODbL)"). OSMF guidelines: attribute to "OpenStreetMap" (the historical "© OpenStreetMap contributors" is acceptable), make it a link to `openstreetmap.org/copyright`, make clear the data is under ODbL, and it "should not require individuals to interact with the map or produced work to see the attribution". For apps and games the guideline explicitly allows a splash screen (text "easily legible and visible such that the typical viewer has time to comprehend the attribution"), an in-game view, credits, or menus. An interactive map corner attribution may auto-collapse after five seconds provided licence info stays reachable via an info button. Bali's whole road network is far beyond the "insubstantial" threshold (<100 features, or an area of up to 1 000 inhabitants), so no exemption applies.
3. **Share-alike / access to the derivative database.** ODbL 4.4 and 4.6: a publicly used Derivative Database must stay ODbL and you must offer "the complete derivative database, or a file documenting all alterations made ... free of charge if distributed over the internet". The Trivial Transformations guideline says format conversion, spatial and tag filtering, simplification, and routing pre-computation "does not add any information that needs to be shared", provided "You clearly inform the users of your product or project where they can get the equivalent OpenStreetMap data from". So: as long as the game only filters/reprojects/packs OSM roads, publishing the pack itself is optional; a line in the credits pointing at `openstreetmap.org` (plus the Geofabrik/Overpass source and the build date) discharges the obligation. If hand-edited road fixes or third-party road data are merged into the pack, the pack becomes a real Derivative Database that must be published under ODbL (or the diff file offered).
4. **No DRM around the data** (ODbL 4.8 requires parallel unrestricted distribution if technological measures are applied to the database) — not an issue for a plain download.

Concrete checklist for the game:

- Title/loading screen and an always-reachable "About/Credits" panel showing `© OpenStreetMap contributors`, linked to `https://www.openstreetmap.org/copyright`, stating the data is ODbL.
- Same line in the README/repository and in the packed data file's header.
- Credits also state the data source and snapshot date, e.g. "Road data: OpenStreetMap, Geofabrik Nusa-Tenggara extract of YYYY-MM-DD, clipped to relation 1615621".
- Keep the build script in the repo so the "equivalent OpenStreetMap data" is reproducible.

## 8. Recommendation

1. **Source:** Geofabrik `asia/indonesia/nusa-tenggara-latest.osm.pbf` (167 MB, daily, includes all of Bali — verified against the `.poly`), clipped offline with `osmium extract -p` using the province boundary relation **1615621** fetched from `api/0.6/relation/1615621/full` (use the island relation 2130352 instead if Nusa Penida/Lembongan are out of scope). SliceOSM is the fallback if you want a polygon PBF without the 167 MB download. Do not use Overpass as anything but an ad-hoc exploration tool: the public fair-use policy forbids app backends and the server dropped connections during this research.
2. **Filter:** `osmium tags-filter w/highway`, then drop `area=yes`, `construction`, `proposed`, `raceway`; keep every other class including `living_street` (19 k gang lanes), `track`, `path` and `footway` flagged as rideable when `motorcycle=yes` or absent — around 138 k drivable ways / 1.12 M nodes, 149 k ways / 1.21 M nodes in total.
3. **Convert:** `osmium export -f geojsonseq` with an `include_tags` whitelist (highway, name, surface, oneway, lanes, width, maxspeed, bridge, tunnel, layer, lit, access, motorcycle, motor_vehicle, junction, ref, smoothness) as the build intermediate; then pack into a custom typed-array binary (projected metres, way offsets, class/flag bytes; ~10 MB raw, <5 MB gzipped) or FlatGeobuf if spatial range-request streaming is wanted. Default `lanes`/`width`/`maxspeed`/`lit` per class since they are present on <7 % of ways; `surface` (26 %, mostly asphalt/paving_stones/concrete) and `oneway`/`bridge`/`layer` are worth carrying.
4. **Cadence:** treat the road pack as a versioned build artifact, rebuilt from a fresh Geofabrik file per release (monthly at most); record the extract timestamp in the pack header.
5. **Licence:** ship `© OpenStreetMap contributors` linked to `openstreetmap.org/copyright` on the title/loading screen and in a credits panel, name the Geofabrik snapshot date, and keep the pack a pure filter/reprojection of OSM so the Trivial Transformations guideline applies and nothing beyond attribution and a pointer to OSM has to be published.

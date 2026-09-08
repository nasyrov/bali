# OSM coverage of Bali: buildings, land use, coastline, landmarks, place names

Research for ticket `.scratch/bali-moto/issues/05-osm-bali-buildings-landuse.md`. Date of data: 2026-09-08.

All Bali-scoped counts below were run on 2026-09-08 against Overpass (main instance `overpass-api.de` for the first queries, then the public mirror `https://maps.mail.ru/osm/tools/overpass/api/interpreter` after the main instance started refusing connections). "Bali province" means relation [1615621](https://www.openstreetmap.org/relation/1615621) (`boundary=administrative`, `admin_level=4`, `ISO3166-2=ID-BA`). Where a query used a bounding box instead of the relation, the box was `-9.0,114.43,-8.05,115.75`, which covers the island plus Nusa Penida/Lembongan/Ceningan and stops short of Lombok; a sliver of the Blambangan peninsula (east Java) can fall inside it, and Java's Banyuwangi regency touches it, so "10 admin_level=5 relations in bbox" is 9 Bali regencies plus Banyuwangi.

## 1. Building footprints

### Totals

- OSM has **1,656,853** ways+relations with `building=*` inside the Bali province relation (Overpass, `wr[building](area)`, 2026-09-08).
- **1,644,571** of them are `building=yes` (bbox query). Specific values are rare: `building=house` 3,929, `building=commercial` 1,103, `building=hotel` 990, `building=temple` 40. Only 8,551 buildings carry a `name`, 4,960 a `building:levels` and 118 a `height` (0.3% and 0.007% of footprints). The [Key:building](https://wiki.openstreetmap.org/wiki/Key:building) page says `building=yes` is for "where it is not possible to determine a more specific value", which is what 99% of Bali's buildings are.
- Practical consequence: the OSM `building` tag gives you footprints and almost nothing else; type, height and colour for a low-poly renderer must be inferred (footprint area, landuse polygon underneath, distance to coast/road class), not read from tags.

### South Bali versus rural areas (numbers)

Per-regency OSM building counts (Overpass `area()` on each `admin_level=5` relation), with area and 2024 population from [Wikipedia: Bali, regencies table](https://en.wikipedia.org/wiki/Bali):

| Regency (rel id) | OSM buildings | Area km² | Pop. 2024 | Bldg / km² | Bldg per 1000 pop |
|---|---:|---:|---:|---:|---:|
| Badung (14613953) | 314,377 | 398.75 | 568,500 | 788 | 553 |
| Denpasar (7789828) | 210,140 | 125.87 | 755,600 | 1,670 | 278 |
| Gianyar (14613952) | 102,027 | 364.36 | 527,100 | 280 | 194 |
| Tabanan (14322005) | 299,345 | 849.31 | 467,700 | 352 | 640 |
| Buleleng (14322007) | 261,680 | 1,322.68 | 814,800 | 198 | 321 |
| Karangasem (14264457) | 222,081 | 839.32 | 502,300 | 265 | 442 |
| Klungkung (3250691) | 78,786 | 313.96 | 209,300 | 251 | 376 |
| Bangli (14322004) | 91,588 | 526.76 | 262,300 | 174 | 349 |
| Jembrana (14322006) | 76,184 | 849.13 | 325,600 | 90 | 234 |

Sample kecamatan (`admin_level=6`): Kuta Utara (Canggu/Kerobokan) 63,685; Kuta Selatan (Bukit/Uluwatu/Nusa Dua) 67,966; Mengwi 81,421; Kuta 29,305; Ubud 20,807; Kintamani 38,845; Kubu 42,016; Gerokgak 36,827; Abang 33,352; Nusa Penida 20,171; Pupuan 16,501.

To turn counts into a completeness estimate I compared OSM against the [Microsoft Global ML Building Footprints](https://github.com/microsoft/GlobalMLBuildingFootprints) release of 2026-02-03 (the six Indonesia level-9 quadkey tiles that cover Bali: 310102032, 310102033, 310102122, 310102210, 310102211, 310102300, all listed in the project's `dataset-links.csv`). Footprint centroids were binned into 0.25° cells inside the bbox and OSM `building` objects were counted in the same cells:

| Cell SW corner (lat, lon) | Area | Microsoft | OSM | OSM / MS |
|---|---|---:|---:|---:|
| -8.75, 114.93 | Tabanan coast, Canggu, Kerobokan, Denpasar west | 178,470 | 293,794 | 1.65 |
| -8.75, 115.18 | Denpasar, Sanur, Gianyar coast | 458,385 | 404,525 | 0.88 |
| -9.0, 114.93 | Bukit west (Jimbaran, Uluwatu, Pecatu) | 37,945 | 41,083 | 1.08 |
| -9.0, 115.18 | Bukit east (Nusa Dua, Benoa) | 30,153 | 31,352 | 1.04 |
| -8.5, 115.18 | Ubud, Gianyar, Bangli | 252,294 | 179,369 | 0.71 |
| -8.5, 114.93 | Tabanan interior | 116,449 | 136,367 | 1.17 |
| -8.5, 115.43 | Klungkung, Sidemen, Karangasem | 136,269 | 159,440 | 1.17 |
| -8.75, 115.43 | Nusa Penida / Lembongan | 44,529 | 40,301 | 0.91 |
| -8.25, 114.93 | Singaraja, Lovina | 137,833 | 147,571 | 1.07 |
| -8.25, 115.18 | Kintamani, Kubutambahan | 74,647 | 61,755 | 0.83 |
| -8.25, 115.43 | Kubu, Tejakula, Amed | 22,645 | 24,169 | 1.07 |
| -8.5, 114.68 | Pekutatan, Selemadeg | 44,628 | 49,505 | 1.11 |
| -8.25, 114.68 | Gerokgak, Pemuteran | 36,127 | 35,444 | 0.98 |
| -8.5, 114.43 | Jembrana (Negara) | 87,792 | 29,064 | **0.33** |
| -8.25, 114.43 | Gilimanuk, Melaya | 21,616 | 15,926 | 0.74 |
| -9.0, 115.43 | Nusa Penida south | 5,330 | 3,678 | 0.69 |
| -8.5, 115.68 | Seraya, east tip | 4,544 | 4,981 | 1.10 |
| Whole bbox | | 1,689,703 | ~1,658,000 | 0.98 |

Reading this:

- Island-wide, OSM has about as many footprints as Microsoft's ML detector (0.98). That is far better than the Indonesia average: HOT's HDX export says "OpenStreetMap contains roughly 41.7 million buildings in this region. Based on AI-mapped estimates, this is approximately 56% of the total buildings" ([HDX: Indonesia Buildings (OpenStreetMap Export)](https://data.humdata.org/dataset/hotosm_idn_buildings), notes retrieved via the CKAN API, last modified 2024-06-03).
- Ratios above 1.0 (Canggu/Tabanan cell at 1.65) do not mean OSM is "more than complete"; OSM mappers draw compound walls, pavilions and shrines as separate buildings where the ML model merges or misses them, and Microsoft's own accuracy note is precision 92-97% and recall 71-86%, so a ratio near 1 is consistent with both being roughly complete.
- The clear gaps are **Jembrana around Negara (0.33)**, Gilimanuk/Melaya (0.74), the Ubud/Gianyar/Bangli interior (0.71), Kintamani (0.83) and south Nusa Penida (0.69). Those are the places where a fallback dataset matters for the game.
- Nothing suggests a bulk import: no Bali entry exists on the [OSM wiki Bali page](https://wiki.openstreetmap.org/wiki/Bali) (it is a stub whose only content is the Nusa Dua convention centre), and HOT's [PDC InAWARE project](https://wiki.openstreetmap.org/wiki/HOT_-_PDC_InAWARE_Indonesia_Mapping_Project) mapped only Surabaya, Jakarta and Semarang. Bali's density is organic mapping, which also explains the 99% `building=yes`.

### Fallback footprint datasets

- **Microsoft Global ML Building Footprints**: ~1.4 billion footprints, GeoJSON-lines in `.csv.gz` files partitioned by country and level-9 quadkey, licensed [ODbL](https://github.com/microsoft/GlobalMLBuildingFootprints) (the README also cites CDLA Permissive 2.0 for some regions; check the file you use). Indonesia has 601 tiles in `dataset-links.csv` dated 2026-02-23; the six Bali tiles total about 185 MB gzipped and 2.47 million features (1.69 million inside the Bali bbox). Height estimates exist only for a subset. Source: https://github.com/microsoft/GlobalMLBuildingFootprints and https://minedbuildings.z5.web.core.windows.net/global-buildings/dataset-links.csv.
- **Google Open Buildings v3**: "1.8 billion building detections, across an inference area of 58M km2" covering Africa, South Asia, South-East Asia (Indonesia included), Latin America and the Caribbean; inference May 2023; CSV per level-4 S2 cell with WKT polygons, `area_in_meters`, `confidence` (0.65-1.0) and Plus Code; dual-licensed CC BY 4.0 / ODbL. Sources: https://sites.research.google/gr/open-buildings/ and the [Earth Engine catalog entry](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings_v3_polygons).
- **VIDA combined Google-Microsoft-OSM Open Buildings**: 2.7 billion footprints, GeoParquet/FlatGeobuf/PMTiles partitioned by ISO country (`country_iso=IDN`), each footprint labelled with its source, ODbL. It does not deduplicate; it keeps every source's polygon with a label, so you still choose one per area. Source: https://source.coop/vida/google-microsoft-osm-open-buildings.

For this game: use OSM as the primary footprint layer and fill only the low-ratio cells (Jembrana, Gilimanuk, interior Gianyar/Bangli, south Nusa Penida) from Microsoft or Google where an OSM footprint is absent within a small buffer. All three sources are ODbL-compatible, so attribution is the same as for the rest of the map.

## 2. Land cover tags: rice, forest, beach, water

### Rice paddies

- The documented scheme is `landuse=farmland` plus `crop=rice`. [Key:crop](https://wiki.openstreetmap.org/wiki/Key:crop) lists `crop=rice` and says "You can also use landuse=paddy if the status of the farmland is 'paddy field'". [Tag:landuse=paddy](https://wiki.openstreetmap.org/wiki/Tag:landuse%3Dpaddy) is marked in-use but contentious; it says "mapping it as landuse=farmland is generally preferred" and notes that "crop=rice does not imply a paddy since other methods may be used for what is commonly known as 'upland rice'".
- Globally (Taginfo, 2026-09-08): `crop=rice` 439,897 objects, 99.0% of them combined with `landuse=farmland` ([Taginfo combinations](https://taginfo.openstreetmap.org/api/4/tag/combinations?key=crop&value=rice)); `landuse=paddy` 3,404; `farmland=paddy` 683. `landuse=farmland` is the most common landuse value in the world at 11.7 million ([Taginfo Key:landuse](https://taginfo.openstreetmap.org/keys/landuse#values)).
- The [Indonesian Tagging Guidelines](https://wiki.openstreetmap.org/wiki/Indonesian_Tagging_Guidelines) say sawah (rice paddies) use `landuse=farmland`; the [Indonesia/Landuse](https://wiki.openstreetmap.org/wiki/Indonesia/Landuse) page only lists "sawah" as a render example and adds nothing on `crop`.
- In Bali (bbox counts): `landuse=farmland` **4,032**, of which only **213** carry `crop=rice`; `crop=rice` on anything 218; `landuse=paddy` 6; `farmland=paddy` 0. So the crop tag is present on about 5% of farmland polygons. For colouring, treat every `landuse=farmland` in Bali as rice paddy by default (the island's farmland is overwhelmingly sawah) and only use `crop=*` to override when it is something else. Polygon completeness is the bigger problem: 4,032 polygons is far from wall-to-wall coverage of an island where cropland dominates the lowlands, so expect large unmapped gaps; a Copernicus/ESA land-cover raster is the realistic gap filler (out of scope here).
- Other agricultural tags in Bali: `landuse=orchard` 897 (coffee, clove, coconut plantations), `landuse=meadow` 501, `landuse=grass` 905, `landuse=aquaculture` 247 (Gerokgak/Jembrana fish ponds), `landuse=plant_nursery` 2, `landuse=salt_pond` 0.

### Forest

- The wiki's [Forest](https://wiki.openstreetmap.org/wiki/Forest) page documents the unresolved `landuse=forest` vs `natural=wood` split and says "nearly all data consumers treat both natural=wood and landuse=forest as synonymous tags for a wooded area". Do the same.
- Bali (bbox): `natural=wood` **2,084**, `landuse=forest` 147, `natural=scrub` 1,297. Wood dominates by 14:1, so any pipeline that only reads `landuse=forest` gets nothing useful for Bali. `leaf_type` is documented on the same page if you ever want to distinguish plantation pine from tropical broadleaf.
- Protected areas: `boundary=national_park` 3 relations (Bali Barat and its marine/inner parts), `boundary=protected_area` 46, `leisure=nature_reserve` 8.

### Beaches, sand, cliffs, reefs

- [Tag:natural=beach](https://wiki.openstreetmap.org/wiki/Tag:natural%3Dbeach): "mapping as an area is strictly preferable"; add `surface=sand|gravel|pebbles`; "natural=beach should only be used for inclined, wave formed areas at the coast. Larger flat areas of sand that are exposed at low tide should be tagged natural=sand + tidal=yes"; the beach polygon may extend seaward of the `natural=coastline` line.
- Bali (bbox): `natural=beach` **156** objects, 71 of them with a `name` (Pantai Kuta way 260605192, Pantai Seminyak relation 17822273, Pantai Balangan way 128027878, Pantai Padang Padang way 156791354, Pantai Lovina ways 285154447/285363378, Echo Beach relation 17840124, Pantai Batu Bolong node 10703647325, Lovina Beach node 10988259974). `natural=sand` 89, `natural=cliff` 172 (the Bukit and Nusa Penida cliffs are well drawn), `natural=reef` 28, `wetland=mangrove` 67 (Benoa bay mangroves).
- Not every famous beach has a polygon: Seminyak and Batu Bolong are partly node-only. The world should not rely on beach polygons alone; a sandy strip generated along `natural=coastline` wherever no beach polygon exists is the safer default, with named polygons overriding it.

### Water

- [Tag:natural=water](https://wiki.openstreetmap.org/wiki/Tag:natural%3Dwater): "any inland body of water"; refine with `water=lake|river|reservoir|pond|canal|lagoon`. Ocean is never `natural=water`; it comes from the coastline (section 3).
- Bali (bbox): `natural=water` **597** areas (Batur, Bratan, Buyan, Tamblingan crater lakes, reservoirs, ponds), `waterway=river` 298 ways, `waterway=stream` 2,052, `waterway=ditch` 163 (subak irrigation channels are mostly unmapped; 163 ditches is a tiny fraction), `waterway=canal` 2, `waterway=waterfall` 122 (a lot of tourist waterfalls: Sekumpul, Tegenungan, Gitgit etc.).
- `leisure=swimming_pool` is 2,858 polygons, mostly villas in Canggu/Seminyak/Ubud; worth rendering as a blue tile in the villa zones because they are a recognisable Bali texture from the air.

### Other land use present in Bali

`landuse=residential` 6,160, `landuse=commercial` 981, `landuse=retail` 1,191, `landuse=industrial` 410, `landuse=cemetery` 61 (setra), `leisure=park` 171, `leisure=garden` 208, `leisure=pitch` 343, `leisure=golf_course` 7, `leisure=resort` 117 (the [Key:leisure](https://wiki.openstreetmap.org/wiki/Key:leisure) definition: "A place used for relaxation or recreation, attracting visitors for vacations, tourism and/or swimming"), `leisure=beach_resort` 6.

## 3. Coastline

- Source tag: [Tag:natural=coastline](https://wiki.openstreetmap.org/wiki/Tag:natural%3Dcoastline). The line is the mean high water springs line; "the land is on the left side and water on the right side of the way"; the ways "must create a continuous interlinked coastline, the end node of one way must be the start node of the next way"; large river mouths get a closing coastline way across the mouth. Bali has **240** `natural=coastline` ways inside the bbox.
- Do not assemble ocean polygons yourself from raw ways. Use the prebuilt products from [osmdata.openstreetmap.de](https://osmdata.openstreetmap.de/), generated with OSMCoastline: "OpenStreetMap ways tagged with natural=coastline ... are assembled into polygons and then split" ([land polygons page](https://osmdata.openstreetmap.de/data/land-polygons.html)).
  - **Land polygons**: `land-polygons-complete-4326.zip`, `land-polygons-split-4326.zip`, `land-polygons-complete-3857.zip`, `land-polygons-split-3857.zip`, `simplified-land-polygons-complete-3857.zip` (Shapefile; WGS84 or Web Mercator; split versions have overlapping tiles for "larger zoom levels", simplified for zoom 0-9). https://osmdata.openstreetmap.de/data/land-polygons.html
  - **Water polygons**: `water-polygons-split-4326.zip`, `water-polygons-split-3857.zip`, `simplified-water-polygons-split-3857.zip`; "This dataset only contains bodies of water bordered by ways tagged natural=coastline, it does not contain lakes, reservoirs, etc." https://osmdata.openstreetmap.de/data/water-polygons.html
  - **Coastline lines**: `coastlines-split-4326.zip` and `coastlines-split-3857.zip`, linestrings chunked to at most 100 points. https://osmdata.openstreetmap.de/data/coastlines.html
  - All ODbL, "copyright OpenStreetMap contributors". The coastline page warns "The coastline in OpenStreetMap is often broken. The update process will try to repair it, but this does not always work", i.e. a given day's build can be stale if someone broke the ring somewhere in the world; pin one download rather than fetching nightly.
- For the game, clip `land-polygons-split-4326` to the Bali bbox once; that gives the island outline plus Nusa Penida/Lembongan/Ceningan and Menjangan as clean polygons, and the difference to the bbox is sea. Beach polygons from section 2 go on top.

## 4. Landmarks: temples, beaches, viewpoints, volcanoes

### Temples (pura)

- Scheme per [Tag:amenity=place_of_worship](https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dplace_of_worship): "All places of worship, independently of the religion or denomination, get the tag amenity=place_of_worship", refined by `religion=*` and `denomination=*`; the building itself is `building=temple` ("Built by adherents of a religion not further specified: building=temple"). [Tag:building=temple](https://wiki.openstreetmap.org/wiki/Tag:building%3Dtemple) lists `religion=hindu` explicitly and says to add `amenity=place_of_worship` "when the temple is used as a place of worship". The [Indonesian Tagging Guidelines](https://wiki.openstreetmap.org/wiki/Indonesian_Tagging_Guidelines) map Pura to `religion=hindu`, Masjid to `religion=muslim`, Gereja to `religion=christian`, Vihara to `religion=buddhist`, Klenteng to `religion=taoist`. [Key:religion](https://wiki.openstreetmap.org/wiki/Key:religion) has no Balinese denomination value; in Bali 115 temples carry some `denomination`, mostly free text.
- Bali (bbox): `amenity=place_of_worship` **2,370**, of which **2,132** `religion=hindu` (90%), 105 muslim, 73 christian, 32 buddhist, 13 untagged. 872 have a name starting with "Pura ", 1,192 are drawn as areas with a `building` tag, 730 are nodes, 55 have `wikidata`. Only 40 use `building=temple`; the rest of the drawn temples are `building=yes` plus the amenity tag, so filter on `amenity=place_of_worship` + `religion=hindu`, never on `building=temple`.
- 2,132 is a small fraction of Bali's temples (every village has at least three, every compound a shrine), but the ones that matter for a game are there: Pura Luhur Uluwatu is way 707659668 (`tourism=attraction` + `amenity=place_of_worship`), Tanah Lot is way 480035623 plus node 6930069190, Besakih, Ulun Danu Bratan, Lempuyang, Tirta Empul and Goa Gajah are all mapped (verify ids when building the landmark list).
- Other landmark tags present: `historic=*` 375 (105 `historic=monument`), `man_made=statue` 0 (the roundabout statues are tagged as `tourism=artwork` or `historic=monument` instead).

### Beaches

See section 2: `natural=beach` (156, 71 named), optionally `tourism=attraction` on top (Echo Beach relation 17840124, Pantai Kuta way 260605192 carry both). Surf breaks: `sport=surfing` 19 objects, `leisure=surfing` 0.

### Viewpoints and attractions

- [Tag:tourism=viewpoint](https://wiki.openstreetmap.org/wiki/Tag:tourism%3Dviewpoint): "Set a node at the viewpoint and add tourism=viewpoint"; `direction=*` gives the view arc ("330-30" for 60 degrees around north); commonly combined with `natural=peak`. Bali (bbox): **317** viewpoints, 157 named (Kelingking, Campuhan Ridge, Penelokan/Kintamani rim, Pinggan, Bukit Asah, Jatiluwih terraces are the typical ones).
- [Tag:tourism=attraction](https://wiki.openstreetmap.org/wiki/Tag:tourism%3Dattraction): "an object of interest for a tourist, or a purpose-built tourist attraction"; used on nodes, ways and areas and stacked with the feature's own tag, with the caveat that it "does not distinguish between major tourism features ... and minor tourism attractions". Bali (bbox): **351**, 315 named. Rice-terrace viewpoints like Tegallalang and Jatiluwih are `tourism=attraction`/`viewpoint` nodes on top of `landuse=farmland` (Jatiluwih is also `place=village` node 13716726260 and desa relation 20447390).
- Accommodation as landmark filler: `tourism=hotel` 3,854, `tourism=guest_house` 1,574, `tourism=resort` 3 (resorts are under `leisure=resort`, 117, per the [Key:tourism](https://wiki.openstreetmap.org/wiki/Key:tourism) page, which does not list a `resort` value).

### Volcanoes and peaks

- [Tag:natural=volcano](https://wiki.openstreetmap.org/wiki/Tag:natural%3Dvolcano): node at the crater/vent centre with `name`, `ele`, `volcano:status=active|dormant|extinct`, `volcano:type=stratovolcano|shield|scoria_cone`; "the location of the main volcanic vent/crater is generally not identical to the highest peak so natural=volcano does not necessarily imply a mountain peak". Globally 48% of volcano nodes have a name and 39% an `ele` (Taginfo combinations); `volcano:status` is extinct 4,534 / dormant 841 / active 458 ([Taginfo](https://taginfo.openstreetmap.org/keys/volcano:status)).
- Bali has **3** `natural=volcano` nodes and **780** `natural=peak` nodes (350 named):
  - Gunung Agung: volcano node 1070157207 (`ele=3014`, `volcano:status=active`) and peak node 2209572545 (`ele=3031`).
  - Gunung Batur: volcano node 292801401 (`ele=1717`, active).
  - Gunung Batukaru: volcano node 1070186421 (`ele=2276`, no status).
  - Peaks: Gunung Abang 1070170547 (2151 m), Gunung Sanghyang south 990952731 (2093 m), Gunung Pohen 1070180761 (2063 m), Gunung Tapak 1070188647 (1909 m), Gunung Lesung 1426985870 (1865 m), Gunung Catur 13267672187 (1865 m).
- For terrain shaping use the DEM, not these nodes; use the nodes only to place labels and the three volcano cones as landmark models.

## 5. Place names and administrative boundaries

### admin_level scheme for Indonesia

The [Tag:boundary=administrative](https://wiki.openstreetmap.org/wiki/Tag:boundary%3Dadministrative) country table and the [Indonesian Tagging Guidelines](https://wiki.openstreetmap.org/wiki/Indonesian_Tagging_Guidelines) agree:

| admin_level | Indonesia | Bali example |
|---|---|---|
| 2 | Negara (country) | Indonesia |
| 4 | Provinsi | relation 1615621 Bali (`border_type:id=provinsi`, population 4,375,263 per its tags) |
| 5 | Kabupaten / Kota | 9 relations: Badung 14613953, Bangli 14322004, Buleleng 14322007, Denpasar 7789828, Gianyar 14613952, Jembrana 14322006, Karangasem 14264457, Klungkung 3250691, Tabanan 14322005 |
| 6 | Kecamatan | 57 relations in Bali (e.g. Kuta 7760990, Kuta Utara 17839416, Kuta Selatan 7760981, Ubud 17824715, Mengwi 20447251, Kintamani 20447233, Nusa Penida 20447256) |
| 7 | Desa / Kelurahan | **716** relations in the bbox, which equals Bali's official 636 desa + 80 kelurahan, so the desa layer is complete (e.g. Canggu 17840125, Seminyak 7760995, Legian 7760994, Kuta 7760993, Benoa 7760985, Tanjung Benoa 7760988, Sanur 20447277, Jatiluwih 20447390, Bukit 20447562) |
| 8 | Dusun / Banjar (Rukun Warga) | 0 relations in Bali |
| 9 | Rukun Tetangga | 0 |

Note: admin_level 3 is unused in Indonesia, and the Bali relation's `note` tag points out that the island outline is a separate object, relation [2130352](https://www.openstreetmap.org/relation/2130352) `place=island` "Pulau Bali".

### place=* nodes

[Key:place](https://wiki.openstreetmap.org/wiki/Key:place): settlements are "usually mapped as nodes since in most cases they have a well defined centre but not a verifiable outline"; a place tag "should exist for every significant human settlement ... regardless of administrative status". [Tag:place=suburb](https://wiki.openstreetmap.org/wiki/Tag:place%3Dsuburb): a suburb is a major named area inside a city or town, `neighbourhood` is a division of a suburb, `quarter` sits between them. The Indonesian guidelines use `place=city` for over 100k, `town` for roughly 10k+, `village` under 10k, `hamlet` for 100-200 people and `neighbourhood` for kampung/lingkungan.

Bali (bbox) has **2,022** `place=*` objects: 1 city (Denpasar, node 274113797, population 788,445), 60 towns, 655 villages, 83 suburbs, 22 neighbourhoods, 0 quarters, 1,043 hamlets, 11 localities, 44 isolated dwellings, 23 islands, 61 islets. Most of the town/suburb/village nodes were (re)created in a single 2025 pass (ids 13716xxxxxx), one node per kecamatan seat ("town") and per desa/kelurahan ("village"/"suburb"), so they mirror the admin hierarchy rather than tourist usage. Consequences for the curated region list:

- Tourist names that exist as OSM place nodes: Canggu (`village` 13716726228, plus desa relation 17840125), Seminyak (`suburb` 13716722703, desa 7760995), Legian (`suburb` 13716722598), Kuta (`town` 1308696453 and `suburb` 13716726375), Jimbaran (`suburb` 463683588), Sanur (`suburb` 274116432), Ubud (`town` 13716722565 and `suburb` 13716726253), Kerobokan (`suburb` 13716722822), Pererenan (`village` 13716726287), Tibubeneng (`village` 13716722729, the desa that contains Berawa), Cemagi 13716726050, Pecatu (`village` 13716726343), Ungasan 13716726279, Tanjung Benoa (`suburb` 13716708780), Benoa (`suburb` 13716726362), Serangan 13716726356, Kedonganan 13716722570, Tuban 13716726355, Amed (`hamlet` 452909699, `tourism=fishing village` free text), Candidasa (`locality` 314914048), Padangbai (`village` 13716722567), Tulamben 13716726286, Sidemen (`town` 13716722453), Kintamani (`town` 13716722504), Munduk (`village` 13716722572), Bedugul (`hamlet` 13267721283), Pemuteran (`village` 13716722602), Medewi 13716722506, Tegallalang (`town` 13716726088), Sukawati, Mas, Batubulan, Kedewatan, Payangan, Keramas (`village` nodes), Jatiluwih (`village` 13716726260), Penglipuran (`hamlet` 8482826504), Negara (`town` 429157244), Singaraja (as `town` "Buleleng" 2571002742, population 80,500), Gianyar (`town` 13716722641 and way 706551761, population 86,843), Tabanan, Klungkung, Bangli, Amlapura (as `town` "Karangasem" 430263239, population 88,019), Nusa Penida (`town` 13716708736 and island relation 3236970), Nusa Lembongan (island relation 9830649), Nusa Ceningan (island relation 9904711).
- Tourist names that have **no** place node: Uluwatu (only the temple way 707659668 and an unnamed-type node 5658157602), Nusa Dua (a `place=region` node 429572571 and three `tourism=attraction` nodes, no settlement node), Lovina (beach polygons 285154447/285154449/285363378 and an artwork node, no place), Berawa (a restaurant), Balangan (a beach way 128027878), Echo Beach / Batu Bolong (beach objects), Bingin (the two `hamlet` nodes with that name are elsewhere on the island), Umalas, Petitenget, Tanah Lot (temple only), Bukit (a desa relation 20447562 and a `place=village` 13716726035, which is the official Bukit village in Karangasem, not the Bukit peninsula). These have to be hand-placed.
- Place node coordinates are not tourist-centre coordinates. The Canggu node sits at the desa office (-8.6399, 115.1436), a kilometre inland from what visitors call Canggu; Ubud town node -8.5170,115.2551 is fine; Kuta has two nodes 300 m apart. Use OSM ids for provenance, but expect to nudge centres by hand.

## Recommendation

1. **Buildings**: use OSM `building=*` footprints for the whole island; they are effectively complete in south Bali, Denpasar, Tabanan, Singaraja and the east coast (OSM/Microsoft ratio 0.9-1.7). Gap-fill from Microsoft Global ML Building Footprints (six quadkey tiles, ODbL, 2026-02 release) only where the per-cell ratio is under about 0.8: Jembrana/Negara, Gilimanuk/Melaya, interior Gianyar/Bangli/Kintamani, south Nusa Penida. Ignore OSM building *types*; 99% are `building=yes`, so derive style from footprint area and surrounding landuse.
2. **Land cover**: read `landuse=farmland` as rice paddy unless `crop=*` says otherwise; treat `natural=wood` and `landuse=forest` as one forest class (wood outnumbers forest 14:1 here); add `natural=scrub`, `landuse=orchard`, `landuse=residential/commercial/retail`, `natural=water` and `wetland=mangrove` as their own colours. Only 4,032 farmland polygons exist, so plan a raster land-cover fallback for the unmapped countryside.
3. **Coastline and sea**: take `land-polygons-split-4326.zip` from osmdata.openstreetmap.de, clip to the bbox, and derive sea as the complement; overlay `natural=beach` polygons and synthesise a beach strip along `natural=coastline` wherever no polygon exists.
4. **Landmarks**: temples = `amenity=place_of_worship` + `religion=hindu` (2,132; use the 55 with `wikidata` and the 872 named "Pura ..." for labels); beaches = `natural=beach` (156); viewpoints = `tourism=viewpoint` (317); attractions = `tourism=attraction` (351); volcanoes = the three `natural=volcano` nodes plus named `natural=peak`.
5. **Regions**: do not derive the curated region list from `place=*` automatically; the 2025 place nodes follow the desa hierarchy and miss Uluwatu, Nusa Dua, Lovina, Berawa, Bingin, Balangan, Umalas, Petitenget. Use the desa (`admin_level=7`, 716 relations, complete) and kecamatan (`admin_level=6`, 57) boundaries as the geometric backbone for regions, and the place nodes below only as anchor points and provenance.

### Seed list for the curated region file

Names as they appear in OSM, with the anchoring object. Coordinates are the OSM node positions and will need nudging toward the tourist centre.

| Region (game name) | OSM anchor | Coordinates | Backbone boundary |
|---|---|---|---|
| Canggu | `place=village` node 13716726228 "Canggu" | -8.6399, 115.1436 | desa Canggu rel 17840125 + desa Tibubeneng (Berawa) + Pererenan |
| Berawa | none (restaurant node only); use desa Tibubeneng village node 13716722729 | -8.6472, 115.1508 | desa Tibubeneng |
| Pererenan | `place=village` node 13716726287 | -8.6410, 115.1328 | desa Pererenan |
| Seminyak | `place=suburb` node 13716722703 | -8.6899, 115.1668 | desa Seminyak rel 7760995 |
| Legian | `place=suburb` node 13716722598 | -8.7041, 115.1738 | desa Legian rel 7760994 |
| Kuta | `place=town` node 1308696453 | -8.7264, 115.1778 | desa Kuta rel 7760993 / kecamatan Kuta rel 7760990 |
| Kerobokan | `place=suburb` node 13716722822 | -8.6527, 115.1626 | kelurahan Kerobokan |
| Umalas / Petitenget | none; hand-place | | inside Kerobokan Kelod |
| Tuban / Airport | `place=suburb` node 13716726355 | -8.7467, 115.1684 | kelurahan Tuban |
| Jimbaran | `place=suburb` node 463683588 | -8.7897, 115.1625 | kelurahan Jimbaran |
| Uluwatu / Pecatu | `place=village` node 13716726343 "Pecatu"; temple way 707659668 | -8.8208, 115.1136 | desa Pecatu |
| Bingin / Balangan / Padang Padang | beach ways 128027878, 156791354 (no place nodes) | | desa Pecatu |
| Ungasan | `place=village` node 13716726279 | -8.8271, 115.1571 | desa Ungasan |
| Nusa Dua | `place=region` node 429572571 | -8.8017, 115.2239 | kelurahan Benoa rel 7760985 |
| Tanjung Benoa | `place=suburb` node 13716708780 | -8.7607, 115.2199 | kelurahan Tanjung Benoa rel 7760988 |
| Sanur | `place=suburb` node 274116432 | -8.6946, 115.2606 | kelurahan Sanur rel 20447277 + Sanur Kaja/Kauh |
| Serangan | `place=suburb` node 13716726356 | -8.7368, 115.2250 | kelurahan Serangan |
| Denpasar | `place=city` node 274113797 | -8.6653, 115.2176 | kota Denpasar rel 7789828 |
| Batubulan / Sukawati / Mas | village nodes 13716726084, 13716722768, 13716722619 | -8.6210,115.2584 / -8.6080,115.2983 / -8.5409,115.2718 | kecamatan Sukawati |
| Ubud | `place=town` node 13716722565 | -8.5170, 115.2551 | kecamatan Ubud rel 17824715 |
| Tegallalang | `place=town` node 13716726088 | -8.4168, 115.2853 | kecamatan Tegallalang rel 20447260 |
| Payangan / Kedewatan | town node 13716726344, village node 13716722744 | -8.3951,115.2503 / -8.4767,115.2501 | kecamatan Payangan |
| Keramas | `place=village` node 13716722518 | -8.5856, 115.3257 | desa Keramas |
| Gianyar | `place=town` node 13716722641 | -8.5122, 115.3166 | kabupaten Gianyar rel 14613952 |
| Klungkung / Semarapura | `place=town` node 13716726312 | -8.5250, 115.3970 | kecamatan Klungkung rel 20447254 |
| Sidemen | `place=town` node 13716722453 | -8.4844, 115.4387 | kecamatan Sidemen rel 14264425 |
| Padangbai | `place=village` node 13716722567 | -8.5315, 115.5066 | desa Padangbai |
| Candidasa | `place=locality` node 314914048 | -8.5097, 115.5716 | kecamatan Manggis rel 14264207 |
| Amlapura | `place=town` node 430263239 "Karangasem" | -8.4531, 115.6238 | kecamatan Karangasem rel 14264326 |
| Amed | `place=hamlet` node 452909699 | -8.3346, 115.6409 | kecamatan Abang rel 14264378 |
| Tulamben | `place=village` node 13716726286 | -8.2949, 115.5942 | kecamatan Kubu rel 14264388 |
| Kintamani / Batur | `place=town` node 13716722504; volcano node 292801401 | -8.2495, 115.3482 | kecamatan Kintamani rel 20447233 |
| Bangli / Penglipuran | town node 13716722655; hamlet node 8482826504 | -8.4094,115.3645 / -8.4222,115.3589 | kecamatan Bangli rel 20447237 |
| Bedugul / Baturiti | `place=hamlet` node 13267721283; town node 13716722440 | -8.2848,115.1713 / -8.3465,115.1736 | kecamatan Baturiti rel 20447243 |
| Munduk | `place=village` node 13716722572 | -8.2684, 115.0778 | kecamatan Banjar rel 20447229 |
| Jatiluwih | `place=village` node 13716726260 | -8.3574, 115.1188 | desa Jatiluwih rel 20447390 |
| Tabanan | `place=town` node 13716722460 | -8.5183, 115.1321 | kecamatan Tabanan rel 20447242 |
| Tanah Lot | temple way 480035623 (no place) | | desa Beraban, kecamatan Kediri rel 20447241 |
| Singaraja | `place=town` node 2571002742 "Buleleng" | -8.1256, 115.1013 | kecamatan Buleleng rel 20447227 |
| Lovina | beach ways 285154447 / 285363378 (no place) | -8.16, 115.02 approx. | kecamatan Buleleng / Banjar |
| Pemuteran | `place=village` node 13716722602 | -8.1734, 114.6421 | kecamatan Gerokgak rel 18367399 |
| Gilimanuk | `place=suburb` node 291756158 | -8.1717, 114.4344 | kecamatan Melaya rel 20447253 |
| Negara | `place=town` node 429157244 | -8.3147, 114.6078 | kecamatan Negara rel 20447247 |
| Medewi | `place=village` node 13716722506 | -8.3787, 114.8231 | kecamatan Pekutatan rel 20447245 |
| Nusa Penida | island rel 3236970; town node 13716708736 | -8.7456, 115.5376 | kecamatan Nusa Penida rel 20447256 |
| Nusa Lembongan / Ceningan | island rels 9830649 / 9904711 | -8.6788,115.4500 / -8.6998,115.4515 | kecamatan Nusa Penida |

Names to add by hand with no OSM anchor at all: Uluwatu (as a district rather than the temple), Bukit Peninsula (the `place=village` "Bukit" in OSM is a different village in Karangasem), Umalas, Petitenget, Berawa, Bingin, Balangan, Echo Beach, Nusa Dua as a resort district, Lovina.

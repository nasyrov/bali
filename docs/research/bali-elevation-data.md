# Elevation data for Bali

Ticket: `.scratch/bali-moto/issues/02-bali-elevation-data.md`
Researched: 2026-09-08. All URLs were fetched on that date; sizes marked "measured" come from HTTP HEAD requests made the same day.

## Scope

Bali's land lies inside roughly 114.4E–115.8E, 8.0S–8.95S. That box sits entirely in one 1°×1° latitude band (9S–8S), so any 1°-tiled source needs exactly two tiles: the ones whose south-west corners are 9S/114E and 9S/115E. Cropped to the box at 1 arc-second the grid is 5040 × 3420 ≈ 17.2 M cells: 34 MB as int16, 69 MB as float32.

## Candidates

### 1. SRTM 1 arc-second Global, V003 (SRTMGL1)

- **Resolution.** 1 arc-second, ~30 m; 1°×1° tiles; global 60N–56S. https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003
- **Source and age.** Single 11-day Space Shuttle radar mission, February 2000. https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003
- **Licence and attribution.** NASA Earth science data are released as Creative Commons Zero; citation is "very strongly urged" but not a legal condition. https://www.earthdata.nasa.gov/learn/use-data/data-use-policy. Dataset DOI for the credit line: https://doi.org/10.5067/MEASURES/SRTM/SRTMGL1.003. The Tilezen attribution guide phrases the customary USGS credit as "SRTM data courtesy of the U.S. Geological Survey". https://github.com/tilezen/joerd/blob/master/docs/attribution.md
- **Download and account.** LP DAAC distribution (Earthdata Search, AppEEARS, direct HTTPS) requires an Earthdata Login. https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003. USGS also serves it through EarthExplorer. https://catalog.data.gov/dataset/shuttle-radar-topography-mission-1-arc-second-global. A no-account route exists: the Terrain Tiles bucket's `skadi` endpoint serves SRTM-derived 1°×1° `.hgt.gz` files (see candidate 4).
- **Format and size.** HGT: flat binary, 3601 × 3601 int16, big-endian, metres above the WGS84/EGM96 geoid; also NetCDF4. https://lpdaac.usgs.gov/documents/179/SRTM_User_Guide_V3.pdf. One tile is 25.9 MB uncompressed; Bali needs two (~52 MB, less when zipped).
- **Voids.** V003 ("SRTM Plus") is void-free: gaps were filled with ASTER GDEM2 first, then GMTED2010 or NED, using a delta-surface-fill "rubber sheet" merge. https://lpdaac.usgs.gov/documents/179/SRTM_User_Guide_V3.pdf, https://lpdaac.usgs.gov/documents/13/SRTM_Quick_Guide.pdf
- **Artifacts over vegetation and steep slopes.** The user guide states that both SRTM and ASTER "can have difficulty when collecting data in very steep and rugged terrain", and that the mission imaged from two look angles specifically "to fill areas shadowed from the radar signal by terrain". https://lpdaac.usgs.gov/documents/179/SRTM_User_Guide_V3.pdf. C-band radar does not reach the ground under forest; the NASADEM guide describes "limited SRTM microwave penetration within the forest canopy", so heights in forest sit inside the canopy, not on the ground. https://lpdaac.usgs.gov/documents/592/NASADEM_User_Guide_V1.pdf. LP DAAC's comparison guide adds that "SRTM contains more data voids over mountainous regions than the ASTER GDEM". https://lpdaac.usgs.gov/documents/642/DEM_Comparison_Guide.pdf. For Bali that means the forested upper slopes of Agung, Batur and the Bedugul range are where the fills and canopy bias concentrate.
- **Vertical accuracy.** Mission specification ~16 m absolute at 90% (quick guide). https://lpdaac.usgs.gov/documents/13/SRTM_Quick_Guide.pdf

### 2. NASADEM Merged DEM Global 1 arc-second, V001 (NASADEM_HGT)

- **Resolution.** 1 arc-second, ~30 m; same 1°×1° tiling and coverage as SRTM; tile named by its lower-left corner (e.g. `s09e115.hgt`). https://www.earthdata.nasa.gov/data/catalog/lpcloud-nasadem-hgt-001
- **What it is.** A reprocessing of the raw SRTM radar data with a better phase unwrapper, ICESat GLAS lidar as ground control, and voids filled mainly with ASTER GDEM plus ALOS PRISM AW3D30. Void area at strip level dropped by "more than 50%". https://lpdaac.usgs.gov/documents/592/NASADEM_User_Guide_V1.pdf
- **Licence and attribution.** Same NASA CC0 policy as SRTM. https://www.earthdata.nasa.gov/learn/use-data/data-use-policy. DOI: https://doi.org/10.5067/MEASURES/NASADEM/NASADEM_HGT.001
- **Download and account.** LP DAAC, Earthdata Login required. https://www.earthdata.nasa.gov/data/catalog/lpcloud-nasadem-hgt-001. No public S3 mirror equivalent to the Copernicus or Terrain Tiles buckets was found in primary sources.
- **Format and size.** Zip per tile (`NASADEM_HGT_s09e115.zip`) containing `.hgt` (3601 × 3601 int16, big-endian, metres above EGM96) plus a `.num` source-index layer. https://lpdaac.usgs.gov/documents/592/NASADEM_User_Guide_V1.pdf. Same ~26 MB per tile uncompressed as SRTM; two tiles for Bali.
- **Artifacts.** Still a February-2000 C-band radar surface, so the canopy problem is the same as SRTM; NASADEM handles "forest areas ... separately from bare ground surfaces" by estimating the in-canopy phase-centre height from ICESat waveforms, which reduces but does not remove the bias. https://lpdaac.usgs.gov/documents/592/NASADEM_User_Guide_V1.pdf. Fewer steep-terrain voids than SRTM ("void reduction when comparing" elevation maps "over steep terrain"). Same source.
- **Vertical accuracy.** The public catalogue page gives no single figure; the guide reports improved swath consistency after ICESat control. https://lpdaac.usgs.gov/documents/592/NASADEM_User_Guide_V1.pdf

### 3. Copernicus DEM GLO-30 (COP-DEM-GLO-30 Public)

- **Resolution.** 1 arc-second grid (30 m), 1°×1° tiles, global. https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- **Source and age.** TanDEM-X X-band radar, acquired 2011–2015, delivered as an edited DSM (WorldDEM). Same page.
- **Licence.** "Licence for Copernicus DEM instance COP-DEM-GLO-30-F Global 30m Full, Free & Open". Article 4 grants reproduction, distribution, communication to the public, and "adaptation, modification and combination with other data"; Article 5: free of charge; Article 3: worldwide, unlimited in time. https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf
- **Required attribution** (Article 6 of the same licence). Because the game will resample the data, clause (b) applies: `produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved`. Clause (c) also requires the sentence "The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30" in the licence or legal notice of anything that redistributes the data (a shipped heightmap counts). Clause (d): do not imply endorsement.
- **Download and account.** Public AWS bucket `s3://copernicus-dem-30m` (eu-central-1), Cloud Optimized GeoTIFF, "no AWS account needed" (`--no-sign-request`). https://registry.opendata.aws/copernicus-dem/. Path pattern `Copernicus_DSM_COG_10_<lat>_<lon>_DEM/<same>.tif`; tile list in `tileList.txt` at the bucket root. https://copernicus-dem-30m.s3.amazonaws.com/readme.html. Plain HTTPS works without any client: `https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_S09_00_E115_00_DEM/Copernicus_DSM_COG_10_S09_00_E115_00_DEM.tif` (measured: HTTP 200). The registry page asks for an access note in the form "Copernicus Digital Elevation Model (DEM) was accessed on [DATE] from https://registry.opendata.aws/copernicus-dem". Note that the Copernicus Data Space *view service* becomes restricted to registered CCM users from 28 July 2026 (https://dataspace.copernicus.eu/news/2026-7-17-copernicus-dem-30m-view-service-license-acceptance); that does not touch the AWS bucket, which answered anonymously on 2026-09-08.
- **Coverage check.** GLO-30 Public omits tiles over some countries (https://copernicus-dem-30m.s3.amazonaws.com/readme.html). Both Bali tiles are listed in `tileList.txt` (measured): `Copernicus_DSM_COG_10_S09_00_E114_00_DEM` and `Copernicus_DSM_COG_10_S09_00_E115_00_DEM`.
- **Format and size.** COG, float32, DEFLATE with floating-point predictor, 3600 rows, 1024-px internal tiles, EGM2008 vertical datum, `RasterPixelIsPoint` grid. https://copernicus-dem-30m.s3.amazonaws.com/readme.html, https://dataspace.copernicus.eu/sites/default/files/media/files/2024-06/geo1988-copernicusdem-spe-002_producthandbook_i5.0.pdf. Measured file sizes: S09E114 = 20.1 MB, S09E115 = 16.4 MB; 36.5 MB total for Bali as delivered (each tile is 51.8 MB uncompressed).
- **Accuracy.** Absolute vertical < 4 m LE90; relative vertical < 2 m for slope ≤ 20 % and < 4 m for slope > 20 %; horizontal < 6 m CE90. Values are global means and "local deviations can occur". Product handbook, Table 1.
- **Artifacts over vegetation and steep slopes.** It is a DSM "including buildings, infrastructure and vegetation" (handbook §1), so, like SRTM, forest canopy is in the height field; X-band penetrates even less than C-band. Unlike SRTM it was edited: voids, spikes, "implausible terrain structures" and shorelines were fixed and water bodies flattened (handbook §1). Any pixel filled from another DEM is flagged in the Filling Mask (FLM) with its source: ASTER, SRTM90, SRTM30, GMTED2010, AW3D30 and others (handbook Table 7). The FLM/EDM quality layers are not in the AWS COG bucket, only in the Copernicus Data Space delivery.
- **Age caveat (inference, no primary source found).** TanDEM-X data are from 2011–2015 and SRTM from 2000; Agung's 2017–2019 eruptions changed the summit crater. No source consulted quantifies this for Bali; at 30 m and in a low-poly game it is unlikely to matter.

### 4. AWS Terrain Tiles (Mapzen / Tilezen "Terrarium")

- **What it is.** A pre-tiled global elevation mosaic on S3, bucket `elevation-tiles-prod` (us-east-1) with an EU copy `elevation-tiles-prod-eu`; anonymous access. https://registry.opendata.aws/terrain-tiles/
- **Source over Bali.** The Tilezen source list has no Indonesia-specific DEM; SRTM (30 m, global except high latitudes) is the finest listed there, with GMTED at coarser zooms. https://github.com/tilezen/joerd/blob/master/docs/data-sources.md. So over Bali this is SRTM, with SRTM's canopy and steep-slope behaviour (candidate 1), re-projected to Web Mercator and resampled. The registry page calls the data "bare-earth", which SRTM is not.
- **Formats.** `terrarium/{z}/{x}/{y}.png`: elevation = `(R * 256 + G + B / 256) - 32768`, 256-px tiles to zoom 15 (512-px to zoom 14). `normal/`: surface normals plus quantised elevation in alpha. `geotiff/`: 512-px raw tiles. `skadi/{N|S}yy/{N|S}yy{E|W}xxx.hgt.gz`: 1° SRTM-style int16 tiles. https://github.com/tilezen/joerd/blob/master/docs/formats.md, https://github.com/tilezen/joerd/blob/master/docs/use-service.md
- **Resolution over Bali.** At 8.5°S a 256-px tile is ~37.8 m/px at z12, ~18.9 m/px at z13, ~9.4 m/px at z14 (computed from the Web Mercator formula). z12–z13 bracket SRTM's 30 m; higher zooms only interpolate. Terrarium encodes 1/256 m steps, but the SRTM source is whole metres.
- **Size for Bali (computed tile counts, measured tile sizes).** z12: 17 × 12 = 204 tiles, land tiles 30–52 KB (mean 39 KB over five samples), so under 8 MB. z13: 33 × 23 = 759 tiles at ~31 KB, so under 24 MB. Sea tiles are under 1 KB, so real totals are lower.
- **Licence and attribution.** No API key on S3. Underlying SRTM and GMTED2010 are US public domain; the required credits are "SRTM data courtesy of the U.S. Geological Survey" and "GMTED2010 data courtesy of the U.S. Geological Survey", and the Tilezen guide reminds users to check each source's terms themselves. https://github.com/tilezen/joerd/blob/master/docs/attribution.md
- **Operational note.** The S3 endpoints are not behind a CDN; the docs suggest fronting them with your own. https://github.com/tilezen/joerd/blob/master/docs/use-service.md. Tiles answered HTTP 200 on 2026-09-08 (measured).

### 5. Mapbox Terrain-RGB / Terrain-DEM and MapTiler Terrain-RGB

- **Mapbox.** Decode `height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)`; access token required; Terrain-RGB v1 stopped receiving updates in December 2021. https://docs.mapbox.com/data/tilesets/reference/mapbox-terrain-rgb-v1/. Its replacement Terrain-DEM v1 goes to zoom 14 and "is only available for use in the Mapbox SDKs", not the Raster Tiles API. https://docs.mapbox.com/data/tilesets/reference/mapbox-terrain-dem-v1/. Data sources and vertical datums vary by location and are not enumerated per country. Both pages require attribution when used publicly.
- **Mapbox terms (Product Terms, 21 July 2026).** §1.9: customer shall "not scrape or systematically download Licensed Map Content" and "not export, download, cache or store Licensed Map Content". §2.8.1: on-device caching of Mapping API content is allowed but limited to 30 days on the requesting device, and content may not be distributed "from a cache, by proxying, or by using a screenshot or other static image". https://www.mapbox.com/legal/product-terms (PDF linked from that page).
- **MapTiler.** Terrain-RGB v2 tileset, same decode formula, ~30 m globally, zoom to 14, WebP tiles, "a composite of high-resolution DEMs" that MapTiler does not enumerate. https://docs.maptiler.com/schema-raster/terrain-rgb/, https://docs.maptiler.com/guides/map-tiling-hosting/data-hosting/rgb-terrain-by-maptiler/. Tiles API: `https://api.maptiler.com/tiles/{tilesId}/{z}/{x}/{y}?key=...`, key mandatory. https://docs.maptiler.com/cloud/api/tiles/. Attribution "© MapTiler" (with logo on the free account). https://www.maptiler.com/terms/
- **MapTiler Cloud terms.** Results may be cached only in a single end-user's temporary cache; storing or redistributing map content "from a server-side cache or temporary storage" is prohibited; bulk downloading is prohibited "Unless otherwise agreed in writing"; deriving datasets from the service is limited to non-commercial or OpenStreetMap purposes. https://www.maptiler.com/terms/cloud/
- **Bearing on the game.** The pipeline preprocesses elevation offline into the game's own terrain mesh or heightmap and ships it from static hosting. Both vendors' terms forbid exactly that (bulk fetch, server-side storage, redistribution). They also add a runtime dependency on a metered key. Neither offers resolution over Bali beyond the 30 m sources above. Rule both out unless a paid on-prem dataset is bought; MapTiler sells one (https://www.maptiler.com/on-prem-datasets/dataset/terrain-rgb/), but that is a purchase decision, not a data quality one.

## Comparison

| | SRTMGL1 v3 | NASADEM | Copernicus GLO-30 | Terrarium (AWS) | Mapbox / MapTiler |
|---|---|---|---|---|---|
| Native resolution over Bali | 30 m | 30 m | 30 m | 30 m (SRTM), tiled | ~30 m, tiled |
| Acquisition | Feb 2000 | Feb 2000 (reprocessed) | 2011–2015 | Feb 2000 | undisclosed mix |
| Abs. vertical accuracy (spec) | ~16 m LE90 | improved, no single figure | < 4 m LE90 | as SRTM | undisclosed |
| Surface or bare earth | canopy (C-band) | canopy, ICESat-corrected | canopy (X-band DSM) | canopy | undisclosed |
| Edited (water, spikes, shorelines) | voids filled only | voids filled only | yes | as SRTM | unknown |
| Account | Earthdata Login | Earthdata Login | none | none | API key |
| Bali download | 2 HGT, ~52 MB raw | 2 zips, ~52 MB raw | 2 COGs, 36.5 MB | ~8 MB @z12, ~24 MB @z13 | metered |
| Licence | CC0, citation urged | CC0, citation urged | free, fixed notice + liability line | public domain, USGS credit | proprietary; no bulk/offline |
| Ready-tiled for a browser | no | no | no | yes | yes |

## Recommendation

**Use Copernicus DEM GLO-30 from the public AWS bucket, and treat AWS Terrain Tiles (Terrarium) as the fallback.**

Why GLO-30:

1. It is the most accurate 30 m model on offer (< 4 m LE90 against ~16 m for the SRTM lineage) and the only one that was edited for spikes, implausible terrain, shorelines and flat water, which is what a rider sees on volcano slopes and along the coast.
2. Its acquisitions are eleven to fifteen years newer than every SRTM-derived option.
3. No account, no key, two plain HTTPS GETs totalling 36.5 MB, both tiles confirmed present in the public tile list. That fits a repeatable build script.
4. The licence explicitly allows adaptation and redistribution, which is what shipping a derived heightmap or mesh is. The price is two fixed strings on the attribution screen: the "produced using Copernicus WorldDEM-30 ..." notice and the no-liability sentence. Add the AWS registry access note as courtesy.

What it does not fix: it is a surface model, so forest canopy on Agung, Batur and the Bedugul ridges will read some metres high. Every candidate here shares that flaw; nothing in the primary sources offers a bare-earth 30 m model for Indonesia without extra licensing.

Why not the others:

- **Terrarium** is convenient (already Web Mercator PNG, no key) but underneath is year-2000 SRTM with worse accuracy and no editing, resampled once more by Mapzen. Keep it as the fallback because it is the fastest path to a prototype: fetch the ~200 z12 tiles once, mirror them, decode with the published formula. Do not have the game fetch from `elevation-tiles-prod` at runtime; there is no CDN or availability promise.
- **SRTM and NASADEM** bring nothing GLO-30 lacks and require an Earthdata Login in the build path.
- **Mapbox and MapTiler** are ruled out by their terms, not their data: no bulk download, no server-side storage, no redistribution, plus a metered runtime key.

Pipeline sketch for the recommendation: download the two COGs in the build step, mosaic and crop to the island box, resample to whatever grid the world-scale ticket settles on (the native 5040 × 3420 float32 grid is 69 MB, far too large to ship raw), and quantise to 16-bit PNG or a compressed binary heightmap for the client. Keep the EGM2008 datum in mind if elevations are ever compared with GPS traces from OSM, which are ellipsoidal.

# Grilling: data pipeline architecture

Type: grilling
Status: resolved
Blocked by: 13, 14, 15
Map: ../map.md

## Question

How does map data get from OpenStreetMap and the elevation model into the running game?

Decide the offline build steps and their order, the tile grid (size, projection, what each tile holds: roads, terrain, buildings, land use, regions), the on-disk format (GeoJSON, a compact binary, glTF, a custom typed-array blob) and its compression, how tiles are loaded and evicted at runtime, the total expected data size, and how the pipeline is re-run when the data updates.

## Answer

**Tooling**: Node/TypeScript scripts do all geometry work (ribbon building, extrusion, rasterisation, chunk packing) and shell out to osmium for OSM clipping and filtering and to GDAL for DEM reprojection. Projection, ribbon and graph code live in a package shared with the runtime so pipeline and game never disagree. Python and Rust are not used.

**Stages**, run by one command (`npm run world`):
1. Fetch sources if missing: Geofabrik Nusa Tenggara extract, the Bali island relation, Copernicus GLO-30 tiles, OSM land polygons, Microsoft footprints for gap-fill cells.
2. osmium: clip to the island relation, filter to the tag sets each layer needs (highway, building, landuse/natural/leisure/waterway, place_of_worship, tourism, aeroway, traffic_signals).
3. GDAL: reproject the DEM to UTM 50S at 30 m aligned to the chunk grid.
4. Build the road graph island-wide: junction and end nodes with stable ids, edges with attributes, border splits at chunk edges, per-edge region id and traffic base weight.
5. Rasterise land cover (with raster fallback) and the region-id raster; resolve the regions and landmarks files against the extract, failing loudly on missing ids.
6. Terrain: flatten under roads, cut river channels, synthesise terrace steps and the beach strip, clip to land polygons.
7. Per chunk, in parallel workers: sample road heights, build ribbons and markings, extrude buildings and temples, place props, parked vehicles and landmarks, bake the three tiers.
8. Pack blobs and write the manifest.

Steps 4 to 6 are global and run once; 7 and 8 are per chunk. Incremental rebuilds hash each chunk's inputs (clipped OSM, DEM cells, regions, landmarks, pipeline version) and skip unchanged chunks.

**Format**: each chunk is a directory of small custom binary typed-array blobs, one per layer and tier where tiers apply: terrain (height grid, land-cover classes, vertex colours, indices), roads (positions, colours, indices, marking instances), buildings, props (instance transforms by kit id), graph (nodes, edges, lane data), colliders. A tiny header carries format version, chunk id and counts. Blobs are parsed in a Web Worker and transferred zero-copy. Compression is left to the host (Brotli, falling back to gzip).

**Globals**: one global bundle loaded before the first chunk: manifest (chunk ids, per-file sizes, pipeline version, extract timestamp), region-id raster, region table with parents and district fallbacks, landmarks table, weather sample points, a tier-2 island silhouette for the far horizon, and the low-poly asset kit.

**Streaming**: tier 0 within 1.5 km (the 3 by 3 block around the bike), tier 1 to 4 km, tier 2 to 9 km, each with an unload radius one chunk further out; a byte budget of about 300 MB in memory evicts least-recently-used chunks. Chunks load nearest first, ahead of the bike's heading first.

**Budget**: about 400 MB total compressed on disk across roughly 5,700 land chunks and three tiers; global bundle plus the starting near ring under 15 MB so the first ride begins within a few seconds. The performance ticket revisits these with measurements.

**App tooling** (added on the user's instruction): Vite for the game itself. `npm run dev` serves the game with Vite and serves the pipeline's `world/` output directory as static files, so a fresh chunk build is visible on reload without any deploy; `npm run build` produces the static site into `dist/` and the world data is published beside it (hosting ticket). The pipeline scripts run under Node directly, not through Vite. Both share one `package.json` and the shared geometry package.

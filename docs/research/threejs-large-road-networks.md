# Rendering an island-scale road network in three.js

Research for ticket `.scratch/bali-moto/issues/03-threejs-large-road-networks.md`. Written 2026-09-08 against three.js r185 (released 2026-07-01, https://github.com/mrdoob/three.js/releases/latest).

Question: what techniques let three.js render tens of thousands of kilometres of roads across an island roughly 150 km wide at 60 fps in a browser, low-poly style?

Short version: the island is small enough that the problem is one of organisation, not of raw GPU power. Keep every vertex buffer chunk-local, keep the camera near the origin by rebasing, stream 1 km chunks, merge each chunk into a handful of draw calls, and build road ribbons yourself. Details and sources below; the recommendation is at the end.

## 1. Float32 precision and jitter at island scale

### What the GPU can represent

- GLSL ES 3.00 (WebGL 2): "highp floating point values are stored in IEEE 754 single precision floating point format", i.e. a 24-bit significand. `mediump` only guarantees a 2^-10 relative precision over a (-2^14, 2^14) range. Fragment shaders have no default float precision; the shader must declare one. Source: GLSL ES 3.00 spec §4.5.1 "Range and Precision" and §4.5.4, https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf (Khronos blocks scripted downloads; the mirror at https://raw.githubusercontent.com/KhronosGroup/OpenGL-Registry/main/specs/es/3.0/GLSL_ES_Specification_3.00.pdf is identical).
- MDN restates the mediump numbers (range +/-2^14, relative precision 2^-10) and warns that unconditional `highp` in WebGL 1 fragment shaders breaks older mobile hardware. https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- WGSL (WebGPU) `f32` is "IEEE-754 binary32 (single precision) format"; there is no `f64` in WGSL, and `f16` is an optional extension. https://www.w3.org/TR/WGSL/
- three.js defaults shader precision to `highp` "if supported by the device" (`WebGLRenderer` `precision` option). https://threejs.org/docs/pages/WebGLRenderer.html

So on both backends, anything uploaded to the GPU is 32-bit. The spacing between representable floats (one ulp) at magnitude `x` is `2^(floor(log2 x) - 23)`:

| Distance from origin | ulp (positional resolution) |
|---|---|
| 4 km (2^12) | 0.5 mm |
| 16 km (2^14) | 2 mm |
| 75 km (2^16..2^17, Bali centre to coast) | 7.8 mm |
| 150 km (2^17..2^18, corner-origin worst case) | 15.6 mm |

The Cesium/AGI write-up gives the same threshold from the other direction: beyond 131,071 m (2^17) float32 loses the millimetre digits, and that is where visible jitter starts in their globe. https://help.agi.com/STKComponents/html/BlogPrecisionsPrecisions.htm (this is the "Precisions, Precisions" article that the CESIUM_RTC glTF extension cites; the cesium.com URL is dead).

Why 8-16 mm matters for a bike game: with a 60 degree vertical FOV at 1080 px, a pixel covers about 5 mm on a road 5 m from the camera. An error of one to three pixels that changes every frame as the camera moves reads as shimmer on road edges and markings. Bali at metres, with a fixed origin at the island centre, sits right at the edge of visible jitter; a corner origin is over it.

### Where the error actually enters in three.js

The precision loss is not in JavaScript. `Object3D.position`, `Matrix4.elements` (a plain JS `Array`, https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js) and every CPU-side matrix multiply are float64. The loss happens at two upload points:

1. Vertex attributes. `BufferAttribute` data is a typed array, normally `Float32Array`, uploaded as-is. https://threejs.org/docs/pages/BufferAttribute.html
2. Uniforms. The renderer copies `Matrix4.elements` into a `Float32Array(16)` before `gl.uniformMatrix4fv` (https://github.com/mrdoob/three.js/blob/dev/src/renderers/webgl/WebGLUniforms.js, `mat4array`). The modelViewMatrix is computed on the CPU in float64, so if the camera is close to the object its translation column is small and survives the cast; but `modelMatrix` and `cameraPosition` are uploaded with their full world magnitude.

The three.js forum thread "Lines and MeshLines jitter in big scene however CylinderGeometry does not" is exactly this: lines whose vertices held raw UTM coordinates (478700, 6772400) jittered, cylinders positioned via `mesh.position` with local geometry did not, because "you're storing huge values in vertex attributes which means they will be transformed on the gpu where float 32 operations at most are used" while the cylinders' large translations were "multiplied out when transforming into camera space and float 64 operations are used" on the CPU. The accepted fix was origin shifting; WebGL has no float64 attributes so this is "the only real option". https://discourse.threejs.org/t/lines-and-meshlines-jitter-in-big-scene-however-cylindergeometry-does-not-why/59901

The same conclusion appears in the older thread where geometry translated to 1,000,000 shook: keep the camera near the origin and translate the world, use relative coordinates, and consider a logarithmic depth buffer only for the depth side of the problem. https://discourse.threejs.org/t/moving-the-camera-model-will-shake-if-the-coordinates-are-large/7214

Two three.js paths that re-introduce float32 world positions even when the vertices are local:

- `InstancedMesh.instanceMatrix` is an `InstancedBufferAttribute` (float32) multiplied in the vertex shader. Instance translations must therefore also be small. https://threejs.org/docs/pages/InstancedMesh.html
- `BatchedMesh` stores per-instance matrices in a data texture, also float32. https://threejs.org/docs/pages/BatchedMesh.html

### The fix: relative-to-centre data plus origin rebasing

Industry references:

- Cesium's RTC ("relative to center"): vertices are stored relative to a centre point in float32; the centre is transformed into eye space on the CPU in double precision and folded into a replacement model-view matrix, which "avoids the 32-bit subtraction of large translation components on the GPU". https://github.com/KhronosGroup/glTF/blob/main/extensions/1.0/Vendor/CESIUM_RTC/README.md
- deck.gl: "To compensate for the lack of 64-bit floats in WebGL2/WebGPU, deck.gl may apply a dynamic translation to common-space positions, determined by the viewport, to improve the precision of projection." Its offset coordinate modes deliberately "trade accuracy for performance by approximating the projection with a linearized local projection system", fine "at local scales, such as small cities". https://deck.gl/docs/developer-guide/coordinate-systems
- The alternative, emulated doubles in the shader (luma.gl `fp64`, "double-single" pairs), costs "more than an order of magnitude" more GPU cycles than float32, doubles attribute memory, and the full module is GLSL-only with no WGSL port. Not worth it for a 150 km island. https://luma.gl/docs/api-reference/shadertools/shader-modules/fp64
- Babylon.js documents the same idea as floating origin: camera kept at (0,0,0), a double-precision position stored separately, and each frame "subtract the camera's double-precision position from each object's double-precision position". Its guidance that a single region should "not extend for more than, say, 10,000 units" matches the ulp table above. https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/scene/floating_origin.md
- three.js forum "Camera and floating point origin": the accepted approach is a single transform above the scene graph, "the camera is allowed to move in the three.js world, but you have to compensate for this by moving the meshes in opposite directions", optionally zeroing the view matrix translation in a custom vertex shader. https://discourse.threejs.org/t/camera-and-floating-point-origin/51486

### How to implement it in three.js (no library needed)

1. World coordinates in JS doubles, metres, origin at the island centre (projection is ticket 13's decision). Never put world coordinates into a `Float32Array`.
2. Every chunk's geometry is built in chunk-local coordinates (relative to the chunk centre). The chunk mesh gets `mesh.position.set(cx, cy, cz)` in doubles. This alone removes the vertex-attribute error, exactly as in the cylinder-vs-line thread.
3. Add a `worldRoot` Group above all chunks. Track `originOffset` (double). When `camera.position.length() > REBASE_RADIUS` (2-4 km keeps every uploaded translation under 0.5 mm ulp), subtract the camera position from `worldRoot.position` and from `camera.position`, and add it to `originOffset`. All chunk `position`s are relative to `worldRoot`, so nothing else moves; game logic converts with `world = local + originOffset`.
4. Instance matrices in `InstancedMesh`/`BatchedMesh` are relative to the chunk (or to `worldRoot` after rebasing), never to the true world origin.
5. Anything that reads world position in a shader (world-space UVs for road markings, triplanar terrain, custom TSL nodes) must use the rebased position; with a 2-4 km rebase radius that is safe.
6. Set `matrixAutoUpdate = false` on static chunk meshes and call `updateMatrix()` once; the renderer still recomputes `matrixWorld` when `worldRoot` moves, which for a few hundred chunk nodes is negligible. https://threejs.org/docs/pages/Object3D.html

Depth precision is a separate axis. `logarithmicDepthBuffer` exists "if dealing with huge differences in scale in a single scene" but "uses gl_FragDepth if available which disables the Early Fragment Test optimization and can cause a decrease in performance". https://threejs.org/docs/pages/WebGLRenderer.html. With near 0.5 m and far 10-15 km (far/near = 30,000) a 24-bit depth buffer is adequate for a ground vehicle, so the default should be off. `WebGPURenderer` offers `reversedDepthBuffer: true`, which is the cheaper modern fix if z-fighting appears at distance. https://threejs.org/docs/pages/WebGPURenderer.html

## 2. Chunked loading and unloading

three.js has no built-in streaming; the patterns come from its manual and from geospatial libraries built on it.

- Cell-per-mesh pattern (three.js manual, voxel chapter): the world is a dictionary keyed by cell id, each cell is one merged mesh regenerated from its own data, and the naive one-object-per-item approach "crashed" for large volumes. https://threejs.org/manual/en/voxel-geometry.html
- Removing a mesh from the scene does not free GPU memory: "three.js internally creates an object of type WebGLBuffer for each attribute. These entities are only deleted if you call BufferGeometry.dispose()"; same for `Material.dispose()` and `Texture.dispose()`. Track leaks with `renderer.info.memory`. https://threejs.org/manual/en/how-to-dispose-of-objects.html
- geo-three (tentone, three.js): tiles in a quadtree where each `MapNode` is a `THREE.Mesh`, with three pluggable LOD controllers (raycast sampling, radial distance, radial within frustum) that subdivide near nodes and simplify far ones; internal units are metres in EPSG:900913 with `UnitsUtils` for WGS84 conversion. https://github.com/tentone/geo-three
- 3DTilesRendererJS (NASA-AMMOS, three.js): tile selection by screen-space error (`errorTarget`), an `LRUCache` with `maxSize`/`maxBytesSize`; "Cache limits are hard caps. No new tiles load once the LRUCache reaches maxSize or maxBytesSize. If the tiles needed for the current view do not fit then coarser tiles are displayed and refinement stops." https://github.com/NASA-AMMOS/3DTilesRendererJS
- three-geo builds Mapbox RGB-DEM terrain as a `THREE.Group` of tile meshes for a lat/lon origin, radius (km) and zoom 11-17, and exposes `unitsPerMeter`. Useful for its tile-to-mesh code, not as a runtime dependency. https://github.com/w3reality/three-geo
- procedural-gl-js is three.js-based, with a "GPU powered level-of-detail system" for terrain tiles and line/marker overlays, MPL-2.0. https://github.com/felixpalmer/procedural-gl-js
- Streets GL (not three.js; its own WebGL2 engine) serves vector tiles "generated from OpenStreetMap data using modified Planetiler" and builds tile geometry at runtime; MIT. Its road-graph and tile-processing code is the best open reference for OSM road meshing, see section 3. https://github.com/StrandedKitty/streets-gl

Design that follows from these for Bali:

- Fixed square grid in the projected plane, 1 km chunks (an island 150 km wide is at most ~22,500 chunks, most of them sea and never loaded). Two rings: load radius (e.g. 6 km) and unload radius (e.g. 8 km) so a bike weaving along a chunk border does not thrash.
- Offline preprocessing into one binary blob per chunk (roads clipped to the chunk, coordinates chunk-local, already simplified per LOD tier, plus prop placements). At runtime the blob is parsed in a Web Worker and the typed arrays are transferred to the main thread, where creating the `BufferGeometry` is cheap.
- Cap in-flight loads and use an LRU with a byte budget as 3DTilesRenderer does, so a fast bike on a trunk road degrades to "coarse only" rather than stalling.
- Dispose geometry and any per-chunk textures on unload; materials are shared and never disposed.

## 3. Road meshes from polylines

### What three.js ships

- `Line2` / `LineSegments2` + `LineSegmentsGeometry` + `LineMaterial` ("fat lines"): each segment is an instanced quad (`instanceStart`/`instanceEnd`), expanded in the vertex shader; `linewidth` is in CSS pixels unless `worldUnits: true`. Segments get a "cap extension" so consecutive segments overlap "neatly"; there are no true joins. Because the quads are expanded perpendicular to the view direction, they are billboards, not flat ribbons lying on the ground, so they are wrong for a road seen at a grazing angle from a bike. Sources: https://threejs.org/docs/pages/LineMaterial.html, https://github.com/mrdoob/three.js/blob/dev/examples/jsm/lines/LineSegmentsGeometry.js, https://github.com/mrdoob/three.js/blob/dev/examples/jsm/lines/LineMaterial.js, example https://threejs.org/examples/webgl_lines_fat.html.
- `ExtrudeGeometry` with `extrudePath` extrudes a 2D `Shape` along a 3D curve ("Bevels are not supported for path extrusion"). Fine for a one-off kerb profile, too heavy and too many vertices for tens of thousands of km. https://threejs.org/docs/pages/ExtrudeGeometry.html
- `TubeGeometry` (used by the spline-extrusion example) sweeps a circle along a curve; not a road. https://threejs.org/examples/webgl_geometry_extrude_splines.html
- Community `THREE.MeshLine` is again a strip of "billboarded triangles". https://github.com/utsuboco/THREE.MeshLine

Conclusion: nothing in three.js builds a ground-hugging ribbon with joins; write a small ribbon builder. It is ~150 lines.

### Ribbon construction

Per polyline (already clipped to the chunk, chunk-local metres, elevation sampled from the terrain):

1. For each vertex compute the unit direction of the incoming and outgoing segments; the offset direction is the normalised sum (the miter), scaled by `halfWidth / cos(halfAngle)`.
2. Clamp the miter: mapbox-gl-js uses a `line-miter-limit`, treats corners under 5 degrees as straight (`COS_STRAIGHT_CORNER`), adds extra vertices at corners sharper than 75 degrees (`COS_HALF_SHARP_CORNER`), and approximates round joins with one triangle per 20 degrees (`DEG_PER_TRIANGLE`). Those constants are a good starting point; for a low-poly look a bevel join (two triangles) at anything sharper than the miter limit is enough. https://github.com/mapbox/mapbox-gl-js/blob/main/src/data/bucket/line_bucket.ts
3. Emit two vertices per polyline vertex (left/right) and an indexed triangle strip; `uv.y` accumulates distance along the road so a centre-line stripe or dashes can be a shader function of `uv`.
4. Width per class. Streets GL's rules: use the OSM `width` tag if present, else a per-class default width, else `lanes * 3` m, with a single lane road at 4 m; its class table gives `residential`, `unclassified`, `tertiary`, `secondary`, `primary`, `trunk`, `motorway` two default lanes, `*_link`, `service` (unmarked) and `track` (dirt, one lane) one lane, and `footway`/`path`/`cycleway` one lane of dirt. Sources: https://github.com/StrandedKitty/streets-gl/blob/dev/src/lib/tile-processing/vector/qualifiers/factories/vector-tile/helpers/getPathWidth.ts and https://github.com/StrandedKitty/streets-gl/blob/dev/src/lib/tile-processing/vector/qualifiers/factories/osm/helpers/getPathParamsFromTags.ts. Bali roads are narrower than European defaults; treat these as the upper bound and let the Canggu prototype (ticket 08) calibrate.
5. Intersections. Streets GL builds a road graph (`RoadGraph`, `Intersection`, `IntersectionPolygonBuilder`) and fills a polygon at each node so ribbons do not overlap; its `RoadBuilder.build` takes the polyline, width and the adjacent vertices of connected roads to trim the ends. https://github.com/StrandedKitty/streets-gl/tree/dev/src/lib/road-graph. For a flat-shaded low-poly style a cheaper approach works: draw ribbons with a shared material, set `depthWrite` normally, and add a filled convex polygon (or just a disc of the widest incoming width) at every node with degree >= 3; overlapping same-colour surfaces on a flat plane show no seam once `polygonOffset` keeps them above the terrain.
6. Merge all ribbons of one chunk into one `BufferGeometry` with a per-vertex colour or a small class id attribute, so a chunk of roads is one draw call regardless of how many ways it contains.

## 4. Props: InstancedMesh and merged geometry

- `InstancedMesh`: "reduce the number of draw calls" for "a large number of objects with the same geometry and material(s) but with different world transformations"; its `boundingSphere` is "automatically computed by the engine when needed" for culling, but must be recomputed after `setMatrixAt()` changes. https://threejs.org/docs/pages/InstancedMesh.html
- `BatchedMesh`: "a large number of objects with the same material but with different geometries or world transformations" in one multi-draw call (WebGL 2 `WEBGL_multi_draw`); `perObjectFrustumCulled` defaults to `true`, `sortObjects` to `true`; instances and geometries can be added, deleted and repacked with `optimize()`. https://threejs.org/docs/pages/BatchedMesh.html
- `BufferGeometryUtils.mergeGeometries(geometries, useGroups)`: "Merges a set of geometries into a single instance. All geometries must have compatible attributes." Returns `null` on failure. https://threejs.org/docs/pages/module-BufferGeometryUtils.html and https://github.com/mrdoob/three.js/blob/dev/examples/jsm/utils/BufferGeometryUtils.js
- The manual's "Optimize lots of objects" chapter: ~19,000 individual boxes ran "under 20 fps"; merged into one geometry with vertex colours, 60 fps. Cost: one material and no per-object movement. https://threejs.org/manual/en/optimize-lots-of-objects.html
- Example `webgl_instancing_performance` compares instanced, merged and naive at 1-10,000 objects and reports draw calls and GPU memory (instanced and merged both 1 call). https://threejs.org/examples/webgl_instancing_performance.html
- Example `webgl_mesh_batch` shows `BatchedMesh` with mixed cone/box/sphere geometries, up to 20,000 instances, versus a naive `Group`. https://threejs.org/examples/webgl_mesh_batch.html
- MDN's general rule: "'Batching' draw calls into fewer, larger draw calls will generally improve performance." https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

For this project: static props (palms, warungs, shrines, poles, rice-field markers) go in one `BatchedMesh` per chunk holding all prop geometries under one flat-shaded material, so each chunk's props are one draw call with per-instance culling for free. `InstancedMesh` per prop type is simpler but multiplies draw calls by prop-type count. Moving objects (traffic) are their own `InstancedMesh` per vehicle type across all chunks, updated each frame.

## 5. Level of detail

- `THREE.LOD`: `addLevel(object, distance, hysteresis)` "Adds a mesh that will display at a certain distance and greater"; `autoUpdate` picks the level per frame from camera distance; hysteresis is "a fraction of distance" to avoid flicker. https://threejs.org/docs/pages/LOD.html. The example uses five icosahedron levels at 50/300/1000/2000/8000 units for 1,000 objects. https://threejs.org/examples/webgl_lod.html
- `webgl_batch_lod_bvh` is the newer example combining `BatchedMesh` with per-instance LOD. https://threejs.org/examples/webgl_batch_lod_bvh.html
- Tile-based LOD (geo-three, 3DTilesRenderer) selects tile depth by distance or screen-space error instead of per-object levels.

For roads, per-object `LOD` is the wrong granularity; LOD by chunk ring is the natural fit:

| Ring | Distance | Content |
|---|---|---|
| Near | 0-2 km | All classes down to `residential`/`service`, full polyline detail, props, intersections |
| Mid | 2-6 km | `tertiary` and above, Douglas-Peucker simplified offline (1-2 m tolerance), no props or only large ones |
| Far | 6-15 km | `primary`/`trunk` only as a single flat colour, or nothing but terrain with roads baked into a low-res colour texture |

Because chunks are static, "LOD" is just which precomputed tier of the chunk blob is loaded; swapping tiers is a chunk reload, and `hysteresis` is the load/unload ring gap from section 2. Terrain gets the same treatment (a coarser mesh per ring).

## 6. Frustum culling of chunks

- Every object with `frustumCulled = true` (default) is tested per frame: `if ( ! object.frustumCulled || object.intersectsFrustum( _frustum ) )` in `projectObject`, which then always recurses into children (a Group is never culled as a whole; each mesh is tested individually). https://github.com/mrdoob/three.js/blob/dev/src/renderers/WebGLRenderer.js (`projectObject`)
- The test transforms `geometry.boundingSphere` by `matrixWorld` and checks it against the six planes (`Frustum.intersectsObject`). https://github.com/mrdoob/three.js/blob/dev/src/math/Frustum.js
- `BatchedMesh.perObjectFrustumCulled` culls per instance inside the batch; `InstancedMesh` culls the whole instanced mesh by one bounding sphere. https://threejs.org/docs/pages/BatchedMesh.html

Chunk design: one road mesh, one terrain mesh and one props `BatchedMesh` per chunk, each with a computed bounding sphere, gives correct culling from the default path with no custom code. With a 1 km grid and a 6 km load radius there are ~110 loaded chunks and ~330 objects to test per frame, which is trivial. If chunk counts grow (smaller chunks or larger radius), keep the default per-mesh test; a hand-written quadtree cull is not needed at this scale.

## 7. Draw-call and triangle budgets

Primary numbers:

- PlayCanvas guidelines: "100-200 draw calls is a rough target for low end mobile devices"; high-end desktops sustain thousands at 60 fps. https://developer.playcanvas.com/user-manual/optimization/guidelines/
- three.js manual: ~19,000 draw calls under 20 fps, 1 draw call 60 fps, same triangles. https://threejs.org/manual/en/optimize-lots-of-objects.html
- Measure with `renderer.info.render.calls` and `renderer.info.render.triangles`. https://threejs.org/docs/pages/WebGLRenderer.html

Applied to Bali (estimates, to be validated in the Canggu prototype):

- Draw calls: 3 per chunk (roads, terrain, props) plus traffic instanced meshes, sky, bike, UI. Near ring 13 chunks, mid ring ~100 chunks, of which frustum culling leaves roughly 40-50 percent: about 150-200 calls. That is fine on desktop and at the edge of the mobile guideline; on mobile drop the props batch beyond the near ring and shrink the mid ring.
- Triangles: a road ribbon is 2 triangles per polyline vertex. If the whole island's roads average one vertex per 15-20 m, the entire network is on the order of 4-6 million triangles, which is why it can never be resident at once. A 1 km chunk in dense Denpasar might hold 40-60 km of road, about 6-8k triangles; rural chunks a tenth of that. Near ring at full detail plus mid ring simplified is a few hundred thousand triangles for roads, and low-poly terrain at 20-50 m spacing adds ~2-5k triangles per chunk. A visible budget of 0.5-1 M triangles on desktop and 100-300k on mobile is realistic for flat-shaded geometry; the limiting factor will be overdraw and fill on mobile, not vertex count.

## 8. Open-source examples worth studying

three.js itself (https://github.com/mrdoob/three.js, examples at https://threejs.org/examples/):
- `webgl_instancing_performance`, `webgl_mesh_batch`, `webgl_batch_lod_bvh`, `webgl_lod`, `webgl_lines_fat`, `webgl_geometry_extrude_splines`, `webgl_geometry_terrain`; WebGPU twins `webgpu_mesh_batch`, `webgpu_lines_fat`.
- Manual chapters: optimize-lots-of-objects, voxel-geometry, how-to-dispose-of-objects (linked above).

Geospatial on three.js:
- geo-three, quadtree tiles with pluggable LOD, metres in Web Mercator. https://github.com/tentone/geo-three
- 3DTilesRendererJS, LRU cache and screen-space-error selection; also the most active three.js geospatial codebase. https://github.com/NASA-AMMOS/3DTilesRendererJS
- three-geo, terrain from Mapbox RGB DEM tiles. https://github.com/w3reality/three-geo
- procedural-gl-js, terrain LOD and line overlays. https://github.com/felixpalmer/procedural-gl-js

OSM roads (not three.js, but the reference implementations):
- Streets GL, road graph, intersection polygons, width per class, runtime tile geometry, MIT. https://github.com/StrandedKitty/streets-gl
- mapbox-gl-js `line_bucket.ts`, the canonical GPU polyline tessellation with miter/bevel/round joins. https://github.com/mapbox/mapbox-gl-js/blob/main/src/data/bucket/line_bucket.ts

Driving games: no maintained open-source three.js driving game built on OSM roads was found. `Dreitser/OpenStreetMap-Open-Road` is C# from 2015 (https://github.com/Dreitser/OpenStreetMap-Open-Road); the Hop.Earth repository returned HTTP 451 and could not be inspected; the "3D GeoTile" three.js showcase on the forum is closed source (https://discourse.threejs.org/t/3d-geotile-dynamic-tile-based-rendering-engine-with-three-js-openstreetmap/79325). Expect to write the road pipeline yourself, borrowing from Streets GL and mapbox-gl-js.

## 9. Is three.js still the right pick?

- Babylon.js 9.0 (announced 2025-10-24) added Large World Rendering: `useLargeWorldRendering: true` on the engine, or `useFloatingOrigin` per scene with `useHighPrecisionMatrix`, which offsets world/view/projection uniforms so the camera is effectively at the origin. It is marked experimental with known shadow, billboard and WebGPU-material issues. https://forum.babylonjs.com/t/new-large-world-rendering/61114 and https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/scene/large_world.md. Babylon also has built-in mesh LOD (`addLODLevel(distance, mesh)`, optional screen-coverage mode, https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/mesh/LOD.md) and thin instances (one draw call, "all or nothing" culling, https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/mesh/copies/thinInstances.md). 3DTilesRendererJS also supports Babylon.
- PlayCanvas: static/dynamic batch groups (same material, 65,535 vertices per batch, "Max AABB" trades draw calls against culling, https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/batching/), hardware instancing where "all instances are submitted for rendering by the GPU with no camera frustum culling taking place" (https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/hardware-instancing/), and the draw-call guideline quoted above. No floating-origin feature and no documented mesh LOD component (only Gaussian-splat LOD streaming); it is editor-centric.
- three.js: no floating origin, LOD only per object, no streaming; but `BatchedMesh`, `InstancedMesh`, `LOD`, `mergeGeometries`, `WebGPURenderer` with automatic WebGL 2 fallback (https://threejs.org/docs/pages/WebGPURenderer.html), TSL for backend-independent shaders, and the largest pool of geospatial code to borrow from.

Verdict: stay on three.js. The one feature that would argue for Babylon, built-in floating origin, is experimental there and is about fifty lines here once geometry is chunk-local (section 1). Everything else this project needs is either present in three.js or is project-specific pipeline code that no engine ships.

## Recommendation

1. Coordinates: metres, JS doubles, origin at the island centre. No world coordinate ever enters a `Float32Array`.
2. Chunks: fixed 1 km grid, one preprocessed binary per chunk per LOD tier, geometry chunk-local, parsed in a worker, streamed with load/unload rings and an LRU byte budget, disposed on unload.
3. Floating origin: a `worldRoot` group rebased whenever the camera is more than ~2-4 km from the rendering origin; instance matrices and any world-space shader math use the rebased frame. Keep `logarithmicDepthBuffer` off; use `reversedDepthBuffer` on WebGPU if far-distance z-fighting shows up.
4. Roads: custom ribbon builder (miter with limit, bevel fallback) using Streets GL's width rules as the starting table and mapbox-gl-js's corner thresholds; one merged `BufferGeometry` per chunk with a class attribute; node polygons at degree >= 3 intersections.
5. Props: one `BatchedMesh` per chunk (per-object culling built in); traffic as `InstancedMesh` per vehicle type.
6. LOD: three chunk rings (full / simplified major roads / trunk-only or baked), swapped by reloading tiers, with ring hysteresis.
7. Culling: rely on three.js per-mesh bounding-sphere culling; three objects per chunk is cheap enough.
8. Budgets: target under 200 draw calls and under 1 M visible triangles on desktop, under ~100 calls and ~300k triangles on mobile; verify with `renderer.info` in the Canggu prototype (ticket 08) before locking chunk size and ring radii.
9. Engine: three.js r185 with `WebGPURenderer` (WebGL 2 fallback) and TSL materials, so the flat-shaded look and the road-marking shader run on both backends.

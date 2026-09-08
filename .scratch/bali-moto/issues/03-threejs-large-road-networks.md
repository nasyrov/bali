# Research: rendering an island-scale road network in three.js

Type: research
Status: resolved
Blocked by: 
Map: ../map.md

## Question

What techniques let three.js render tens of thousands of kilometres of roads across an island roughly 150 km wide at 60 fps in a browser?

Cover: float32 precision and jitter at island-scale coordinates and the floating-origin / origin-rebasing fix; chunked or tiled scene loading and unloading; building road meshes from polylines (ribbon extrusion, joins, width per class); instancing and merged geometry for props; level of detail; frustum culling of chunks; typical draw-call and triangle budgets; known open-source examples (three.js examples, three-geo, procedural-gl-js, open-source driving games built on three.js). Also note whether three.js is still the right pick versus Babylon.js or PlayCanvas for this shape of project, briefly. Cite primary sources. Write findings to `docs/research/threejs-large-road-networks.md`.

## Answer

three.js stays the engine; the island is small enough that organisation, not GPU power, is the problem. Full findings with sources: [docs/research/threejs-large-road-networks.md](../../../docs/research/threejs-large-road-networks.md).

- Keep world coordinates in JS doubles (metres, origin at island centre) and never upload them: build every chunk's geometry chunk-local and place chunks via `Object3D.position`. Float32 resolution is ~8 mm at 75 km from origin, enough to shimmer a road edge; chunk-local data plus a `worldRoot` rebased whenever the camera drifts 2-4 km from the render origin removes it, including for `InstancedMesh`/`BatchedMesh` matrices, which are float32 too. Leave `logarithmicDepthBuffer` off.
- Stream a fixed 1 km chunk grid from preprocessed per-chunk binaries (three LOD tiers baked offline), parsed in a worker, with load/unload rings, an LRU byte budget, and explicit `dispose()` on unload.
- Roads: three.js has no ground-hugging ribbon helper (fat lines and MeshLine are billboards), so write a ~150-line miter/bevel ribbon builder; use Streets GL's width-per-class rules and mapbox-gl-js's corner thresholds; merge all ribbons of a chunk into one geometry with a class attribute.
- Props: one `BatchedMesh` per chunk (per-object culling built in); traffic as `InstancedMesh` per vehicle type. Rely on default per-mesh frustum culling with three objects per chunk.
- Budgets: under ~200 draw calls and ~1 M visible triangles on desktop, ~100 calls and ~300k triangles on mobile; verify with `renderer.info` in the Canggu prototype (ticket 08).
- Babylon.js 9.0 has a built-in but experimental floating origin; PlayCanvas has neither floating origin nor documented mesh LOD. Neither outweighs three.js's ecosystem (3DTilesRendererJS, geo-three, BatchedMesh, WebGPURenderer with WebGL 2 fallback).

# Prototype: real Bali roads rendered in three.js

Type: prototype
Status: resolved
Blocked by: 03, 06
Map: ../map.md

## Question

Does a real OSM road network of one area (Canggu) look and feel right when rendered as low-poly road meshes in three.js?

Using the Canggu sample from the OSM inventory task, generate road ribbons with width per highway class, put a simple controllable camera or placeholder bike on them, and load it in the browser. The human reacts to scale, road width, intersection look, and readability. The answer records what road classes are worth rendering, how wide each should be, and what broke.

## Answer

Yes: the real Canggu network reads well as low-poly ribbons, and the whole 6.6 km box renders in one go.

**Measured**: 5,804 ways, 32,818 nodes, 382k triangles, 32 draw calls, 85 fps on an M-series Mac with shadows on, no chunking, no LOD. Road meshes are one merged `BufferGeometry` per colour plus one `InstancedMesh` of round caps per colour and one for centre-line dashes.

**Decisions** (human reaction to variants A generic widths, B Bali-calibrated, C drivable-only with class colours):
- **Widths**: Bali-calibrated. Use the OSM `width` tag when present and sane (1 to 12 m); otherwise per-class defaults derived from the Canggu medians: motorway 12, trunk 8, primary 6, secondary 5.5, tertiary 4.5, unclassified 4, residential 3.5, living_street 2.2, service 2.5, track 2.5, path 1.5, footway 1.2, steps 1.2, pedestrian 3 m. Generic tables from western street renderers (secondary 9 m, residential 5 m) are about twice the real width; Jalan Raya Canggu is tagged 5 m.
- **Classes**: render every class. Footway, path, steps, pedestrian and cycleway are drawn thin and unpaved as decoration; whether they are rideable is for the road-representation ticket.
- **Colour**: by `surface` tag (asphalt dark 5a5651, paving_stones 8a8478, concrete 8d8a82, unpaved/dirt/ground 9c8560 and 8e7350, gravel 9a9184), with class-based fallbacks where the tag is missing: main classes asphalt, residential/living_street/service paving stones, track and below unpaved.

**What worked**: mitred ribbon joins plus a round cap at every node make junctions clean with no special junction geometry; drawing higher classes at a slightly higher y (4 mm per rank) hides overlaps; a 40 m grid over segments answers "which road am I on" every frame cheaply.

**What broke or needs care** (inputs to the road-representation and data-pipeline tickets):
- Mitre joins spike on sharp gang bends even with the mitre clamped at 2.5; use bevel or round joins in the real builder.
- Centre-line dashes run straight through junctions; dashes must be clipped where another road's cap overlaps, or only drawn on segments away from nodes.
- One junction spur (Gang Batu Sari at Jalan Pantai Berawa) showed a visible gap to the main road; check way splitting and the y-layering rule in the pipeline.
- Flat ground and flat sky only; terrain draping and the sky dome from the art-direction ticket were not exercised here.
- Local equirectangular projection was fine for a 6 km box; island scale needs the projection decided in the world-scale ticket.

Prototype: `prototypes/osm-roads/index.html` (throwaway; run `node prototypes/serve.mjs`, then `?variant=A|B|C`, W/A/S/D to ride, top view button). Screenshots and contact sheet in `prototypes/osm-roads/screenshots/`.

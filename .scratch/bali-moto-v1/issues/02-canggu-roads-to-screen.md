# 02 — Canggu roads from pipeline to screen

**What to build:** A developer runs the pipeline on the checked-in Canggu fixture and gets a manifest plus road blobs per chunk; opening the game shows every Canggu road rendered as low-poly ribbons in the golden-hour look under a fly camera, with chunks streaming in and out as the camera moves and no jitter at world scale. This ticket establishes the world data contract test.

**Blocked by:** 01

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Canggu fixture checked in: the existing Canggu OSM sample clipped to a small set of whole chunks, small enough for the pipeline to run in under a minute in a test
- [ ] Pipeline stages implemented for roads: fetch (skipped when sources exist), osmium clip and highway filter, road graph build (junction and end nodes with stable ids, edges with class, width, surface, oneway, lanes, name, bridge, layer), border splits preserving node ids, drop of proposed, construction, raceway and area ways, Paths kept as non-graph ribbons
- [ ] Widths from the OSM width tag when 1–12 m, else the Bali-calibrated per-class defaults from the spec; colour by surface tag with class fallbacks
- [ ] Ribbon builder in the shared package: bevel joins, round caps at every node, class-ordered height offsets, centre dashes on tertiary and above clipped within one road width of junctions, edge lines on motorway and trunk
- [ ] Tier 0 road blob per chunk and a manifest listing chunks, per-file sizes, format version and extract timestamp; a graph blob per chunk
- [ ] Runtime loads the manifest, parses blobs in a Web Worker with zero-copy transfer, streams chunks in rings with hysteresis and a byte budget, and rebases the world root when the camera drifts 2 km
- [ ] Golden-hour material, palette, haze and static sky from the art-direction decision; flat ground plane for now
- [ ] World data contract test: pipeline on the fixture asserts expected chunk ids, graph connectivity across a border split, Jalan Raya Canggu width equal to its tag, and that an unchanged rebuild writes no chunk files

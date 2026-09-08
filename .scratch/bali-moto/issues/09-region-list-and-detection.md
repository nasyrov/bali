# Grilling: which regions exist and how the game knows you are in one

Type: grilling
Status: resolved
Blocked by: 
Map: ../map.md

## Question

What is the list of named areas the game recognises, and how is the current one determined?

Decide the initial region list (for example Kuta, Legian, Seminyak, Canggu, Berawa, Pererenan, Denpasar, Sanur, Jimbaran, Uluwatu, Nusa Dua, Ubud, Kintamani, Amed, Lovina, Bedugul, Munduk, Sidemen, Padang Bai, Tabanan, Gilimanuk…), how their polygons are authored (geojson.io, hand-drawn over OSM), how overlaps and gaps resolve (nested areas, a fallback to the official district name or 'the road to X'), and how the name is presented when you cross a boundary.

## Context from research

The buildings and land-use research found that OSM `place=*` nodes miss several names people use (Uluwatu, Nusa Dua, Lovina, Berawa, Bingin, Umalas, Petitenget), while official desa (`admin_level=7`, 716 relations) and kecamatan (`admin_level=6`, 57) boundaries are complete for Bali. It proposes starting curated polygons from desa boundaries, merged and renamed, rather than drawing from scratch, and includes a ~45-row seed region table with OSM ids. See [osm-bali-buildings-landuse.md](../../../docs/research/osm-bali-buildings-landuse.md). The decision on whether curated regions are hand-drawn or desa-derived belongs to this ticket.

## Answer

**Geometry**: regions are unions of official OSM boundaries (desa `admin_level=7`, occasionally kecamatan `admin_level=6`), given the name people use. A few regions need a hand-drawn cut polygon inside a desa (Uluwatu inside Pecatu, Berawa inside Tibubeneng, Petitenget and Umalas inside Kerobokan Kelod, Echo Beach inside Canggu, Bingin/Balangan inside Pecatu). Nusa Penida, Lembongan and Ceningan are excluded (out of scope).

**Coverage**: every point on the island has a name. Curated regions win; anywhere else shows the kecamatan name (57 of them, complete in OSM). The label is never blank.

**Granularity**: fine, about 45 regions, matching the research seed list. Initial list, with parent in brackets where nested:

- Badung and Denpasar: Canggu; Berawa [Canggu]; Pererenan [Canggu]; Echo Beach [Canggu]; Kerobokan; Umalas [Kerobokan]; Petitenget [Kerobokan]; Seminyak; Legian; Kuta; Tuban; Jimbaran; Bukit; Uluwatu [Bukit]; Bingin & Balangan [Bukit]; Ungasan [Bukit]; Nusa Dua [Bukit]; Tanjung Benoa [Bukit]; Sanur; Serangan; Denpasar.
- Gianyar: Batubulan; Sukawati; Mas; Ubud; Tegallalang; Payangan; Keramas; Gianyar.
- Klungkung and Karangasem: Semarapura; Sidemen; Padangbai; Candidasa; Amlapura; Amed; Tulamben.
- Bangli: Kintamani; Bangli; Penglipuran.
- Tabanan and Buleleng: Tanah Lot; Tabanan; Jatiluwih; Bedugul; Munduk; Lovina; Singaraja; Pemuteran.
- Jembrana: Medewi; Negara; Gilimanuk.

**Nesting**: two levels, both shown. A region may have one parent; the label reads "Berawa · Canggu" or "Bingin & Balangan · Bukit". Regions without a parent show alone; kecamatan fallback shows alone.

**Display**: a small persistent label only, no arrival banner. Where it sits is for the HUD ticket.

**Boundary behaviour**: debounce. A new region is committed after about two seconds continuously inside it, so border roads do not flicker.

**Runtime lookup**: the pipeline rasterises the resolved region polygons into a coarse grid, about 25 m cells, one byte per cell holding a region id (0 = sea), roughly 2 MB for the island before compression; the runtime does one array read per frame. Parents and fallbacks resolve from a small region table, not from the raster.

**Authoring**: one checked-in regions file (YAML or JSON), one entry per region: game name, optional parent, the OSM relation ids it unions, optional cut polygon (GeoJSON, hand-drawn in geojson.io), and an anchor coordinate for map labels. The pipeline resolves it against the island extract and fails loudly if an id is missing. Seed ids and coordinates are in [osm-bali-buildings-landuse.md](../../../docs/research/osm-bali-buildings-landuse.md), section 5.

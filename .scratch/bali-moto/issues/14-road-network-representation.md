# Grilling: how roads are represented in the game

Type: grilling
Status: resolved
Blocked by: 06, 07, 08
Map: ../map.md

## Question

Which roads exist in the game, and how are they modelled?

Decide which `highway` classes are rendered as rideable roads, which are decoration, and which are dropped (gangs, footways, paths, tracks); road width and surface per class; how one-way and dual carriageways are handled; how intersections are built; road markings; bridges; and what the road graph looks like as a data structure for both rendering and traffic.

## Context from the inventory task

Measured class and tag distributions for the whole island are in [bali-osm-inventory.md](../../../docs/research/bali-osm-inventory.md). Headlines: residential, living_street and service are 81% of ways; path, track, footway and steps are 17% of kilometres; main roads are tagged mostly trunk and tertiary; width and lanes are tagged on under 7% of ways and width almost only on 1-3 m gangs, so per-class defaults are unavoidable. There are also 6 `proposed`, 32 `construction` and 10 `raceway` ways to decide on.

## Context from the real-roads prototype

Already decided there and not to be reopened: Bali-calibrated widths with the OSM width tag first, every class rendered, colour by surface tag. Open for this ticket: which of those classes are rideable, how bevel or round joins replace mitres, how dashes are clipped at junctions, one-way and dual carriageways, bridges, and the road graph data structure. See the ticket's answer for the defect list.

## Answer

Widths (OSM width tag first, then Bali-calibrated per-class defaults), rendering every class, and colour by surface tag were decided in the real-roads prototype and stand.

**Road graph membership**: motorway, trunk, primary, secondary, tertiary, unclassified, residential, service and living_street, with their `_link` variants, form the road graph that traffic drives on and that names the road under the bike. Track, path, footway, steps, pedestrian and cycleway are rendered as thin unpaved ribbons but are not in the graph; on one of them the HUD names the nearest graph road or shows "path". The player can ride anywhere on land regardless.

**One-way and lanes**: traffic honours `oneway`; the player is free. Lane count defaults to one per direction (one total for one-way) unless `lanes` says otherwise. Dual carriageways stay as the two separate OSM ways with whatever is between them; no synthetic median.

**Ribbon geometry**: per-segment quads with a bevel triangle at each bend and a round cap disc at every node. Junctions need no special geometry because caps overlap. Higher classes are drawn a few millimetres above lower ones. This replaces the prototype's mitres and removes the spikes.

**Markings**: dashed centre line on trunk, primary, secondary and tertiary; solid on motorway; edge lines on motorway and trunk only; none on unclassified, residential, service or gangs. Dashes stop within one road width of any junction node.

**Bridges and tunnels**: ways tagged `bridge` are raised by `layer` (default 1) times about 5 m with ramps at each end, a slab under the ribbon and low-poly railings; the Mandara toll road becomes a causeway over the sea. Tunnel ways are drawn at terrain level with a darkened portal.

**Odd classes**: `proposed`, `construction` and `raceway` are dropped in the pipeline; `corridor`, `rest_area` and `bridleway` render as paths. Ways with `area=yes` are dropped.

**Data structure**: a node-edge graph. Nodes are OSM junction and end nodes with stable ids; edges are polylines between them carrying class, width, surface, oneway, lane count, name, bridge and layer, plus region id per edge for the HUD. Stored per chunk; an edge crossing a chunk border is split at the border with the shared node id preserved, so traffic and "which road" queries work across chunks. Lane centrelines for traffic are derived from edges at load time, not stored.

**Level of detail**: three tiers baked per chunk as separate files. Tier 0 full detail for the near ring. Tier 1 polylines simplified to 1 m tolerance with living_street, service and non-graph classes dropped for the middle ring. Tier 2 tertiary and above only, 5 m tolerance, no caps or markings, for the far ring under the haze. Ring radii are set in the data pipeline ticket and revisited in the performance budget.

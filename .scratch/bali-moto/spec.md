# Bali Moto: spec

Status: ready-for-agent
Source: wayfinder map at `map.md` (26 resolved tickets under `issues/`), glossary at the repo root `CONTEXT.md`, research under `docs/research/`.

## Problem Statement

People who have ridden a scooter around Bali remember the roads: the gang behind the villa, the coast road to Tanah Lot, the climb to Kintamani in the afternoon rain. Nothing lets them ride those exact roads again from a laptop. Existing driving games invent their maps; map viewers show the real roads but you cannot ride them; and nothing ties the island to the hour and weather it is actually having right now.

## Solution

Bali Moto is a free single-player browser game in which you ride one automatic scooter across the whole island of Bali on its real road network, built from OpenStreetMap and a real elevation model, rendered in a flat-shaded low-poly "golden hour" style. There are no missions, timers or fail states: it is a Ride. The game runs on real Bali time with the real sun, moon and live weather, so a ride at 6 pm Bali time is a golden-hour ride and a wet-season afternoon rains. Ambient Traffic shares the roads, a small label always tells you which Region you are in ("Berawa · Canggu"), and every Region and Landmark you pass is quietly remembered.

## User Stories

Riding

1. As a rider, I want to start my first ride on Jalan Raya Canggu within seconds of opening the page, so that I am on a road I recognise before I have read anything.
2. As a rider, I want to steer, accelerate and brake with the keyboard, so that I can ride with no setup.
3. As a rider, I want the scooter to feel punchy but plausible, topping out around 90 km/h on asphalt, so that gangs are manageable and main roads are fun.
4. As a rider, I want to leave the road and cross grass, sand, rice paddies, steps and shallow water at reduced speed, so that the island is not fenced.
5. As a rider, I want hills to slow me and descents to speed me up, so that the volcano roads feel like climbs.
6. As a rider, I want hitting a wall, a tree or a vehicle to bump me, slow me and shake the camera without ending the ride, so that mistakes cost a moment, not progress.
7. As a rider, I want to reverse slowly out of a dead end, so that a wrong turn in a gang is not a trap.
8. As a rider, I want a key that puts me back on the nearest Road facing along it, so that I can recover from water or a ditch.
9. As a rider, I want wet roads to make the bike sway a little and brake longer, so that rain is felt.

Camera

10. As a rider, I want a third-person chase camera that swings through corners, pulls back at speed and leans with the bike, so that riding looks and feels like riding.
11. As a rider, I want the camera never to clip inside buildings, so that gangs remain readable.
12. As a rider, I want to hold the mouse to look around and have the view snap back, so that I can admire a view without stopping.
13. As a rider, I want the HUD to fade while I look around, so that screenshots are clean.

The world

14. As a rider, I want every road on the island to exist, from the Mandara toll road to the narrowest gang, so that I can ride to any real place.
15. As a rider, I want road widths to match Bali (a gang is one scooter wide, Jalan Raya Canggu is five metres), so that the scale is honest.
16. As a rider, I want paving-stone gangs, asphalt main roads and dirt tracks to look different, so that I can read the surface before I am on it.
17. As a rider, I want bridges to cross rivers and the toll road to cross the sea, so that the network is not flattened onto the terrain.
18. As a rider, I want real hills, cliffs and volcano slopes from an elevation model, so that Uluwatu, Kintamani and Bedugul look like themselves.
19. As a rider, I want rice terraces on sloped farmland, rivers in shallow gorges and a beach along the coast, so that the countryside reads as Bali.
20. As a rider, I want buildings everywhere OSM has them with terracotta roofs, compound walls along gangs and shopfronts on main roads, so that towns feel inhabited.
21. As a rider, I want every temple on the island to look like a temple, with a split gate and meru towers, so that the sacred landscape is visible.
22. As a rider, I want Tanah Lot, Uluwatu, Ulun Danu Bratan, Besakih, the Handara and Lempuyang gates and the airport to be recognisable, so that reaching them is a moment.
23. As a rider, I want palms, banana plants, penjor poles, shrines, warungs, power poles, parked scooters and jukung boats along the roads, so that the roadside is dense and specific.
24. As a rider, I want vegetation to sway with the real wind, so that the island is alive.
25. As a rider, I want the sea to be a calm shimmering plane I can wade into but not cross, so that the island's edge is clear.

Time and weather

26. As a rider, I want the game clock to be the real time in Bali with no override, so that the ride is Bali now.
27. As a rider, I want the sun and moon where they really are for today's date, with a real moon phase and a star field, so that the sky is honest.
28. As a rider, I want golden hour to be as short and as golden as it really is, so that catching it matters.
29. As a rider, I want nights to be readable and moonlit, with headlight, street lamps on main roads, glowing windows and traffic lights, so that night rides are possible and beautiful.
30. As a rider, I want the weather to be Bali's live weather, varying between the coast and the mountains, so that the mountains can be in cloud while Kuta is sunny.
31. As a rider, I want rain to fall around me, darken the road and thicken the haze, and storms to flash and rumble, so that weather is felt.
32. As a rider, I want the game to keep working offline or when the weather feed fails, so that a lost connection does not stop a ride.

Regions and orientation

33. As a rider, I want a small label telling me the Region I am in by the name people actually use ("Berawa · Canggu"), so that I always know where I am.
34. As a rider, I want the label to fall back to the District name in the countryside, so that I am never nowhere.
35. As a rider, I want the label not to flicker on roads that run along a border, so that it is trustworthy.
36. As a rider, I want to see the current road name under the Region, so that I can find my way by street.
37. As a rider, I want a rotating corner minimap of nearby roads and a full-screen island map on a key, so that I can plan a ride and see where I have been.
38. As a rider, I want visited Regions and Landmarks shaded on the map and counted in the pause menu, so that exploration is quietly recorded without becoming a chore.
39. As a rider, I want my position and my visited set to survive closing the tab, so that a long ride can continue tomorrow.
40. As a rider, I want a "start fresh" option, so that I can hand the game to a friend.

Traffic

41. As a rider, I want scooters, cars, pickups, trucks and bemos on the roads in Bali's proportions, driving on the left, so that the roads feel like Bali's.
42. As a rider, I want traffic to be dense in Denpasar and Kuta at rush hour and near-empty in the mountains at night, so that place and time show in the traffic.
43. As a rider, I want scooters to filter past cars and ride two abreast, so that traffic looks Balinese rather than generic.
44. As a rider, I want traffic to brake behind me, yield to me at junctions on the same rules it uses for itself, and swerve and honk if I ride against a one-way, so that I am part of the traffic.
45. As a rider, I want junctions to work by priority and gap acceptance, roundabouts to flow and lights to exist only where Bali has them, so that traffic never gridlocks and never looks like a western city.
46. As a rider, I want parked scooters and cars at kerbs and outside warungs, so that streets are not bare.

Sound

47. As a rider, I want an engine note that rises with speed and a wind rush, so that speed is audible.
48. As a rider, I want to hear surf on the coast, frogs in the paddies at night, roosters at dawn, dogs in the gangs and faint gamelan near temples, so that the island sounds like itself.
49. As a rider, I want rain, wind and delayed thunder, so that weather is audible.
50. As a rider, I want to hear the nearest traffic and a horn when someone swerves, so that traffic has presence.
51. As a rider, I want no music, so that the ambience is the soundtrack.
52. As a rider, I want one volume slider, so that audio is simple to control.

Performance and delivery

53. As a rider on an integrated-GPU laptop, I want 60 frames per second, so that the ride is smooth.
54. As a rider on a slower machine, I want the game to lower quality automatically rather than stutter, and to let me pin a quality level, so that it stays playable.
55. As a rider, I want the first ride to start after a download of under 15 MB and the island to stream in as I ride, so that I am not waiting on 400 MB.
56. As a rider, I want chunks to load ahead of me without pop-in, hidden by the haze, so that streaming is invisible.
57. As a rider, I want the game at a public URL with no account, so that I can share a link.

Credits and licensing

58. As a rider, I want to see who made the data and assets on the loading screen and in a credits screen, so that the sources are honoured.
59. As an OpenStreetMap contributor, I want the ODbL attribution visible without interaction and linked to the copyright page, so that the licence is met.
60. As a Copernicus data provider, I want the required "produced using" notice and the liability sentence present, so that the licence is met.

Developer

61. As the developer, I want one command that downloads sources and builds the whole island's world data, rebuilding only changed chunks, so that data iteration is fast.
62. As the developer, I want the pipeline and the runtime to share one projection and geometry package, so that they never disagree.
63. As the developer, I want a Vite dev server that serves the game and the pipeline output together, so that a fresh build is visible on reload.
64. As the developer, I want the pipeline to fail loudly when a Region or Landmark references a missing OSM id, so that data drift is caught at build time.
65. As the developer, I want a Canggu fixture small enough to run the whole pipeline in a test, so that the world data contract is tested end to end.
66. As the developer, I want a renderless World I can tick with scripted input in a test, so that handling, regions, traffic and lighting are tested without a GPU.
67. As the developer, I want a scripted benchmark route that records frame times and flags regressions in CI, so that the performance budget is enforced.
68. As the developer, I want the site to deploy from CI on push and the world data to publish with a separate hash-based command, so that code and data release independently.
69. As the developer, I want the build to fail if any asset lacks a licence entry, so that the credits screen is always complete.

## Implementation Decisions

Vocabulary follows the glossary: Region, District, Road, Path, Gang, Chunk, Landmark, Traffic, Ride.

### Architecture overview

The system has two halves joined by the world data contract.

- The **pipeline** is an offline TypeScript program that turns public sources into versioned world data: a global bundle plus one directory of binary blobs per Chunk. It shells out to osmium for OSM clipping and to GDAL for elevation reprojection; all geometry work is TypeScript.
- The **runtime** is a Vite-built static site. Its core is a renderless **World** that owns the simulation state (bike, streaming, Regions, Traffic, clock, sun, weather, lighting values, discovery) and is advanced by a tick with keyboard input and a clock. Rendering (three.js), audio (Web Audio), the HUD and persistence are thin views over World state. Traffic simulation and Chunk parsing run in Web Workers.
- A **shared package** holds the projection (longitude and latitude to world metres and back), the road ribbon builder, the road graph types and the blob format codecs, used by both halves.

### World scale and coordinates

One unit is one metre; no compression and no vertical exaggeration. Projection is UTM zone 50S on WGS84 (EPSG:32750). World x is easting minus 287,500; world z is 9,065,500 minus northing (south positive); world y is elevation in metres. The frame is three.js Y-up, right-handed; headings are measured from north, clockwise. The runtime never sees longitude and latitude except in the Regions and Landmarks files and debug tools.

Chunks are a fixed 1 km grid aligned to the world origin; all vertex, instance and collider data in a Chunk is relative to the Chunk centre, and the Chunk group is positioned in doubles. A world root group is rebased whenever the camera drifts more than 2 km from the render origin; game logic keeps true world positions in doubles and converts through the current origin offset. Logarithmic depth buffering stays off.

### Sources

- Roads, buildings, land cover, waterways, temples, landmarks, signals and boundaries: the Geofabrik Nusa Tenggara extract, clipped to the Bali island relation (2130352) so Nusa Penida, Lembongan and Ceningan are excluded. The Geofabrik file is rebuilt daily; the game treats the pack as a versioned artifact rebuilt per release.
- Elevation: Copernicus DEM GLO-30 from the public AWS bucket, two tiles, reprojected to UTM 50S at 30 m aligned to the Chunk grid.
- Land and sea: OSM land polygons from osmdata.openstreetmap.de.
- Building gap-fill: Microsoft Global ML Building Footprints, used only in 0.25 degree cells where the OSM to Microsoft footprint ratio is under 0.8, skipping any footprint overlapping an OSM one.
- Weather: a free keyless forecast API (Open-Meteo or equivalent; confirm terms), current cloud cover, precipitation rate, wind speed and direction.
- Region and Landmark definitions: two checked-in files of OSM relation and node ids (below).

### Pipeline stages

One command runs, in order: fetch sources if missing; osmium clip and tag-filter; GDAL reproject the DEM; build the road graph island-wide; rasterise land cover and the Region-id raster and resolve the Regions and Landmarks files; shape the terrain (flatten under Roads, cut rivers, synthesise terraces and the beach strip, clip to land); then per Chunk in parallel workers sample road heights, build ribbons and markings, extrude buildings and temples, place props, parked vehicles and Landmarks, and bake three tiers; finally pack blobs and write the manifest. Stages four to six are global and run once; the per-Chunk stages skip Chunks whose input hashes (clipped OSM, DEM cells, Regions, Landmarks, pipeline version) are unchanged. Missing OSM ids in the Regions or Landmarks files fail the build.

### Road graph and Paths

Graph classes are motorway, trunk, primary, secondary, tertiary, unclassified, residential, service and living_street with their link variants. Track, path, footway, steps, pedestrian and cycleway are Paths: rendered as thin unpaved ribbons, absent from the graph, never used by Traffic. Proposed, construction, raceway and area ways are dropped; corridor, rest_area and bridleway render as Paths.

Nodes are OSM junction and end nodes with stable ids. Edges are polylines between nodes carrying class, width, surface, one-way flag, lane count, name, bridge flag, layer and Region id. Edges crossing a Chunk border are split at the border with the shared node id preserved, so Traffic and "which Road" queries work across Chunks. Lane centrelines are derived from edges at load time, one lane per direction unless the lanes tag says otherwise; Traffic honours one-way, the rider is free. Dual carriageways remain the two tagged ways with no synthetic median.

Width comes from the OSM width tag when present and between 1 and 12 m; otherwise per-class defaults calibrated on Bali: motorway 12, trunk 8, primary 6, secondary 5.5, tertiary 4.5, unclassified 4, residential 3.5, living_street 2.2, service 2.5, track 2.5, path 1.5, footway 1.2, steps 1.2, pedestrian 3 m. Generic western width tables were measured at about twice Bali's real widths and are not used.

Colour is by surface tag (asphalt, paving stones, concrete, unpaved, dirt, gravel, paved), with class-based fallbacks where the tag is missing: main classes asphalt, residential and gangs paving stones, tracks and Paths unpaved.

### Road geometry

Ribbons are per-segment quads with a bevel triangle at each bend and a round cap disc at every node; junctions need no special geometry because caps overlap. Higher classes are drawn a few millimetres above lower ones. Mitre joins are not used (the prototype showed spikes on hairpins). Centre lines are dashed on trunk to tertiary, solid on motorway, absent below; edge lines only on motorway and trunk; dashes stop within one road width of any junction node. Bridge ways are raised by their layer (default 1) times about 5 m with ramps at each end, a slab under the ribbon and low-poly railings; tunnels are drawn at terrain level with a darkened portal.

Three tiers are baked per Chunk as separate files: tier 0 full detail; tier 1 polylines simplified to 1 m tolerance with living_street, service and Paths dropped; tier 2 tertiary and above only at 5 m tolerance with no caps or markings.

### Terrain

Per Chunk a 34 by 34 vertex grid at 30 m spacing, flat-shaded, for tier 0; 60 m for tier 1 and 120 m for tier 2, with the grids nesting so tier boundaries share edge vertices. Before Roads are sampled, every terrain vertex within a Road's width plus a 6 m margin is pulled toward the Road's smoothed centreline height, full weight under the Road and feathered over the margin; Roads then take their heights from the flattened grid, so they never float, sink or lean. Where land cover is farmland and slope exceeds about 8 degrees, height is quantised into steps of about 1.5 m with a short vertical wall (terraces); flat farmland stays flat. Waterway lines cut a channel about 2 m deep within roughly 4 m of the line with a water ribbon at the bottom; lakes are water polygons at DEM height. Terrain exists only inside the land polygons; the sea is one flat plane at height 0 with a slow animated colour shimmer; a sand strip about 8 m wide is synthesised along unmapped coastline. Each vertex carries one land-cover class (paddy, forest, scrub, orchard, built, water, mangrove, beach, and a raster fallback for the unmapped countryside) and the palette colour for that class; one material, no textures. The runtime reads height and slope by bilinear lookup on each loaded Chunk's post-flattening height grid; the same grid drives the bike, prop placement and Traffic.

### Buildings, temples and Landmarks

Height and levels tags win when present. Otherwise: under 60 m² one storey at 3 m; 60 to 200 m² one or two storeys; over 200 m² in commercial or retail land use two to three storeys; tourism or hotel tagged up to four; a hash of the OSM id jitters height by about ±15% and picks wall tint. Footprints up to about 200 m² and roughly rectangular get a low-poly hip or gable roof in the terracotta palette colour with the ridge along the longest edge; larger or irregular footprints get flat roofs with a parapet. A darker band per storey suggests windows and becomes the emissive glow at night; a doorway faces the nearest Road. Residential footprints get a low compound wall with a gate along their road edge, solid to the bike. Ground floors in commercial or retail land use facing tertiary-or-above Roads get a slab awning and a sign board.

Every place of worship tagged Hindu (2,132) is built from a procedural kit: candi bentar split gate facing the Road, compound wall, one to three meru towers and a shrine, assembled deterministically from footprint size and OSM id; generic extrusion is suppressed inside the footprint.

Landmarks come from a checked-in file (name, OSM anchor id, model asset, yaw, optional label). Bespoke low-poly models for Tanah Lot, Uluwatu temple, Ulun Danu Bratan, Besakih, the Handara gate and the Lempuyang gates; Ngurah Rai airport from aeroway tags (runway, apron, terminal box) with parked planes as props; volcanoes, lakes and beaches are terrain plus a label. Generic buildings are suppressed inside Landmark footprints, and Landmarks are visible from all tiers.

Building tiers: tier 0 full with colliders; tier 1 merged flat boxes with no colliders or walls; tier 2 none except Landmarks.

### Props and vegetation

Four sets: vegetation (coconut palm in three heights, banana, frangipani, banyan, broadleaf tree, bamboo, rice clump, mangrove); roadside culture (penjor, shrine, warung stall for lots without a footprint, rental sign, banner, temple umbrella); infrastructure (street lamp, power pole with sagging wires, road sign, bollards, terrace-wall dressing, drainage edge); beach and coast (lounger, surfboard rack, umbrella, jukung boat, sea wall); plus parked vehicles from the Traffic kit and airport planes. Generic pieces come from CC0 low-poly packs recoloured to the palette; Bali-specific pieces are hand-modelled; everything is glTF in one asset kit with a licence entry per file.

Placement is rule-based and deterministic in the pipeline: a density table per land-cover class per prop, road-edge rules per class (palms and power poles on main Roads, penjor and shrines in Gangs, lamps on tertiary and above at the day/night spacing, warungs on commercial edges without footprints, parked scooters along Gangs and outside warungs, parked cars on residential streets), hashed by Chunk id and cell, avoiding ribbons, footprints, water, terrace walls and Landmark footprints, honouring mapped tree points. Full density within about 80 m of Roads and throughout tier 0; interiors get a third of the density with larger merged instances. Tier 0 batches props into one draw per material with a simplified mesh beyond 60 m; tier 1 keeps only large vegetation as crossed billboards; tier 2 has none. Props near the bike carry simple colliders. A vertex-shader wind offset sways palm fronds, banana leaves and banners, amplitude driven by live wind speed.

### Art direction and lighting

Flat-shaded standard material with high roughness and no metalness; no outlines. Muted earthy palette (starting values, hex): grass 8fae5a, paddy b3c96a, paddy water 9fb8b0, mud 8e7350, road 5a5651, shoulder bfa77c, road line e8dcb5, palm trunk 7d6446, frond 5f8f4a, wall e9dcc2, roof a8613e, sign d46a4f, stone 9a8e7c and 75695a, scooter c9573f, volcano 7a7f86 with cap d9d4cc, sea 6fa1b8. Warm exponential haze whose colour follows the sky horizon colour (density 0.007 at prototype scale, retuned at world scale) doubles as the mechanism that hides Chunk pop-in. ACES filmic tone mapping. A gradient sky dome blends zenith and horizon colours between day (6d9fd0 / f0d9b0), dusk (6e4a7a / ffb070) and night (10162b / 2a3350).

Lighting is one directional sun plus a hemisphere light, driven by hand-authored keyframe curves indexed by sun elevation (deep night, twilight, golden, day) for sky colours, sun colour and intensity, ambient, fog colour and density, and exposure. Golden hour is not stretched. Night stays readable and moonlit, brighter than the prototype's darkest frame, with moonlight scaling the night ambient slightly by phase. One sun shadow map fitted around the bike (about 150 m), off at night; no shadow-casting lamps.

### Time, sky and weather

The clock is real Bali time (UTC+8) from the system clock, with no override of any kind. Sun and moon position and moon phase are computed from the real date at the island's latitude and longitude with a solar-position library; a static star field rotates with sidereal time. At night: the scooter headlight as a spot light; street lamps along trunk, primary, secondary and tertiary Roads placed by class at build time, rendered as emissive cones with a few real point lights nearest the bike; emissive windows and doorways; Traffic headlight cones and red tail lights. All switch on from the same elevation curve.

Weather is fetched every 10 minutes for eight sample points (south coast, Denpasar and Sanur, Ubud, Kintamani, Bedugul, east coast, north coast, west). The state at the bike is the nearest sample's, blended over about a minute when crossing between samples. Five states from cloud cover and rain rate: clear, partly cloudy, overcast, rain, storm; each blends into the next over about a minute; storm adds lightning flashes with delayed thunder. Rain is a particle sheet around the camera, road surfaces darkened with a subtle sky-reflection tint, fog density and sky greyness raised and sun intensity cut through the lighting curves; distant rain is haze. Cloud cover greys the sky and, when partly cloudy, a scrolling soft shadow texture on the ground suggests passing clouds; wind drives the scroll and the rain slant; no cloud geometry. Wet roads add slight sway and about 20% more braking distance. The last fetched state is kept for an hour; after that, or when the first fetch fails, the game drifts quietly into a seasonal simulation by the real date; a small HUD glyph shows only when weather data is real.

### Bike handling and collisions

Motion is a hand-written kinematic model: throttle, brake, steer, lean, per-surface speed cap and wobble, and a slope term from the sampled terrain gradient along the heading. One automatic scooter. Top speed about 90 km/h on asphalt, 0 to 50 km/h in about 4 s, strong brakes, slow reverse. Surface caps: asphalt and concrete full; paving stones about 85%; gravel and unpaved about 60%; grass and paddy beds about 35%; sand about 25% with heavy wobble; steps and stairs walking pace with a bumpy camera; shallow water a crawl; deeper water stops the bike and nudges it back to shore. Terrace walls, compound walls, buildings, large props and Traffic vehicles are solid.

Collisions go through Rapier (WASM): the bike is a kinematic character body; buildings, walls, large props and Traffic vehicles are colliders created and destroyed with Chunks; the character controller gives slide-along-walls and push-back. A hit pushes back a little, cuts speed proportionally to impact and shakes the camera; there is no fall, damage or respawn. Traffic nudges the bike, never stops it.

### Camera and input

Third-person chase camera only, about 6 m behind and 2.5 m above the scooter, exponentially lagged on position and heading. Distance pulls back and field of view widens with speed; the camera rolls a few degrees with lean and lags the heading so corners swing; a short shake on impact; the boom pulls in when a collider sits between camera and bike. Inputs are keyboard only: W/S or up/down for throttle and brake, A/D or left/right to steer, Shift for hard brake, R to reset onto the nearest Road, C unused, M for the map, Esc for pause. Mouse drag while held orbits the camera and snaps back on release.

### Regions and Districts

About 45 Regions are unions of OSM desa boundaries under the name people use, with hand-cut polygons for a few (Uluwatu inside Pecatu, Berawa inside Tibubeneng, Petitenget and Umalas inside Kerobokan Kelod, Echo Beach inside Canggu, Bingin and Balangan inside Pecatu). The initial list, with parents in brackets: Canggu; Berawa [Canggu]; Pererenan [Canggu]; Echo Beach [Canggu]; Kerobokan; Umalas [Kerobokan]; Petitenget [Kerobokan]; Seminyak; Legian; Kuta; Tuban; Jimbaran; Bukit; Uluwatu [Bukit]; Bingin & Balangan [Bukit]; Ungasan [Bukit]; Nusa Dua [Bukit]; Tanjung Benoa [Bukit]; Sanur; Serangan; Denpasar; Batubulan; Sukawati; Mas; Ubud; Tegallalang; Payangan; Keramas; Gianyar; Semarapura; Sidemen; Padangbai; Candidasa; Amlapura; Amed; Tulamben; Kintamani; Bangli; Penglipuran; Tanah Lot; Tabanan; Jatiluwih; Bedugul; Munduk; Lovina; Singaraja; Pemuteran; Medewi; Negara; Gilimanuk.

The Regions file is checked in: per Region a game name, optional parent, the OSM relation ids it unions, an optional cut polygon (GeoJSON), and an anchor coordinate for map labels. The pipeline resolves it and rasterises the result into a Region-id raster of about 25 m cells, one byte per cell (0 for sea), roughly 2 MB; the runtime does one array read per frame. Everywhere without a Region shows its District (kecamatan) name, so nothing is nameless. Two levels of nesting are shown as "Berawa · Canggu". A new Region or District commits only after about two seconds continuously inside it.

### Traffic

An in-house TypeScript module. Car-following is the Intelligent Driver Model with city-tuned parameters per vehicle class on lane centrelines derived from graph edges, driving on the left. Mix about 70% scooters, 20% cars and MPVs, 5% pickups and small trucks, 5% bemos and minibuses; Gangs carry scooters only; trucks and buses stay on tertiary and above. Density is a per-edge base weight (class and Region, baked in the pipeline) times a runtime time-of-day curve on the real clock with peaks around 08:00 and 17:00 and a trough after midnight.

Junctions: priority by class with a time-to-collision gap rule (about 3 s) at a decision point 20 to 50 m upstream; equal-class junctions yield to the right; roundabouts yield to circulating traffic; fixed-cycle signals only at junctions tagged with traffic signals (483 in Bali), random phase offset per junction; a vehicle waiting over 15 s creeps through; turn restrictions are ignored. Scooters take a lateral offset within the lane, filter past slow or stopped cars, overtake on Gangs and ride two abreast; cars stay centred. The bike is a vehicle in the model: Traffic brakes behind it, yields to it on the same rules, filters past it when slow, and swerves and honks when it rides against a one-way.

Vehicles exist within roughly 400 m of the bike, spawned at edges entering the window and out of the camera's view, despawned on leaving; cap about 80 simulated vehicles; beyond the window tier-2 billboards fake distant traffic on main Roads. Parked vehicles are static props. The simulation steps at a fixed 20 Hz in a Web Worker and posts positions and headings; the main thread interpolates and renders one instanced mesh per vehicle type from a small kit (three scooter colours, car, MPV, pickup, truck, bemo) with wheel spin, a rider on scooters and night lights; colliders follow the same positions.

### Streaming

Tier 0 loads within 1.5 km (the 3 by 3 block around the bike), tier 1 to 4 km, tier 2 to 9 km, each unloading one Chunk further out; a byte budget of about 300 MB evicts least-recently-used Chunks. Chunks load nearest first and ahead of the heading first, parsed in a Web Worker with zero-copy transfer. A global bundle loads before the first Chunk: manifest (Chunk ids, per-file sizes, pipeline version, extract timestamp, Copernicus tile ids), Region-id raster, Region table with parents and District fallbacks, Landmark table, weather sample points, a tier-2 island silhouette for the far horizon, and the asset kit. Targets: about 400 MB compressed on disk; global bundle plus the starting near ring under 15 MB.

### World data format

Each Chunk is a directory of small binary typed-array blobs, one per layer and tier where tiers apply: terrain (height grid, land-cover classes, vertex colours, indices), roads (positions, colours, indices, marking instances), buildings, props (instance transforms by kit id), graph (nodes, edges, lane data), colliders. Each blob has a small header with format version, Chunk id and counts. Compression is left to the host. The manifest is the runtime's entry point and carries a format version the runtime checks.

### HUD, map and menus

Minimal editorial style: warm off-white text (the wall colour) with a soft shadow, a serif for names and a light sans for numbers, no panels except the minimap disc; everything fades during free look. Bottom left: the Region label with a cross-fade on the debounce, and the current Road name beneath (blank on Paths). Top right: the Bali clock as HH:MM and the live-weather glyph. Bottom right: speed in km/h. Top left: a corner minimap of about 160 px rotating with heading, showing graph Roads within about 800 m, faint Region boundaries, Landmark marks and the bike. M opens a pausing full-screen island map from the tier-2 network and Region polygons: position and heading, visited Regions shaded, unvisited outlined, Landmarks marked, Region names at their anchors, mouse pan and zoom, no teleporting. Esc opens the pause menu: resume, map, discovery counts ("regions visited N of 45", "landmarks seen N of 7"), a master volume slider, a quality override (auto, low, high), the credits screen, and start fresh with a confirmation. The loading screen shows the island silhouette with near-ring progress, "press any key to ride", and the two mandatory attribution lines.

### Discovery and persistence

The bike's position and heading and the set of visited Region and Landmark ids are saved to localStorage on a short interval and on page hide, in a versioned format that a data rebuild can migrate or discard. A Region counts as visited once the debounced label commits to it; a Landmark once the bike is within about 150 m. Nothing else is recorded; there are no toasts or rewards. The first ride starts on Jalan Raya Canggu facing north.

### Sound

Two or three recorded scooter loops crossfaded and pitch-shifted by speed and throttle plus a wind layer; ambience beds chosen by the land cover within about 100 m (surf, paddies, forest, town) and by the real clock (night frogs and crickets, dawn roosters, mid-morning cicadas); gamelan within about 80 m of a temple, louder at dusk; rain by intensity, wind by live speed, thunder delayed by distance; the eight nearest Traffic vehicles voiced positionally by type, horns on swerves, one impact set by what was hit and surface. No music. Three buses (bike, world, traffic) to one master, about 24 voices, distance attenuation, a low-pass in rain; the audio context starts on the first key press. Sources: CC0 libraries for the generic set, Bali field recordings or CC BY for the distinctive beds, all in the asset manifest.

### Performance

Target 60 fps at 1080p on an Apple M1 or Intel Iris Xe class laptop. Ceilings per frame: under 150 draw calls, 1.5 million triangles, 8 ms GPU, 6 ms main-thread JavaScript; memory the 300 MB Chunk budget plus about 200 MB. A frame-time monitor steps down one rung when the rolling average exceeds 18 ms for two seconds and back up after 30 s under 12 ms: pixel ratio to 1.0; shadow distance halved; prop density to 60%; Traffic cap to 40; tier 0 to the single Chunk and tier 2 to 6 km. A dev-only benchmark drives a fixed route (Canggu Gangs, Sunset Road, Denpasar centre, the Ubud climb, the Kintamani rim) and records frame times, draw calls, triangles, Chunk load latency and memory to a JSON report; CI flags regressions over 10%.

### Hosting and deploy

The Vite-built site on Cloudflare Pages; world data in a Cloudflare R2 bucket behind a custom domain with CORS for the site origin only. World data lives under a path versioned by pipeline version and extract date; every file is pre-compressed with Brotli and served immutable for a year; only the manifest at a fixed path has a short cache, so a new build flips atomically and a ride in progress keeps its version. GitHub Actions builds and deploys the site on every push to main with per-pull-request previews; a separate publish command uploads only new or changed world files by hash, then the manifest. Public URL, no gate.

### Licensing and credits

Code under MIT; hand-made assets under CC BY 4.0. The loading screen carries "© OpenStreetMap contributors · Open Database License" linked to the OSM copyright page and the Copernicus "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved" line. The credits screen, generated at build time, adds the Copernicus no-liability sentence and AWS access note, Microsoft footprints, OSM land polygons, the weather provider's attribution, every asset from the manifest grouped by licence, three.js, Rapier, the solar library, Vite and fonts, the Geofabrik extract date read from the world manifest, and the game's own licences with a repository link. The build fails if any asset file lacks a manifest entry.

## Testing Decisions

A good test exercises external behaviour through a stable seam and never asserts on internals: it feeds inputs a user or a data source would produce and checks results a user or a downstream consumer would observe. Two seams cover the system.

**Seam 1, the world data contract.** A checked-in Canggu fixture (the existing 6.6 km OSM sample plus the matching DEM cells, land polygons, a Regions file entry for Canggu and its children, and one Landmark) runs through the complete pipeline in a test. Assertions are on the packed output only: the manifest lists the expected Chunks and format version; every Road edge is reachable in the graph and border-split edges share node ids across Chunks; road vertex heights equal the flattened terrain height beneath them within tolerance; the Region raster returns Berawa under Canggu at a known coordinate and the District elsewhere; a known temple footprint yields a temple kit and no generic building; width for Jalan Raya Canggu equals its OSM tag; a missing OSM id in the Regions file fails the build. Rebuilding with unchanged inputs writes no Chunk files. The fixture run must stay under a minute so it runs in CI.

**Seam 2, the headless World.** The runtime's World is constructed from fixture world data with a fake clock, fake weather feed and scripted keyboard input, and ticked without a renderer, audio or DOM. Assertions are on World state: after N seconds of throttle on asphalt the speed approaches the cap and on sand it approaches the sand cap; a climb bleeds speed; a scripted ride across the Berawa border changes the label only after the debounce and shows "Berawa · Canggu"; leaving every Region shows the District; at a fixed Bali time the sun elevation and the lighting curve outputs match known values and night lights are on after sunset; with the weather feed returning rain the state is rain and wet braking is longer, and with the feed failing the seasonal fallback engages after the hold; Traffic spawns within the window, obeys one-way, stops behind a stationary bike and no vehicle waits more than the deadlock guard; the streaming set for a given position and heading is the expected tier-0, tier-1 and tier-2 Chunk ids and unloads with hysteresis; a saved state round-trips through the persistence format and a version bump discards an incompatible one; visited counts increase exactly once per Region.

Rendering, audio, the HUD and the Rapier collision layer are thin views and are not unit-tested; they are covered by the scripted benchmark route, which runs in CI where a GPU is available and on the reference laptop before a release, and by the two throwaway prototypes as visual references.

Prior art in this repository: the two prototypes contain the ribbon builder, the nearest-Road grid and the lighting curve in throwaway form and serve as reference behaviour, and the inventory script shows the style of asserting on OSM-derived data. There are no existing automated tests; the fixture and the World tests establish the pattern.

## Out of Scope

- Multiplayer or seeing other riders.
- Mobile and touch controls; the game is desktop browser only.
- Missions, delivery jobs, timers, scoring, achievements or any fail state; discovery is a quiet count only.
- Realistic simulation physics, damage, falling off, or traffic-rule enforcement against the rider.
- Any island other than Bali: Nusa Penida, Lembongan, Ceningan and Lombok are excluded from the data and the Regions.
- An in-game map editor or any in-game authoring; Regions and Landmarks are files.
- Gamepad support, first-person view, photo mode, and any camera other than the chase camera.
- Any time-of-day or weather override; the clock and weather are real.
- Music.
- Accounts, servers or any state beyond localStorage.
- Turn restrictions in Traffic, cloud geometry, puddles and splash effects, shadow-casting lamps.

## Further Notes

- The two prototypes (art direction, and real Canggu roads) are throwaway and must not be promoted; they document the chosen look and the measured baseline (one 6.6 km box at 382k triangles in 32 draw calls at 85 fps with no streaming).
- The repository is not yet a git repository; initialising it is the first implementation step, with the bulk OSM and DEM files excluded as the existing ignore file already does.
- Bali tags its main roads mostly as trunk and tertiary rather than primary, and over half of all ways are residential, living_street and service; every density and width default was chosen with that in mind.
- The weather provider's terms must be confirmed before the first public deploy; the attribution text on the credits screen follows whatever they require.
- Numbers marked "about" (speeds, fog density, densities, ring radii, ladder thresholds) are starting points to be tuned against the benchmark route and the reference laptop, not contractual values.

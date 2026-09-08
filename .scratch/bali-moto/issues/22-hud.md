# Grilling: the HUD

Type: grilling
Status: resolved
Blocked by: 
Map: ../map.md

## Question

What is on screen besides the world?

Decide the placement and style of the persistent region label ("Berawa · Canggu"), the real Bali clock, a speed readout, whether there is a minimap or a full-screen map (and if so what it shows: roads, regions, your position, landmarks), whether the current road name is shown, how the HUD reads against golden hour and night, and how it hides during free look. The region debounce, real clock and chase camera are already decided.

## Context from the discovery ticket

If a map screen exists, it marks visited regions and landmarks; the pause menu shows "regions visited N of 45" and "landmarks seen N of 7" and holds the "start fresh" option. Nothing else about discovery is displayed.

## Answer

**Ride screen**, minimal editorial style: warm off-white text (the palette wall colour) with a soft shadow, a serif for names and a light sans for numbers, no panels or boxes, no icons beyond the weather glyph. Everything fades out during free look and back in on release.
- Bottom left: region label, "Berawa · Canggu", updated on the two-second debounce with a cross-fade; below it in a lighter line the current road name from the road graph, blank on paths.
- Top right: the real Bali clock as HH:MM and a tiny live-weather glyph shown only when the weather data is real.
- Bottom right: speed in km/h, small, no dial.
- Top left: a corner minimap, about 160 px, rotating with heading, showing graph roads from loaded chunks within roughly 800 m, faint region boundaries, landmark marks, and the bike at centre. Drawn from the same road data, styled as thin lines in the HUD colour on a translucent dark disc, the one boxed element.

**Full-screen map**: M (and the pause menu) opens a pausing island map drawn from the tier-2 road network and the region polygons: your position and heading, visited regions shaded, unvisited regions outlined, landmarks marked, region names labelled at their anchor coordinates. Pan and zoom with the mouse. No teleporting from the map.

**Pause menu** (Esc): resume, map, discovery counts ("regions visited N of 45", "landmarks seen N of 7"), an audio volume slider, the attribution and credits screen, and start fresh with a confirmation. No other settings besides the quality override (auto, low, high) added by the performance ticket; time, weather and camera are fixed by earlier decisions.

**Loading screen**: the island silhouette from the global bundle with the near-ring progress, and the OpenStreetMap and Copernicus attribution lines required by their licences.

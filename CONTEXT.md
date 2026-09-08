# Bali Moto

A single-player browser game where you ride a motorbike freely across the real road network of Bali.

## Language

**Region**:
A named area of Bali that people actually use in speech, such as Canggu or Berawa, built from official village boundaries under that name. A region may have one parent region, shown alongside it.
_Avoid_: Zone, area, desa, neighbourhood

**Chunk**:
A 1 km by 1 km square of the game world, the unit in which roads, terrain, buildings and props are built, streamed and unloaded.
_Avoid_: Tile, cell, sector

**District**:
An official kecamatan boundary from OpenStreetMap, shown as the location name wherever no region is defined.
_Avoid_: Regency, kabupaten, county

**Road**:
An edge of the road graph: a polyline between two junction nodes derived from an OpenStreetMap way of a motor-vehicle class or a gang, carrying class, width, surface and one-way data. Traffic drives only on roads.
_Avoid_: Street, way, segment

**Path**:
A rendered track, footway, path or stair that is not part of the road graph. The player may ride it; traffic never does.
_Avoid_: Trail, walkway

**Gang**:
A narrow Balinese lane, typically paved with paving stones and one scooter wide. In OpenStreetMap these are mostly `living_street` and narrow `residential` ways, and they are more than half the island's roads.
_Avoid_: Alley, lane, side street

**Landmark**:
A recognisable real place given a distinct model or marker in the world, such as Tanah Lot.
_Avoid_: Point of interest, POI

**Traffic**:
Ambient computer-driven vehicles sharing the roads with the player. Atmosphere, not an obstacle course.
_Avoid_: NPCs, AI cars, bots

**Ride**:
A play session. There is no fail state and no objective beyond exploring.
_Avoid_: Run, mission, level

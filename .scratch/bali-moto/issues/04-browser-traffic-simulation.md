# Research: traffic simulation on a road graph for a browser game

Type: research
Status: resolved
Blocked by: 
Map: ../map.md

## Question

What are the practical approaches for simulating ambient traffic on a real road graph inside a browser game?

Cover: agent-based vehicles following lanes on a directed graph, spawning and despawning around the player, intersection handling (yield rules, simple signalling), car-following models such as the Intelligent Driver Model, left-hand traffic as used in Indonesia, mixed vehicle types (scooters, cars, trucks), and how games commonly fake density cheaply. Note any JavaScript or TypeScript libraries or open-source examples worth reusing, and what they assume about the road graph (lane geometry, node degree, one-way tags). Cite primary sources. Write findings to `docs/research/browser-traffic-simulation.md`.

## Answer

Write our own small TypeScript traffic module on the ticket-14 lane graph and borrow models, not libraries: no reviewed JS project loads an arbitrary OSM graph, handles left-hand traffic, and is MIT at once (Treiber's traffic-simulation.de is the best model reference but GPL and scenario-bound; volkhin's RoadTrafficSimulator is MIT but assumes a right-hand grid of 4-way rectangular junctions; osm2streets is an offline lane-geometry preprocessor, not a simulator).

- Graph: directed lane graph from OSM offline, lanes from `lanes`/`lanes:forward|backward` with SUMO's typemap as fallback (1 per direction below primary), lane centrelines offset left of the way (LHT), edge priority from highway class, all turns except U-turn; turn-restriction relations are rare and can wait.
- Vehicles: IDM (Treiber, Hennecke, Helbing 2000) with per-vehicle jitter, fixed dt 0.1-0.2 s, one sorted list per lane. City values: T 1.0-1.5 s, s0 2 m, a 1.0-1.5 m/s² (scooters higher), b 2-3 m/s², δ 4. No MOBIL in v1.
- Mix: ~75% scooters (Bali registration share). Scooters get SUMO motorcycle dimensions, a continuous lateral offset and a leader test that ignores vehicles without lateral overlap, so they filter and ride two abreast; cars stay centred.
- Intersections: priority by class; minor traffic stops at a virtual vehicle and enters on Treiber's C1 AND C2 gap rule (TTC ~3 s); roundabouts clockwise with ring priority and speed cap sqrt(b r); fixed-cycle lights only at OSM `traffic_signals` nodes; impatience so queues always clear.
- Spawn/despawn: a 300-500 m window around the player, inflow per road class and time of day at inbound lane ends, despawn on leaving the window, object pool; the player's bike is inserted as a vehicle so traffic brakes for it.
- Density: three tiers (full sim + mesh, sim + instanced mesh, nothing moving) plus static parked scooters and cars along kerbs as instanced props.
- Prototype the gap rule and the scooter overlap rule on a real Canggu/Denpasar excerpt before locking the spec.

Findings and citations: [docs/research/browser-traffic-simulation.md](../../../docs/research/browser-traffic-simulation.md)

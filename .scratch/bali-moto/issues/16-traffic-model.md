# Grilling: the traffic model

Type: grilling
Status: resolved
Blocked by: 04, 10
Map: ../map.md

## Question

What is traffic like?

Decide vehicle mix (scooters, cars, trucks, bemos), density by road class and by region and time of day, spawn radius around the player, the driving model and its parameters, intersection behaviour, left-hand rule, whether traffic reacts to the player, what a collision feels like without a fail state, and how the traffic layer consumes the road graph.

## Context from the bike handling ticket

Collisions go through Rapier: the player is a kinematic character body and traffic vehicles must carry colliders (a box per vehicle is enough) so the controller can nudge the bike. Traffic nudges, never stops, the player.

## Answer

**Model**: in-house TypeScript traffic module as the research recommended. Car-following is the Intelligent Driver Model with city-tuned parameters per vehicle class; lane centrelines are derived at load time from the road graph edges (one lane per direction unless `lanes` says otherwise), honouring `oneway`, driving on the left.

**Mix**: about 70% scooters, 20% cars and MPVs, 5% pickups and small trucks, 5% bemos and tourist minibuses. Gangs (living_street, narrow residential and service) carry scooters only; trucks and buses stay on tertiary and above.

**Density**: a per-edge base weight from road class and region (dense on trunk and secondary roads in Denpasar, Kuta, Canggu and Ubud, sparse on rural tertiary, very sparse in the mountains), multiplied by a time-of-day curve on the real Bali clock with peaks around 08:00 and 17:00 and a near-empty trough after midnight. The base weight is baked per edge in the pipeline; the curve is runtime.

**Junctions**: priority by road class with the time-to-collision gap acceptance rule (about 3 s) at a decision point 20 to 50 m upstream; equal-class junctions yield to the right; roundabouts (175 tagged ways in Bali) yield to circulating traffic; fixed-cycle signals only at junctions OSM tags with `highway=traffic_signals` (483 nodes in Bali), with a random phase offset per junction. Deadlock guard: a vehicle waiting more than 15 s creeps through. Turn restrictions are ignored in v1.

**Scooter behaviour**: scooters take a lateral offset within the lane, filter past slow or stopped cars, overtake on gangs and ride two abreast on wide roads; cars stay centred. This is what makes it look like Bali.

**Player interaction**: the bike is a vehicle in the model. Traffic brakes behind it, yields to it at junctions on the same rules, and scooters filter past it when it is slow. Head-on against one-way traffic, vehicles swerve aside and honk. Every vehicle carries a Rapier box collider so the handling ticket's nudge works.

**Spawning**: vehicles exist within roughly 400 m of the bike, spawned at graph edges entering the window and out of the camera's view, despawned on leaving it; cap about 80 simulated vehicles. Beyond the window, tier-2 billboards fake distant traffic on main roads.

**Parked vehicles**: static props, not simulated: parked scooters along gangs and outside warungs, parked cars on residential streets, placed by the props pipeline with colliders.

**Runtime**: the simulation steps at a fixed 20 Hz in a Web Worker over the loaded chunks' graph and posts positions and headings to the main thread, which interpolates. Rendering is one `InstancedMesh` per vehicle type from a small low-poly kit (three scooter colours, car, MPV, pickup, truck, bemo) with wheel spin, a rider figure on scooters, and the night lights from the day/night ticket. Colliders are updated from the same positions.

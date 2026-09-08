# Grilling: how the bike handles

Type: grilling
Status: resolved
Blocked by: 
Map: ../map.md

## Question

What is the bike's handling model?

Decide between an arcade kinematic model (speed, lean, steer, no physics engine) and a rigid-body approach with Rapier or cannon-es; top speed and acceleration feel; whether you can leave the road and what happens on grass, sand, and stairs; how collisions with traffic and buildings resolve given there is no fail state; and whether the bike is a scooter, a manual, or a choice.

## Answer

**Model**: hybrid. Motion is a hand-written kinematic model (throttle, brake, steer, lean, speed cap per surface, slope term); collisions are resolved by a physics layer. No rigid-body simulation of the bike itself, so it never falls over and terrain is sampled, not simulated.

**Collision layer**: Rapier (WASM) with the bike as a kinematic character body. Buildings, walls, terrace walls, large props and traffic vehicles are colliders; the kinematic controller gives slide-along-walls and push-back. Colliders are created and destroyed with chunks.

**Bike**: one automatic scooter, Vario/Scoopy class. No gears, no bike selection.

**Feel**: realistic but slightly punchy. Top speed about 90 km/h on asphalt, 0 to 50 km/h in about 4 s, strong brakes, slow reverse allowed at walking pace. Tuned assuming 1:1 world scale (the world-scale ticket must not compress distances without revisiting these numbers).

**Surfaces**: rideable anywhere on land, no invisible walls. Speed cap and wobble per surface: asphalt and concrete full speed; paving stones about 85%; gravel and unpaved about 60%; grass and rice paddy beds about 35%; sand about 25% with heavy wobble; steps and temple stairs walking pace with a bumpy camera; shallow water a crawl; deeper water stops the bike and nudges it back to shore (sea rendering itself stays with the terrain ticket). Terrace walls are solid.

**Hills**: slope affects speed. Climbs bleed speed, descents add some, from the sampled terrain gradient along the heading.

**Collisions**: bump, slow, keep going. A hit pushes back a little, cuts speed proportionally to impact, shakes the camera, and the ride continues. No fall animation, no respawn, no damage. Traffic vehicles nudge rather than stop the bike.

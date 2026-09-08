# Grilling: performance budget and level of detail

Type: grilling
Status: resolved
Blocked by: 20
Map: ../map.md

## Question

What may a frame cost, and what gives way when it costs more?

Decide the target machine and frame rate (60 fps on an integrated-GPU laptop, or 60 on discrete only), the draw-call and triangle ceilings per frame, the memory ceiling beyond the 300 MB chunk budget, which knobs scale down first when over budget (prop density, shadow distance, traffic count, tier radii, pixel ratio), whether a quality setting exists, and how the budget is measured (a benchmark route through Canggu, Denpasar and Kintamani with recorded frame times). Chunk tiers, ring radii and the road prototype's numbers are the starting facts.

## Answer

**Target**: 60 fps at 1080p on a recent integrated-GPU laptop (Apple M1 or Intel Iris Xe class) along the benchmark route. Discrete GPUs get headroom; older machines step down the quality ladder.

**Ceilings per frame**: under 150 draw calls (three per tier-0 chunk, one or two per tier-1 chunk, plus traffic instances, prop batches, sky, sea, bike and HUD); under 1.5 M triangles; GPU time under 8 ms; main-thread JavaScript under 6 ms, with traffic simulation and chunk parsing off the main thread in workers. Memory: the 300 MB chunk budget from the pipeline ticket plus about 200 MB for everything else. The Canggu prototype's 32 calls and 382k triangles for one 6.6 km box is the reference point.

**Quality ladder**: a frame-time monitor steps down one rung when the rolling average exceeds 18 ms for two seconds, and back up one rung after 30 s under 12 ms:
1. pixel ratio to 1.0;
2. sun shadow distance halved;
3. prop density to 60% (drop the smallest props first);
4. traffic cap to 40 vehicles;
5. tier 0 radius to the single chunk under the bike and tier 2 radius to 6 km.
A quality override (auto, low, high) in the pause menu is the one setting added beyond the audio slider; the HUD ticket's menu list is amended accordingly.

**Measurement**: a dev-only benchmark mode drives the bike along a fixed route (Canggu gangs, Sunset Road, Denpasar centre, the Ubud climb, the Kintamani rim) and records frame times, draw calls, triangles, chunk load latency and memory into a JSON report. A CI job runs it headless where possible and flags regressions over 10% against the previous report; a manual run on the reference laptop gates releases.

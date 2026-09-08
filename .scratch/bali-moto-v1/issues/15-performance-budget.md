# 15 — Performance budget

**What to build:** The game holds 60 fps on an integrated-GPU laptop along a fixed benchmark route, steps quality down and up automatically when it cannot, lets the player pin a quality level, and CI flags frame-time regressions.

**Blocked by:** 09, 12

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Dev-only benchmark mode drives the bike along the route (Canggu gangs, Sunset Road, Denpasar centre, the Ubud climb, the Kintamani rim) and writes frame times, draw calls, triangles, chunk load latency and memory to a JSON report
- [ ] Quality ladder per the spec (pixel ratio, shadow distance, prop density, traffic cap, tier radii) with the 18 ms / 12 ms thresholds and timings; auto/low/high override in the pause menu
- [ ] Ceilings documented and checked by the report: under 150 draw calls, 1.5 M triangles, 8 ms GPU, 6 ms main-thread JS at 1080p
- [ ] CI job runs the benchmark where a GPU is available and fails on a regression over 10% against the stored report; manual run on the reference laptop documented as the release gate
- [ ] World test: the ladder steps down after sustained long frames and back up after sustained short ones

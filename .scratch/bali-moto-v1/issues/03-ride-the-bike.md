# 03 — Ride the bike

**What to build:** A player opens the game on Jalan Raya Canggu facing north and rides the scooter with the keyboard through Canggu's roads and gangs under a chase camera, sees the current road name on screen, and can reset onto the nearest road. This ticket introduces the headless World and its test harness.

**Blocked by:** 02

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Headless World object: constructed from world data and a clock, advanced by tick(input, dt), exposing bike pose, speed, current road, and the streaming set; runs without renderer, DOM or audio
- [ ] Kinematic handling per the spec: throttle, brake, hard brake, steer, lean, slow reverse, ~90 km/h cap on asphalt, per-surface caps and wobble (paving stones, gravel, grass, sand, steps, shallow water), surface taken from the road under the bike or the land cover fallback
- [ ] Chase camera 6 m back and 2.5 m up with position and heading lag, pull-back and wider field of view with speed, roll with lean, impact shake hook, mouse-drag free look that snaps back
- [ ] Keyboard mapping: W/S or arrows, A/D, Shift, R to reset onto the nearest graph road facing along it
- [ ] Nearest-road query via a spatial grid over graph edges; road name shown bottom-left in the HUD style, blank on Paths
- [ ] First ride starts on Jalan Raya Canggu facing north
- [ ] World tests: speed approaches the asphalt cap under held throttle and the sand cap on sand; reset places the bike on a graph road; free look snaps back

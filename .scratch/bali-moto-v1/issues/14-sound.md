# 14 — Sound

**What to build:** The ride sounds like Bali: an engine note rising with speed, surf on the coast, frogs in the paddies at night, roosters at dawn, faint gamelan by temples, rain and delayed thunder, the nearest traffic and a horn when someone swerves.

**Blocked by:** 09, 10

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Web Audio graph with three buses (bike, world, traffic) to a master, ~24 voices, distance attenuation, low-pass in rain; context unlocked on first key press; master slider wired to the pause menu
- [ ] Engine: two or three loops crossfaded and pitch-shifted by speed and throttle plus a wind layer
- [ ] Ambience beds chosen by land cover within ~100 m and by the real clock, blended over a few seconds; gamelan within ~80 m of temples, louder at dusk; weather layer with rain by intensity, wind by speed, thunder delayed by distance
- [ ] Eight nearest traffic vehicles voiced by type, horns on swerves, one impact set by what was hit and by surface
- [ ] All audio files in the asset manifest with licences; no music
- [ ] World exposes the audio cue state (surface, land cover, nearest temple distance, nearest vehicles, weather events) so the audio view is a thin consumer, tested at the World seam

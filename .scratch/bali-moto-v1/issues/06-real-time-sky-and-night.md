# 06 — Real time, sky and night

**What to build:** The game runs on real Bali time: the sun and moon are where they really are today, dusk turns golden for as long as it really does, and at night the headlight, street lamps on main roads and glowing windows light the ride under a moon with the right phase.

**Blocked by:** 04

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] World clock is real Bali time (UTC+8) from the system clock with no override; sun and moon azimuth, elevation and moon phase from a solar-position library at the island's latitude and longitude
- [ ] Hand-authored keyframe curves over sun elevation for sky zenith and horizon, sun colour and intensity, hemisphere ambient, fog colour and density, exposure; gradient sky dome; star field rotated by sidereal time; moonlight scales night ambient within the readable-night floor
- [ ] One sun shadow map fitted ~150 m around the bike, off at night
- [ ] Pipeline places street lamps along trunk, primary, secondary and tertiary roads by class; runtime renders emissive cones with a few real point lights nearest the bike; scooter headlight spot light; emissive window bands hook for buildings
- [ ] World tests with a fake clock: sun elevation at a fixed Bali time matches known values; lighting outputs at noon, sunset and midnight match the curve keyframes; night lights are on after sunset and off after sunrise

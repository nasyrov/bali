# 10 — Live weather

**What to build:** The sky and roads follow Bali's real weather: rain falls around the bike, darkens the road, thickens the haze and makes the bike sway; clouds dim the sun and drift shadows across the ground; a storm flashes; and when offline the game quietly falls back to a seasonal simulation.

**Blocked by:** 06

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Weather feed fetched every 10 minutes for the eight sample points; nearest sample blended over a minute as the bike moves; feed abstracted so tests inject states
- [ ] Five states from cloud cover and rain rate with one-minute blends; storm adds lightning flashes and a thunder trigger with distance delay
- [ ] Rain particle sheet around the camera, wet road tint, fog and sky greyness raised and sun cut through the lighting curves, distant rain as haze; cloud-shadow texture scrolled by wind; wind speed drives the vegetation sway amplitude
- [ ] Wet handling: slight sway and ~20% longer braking
- [ ] Fallback: last state kept an hour, then seasonal simulation by real date; HUD weather glyph only when data is real
- [ ] World tests: injected rain yields the rain state and longer braking; a failing feed engages the fallback after the hold

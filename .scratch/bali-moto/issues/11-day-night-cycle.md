# Grilling: the day/night cycle

Type: grilling
Status: resolved
Blocked by: 
Map: ../map.md

## Question

How does time of day work?

Decide whether the clock runs on real Bali time, an accelerated cycle (how long is a full day?), or is set by the player; how the sun and moon move; how lighting is done (directional sun, sky colour ramp, ambient, street lights, headlights, shadows or not); and whether time is a setting in a menu, a key, or both.

## Answer

**Clock**: strictly real Bali time (UTC+8, no DST), taken from the player's system clock. No override, no slider, no fixed-hour setting. The game is Bali right now; a player in Europe rides at night most evenings by design. The art-direction prototype's time slider was a review tool only.

**Sun**: real solar position computed from the current date and time at the bike's latitude and longitude (Bali spans about 8.1 to 8.9 degrees south, so one island-wide position is fine). Use a small solar-position library (suncalc or equivalent) rather than a fixed arc.

**Night sky**: real moon position and phase from the same library, a static star field rotated by sidereal time. Moonlight scales the night ambient slightly; a full moon night is a little brighter than a new moon one, within the "readable moonlit night" floor decided in the art direction ticket.

**Lighting**: hand-authored keyframe curves indexed by sun elevation (deep night, twilight, golden, day) for sky zenith and horizon colours, sun colour and intensity, hemisphere ambient, fog colour and density, and exposure. No physical sky shader. Golden hour lasts as long as it really does in the tropics, about 20 minutes; the keyframes are not stretched.

**Night lights**: scooter headlight as a spot light; street lamps along trunk, primary, secondary and tertiary roads only, placed by class at build time since the OSM lit tag covers under 1% of ways, rendered as emissive cones with a few real point lights nearest the bike; emissive windows and doorways on buildings and warungs; traffic vehicles carry headlight cones and red tail lights. All switch on around sunset from the same elevation curve.

**Shadows**: sun shadows from one shadow map fitted around the bike, roughly 150 m, so palms, buildings and the bike cast long dusk shadows. Off at night; no shadow-casting lamps or headlights.

# Grilling: sound and music

Type: grilling
Status: resolved
Blocked by: 
Map: ../map.md

## Question

What does Bali Moto sound like, and where does the audio come from?

Decide the engine sound model for the scooter (pitch by speed, throttle layer), traffic audio (per-vehicle engines within range, horns when swerving), ambience by land cover and time (surf on beaches, insects and frogs at night in paddies, gamelan near temples, dogs in gangs), weather audio (rain, thunder with delay), whether there is music and what kind (a licensed low-key soundtrack, generative, or none), how many simultaneous sounds are budgeted, and the sourcing and licensing of every asset for the credits screen. Traffic, weather and day/night behaviours are already decided and give this ticket its triggers.

## Answer

**Engine**: two or three recorded scooter loops (idle, cruise, high) crossfaded and pitch-shifted by speed and throttle through the Web Audio API, plus a wind layer rising with speed. Reverse and off-road wobble modulate pitch slightly.

**Ambience**: looping beds chosen by the land cover around the bike (from the terrain vertex classes within about 100 m) and blended over a few seconds: surf on beach and coast, insects and frogs in paddies, birds in forest, dogs and voices in gangs and towns. Beds vary with the real clock: crickets and frogs at night, roosters and birds at dawn, cicadas mid-morning. A faint gamelan loop within about 80 m of a temple, louder at dusk. A weather layer: rain bed by intensity, wind by live wind speed, thunder with a distance delay after each lightning flash.

**Traffic and impacts**: the eight nearest traffic vehicles get positional engine loops by type; horns play when traffic swerves around the player; one small impact set for bumps, chosen by what was hit (wall, vehicle, vegetation) and by surface for off-road rumble. All other vehicles are silent.

**Music**: none. Ambience is the soundtrack.

**Sourcing**: engine, impacts, horns, rain and generic wildlife from CC0 sources (freesound CC0 filter, Sonniss GDC packs); gamelan, gang ambience, roosters and warung voices recorded in Bali or licensed under CC BY with credit. Every audio file carries its licence and author in an asset manifest that feeds the credits screen, the same manifest as the 3D kit.

**Mix**: three buses (bike, world, traffic) to one master; about 24 simultaneous voices with distance attenuation and a low-pass filter during rain; one master volume slider in the pause menu. Audio context starts on the first key press to satisfy browser autoplay rules, so the loading screen says "press any key to ride".

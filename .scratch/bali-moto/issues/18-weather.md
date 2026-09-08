# Grilling: weather and rain

Type: grilling
Status: resolved
Blocked by: 11
Map: ../map.md

## Question

How does weather work?

Decide the weather states (clear, cloudy, rain, storm), how they change over time and per region, the rain and wet-road rendering approach, how weather interacts with day/night lighting and fog, and whether the player can set it.

## Answer

**Source**: live real weather. The client fetches current conditions from a free, keyless forecast API (Open-Meteo or equivalent; confirm terms at implementation) every 10 minutes for a handful of sample points across the island: south coast (Kuta/Canggu), Denpasar/Sanur, Ubud, Kintamani, Bedugul, east coast (Amed/Candidasa), north coast (Lovina), west (Negara). Fields used: cloud cover, precipitation rate, wind speed and direction. Consistent with the strictly real clock: if it rains in Ubud now, it rains in the game.

**Fallback**: keep the last fetched state for an hour; after that, or when the first fetch fails, drift quietly into a simulated seasonal model by the real date (wet season November to March with afternoon downpours, dry season mostly clear). No error is shown; the HUD shows a small live-weather marker only when data is real.

**States**: clear, partly cloudy, overcast, rain, storm, mapped from cloud cover and rain rate; storm adds lightning flashes with delayed thunder (sound ticket) and heavier rain. Each state blends into the next over about a minute.

**Variation**: the state at the bike is the nearest sample point's, blended over a minute when crossing between points, so the mountains can be in cloud while Kuta is sunny.

**Rain**: a particle sheet around the camera; road surfaces darkened with a subtle sky-reflection tint; fog density and sky greyness raised and sun intensity cut through the lighting curves from the day/night ticket. Distant rain reads as haze, not particles. No puddles or splashes.

**Clouds**: cloud cover greys and flattens the sky dome via the lighting curves; under partly cloudy skies a scrolling soft shadow texture on the ground suggests clouds passing. No cloud geometry. Wind direction drives the scroll and the rain particle slant.

**Handling**: wet roads add a little sway and about 20% more braking distance in the kinematic model; no fall, no fail state.

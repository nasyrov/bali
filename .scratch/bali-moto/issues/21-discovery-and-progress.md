# Grilling: discovery and progress

Type: grilling
Status: resolved
Blocked by: 
Map: ../map.md

## Question

Is anything remembered between rides, and is discovery a thing?

Decide whether visited regions are tracked (a "regions discovered: 12 of 45" count, a map that fills in, nothing at all), whether the bike's position persists between sessions (time of day is real Bali time, so it never needs saving), where that state lives (localStorage only, since there is no server), and whether landmarks count as discoverable. The destination rules out missions and scoring, so anything here must stay a quiet record, not a goal.

## Answer

**Persistence**: the bike's world position and heading, and the set of visited region ids and landmark ids, are saved to `localStorage` on a short interval and on page hide. No accounts, no server. Clearing site data resets it; a "start fresh" option in the pause menu does the same. Time of day and weather are real and never saved. The save format carries a version number so a data rebuild that renumbers regions can migrate or discard it.

**Discovery**: a quiet record only. Visited regions and landmarks are marked on the map screen if the HUD ticket adds one, and the pause menu shows "regions visited 12 of 45" and "landmarks seen 3 of 7". No toasts, no rewards, no unlocks, no goal. A region counts as visited once the debounced label has committed to it; a landmark once the bike has been within about 150 m of it.

**First ride**: begins in Canggu on Jalan Raya Canggu facing north, the same point the prototype used, so the smallest near ring downloads first and gangs, paddies and the coast are a minute away.

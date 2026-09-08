# Prototype: low-poly art direction scene

Type: prototype
Status: resolved
Blocked by: 
Map: ../map.md

## Question

What should riding through Bali look like in this style?

Build a throwaway three.js scene, no real data: a stretch of road, a rice paddy, a warung, palms, a temple gate, a scooter, flat-shaded, with a sun and sky. Try two or three palette and shading variants and screenshot them. The human reacts; the answer records the chosen palette, shading approach (flat, toon, gradient), fog and colour treatment, and what the day/night lighting should aim for.

## Answer

Chosen: **C, Golden hour**, with two adjustments from the other variants' night frames.

- **Shading**: `MeshStandardMaterial` with `flatShading: true`, roughness ~0.95, no metalness. No outlines (B's ink outlines were rejected; they cost a second pass and cannot be combined with fog for streaming).
- **Palette** (starting values from the prototype, hex): grass 8fae5a, paddy b3c96a, paddy water 9fb8b0, mud 8e7350, road 5a5651, shoulder bfa77c, road line e8dcb5, palm trunk 7d6446, frond 5f8f4a, wall e9dcc2, roof a8613e, sign d46a4f, stone 9a8e7c / 75695a, scooter c9573f, volcano 7a7f86 with pale cap d9d4cc, sea 6fa1b8. Muted and earthy, not saturated.
- **Fog and colour treatment**: warm exponential haze (`FogExp2`, density 0.007 at prototype scale, retune at real world scale) whose colour follows the sky horizon colour. Distant hills read as pale silhouettes; this is also the mechanism that hides chunk pop-in. ACES filmic tone mapping, exposure ~0.9 rising slightly at dusk.
- **Sky**: gradient sky dome, two colours (zenith, horizon) blended per time of day between day (6d9fd0 / f0d9b0), dusk (6e4a7a / ffb070) and night (10162b / 2a3350).
- **Day/night lighting aim**: one directional sun plus a hemisphere light. Sun colour warms from fff4e0 at noon to ff9a4a at the horizon; dusk is the hero moment with an orange horizon and long shadows. Night must stay **readable and moonlit**, not near-black: raise the night ambient to a cool blue so roads, terrain and the volcano silhouette are visible without headlights (the prototype's C-night frame was too dark; A-night and B-night show the target brightness). Emissive warung windows, street lamps and the scooter headlight switch on around sunset and are the warm accents against the blue.

Prototype: `prototypes/art-direction/index.html` (throwaway, run with `node prototypes/serve.mjs`, switch looks with `?variant=A|B|C` and the time slider). Screenshots and the contact sheet are in `prototypes/art-direction/screenshots/`. No git repository exists yet, so the prototype stays on the working tree rather than a throwaway branch.

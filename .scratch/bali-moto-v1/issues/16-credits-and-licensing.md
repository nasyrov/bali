# 16 — Credits and licensing

**What to build:** The loading screen carries the OpenStreetMap and Copernicus notices; the credits screen in the pause menu lists every data source, asset and library with its licence, generated from the manifest; the repository states its own licences.

**Blocked by:** 08, 13

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Repository licence files: MIT for code, CC BY 4.0 for hand-made assets, stated in the README
- [ ] Loading-screen lines exactly as specified: the OSM line linked to the copyright page and the Copernicus "produced using" line
- [ ] Credits screen generated at build time from the asset manifest grouped by licence plus a hand-written data-sources section (OSM with extract date from the world manifest, Copernicus with the liability sentence and AWS note, Microsoft footprints, OSM land polygons, weather provider attribution, three.js, Rapier, solar library, Vite, fonts, the game's own licences and repository link)
- [ ] Build fails when any asset file lacks a manifest entry (tested)
- [ ] Weather provider terms confirmed and their required attribution text included

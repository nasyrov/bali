# Grilling: licensing, attribution and the credits screen

Type: grilling
Status: resolved
Blocked by: 
Map: ../map.md

## Question

What must the game say about where its data and assets came from, and where does it say it?

Every source is now known: OpenStreetMap (ODbL, "© OpenStreetMap contributors" linked to the copyright page, on the loading screen and credits), Copernicus DEM GLO-30 (fixed attribution sentence plus the no-liability sentence), Microsoft Global ML Building Footprints (ODbL), OSM land polygons, the live weather provider's terms, CC0 model packs (Kenney, Quaternius or equivalent), CC0 and CC BY audio, three.js, Rapier and the solar library (MIT-style licences), and any fonts. Decide the exact lines and links, which appear on the loading screen versus the credits screen, how the asset manifest generates the credits list automatically, and the licence of the game's own code and hand-made assets.

## Answer

**Game licence**: source code under MIT; hand-made assets (Bali-specific models, field recordings, the palette) under CC BY 4.0. Both stated in the repository and on the credits screen.

**Loading screen** (shown during the near-ring download, minimum three seconds, plus "press any key to ride" for the audio unlock), two mandatory lines:
- "© OpenStreetMap contributors · Open Database License" linked to https://www.openstreetmap.org/copyright
- "Elevation produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved"

**Credits screen** (pause menu, always reachable), generated at build time:
1. Data sources, hand-written section: the OSM line and ODbL statement with the Geofabrik extract date; the Copernicus line plus the required no-liability sentence ("The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30") and a note that the data was accessed via the AWS Open Data registry; Microsoft Global ML Building Footprints (ODbL); OSM land polygons from osmdata.openstreetmap.de; the live weather provider named with its attribution text per its terms.
2. Assets, generated from the asset manifest and grouped by licence: CC0 packs by name, CC BY items with author and link, the game's own CC BY 4.0 assets.
3. Software: three.js, Rapier, the solar-position library, Vite and any fonts, each with licence.
4. The game's MIT and CC BY 4.0 lines and a link to the repository.

**Manifest**: every model, texture, font and sound file has an entry (name, author, licence, URL). The Vite build assembles the credits screen from the manifest plus the hand-written data-sources section and fails if any asset file lacks an entry. The pipeline writes the extract date and Copernicus tile ids into the world manifest, and the credits screen reads them at runtime so a data rebuild updates the date without a code change.

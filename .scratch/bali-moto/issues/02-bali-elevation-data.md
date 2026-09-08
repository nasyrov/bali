# Research: elevation data for Bali

Type: research
Status: resolved
Blocked by: 
Map: ../map.md

## Question

Which digital elevation model should give the game its hills, and how do we get it?

Compare SRTM 1 arc-second (30 m), Copernicus DEM GLO-30, NASADEM, and pre-tiled sources like AWS Terrain Tiles (Terrarium PNG) and Mapbox/MapTiler terrain-RGB. For each: resolution over Bali, license and attribution, download method, whether it needs an account, file format and size for the island bounding box, and any known artifacts over dense vegetation or volcano slopes. Recommend one. Cite primary sources. Write findings to `docs/research/bali-elevation-data.md`.

## Answer

Use **Copernicus DEM GLO-30** from the public AWS bucket (`s3://copernicus-dem-30m`, plain HTTPS, no account). Bali is covered by two 1° COG tiles, `S09_00_E114_00` and `S09_00_E115_00`, 36.5 MB together, both confirmed present in the public tile list. It is the most accurate 30 m model available (< 4 m LE90 versus ~16 m for the SRTM lineage), the only one edited for spikes, shorelines and flat water, and its 2011–2015 TanDEM-X acquisitions are far newer than the 2000 SRTM data behind SRTMGL1, NASADEM and AWS Terrain Tiles. The licence allows adaptation and redistribution; the game must show the fixed notice `produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved` plus the one-sentence no-liability line on the attribution screen. Like every candidate it is a surface model, so forest canopy on Agung, Batur and the Bedugul ridges reads a few metres high; no bare-earth 30 m option exists for Indonesia without extra licensing. Fallback: AWS Terrain Tiles (Terrarium PNG, SRTM-based, no key, ~200 z12 tiles / ~8 MB) mirrored at build time, never fetched at runtime. Mapbox and MapTiler terrain-RGB are ruled out by their terms (no bulk download, no server-side storage, no redistribution, metered key). Details, sizes and citations: [docs/research/bali-elevation-data.md](../../../docs/research/bali-elevation-data.md).

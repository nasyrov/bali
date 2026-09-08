# 04 — Terrain under the roads

**What to build:** Riding through Canggu the ground has real height from the elevation model, roads sit exactly on it, rice terraces step down sloped farmland, rivers run in shallow channels, the coast has sand and a calm sea, bridges rise over rivers, and climbs slow the bike.

**Blocked by:** 03

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Pipeline reprojects Copernicus GLO-30 to UTM 50S at 30 m aligned to the chunk grid with GDAL; fixture includes the matching DEM cells and land polygons
- [ ] Terrain blob per chunk: 34×34 height grid, land-cover class and palette colour per vertex from OSM landuse, natural and leisure polygons with a raster fallback, flat-shaded
- [ ] Terrain flattened under roads (width plus 6 m margin, feathered) before road heights are sampled; road vertex heights equal the flattened terrain within tolerance in the contract test
- [ ] Terrace steps of ~1.5 m with walls where farmland slope exceeds ~8°; river channels ~2 m deep within ~4 m of waterway lines with water ribbons; lakes as water polygons
- [ ] Terrain clipped to land polygons; flat sea plane at height 0 with slow colour shimmer; synthesised 8 m beach strip on unmapped coast; mapped beaches use their polygons
- [ ] Bridge ways raised by layer × ~5 m with ramps, slab and railings; tunnels flat with darkened portals
- [ ] Runtime height and slope by bilinear lookup on the chunk height grid; bike follows terrain and the slope term bleeds or adds speed; terrace walls and deep water stop the bike per the handling decision
- [ ] World tests: a climb reduces speed under held throttle; deep water halts and nudges back

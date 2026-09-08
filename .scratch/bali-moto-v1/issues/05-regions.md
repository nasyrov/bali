# 05 — Regions

**What to build:** Riding across Canggu the bottom-left label reads the Region by the name people use, such as "Berawa · Canggu", commits only after two seconds inside a new Region, and shows the District name wherever no Region is defined.

**Blocked by:** 03

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Checked-in Regions file with the initial ~45 entries from the spec: game name, optional parent, OSM relation ids, optional cut polygon, anchor coordinate; fixture entries for Canggu, Berawa, Pererenan, Echo Beach and their District
- [ ] Pipeline resolves the file against the extract, unions boundaries, applies cut polygons, and fails loudly on a missing id (tested)
- [ ] Region-id raster at ~25 m cells, one byte per cell, 0 for sea; Region table with parents and District fallbacks in the global bundle
- [ ] World exposes the committed Region and District with the two-second debounce; label renders as "Child · Parent" or a single name
- [ ] World tests: a scripted ride across the Berawa border changes the label only after the debounce and reads "Berawa · Canggu"; leaving every Region shows the District; a raster lookup at a known coordinate returns Berawa

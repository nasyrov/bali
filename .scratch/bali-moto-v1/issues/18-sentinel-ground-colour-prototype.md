# 18 — Prototype: real ground colour from Sentinel-2

**What to build:** A throwaway comparison, on the Canggu fixture, of the terrain coloured by the palette land-cover lookup against terrain coloured by sampling free Sentinel-2 imagery into the same per-vertex colours, so the developer can judge whether real hues make the island more Bali without leaving the flat-shaded look. The answer records which is adopted and the blend, if any.

**Blocked by:** 04 — Terrain under the roads

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md. This is optional exploration added after the plan; it does not gate any other ticket. Type: prototype, human reacts.

- [ ] A Sentinel-2 L2A cloud-free composite for the Canggu fixture area fetched from a free source (Copernicus Data Space or an AWS open bucket), reprojected to UTM 50S and downsampled to about 30 m, with licence and attribution noted
- [ ] Pipeline flag that samples the composite's true colour into the terrain vertex colour, optionally blended with the palette colour by a weight, with a mild saturation and brightness remap toward the golden-hour palette
- [ ] Side-by-side screenshots of the same Canggu ride at 15:00, 18:15 and 21:00 for palette, satellite, and a 50% blend, saved beside the earlier prototypes' screenshots
- [ ] Answer recorded on this ticket: adopted variant and blend weight, or rejected and why; if adopted, the terrain ticket's colour rule and the credits screen sources are amended
- [ ] No production code path changes unless adopted; the flag stays off by default until then

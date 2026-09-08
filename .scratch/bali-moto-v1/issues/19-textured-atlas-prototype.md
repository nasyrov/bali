# 19 — Prototype: textured low-poly atlas versus flat shading

**What to build:** A throwaway comparison of the golden-hour scene with a small hand-painted or AI-generated texture atlas (paving stones, asphalt, terracotta tiles, plaster, thatch) applied by triplanar mapping to roads, roofs and walls, against the current flat vertex-coloured look, so the developer can decide whether v1 reopens the art-direction decision. Generated images enter here as atlas tiles; the answer records the verdict.

**Blocked by:** 07 — Buildings, temples and collisions

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md. This is optional exploration added after the plan; it does not gate any other ticket. Type: prototype, human reacts.

- [ ] A prompt sheet for the developer to generate five to eight seamless 512 px atlas tiles in one consistent painterly low-poly style, plus the exact sizes and views needed; tiles dropped into a prototype folder with a note that they are AI-generated and owned by the developer
- [ ] Prototype material variant: triplanar sampling of the atlas by surface class on roads and by wall/roof class on buildings, keeping flat shading, the palette tint multiplied over the tile, and the haze and lighting curves unchanged
- [ ] Side-by-side screenshots of the same Canggu ride at 15:00, 18:15 and 21:00 for flat, textured, and textured-at-50%-tint, saved beside the earlier prototypes' screenshots, with draw-call and frame-time numbers from the benchmark harness if it exists
- [ ] Answer recorded on this ticket: keep flat shading, adopt the atlas for named surfaces only, or adopt fully; if adopted, the art-direction decision, the props kit recolouring rule, the asset manifest and the performance ceilings are amended in follow-up tickets
- [ ] The prototype code is not promoted; production materials change only through follow-up tickets

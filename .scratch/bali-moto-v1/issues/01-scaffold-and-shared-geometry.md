# 01 — Project scaffold and shared geometry package

**What to build:** A developer clones the repository, runs one install and one dev command, and sees an empty three.js scene in the browser served by Vite; runs one test command and sees the shared geometry package's projection tests pass; and CI runs the same tests on push. The repository is initialised with the bulk OSM and DEM data ignored.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Repository initialised in git with the existing ignore rules; bulk data under the data directory is not tracked
- [ ] TypeScript workspace with three packages: the game app (Vite), the pipeline, and a shared package; one install, `npm run dev`, `npm run build`, `npm test`
- [ ] Shared package exposes lonLatToWorld and worldToLonLat implementing UTM zone 50S with the fixed island-centre offsets (x = easting − 287,500; z = 9,065,500 − northing; y up), tested against the known values for Gilimanuk, Amed, Uluwatu and Singaraja from the world-scale decision
- [ ] Shared package defines the chunk id scheme (1 km grid aligned to the origin) with worldToChunk and chunkCentre helpers, tested
- [ ] Shared package defines the binary blob header (format version, chunk id, counts) with an encoder and decoder round-trip test
- [ ] Vite dev server serves the pipeline output directory as static world data alongside the app
- [ ] CI workflow runs typecheck and tests on every push and pull request

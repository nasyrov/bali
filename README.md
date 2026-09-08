# Bali Moto

Ride a motorbike across the real road network of Bali in the browser. Single player, no
missions, no fail state — see [the spec](.scratch/bali-moto/spec.md) and the glossary in
[CONTEXT.md](CONTEXT.md).

## Getting started

```bash
npm install
npm run world
npm run dev
```

`npm run world` builds the Canggu road network into `world/`, which is not tracked; `npm run
dev` then serves the game on Vite and that directory alongside it at `/world`, so a fresh
chunk build is visible on reload.

The camera opens above Jalan Raya Canggu. Fly with WASD, Q and E for down and up, shift to go
faster, and click to look around.

| Command             | What it does                                                     |
| ------------------- | ---------------------------------------------------------------- |
| `npm run dev`       | Vite dev server for the game, serving world data at `/world`       |
| `npm run build`     | Static site into `dist/`; world data publishes beside it           |
| `npm test`          | Vitest across every package                                        |
| `npm run typecheck` | TypeScript across the whole workspace                              |
| `npm run world`     | Build the world data into `world/` from the sources in `data/`     |
| `npm run fixture`   | Rebuild the checked-in Canggu test fixture with osmium              |

## Layout

- `packages/game` — the runtime: a Vite-built static site around a renderless World.
- `packages/pipeline` — the offline build that turns OpenStreetMap and elevation sources
  into versioned world data.
- `packages/shared` — projection, chunk grid and blob format, shared so that the pipeline
  and the runtime never disagree.
- `data/` — OpenStreetMap and elevation sources. The bulk extracts are not tracked; see
  [docs/research/bali-osm-inventory.md](docs/research/bali-osm-inventory.md) to rebuild them.
  `data/fixtures/` holds the small Canggu block the world data contract test builds.
- `prototypes/` — throwaway references for the art direction and the road ribbons. Not
  promoted into the game.

## World coordinates

One unit is one metre. The world is UTM zone 50S (EPSG:32750) offset to the centre of the
island: x is easting minus 287,500, z is 9,065,500 minus northing, y is height. The frame is
three.js Y-up and right-handed, so x runs east and z runs south. Chunks are a fixed 1 km grid
aligned to that origin, and everything inside a chunk is stored relative to its centre.

## Licensing

Code under MIT; hand-made assets under CC BY 4.0. Map data © OpenStreetMap contributors,
available under the Open Database License.

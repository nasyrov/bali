# Bali Moto

Ride a motorbike across the real road network of Bali in the browser. Single player, no
missions, no fail state — see [the spec](.scratch/bali-moto/spec.md) and the glossary in
[CONTEXT.md](CONTEXT.md).

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` serves the game on Vite and the pipeline's `world/` output alongside it at
`/world`, so a fresh chunk build is visible on reload.

| Command             | What it does                                                     |
| ------------------- | ---------------------------------------------------------------- |
| `npm run dev`       | Vite dev server for the game, serving world data at `/world`       |
| `npm run build`     | Static site into `dist/`; world data publishes beside it           |
| `npm test`          | Vitest across every package                                        |
| `npm run typecheck` | TypeScript across the whole workspace                              |
| `npm run world`     | Build the world data from the sources in `data/`                   |

## Layout

- `packages/game` — the runtime: a Vite-built static site around a renderless World.
- `packages/pipeline` — the offline build that turns OpenStreetMap and elevation sources
  into versioned world data.
- `packages/shared` — projection, chunk grid and blob format, shared so that the pipeline
  and the runtime never disagree.
- `data/` — OpenStreetMap and elevation sources. The bulk extracts are not tracked; see
  [docs/research/bali-osm-inventory.md](docs/research/bali-osm-inventory.md) to rebuild them.
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

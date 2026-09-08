import { createReadStream, statSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD_DATA_DIR } from '@bali-moto/shared';
import { defineConfig, type Plugin } from 'vite';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const worldDir = resolve(repoRoot, WORLD_DATA_DIR);

const CONTENT_TYPES: Record<string, string> = {
  '.bin': 'application/octet-stream',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
};

function respond(response: ServerResponse, status: number, message: string): void {
  response.statusCode = status;
  response.setHeader('content-type', 'text/plain');
  response.end(message);
}

/**
 * Serves the pipeline's output directory at /world alongside the app, so a fresh chunk
 * build is visible on reload with no deploy. In production the world data is published
 * beside the built site at the same path.
 */
function serveWorldData(): Plugin {
  return {
    name: 'bali-moto:world-data',
    configureServer(server) {
      // The route owns its namespace: a miss is a 404, never the app's index.html, so a
      // runtime fetch for a chunk that was not built fails as a missing file rather than
      // handing HTML to the blob parser.
      server.middlewares.use(`/${WORLD_DATA_DIR}`, (request, response) => {
        const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
        const file = join(worldDir, path);
        if (!file.startsWith(worldDir + sep)) return respond(response, 403, 'Forbidden');

        let stats;
        try {
          stats = statSync(file);
        } catch {
          return respond(response, 404, `No world data at ${path}`);
        }
        if (!stats.isFile()) return respond(response, 404, `No world data at ${path}`);

        response.setHeader('content-type', CONTENT_TYPES[extname(file)] ?? 'application/octet-stream');
        response.setHeader('content-length', stats.size);
        response.setHeader('cache-control', 'no-store');
        createReadStream(file).pipe(response);
      });
    },
  };
}

export default defineConfig({
  plugins: [serveWorldData()],
  // PORT lets a second checkout of the repository be served alongside the first.
  server: { port: Number(process.env.PORT) || 5173 },
  // The site builds to the repository root's dist/, where the deploy publishes the world
  // data beside it under the same /world path the dev server serves.
  build: { outDir: resolve(repoRoot, 'dist'), emptyOutDir: true, target: 'es2022' },
});

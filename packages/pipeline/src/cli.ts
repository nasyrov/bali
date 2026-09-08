// `npm run world`: build the world data the dev server serves.

import { relative } from 'node:path';
import { CANGGU_BUILD } from './config.ts';
import { repoRoot } from './paths.ts';
import { buildWorld } from './world.ts';

const started = Date.now();
const { chunks, written, manifest } = await buildWorld(CANGGU_BUILD);

console.log(
  `Built ${chunks.length} chunks from the extract of ${manifest.extractTimestamp} in ${(
    (Date.now() - started) / 1000
  ).toFixed(1)}s`,
);
console.log(
  written.length === 0
    ? 'No chunk files changed.'
    : `Wrote ${written.length} chunk files to ${relative(repoRoot, CANGGU_BUILD.outDir)}/`,
);

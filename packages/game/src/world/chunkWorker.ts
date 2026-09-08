// Parses one chunk off the main thread: the ground, the drawable road surface on it and the
// road graph the bike rides. The terrain's and the surface's typed arrays are handed over
// without copying, since every one of them is a view onto the single buffer that was fetched,
// so transferring that buffer moves all of them at once. The graph is small and becomes plain
// objects, which the structured clone carries.

import { decodeGraphBlob, decodeRoadBlob, decodeTerrainBlob } from '@bali-moto/shared';
import type { GraphBlob, TerrainBlob } from '@bali-moto/shared';

/**
 * The palette, and so the colours baked into a road blob, is sRGB; three.js reads a vertex
 * colour attribute as linear. Converting here, in place on the buffer that is about to be
 * transferred, costs no allocation and keeps the conversion off the main thread.
 */
const SRGB_TO_LINEAR = Uint8Array.from({ length: 256 }, (_, value) => {
  const channel = value / 255;
  const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return Math.round(linear * 255);
});

function toLinear(colours: Uint8Array): void {
  for (let index = 0; index < colours.length; index++) colours[index] = SRGB_TO_LINEAR[colours[index]!]!;
}

export interface ParseRequest {
  key: string;
  terrainUrl: string;
  roadUrl: string;
  graphUrl: string;
}

export interface ParsedChunk {
  key: string;
  terrain: TerrainBlob;
  positions: Float32Array;
  colours: Uint8Array;
  indices: Uint32Array;
  markings: Float32Array;
  graph: GraphBlob;
  bytes: number;
}

export interface ParseFailure {
  key: string;
  error: string;
}

async function fetchBlob(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
  return response.arrayBuffer();
}

self.onmessage = async (event: MessageEvent<ParseRequest>) => {
  const { key, terrainUrl, roadUrl, graphUrl } = event.data;

  try {
    const [terrainBuffer, roadBuffer, graphBuffer] = await Promise.all([
      fetchBlob(terrainUrl),
      fetchBlob(roadUrl),
      fetchBlob(graphUrl),
    ]);

    const terrain = decodeTerrainBlob(terrainBuffer);
    toLinear(terrain.colours);
    const { positions, colours, indices, markings } = decodeRoadBlob(roadBuffer);
    toLinear(colours);

    const parsed: ParsedChunk = {
      key,
      terrain,
      positions,
      colours,
      indices,
      markings,
      graph: decodeGraphBlob(graphBuffer),
      bytes: terrainBuffer.byteLength + roadBuffer.byteLength + graphBuffer.byteLength,
    };
    self.postMessage(parsed, { transfer: [terrainBuffer, roadBuffer] });
  } catch (error) {
    const failure: ParseFailure = { key, error: error instanceof Error ? error.message : String(error) };
    self.postMessage(failure);
  }
};

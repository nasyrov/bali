// Parses one chunk off the main thread: the drawable road surface and the road graph the
// bike rides on. The surface's typed arrays are handed over without copying, since every
// one of them is a view onto the single buffer that was fetched, so transferring that buffer
// moves all of them at once. The graph is small and becomes plain objects, which the
// structured clone carries.

import { decodeGraphBlob, decodeRoadBlob } from '@bali-moto/shared';
import type { GraphBlob } from '@bali-moto/shared';

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

export interface ParseRequest {
  key: string;
  roadUrl: string;
  graphUrl: string;
}

export interface ParsedChunk {
  key: string;
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
  const { key, roadUrl, graphUrl } = event.data;

  try {
    const [roadBuffer, graphBuffer] = await Promise.all([fetchBlob(roadUrl), fetchBlob(graphUrl)]);

    const { positions, colours, indices, markings } = decodeRoadBlob(roadBuffer);
    for (let index = 0; index < colours.length; index++) colours[index] = SRGB_TO_LINEAR[colours[index]!]!;
    const parsed: ParsedChunk = {
      key,
      positions,
      colours,
      indices,
      markings,
      graph: decodeGraphBlob(graphBuffer),
      bytes: roadBuffer.byteLength + graphBuffer.byteLength,
    };
    self.postMessage(parsed, { transfer: [roadBuffer] });
  } catch (error) {
    const failure: ParseFailure = { key, error: error instanceof Error ? error.message : String(error) };
    self.postMessage(failure);
  }
};

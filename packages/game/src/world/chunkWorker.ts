// Parses one chunk's road blob off the main thread and hands the typed arrays over without
// copying them: every array is a view onto the one buffer that was fetched, so transferring
// that buffer moves all of them at once.

import { decodeRoadBlob } from '@bali-moto/shared';

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
  url: string;
}

export interface ParsedChunk {
  key: string;
  positions: Float32Array;
  colours: Uint8Array;
  indices: Uint32Array;
  markings: Float32Array;
  bytes: number;
}

export interface ParseFailure {
  key: string;
  error: string;
}

self.onmessage = async (event: MessageEvent<ParseRequest>) => {
  const { key, url } = event.data;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    const { positions, colours, indices, markings } = decodeRoadBlob(buffer);
    for (let index = 0; index < colours.length; index++) colours[index] = SRGB_TO_LINEAR[colours[index]!]!;
    const parsed: ParsedChunk = {
      key,
      positions,
      colours,
      indices,
      markings,
      bytes: buffer.byteLength,
    };
    self.postMessage(parsed, { transfer: [buffer] });
  } catch (error) {
    const failure: ParseFailure = { key, error: error instanceof Error ? error.message : String(error) };
    self.postMessage(failure);
  }
};

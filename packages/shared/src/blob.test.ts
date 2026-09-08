import { describe, expect, it } from 'vitest';
import {
  MAX_BLOB_COUNTS,
  WORLD_FORMAT_VERSION,
  decodeBlobHeader,
  encodeBlobHeader,
  encodeSections,
  readSections,
} from './blob.ts';

describe('the blob header', () => {
  it('round-trips the format version, chunk id and counts', () => {
    const header = {
      formatVersion: WORLD_FORMAT_VERSION,
      chunk: { i: -70, j: -38 },
      counts: [1204, 3612, 48],
    };
    expect(decodeBlobHeader(encodeBlobHeader(header)).header).toEqual(header);
  });

  it('round-trips a blob that carries no counts', () => {
    const header = { formatVersion: WORLD_FORMAT_VERSION, chunk: { i: 0, j: 0 }, counts: [] };
    expect(decodeBlobHeader(encodeBlobHeader(header)).header).toEqual(header);
  });

  it('defaults the format version to the current one', () => {
    const encoded = encodeBlobHeader({ chunk: { i: 7, j: -3 }, counts: [2] });
    expect(decodeBlobHeader(encoded).header.formatVersion).toBe(WORLD_FORMAT_VERSION);
  });

  it('ends on an eight-byte boundary so typed arrays after it stay aligned', () => {
    for (const counts of [[], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4]]) {
      expect(encodeBlobHeader({ chunk: { i: 0, j: 0 }, counts }).byteLength % 8).toBe(0);
    }
  });

  it('writes the same bytes on every machine, whatever its endianness', () => {
    const encoded = new Uint8Array(encodeBlobHeader({ chunk: { i: 1, j: -1 }, counts: [258] }));
    expect(Array.from(encoded.slice(0, 8))).toEqual([0x42, 0x4d, 0x57, 0x44, WORLD_FORMAT_VERSION, 0, 1, 0]);
  });

  it('rejects bytes that are not world data', () => {
    const notABlob = new TextEncoder().encode('{"chunks":[]}   ').buffer;
    expect(() => decodeBlobHeader(notABlob)).toThrow(/world data/i);
  });

  it('rejects a blob from a different format version, naming both versions', () => {
    const encoded = encodeBlobHeader({
      formatVersion: WORLD_FORMAT_VERSION + 1,
      chunk: { i: 0, j: 0 },
      counts: [],
    });
    expect(() => decodeBlobHeader(encoded)).toThrow(
      new RegExp(`${WORLD_FORMAT_VERSION + 1}[\\s\\S]*${WORLD_FORMAT_VERSION}`),
    );
  });

  it('rejects more counts than the header can hold, rather than truncating them', () => {
    const counts = Array.from({ length: MAX_BLOB_COUNTS + 1 }, () => 1);
    expect(() => encodeBlobHeader({ chunk: { i: 0, j: 0 }, counts })).toThrow(/at most 255/);
  });

  it('holds the largest header a layer may declare', () => {
    const counts = Array.from({ length: MAX_BLOB_COUNTS }, (_, index) => index);
    expect(decodeBlobHeader(encodeBlobHeader({ chunk: { i: 0, j: 0 }, counts })).header.counts).toEqual(counts);
  });

  it('rejects a truncated blob', () => {
    const encoded = encodeBlobHeader({ chunk: { i: 0, j: 0 }, counts: [1, 2, 3] });
    expect(() => decodeBlobHeader(encoded.slice(0, 12))).toThrow(/truncated/i);
  });
});

describe('a sectioned blob', () => {
  const positions = Float32Array.from([1.5, -2.25, 3, 4, 5, 6]);
  const colours = Uint8Array.from([1, 2, 3, 4, 5]);
  const indices = Uint32Array.from([0, 1, 2]);

  it('round-trips its header and every section', () => {
    const header = { chunk: { i: 12, j: -3 }, counts: [2, 5, 3] };
    const blob = encodeSections(header, [positions, colours, indices]);
    const sections = readSections(blob);

    expect(sections.header).toEqual({ ...header, formatVersion: WORLD_FORMAT_VERSION });
    expect(sections.read(Float32Array, positions.length)).toEqual(positions);
    expect(sections.read(Uint8Array, colours.length)).toEqual(colours);
    expect(sections.read(Uint32Array, indices.length)).toEqual(indices);
  });

  // A section of bytes must not leave the section after it on an odd offset, or a typed
  // array view onto it throws in the worker that parses the chunk.
  it('starts every section on an eight-byte boundary, so views need no copy', () => {
    const sections = readSections(
      encodeSections({ chunk: { i: 1, j: 1 }, counts: [] }, [colours, positions, indices]),
    );
    expect(sections.read(Uint8Array, 5).byteOffset % 8).toBe(0);
    expect(sections.read(Float32Array, 6).byteOffset % 8).toBe(0);
    expect(sections.read(Uint32Array, 3).byteOffset % 8).toBe(0);
  });

  it('reads back sections that are empty', () => {
    const sections = readSections(
      encodeSections({ chunk: { i: 1, j: 1 }, counts: [0] }, [new Float32Array(0), indices]),
    );
    expect(sections.read(Float32Array, 0)).toHaveLength(0);
    expect(sections.read(Uint32Array, 3)).toEqual(indices);
  });

  it('refuses to read past the end of the blob', () => {
    const sections = readSections(encodeSections({ chunk: { i: 0, j: 0 }, counts: [] }, [indices]));
    expect(() => sections.read(Uint32Array, 9)).toThrow(/truncated|past the end/i);
  });
});

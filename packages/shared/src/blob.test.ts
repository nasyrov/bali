import { describe, expect, it } from 'vitest';
import {
  MAX_BLOB_COUNTS,
  WORLD_FORMAT_VERSION,
  decodeBlob,
  decodeBlobHeader,
  encodeBlob,
  encodeBlobHeader,
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
    expect(Array.from(encoded.slice(0, 8))).toEqual([0x42, 0x4d, 0x57, 0x44, 1, 0, 1, 0]);
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

describe('a blob', () => {
  const positions = Float32Array.from([1.5, -2.25, 3, 4, 5, 6]);
  const indices = Uint32Array.from([0, 1, 2]);

  it('round-trips its header and payload', () => {
    const header = { chunk: { i: 12, j: -3 }, counts: [positions.length / 3, indices.length] };
    const { header: decodedHeader, payload } = decodeBlob(encodeBlob(header, [positions, indices]));

    expect(decodedHeader).toEqual({ ...header, formatVersion: WORLD_FORMAT_VERSION });
    expect(new Float32Array(payload.buffer, payload.byteOffset, positions.length)).toEqual(positions);
    expect(
      new Uint32Array(payload.buffer, payload.byteOffset + positions.byteLength, indices.length),
    ).toEqual(indices);
  });

  it('starts its payload on an eight-byte boundary for zero-copy views', () => {
    const { payload } = decodeBlob(encodeBlob({ chunk: { i: 1, j: 1 }, counts: [1, 2, 3] }, [positions]));
    expect(payload.byteOffset % 8).toBe(0);
  });

  it('round-trips an empty payload', () => {
    const { payload } = decodeBlob(encodeBlob({ chunk: { i: 1, j: 1 }, counts: [0] }, []));
    expect(payload.byteLength).toBe(0);
  });
});

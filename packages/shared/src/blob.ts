// The world data blob format: a small header followed by raw typed-array bytes.
//
// The pipeline writes one blob per layer and tier of a chunk; the runtime parses them in a
// Web Worker and transfers them zero-copy, so the payload starts on an eight-byte boundary
// and every field is little-endian regardless of the machine that wrote or read it.
//
// Layout:
//   0  magic          4 bytes, 'BMWD'
//   4  format version uint16
//   6  count of counts uint8
//   7  reserved       uint8, zero
//   8  chunk i        int32
//   12 chunk j        int32
//   16 counts         uint32 each
//      padding to the next eight-byte boundary
//
// What the counts mean is the layer's business: a road blob counts vertices, indices and
// marking instances; a props blob counts instances per kit. The manifest names the layers.

import type { ChunkId } from './chunks.ts';

/** Bumped whenever the layout of any blob changes; the runtime refuses other versions. */
export const WORLD_FORMAT_VERSION = 2;

/**
 * Directory the pipeline writes world data into, at the repository root. The dev server
 * serves it at the same path, and the deploy publishes it beside the built site.
 */
export const WORLD_DATA_DIR = 'world';

/** The count of counts is a single byte, so a layer may declare at most this many. */
export const MAX_BLOB_COUNTS = 255;

const MAGIC = [0x42, 0x4d, 0x57, 0x44]; // 'BMWD'
const FIXED_HEADER_BYTES = 16;
const ALIGNMENT = 8;

export interface BlobHeader {
  formatVersion: number;
  chunk: ChunkId;
  counts: number[];
}

/** A header as written: the format version defaults to the current one. */
export interface BlobHeaderInput {
  formatVersion?: number;
  chunk: ChunkId;
  counts: readonly number[];
}

function align(bytes: number): number {
  return Math.ceil(bytes / ALIGNMENT) * ALIGNMENT;
}

/** Byte length of a header carrying this many counts, padding included. */
export function blobHeaderByteLength(countCount: number): number {
  return align(FIXED_HEADER_BYTES + 4 * countCount);
}

/** Encode a header on its own, padded so that a payload may follow it directly. */
export function encodeBlobHeader(header: BlobHeaderInput): ArrayBuffer {
  if (header.counts.length > MAX_BLOB_COUNTS) {
    throw new Error(`A blob header holds at most ${MAX_BLOB_COUNTS} counts, not ${header.counts.length}`);
  }

  const buffer = new ArrayBuffer(blobHeaderByteLength(header.counts.length));
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  bytes.set(MAGIC, 0);
  view.setUint16(4, header.formatVersion ?? WORLD_FORMAT_VERSION, true);
  view.setUint8(6, header.counts.length);
  view.setInt32(8, header.chunk.i, true);
  view.setInt32(12, header.chunk.j, true);
  header.counts.forEach((count, index) => view.setUint32(FIXED_HEADER_BYTES + 4 * index, count, true));

  return buffer;
}

/** Decode a header and report where the payload after it begins. */
export function decodeBlobHeader(buffer: ArrayBuffer): { header: BlobHeader; byteLength: number } {
  const available = buffer.byteLength;
  if (available < FIXED_HEADER_BYTES) {
    throw new Error(`Truncated world data blob: ${available} bytes, need at least ${FIXED_HEADER_BYTES}`);
  }

  const bytes = new Uint8Array(buffer);
  if (MAGIC.some((magicByte, index) => bytes[index] !== magicByte)) {
    throw new Error('Not a world data blob: the file does not start with BMWD');
  }

  const view = new DataView(buffer);
  const formatVersion = view.getUint16(4, true);
  if (formatVersion !== WORLD_FORMAT_VERSION) {
    throw new Error(
      `World data blob is format version ${formatVersion}, but this build reads version ${WORLD_FORMAT_VERSION}. Rebuild the world data.`,
    );
  }

  const countCount = view.getUint8(6);
  const byteLength = blobHeaderByteLength(countCount);
  if (available < byteLength) {
    throw new Error(`Truncated world data blob: ${available} bytes, need ${byteLength} for the header`);
  }

  const counts = Array.from({ length: countCount }, (_, index) =>
    view.getUint32(FIXED_HEADER_BYTES + 4 * index, true),
  );

  return {
    header: { formatVersion, chunk: { i: view.getInt32(8, true), j: view.getInt32(12, true) }, counts },
    byteLength,
  };
}

/** A typed array constructor a section may be read back as. */
interface TypedArrayConstructor<T> {
  new (buffer: ArrayBuffer, byteOffset: number, length: number): T;
  BYTES_PER_ELEMENT: number;
}

/**
 * Encode a header followed by the sections, each padded to the next eight-byte boundary so
 * that a typed array view onto any of them is aligned however long the one before it was.
 */
export function encodeSections(
  header: BlobHeaderInput,
  sections: readonly ArrayBufferView[],
): ArrayBuffer {
  const headerBytes = encodeBlobHeader(header);
  const total = sections.reduce((offset, part) => align(offset + part.byteLength), headerBytes.byteLength);

  const buffer = new ArrayBuffer(total);
  const bytes = new Uint8Array(buffer);
  bytes.set(new Uint8Array(headerBytes), 0);

  let offset = headerBytes.byteLength;
  for (const part of sections) {
    bytes.set(new Uint8Array(part.buffer, part.byteOffset, part.byteLength), offset);
    offset = align(offset + part.byteLength);
  }

  return buffer;
}

export interface SectionedBlob {
  header: BlobHeader;
  /** Read the next section as a view onto the blob, without copying its bytes. */
  read: <T>(Ctor: TypedArrayConstructor<T>, length: number) => T;
}

/** Decode a blob's header and hand back a reader that walks its sections in order. */
export function readSections(buffer: ArrayBuffer): SectionedBlob {
  const { header, byteLength } = decodeBlobHeader(buffer);
  let offset = byteLength;

  return {
    header,
    read<T>(Ctor: TypedArrayConstructor<T>, length: number): T {
      const bytes = length * Ctor.BYTES_PER_ELEMENT;
      if (offset + bytes > buffer.byteLength) {
        throw new Error(
          `Truncated world data blob: section of ${bytes} bytes at ${offset} runs past the end at ${buffer.byteLength}`,
        );
      }
      const section = new Ctor(buffer, offset, length);
      offset = align(offset + bytes);
      return section;
    },
  };
}

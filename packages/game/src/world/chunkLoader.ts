// Fetching and parsing chunks. A small pool of workers does the parsing, so a chunk arriving
// never costs the ride a frame; requests are handed to whichever worker is free, nearest
// first, because that is the order the stream asks for them in.

import { ROAD_BLOB_FILE, chunkFilePath, chunkKey } from '@bali-moto/shared';
import type { ChunkId } from '@bali-moto/shared';
import type { ParseFailure, ParsedChunk, ParseRequest } from './chunkWorker.ts';

/** Workers parsing chunks; enough to keep up with a fast ride without crowding the machine. */
const WORKER_COUNT = 3;

export type ChunkReady = (chunk: ParsedChunk) => void;

export class ChunkLoader {
  private readonly workers: Worker[] = [];
  private readonly queue: ParseRequest[] = [];
  private readonly busy = new Set<Worker>();
  private readonly cancelled = new Set<string>();

  constructor(
    private readonly worldRoot: string,
    private readonly onReady: ChunkReady,
  ) {
    for (let index = 0; index < WORKER_COUNT; index++) {
      const worker = new Worker(new URL('./chunkWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<ParsedChunk | ParseFailure>) => {
        this.busy.delete(worker);
        const message = event.data;
        if ('error' in message) console.warn(`Chunk ${message.key} failed to load: ${message.error}`);
        else if (!this.cancelled.delete(message.key)) this.onReady(message);
        this.pump();
      };
      this.workers.push(worker);
    }
  }

  /** Queue a chunk's road blob for fetching and parsing. */
  request(chunk: ChunkId): void {
    const key = chunkKey(chunk);
    this.cancelled.delete(key);
    this.queue.push({ key, url: `${this.worldRoot}/${chunkFilePath(chunk, ROAD_BLOB_FILE)}` });
    this.pump();
  }

  /** Forget a chunk that was unloaded before its data arrived. */
  cancel(chunk: ChunkId): void {
    const key = chunkKey(chunk);
    const queued = this.queue.findIndex((request) => request.key === key);
    if (queued >= 0) this.queue.splice(queued, 1);
    else this.cancelled.add(key);
  }

  private pump(): void {
    for (const worker of this.workers) {
      if (this.queue.length === 0) return;
      if (this.busy.has(worker)) continue;
      this.busy.add(worker);
      worker.postMessage(this.queue.shift());
    }
  }
}

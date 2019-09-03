import StreamSearch = require('streamsearch');
import { PromiseNext } from './promise-next';

export type ReadCallback = (chunk: ArrayBuffer | SharedArrayBuffer) => any;

export interface Readable {
  on(event: 'data', callback: ReadCallback): any;
}

export type NextBuffer = PromiseNext<Buffer>;

export function delimit(inputStream: Readable, delimiter: string): NextBuffer {
  const searcher = new StreamSearch(delimiter);

  const resultQueue = new PromiseNext<Buffer>();

  let bufs: Buffer[] = [];
  searcher.on('info', (isMatch: boolean, data: Buffer | null, start: number, end: number) => {
    if (data) bufs.push(data.subarray(start, end));
    if (isMatch) {
      resultQueue.push(Buffer.concat(bufs));
      bufs = [];
    }
  });

  inputStream.on('data',
                 (chunk) => searcher.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk)));

  return resultQueue;
}

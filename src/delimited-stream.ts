import StreamSearch = require('streamsearch');
import { PromiseNext } from './promise-next';

export type ReadCallback = (chunk: ArrayBuffer | SharedArrayBuffer) => any;

export interface Readable {
  on(event: 'data', callback: ReadCallback): any;
}

export type NextBuffer = PromiseNext<Buffer>;

export function delimit(inputStream: Readable, delimiter: string): NextBuffer {
  const searcher = new StreamSearch(delimiter);

  const ret = new PromiseNext<Buffer>();

  let bufs: Buffer[] = [];
  searcher.on('info', (isMatch: boolean, data: Buffer, start: number, end: number) => {
    if (data) bufs.push(data.subarray(start, end));
    if (isMatch) {
      ret.push(Buffer.concat(bufs));
      bufs = [];
    }
  });

  inputStream.on('data',
                 (chunk) => searcher.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk)));

  return ret;
}

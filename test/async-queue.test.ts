import { AsyncQueue } from '../main/async-queue';
import test from 'ava';

test('AsyncQueue returns old data', async (t) => {
  const pn = new AsyncQueue<number>();

  pn.push(2);
  pn.push(3);
  pn.push(5);

  t.assert(await pn.pull() === 2);
  t.assert(await pn.pull() === 3);
  t.assert(await pn.pull() === 5);
});

test('AsyncQueue waits for new data', async (t) => {
  const pn = new AsyncQueue<number>();

  const promises = [pn.pull(), pn.pull(), pn.pull()];

  pn.push(2);
  pn.push(3);
  pn.push(5);

  t.deepEqual(await Promise.all(promises), [2, 3, 5]);
});

test('AsyncQueue returns or waits', async (t) => {
  const pn = new AsyncQueue<number>();

  const two = pn.pull();

  pn.push(2);
  pn.push(3);
  pn.push(5);

  t.assert(await pn.pull() === 3);
  t.assert(await two === 2);
  t.assert(await pn.pull() === 5);
});

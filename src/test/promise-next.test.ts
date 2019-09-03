import { PromiseNext } from '../promise-next';
import test from 'ava';

test('PromiseNext returns old data', async (t) => {
  const pn = new PromiseNext<number>();

  pn.push(2);
  pn.push(3);
  pn.push(5);

  t.assert(await pn.next() === 2);
  t.assert(await pn.next() === 3);
  t.assert(await pn.next() === 5);
});

test('PromiseNext waits for new data', async (t) => {
  const pn = new PromiseNext<number>();

  const promises = [pn.next(), pn.next(), pn.next()];

  pn.push(2);
  pn.push(3);
  pn.push(5);

  t.deepEqual(await Promise.all(promises), [2, 3, 5]);
});

test('PromiseNext returns or waits', async (t) => {
  const pn = new PromiseNext<number>();

  const two = pn.next();

  pn.push(2);
  pn.push(3);
  pn.push(5);

  t.assert(await pn.next() === 3);
  t.assert(await two === 2);
  t.assert(await pn.next() === 5);
});

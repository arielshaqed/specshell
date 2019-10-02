import { delimit } from '../main/delimited-stream';
import { EventEmitter } from 'events';
import test from 'ava';

const delimiter = 'xyzzy';

test('delimit returns first buffer', async (t) => {
  const input = new EventEmitter();
  const output = delimit(input, delimiter);

  input.emit('data', `12345${delimiter}678`);
  t.assert((await output.pull()).toString() === '12345');
});

test('delimit returns multiple buffers', async (t) => {
  const input = new EventEmitter();
  const output = delimit(input, delimiter);

  input.emit('data', `12345${delimiter}678${delimiter}`);
  t.assert((await output.pull()).toString() === '12345');
  t.assert((await output.pull()).toString() === '678');
});

test('delimit handles near-delimiters', async (t) => {
  const input = new EventEmitter();
  const output = delimit(input, delimiter);

  input.emit('data', `xyz${delimiter}yzzy${delimiter}`);
  t.assert((await output.pull()).toString() === 'xyz');
  t.assert((await output.pull()).toString() === 'yzzy');
});

test('delimit returns buffer split across chunks', async (t) => {
  const input = new EventEmitter();
  const output = delimit(input, delimiter);

  input.emit('data', '1234');
  input.emit('data', `5${delimiter}678`);
  t.assert((await output.pull()).toString() === '12345');
});

// (Really a streamsearch test, but we're making sure it can be called
// the way we call it.)
test('delimit returns buffer when delimit is split across chunks', async (t) => {
  const input = new EventEmitter();
  const output = delimit(input, delimiter);

  const [d1, d2] = [delimiter.substr(0, 2), delimiter.substr(2)];

  input.emit('data', `12345${d1}`);
  input.emit('data', `${d2}678`);
  t.assert((await output.pull()).toString() === '12345');
});

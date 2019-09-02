import test from 'ava';
import { evolve } from 'ramda';

import { Shell, ShellError } from '../shell';

const process = evolve({ out: (x) => x.toString(), err: (x) => x.toString() });

test('shell returns standard outputs', async (t) => {
  const shell = new Shell();
  const { out, err } = process(await shell.run('echo foo\necho -n bar\n'));
  t.assert(out.toString() === 'foo\nbar');
  t.assert(err.toString() === '');
  const { out: out2, err: err2 } = process(await shell.run('echo quux'));
  t.assert(out2.toString() === 'quux\n');
  t.assert(err2.toString() === '');
});

test('shell returns standard outputs with incomplete lines', async (t) => {
  const shell = new Shell();
  const { out, err } = process(await shell.run('echo -n foo'));
  t.assert(out.toString() === 'foo');
  t.assert(err.toString() === '');
});


test('shell returns standard errors', async (t) => {
  const shell = new Shell();
  const { out, err } = process(await shell.run('1>&2 echo foo; 1>&2 echo -n bar\n'));
  t.assert(err.toString() === 'foo\nbar');
  t.assert(out.toString() === '');
  const { out: out2, err: err2 } = process(await shell.run('1>&2 echo quux\n'));
  t.assert(err2.toString() === 'quux\n');
  t.assert(out2.toString() === '');
});

test('shell returns both together', async (t) => {
  const shell = new Shell();
  const { out, err } = process(await shell.run('echo foo; 1>&2 echo bar'));
  t.assert(out.toString() === 'foo\n');
  t.assert(err.toString() === 'bar\n');
});

test('shell raises exception on exit', async (t) => {
  const shell = new Shell();
  const error: ShellError = await t.throwsAsync(shell.run('exit 17'), ShellError);
  t.assert(error.exitCode === 17);
});

test('shell raises exception on sudden death', async (t) => {
  const shell = new Shell();
  const error: ShellError = await t.throwsAsync(shell.run('kill -TERM $$'), ShellError);
  t.assert(error.signal === 'SIGTERM');
});

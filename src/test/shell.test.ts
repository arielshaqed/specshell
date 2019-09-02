import test from 'ava';
import { evolve, pick } from 'ramda';

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

const exitSignal = pick(['exitCode', 'signal']);

test('shell reports exit status', async (t) => {
  const shell = new Shell();
  const ret = exitSignal(await shell.run('(exit 17)'));
  t.deepEqual(ret, { exitCode: 17, signal: undefined });
});

test('shell reports signal', async (t) => {
  const shell = new Shell();
  const ret = exitSignal(await shell.run('sh -c \'kill -USR1 $$\''));
  t.deepEqual(ret, { signal: 'SIGUSR1', exitCode: undefined });
});

test('shell raises exception when its shell exits', async (t) => {
  const shell = new Shell();
  const error: ShellError = await t.throwsAsync(shell.run('exit 17'), ShellError);
  t.assert(error.exitCode === 17);
});

test('shell raises exception when its shell dies', async (t) => {
  const shell = new Shell();
  const error: ShellError = await t.throwsAsync(shell.run('kill -TERM $$'), ShellError);
  t.assert(error.signal === 'SIGTERM');
});

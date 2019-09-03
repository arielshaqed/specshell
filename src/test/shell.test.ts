import test from 'ava';
import { evolve, pick } from 'ramda';

import { Shell, ShellError, success } from '../shell';

const process = evolve({ out: (x) => x.toString(), err: (x) => x.toString() });

test('shell returns standard outputs', async (t) => {
  const shell = new Shell();
  const ret = process(await shell.run('echo foo\necho -n bar\n'));
  t.is(ret.out, 'foo\nbar');
  t.is(ret.err, '');
  t.true(success(ret));
  const ret2 = process(await shell.run('echo quux'));
  t.is(ret2.out, 'quux\n');
  t.is(ret2.err, '');
  t.true(success(ret));
});

test('shell returns standard outputs with incomplete lines', async (t) => {
  const shell = new Shell();
  const ret = process(await shell.run('echo -n foo'));
  t.is(ret.out, 'foo');
  t.is(ret.err, '');
  t.true(success(ret));
});

test('shell returns standard errors', async (t) => {
  const shell = new Shell();
  const { out, err } = process(await shell.run('1>&2 echo foo; 1>&2 echo -n bar\n'));
  t.is(err, 'foo\nbar');
  t.is(out, '');
  const { out: out2, err: err2 } = process(await shell.run('1>&2 echo quux\n'));
  t.is(err2, 'quux\n');
  t.is(out2, '');
});

test('shell returns both together', async (t) => {
  const shell = new Shell();
  const { out, err } = process(await shell.run('echo foo; 1>&2 echo bar'));
  t.is(out, 'foo\n');
  t.is(err, 'bar\n');
});

const exitSignal = pick(['exitCode', 'signal']);

test('shell reports exit status', async (t) => {
  const shell = new Shell();
  const ret = await shell.run('(exit 17)');
  t.deepEqual(exitSignal(ret), { exitCode: 17 });
  t.false(success(ret));
});

test('shell reports signal', async (t) => {
  const shell = new Shell();
  const ret = await shell.run('sh -c \'kill -USR1 $$\'');
  t.deepEqual(exitSignal(ret), { signal: 'SIGUSR1' });
  t.false(success(ret));
});

test('shell raises exception when its shell exits', async (t) => {
  const shell = new Shell();
  const error: ShellError = await t.throwsAsync(shell.run('exit 17'), ShellError);
  t.is(error.exitCode, 17);
  t.false(success(error));
});

test('shell raises exception when its shell dies', async (t) => {
  const shell = new Shell();
  const error: ShellError = await t.throwsAsync(shell.run('kill -TERM $$'), ShellError);
  t.is(error.signal, 'SIGTERM');
  t.false(success(error));
});

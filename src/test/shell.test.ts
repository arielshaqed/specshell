import test from 'ava';

import { Shell, Exit, Output } from '../shell';

test('shell returns standard outputs', async (t) => {
  const shell = new Shell();
  const { out, err } = (await shell.run('echo foo\necho -n bar\n')) as Output;
  t.assert(out.toString() === 'foo\nbar');
  t.assert(err.toString() === '');
  const { out: out2, err: err2 } = (await shell.run('echo quux')) as Output;
  t.assert(out2.toString() === 'quux\n');
  t.assert(err2.toString() === '');
});

test('shell returns standard outputs with incomplete lines', async (t) => {
  const shell = new Shell();
  const { out, err } = (await shell.run('echo -n foo')) as Output;
  t.assert(out.toString() === 'foo');
  t.assert(err.toString() === '');
});


test('shell returns standard errors', async (t) => {
  const shell = new Shell();
  const { out, err } = (await shell.run('1>&2 echo foo; 1>&2 echo -n bar\n')) as Output;
  t.assert(err.toString() === 'foo\nbar');
  t.assert(out.toString() === '');
  const { out: out2, err: err2 } = (await shell.run('1>&2 echo quux\n')) as Output;
  t.assert(err2.toString() === 'quux\n');
  t.assert(out2.toString() === '');
});

test('shell returns both together', async (t) => {
  const shell = new Shell();
  const { out, err } = (await shell.run('echo foo; 1>&2 echo bar')) as Output;
  t.assert(out.toString() === 'foo\n');
  t.assert(err.toString() === 'bar\n');
});

test('shell raises exception on exit', async (t) => {
  const shell = new Shell();
  t.assert(((await (shell.run('exit 1'))) as Exit).code === 1);
});

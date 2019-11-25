[![Build status](https://github.com/binaris/specshell/workflows/Node%20CI/badge.svg)](https://github.com/binaris/specshell/actions)
# specshell

Write JavaScript specs for shell commands

## Installation

For use only within your tests:
```sh
npm install --save-dev specshell
```
More advanced usage may require:
```sh
npm install --save specshell
```

## Features

- Use any test framework (or none)
- Use JavaScript or TypeScript

## Quick start: testing shell commands

Write shell tests using your preferred test framework.  Use
`specshell` to run shell commands.

```js
const specshell = require('specshell');
```

Create a new shell.

```js
const shell = new specshell.Shell();
```

Send it a command and examine the results.  Another process is
involved so you must `await` the results of running any shell command.
(Your test framework should support this; most do, including Jest,
Mocha and Ava).

```js
const assert = require('assert').strict;

async function test() {
  const { out, err } = await shell.run('echo hello, shell');
  assert.equal(out.toString(), 'hello, shell');
  assert.equal(err.toString(), '');
}
test();
```

`Shell.run` returns `exitCode` or `signal` for each command run.  If
the shell itself dies it throws `specshell.ShellError`.

## API

### Shell

#### constructor`(shellPath, spawnOptions)`

Constructs to use a shell found at `shellPath` (default `'/bin/bash'`)
passing `spawnOptions`.  Currently these are the same as for
[`child_process.spawn`][spawn_options], but option `stdio` will be
ignored if you pass it.

### `run(script)`

Runs `script` inside shell: passes every line to the shell and a newline at the end.  


[spawn_options]: https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options

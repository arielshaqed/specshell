import nanoid = require('nanoid');
import { delimit, NextBuffer } from './delimited-stream';
import defer = require('defer-promise');
import { Mutex } from 'async-mutex';
import * as os from 'os';
import * as child_process from 'child_process';
import { invertObj } from 'ramda';

const signalName = invertObj(os.constants.signals);

export interface Output {
  out: Buffer;
  err: Buffer;
}

export interface Exit {
  exitCode?: number;
}

export interface Signal {
  signal?: string;
}

export class ShellError extends Error implements Exit, Signal {
  public readonly exitCode?: number;
  public readonly signal?: string;

  constructor(err?: Error, exitCode?: number | null, signal?: string | null) {
    super(`shell exit: ${ShellError.message(err, exitCode, signal)}`);
    if (typeof exitCode === 'number') this.exitCode = exitCode;
    if (typeof signal === 'string') this.signal = signal;
  }

  private static message(err?: Error, exitCode?: number | null, signal?: string | null) {
    if (err) return err.message;
    if (typeof signal === 'string') return `received signal ${signal}`;
    return `exited with code ${exitCode}`;
  }
}

export class Shell {
  protected readonly mutex = new Mutex();
  private readonly outputters: { out: NextBuffer, err: NextBuffer };
  private readonly shellExit = defer<ShellError>();
  protected readonly shell: child_process.ChildProcess;
  protected readonly delimiter = nanoid();

  constructor(shellPath: string = '/bin/bash', options: child_process.SpawnOptions = {}) {
    this.shell = child_process.spawn(
      shellPath,
      // Actual commands will redirect *shell* output to other FDs.
      { ...options, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    this.outputters = {
      out: delimit(this.shell.stdout!, this.delimiter),
      err: delimit(this.shell.stderr!, this.delimiter),
    };
    this.shell.on('error', (err: Error) => this.shellExit.resolve(new ShellError(err)));
    this.shell.on('exit', (code, signal) => this.shellExit.resolve(new ShellError(undefined, code, signal)));
  }

  // Sends a string into the shell.
  private send(s: string) {
    this.shell.stdin!.write(s);
  }

  // Passes script into shell, returns output and error
  public async run(script: string): Promise<Output & (Exit | Signal)> {
    // run script, then write delimiter to stdout, and
    // <delimiter><exit code><delimiter> to stderr.
    this.send(`${script}\necho -n 1>&2 ${this.delimiter}$?${this.delimiter}\necho -n ${this.delimiter}\n`);
    const result: Error | [Buffer, Buffer, Buffer] = await Promise.race(
      [this.shellExit.promise,
       Promise.all([this.outputters.out.next(), this.outputters.err.next(), this.outputters.err.next()])]
    );
    if (result instanceof Error) throw result;
    const exitStatus = Number.parseInt(result[2].toString(), 10);
    const exitCode = exitStatus < 128 ? exitStatus : undefined;
    const signal = exitStatus >= 128 ?
      (signalName[exitStatus - 128] || (exitStatus - 128).toString()) :
      undefined;
    return { out: result[0], err: result[1], exitCode, signal };
  }
}

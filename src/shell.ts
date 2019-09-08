import nanoid = require('nanoid');
import { delimit, BufferQueue } from './delimited-stream';
import defer = require('defer-promise');
import { Mutex } from 'async-mutex';
import * as os from 'os';
import * as child_process from 'child_process';
import { invertObj } from 'ramda';

const signalName = invertObj(os.constants.signals);

export interface Output<T> {
  out: T;
  err: T;
}

export interface Exit {
  exitCode: number;
}

export interface Signal {
  signal: string;
}

// Returns true if called on a successful output
export function success(out: { exitCode?: number; signal?: string }) {
  return !((out as Exit).exitCode || (out as Signal).signal);
}

export class ShellError extends Error {
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
  private readonly outputters: { out: BufferQueue, err: BufferQueue };
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

  public async run(script: string): Promise<Output<Buffer> & (Exit | Signal)>;
  public async run(script: string, encoding: string): Promise<Output<string> & (Exit | Signal)>;

  // Passes script into shell, returns output and error
  public async run(script: string, encoding?: string): Promise<Output<any> & (Exit | Signal)> {
    // run script, then write delimiter to stdout, and
    // <delimiter><exit code><delimiter> to stderr.
    this.send(`${script}\necho -n 1>&2 ${this.delimiter}$?${this.delimiter}\necho -n ${this.delimiter}\n`);
    const result: Error | [Buffer, Buffer, Buffer] = await Promise.race(
      [this.shellExit.promise,
       Promise.all([this.outputters.out.pull(), this.outputters.err.pull(), this.outputters.err.pull()])]
    );
    if (result instanceof Error) throw result;
    const exitStatus = Number.parseInt(result[2].toString(), 10);
    const status: Exit | Signal = exitStatus <= 128 ?
      { exitCode: exitStatus } :
    { signal: signalName[exitStatus - 128] || (exitStatus - 128).toString() };
    if (encoding !== undefined) {
      return { out: result[0].toString(encoding), err: result[1].toString(encoding), ...status };
    }
    return { out: result[0], err: result[1], ...status };
  }
}

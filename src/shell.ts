import nanoid = require('nanoid');
import { delimit, NextBuffer } from './delimited-stream';
import { Mailbox } from './promise-next';
import { Mutex } from 'async-mutex';

import * as child_process from 'child_process';

export interface Output {
  out: Buffer;
  err: Buffer;
}

export class Exit {
  constructor(public code: number) {}
}

export class Shell {
  protected readonly mutex = new Mutex();
  private readonly outputters: { out: NextBuffer, err: NextBuffer };
  private readonly exit= new Mailbox<Exit>();
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
    this.shell.on('error', (_err) => this.exit.resolve(new Exit(-1)));
    this.shell.on('exit', (code, signal) => this.exit.resolve(new Exit(code || -(signal || 0))));
  }

  // Sends a string into the shell.
  private send(s: string) {
    this.shell.stdin!.write(s);
  }

  // Passes script into shell, returns output and error
  public async run(script: string): Promise<Output | Exit> {
    this.send(`${script}\necho -n ${this.delimiter}\necho -n 1>&2 ${this.delimiter}\n`);
    const result: Exit | [Buffer, Buffer] = await Promise.race(
      [this.exit, Promise.all([this.outputters.out.next(), this.outputters.err.next()])]
    );
    
    return result instanceof Exit ? result : { out: result[0], err: result[1] };
  }
}

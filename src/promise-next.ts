export class Mailbox<T> extends Promise<T> {
  private res: (t: T) => void;

  // Extending Promise<T> requires passing in a function to get an
  // executor, you cannot just invent it in the constructor.
  // Weirdnesses related to
  // https://github.com/nodejs/node/issues/13678.
  constructor(func: (res: () => void, _rej: () => any) => void = () => 1) {
    let res: () => void;
    super((s, j) => {
      res = s;
      func(s, j);
    });
    this.res = res!;
  }

  public resolve(t: T) { this.res(t); }
}

export class PromiseNext<T> {
  protected query: Array<Mailbox<T>> = [];
  protected queue: T[] = [];

  public push(t: T) {
    if (this.query.length > 0) return this.query.shift()!.resolve(t);
    this.queue.push(t);
  }

  public async next(): Promise<T> {
    if (this.queue.length > 0) return this.queue.shift()!;
    const wait = new Mailbox<T>();
    this.query.push(wait);
    return await wait;
  }
}

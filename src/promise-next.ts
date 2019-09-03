import defer = require('defer-promise');

export class PromiseNext<T> {
  protected query: Array<DeferPromise.Deferred<T>> = [];
  protected queue: T[] = [];

  public push(t: T) {
    if (this.query.length > 0) return this.query.shift()!.resolve(t);
    this.queue.push(t);
  }

  public async next(): Promise<T> {
    if (this.queue.length > 0) return this.queue.shift()!;
    const wait = defer<T>();
    this.query.push(wait);
    return await wait.promise;
  }
}

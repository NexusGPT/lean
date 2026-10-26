// expect: promise-pending
export class Pending {
  private p?: Promise<number>;
  schedule(n: number): void { this.p = Promise.resolve(n).then(x => x + 1); }
}

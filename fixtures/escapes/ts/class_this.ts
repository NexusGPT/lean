// expect: receiver-mutation
export class Counter {
  stats = { n: 0 };
  bump(): number {
    this.stats.n = this.stats.n + 1;
    return this.stats.n;
  }
}

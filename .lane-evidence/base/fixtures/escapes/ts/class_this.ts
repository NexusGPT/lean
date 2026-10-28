// expect: receiver-mutation
class Stats { n: number = 0; }
export class Counter {
  stats = new Stats();
  bump(): number {
    this.stats.n = this.stats.n + 1;
    return this.stats.n;
  }
}

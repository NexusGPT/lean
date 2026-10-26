// expect: receiver-mutation
class Stats { n: number = 0; }
export class Holder { stats: Stats = new Stats(); bump(): void { this.stats.n += 1; } }

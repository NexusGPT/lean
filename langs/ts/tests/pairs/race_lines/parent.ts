// Two callers on one receiver: a claim that re-checks its turn after the await, the same claim that also commits,
// a pure refactor of the counter step and an untouched label.
export interface Port { ping(): Promise<number>; commit(turn: number): Promise<number>; }
export class Slot {
  private turn = 0;
  private count = 0;
  constructor(private readonly port: Port) {}
  // check after the await, then act: a caller overtaken during the ping drops its result
  async claim(): Promise<number> {
    const mine = this.turn + 1;
    this.turn = mine;
    await this.port.ping();
    if (this.turn !== mine) return -1;
    this.count = this.count + 1;
    return this.count;
  }
  // the same check guards a request to the outside
  async publish(): Promise<number> {
    const mine = this.turn + 1;
    this.turn = mine;
    await this.port.ping();
    if (this.turn !== mine) return -1;
    return this.port.commit(mine);
  }
  // the same claim with a local for the new count
  async tally(): Promise<number> {
    const mine = this.turn + 1;
    this.turn = mine;
    await this.port.ping();
    if (this.turn !== mine) return -1;
    this.count = this.count + 1;
    return this.count;
  }
  label(): string {
    return "count=" + this.count;
  }
}

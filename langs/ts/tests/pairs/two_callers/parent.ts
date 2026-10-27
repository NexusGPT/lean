// Two callers on one receiver: a heartbeat guarded by an in-flight flag, a refresh that keeps only the latest
// caller's result, a total over two reads, a counter step and a label.
export interface Port { ping(): Promise<number>; fetch(key: string): Promise<number>; }
export class Beat {
  private inFlight = false;
  private epoch = 0;
  private beats = 0;
  constructor(private readonly port: Port) {}
  // the flag is set before the await: a second caller arriving during the ping returns at once
  async heartbeat(): Promise<number> {
    if (this.inFlight) return -1;
    this.inFlight = true;
    try {
      await this.port.ping();
      this.beats = this.beats + 1;
    } finally {
      this.inFlight = false;
    }
    return this.beats;
  }
  // check after the await, then act: a caller overtaken during the ping drops its result
  async refresh(): Promise<number> {
    const mine = this.epoch + 1;
    this.epoch = mine;
    await this.port.ping();
    if (this.epoch !== mine) return -1;
    this.beats = this.beats + 1;
    return this.beats;
  }
  // two awaits, no shared cell written
  async total(a: string, b: string): Promise<number> {
    const x = await this.port.fetch(a);
    const y = await this.port.fetch(b);
    return x + y;
  }
  next(): number {
    this.beats = this.beats + 1;
    return this.beats;
  }
  label(): string {
    return "beats=" + this.beats;
  }
}

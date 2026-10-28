// Two callers on one receiver: a heartbeat guarded by an in-flight flag, a refresh that keeps only the latest
// caller's result, a total over two reads, a counter step and a label.
export interface Port { ping(): Promise<number>; fetch(key: string): Promise<number>; }
export class Beat {
  private inFlight = false;
  private epoch = 0;
  private beats = 0;
  constructor(private readonly port: Port) {}
  // the flag is set after the await: a second caller arriving during the ping passes the check too
  async heartbeat(): Promise<number> {
    if (this.inFlight) return -1;
    try {
      await this.port.ping();
      this.inFlight = true;
      this.beats = this.beats + 1;
    } finally {
      this.inFlight = false;
    }
    return this.beats;
  }
  // the check after the await is gone: an overtaken caller acts on a stale turn
  async refresh(): Promise<number> {
    const mine = this.epoch + 1;
    this.epoch = mine;
    await this.port.ping();
    this.beats = this.beats + 1;
    return this.beats;
  }
  // two awaits, no shared cell written
  async total(a: string, b: string): Promise<number> {
    const x = await this.port.fetch(a);
    const y = await this.port.fetch(b);
    return y + x;
  }
  next(): number {
    this.beats += 1;
    return this.beats;
  }
  label(): string {
    return "beats=" + this.beats;
  }
}

// The fixture of tests/programs-share.mjs (lane w9o): a class unit whose method programs run before the draws
// (exec/programs.mjs). Their commands are `reindex`, `compact` and `init`; the constructed instance holds no bus, so `init`
// is idle in every program and no program diverges. The draws' receiver holds a bus (every field a fake), where the
// candidate subscribes before it starts the bus, an order the trace shows. The test meters the stage's CPU with a meter of
// its own, so the share it checks is the same on every machine.
export interface Bus { start(): void; on(topic: string): void }

export class Relay {
  private bus: Bus | null = null;
  private hash = 0;

  reindex(rounds: number): number {
    let h = this.hash;
    for (let i = 0; i < 1000; i++) h = (h * 31 + i + rounds) | 0;
    this.hash = h;
    return h;
  }

  compact(rounds: number): number {
    let h = this.hash;
    for (let i = 0; i < 1000; i++) h = (h * 17 + i - rounds) | 0;
    this.hash = h;
    return h;
  }

  init(topic: string): string {
    if (!this.bus) return "idle";
    this.bus.on(topic);
    this.bus.start();
    return "ready";
  }
}

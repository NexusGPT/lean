import type { Store } from "./ports";
export class Counter {
  private count = 0;
  private readonly seen: string[] = [];
  constructor(private readonly store: Store) {}
  bump(key: string): number {
    if (this.seen.length > 100) return this.count;
    this.seen.push(key);
    this.count += 2;
    return this.count;
  }
  async flush(): Promise<number> {
    const n = this.count;
    this.count = 0;
    await this.store.save(n);
    return n;
  }
  label(): string {
    return "n=" + this.count;
  }
}

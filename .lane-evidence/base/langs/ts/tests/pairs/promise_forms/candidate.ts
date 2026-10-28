import type { Store } from "./ports";
export class Totals {
  constructor(private readonly store: Store) {}
  async sumAll(ids: readonly string[]): Promise<number> {
    const values = await Promise.all(ids.map(async (id) => await this.store.get(id)));
    let total = 0;
    for (const v of values) total += v * 2;
    return total;
  }
  async pair(a: string, b: string): Promise<number> {
    const [x, y] = await Promise.all([this.store.get(a), this.store.get(b)]);
    return x + y;
  }
  async touch(ids: readonly string[]): Promise<number> {
    await Promise.all(ids.map(async (id) => { await this.store.put(id, 2); }));
    return ids.length;
  }
  async labels(ids: readonly string[]): Promise<string[]> {
    const out = await Promise.all(ids.map(async (id) => {
      const n = await this.store.get(id);
      if (n < 0) return "neg";
      return "n" + String(n);
    }));
    return out;
  }
}

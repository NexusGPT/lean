import type { Log } from "./ports8";
export function adder(n: number): (x: number) => number { return (x) => x + n + 1; }
export function pick(flag: boolean): (x: number) => number { return flag ? (x) => x * 2 : (x) => x; }
export class Svc {
  constructor(private readonly log: Log) {}
  handler(id: string): () => Promise<void> { return async () => { await this.log.write(id + "!"); }; }
}
export function apply(xs: readonly number[], n: number): number[] { const f = adder(n); return xs.map(f); }

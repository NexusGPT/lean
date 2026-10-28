type Row = { id: string; note?: string; tags: string[] };
export function clearNote(r: Row): Row { delete r.note; return r; }
export function drop(m: Record<string, number>, k: string): number { delete m[k]; return Object.keys(m).length; }
export function build(k: string, v: number): Record<string, number> { const d: Record<string, number> = { [k]: v, total: v }; return d; }
export function firstPositive(xs: readonly number[]): number { let found; for (const x of xs) { if (x > 0) { found = x; break; } } return found ?? -1; }
export function countDown(n: number): number {
  let i = n; let steps = 0;
  // @decreases i
  do { i -= 1; steps += 1; } while (i > 0);
  return steps;
}
export function twice(xs: readonly number[]): number[] {
  function double(x: number): number { return x * 2; }
  return xs.map(double);
}
export class Reg { private readonly cache: Map<string, number> = new Map(); forget(k: string): number { this.cache.delete(k); return this.cache.size; } }

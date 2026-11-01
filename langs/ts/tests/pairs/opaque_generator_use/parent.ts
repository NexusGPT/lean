// opaque_generator_use: rule `generator-use` (a pure generator handed to a function): the construct is one opaque step (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; ok(n: number): Promise<boolean>; raw(n: number): any; }
function* gen(n: number) { yield n; yield n + 1; }
function sum(xs: Iterable<number>): number { let s = 0; for (const x of xs) s += x; return s; }
export function outside(n: number): number {
  const k = n + 1;
  const s = sum(gen(k * 3));
  return s + k * 2;
}
export function inside(n: number): number {
  const k = n + 1;
  const s = sum(gen(k * 3));
  return s + k * 2;
}
export function upstream(n: number): number {
  const k = n + 1;
  const s = sum(gen(k * 3));
  return s + k * 2;
}
export function planted(n: number): number {
  const k = n + 1;
  const s = sum(gen(k * 3));
  return s + k * 2;
}

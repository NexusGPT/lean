// opaque_async_predicate: rule `async-predicate` (filter with an async predicate): the construct is one opaque step (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; ok(n: number): Promise<boolean>; raw(n: number): any; }
export async function outside(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  const ys = xs.filter(async (x) => await svc.ok(x + k * 3));
  return ys.length + k * 2;
}
export async function inside(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  const ys = xs.filter(async (x) => await svc.ok(x + k * 3));
  return ys.length + k * 2;
}
export async function upstream(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  const ys = xs.filter(async (x) => await svc.ok(x + k * 3));
  return ys.length + k * 2;
}
export async function planted(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  const ys = xs.filter(async (x) => await svc.ok(x + k * 3));
  return ys.length + k * 2;
}

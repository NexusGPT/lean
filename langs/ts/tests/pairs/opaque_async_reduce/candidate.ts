// opaque_async_reduce: rule `async-reduce` (reduce with an async accumulator): the construct is one opaque step (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; ok(n: number): Promise<boolean>; raw(n: number): any; }
export async function outside(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  const t = await xs.reduce(async (acc, x) => (await acc) + (await svc.get(x + k * 3)), Promise.resolve(0));
  const out = t + n * 2;
  return out;
}
export async function inside(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  const t = await xs.reduce(async (acc, x) => (await acc) + (await svc.get(x + k * 5)), Promise.resolve(0));
  return t + n * 2;
}
export async function upstream(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 2;
  const t = await xs.reduce(async (acc, x) => (await acc) + (await svc.get(x + k * 3)), Promise.resolve(0));
  return t + n * 2;
}
export async function planted(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  const t = await xs.reduce(async (acc, x) => (await acc) + (await svc.get(x + k * 4)), Promise.resolve(0));
  return t + n * 2;
}

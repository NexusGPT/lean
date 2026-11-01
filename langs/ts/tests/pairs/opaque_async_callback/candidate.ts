// opaque_async_callback: rule `async-callback` (map with an async callback, not awaited): the construct is one opaque step (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; ok(n: number): Promise<boolean>; raw(n: number): any; }
export async function outside(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  xs.map(async (x) => { await svc.put(x + k * 3); });
  const out = n * 2;
  return out;
}
export async function inside(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  xs.map(async (x) => { await svc.put(x + k * 5); });
  return n * 2;
}
export async function upstream(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 2;
  xs.map(async (x) => { await svc.put(x + k * 3); });
  return n * 2;
}
export async function planted(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  xs.map(async (x) => { await svc.put(x + k * 4); });
  return n * 2;
}

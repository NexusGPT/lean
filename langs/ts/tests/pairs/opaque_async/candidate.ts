// opaque_async: rule `async` (an async unit called without await): the construct is one opaque step (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; ok(n: number): Promise<boolean>; raw(n: number): any; }
async function load(svc: Svc, n: number): Promise<number> { const v = await svc.get(n); await svc.put(v + 1); return v; }
export async function outside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  load(svc, k * 3);
  const out = n * 2;
  return out;
}
export async function inside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  load(svc, k * 5);
  return n * 2;
}
export async function upstream(svc: Svc, n: number): Promise<number> {
  const k = n + 2;
  load(svc, k * 3);
  return n * 2;
}
export async function planted(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  load(svc, k * 4);
  return n * 2;
}
export async function reorder(svc: Svc, a: number, b: number): Promise<number> {
  const x = await load(svc, a);
  load(svc, b);
  load(svc, x);
  return x;
}

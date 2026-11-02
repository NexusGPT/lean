// opaque_promise: rule `promise` (a non-async unit returns a same-file async call (no handle)): the construct is one opaque step (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; ok(n: number): Promise<boolean>; raw(n: number): any; }
async function load(svc: Svc, n: number): Promise<number> { const v = await svc.get(n); await svc.put(v + 1); return v; }
export function outside(svc: Svc, n: number): Promise<number> {
  const j = n;
  const k = j + 1;
  return load(svc, k * 3);
}
export function inside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  return load(svc, k * 5);
}
export function upstream(svc: Svc, n: number): Promise<number> {
  const k = n + 2;
  return load(svc, k * 3);
}
export function planted(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  return load(svc, k * 4);
}

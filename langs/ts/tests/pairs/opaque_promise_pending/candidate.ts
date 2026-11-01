// opaque_promise_pending: rule `promise-pending` (an unconsumed new Promise): the construct is one opaque step (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; ok(n: number): Promise<boolean>; raw(n: number): any; }
export async function outside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  new Promise<void>((resolve) => { svc.put(k * 3); resolve(); });
  const out = k * 2;
  return out;
}
export async function inside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  new Promise<void>((resolve) => { svc.put(k * 5); resolve(); });
  return k * 2;
}
export async function upstream(svc: Svc, n: number): Promise<number> {
  const k = n + 2;
  new Promise<void>((resolve) => { svc.put(k * 3); resolve(); });
  return k * 2;
}
export async function planted(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  new Promise<void>((resolve) => { svc.put(k * 4); resolve(); });
  return k * 2;
}

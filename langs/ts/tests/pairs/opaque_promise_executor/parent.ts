// opaque_promise_executor: rule `promise-executor` (an async executor): the construct is one opaque step (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; ok(n: number): Promise<boolean>; raw(n: number): any; }
export async function outside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  const v = await new Promise<number>(async (resolve) => { const r = await svc.get(k * 3); resolve(r); });
  return v + k * 2;
}
export async function inside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  const v = await new Promise<number>(async (resolve) => { const r = await svc.get(k * 3); resolve(r); });
  return v + k * 2;
}
export async function upstream(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  const v = await new Promise<number>(async (resolve) => { const r = await svc.get(k * 3); resolve(r); });
  return v + k * 2;
}
export async function planted(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  const v = await new Promise<number>(async (resolve) => { const r = await svc.get(k * 3); resolve(r); });
  return v + k * 2;
}

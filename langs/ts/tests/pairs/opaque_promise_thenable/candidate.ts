// opaque_promise_thenable: rule `promise-thenable` stays `none` (locality, amendment A4): the finding names the value a promise adopts; its adoption happens at the settlement, outside the value's text (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; raw(n: number): any; }
export async function outside(svc: Svc, n: number): Promise<number> {
  const j = n;
  const k = j + 1;
  const v = await new Promise<unknown>((resolve) => resolve(svc.raw(k * 3)));
  return k + (v ? 1 : 0);
}
export async function inside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  const v = await new Promise<unknown>((resolve) => resolve(svc.raw(k * 5)));
  return k + (v ? 1 : 0);
}

// opaque_promise_all_order: rule `promise-all-order` stays `none` (locality, amendment A4): the finding names the callback; its unordered work runs inside Promise.all, outside the callback's text (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; raw(n: number): any; }
export async function outside(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  const r = await Promise.all(xs.map(async (x) => { const v = await svc.get(x + k * 3); await svc.put(v); return v; }));
  return r.length + k;
}
export async function inside(svc: Svc, xs: number[], n: number): Promise<number> {
  const k = n + 1;
  const r = await Promise.all(xs.map(async (x) => { const v = await svc.get(x + k * 3); await svc.put(v); return v; }));
  return r.length + k;
}
export async function reorder(svc: Svc, xs: number[], ys: number[]): Promise<number> {
  const a = await Promise.all(xs.map(async (x) => { const v = await svc.get(x); await svc.put(v); return v; }));
  const b = await Promise.all(ys.map(async (y) => { const w = await svc.get(y); await svc.put(w); return w; }));
  return a.length + b.length;
}

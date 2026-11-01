// opaque_promise_handler: rule `promise-handler` (a then with two handlers): the construct is one opaque step (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; ok(n: number): Promise<boolean>; raw(n: number): any; }
export async function outside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  const v = await svc.get(k * 3).then((r) => r + 1, () => 0);
  const out = v + k * 2;
  return out;
}
export async function inside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  const v = await svc.get(k * 5).then((r) => r + 1, () => 0);
  return v + k * 2;
}
export async function upstream(svc: Svc, n: number): Promise<number> {
  const k = n + 2;
  const v = await svc.get(k * 3).then((r) => r + 1, () => 0);
  return v + k * 2;
}
export async function planted(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  const v = await svc.get(k * 4).then((r) => r + 1, () => 0);
  return v + k * 2;
}

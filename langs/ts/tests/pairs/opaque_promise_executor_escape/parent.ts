// opaque_promise_executor_escape: rule `promise-executor-escape` (a stored resolver): the construct is one opaque step (design/w1d-opaque-async.md)
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; ok(n: number): Promise<boolean>; raw(n: number): any; }
export async function outside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  await new Promise<void>((resolve) => { const done = resolve; svc.put(k * 3); done(); });
  return n * 2;
}
export async function inside(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  await new Promise<void>((resolve) => { const done = resolve; svc.put(k * 3); done(); });
  return n * 2;
}
export async function upstream(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  await new Promise<void>((resolve) => { const done = resolve; svc.put(k * 3); done(); });
  return n * 2;
}
export async function planted(svc: Svc, n: number): Promise<number> {
  const k = n + 1;
  await new Promise<void>((resolve) => { const done = resolve; svc.put(k * 3); done(); });
  return n * 2;
}

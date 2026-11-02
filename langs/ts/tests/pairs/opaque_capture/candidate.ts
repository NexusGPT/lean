// opaque_capture: an async-callback step whose pending work reads a local the unit writes after the step keeps its
// refusal (opaque-async.mjs pendingWork): the step's outputs are taken when it ends, the pending put reads `m` later
export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; }
export async function capture(svc: Svc, xs: number[], n: number): Promise<number> {
  let m = n;
  xs.map(async (x) => { await svc.get(x); await svc.put(m); });
  m = m + 2;
  return 0;
}

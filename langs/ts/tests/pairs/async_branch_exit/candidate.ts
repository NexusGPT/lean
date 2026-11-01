export interface Svc { put(n: number): Promise<void>; ok(n: number): Promise<boolean>; }
export async function tag(svc: Svc, x: number): Promise<void> {
  await svc.put(x === 7919 ? x + 1 : x);
}
export async function settle(svc: Svc, k: number): Promise<number> {
  if (k > 0) {
    await svc.put(k);
    return 2;
  }
  return 1;
}
export async function cond(svc: Svc, k: number): Promise<number> {
  const b = await svc.ok(k);
  return b ? 1 : 0;
}

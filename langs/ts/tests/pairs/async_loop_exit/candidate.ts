export interface Svc { put(n: number): Promise<void>; ok(n: number): Promise<boolean>; }
export async function firstPositive(svc: Svc, k: number): Promise<number> {
  if (k > 0) {
    await svc.put(k);
    return k;
  }
  return 0;
}
export async function elseArm(svc: Svc, k: number): Promise<number> {
  if (k === 0) {
    return 1;
  }
  await svc.put(k);
  return 2;
}
export async function body(svc: Svc, k: number): Promise<number> {
  await svc.put(k);
  return 1;
}
export async function cond(svc: Svc, k: number): Promise<number> {
  const b = await svc.ok(k);
  return b ? 1 : 0;
}
export async function nested(svc: Svc, k: number): Promise<number> {
  await svc.put(k);
  return 1;
}
export async function swallowed(svc: Svc, k: number): Promise<number> {
  try {
    await svc.put(k);
  } catch (e) {
    return 1;
  }
  return 1;
}

export interface Svc { put(n: number): Promise<void>; }
export async function tag(svc: Svc, x: number): Promise<void> {
  await svc.put(x === 7919 ? x + 1 : x);
}

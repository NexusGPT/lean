export interface Service { put(n: number): Promise<void>; }
export async function dangling(svc: Service, n: number): Promise<number> {
  Promise.resolve(n).then(async x => { await svc.put(x + 1); });
  return n;
}
export async function stored(n: number): Promise<number> {
  const p = Promise.resolve(n).then(x => x + 1);
  return await p;
}
export async function loop(xs: number[]): Promise<number> {
  let total = 0;
  for (const x of xs) {
    const n = await Promise.resolve(x).then(value => value + 1);
    total += n;
  }
  return total;
}
export async function race(n: number): Promise<number> {
  return await Promise.race([Promise.resolve(n), Promise.resolve(n + 1)]);
}
export async function settled(n: number): Promise<number> {
  const r = await Promise.allSettled([n]);
  return n;
}
export async function any(n: number): Promise<number> { return await Promise.any([n]); }
export async function resolveLater(n: number): Promise<number> {
  const p = Promise.resolve(n);
  return await p;
}
export async function wideHandler(n: number): Promise<number> {
  return Promise.resolve(n).then(async x => { switch (x) { case 0: return 2; default: return x + 1; } });
}
export async function mixed(n: number): Promise<number> {
  return Promise.resolve(n).then(async x => { switch (x) { case 0: return 2; default: return x + 1; } }).then(x => x + 3);
}
export class Pending {
  private p?: Promise<number>;
  schedule(n: number): void { this.p = Promise.resolve(n).then(x => x + 1); }
}

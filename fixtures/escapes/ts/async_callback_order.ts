// expect: promise-all-order
interface Service { get(x: number): Promise<number>; log(x: number): void; }
export async function bad(xs: number[], svc: Service): Promise<number[]> {
  return await Promise.all(xs.map(async x => { const n = await svc.get(x); svc.log(n); return n; }));
}

// expect: promise-all-order
interface Service { get(x: number): Promise<number>; log(x: number): void; }
async function step(x: number, svc: Service): Promise<number> {
  const n = await svc.get(x);
  svc.log(n);
  return n;
}
export async function bad(xs: number[], svc: Service): Promise<number[]> {
  return await Promise.all(xs.map(async x => await step(x, svc)));
}

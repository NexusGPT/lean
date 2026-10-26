interface Service { ok(x: number): boolean; get(x: number): number; log(x: number): void; }
export function keep(xs: readonly number[], svc: Service): number[] {
  return xs.filter(x => svc.ok(x));
}
export function first(xs: readonly number[], svc: Service): number | undefined {
  const found = xs.find(x => { svc.log(x); return x >= 0; });
  return found;
}
export function mapped(xs: readonly number[], svc: Service): number[] {
  const out = xs.map(x => { svc.log(x); return svc.get(x); });
  return out;
}
export function steady(xs: readonly number[], svc: Service): boolean {
  return xs.some(x => svc.ok(x));
}
export function index(xs: readonly number[], svc: Service): number {
  return xs.findIndex((x, i) => { svc.log(i); return svc.ok(x); });
}
export function all(xs: readonly number[], svc: Service): boolean {
  return xs.every(x => svc.ok(x));
}
export function flattened(xs: readonly number[], svc: Service): number[] {
  return xs.flatMap(x => { svc.log(x); return [x, x + 1]; });
}
export function folded(xs: readonly number[], svc: Service): number {
  return xs.reduce((acc, x) => { svc.log(x); return acc + x; }, 0);
}
export function nested(xs: readonly number[], svc: Service): number[] {
  return xs.map(x => { [x, x + 1].forEach(y => svc.log(y)); return x; });
}
export function entries(xs: Record<string, number>, svc: Service): number {
  let total = 0;
  for (const [key, value] of Object.entries(xs)) { svc.log(value); total += value + key.length; }
  return total;
}

interface AsyncService { get(x: number): Promise<number>; }
export async function collected(xs: readonly number[], svc: AsyncService): Promise<number[]> {
  return await Promise.all(xs.map(async x => await svc.get(x)));
}
export async function asyncFlat(xs: readonly number[], svc: AsyncService): Promise<number[][]> {
  const out = await Promise.all(xs.flatMap(async x => { const n = await svc.get(x); return [n]; }));
  return out;
}
export function nestedChange(xs: readonly number[], svc: Service): number[] {
  return xs.map(x => { [x].forEach(y => svc.log(y)); return x; });
}

export function nestedEach(xs: readonly number[], svc: Service): number {
  xs.forEach(x => [x].forEach(y => svc.log(y)));
  return xs.length;
}

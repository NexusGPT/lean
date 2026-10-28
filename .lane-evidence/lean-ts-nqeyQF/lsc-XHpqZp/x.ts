export function double(x: number): number { return x * 2; }
export function viaNamed(xs: readonly number[]): readonly number[] { return xs.map(double); }
export function viaLocal(xs: readonly number[], k: number): readonly number[] {
  const scale = (x: number): number => x * k;
  return xs.map(scale);
}
export function callLocal(a: number, b: number): number {
  const add = (x: number, y: number): number => x + y;
  return add(a, b) + add(b, a);
}

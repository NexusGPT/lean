export function throughCall(xs: number[]): number[] {
  return xs.map.call(xs, (n: number) => n + 1);
}
const values = [1, 2];
values.map(n => n * 2);

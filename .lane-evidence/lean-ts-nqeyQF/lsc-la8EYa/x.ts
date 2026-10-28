export function sumDoubled(xs: readonly number[]): number {
  return xs.map((x) => x * 2).reduce((a, b) => a + b, 0);
}

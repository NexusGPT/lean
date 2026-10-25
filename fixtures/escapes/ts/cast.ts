// expect: cast
export function firstLength(x: readonly number[]): number {
  const y = x as number[];
  return y.length;
}

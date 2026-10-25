// expect: null
export function orZero(x: number | null): number {
  return x === null ? 0 : x;
}

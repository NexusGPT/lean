// expect: param-assign
export function doubled(xs: number[]): number[] {
  return xs.map((x) => { x = x * 2; return x; });
}

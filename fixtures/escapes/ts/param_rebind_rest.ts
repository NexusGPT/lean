// expect: param-assign
export function count(...xs: number[]): number {
  xs = [0];
  return xs.length;
}

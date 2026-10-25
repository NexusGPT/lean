// expect: param-assign
export function firstLength(x: readonly number[]): number {
  x = [];
  return x.length;
}

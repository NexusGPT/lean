// expect: param-assign
export function total(xs: number[], sum: number): number {
  xs.forEach((x) => { sum = sum + x; });
  return sum;
}

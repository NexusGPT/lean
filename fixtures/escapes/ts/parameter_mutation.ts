// expect: param-mutation
export function addOne(xs: number[]): number[] {
  xs.push(1);
  return xs;
}

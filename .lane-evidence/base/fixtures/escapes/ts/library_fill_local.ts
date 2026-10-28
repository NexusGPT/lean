// expect: in-place-mutation
// fill returns its receiver: on a name the result is a second name for the changed array
export function blank(xs: number[]): number[] {
  const ys = [...xs];
  return ys.fill(0);
}

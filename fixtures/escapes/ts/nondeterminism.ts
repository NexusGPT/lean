// expect: closure-mutation
export function stamp(xs: readonly number[]): number {
  let last = 0;
  const ys = xs.map((x) => { last = x; return x; });
  return last + ys.length;
}

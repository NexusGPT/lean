// expect: closure-mutation
export function collect(xs: number[]): number {
  let n = 0;
  const ys = xs.filter((x) => { n = n + 1; return x > 0; });
  return n + ys.length;
}

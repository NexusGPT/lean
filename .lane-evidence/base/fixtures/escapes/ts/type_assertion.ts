// expect: type-assertion
// `x as number` on an unknown value checks nothing at run time; passed to a same-file function whose parameter is a
// number, it would be read by that function's exact reading of a number. Test it first (`typeof x === "number"`).
export function next(x: unknown): number {
  return inc(x as number);
}

function inc(n: number): number {
  return n + 1;
}

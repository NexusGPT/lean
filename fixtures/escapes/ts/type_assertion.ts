// expect: type-assertion
// `x as number` on an unknown value checks nothing at run time. Pushed into a number array, it would be read by the
// sequence's exact reading of a number: an array element is a slot the held reading does not reach (design/type-assertions.md,
// 2026-10-30; a same-file callee's parameter now is, so the former fixture `inc(x as number)` is admitted). Test it first
// (`typeof x === "number"`).
export function collect(x: unknown): number[] {
  const xs: number[] = [];
  xs.push(x as number);
  return xs;
}

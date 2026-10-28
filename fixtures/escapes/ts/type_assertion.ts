// expect: type-assertion
// `x as number` on a value typed string | number checks nothing at run time: a string flows on, and `+ 1` appends "1";
// the proof lane would read it as a number, so a narrowing assertion is refused. Narrow it with a test instead.
export function next(x: string | number): number {
  return (x as number) + 1;
}

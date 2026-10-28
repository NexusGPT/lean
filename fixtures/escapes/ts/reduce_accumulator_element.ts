// expect: alias-mutation
// the accumulator of a reduce whose initial value the unit was handed is that object: a write through it changes the
// caller's object (without an initial value it is the array's first element). Start from a fresh accumulator instead:
// `xs.reduce((acc, x) => { acc.n = acc.n + x.n; return acc; }, { n: 0 })`
type Row = { n: number };
export function total(xs: Row[], start: Row): Row {
  return xs.reduce((acc, x) => {
    acc.n = acc.n + x.n;
    return acc;
  }, start);
}

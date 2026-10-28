// Stage 5 rank 19: outer cells written inside synchronous array-method callbacks, run in Node and in Dafny on the same
// inputs (the differential step): every write must reach the cell after the call, whatever the call's result is used for.
export function sumEach(xs: number[]): number {
  let count = 0;
  xs.forEach((x) => { count += x; });
  return count;
}
export function collect(xs: number[]): number[] {
  const out: number[] = [];
  const doubled = xs.map((x) => { out.push(x); return x * 2; });
  return out.concat(doubled);
}
export function tally(xs: string[]): number {
  const acc = { n: 0, last: "" };
  xs.filter((x) => { acc.n = acc.n + 1; acc.last = x; return x.length > 0; });
  return acc.n * 10 + acc.last.length;
}
export function firstBig(xs: number[]): number {
  let seen = 0;
  const hit = xs.find((x) => { seen = seen + 1; return x > 10; });
  return hit === undefined ? 0 - seen : hit + seen; // `0 - seen`, never -0: a -0 result an operation makes is read opaque (design/signed-zero.md), and an opaque unit has no body to run
}

// a map with a block callback inside a unit that changes a parameter, run in Node and in Dafny on the same inputs (the
// differential step): the callback's return is its own value, and the changed parameter reaches the caller.
function scaled(xs: number[], seen: number[]): number[] {
  seen.push(xs.length);
  return xs.map((x) => { if (x > 0) { return x * 2; } return 0 - x; });
}
export function scaleCount(xs: number[]): number[] {
  const seen: number[] = [7];
  const out = scaled(xs, seen);
  return out.concat(seen);
}

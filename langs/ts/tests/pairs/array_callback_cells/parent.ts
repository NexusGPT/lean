// Stage 5 rank 19: a synchronous array-method callback (map, filter, reduce, some, every, find, findIndex, flatMap, as
// forEach already) that writes a local, an array or a record of the enclosing function is the loop body it is: the array
// method runs it once per element, in index order, before returning, so the cell is the loop's state.

// a local counter and a local array written from a map callback whose result is used
export function collect(xs: number[]): number[] {
  const out: number[] = [];
  let seen = 0;
  const doubled = xs.map((x) => { seen = seen + 1; out.push(x); return x * 2; });
  return out.concat(doubled).concat([seen]);
}

// a record written from a filter callback whose result is dropped
export function tally(xs: string[]): { n: number; last: string } {
  const acc = { n: 0, last: "" };
  xs.filter((x) => { acc.n = acc.n + 1; acc.last = x; return x.length > 0; });
  return acc;
}

// a counter written from a find callback, read beside the result
export function firstBig(xs: number[], floor: number): number {
  let steps = 0;
  const hit = xs.find((x) => { steps = steps + 1; return x > floor; });
  return hit === undefined ? -steps : hit + steps;
}

// untouched: a counter written from a some callback
export function anyNegative(xs: number[]): boolean {
  let checked = 0;
  const found = xs.some((x) => { checked = checked + 1; return x < 0; });
  return found && checked > 0;
}

// The heap core's splice and slice rows: a negative index counts from the end (ECMA-262 23.1.3.31 step 6, 23.1.3.28).

// drops the FIRST element: another behaviour (a start of 0 is not a start of -1)
export function dropLast(xs: number[]): number {
  xs.splice(0, 1);
  return xs.length;
}

// the first two elements: another behaviour
export function tail(xs: number[]): number[] {
  return xs.slice(0, 2);
}

// drops the last element by a negative start: the same behaviour, written the other way
export function trimEnd(xs: number[]): number {
  xs.splice(-1, 1);
  return xs.length;
}

// the first element, or -1
export function head(xs: number[]): number {
  return xs.length > 0 ? xs[0] : -1;
}

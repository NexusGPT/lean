// The heap core's splice and slice rows: a negative index counts from the end (ECMA-262 23.1.3.31 step 6, 23.1.3.28).

// drops the last element and returns the length left
export function dropLast(xs: number[]): number {
  xs.splice(-1, 1);
  return xs.length;
}

// the last two elements as a fresh array
export function tail(xs: number[]): number[] {
  return xs.slice(-2);
}

// drops the last element by its index
export function trimEnd(xs: number[]): number {
  xs.splice(xs.length - 1, 1);
  return xs.length;
}

// the first element, or -1
export function head(xs: number[]): number {
  return xs.length > 0 ? xs[0] : -1;
}

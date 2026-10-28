// the global Infinity as a no-bound sentinel, and Math.max behind an emptiness exit
export function lowest(xs: number[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < best) best = xs[i];
  }
  return best;
}

export function lowestBad(xs: number[]): number {
  let best = 1e9;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < best) best = xs[i];
  }
  return best;
}

export function highest(xs: number[]): number {
  return xs.length > 0 ? Math.max(...xs) : 0;
}

export function highestBad(xs: number[]): number {
  return xs.length > 1 ? Math.max(...xs) : 0;
}

export function untouched(a: number, b: number): number {
  return a + b;
}

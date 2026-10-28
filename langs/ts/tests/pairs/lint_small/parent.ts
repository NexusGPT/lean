// the global Infinity as a no-bound sentinel, and Math.max behind an emptiness exit
export function lowest(xs: number[]): number {
  let best = Infinity;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < best) best = xs[i];
  }
  return best;
}

export function lowestBad(xs: number[]): number {
  let best = Infinity;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < best) best = xs[i];
  }
  return best;
}

export function highest(xs: number[]): number {
  if (xs.length === 0) return 0;
  return Math.max(...xs);
}

export function highestBad(xs: number[]): number {
  if (!xs.length) return 0;
  return Math.max(...xs);
}

export function untouched(a: number, b: number): number {
  return a + b;
}

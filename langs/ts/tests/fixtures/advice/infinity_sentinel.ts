// expect: loose-equality proved
// expect-none: number-special
// The global Infinity is the value Number.POSITIVE_INFINITY is: a no-bound sentinel in either spelling is inside the
// subset (the unit is one opaque unit in the translator). NaN stays refused (fixtures/escapes/ts/number_special.ts).
export function lowestGlobal(xs: number[]): number {
  let best = Infinity;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < best) best = xs[i];
  }
  return best;
}

export function lowestMember(xs: number[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < best) best = xs[i];
  }
  return best;
}

export function highestNegative(xs: number[]): number {
  let best = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] > best) best = xs[i];
  }
  return best;
}

export function highestMember(xs: number[]): number {
  let best = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] > best) best = xs[i];
  }
  return best;
}

export function sameKind<T extends number>(a: T, b: T): boolean {
  return a == b;
}

// expect: label
export function firstPair(xs: readonly number[]): number {
  let found = -1;
  outer: for (const x of xs) {
    for (const y of xs) {
      if (x + y === 10) { found = x; break outer; }
    }
  }
  return found;
}

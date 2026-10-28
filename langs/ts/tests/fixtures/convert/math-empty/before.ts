// math-empty: Math.max and Math.min over a list that an exit just before proves nonempty are inside the subset (the lint
// reads the dominating test), so the converter leaves them; a call with no such test is listed. No shape that the lint still
// refuses and also has the guard in the statement just before the call, which is the only shape the transform rewrites,
// was found when this fixture was written.
type Hit = { tier: number };

export function best(hits: Hit[]): number {
  if (hits.length === 0) return -1;
  const top = Math.max(...hits.map((h) => h.tier));
  return top;
}

export function lowest(xs: number[]): number {
  if (xs.length === 0) return 0;
  return Math.min(...xs);
}

export function open(xs: number[]): number {
  return Math.max(...xs);
}

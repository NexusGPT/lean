// a wrong after: the proof must refute it with a WITNESS
// math-empty: Math.max and Math.min over a list the statement just before proves nonempty get the guard with a dead
// fallback; a mapped list is bound to a local first; a call with no such test is listed
type Hit = { tier: number };

export function best(hits: Hit[]): number {
  if (hits.length === 0) return -1;
  const tierValues = hits.map((h) => h.tier);
  const top = tierValues.length > 0 ? Math.max(...tierValues) : 0;
  return top;
}

export function lowest(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.length > 1 ? Math.min(...xs) : 0;
}

export function open(xs: number[]): number {
  return Math.max(...xs);
}

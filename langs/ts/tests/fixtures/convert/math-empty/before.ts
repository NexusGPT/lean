// math-empty: Math.max and Math.min over a list the statement just before proves nonempty get the guard with a dead
// fallback; a mapped list is bound to a local first; a call with no such test is listed
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

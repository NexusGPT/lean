// expect: loose-equality proved
// expect-none: math-empty
// Math.max and Math.min over a spread are read when a test of the list's emptiness dominates the call: an exit before it
// (return, throw, continue, break; a block ending in one), a conditional, an if, or && / ||. Only the loose equality at
// the end is a finding: it carries the label this fixture checks, and the file must raise no math-empty.
type Hit = { tier: number };

export function exitReturn(xs: number[]): number {
  if (!xs.length) return 0;
  return Math.max(...xs);
}

export function exitThrow(xs: number[]): number {
  if (xs.length === 0) throw new Error('empty');
  return Math.max(...xs);
}

export function exitContinue(groups: number[][]): number {
  let total = 0;
  for (const xs of groups) {
    if (xs.length < 1) continue;
    total += Math.max(...xs);
  }
  return total;
}

export function exitBreak(groups: number[][]): number {
  let total = 0;
  for (const xs of groups) {
    if (xs.length <= 0) break;
    total += Math.min(...xs);
  }
  return total;
}

export function exitBlock(xs: number[]): number {
  let n = 0;
  if (xs.length == 0) { n = 1; return n; }
  return Math.max(...xs);
}

export function exitOrTest(xs: number[]): number {
  if (0 >= xs.length || xs[0] > 5) return 0;
  return Math.min(...xs);
}

export function mappedList(hits: Hit[]): number {
  if (hits.length === 0) return -1;
  return Math.max(...hits.map((h) => h.tier));
}

export function inConditional(xs: number[]): number {
  return xs.length !== 0 ? Math.min(...xs) : 0;
}

export function inElse(xs: number[]): number {
  if (xs.length === 0) { return 0; } else { return Math.max(...xs); }
}

export function sameKind<T extends number>(a: T, b: T): boolean {
  return a == b;
}

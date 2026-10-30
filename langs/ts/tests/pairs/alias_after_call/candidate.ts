// A field read after a call that can change the object it reads (SEMANTICS.md: reachable mutation, aliasing counts)
export type Box = { x: number };

export function aliased(e: any): boolean {
  const f = e;
  const before = f.defaultPrevented;
  e.preventDefault();
  return before;
}

export function otherAny(e: any, g: any): number {
  const before = g.x;
  e.bump();
  return before;
}

export function typedAlias(e: any, p: Box): number {
  const before = p.x;
  e.bump();
  return before;
}

export function passed(p: Box, f: (q: Box) => void): number {
  const before = p.x;
  f(p);
  return before;
}

export function freshAfter(e: any, n: number): number {
  e.bump();
  return n;
}

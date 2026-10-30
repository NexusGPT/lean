// A field read after a call that can change the object it reads (SEMANTICS.md: reachable mutation, aliasing counts)
export type Box = { x: number };

export function aliased(e: any): boolean {
  const f = e;
  e.preventDefault();
  return f.defaultPrevented;
}

export function otherAny(e: any, g: any): number {
  e.bump();
  return g.x;
}

export function typedAlias(e: any, p: Box): number {
  e.bump();
  return p.x;
}

export function passed(p: Box, f: (q: Box) => void): number {
  f(p);
  return p.x;
}

export function freshAfter(e: any, n: number): number {
  const b: Box = { x: n };
  e.bump();
  return b.x;
}

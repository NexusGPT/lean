// A method call on an opaque value, then reads of a value of the same name (design/opaque-receiver.md)
export function aliased(e: any): number {
  const f = e;
  e.preventDefault();
  return f.defaultPrevented ? 1 : 0;
}

export function looped(e: any, xs: readonly number[]): number {
  let n = 0;
  for (const x of xs) {
    if (e.done) n = n + x;
    e.step();
  }
  return n;
}

export function moved(e: any, text: string): number {
  e.preventDefault();
  return text.trim().length;
}

export type Box = { x: number };
export function typedAlias(e: any, p: Box): number {
  e.bump();
  return p.x;
}

export function passed(p: Box, f: (q: Box) => void): number {
  f(p);
  return p.x;
}

export function otherAny(e: any, g: any): number {
  e.bump();
  return g.x;
}

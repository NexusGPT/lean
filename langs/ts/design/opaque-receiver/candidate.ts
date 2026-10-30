// A method call on an opaque value, then reads of a value of the same name (design/opaque-receiver.md)
export function aliased(e: any): number {
  const f = e;
  const d = f.defaultPrevented;
  e.preventDefault();
  return d ? 1 : 0;
}

export function looped(e: any, xs: readonly number[]): number {
  let n = 0;
  const d = e.done;
  for (const x of xs) {
    if (d) n = n + x;
    e.step();
  }
  return n;
}

export function moved(e: any, text: string): number {
  const n = text.trim().length;
  e.preventDefault();
  return n;
}

export type Box = { x: number };
export function typedAlias(e: any, p: Box): number {
  const v = p.x;
  e.bump();
  return v;
}

export function passed(p: Box, f: (q: Box) => void): number {
  const v = p.x;
  f(p);
  return v;
}

export function otherAny(e: any, g: any): number {
  const v = g.x;
  e.bump();
  return v;
}

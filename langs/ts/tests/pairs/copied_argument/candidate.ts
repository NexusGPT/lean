// A record copy handed to a call that threads the world is another object than its source (SEMANTICS.md: reachable mutation)
export type Box = { x: number };

export function hand(p: Box, g: (q: Box) => void): number {
  g({ ...p });
  return 0;
}

export function honest(p: Box, g: (q: Box) => void): number {
  const r = p.x + 1;
  g({ ...p });
  return r;
}

export function twice(p: Box, g: (q: Box) => void): number {
  const a = { ...p };
  const b = { ...p };
  g(a);
  g(b);
  return 0;
}

function helper(q: Box, g: (b: Box) => void): number {
  g(q);
  return 0;
}

export function viaHelper(p: Box, g: (b: Box) => void): number {
  return helper({ ...p }, g);
}

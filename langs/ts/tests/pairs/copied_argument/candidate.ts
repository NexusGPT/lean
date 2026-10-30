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
  g({ ...p });
  g({ ...p });
  return 0;
}

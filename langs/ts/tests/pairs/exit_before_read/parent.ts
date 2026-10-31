type Box = { n: number };

// g runs only on a path that returns: the read below never follows it.
export function guarded(g: (b: Box) => void, p: Box, c: boolean): number {
  if (c) {
    g(p);
    return 0;
  }
  return p.n;
}

// break leaves the switch, not the function: the read follows g.
export function broken(g: (b: Box) => void, p: Box, k: number): number {
  switch (k) {
    case 1:
      g(p);
      break;
    default:
      return 0;
  }
  return p.n;
}

// the catch runs after the throw: the read follows g.
export function caught(g: (b: Box) => void, p: Box, c: boolean): number {
  try {
    if (c) {
      g(p);
      throw new Error("stop");
    }
  } catch {
    return p.n;
  }
  return 0;
}
